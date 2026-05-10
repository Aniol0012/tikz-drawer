import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { keyboardShortcutLabel, normalizeKeyboardShortcut, shortcutFromKeyboardEvent, type KeyboardShortcutCapture } from '../../utils/editor-keyboard.utils';

@Component({
  selector: 'app-keyboard-shortcut-capture',
  standalone: true,
  templateUrl: './keyboard-shortcut-capture.component.html',
  styleUrl: './keyboard-shortcut-capture.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KeyboardShortcutCaptureComponent {
  private readonly captureOverlay = viewChild<ElementRef<HTMLElement>>('captureOverlay');

  @Input({ required: true }) value = '';
  @Input({ required: true }) label = '';
  @Input() instruction = '';
  @Input() previousLabel = 'Previous';
  @Input() nextLabel = 'New';
  @Input() cancelLabel = 'Cancel';
  @Input() applyLabel = 'Apply';
  @Input() macPlatform = false;

  @Output() readonly valueChange = new EventEmitter<string>();

  readonly isCapturing = signal(false);
  readonly pendingShortcut = signal<KeyboardShortcutCapture | null>(null);
  pendingLabel(): string {
    const pending = this.pendingShortcut();
    return pending ? keyboardShortcutLabel(pending.shortcut, this.macPlatform) : '';
  }

  currentLabel(): string {
    return keyboardShortcutLabel(this.value, this.macPlatform);
  }

  canApply(): boolean {
    return this.pendingShortcut()?.complete ?? false;
  }

  beginCapture(): void {
    this.pendingShortcut.set(null);
    this.isCapturing.set(true);
    queueMicrotask(() => this.captureOverlay()?.nativeElement.focus({ preventScroll: true }));
  }

  cancelCapture(): void {
    this.pendingShortcut.set(null);
    this.isCapturing.set(false);
  }

  applyCapture(): void {
    const pending = this.pendingShortcut();
    if (!pending?.complete) {
      return;
    }

    this.valueChange.emit(normalizeKeyboardShortcut(pending.shortcut, this.value));
    this.cancelCapture();
  }

  onCaptureKeydown(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Escape') {
      this.cancelCapture();
      return;
    }

    if (event.key === 'Enter') {
      this.applyCapture();
      return;
    }

    this.pendingShortcut.set(shortcutFromKeyboardEvent(event, this.value));
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    if (this.isCapturing()) {
      this.onCaptureKeydown(event);
    }
  }
}
