import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { sceneToStandaloneDocument } from './tikz.codegen';
import { EditorStore } from './editor.store';
import type { CanvasShape, LineShape, ThemeMode } from './tikz.models';

interface DragState {
  readonly pointerId: number;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
}

@Component({
  selector: 'app-editor-page',
  templateUrl: './editor-page.component.html',
  styleUrl: './editor-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [EditorStore],
  host: {
    '[attr.data-theme]': 'store.preferences().theme'
  }
})
export class EditorPageComponent {
  readonly store = inject(EditorStore);
  private readonly document = inject(DOCUMENT);
  private readonly dragState = signal<DragState | null>(null);

  readonly canvasSvg = viewChild.required<ElementRef<SVGSVGElement>>('canvasSvg');
  readonly scene = this.store.scene;
  readonly preferences = this.store.preferences;
  readonly selectedShape = this.store.selectedShape;
  readonly exportedCode = this.store.exportedCode;
  readonly parserWarnings = this.store.parserWarnings;
  readonly objectPresets = this.store.objectPresets;
  readonly scenePresets = this.store.scenePresets;
  readonly objectCount = this.store.objectCount;

  readonly canvasWidth = computed(() => this.scene().bounds.width);
  readonly canvasHeight = computed(() => this.scene().bounds.height);
  readonly themeToggleLabel = computed(() =>
    this.preferences().theme === 'dark' ? 'Switch to light' : 'Switch to dark'
  );
  readonly selectedSummary = computed(() => this.selectedShape()?.name ?? 'Nothing selected');

  setTheme(theme: ThemeMode): void {
    this.store.setTheme(theme);
  }

  toggleTheme(): void {
    this.setTheme(this.preferences().theme === 'dark' ? 'light' : 'dark');
  }

  selectShape(shapeId: string | null): void {
    this.store.selectShape(shapeId);
  }

  addPreset(presetId: string): void {
    this.store.addShapeFromPreset(presetId);
  }

  applyScenePreset(presetId: string): void {
    this.store.applyScenePreset(presetId);
  }

  onSceneNameInput(event: Event): void {
    this.store.renameScene((event.target as HTMLInputElement).value);
  }

  onBooleanPreferenceChange(key: 'snapToGrid' | 'showGrid' | 'showAxes', event: Event): void {
    this.store.patchPreferences({
      [key]: (event.target as HTMLInputElement).checked
    });
  }

  onScaleChange(event: Event): void {
    this.store.patchPreferences({
      scale: Number((event.target as HTMLInputElement).value)
    });
  }

  onImportCodeInput(event: Event): void {
    this.store.updateImportCode((event.target as HTMLTextAreaElement).value);
  }

  applyImportCode(): void {
    this.store.applyImportCode();
  }

  syncImportWithExport(): void {
    this.store.useExportedCodeAsImport();
  }

  copyExportedCode(): void {
    void navigator.clipboard?.writeText(this.exportedCode());
  }

  downloadStandaloneFile(): void {
    const blob = new Blob([sceneToStandaloneDocument(this.scene())], {
      type: 'text/plain;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = 'figure.tex';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  removeSelected(): void {
    this.store.removeSelected();
  }

  duplicateSelected(): void {
    this.store.duplicateSelected();
  }

  updateShapeText(key: 'name' | 'stroke' | 'fill' | 'text' | 'color', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.patchSelectedShape((shape) => ({ ...shape, [key]: value }) as CanvasShape);
  }

  updateShapeNumber(
    key: 'strokeWidth' | 'x' | 'y' | 'width' | 'height' | 'cornerRadius' | 'cx' | 'cy' | 'r' | 'rx' | 'ry' | 'fontSize',
    event: Event
  ): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.store.patchSelectedShape((shape) => ({ ...shape, [key]: value }) as CanvasShape);
  }

  updateShapeBoolean(key: 'arrowStart' | 'arrowEnd', event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.store.patchSelectedShape((shape) => ({ ...shape, [key]: value }) as CanvasShape);
  }

  updateLinePoint(target: 'from' | 'to', axis: 'x' | 'y', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    this.store.patchSelectedShape((shape) => {
      if (shape.kind !== 'line') {
        return shape;
      }

      const currentPoint = shape[target];
      const nextPoint = {
        ...currentPoint,
        [axis]: value
      };

      return {
        ...shape,
        [target]: nextPoint
      } as LineShape;
    });
  }

  startDrag(event: PointerEvent, shape: CanvasShape): void {
    event.stopPropagation();
    this.store.selectShape(shape.id);
    this.dragState.set({
      pointerId: event.pointerId,
      position: this.toScenePoint(event)
    });
    this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
  }

  onCanvasPointerMove(event: PointerEvent): void {
    const activeDrag = this.dragState();

    if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
      return;
    }

    const nextPosition = this.toScenePoint(event);
    const deltaX = this.snap(nextPosition.x - activeDrag.position.x);
    const deltaY = this.snap(nextPosition.y - activeDrag.position.y);

    if (deltaX === 0 && deltaY === 0) {
      return;
    }

    this.store.moveSelectedBy(deltaX, deltaY);
    this.dragState.set({
      ...activeDrag,
      position: nextPosition
    });
  }

  endDrag(event: PointerEvent): void {
    const activeDrag = this.dragState();

    if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
      return;
    }

    this.dragState.set(null);
    this.canvasSvg().nativeElement.releasePointerCapture(event.pointerId);
  }

  toSvgX(x: number): number {
    return this.canvasWidth() / 2 + x * this.preferences().scale;
  }

  toSvgY(y: number): number {
    return this.canvasHeight() / 2 - y * this.preferences().scale;
  }

  shapeTrackBy(_: number, shape: CanvasShape): string {
    return shape.id;
  }

  gridColumns(): number[] {
    const count = Math.floor(this.canvasWidth() / this.preferences().scale / 2);
    return Array.from({ length: count * 2 + 1 }, (_, index) => index - count);
  }

  gridRows(): number[] {
    const count = Math.floor(this.canvasHeight() / this.preferences().scale / 2);
    return Array.from({ length: count * 2 + 1 }, (_, index) => index - count);
  }

  private snap(value: number): number {
    if (!this.preferences().snapToGrid) {
      return value;
    }

    return Math.round(value * 2) / 2;
  }

  private toScenePoint(event: PointerEvent): { x: number; y: number } {
    const svg = this.canvasSvg().nativeElement;
    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / this.preferences().scale;
    const y = (rect.height / 2 - (event.clientY - rect.top)) / this.preferences().scale;

    return {
      x,
      y
    };
  }
}
