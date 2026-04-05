import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { sceneToStandaloneDocument } from './tikz.codegen';
import { EditorStore } from './editor.store';
import { ToolButtonComponent } from './tool-button.component';
import type { CanvasShape, LineShape, ObjectPreset, ScenePreset, ThemeMode } from './tikz.models';

type DockPanel = 'templates' | 'layers' | 'code' | 'settings' | null;
type CodePanelMode = 'export' | 'import';

interface DragState {
  readonly pointerId: number;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
}

interface ToolDescriptor {
  readonly id: string;
  readonly label: string;
  readonly iconPath: string;
}

const getIconPath = (key: string): string => iconPaths[key as keyof typeof iconPaths] ?? iconPaths['rectangle'];

const iconPaths = {
  github:
    'M12 1.5a10.5 10.5 0 0 0-3.32 20.47c.52.1.71-.22.71-.5v-1.75c-2.9.63-3.51-1.22-3.51-1.22-.48-1.2-1.17-1.53-1.17-1.53-.96-.66.08-.65.08-.65 1.06.07 1.62 1.08 1.62 1.08.94 1.61 2.46 1.14 3.06.87.1-.68.37-1.15.67-1.41-2.31-.26-4.75-1.15-4.75-5.13 0-1.13.4-2.05 1.06-2.77-.11-.26-.46-1.31.1-2.73 0 0 .87-.28 2.85 1.05a9.96 9.96 0 0 1 5.2 0c1.98-1.33 2.85-1.05 2.85-1.05.56 1.42.21 2.47.1 2.73.66.72 1.06 1.64 1.06 2.77 0 3.99-2.45 4.87-4.79 5.12.38.33.71.97.71 1.96v2.91c0 .28.19.61.72.5A10.5 10.5 0 0 0 12 1.5Z',
  templates:
    'M4 4.5A2.5 2.5 0 0 1 6.5 2h11A2.5 2.5 0 0 1 20 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 19.5v-15Zm2.5-.5a.5.5 0 0 0-.5.5V7h12V4.5a.5.5 0 0 0-.5-.5h-11Zm11.5 5H6v10.5c0 .28.22.5.5.5h11a.5.5 0 0 0 .5-.5V9ZM8 11h3v3H8v-3Zm5 0h3v1.5h-3V11Zm0 3h3v1.5h-3V14Zm-5 2h8v1.5H8V16Z',
  layers:
    'M12 2 2.5 7 12 12 21.5 7 12 2Zm-7.03 8.3L12 14l7.03-3.7L21.5 11.6 12 16.5 2.5 11.6l2.47-1.3Zm0 4.9L12 18.9l7.03-3.7L21.5 16.5 12 21.4 2.5 16.5l2.47-1.3Z',
  code:
    'M8.7 16.7 3.9 12l4.8-4.7 1.4 1.4L6.7 12l3.4 3.3-1.4 1.4Zm6.6 0-1.4-1.4 3.4-3.3-3.4-3.3 1.4-1.4 4.8 4.7-4.8 4.7Z',
  settings:
    'M19.4 13a7.8 7.8 0 0 0 .06-1 7.8 7.8 0 0 0-.06-1l2.08-1.62a.48.48 0 0 0 .11-.62l-1.97-3.41a.5.5 0 0 0-.6-.22l-2.45.98a7.52 7.52 0 0 0-1.73-1l-.37-2.6a.49.49 0 0 0-.5-.41h-3.94a.49.49 0 0 0-.5.41l-.37 2.6c-.61.24-1.19.58-1.73 1l-2.45-.98a.5.5 0 0 0-.6.22L2.4 8.76a.48.48 0 0 0 .11.62L4.6 11a7.8 7.8 0 0 0-.06 1 7.8 7.8 0 0 0 .06 1L2.52 14.62a.48.48 0 0 0-.11.62l1.97 3.41c.13.22.39.31.6.22l2.45-.98c.54.42 1.12.76 1.73 1l.37 2.6c.04.24.25.41.5.41h3.94c.25 0 .46-.17.5-.41l.37-2.6c.61-.24 1.19-.58 1.73-1l2.45.98c.22.09.47 0 .6-.22l1.97-3.41a.48.48 0 0 0-.11-.62L19.4 13ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z',
  segment: 'M4 18 18 6l2 2-14 12-2-2Z',
  arrow: 'M4 12h11.17l-3.58-3.59L13 7l6 6-6 6-1.41-1.41L15.17 14H4v-2Z',
  rectangle: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z',
  circle:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z',
  ellipse:
    'M12 5c-4.97 0-9 3.13-9 7s4.03 7 9 7 9-3.13 9-7-4.03-7-9-7Zm0 2c3.93 0 7 2.24 7 5s-3.07 5-7 5-7-2.24-7-5 3.07-5 7-5Z',
  text: 'M5 5h14v2H13v12h-2V7H5V5Z',
  blank: 'M5 5h14v14H5z',
  triangle: 'M12 5 4 19h16L12 5Zm0 4.1 4.54 7.9H7.46L12 9.1Z',
  flow: 'M4 7h6v4H4V7Zm10 0h6v4h-6V7ZM9 13h6v4H9v-4Zm-1-4h8v2H8V9Zm3 4V9h2v4h-2Z',
  plot:
    'M5 5h2v12h12v2H5V5Zm3 8.5 2.8-2.8 2.2 2.2 4-4L18.4 10l-5.4 5.4-2.2-2.2L9.4 14.6 8 13.5Z',
  sun:
    'M12 4.5a1 1 0 0 1 1 1V7a1 1 0 1 1-2 0V5.5a1 1 0 0 1 1-1Zm0 12a1 1 0 0 1 1 1V19a1 1 0 1 1-2 0v-1.5a1 1 0 0 1 1-1Zm7.5-5.5a1 1 0 0 1 0 2H18a1 1 0 1 1 0-2h1.5ZM7 12a1 1 0 0 1-1 1H4.5a1 1 0 1 1 0-2H6a1 1 0 0 1 1 1Zm8.3-4.89a1 1 0 0 1 1.4-1.41l1.06 1.06a1 1 0 1 1-1.41 1.41L15.3 7.11Zm-8.01 8.02a1 1 0 0 1 1.41 0l1.06 1.06a1 1 0 0 1-1.41 1.41l-1.06-1.06a1 1 0 0 1 0-1.41Zm9.47.94a1 1 0 0 1 0-1.41l1.06-1.06a1 1 0 1 1 1.41 1.41l-1.06 1.06a1 1 0 0 1-1.41 0ZM8.35 8.17a1 1 0 0 1-1.41 0L5.88 7.11A1 1 0 0 1 7.3 5.7l1.06 1.06a1 1 0 0 1 0 1.41ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z',
  moon:
    'M14.7 3.1a8 8 0 1 0 6.2 11.8 8.5 8.5 0 1 1-6.2-11.8Z',
  close: 'M6.7 5.3 12 10.6l5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3 1.4-1.4Z',
  copy: 'M8 8h11v12H8V8Zm-3-4h11v2H7v10H5V4Z',
  trash:
    'M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Z',
  upload:
    'M12 3 7.5 7.5l1.4 1.4L11 6.8V16h2V6.8l2.1 2.1 1.4-1.4L12 3Zm-7 14h14v4H5v-4Z',
  download:
    'M11 4h2v9.17l2.09-2.08 1.41 1.41L12 17l-4.5-4.5 1.41-1.41L11 13.17V4Zm-6 14h14v2H5v-2Z'
} satisfies Record<string, string>;

@Component({
  selector: 'app-editor-page',
  templateUrl: './editor-page.component.html',
  styleUrl: './editor-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolButtonComponent],
  providers: [EditorStore],
  host: {
    '[attr.data-theme]': 'store.preferences().theme',
    '(window:keydown)': 'handleWindowKeydown($event)'
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

  readonly dockPanel = signal<DockPanel>('layers');
  readonly codePanelMode = signal<CodePanelMode>('export');

  readonly canvasWidth = computed(() => this.scene().bounds.width);
  readonly canvasHeight = computed(() => this.scene().bounds.height);
  readonly themeToggleLabel = computed(() => (this.preferences().theme === 'dark' ? 'Switch to light' : 'Switch to dark'));
  readonly selectedSummary = computed(() => this.selectedShape()?.name ?? 'Nothing selected');
  readonly hasSelection = computed(() => this.selectedShape() !== null);
  readonly activeDockTitle = computed(() => {
    switch (this.dockPanel()) {
      case 'templates':
        return 'Templates';
      case 'layers':
        return 'Layers';
      case 'code':
        return this.codePanelMode() === 'export' ? 'TikZ export' : 'TikZ import';
      case 'settings':
        return 'Canvas settings';
      default:
        return '';
    }
  });

  readonly primaryTools = computed<readonly ToolDescriptor[]>(() =>
    this.objectPresets.map((preset) => ({
      id: preset.id,
      label: preset.title,
      iconPath: getIconPath(preset.icon)
    }))
  );

  readonly dockTools: readonly { readonly panel: Exclude<DockPanel, null>; readonly label: string; readonly iconPath: string }[] = [
    { panel: 'templates', label: 'Templates', iconPath: iconPaths['templates'] },
    { panel: 'layers', label: 'Layers', iconPath: iconPaths['layers'] },
    { panel: 'code', label: 'TikZ code', iconPath: iconPaths['code'] },
    { panel: 'settings', label: 'Canvas settings', iconPath: iconPaths['settings'] }
  ];

  readonly iconPaths = iconPaths;

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
    this.dockPanel.set(null);
  }

  toggleDock(panel: Exclude<DockPanel, null>): void {
    this.dockPanel.update((current) => (current === panel ? null : panel));
  }

  setCodePanelMode(mode: CodePanelMode): void {
    this.codePanelMode.set(mode);
    this.dockPanel.set('code');
  }

  openTemplates(): void {
    this.toggleDock('templates');
  }

  openLayers(): void {
    this.toggleDock('layers');
  }

  openCode(): void {
    this.toggleDock('code');
  }

  openSettings(): void {
    this.toggleDock('settings');
  }

  closeDock(): void {
    this.dockPanel.set(null);
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

  resetZoom(): void {
    this.store.patchPreferences({
      scale: 42
    });
  }

  onImportCodeInput(event: Event): void {
    this.store.updateImportCode((event.target as HTMLTextAreaElement).value);
  }

  applyImportCode(): void {
    this.store.applyImportCode();
    this.codePanelMode.set('import');
  }

  syncImportWithExport(): void {
    this.store.useExportedCodeAsImport();
    this.codePanelMode.set('import');
    this.dockPanel.set('code');
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

  clearScene(): void {
    this.store.applyScenePreset('blank');
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
    key:
      | 'strokeWidth'
      | 'x'
      | 'y'
      | 'width'
      | 'height'
      | 'cornerRadius'
      | 'cx'
      | 'cy'
      | 'r'
      | 'rx'
      | 'ry'
      | 'fontSize',
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
      return {
        ...shape,
        [target]: {
          ...currentPoint,
          [axis]: value
        }
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

  presetTrackBy(_: number, preset: ObjectPreset | ScenePreset): string {
    return preset.id;
  }

  gridColumns(): number[] {
    const count = Math.floor(this.canvasWidth() / this.preferences().scale / 2);
    return Array.from({ length: count * 2 + 1 }, (_, index) => index - count);
  }

  gridRows(): number[] {
    const count = Math.floor(this.canvasHeight() / this.preferences().scale / 2);
    return Array.from({ length: count * 2 + 1 }, (_, index) => index - count);
  }

  shapeIcon(shape: CanvasShape): string {
    const iconKey = shape.kind === 'line' && shape.arrowEnd ? 'arrow' : shape.kind === 'line' ? 'segment' : shape.kind;
    return getIconPath(iconKey);
  }

  presetIconPath(icon: string): string {
    return getIconPath(icon);
  }

  handleWindowKeydown(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.duplicateSelected();
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'delete':
      case 'backspace':
        this.removeSelected();
        return;
      case 'escape':
        this.selectShape(null);
        this.closeDock();
        return;
      case 'g':
        this.store.patchPreferences({
          showGrid: !this.preferences().showGrid
        });
        return;
      case 'l':
        this.openLayers();
        return;
      case 'c':
        this.openCode();
        return;
      case 't':
        this.openTemplates();
        return;
    }
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
