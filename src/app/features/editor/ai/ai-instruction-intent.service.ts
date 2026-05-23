import { Injectable, inject } from '@angular/core';
import { EditorLanguageService } from '../i18n/editor-language.service';

export type AiConversationIntent = 'greeting' | 'thanks';

export interface AiInstructionIntent {
  readonly normalized: string;
  readonly conversation: AiConversationIntent | null;
  readonly capabilityQuestion: boolean;
  readonly createRequest: boolean;
  readonly editRequest: boolean;
  readonly graphTarget: boolean;
  readonly rectangleTarget: boolean;
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
      editRequest: this.isEditRequest(normalized),
      graphTarget: this.isGraphTarget(normalized),
      rectangleTarget: this.isRectangleTarget(normalized),
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
    return /\b(afegeix|afegir|posa|posar|pon|crear|crea|anade|añade|anadir|añadir|agrega|dibuixa|dibuja|draw|add|create|insert)\b/.test(instruction);
  }

  private isEditRequest(instruction: string): boolean {
    return /\b(canvia|canviar|cambia|cambiar|modifica|modificar|edita|editar|ajusta|ajustar|change|modify|edit|update|set)\b/.test(instruction);
  }

  private isGraphTarget(instruction: string): boolean {
    return /\b(graf|grafs|grafo|grafos|graph|graphs)\b/.test(instruction);
  }

  private isRectangleTarget(instruction: string): boolean {
    return /\b(quadrat|quadrats|cuadrat|cuadrado|cuadrados|rectangle|rectangles|rectangulo|rectangulos|rectángulo|rectángulos|square|squares)\b/.test(
      instruction
    );
  }

  private isStrokeWidthTarget(instruction: string): boolean {
    return /\b(grossor|gruix|grosor|ancho|amplada|stroke|strokewidth|thickness|width)\b/.test(instruction);
  }

  private hasQuestionShape(instruction: string): boolean {
    return /\?|\b(puc|puedo|podria|podrias|pots|puedes|can i|can you|could i|could you)\b/.test(instruction);
  }

  private isCapabilityTarget(instruction: string): boolean {
    return (
      this.isGraphTarget(instruction) ||
      /\b(figura|figures|figuras|shape|shapes|forma|formes|formas|diagrama|diagramas|diagrams|element|elements)\b/.test(instruction)
    );
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
