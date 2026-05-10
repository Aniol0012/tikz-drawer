import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { keyboardShortcutLabel, normalizeKeyboardShortcut, shortcutFromKeyboardEvent, type KeyboardShortcutCapture } from '../../utils/editor-keyboard.utils';

export type KeyboardShortcutAssignment = {
  readonly id: string;
  readonly label: string;
  readonly shortcut: string;
};

export type KeyboardShortcutReassignEvent = {
  readonly shortcut: string;
  readonly conflictingActionId: string;
};

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
  @Input() actionId = '';
  @Input() assignedShortcuts: readonly KeyboardShortcutAssignment[] = [];
  @Input() unassignedLabel = 'Unassigned';
  @Input() listeningLabel = 'Listening';
  @Input() conflictTitleLabel = 'Shortcut already in use';
  @Input() conflictDescriptionLabel = 'Choose whether to replace the existing shortcut or keep it and press another key.';
  @Input() conflictReplaceLabel = 'Replace previous';
  @Input() conflictKeepLabel = 'Keep previous';
  @Input() macPlatform = false;

  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly reassignShortcut = new EventEmitter<KeyboardShortcutReassignEvent>();

  readonly isCapturing = signal(false);
  readonly pendingShortcut = signal<KeyboardShortcutCapture | null>(null);
  readonly conflict = signal<KeyboardShortcutAssignment | null>(null);

  pendingLabel(): string {
    const pending = this.pendingShortcut();
    return pending ? this.shortcutLabel(pending.shortcut) : '';
  }

  currentLabel(): string {
    return this.shortcutLabel(this.value);
  }

  canApply(): boolean {
    return this.pendingShortcut()?.complete ?? false;
  }

  beginCapture(): void {
    if (this.isCapturing()) {
      this.focusCaptureSurface();
      return;
    }

    this.pendingShortcut.set(null);
    this.conflict.set(null);
    this.isCapturing.set(true);
    this.focusCaptureSurface();
  }

  cancelCapture(): void {
    this.pendingShortcut.set(null);
    this.conflict.set(null);
    this.isCapturing.set(false);
  }

  applyCapture(): void {
    const pending = this.pendingShortcut();
    if (!pending?.complete) {
      return;
    }

    const normalizedShortcut = normalizeKeyboardShortcut(pending.shortcut, this.value);
    const conflict = this.findConflict(normalizedShortcut);
    if (conflict) {
      this.conflict.set(conflict);
      return;
    }

    this.valueChange.emit(normalizedShortcut);
    this.cancelCapture();
  }

  replaceConflictingShortcut(): void {
    const pending = this.pendingShortcut();
    const conflict = this.conflict();
    if (!pending?.complete || !conflict) {
      return;
    }

    this.reassignShortcut.emit({
      shortcut: normalizeKeyboardShortcut(pending.shortcut, this.value),
      conflictingActionId: conflict.id
    });
    this.cancelCapture();
  }

  keepConflictingShortcut(): void {
    this.pendingShortcut.set(null);
    this.conflict.set(null);
    this.focusCaptureSurface();
  }

  onOverlayPointerDown(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onOverlayClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.target === event.currentTarget) {
      this.cancelCapture();
    }
  }

  onCaptureKeydown(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Escape') {
      this.cancelCapture();
      return;
    }

    if (event.key === 'Enter') {
      if (this.conflict()) {
        this.replaceConflictingShortcut();
      } else {
        this.applyCapture();
      }
      return;
    }

    this.pendingShortcut.set(shortcutFromKeyboardEvent(event, this.value));
    this.conflict.set(null);
    if (this.pendingShortcut()?.complete) {
      this.applyCapture();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    if (this.isCapturing()) {
      this.onCaptureKeydown(event);
    }
  }

  private findConflict(shortcut: string): KeyboardShortcutAssignment | null {
    if (!shortcut.trim()) {
      return null;
    }

    const normalizedShortcut = normalizeKeyboardShortcut(shortcut);
    return (
      this.assignedShortcuts.find((assignment) => assignment.id !== this.actionId && normalizeKeyboardShortcut(assignment.shortcut) === normalizedShortcut) ??
      null
    );
  }

  private shortcutLabel(shortcut: string): string {
    return shortcut.trim() ? keyboardShortcutLabel(shortcut, this.macPlatform) : this.unassignedLabel;
  }

  private focusCaptureSurface(): void {
    const focus = (): void => this.captureOverlay()?.nativeElement.focus({ preventScroll: true });
    queueMicrotask(focus);
    globalThis.requestAnimationFrame?.(focus);
    setTimeout(focus, 0);
  }
}
