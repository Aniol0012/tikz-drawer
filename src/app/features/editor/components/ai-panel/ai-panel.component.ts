import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { iconPaths } from '../../config/editor-icons';
import { EditorLanguageService } from '../../i18n/editor-language.service';
import { EditorTranslatePipe } from '../../i18n/editor-translate.pipe';
import { EditorStore } from '../../state/editor.store';
import { sceneToTikz } from '../../tikz/tikz.codegen';
import { AiClientService } from '../../ai/ai-client.service';
import { AiContextBuilderService } from '../../ai/ai-context-builder.service';
import { AI_QUICK_ACTIONS, type AiQuickAction } from '../../ai/ai-action.model';
import type { AiResponse } from '../../ai/ai-message.model';
import { ScenePatchService } from '../../ai/scene-patch.service';
import { FIREBASE_AI_MODEL } from '../../ai/firebase-ai.config';
import { AiAssistantStateService } from '../../ai/ai-assistant-state.service';
import { WebLlmLocalAiProvider } from '../../ai/web-llm-local-ai.provider';
import { AiSettingsService } from '../../ai/ai-settings.service';
import { BrowserLocalAiProvider } from '../../ai/browser-local-ai.provider';

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
  readonly assistantState = inject(AiAssistantStateService);

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

    return this.webLlmReady();
  });
  readonly composerDisabled = computed(() => this.assistantState.loading() || !this.assistantState.draft().trim() || !this.aiReady());
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
    if (keyboardEvent.shiftKey || keyboardEvent.isComposing) {
      return;
    }

    event.preventDefault();
    void this.submit();
  }

  async submit(): Promise<void> {
    const instruction = this.assistantState.draft().trim();
    if (!instruction || this.assistantState.loading() || !this.aiReady()) {
      return;
    }

    this.assistantState.error.set('');
    this.assistantState.draft.set('');
    this.assistantState.appendMessage({ role: 'user', text: instruction });
    this.assistantState.loading.set(true);

    try {
      const context = this.contextBuilder.build(this.store.scene().name, this.store.scene().shapes, this.store.selectedShapeIds());
      const response = await this.aiClient.sendPrompt(instruction, context, this.assistantState.messages());
      if (response.patch) {
        this.scenePatch.setPendingPatch(response.patch);
      }
      this.assistantState.appendMessage({ role: 'assistant', text: response.message, response });
    } catch (error) {
      this.assistantState.error.set(this.errorMessage(error));
    } finally {
      this.assistantState.loading.set(false);
    }
  }

  resetConversation(): void {
    this.assistantState.resetConversation();
  }

  applyResponse(response: AiResponse): void {
    if (!response.patch) {
      return;
    }

    this.scenePatch.setPendingPatch(response.patch);
    this.assistantState.appendMessage({
      role: 'system',
      text: `${this.languageService.t('ai.patchPreviewReady')} ${this.scenePatch.summarize(response.patch)}.`
    });
  }

  copyTikz(response: AiResponse): void {
    const text = response.tikzCode || sceneToTikz(this.store.scene());
    void navigator.clipboard?.writeText(text);
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

  private defaultModelName(): string {
    if (this.aiSettings().providerType === 'remote') {
      return this.aiSettings().remoteModel;
    }

    if (this.aiSettings().providerType === 'local' && this.localAiProvider.isReady(this.aiSettings().webLlmModel)) {
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
    if (!(error instanceof Error)) {
      return this.languageService.t('ai.errorGeneric');
    }

    if (error.message.startsWith('ai.')) {
      return this.languageService.t(error.message);
    }

    return this.languageService.t('ai.errorGeneric');
  }
}
