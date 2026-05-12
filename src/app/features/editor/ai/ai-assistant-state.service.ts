import { Injectable, inject, signal } from '@angular/core';
import { EditorLanguageService } from '../i18n/editor-language.service';
import type { AiMessage } from './ai-message.model';

@Injectable({ providedIn: 'root' })
export class AiAssistantStateService {
  private readonly languageService = inject(EditorLanguageService);

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

  appendMessage(message: Omit<AiMessage, 'id' | 'createdAt'>): void {
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
