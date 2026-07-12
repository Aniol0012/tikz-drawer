import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { iconPaths } from '../../config/editor-icons';
import { DEFAULT_EDITOR_SCALE, EDITOR_SCALE_MAX, EDITOR_SCALE_MIN, EDITOR_ZOOM_STEP } from '../../constants/editor.constants';
import { EditorTranslatePipe } from '../../i18n/editor-translate.pipe';

@Component({
  selector: 'app-editor-canvas-toolbar',
  standalone: true,
  imports: [EditorTranslatePipe],
  templateUrl: './editor-canvas-toolbar.component.html',
  styleUrl: './editor-canvas-toolbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': '$event.stopPropagation()',
    '(keydown)': '$event.stopPropagation()',
    '(pointerdown)': '$event.stopPropagation()'
  }
})
export class EditorCanvasToolbarComponent {
  @Input({ required: true }) canUndo = false;
  @Input({ required: true }) canRedo = false;
  @Input({ required: true }) viewportCentered = true;
  @Input({ required: true }) scale = DEFAULT_EDITOR_SCALE;

  @Output() readonly undoRequested = new EventEmitter<void>();
  @Output() readonly redoRequested = new EventEmitter<void>();
  @Output() readonly centerRequested = new EventEmitter<void>();
  @Output() readonly scaleRequested = new EventEmitter<number>();

  readonly icons = {
    undo: iconPaths.undo,
    redo: iconPaths.redo,
    centerView: iconPaths.scene,
    zoomOut: iconPaths.minus,
    zoomIn: iconPaths.plus
  };
  readonly minScale = EDITOR_SCALE_MIN;
  readonly maxScale = EDITOR_SCALE_MAX;
  readonly zoomStep = EDITOR_ZOOM_STEP;
  readonly defaultScale = DEFAULT_EDITOR_SCALE;
  readonly zoomMenuOpen = signal(false);
  readonly zoomPresetPercents = [10, 50, 100, 150, 200, 300] as const;

  zoomPercent(): number {
    return Math.round((this.scale / this.defaultScale) * 100);
  }

  @HostListener('document:click')
  closeZoomMenu(): void {
    this.zoomMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeZoomMenu();
  }

  requestUndo(): void {
    this.undoRequested.emit();
  }

  requestRedo(): void {
    this.redoRequested.emit();
  }

  requestCenter(): void {
    this.centerRequested.emit();
  }

  zoomOut(): void {
    this.closeZoomMenu();
    this.scaleRequested.emit(this.scale - this.zoomStep);
  }

  zoomIn(): void {
    this.closeZoomMenu();
    this.scaleRequested.emit(this.scale + this.zoomStep);
  }

  setScaleFromInput(event: Event): void {
    this.closeZoomMenu();
    this.scaleRequested.emit(Number((event.target as HTMLInputElement).value));
  }

  toggleZoomMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.zoomMenuOpen.update((open) => !open);
  }

  setZoomPercent(percent: number): void {
    this.scaleRequested.emit((this.defaultScale * percent) / 100);
    this.closeZoomMenu();
  }
}
