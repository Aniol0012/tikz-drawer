import { Injectable, inject } from '@angular/core';
import { EditorLanguageService } from '../i18n/editor-language.service';

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
    return this.hasLocalizedTerm(instruction, 'ai.intent.colorTargets');
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
    return new RegExp(`(^|[^\\p{L}\\p{N}_])${this.escapeRegExp(term)}(?=$|[^\\p{L}\\p{N}_])`, 'u');
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
