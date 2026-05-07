import { ChangeDetectionStrategy, Component, HostListener, computed, input, output, signal } from '@angular/core';

interface CanvasToolbarIcons {
  readonly undo: string;
  readonly redo: string;
  readonly centerView: string;
  readonly zoomOut: string;
  readonly zoomIn: string;
}

@Component({
  selector: 'app-editor-canvas-toolbar',
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
  readonly canUndo = input.required<boolean>();
  readonly canRedo = input.required<boolean>();
  readonly viewportCentered = input.required<boolean>();
  readonly scale = input.required<number>();
  readonly minScale = input.required<number>();
  readonly maxScale = input.required<number>();
  readonly zoomStep = input.required<number>();
  readonly defaultScale = input.required<number>();
  readonly icons = input.required<CanvasToolbarIcons>();
  readonly undoLabel = input.required<string>();
  readonly redoLabel = input.required<string>();
  readonly centerViewLabel = input.required<string>();
  readonly zoomOutLabel = input.required<string>();
  readonly zoomInLabel = input.required<string>();

  readonly undoRequested = output<void>();
  readonly redoRequested = output<void>();
  readonly centerRequested = output<void>();
  readonly scaleRequested = output<number>();

  readonly zoomMenuOpen = signal(false);
  readonly zoomPresetPercents = [50, 100, 150, 200, 300] as const;
  readonly zoomPercent = computed(() => Math.round((this.scale() / this.defaultScale()) * 100));

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
    this.scaleRequested.emit(this.scale() - this.zoomStep());
  }

  zoomIn(): void {
    this.closeZoomMenu();
    this.scaleRequested.emit(this.scale() + this.zoomStep());
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
    this.scaleRequested.emit((this.defaultScale() * percent) / 100);
    this.closeZoomMenu();
  }
}
