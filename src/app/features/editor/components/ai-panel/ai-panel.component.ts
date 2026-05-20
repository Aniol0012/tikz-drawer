import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { iconPaths } from '../../config/editor-icons';
import { EditorLanguageService } from '../../i18n/editor-language.service';
import { EditorTranslatePipe } from '../../i18n/editor-translate.pipe';
import { EditorStore } from '../../state/editor.store';
import { AiClientService } from '../../ai/ai-client.service';
import { AiContextBuilderService } from '../../ai/ai-context-builder.service';
import { AI_QUICK_ACTIONS, type AiQuickAction } from '../../ai/ai-action.model';
import type { AiMessageDebugInfo, AiResponse } from '../../ai/ai-message.model';
import { ScenePatchService } from '../../ai/scene-patch.service';
import { FIREBASE_AI_MODEL } from '../../ai/firebase-ai.config';
import { AiAssistantStateService } from '../../ai/ai-assistant-state.service';
import { WebLlmLocalAiProvider } from '../../ai/web-llm-local-ai.provider';
import { AiSettingsService } from '../../ai/ai-settings.service';
import { BrowserLocalAiProvider } from '../../ai/browser-local-ai.provider';
import { EditorDevModeService } from '../../state/editor-dev-mode.service';
import type { AiProviderRuntimeType, AiProviderType, AiProviderUsage } from '../../ai/ai-provider-result.model';

@Component({
  selector: 'app-ai-panel',
  imports: [EditorTranslatePipe],
  templateUrl: './ai-panel.component.html',
  styleUrl: './ai-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiPanelComponent {
  private readonly store = inject(EditorStore);
  private readonly languageService = inject(EditorLanguageService);
  private readonly aiClient = inject(AiClientService);
  private readonly contextBuilder = inject(AiContextBuilderService);
  private readonly scenePatch = inject(ScenePatchService);
  private readonly localAiProvider = inject(WebLlmLocalAiProvider);
  private readonly browserLocalAiProvider = inject(BrowserLocalAiProvider);
  private readonly aiSettingsService = inject(AiSettingsService);
  private readonly chatScroll = viewChild<ElementRef<HTMLElement>>('chatScroll');
  @Output() readonly patchApplied = new EventEmitter<readonly string[]>();
  @Output() readonly patchPreviewed = new EventEmitter<void>();
  @Output() readonly settingsRequested = new EventEmitter<void>();

  readonly devMode = inject(EditorDevModeService).enabled;
  readonly assistantState = inject(AiAssistantStateService);
  readonly aiPatch = this.scenePatch;

  readonly iconMap = iconPaths;
  readonly cloudModelName = FIREBASE_AI_MODEL;
  readonly aiSettings = this.aiSettingsService.settings;
  readonly localAiStatus = this.localAiProvider.status;
  readonly activeAiMode = computed(() => {
    if (this.aiSettings().providerType === 'remote') {
      return 'cloud';
    }

    if (this.aiSettings().providerType === 'webllm') {
      return 'webllm';
    }

    return 'local';
  });
  readonly activeModelName = computed(() => {
    if (this.activeAiMode() !== 'webllm' && this.aiClient.lastProviderMode() === this.activeAiMode() && this.aiClient.lastModelName()) {
      return this.aiClient.lastModelName();
    }

    return this.defaultModelName();
  });
  readonly aiModeLabelKey = computed(() => {
    switch (this.activeAiMode()) {
      case 'local':
        return 'ai.modeLocal';
      case 'webllm':
        return 'ai.modeWebLlm';
      case 'cloud':
        return 'ai.modeCloud';
    }
  });
  readonly webLlmReady = computed(() => this.localAiProvider.isReady(this.aiSettings().webLlmModel));
  readonly webLlmLoading = computed(() => this.localAiProvider.isLoading(this.aiSettings().webLlmModel));
  readonly aiReady = computed(() => {
    if (this.aiSettings().providerType !== 'webllm') {
      return true;
    }

    return this.webLlmReady() || (this.aiSettings().allowRemoteFallback && !this.localAiProvider.isSupported());
  });
  readonly composerDisabled = computed(() => this.assistantState.loading() || !this.assistantState.draft().trim());
  readonly composerHeight = signal(64);
  readonly pendingChangesDialogOpen = signal(false);
  readonly pendingSubmitInstruction = signal('');
  readonly quickActions = AI_QUICK_ACTIONS;

  setDraft(value: string): void {
    this.assistantState.draft.set(value);
  }

  useQuickAction(action: AiQuickAction): void {
    this.assistantState.draft.set(this.languageService.t(action.promptKey));
  }

  iconForAction(action: AiQuickAction): string {
    return this.iconMap[action.icon];
  }

  handleComposerKeydown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key !== 'Enter' || keyboardEvent.shiftKey || keyboardEvent.isComposing) {
      return;
    }

    event.preventDefault();
    void this.submit();
  }

  startComposerResize(event: PointerEvent): void {
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = this.composerHeight();
    const minHeight = 64;
    const maxHeight = 180;

    const resize = (moveEvent: PointerEvent) => {
      const nextHeight = startHeight + startY - moveEvent.clientY;
      this.composerHeight.set(Math.min(maxHeight, Math.max(minHeight, nextHeight)));
    };
    const stopResize = () => {
      window.removeEventListener('pointermove', resize);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };

    window.addEventListener('pointermove', resize);
    window.addEventListener('pointerup', stopResize, { once: true });
    window.addEventListener('pointercancel', stopResize, { once: true });
  }

  async submit(): Promise<void> {
    const instruction = this.assistantState.draft().trim();
    if (!instruction || this.assistantState.loading() || !this.aiReady()) {
      return;
    }

    if (this.shouldConfirmBeforeNewCreate(instruction)) {
      this.pendingSubmitInstruction.set(instruction);
      this.pendingChangesDialogOpen.set(true);
      return;
    }

    await this.executeSubmit(instruction);
  }

  confirmPendingChangesApply(): void {
    const createdShapes = this.scenePatch.applyPendingPatch();
    this.patchApplied.emit(createdShapes.map((shape) => shape.id));
    void this.continuePendingSubmit();
  }

  confirmPendingChangesDiscard(): void {
    this.scenePatch.discardPendingPatch();
    void this.continuePendingSubmit();
  }

  closePendingChangesDialog(): void {
    this.pendingChangesDialogOpen.set(false);
    this.pendingSubmitInstruction.set('');
  }

  private async continuePendingSubmit(): Promise<void> {
    const instruction = this.pendingSubmitInstruction();
    this.pendingChangesDialogOpen.set(false);
    this.pendingSubmitInstruction.set('');
    if (instruction) {
      await this.executeSubmit(instruction);
    }
  }

  private async executeSubmit(instruction: string): Promise<void> {
    if (this.assistantState.loading() || !this.aiReady()) {
      return;
    }

    this.assistantState.error.set('');
    this.assistantState.draft.set('');
    this.assistantState.appendMessage({ role: 'user', text: instruction, debugInfo: this.requestDebugInfo() });
    this.assistantState.loading.set(true);
    this.scrollChatToBottom();

    try {
      const context = this.contextBuilder.build(this.store.scene().name, this.store.scene().shapes, this.store.selectedShapeIds());
      const response = await this.aiClient.sendPrompt(instruction, context, this.assistantState.messages());
      if (response.patch) {
        this.scenePatch.setPendingPatch(response.patch);
        this.patchPreviewed.emit();
      }
      this.assistantState.appendMessage({ role: 'assistant', text: response.message, response });
      this.scrollChatToBottom();
    } catch (error) {
      this.assistantState.error.set(this.errorMessage(error));
      this.scrollChatToBottom();
    } finally {
      this.assistantState.loading.set(false);
      this.scrollChatToBottom();
    }
  }

  resetConversation(): void {
    this.assistantState.resetConversation();
  }

  acceptPendingPatch(): void {
    const createdShapes = this.scenePatch.applyPendingPatch();
    this.patchApplied.emit(createdShapes.map((shape) => shape.id));
  }

  rejectPendingPatch(): void {
    this.scenePatch.discardPendingPatch();
  }

  patchSummary(response: AiResponse): string {
    return response.patch ? this.scenePatch.summarize(response.patch) : '';
  }

  responseModeLabel(response: AiResponse): string {
    if (!response.aiMode) {
      return '';
    }

    return response.aiMode === 'local' ? this.languageService.t('ai.modeLocal') : this.languageService.t('ai.modeCloud');
  }

  requestDebugLabel(debugInfo: AiMessageDebugInfo): string {
    return this.interpolate(this.languageService.t('ai.debug.sentTo'), {
      provider: this.requestProviderLabel(debugInfo.providerType),
      model: debugInfo.modelName
    });
  }

  responseDebugLabel(response: AiResponse): string {
    const provider = response.aiProviderType ? this.runtimeProviderLabel(response.aiProviderType) : this.responseModeLabel(response);
    const details = [
      this.interpolate(this.languageService.t('ai.debug.responseFrom'), { provider }),
      response.aiModelName || this.activeModelName(),
      response.parseStatus ? `parse ${response.parseStatus}` : '',
      response.aiDurationMs ? `${(response.aiDurationMs / 1000).toFixed(1)}s` : '',
      this.usageDebugLabel(response.aiUsage)
    ].filter(Boolean);

    return details.join(' · ');
  }

  private requestDebugInfo(): AiMessageDebugInfo {
    return {
      providerType: this.aiSettings().providerType,
      modelName: this.defaultModelName()
    };
  }

  private requestProviderLabel(providerType: AiProviderType): string {
    switch (providerType) {
      case 'local':
        return this.languageService.t('ai.debug.providerAutomaticLocal');
      case 'webllm':
        return this.languageService.t('ai.debug.providerWebLlm');
      case 'remote':
        return this.languageService.t('ai.debug.providerRemote');
    }
  }

  private runtimeProviderLabel(providerType: AiProviderRuntimeType): string {
    switch (providerType) {
      case 'browser-local':
        return this.languageService.t('ai.debug.runtimeBrowserLocal');
      case 'webllm':
        return this.languageService.t('ai.debug.runtimeWebLlm');
      case 'remote':
        return this.languageService.t('ai.debug.runtimeRemote');
    }
  }

  private usageDebugLabel(usage: AiProviderUsage | undefined): string {
    if (!usage) {
      return '';
    }

    const parts = [
      usage.totalTokens ? this.interpolate(this.languageService.t('ai.debug.tokens'), { count: String(usage.totalTokens) }) : '',
      usage.decodeTokensPerSecond
        ? this.interpolate(this.languageService.t('ai.debug.tokensPerSecond'), { value: usage.decodeTokensPerSecond.toFixed(1) })
        : '',
      usage.timeToFirstTokenSeconds
        ? this.interpolate(this.languageService.t('ai.debug.timeToFirstToken'), { value: usage.timeToFirstTokenSeconds.toFixed(1) })
        : ''
    ].filter(Boolean);

    return parts.join(' · ');
  }

  private interpolate(template: string, values: Record<string, string>): string {
    return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
  }

  private scrollChatToBottom(): void {
    requestAnimationFrame(() => {
      const element = this.chatScroll()?.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    });
  }

  private defaultModelName(): string {
    if (this.aiSettings().providerType === 'remote') {
      return this.aiSettings().remoteModel;
    }

    if (this.aiSettings().providerType === 'local' && this.localAiProvider.isSupported()) {
      return this.aiSettings().webLlmModel;
    }

    if (this.aiSettings().providerType === 'local' && this.browserLocalAiProvider.supported()) {
      return this.browserLocalAiProvider.modelName;
    }

    if (this.aiSettings().providerType === 'local') {
      return this.aiSettings().remoteModel;
    }

    return this.aiSettings().webLlmModel;
  }

  private errorMessage(error: unknown): string {
    if (!this.devMode()) {
      return this.languageService.t('ai.errorGeneric');
    }

    if (!(error instanceof Error)) {
      return this.languageService.t('ai.errorGeneric');
    }

    if (error.message.startsWith('ai.')) {
      return this.languageService.t(error.message);
    }

    return this.languageService.t('ai.errorGeneric');
  }

  private shouldConfirmBeforeNewCreate(instruction: string): boolean {
    return this.scenePatch.pendingCreatedShapeIds().length > 0 && this.looksLikeCreateInstruction(instruction);
  }

  private looksLikeCreateInstruction(instruction: string): boolean {
    const normalized = instruction
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
    return /\b(afegeix|afegir|posa|posar|crea|crear|dibuixa|dibujar|anade|agrega|pon|create|add|draw|insert|figura|forma|diagrama|nou|nova|nuevo|nueva)\b/.test(
      normalized
    );
  }
}
