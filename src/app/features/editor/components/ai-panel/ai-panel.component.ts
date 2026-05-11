import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { iconPaths } from '../../config/editor-icons';
import { EditorLanguageService } from '../../i18n/editor-language.service';
import { EditorTranslatePipe } from '../../i18n/editor-translate.pipe';
import { EditorStore } from '../../state/editor.store';
import { sceneToTikz } from '../../tikz/tikz.codegen';
import { AiClientService } from '../../ai/ai-client.service';
import { AiContextBuilderService } from '../../ai/ai-context-builder.service';
import { AI_QUICK_ACTIONS, type AiQuickAction } from '../../ai/ai-action.model';
import type { AiMessage, AiResponse } from '../../ai/ai-message.model';
import { ScenePatchService } from '../../ai/scene-patch.service';
import { FIREBASE_AI_MODEL } from '../../ai/firebase-ai.config';

@Component({
  selector: 'app-ai-panel',
  imports: [EditorTranslatePipe],
  templateUrl: './ai-panel.component.html',
  styleUrl: './ai-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ScenePatchService]
})
export class AiPanelComponent {
  private readonly store = inject(EditorStore);
  private readonly languageService = inject(EditorLanguageService);
  private readonly aiClient = inject(AiClientService);
  private readonly contextBuilder = inject(AiContextBuilderService);
  private readonly scenePatch = inject(ScenePatchService);

  readonly iconMap = iconPaths;
  readonly modelName = FIREBASE_AI_MODEL;
  readonly quickActions = AI_QUICK_ACTIONS;
  readonly draft = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly messages = signal<readonly AiMessage[]>([
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: this.languageService.t('ai.welcome'),
      createdAt: Date.now()
    }
  ]);
  readonly currentContextLabel = computed(() => {
    const selectionCount = this.store.selectionCount();
    if (selectionCount === 1) {
      return this.languageService.t('ai.context.selectedOne');
    }
    if (selectionCount > 1) {
      return this.languageService.tOrFallback('ai.context.selectedMany', 'Selección múltiple').replace('{count}', String(selectionCount));
    }
    return this.languageService.t('ai.context.scene');
  });

  setDraft(value: string): void {
    this.draft.set(value);
  }

  useQuickAction(action: AiQuickAction): void {
    this.draft.set(this.languageService.t(action.promptKey));
  }

  async submit(): Promise<void> {
    const instruction = this.draft().trim();
    if (!instruction || this.loading()) {
      return;
    }

    this.error.set('');
    this.draft.set('');
    this.appendMessage({ role: 'user', text: instruction });
    this.loading.set(true);

    try {
      const context = this.contextBuilder.build(this.store.scene().name, this.store.scene().shapes, this.store.selectedShapeIds());
      const response = await this.aiClient.sendPrompt(instruction, context);
      this.appendMessage({ role: 'assistant', text: response.message, response });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : this.languageService.t('ai.errorGeneric'));
    } finally {
      this.loading.set(false);
    }
  }

  applyResponse(response: AiResponse): void {
    if (!response.patch) {
      return;
    }

    this.scenePatch.apply(response.patch);
    this.appendMessage({
      role: 'system',
      text: `${this.languageService.t('ai.patchApplied')} ${this.scenePatch.summarize(response.patch)}.`
    });
  }

  copyTikz(response: AiResponse): void {
    const text = response.tikzCode || sceneToTikz(this.store.scene());
    void navigator.clipboard?.writeText(text);
  }

  patchSummary(response: AiResponse): string {
    return response.patch ? this.scenePatch.summarize(response.patch) : '';
  }

  private appendMessage(message: Omit<AiMessage, 'id' | 'createdAt'>): void {
    this.messages.update((messages) => [
      ...messages,
      {
        ...message,
        id: crypto.randomUUID(),
        createdAt: Date.now()
      }
    ]);
  }
}
