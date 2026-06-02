import { Injectable, inject } from '@angular/core';
import { EditorLanguageService } from '../i18n/editor-language.service';
import type { AiColorRange } from './color-range-randomizer.service';

export type AiConversationIntent = 'greeting' | 'thanks';

export interface AiInstructionIntent {
  readonly normalized: string;
  readonly conversation: AiConversationIntent | null;
  readonly capabilityQuestion: boolean;
  readonly createRequest: boolean;
  readonly proposalRequest: boolean;
  readonly editRequest: boolean;
  readonly graphTarget: boolean;
  readonly rectangleTarget: boolean;
  readonly triangleTarget: boolean;
  readonly colorTarget: boolean;
  readonly strokeWidthTarget: boolean;
}

const COLOR_INTENT_KEYS: readonly { readonly key: string; readonly range: AiColorRange }[] = [
  { key: 'ai.intent.colorGreen', range: 'green' },
  { key: 'ai.intent.colorRed', range: 'red' },
  { key: 'ai.intent.colorYellow', range: 'yellow' },
  { key: 'ai.intent.colorBlue', range: 'blue' },
  { key: 'ai.intent.colorPink', range: 'pink' },
  { key: 'ai.intent.colorRose', range: 'rose' },
  { key: 'ai.intent.colorOrange', range: 'orange' },
  { key: 'ai.intent.colorPurple', range: 'purple' },
  { key: 'ai.intent.colorCyan', range: 'cyan' },
  { key: 'ai.intent.colorGray', range: 'gray' }
] as const;

@Injectable({ providedIn: 'root' })
export class AiInstructionIntentService {
  private readonly languageService = inject(EditorLanguageService);

  analyze(instruction: string): AiInstructionIntent {
    const normalized = this.normalizeInstruction(instruction);
    return {
      normalized,
      conversation: this.conversationIntent(instruction),
      capabilityQuestion: this.isCapabilityQuestion(normalized),
      createRequest: this.isCreateRequest(normalized),
      proposalRequest: this.isProposalRequest(normalized),
      editRequest: this.isEditRequest(normalized),
      graphTarget: this.isGraphTarget(normalized),
      rectangleTarget: this.isRectangleTarget(normalized),
      triangleTarget: this.isTriangleTarget(normalized),
      colorTarget: this.isColorTarget(normalized),
      strokeWidthTarget: this.isStrokeWidthTarget(normalized)
    };
  }

  normalizeInstruction(instruction: string): string {
    return instruction
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }

  hasLocalizedTerm(instruction: string, key: string): boolean {
    return this.localizedTerms(key).some((term) => this.termPattern(term).test(instruction));
  }

  localizedTerms(key: string): readonly string[] {
    return this.languageService
      .t(key)
      .split('|')
      .map((entry) => this.normalizeInstruction(entry))
      .filter(Boolean);
  }

  colorRangeFromInstruction(instruction: string): AiColorRange | null {
    return COLOR_INTENT_KEYS.find(({ key }) => this.hasLocalizedTerm(instruction, key))?.range ?? null;
  }

  private conversationIntent(instruction: string): AiConversationIntent | null {
    const normalized = this.normalizeConversationInput(instruction);
    if (this.greetingInputs().includes(normalized)) {
      return 'greeting';
    }

    if (this.thanksInputs().includes(normalized)) {
      return 'thanks';
    }

    return null;
  }

  private isCapabilityQuestion(instruction: string): boolean {
    return this.hasQuestionShape(instruction) && this.isCapabilityTarget(instruction);
  }

  private isCreateRequest(instruction: string): boolean {
    return this.hasLocalizedTerm(instruction, 'ai.intent.create');
  }

  private isProposalRequest(instruction: string): boolean {
    return this.hasLocalizedTerm(instruction, 'ai.intent.propose');
  }

  private isEditRequest(instruction: string): boolean {
    return this.hasLocalizedTerm(instruction, 'ai.intent.edit');
  }

  private isGraphTarget(instruction: string): boolean {
    return this.hasLocalizedTerm(instruction, 'ai.intent.graphTargets');
  }

  private isRectangleTarget(instruction: string): boolean {
    return this.hasLocalizedTerm(instruction, 'ai.intent.rectangleTargets') || this.hasLocalizedTerm(instruction, 'ai.intent.squareTargets');
  }

  private isTriangleTarget(instruction: string): boolean {
    return this.hasLocalizedTerm(instruction, 'ai.intent.triangleTargets');
  }

  private isColorTarget(instruction: string): boolean {
    return this.hasLocalizedTerm(instruction, 'ai.intent.colorTargets') || this.colorRangeFromInstruction(instruction) !== null;
  }

  private isStrokeWidthTarget(instruction: string): boolean {
    return this.hasLocalizedTerm(instruction, 'ai.intent.strokeWidthTargets');
  }

  private hasQuestionShape(instruction: string): boolean {
    return /\?/.test(instruction) || this.hasLocalizedTerm(instruction, 'ai.intent.questionStarters');
  }

  private isCapabilityTarget(instruction: string): boolean {
    return (
      this.isGraphTarget(instruction) ||
      this.isRectangleTarget(instruction) ||
      this.isTriangleTarget(instruction) ||
      this.hasLocalizedTerm(instruction, 'ai.intent.vagueShapeTargets') ||
      this.hasLocalizedTerm(instruction, 'ai.intent.diagramTargets')
    );
  }

  private termPattern(term: string): RegExp {
    return new RegExp(String.raw`(^|[^\p{L}\p{N}_])${this.escapeRegExp(term)}(?=$|[^\p{L}\p{N}_])`, 'u');
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  }

  private normalizeConversationInput(instruction: string): string {
    return this.normalizeInstruction(instruction)
      .replace(/[!¡?¿.]+$/g, '')
      .trim();
  }

  private greetingInputs(): readonly string[] {
    return [...this.localizedConversationInputs('ai.localGreetingInputs'), ...this.localizedConversationInputs('ai.commonGreetingInputs')];
  }

  private thanksInputs(): readonly string[] {
    return [...this.localizedConversationInputs('ai.localThanksInputs'), ...this.localizedConversationInputs('ai.commonThanksInputs')];
  }

  private localizedConversationInputs(key: string): readonly string[] {
    return this.languageService
      .t(key)
      .split('|')
      .map((entry) => this.normalizeConversationInput(entry))
      .filter(Boolean);
  }
}
