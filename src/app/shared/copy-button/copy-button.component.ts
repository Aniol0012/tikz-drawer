import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { getIconPath } from '../../features/editor/config/editor-icons';

export type CopyButtonAppearance = 'icon' | 'secondary' | 'dropdown';
export type CopyButtonState = 'idle' | 'copying' | 'success' | 'error';
export type CopyButtonValueResolver = () => string | Promise<string>;

export interface CopyButtonError {
  readonly error: unknown;
  readonly value: string;
}

const DEFAULT_FEEDBACK_DURATION_MS = 1000;

@Component({
  selector: 'app-copy-button',
  templateUrl: './copy-button.component.html',
  styleUrl: './copy-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CopyButtonComponent {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private feedbackHandle: ReturnType<typeof setTimeout> | null = null;

  readonly value = input('');
  readonly from = input('');
  readonly resolveValue = input<CopyButtonValueResolver | null>(null);
  readonly disabled = input(false);
  readonly text = input('');
  readonly copyLabel = input('Copy');
  readonly successLabel = input('Copied');
  readonly errorLabel = input('Could not copy');
  readonly feedbackDuration = input(DEFAULT_FEEDBACK_DURATION_MS);
  readonly appearance = input<CopyButtonAppearance>('icon');
  readonly iconPath = input(getIconPath('copy'));
  readonly successIconPath = input(getIconPath('copySuccess'));
  readonly errorIconPath = input(getIconPath('copyError'));

  readonly copied = output<string>();
  readonly copyError = output<CopyButtonError>();

  readonly state = signal<CopyButtonState>('idle');
  readonly announcement = signal('');

  readonly feedbackLabel = computed(() => {
    switch (this.state()) {
      case 'success':
        return this.successLabel();
      case 'error':
        return this.errorLabel();
      case 'copying':
        return this.copyLabel();
      case 'idle':
        return this.copyLabel();
    }
  });

  readonly buttonDisabled = computed(() => this.disabled() || this.state() === 'copying');

  constructor() {
    this.destroyRef.onDestroy(() => this.clearFeedbackHandle());
  }

  async copy(): Promise<void> {
    if (this.buttonDisabled()) {
      return;
    }

    this.clearFeedbackHandle();
    this.state.set('copying');
    this.announcement.set('');

    let text = '';
    try {
      text = await this.copyValue();
      if (!text) {
        throw new Error('Cannot copy an empty value.');
      }

      await this.writeClipboard(text);
      this.state.set('success');
      this.announcement.set(this.successLabel());
      this.copied.emit(text);
      this.scheduleReset();
    } catch (error) {
      this.state.set('error');
      this.announcement.set(this.errorLabel());
      this.copyError.emit({ error, value: text });
      this.scheduleReset();
    }
  }

  private async copyValue(): Promise<string> {
    const resolver = this.resolveValue();
    if (resolver) {
      return (await resolver()).trim();
    }

    const from = this.from().trim();
    if (from) {
      return this.valueFromTarget(from).trim();
    }

    return this.value().trim();
  }

  private valueFromTarget(from: string): string {
    const match = /^(?<id>[^.[\]]+)(?:\[(?<attribute>[^\]]+)\]|\.(?<property>[\w$]+))?$/.exec(from);
    if (!match?.groups) {
      throw new Error(`Invalid copy source "${from}".`);
    }

    const target = this.document.getElementById(match.groups['id']);
    if (!target) {
      throw new Error(`Copy source "${match.groups['id']}" was not found.`);
    }

    const attribute = match.groups['attribute'];
    if (attribute) {
      return target.getAttribute(attribute) ?? '';
    }

    const property = match.groups['property'];
    if (property) {
      const value = Reflect.get(target, property);
      return typeof value === 'string' ? value : `${value ?? ''}`;
    }

    return target.textContent ?? '';
  }

  private async writeClipboard(text: string): Promise<void> {
    const clipboard = this.document.defaultView?.navigator.clipboard;
    if (clipboard?.writeText) {
      await clipboard.writeText(text);
      return;
    }

    if (!this.writeClipboardFallback(text)) {
      throw new Error('Clipboard API is not available.');
    }
  }

  private writeClipboardFallback(text: string): boolean {
    const textArea = this.document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    this.document.body.appendChild(textArea);
    textArea.select();

    try {
      return this.document.execCommand('copy');
    } finally {
      textArea.remove();
    }
  }

  private scheduleReset(): void {
    this.feedbackHandle = setTimeout(
      () => {
        this.state.set('idle');
        this.announcement.set('');
        this.feedbackHandle = null;
      },
      Math.max(0, this.feedbackDuration())
    );
  }

  private clearFeedbackHandle(): void {
    if (this.feedbackHandle !== null) {
      clearTimeout(this.feedbackHandle);
      this.feedbackHandle = null;
    }
  }
}
