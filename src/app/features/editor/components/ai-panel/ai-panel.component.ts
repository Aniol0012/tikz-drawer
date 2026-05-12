import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  readonly assistantState = inject(AiAssistantStateService);

  readonly iconMap = iconPaths;
  readonly modelName = FIREBASE_AI_MODEL;
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
    if (!instruction || this.assistantState.loading()) {
      return;
    }

    this.assistantState.error.set('');
    this.assistantState.draft.set('');
    this.assistantState.appendMessage({ role: 'user', text: instruction });
    this.assistantState.loading.set(true);

    try {
      const context = this.contextBuilder.build(this.store.scene().name, this.store.scene().shapes, this.store.selectedShapeIds());
      const response = await this.aiClient.sendPrompt(instruction, context);
      if (response.patch) {
        this.scenePatch.setPendingPatch(response.patch);
      }
      this.assistantState.appendMessage({ role: 'assistant', text: response.message, response });
    } catch (error) {
      this.assistantState.error.set(error instanceof Error ? error.message : this.languageService.t('ai.errorGeneric'));
    } finally {
      this.assistantState.loading.set(false);
    }
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
}
