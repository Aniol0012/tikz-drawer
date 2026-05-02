import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';

export type CopyButtonAppearance = 'icon' | 'secondary' | 'dropdown';
export type CopyButtonState = 'idle' | 'copying' | 'success' | 'error';
export type CopyButtonValueResolver = () => string | Promise<string>;

export interface CopyButtonError {
  readonly error: unknown;
  readonly value: string;
}

const COPY_ICON_PATH =
  'M9.25 8.25h8.5a1.25 1.25 0 0 1 1.25 1.25v8.25A1.25 1.25 0 0 1 17.75 19h-8.5A1.25 1.25 0 0 1 8 17.75V9.5a1.25 1.25 0 0 1 1.25-1.25ZM6.75 15.75H6A1.25 1.25 0 0 1 4.75 14.5V6.25A1.25 1.25 0 0 1 6 5h8.25a1.25 1.25 0 0 1 1.25 1.25V7';
const SUCCESS_ICON_PATH = 'm5 12.5 4.2 4.2L19 6.8';
const ERROR_ICON_PATH = 'M12 7v6m0 4h.01M12 3.75 21 20.25H3L12 3.75Z';
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
  readonly iconPath = input(COPY_ICON_PATH);
  readonly successIconPath = input(SUCCESS_ICON_PATH);
  readonly errorIconPath = input(ERROR_ICON_PATH);

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
