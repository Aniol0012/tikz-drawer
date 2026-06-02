import { effect, Injectable, inject, signal } from '@angular/core';
import { EDITOR_STORAGE_KEYS } from '../constants/editor.constants';
import { EditorLanguageService } from '../i18n/editor-language.service';
import { EditorLocalStorageService } from '../state/editor-local-storage.service';
import type { AiMessage } from './ai-message.model';

@Injectable({ providedIn: 'root' })
export class AiAssistantStateService {
  private readonly languageService = inject(EditorLanguageService);
  private readonly storage = inject(EditorLocalStorageService);
  private readonly storageKey = EDITOR_STORAGE_KEYS.aiConversation;
  private readonly promptSeenStorageKey = EDITOR_STORAGE_KEYS.aiPromptSeen;

  readonly draft = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly messages = signal<readonly AiMessage[]>(this.restoreMessages());

  constructor() {
    effect(() => {
      this.storage.setJson(this.storageKey, this.messages());
    });
  }

  appendMessage(message: Omit<AiMessage, 'id' | 'createdAt'>): void {
    if (message.role === 'user') {
      this.markPromptSeen();
    }

    this.messages.update((messages) => [
      ...messages,
      {
        ...message,
        id: crypto.randomUUID(),
        createdAt: Date.now()
      }
    ]);
  }

  hasPromptBeenSeen(): boolean {
    if (this.storage.getString(this.promptSeenStorageKey) === 'true') {
      return true;
    }

    const restored = this.storage.getJson<readonly AiMessage[]>(this.storageKey);
    if (Array.isArray(restored) && restored.some((message) => this.isStoredMessage(message) && message.role === 'user')) {
      this.markPromptSeen();
      return true;
    }

    return false;
  }

  private markPromptSeen(): void {
    this.storage.setString(this.promptSeenStorageKey, 'true');
  }

  resetConversation(): void {
    this.error.set('');
    this.draft.set('');
    this.messages.set([this.welcomeMessage()]);
  }

  private restoreMessages(): readonly AiMessage[] {
    const restored = this.storage.getJson<readonly AiMessage[]>(this.storageKey);
    if (!Array.isArray(restored) || !restored.length) {
      return [this.welcomeMessage()];
    }

    return restored.filter((message) => this.isStoredMessage(message));
  }

  private welcomeMessage(): AiMessage {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: this.languageService.t('ai.welcome'),
      createdAt: Date.now()
    };
  }

  private isStoredMessage(message: Partial<AiMessage> | null | undefined): message is AiMessage {
    return (
      !!message &&
      typeof message.id === 'string' &&
      (message.role === 'user' || message.role === 'assistant' || message.role === 'system') &&
      typeof message.text === 'string' &&
      typeof message.createdAt === 'number'
    );
  }
}
