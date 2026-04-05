import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import packageManifest from '../../../../package.json';
import { iconPaths, getIconPath } from './editor-icons';
import {
  categoryOrder,
  categoryTranslationKey,
  detectLanguage,
  localizedShapeKinds,
  translations,
  type LanguageCode,
  type SharedScenePayload
} from './editor-page.i18n';
import {
  decodeSharePayload,
  encodeSharePayload,
  formatValue,
  highlightLatex,
  translateShapeBy
} from './editor-page.utils';
import { sceneToStandaloneDocument } from './tikz.codegen';
import { EditorStore } from './editor.store';
import type {
  CanvasShape,
  EditorPreferences,
  LineShape,
  ObjectPreset,
  Point,
  PresetCategory,
  ScenePreset,
  ThemeMode
} from './tikz.models';

type InspectorTab = 'properties' | 'scene' | 'code';
type ExportMode = 'snippet' | 'standalone';
type ToolId = 'select' | string;
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'from' | 'to';
type ContextTarget = 'canvas' | 'shape';

interface ToolDescriptor {
  readonly id: ToolId;
  readonly label: string;
  readonly description: string;
  readonly iconPath: string;
  readonly shortcut?: string;
}

interface LibrarySection {
  readonly category: PresetCategory;
  readonly title: string;
  readonly iconPath: string;
  readonly presets: readonly ObjectPreset[];
}

interface SelectionBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

interface HandleDescriptor {
  readonly id: ResizeHandle;
  readonly x: number;
  readonly y: number;
  readonly cursor: string;
}

interface MoveInteractionState {
  readonly kind: 'move';
  readonly pointerId: number;
  readonly startWorldPoint: Point;
  readonly initialShapes: readonly CanvasShape[];
}

interface PanInteractionState {
  readonly kind: 'pan';
  readonly pointerId: number;
  readonly lastClientPoint: Point;
}

interface ResizeInteractionState {
  readonly kind: 'resize';
  readonly pointerId: number;
  readonly handle: ResizeHandle;
  readonly initialShape: CanvasShape;
}

interface MarqueeInteractionState {
  readonly kind: 'marquee';
  readonly pointerId: number;
  readonly startWorldPoint: Point;
  readonly currentWorldPoint: Point;
  readonly additive: boolean;
}

type InteractionState = MoveInteractionState | PanInteractionState | ResizeInteractionState | MarqueeInteractionState;

interface ContextMenuState {
  readonly clientX: number;
  readonly clientY: number;
  readonly target: ContextTarget;
  readonly shapeId: string | null;
}

interface SidebarResizeState {
  readonly side: 'left' | 'right';
  readonly startX: number;
  readonly startWidth: number;
}

@Component({
  selector: 'app-editor-page',
  templateUrl: './editor-page.component.html',
  styleUrl: './editor-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [EditorStore],
  host: {
    '[attr.data-theme]': 'store.preferences().theme',
    '(window:keydown)': 'handleWindowKeydown($event)',
    '(window:keyup)': 'handleWindowKeyup($event)',
    '(window:blur)': 'handleWindowBlur()',
    '(window:pointermove)': 'handleWindowPointerMove($event)',
    '(window:pointerup)': 'handleWindowPointerUp()'
  }
})
export class EditorPageComponent {
  readonly store = inject(EditorStore);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly canvasSvg = viewChild.required<ElementRef<SVGSVGElement>>('canvasSvg');
  readonly canvasViewport = viewChild.required<ElementRef<HTMLDivElement>>('canvasViewport');

  readonly appVersion = packageManifest.version;
  readonly scene = this.store.scene;
  readonly preferences = this.store.preferences;
  readonly selectedShape = this.store.selectedShape;
  readonly selectedShapes = this.store.selectedShapes;
  readonly selectionCount = this.store.selectionCount;
  readonly exportedCode = this.store.exportedCode;
  readonly parserWarnings = this.store.parserWarnings;
  readonly objectPresets = this.store.objectPresets;
  readonly scenePresets = this.store.scenePresets;
  readonly objectCount = this.store.objectCount;
  readonly canUndo = this.store.canUndo;
  readonly canRedo = this.store.canRedo;

  readonly language = signal<LanguageCode>(detectLanguage());
  readonly inspectorTab = signal<InspectorTab>('properties');
  readonly activeTool = signal<ToolId>('select');
  readonly viewportCenter = signal<Point>({ x: 0, y: 0 });
  readonly canvasWidth = signal(1280);
  readonly canvasHeight = signal(840);
  readonly interactionState = signal<InteractionState | null>(null);
  readonly contextMenu = signal<ContextMenuState | null>(null);
  readonly fileMenuOpen = signal(false);
  readonly exportModalOpen = signal(false);
  readonly exportMode = signal<ExportMode>('standalone');
  readonly libraryQuery = signal('');
  readonly shareFeedback = signal('');
  readonly leftSidebarWidth = signal(288);
  readonly rightSidebarWidth = signal(340);
  readonly sidebarResizeState = signal<SidebarResizeState | null>(null);
  readonly collapsedSections = signal<Record<string, boolean>>({
    scenePresets: false,
    essentials: false,
    flow: false,
    geometry: false,
    data: true,
    interface: true,
    concepts: true,
    properties: false,
    sceneSettings: false,
    layers: false,
    generatedCode: false,
    importCode: true
  });
  readonly spacePressed = signal(false);
  readonly shiftPressed = signal(false);
  readonly altPressed = signal(false);
  readonly ignoreNextCanvasClick = signal(false);
  readonly iconMap = iconPaths;

  readonly zoomPercent = computed(() => Math.round((this.preferences().scale / 32) * 100));
  readonly selectionLabel = computed(() => {
    if (this.selectionCount() === 0) return this.t('noneSelected');
    if (this.selectionCount() === 1) return this.selectedShape()?.name ?? this.t('noneSelected');
    return `${this.selectionCount()} ${this.t('objects').toLowerCase()}`;
  });
  readonly activePreset = computed(() => this.objectPresets.find((preset) => preset.id === this.activeTool()) ?? null);
  readonly activeToolLabel = computed(() => {
    const preset = this.activePreset();
    return preset ? this.presetTitle(preset) : this.t('selection');
  });
  readonly visibleWorldBounds = computed(() => {
    const scale = this.preferences().scale;
    const halfWidth = this.canvasWidth() / 2 / scale;
    const halfHeight = this.canvasHeight() / 2 / scale;
    const viewportCenter = this.viewportCenter();
    return {
      left: viewportCenter.x - halfWidth,
      right: viewportCenter.x + halfWidth,
      top: viewportCenter.y + halfHeight,
      bottom: viewportCenter.y - halfHeight
    };
  });
  readonly toolbarTools = computed<readonly ToolDescriptor[]>(() => [
    {
      id: 'select',
      label: this.t('selection'),
      description: this.t('selection'),
      iconPath: getIconPath('select'),
      shortcut: 'V'
    },
    ...this.objectPresets
      .filter((preset) => preset.quickAccess)
      .map((preset) => ({
        id: preset.id,
        label: this.presetTitle(preset),
        description: this.presetDescription(preset),
        iconPath: getIconPath(preset.icon),
        shortcut: this.toolShortcut(preset.id)
      }))
  ]);
  readonly librarySections = computed<readonly LibrarySection[]>(() => {
    const query = this.libraryQuery().trim().toLowerCase();
    return categoryOrder
      .map((category) => {
        const presets = this.objectPresets.filter((preset) => {
          if (preset.category !== category) return false;
          if (!query) return true;
          const haystack = [
            this.presetTitle(preset),
            this.presetDescription(preset),
            preset.title,
            preset.description,
            ...(preset.searchTerms ?? [])
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(query);
        });
        return {
          category,
          title: this.t(categoryTranslationKey[category]),
          iconPath: getIconPath(this.iconForCategory(category)),
          presets: presets.map((preset) => ({
            ...preset,
            title: this.presetTitle(preset),
            description: this.presetDescription(preset)
          }))
        };
      })
      .filter((section) => section.presets.length > 0);
  });
  readonly selectionBounds = computed<SelectionBounds | null>(() => this.computeBounds(this.selectedShapes()));
  readonly selectionHandles = computed<readonly HandleDescriptor[]>(() => {
    const selectedShape = this.selectedShape();
    if (!selectedShape) return [];
    if (selectedShape.kind === 'line') {
      return [
        { id: 'from', x: this.toSvgX(selectedShape.from.x), y: this.toSvgY(selectedShape.from.y), cursor: 'crosshair' },
        { id: 'to', x: this.toSvgX(selectedShape.to.x), y: this.toSvgY(selectedShape.to.y), cursor: 'crosshair' }
      ];
    }
    if (selectedShape.kind === 'text') return [];
    const selectionBounds = this.selectionBounds();
    if (!selectionBounds) return [];
    const centerX = (selectionBounds.left + selectionBounds.right) / 2;
    const centerY = (selectionBounds.top + selectionBounds.bottom) / 2;
    return [
      { id: 'nw', x: this.toSvgX(selectionBounds.left), y: this.toSvgY(selectionBounds.top), cursor: 'nwse-resize' },
      { id: 'n', x: this.toSvgX(centerX), y: this.toSvgY(selectionBounds.top), cursor: 'ns-resize' },
      { id: 'ne', x: this.toSvgX(selectionBounds.right), y: this.toSvgY(selectionBounds.top), cursor: 'nesw-resize' },
      { id: 'e', x: this.toSvgX(selectionBounds.right), y: this.toSvgY(centerY), cursor: 'ew-resize' },
      {
        id: 'se',
        x: this.toSvgX(selectionBounds.right),
        y: this.toSvgY(selectionBounds.bottom),
        cursor: 'nwse-resize'
      },
      { id: 's', x: this.toSvgX(centerX), y: this.toSvgY(selectionBounds.bottom), cursor: 'ns-resize' },
      { id: 'sw', x: this.toSvgX(selectionBounds.left), y: this.toSvgY(selectionBounds.bottom), cursor: 'nesw-resize' },
      { id: 'w', x: this.toSvgX(selectionBounds.left), y: this.toSvgY(centerY), cursor: 'ew-resize' }
    ];
  });
  readonly marqueeBounds = computed(() => {
    const interactionState = this.interactionState();
    if (!interactionState || interactionState.kind !== 'marquee') return null;
    const left = Math.min(interactionState.startWorldPoint.x, interactionState.currentWorldPoint.x);
    const right = Math.max(interactionState.startWorldPoint.x, interactionState.currentWorldPoint.x);
    const bottom = Math.min(interactionState.startWorldPoint.y, interactionState.currentWorldPoint.y);
    const top = Math.max(interactionState.startWorldPoint.y, interactionState.currentWorldPoint.y);
    return {
      x: this.toSvgX(left),
      y: this.toSvgY(top),
      width: (right - left) * this.preferences().scale,
      height: (top - bottom) * this.preferences().scale
    };
  });
  readonly standaloneDocument = computed(() => sceneToStandaloneDocument(this.scene()));
  readonly displayedExportCode = computed(() =>
    this.exportMode() === 'snippet' ? this.exportedCode() : this.standaloneDocument()
  );
  readonly highlightedSnippetCode = computed(() => highlightLatex(this.exportedCode()));
  readonly highlightedExportCode = computed(() => highlightLatex(this.displayedExportCode()));
  readonly shareUrl = computed(() => this.buildShareUrl());

  constructor() {
    afterNextRender(() => {
      const viewport = this.canvasViewport().nativeElement;
      const updateCanvasSize = () => {
        this.canvasWidth.set(Math.max(420, Math.round(viewport.clientWidth)));
        this.canvasHeight.set(Math.max(320, Math.round(viewport.clientHeight)));
      };

      const resizeObserver = new ResizeObserver(() => updateCanvasSize());
      resizeObserver.observe(viewport);
      updateCanvasSize();
      this.restoreSharedSceneFromUrl();
      this.destroyRef.onDestroy(() => resizeObserver.disconnect());
    });
  }

  t(key: string): string {
    return translations[this.language()][key] ?? key;
  }

  tOrFallback(key: string, fallback: string): string {
    return translations[this.language()][key] ?? fallback;
  }

  localizedShapeKind(kind: CanvasShape['kind']): string {
    return localizedShapeKinds[this.language()][kind];
  }

  presetTitle(preset: ObjectPreset): string {
    return this.tOrFallback(`preset.${preset.id}.title`, preset.title);
  }

  presetDescription(preset: ObjectPreset): string {
    return this.tOrFallback(`preset.${preset.id}.description`, preset.description);
  }

  scenePresetTitle(preset: ScenePreset): string {
    return this.tOrFallback(`scenePreset.${preset.id}.title`, preset.title);
  }

  scenePresetDescription(preset: ScenePreset): string {
    return this.tOrFallback(`scenePreset.${preset.id}.description`, preset.description);
  }

  toolShortcut(toolId: ToolId): string | undefined {
    switch (toolId) {
      case 'select':
        return 'V';
      case 'label':
        return 'T';
      case 'box':
        return 'R';
      case 'circle':
        return 'C';
      case 'segment':
        return 'L';
      case 'arrow':
        return 'A';
      case 'node':
        return 'N';
      case 'ellipse':
        return 'E';
      default:
        return undefined;
    }
  }

  iconForCategory(category: PresetCategory): string {
    switch (category) {
      case 'essentials':
        return 'library';
      case 'flow':
        return 'pipeline';
      case 'geometry':
        return 'triangle';
      case 'data':
        return 'bars';
      case 'interface':
        return 'browser';
      case 'concepts':
        return 'hub';
    }
  }

  setLanguage(language: LanguageCode): void {
    this.language.set(language);
  }

  isSectionCollapsed(sectionId: string): boolean {
    return this.collapsedSections()[sectionId] ?? false;
  }

  toggleSection(sectionId: string): void {
    this.collapsedSections.update((sections) => ({
      ...sections,
      [sectionId]: !(sections[sectionId] ?? false)
    }));
  }

  startSidebarResize(event: PointerEvent, side: 'left' | 'right'): void {
    event.preventDefault();
    event.stopPropagation();
    this.sidebarResizeState.set({
      side,
      startX: event.clientX,
      startWidth: side === 'left' ? this.leftSidebarWidth() : this.rightSidebarWidth()
    });
  }

  setTheme(theme: ThemeMode): void {
    this.store.setTheme(theme);
  }

  toggleTheme(): void {
    this.setTheme(this.preferences().theme === 'dark' ? 'light' : 'dark');
  }

  toggleFileMenu(): void {
    this.fileMenuOpen.update((isOpen) => !isOpen);
  }

  closeFileMenu(): void {
    this.fileMenuOpen.set(false);
  }

  openExportModal(mode: ExportMode = 'standalone'): void {
    this.closeFileMenu();
    this.exportMode.set(mode);
    this.exportModalOpen.set(true);
    this.shareFeedback.set('');
  }

  closeExportModal(): void {
    this.exportModalOpen.set(false);
    this.shareFeedback.set('');
  }

  setInspectorTab(tab: InspectorTab): void {
    this.inspectorTab.set(tab);
  }

  setLibraryQuery(value: string): void {
    this.libraryQuery.set(value);
  }

  setActiveTool(toolId: ToolId): void {
    this.activeTool.set(toolId);
    this.closeContextMenu();
    this.closeFileMenu();
  }

  selectShape(shapeId: string | null): void {
    this.closeContextMenu();
    this.store.selectShape(shapeId);
    if (shapeId) {
      this.setInspectorTab('properties');
    }
  }

  applyScenePreset(presetId: string): void {
    this.runSceneMutation(() => {
      const preset = this.scenePresets.find((entry) => entry.id === presetId);
      this.store.applyScenePreset(presetId);
      if (preset) {
        this.store.renameScene(this.scenePresetTitle(preset));
      }
      this.viewportCenter.set({ x: 0, y: 0 });
      this.activeTool.set('select');
      this.inspectorTab.set('scene');
      this.closeFileMenu();
    });
  }

  resetScene(): void {
    this.applyScenePreset('blank');
  }

  resetViewport(): void {
    this.viewportCenter.set({ x: 0, y: 0 });
  }

  addShapeAt(point: Point): void {
    const activeTool = this.activeTool();
    if (activeTool === 'select') {
      return;
    }

    this.runSceneMutation(() => {
      this.store.addPresetAt(activeTool, this.snapScenePoint(point));
      this.inspectorTab.set('properties');
    });
  }

  undo(): void {
    this.closeContextMenu();
    this.store.undo();
  }

  redo(): void {
    this.closeContextMenu();
    this.store.redo();
  }

  zoomIn(): void {
    this.setScaleFromViewportCenter(this.preferences().scale + 4);
  }

  zoomOut(): void {
    this.setScaleFromViewportCenter(this.preferences().scale - 4);
  }

  resetZoom(): void {
    this.setScaleFromViewportCenter(32);
  }

  downloadStandaloneFile(): void {
    const blob = new Blob([this.standaloneDocument()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.scene().name || 'figure'}.tex`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  copyExportedCode(): void {
    void navigator.clipboard?.writeText(this.exportedCode());
  }

  copyStandaloneCode(): void {
    void navigator.clipboard?.writeText(this.standaloneDocument());
  }

  async copyShareLink(): Promise<void> {
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(this.shareUrl());
    this.shareFeedback.set(this.t('copied'));
  }

  onImportCodeInput(event: Event): void {
    this.store.updateImportCode((event.target as HTMLTextAreaElement).value);
  }

  applyImportCode(): void {
    this.runSceneMutation(() => {
      this.store.applyImportCode();
      this.viewportCenter.set({ x: 0, y: 0 });
      this.inspectorTab.set('code');
    });
  }

  removeSelected(): void {
    this.runSceneMutation(() => this.store.removeSelected());
  }

  duplicateSelected(): void {
    this.runSceneMutation(() => this.store.duplicateSelected());
  }

  bringSelectedToFront(): void {
    this.runSceneMutation(() => this.store.bringSelectedToFront());
  }

  sendSelectedToBack(): void {
    this.runSceneMutation(() => this.store.sendSelectedToBack());
  }

  updatePreferenceNumber(
    key: 'scale' | 'snapStep' | 'defaultStrokeWidth',
    event: Event,
    minimumValue: number,
    maximumValue?: number
  ): void {
    const rawValue = Number((event.target as HTMLInputElement).value);
    const clampedValue =
      maximumValue === undefined
        ? Math.max(minimumValue, rawValue)
        : Math.min(maximumValue, Math.max(minimumValue, rawValue));
    this.store.patchPreferences({ [key]: clampedValue } as Partial<EditorPreferences>);
  }

  updatePreferenceText(key: 'defaultStroke' | 'defaultFill', event: Event): void {
    this.store.patchPreferences({ [key]: (event.target as HTMLInputElement).value } as Partial<EditorPreferences>);
  }

  onBooleanPreferenceChange(key: 'snapToGrid' | 'showGrid' | 'showAxes', event: Event): void {
    this.store.patchPreferences({ [key]: (event.target as HTMLInputElement).checked } as Partial<EditorPreferences>);
  }

  onSceneNameInput(event: Event): void {
    this.store.renameScene((event.target as HTMLInputElement).value);
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

      return {
        ...shape,
        [target]: {
          ...shape[target],
          [axis]: value
        }
      } as LineShape;
    });
  }

  selectionContainsShape(shapeId: string): boolean {
    return this.selectedShapes().some((shape) => shape.id === shapeId);
  }

  openCanvasContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu.set({
      clientX: event.clientX,
      clientY: event.clientY,
      target: 'canvas',
      shapeId: this.selectedShape()?.id ?? null
    });
  }

  openShapeContextMenu(event: MouseEvent, shape: CanvasShape): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.selectionContainsShape(shape.id)) {
      this.store.selectShape(shape.id);
    }
    this.setInspectorTab('properties');
    this.contextMenu.set({
      clientX: event.clientX,
      clientY: event.clientY,
      target: 'shape',
      shapeId: shape.id
    });
  }

  closeContextMenu(): void {
    this.contextMenu.set(null);
  }

  runContextAction(action: 'duplicate' | 'delete' | 'front' | 'back'): void {
    switch (action) {
      case 'duplicate':
        this.duplicateSelected();
        break;
      case 'delete':
        this.removeSelected();
        break;
      case 'front':
        this.bringSelectedToFront();
        break;
      case 'back':
        this.sendSelectedToBack();
        break;
    }
    this.closeContextMenu();
  }

  onCanvasViewportPointerDown(event: PointerEvent): void {
    this.closeContextMenu();
    this.closeFileMenu();

    if (event.button === 1 || (event.button === 0 && this.spacePressed())) {
      event.preventDefault();
      this.interactionState.set({
        kind: 'pan',
        pointerId: event.pointerId,
        lastClientPoint: { x: event.clientX, y: event.clientY }
      });
      this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
      return;
    }

    if (event.button === 0 && this.activeTool() === 'select') {
      this.interactionState.set({
        kind: 'marquee',
        pointerId: event.pointerId,
        startWorldPoint: this.toScenePoint(event.clientX, event.clientY),
        currentWorldPoint: this.toScenePoint(event.clientX, event.clientY),
        additive: event.shiftKey
      });
      this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
    }
  }

  startMove(event: PointerEvent, shape: CanvasShape): void {
    if (this.activeTool() !== 'select' || event.button !== 0 || this.spacePressed()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.shiftKey) {
      this.store.toggleShapeInSelection(shape.id);
      return;
    }

    if (!this.selectionContainsShape(shape.id)) {
      this.store.selectShape(shape.id);
    }
    this.setInspectorTab('properties');

    this.store.recordHistoryCheckpoint();
    this.interactionState.set({
      kind: 'move',
      pointerId: event.pointerId,
      startWorldPoint: this.toScenePoint(event.clientX, event.clientY),
      initialShapes: structuredClone(this.selectedShapes())
    });
    this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
  }

  startResize(event: PointerEvent, handle: ResizeHandle): void {
    const selectedShape = this.selectedShape();
    if (!selectedShape || this.activeTool() !== 'select' || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.store.recordHistoryCheckpoint();
    this.interactionState.set({
      kind: 'resize',
      pointerId: event.pointerId,
      handle,
      initialShape: structuredClone(selectedShape)
    });
    this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
  }

  onCanvasPointerMove(event: PointerEvent): void {
    const interactionState = this.interactionState();
    if (!interactionState || interactionState.pointerId !== event.pointerId) {
      return;
    }

    if (interactionState.kind === 'move') {
      const nextWorldPoint = this.toScenePoint(event.clientX, event.clientY);
      const deltaX = this.snap(nextWorldPoint.x - interactionState.startWorldPoint.x);
      const deltaY = this.snap(nextWorldPoint.y - interactionState.startWorldPoint.y);
      const nextShapes = interactionState.initialShapes.map((shape) => translateShapeBy(shape, deltaX, deltaY));
      this.store.replaceShapes(nextShapes);
      return;
    }

    if (interactionState.kind === 'pan') {
      const deltaClientX = event.clientX - interactionState.lastClientPoint.x;
      const deltaClientY = event.clientY - interactionState.lastClientPoint.y;
      const scale = this.preferences().scale;
      this.viewportCenter.update((viewportCenter) => ({
        x: viewportCenter.x - deltaClientX / scale,
        y: viewportCenter.y + deltaClientY / scale
      }));
      this.interactionState.set({ ...interactionState, lastClientPoint: { x: event.clientX, y: event.clientY } });
      return;
    }

    if (interactionState.kind === 'marquee') {
      this.interactionState.set({
        ...interactionState,
        currentWorldPoint: this.toScenePoint(event.clientX, event.clientY)
      });
      return;
    }

    const resizedShape = this.resizeShape(
      interactionState.initialShape,
      interactionState.handle,
      this.snapScenePoint(this.toScenePoint(event.clientX, event.clientY))
    );
    this.store.patchSelectedShape(() => resizedShape);
  }

  endInteraction(event: PointerEvent): void {
    const interactionState = this.interactionState();
    if (!interactionState || interactionState.pointerId !== event.pointerId) {
      return;
    }

    if (interactionState.kind === 'marquee') {
      const marqueeShapeIds = this.findShapesInsideBounds({
        left: Math.min(interactionState.startWorldPoint.x, interactionState.currentWorldPoint.x),
        right: Math.max(interactionState.startWorldPoint.x, interactionState.currentWorldPoint.x),
        bottom: Math.min(interactionState.startWorldPoint.y, interactionState.currentWorldPoint.y),
        top: Math.max(interactionState.startWorldPoint.y, interactionState.currentWorldPoint.y)
      });
      this.store.setSelectedShapes(
        interactionState.additive
          ? [...this.selectedShapes().map((shape) => shape.id), ...marqueeShapeIds]
          : marqueeShapeIds
      );
    }

    if (this.canvasSvg().nativeElement.hasPointerCapture(event.pointerId)) {
      this.canvasSvg().nativeElement.releasePointerCapture(event.pointerId);
    }

    this.ignoreNextCanvasClick.set(true);
    this.interactionState.set(null);
  }

  onCanvasWheel(event: WheelEvent): void {
    event.preventDefault();
    this.setScaleAtClientPoint(this.preferences().scale + (event.deltaY < 0 ? 4 : -4), event.clientX, event.clientY);
  }

  onCanvasBackgroundClick(event: MouseEvent): void {
    if (this.ignoreNextCanvasClick()) {
      this.ignoreNextCanvasClick.set(false);
      return;
    }

    if (this.activeTool() === 'select') {
      if (!this.interactionState()) {
        this.store.selectShape(null);
      }
      return;
    }

    this.addShapeAt(this.toScenePoint(event.clientX, event.clientY));
  }

  toSvgX(x: number): number {
    return this.canvasWidth() / 2 + (x - this.viewportCenter().x) * this.preferences().scale;
  }

  toSvgY(y: number): number {
    return this.canvasHeight() / 2 - (y - this.viewportCenter().y) * this.preferences().scale;
  }

  scaledStrokeWidth(strokeWidth: number): number {
    return Math.max(strokeWidth * this.preferences().scale * 0.05, 1);
  }

  presetIconPath(icon: string): string {
    return getIconPath(icon);
  }

  shapeIcon(shape: CanvasShape): string {
    return getIconPath(
      shape.kind === 'line' && shape.arrowEnd ? 'arrow' : shape.kind === 'line' ? 'segment' : shape.kind
    );
  }

  selectionOutline(): {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  } | null {
    const selectionBounds = this.selectionBounds();
    if (!selectionBounds) return null;
    return {
      x: this.toSvgX(selectionBounds.left),
      y: this.toSvgY(selectionBounds.top),
      width: (selectionBounds.right - selectionBounds.left) * this.preferences().scale,
      height: (selectionBounds.top - selectionBounds.bottom) * this.preferences().scale
    };
  }

  lineSelectionPath(): string | null {
    const selectedShape = this.selectedShape();
    if (!selectedShape || selectedShape.kind !== 'line') return null;
    return `M ${this.toSvgX(selectedShape.from.x)} ${this.toSvgY(selectedShape.from.y)} L ${this.toSvgX(selectedShape.to.x)} ${this.toSvgY(selectedShape.to.y)}`;
  }

  gridColumns(): number[] {
    const visibleWorldBounds = this.visibleWorldBounds();
    const gridStep = 1;
    const start = Math.floor(visibleWorldBounds.left / gridStep) - 1;
    const end = Math.ceil(visibleWorldBounds.right / gridStep) + 1;
    return Array.from({ length: end - start + 1 }, (_, index) => (start + index) * gridStep);
  }

  gridRows(): number[] {
    const visibleWorldBounds = this.visibleWorldBounds();
    const gridStep = 1;
    const start = Math.floor(visibleWorldBounds.bottom / gridStep) - 1;
    const end = Math.ceil(visibleWorldBounds.top / gridStep) + 1;
    return Array.from({ length: end - start + 1 }, (_, index) => (start + index) * gridStep);
  }

  shapeTrackBy(_: number, shape: CanvasShape): string {
    return shape.id;
  }

  presetTrackBy(_: number, preset: ObjectPreset | ScenePreset): string {
    return preset.id;
  }

  handleTrackBy(_: number, handle: HandleDescriptor): string {
    return handle.id;
  }

  formatValue(value: number): string {
    return formatValue(value);
  }

  handleWindowKeydown(event: KeyboardEvent): void {
    if (event.key === ' ') {
      this.spacePressed.set(true);
      if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
      }
    }
    if (event.key === 'Shift') this.shiftPressed.set(true);
    if (event.key === 'Alt') this.altPressed.set(true);

    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && event.shiftKey) {
      event.preventDefault();
      this.redo();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.redo();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      this.undo();
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'v':
        this.setActiveTool('select');
        return;
      case 't':
        this.setActiveTool('label');
        return;
      case 'r':
        this.setActiveTool('box');
        return;
      case 'c':
        this.setActiveTool('circle');
        return;
      case 'l':
        this.setActiveTool('segment');
        return;
      case 'a':
        this.setActiveTool('arrow');
        return;
      case 'n':
        this.setActiveTool('node');
        return;
      case 'e':
        this.setActiveTool('ellipse');
        return;
      case 'delete':
      case 'backspace':
        this.removeSelected();
        return;
      case 'escape':
        this.store.selectShape(null);
        this.closeContextMenu();
        this.closeFileMenu();
        this.closeExportModal();
        return;
      case '=':
      case '+':
        this.zoomIn();
        return;
      case '-':
        this.zoomOut();
        return;
    }
  }

  handleWindowKeyup(event: KeyboardEvent): void {
    if (event.key === ' ') this.spacePressed.set(false);
    if (event.key === 'Shift') this.shiftPressed.set(false);
    if (event.key === 'Alt') this.altPressed.set(false);
  }

  handleWindowBlur(): void {
    this.spacePressed.set(false);
    this.shiftPressed.set(false);
    this.altPressed.set(false);
    this.interactionState.set(null);
    this.sidebarResizeState.set(null);
  }

  handleWindowPointerMove(event: PointerEvent): void {
    const resizeState = this.sidebarResizeState();
    if (!resizeState) return;

    if (resizeState.side === 'left') {
      const delta = event.clientX - resizeState.startX;
      this.leftSidebarWidth.set(Math.min(420, Math.max(220, resizeState.startWidth + delta)));
      return;
    }

    const delta = resizeState.startX - event.clientX;
    this.rightSidebarWidth.set(Math.min(460, Math.max(260, resizeState.startWidth + delta)));
  }

  handleWindowPointerUp(): void {
    this.sidebarResizeState.set(null);
  }

  private runSceneMutation(action: () => void): void {
    this.closeContextMenu();
    this.store.recordHistoryCheckpoint();
    action();
  }

  private buildShareUrl(): string {
    const location = globalThis.location;
    if (!location) {
      return '';
    }

    const payload: SharedScenePayload = {
      scene: this.scene(),
      preferences: this.preferences(),
      importCode: this.store.importCode(),
      viewportCenter: this.viewportCenter()
    };
    const url = new URL(location.href);
    url.searchParams.set('share', encodeSharePayload(payload));
    return url.toString();
  }

  private restoreSharedSceneFromUrl(): void {
    const location = globalThis.location;
    if (!location) {
      return;
    }

    const sharedState = decodeSharePayload(new URL(location.href).searchParams.get('share') ?? '');
    if (!sharedState) {
      return;
    }

    this.store.restoreSharedState(sharedState);
    this.viewportCenter.set(sharedState.viewportCenter ?? { x: 0, y: 0 });
  }

  private setScaleFromViewportCenter(nextScale: number): void {
    const viewportRect = this.canvasViewport().nativeElement.getBoundingClientRect();
    this.setScaleAtClientPoint(
      nextScale,
      viewportRect.left + viewportRect.width / 2,
      viewportRect.top + viewportRect.height / 2
    );
  }

  private setScaleAtClientPoint(nextScale: number, clientX: number, clientY: number): void {
    const clampedScale = Math.min(120, Math.max(16, Math.round(nextScale)));
    const currentScale = this.preferences().scale;
    if (clampedScale === currentScale) return;

    const viewportRect = this.canvasViewport().nativeElement.getBoundingClientRect();
    const offsetX = clientX - viewportRect.left - viewportRect.width / 2;
    const offsetY = viewportRect.height / 2 - (clientY - viewportRect.top);
    const viewportCenter = this.viewportCenter();
    const worldX = viewportCenter.x + offsetX / currentScale;
    const worldY = viewportCenter.y + offsetY / currentScale;

    this.store.patchPreferences({ scale: clampedScale });
    this.viewportCenter.set({ x: worldX - offsetX / clampedScale, y: worldY - offsetY / clampedScale });
  }

  private toScenePoint(clientX: number, clientY: number): Point {
    const viewportRect = this.canvasViewport().nativeElement.getBoundingClientRect();
    return {
      x: this.viewportCenter().x + (clientX - viewportRect.left - viewportRect.width / 2) / this.preferences().scale,
      y: this.viewportCenter().y + (viewportRect.height / 2 - (clientY - viewportRect.top)) / this.preferences().scale
    };
  }

  private snap(value: number): number {
    if (!this.preferences().snapToGrid || this.altPressed()) {
      return value;
    }
    const snapStep = Math.max(this.preferences().snapStep, 0.01);
    return Math.round(value / snapStep) * snapStep;
  }

  private snapScenePoint(point: Point): Point {
    return { x: this.snap(point.x), y: this.snap(point.y) };
  }

  private findShapesInsideBounds(bounds: SelectionBounds): string[] {
    return this.scene()
      .shapes.filter((shape) => {
        const shapeBounds = this.computeBounds([shape]);
        return (
          shapeBounds !== null &&
          shapeBounds.left <= bounds.right &&
          shapeBounds.right >= bounds.left &&
          shapeBounds.bottom <= bounds.top &&
          shapeBounds.top >= bounds.bottom
        );
      })
      .map((shape) => shape.id);
  }

  private computeBounds(shapes: readonly CanvasShape[]): SelectionBounds | null {
    if (!shapes.length) {
      return null;
    }

    return shapes.reduce<SelectionBounds | null>((currentBounds, shape) => {
      const nextBounds = this.shapeBounds(shape);
      if (!nextBounds) return currentBounds;
      if (!currentBounds) return nextBounds;
      return {
        left: Math.min(currentBounds.left, nextBounds.left),
        right: Math.max(currentBounds.right, nextBounds.right),
        top: Math.max(currentBounds.top, nextBounds.top),
        bottom: Math.min(currentBounds.bottom, nextBounds.bottom)
      };
    }, null);
  }

  private shapeBounds(shape: CanvasShape): SelectionBounds | null {
    switch (shape.kind) {
      case 'rectangle':
        return { left: shape.x, right: shape.x + shape.width, bottom: shape.y, top: shape.y + shape.height };
      case 'circle':
        return {
          left: shape.cx - shape.r,
          right: shape.cx + shape.r,
          bottom: shape.cy - shape.r,
          top: shape.cy + shape.r
        };
      case 'ellipse':
        return {
          left: shape.cx - shape.rx,
          right: shape.cx + shape.rx,
          bottom: shape.cy - shape.ry,
          top: shape.cy + shape.ry
        };
      case 'line':
        return {
          left: Math.min(shape.from.x, shape.to.x),
          right: Math.max(shape.from.x, shape.to.x),
          bottom: Math.min(shape.from.y, shape.to.y),
          top: Math.max(shape.from.y, shape.to.y)
        };
      case 'text': {
        const width = Math.max(shape.text.length * shape.fontSize * 0.48, shape.fontSize);
        const height = shape.fontSize * 0.72;
        return {
          left: shape.x - width / 2,
          right: shape.x + width / 2,
          bottom: shape.y - height / 2,
          top: shape.y + height / 2
        };
      }
    }
  }

  private resizeShape(shape: CanvasShape, handle: ResizeHandle, point: Point): CanvasShape {
    switch (shape.kind) {
      case 'rectangle':
        return this.resizeRectangle(shape, handle, point);
      case 'circle':
        return this.resizeCircle(shape, handle, point);
      case 'ellipse':
        return this.resizeEllipse(shape, handle, point);
      case 'line':
        return this.resizeLine(shape, handle, point);
      case 'text':
        return shape;
    }
  }

  private resizeRectangle(
    shape: Extract<CanvasShape, { kind: 'rectangle' }>,
    handle: ResizeHandle,
    point: Point
  ): CanvasShape {
    const resizedBounds = this.resizeBounds(
      { left: shape.x, right: shape.x + shape.width, bottom: shape.y, top: shape.y + shape.height },
      handle,
      point,
      0.2,
      0.2,
      shape.width / shape.height
    );
    return {
      ...shape,
      x: resizedBounds.left,
      y: resizedBounds.bottom,
      width: resizedBounds.right - resizedBounds.left,
      height: resizedBounds.top - resizedBounds.bottom
    };
  }

  private resizeCircle(
    shape: Extract<CanvasShape, { kind: 'circle' }>,
    handle: ResizeHandle,
    point: Point
  ): CanvasShape {
    const resizedBounds = this.resizeBounds(
      { left: shape.cx - shape.r, right: shape.cx + shape.r, bottom: shape.cy - shape.r, top: shape.cy + shape.r },
      handle,
      point,
      0.2,
      0.2,
      1
    );
    const radius = Math.max(
      (resizedBounds.right - resizedBounds.left) / 2,
      (resizedBounds.top - resizedBounds.bottom) / 2,
      0.1
    );
    return {
      ...shape,
      cx: (resizedBounds.left + resizedBounds.right) / 2,
      cy: (resizedBounds.top + resizedBounds.bottom) / 2,
      r: radius
    };
  }

  private resizeEllipse(
    shape: Extract<CanvasShape, { kind: 'ellipse' }>,
    handle: ResizeHandle,
    point: Point
  ): CanvasShape {
    const aspectRatio = shape.ry === 0 ? 1 : shape.rx / shape.ry;
    const resizedBounds = this.resizeBounds(
      { left: shape.cx - shape.rx, right: shape.cx + shape.rx, bottom: shape.cy - shape.ry, top: shape.cy + shape.ry },
      handle,
      point,
      0.2,
      0.2,
      aspectRatio
    );
    return {
      ...shape,
      cx: (resizedBounds.left + resizedBounds.right) / 2,
      cy: (resizedBounds.top + resizedBounds.bottom) / 2,
      rx: Math.max((resizedBounds.right - resizedBounds.left) / 2, 0.1),
      ry: Math.max((resizedBounds.top - resizedBounds.bottom) / 2, 0.1)
    };
  }

  private resizeLine(shape: Extract<CanvasShape, { kind: 'line' }>, handle: ResizeHandle, point: Point): CanvasShape {
    return handle === 'from' ? { ...shape, from: point } : handle === 'to' ? { ...shape, to: point } : shape;
  }

  private resizeBounds(
    selectionBounds: SelectionBounds,
    handle: ResizeHandle,
    point: Point,
    minimumWidth: number,
    minimumHeight: number,
    aspectRatio?: number
  ): SelectionBounds {
    let left = selectionBounds.left;
    let right = selectionBounds.right;
    let top = selectionBounds.top;
    let bottom = selectionBounds.bottom;

    if (handle.includes('w')) left = Math.min(point.x, right - minimumWidth);
    if (handle.includes('e')) right = Math.max(point.x, left + minimumWidth);
    if (handle.includes('n')) top = Math.max(point.y, bottom + minimumHeight);
    if (handle.includes('s')) bottom = Math.min(point.y, top - minimumHeight);

    if (this.shiftPressed() && aspectRatio) {
      const currentWidth = Math.max(right - left, minimumWidth);
      const currentHeight = Math.max(top - bottom, minimumHeight);
      const nextHeight = currentWidth / aspectRatio;
      const nextWidth = currentHeight * aspectRatio;

      if (handle === 'n' || handle === 's') {
        const adjustedWidth = Math.max(nextWidth, minimumWidth);
        const centerX = (left + right) / 2;
        left = centerX - adjustedWidth / 2;
        right = centerX + adjustedWidth / 2;
      } else {
        const adjustedHeight = Math.max(nextHeight, minimumHeight);
        if (handle.includes('n')) {
          top = bottom + adjustedHeight;
        } else {
          bottom = top - adjustedHeight;
        }
      }
    }

    return { left, right, top, bottom };
  }
}
