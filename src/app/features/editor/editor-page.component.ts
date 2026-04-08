import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
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
import {
  sceneToStandaloneDocument,
  sceneToTikzBundle,
  type LatexColorMode,
  type TikzExportOptions
} from './tikz.codegen';
import { EditorStore } from './editor.store';
import type {
  ArrowTipKind,
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
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'from' | 'to' | `anchor-${number}`;
type ContextTarget = 'canvas' | 'shape';

interface ToastNotification {
  readonly id: string;
  readonly message: string;
}

type LatexAlignment = 'center' | 'left' | 'right';
type LatexFontSize = 'tiny' | 'scriptsize' | 'footnotesize' | 'small' | 'normalsize' | 'large';

interface LatexExportConfig {
  readonly colorMode: LatexColorMode;
  readonly wrapInFigure: boolean;
  readonly figurePlacement: string;
  readonly alignment: LatexAlignment;
  readonly maxWidthPercent: number;
  readonly fontSize: LatexFontSize;
  readonly includeCaption: boolean;
  readonly caption: string;
  readonly includeLabel: boolean;
  readonly label: string;
}

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

interface SavedTemplate {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly shapes: readonly CanvasShape[];
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
  readonly variant?: 'endpoint' | 'anchor';
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

interface InsertInteractionState {
  readonly kind: 'insert';
  readonly pointerId: number;
  readonly toolId: ToolId;
  readonly startWorldPoint: Point;
  readonly currentWorldPoint: Point;
}

type InteractionState =
  | MoveInteractionState
  | PanInteractionState
  | ResizeInteractionState
  | MarqueeInteractionState
  | InsertInteractionState;

interface ContextMenuState {
  readonly clientX: number;
  readonly clientY: number;
  readonly target: ContextTarget;
  readonly shapeId: string | null;
}

interface InlineTextEditorState {
  readonly shapeId: string;
  readonly value: string;
}

interface SceneReplaceDialogState {
  readonly presetId: string;
  readonly title: string;
}

interface ClipboardShapeSet {
  readonly shapes: readonly CanvasShape[];
  readonly pasteCount: number;
}

interface SidebarResizeState {
  readonly side: 'left' | 'right';
  readonly startX: number;
  readonly startWidth: number;
}

interface MinimapRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface MinimapShapeBase {
  readonly kind: CanvasShape['kind'];
  readonly stroke: string;
  readonly strokeWidth: number;
}

interface MinimapLineShape extends MinimapShapeBase {
  readonly kind: 'line';
  readonly path: string;
}

interface MinimapRectangleShape extends MinimapShapeBase {
  readonly kind: 'rectangle';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
  readonly rx: number;
}

interface MinimapCircleShape extends MinimapShapeBase {
  readonly kind: 'circle';
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly fill: string;
}

interface MinimapEllipseShape extends MinimapShapeBase {
  readonly kind: 'ellipse';
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly fill: string;
}

interface MinimapTextShape extends MinimapShapeBase {
  readonly kind: 'text';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
}

interface MinimapImageShape extends MinimapShapeBase {
  readonly kind: 'image';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly href: string;
}

type MinimapShape =
  | MinimapLineShape
  | MinimapRectangleShape
  | MinimapCircleShape
  | MinimapEllipseShape
  | MinimapTextShape
  | MinimapImageShape;

interface MinimapOverview {
  readonly viewBoxWidth: number;
  readonly viewBoxHeight: number;
  readonly viewportRect: MinimapRect;
  readonly worldLeft: number;
  readonly worldTop: number;
  readonly mapScale: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly shapes: readonly MinimapShape[];
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
  private readonly savedTemplatesStorageKey = 'tikz-drawer.saved-templates';
  private readonly languageStorageKey = 'tikz-drawer.language';
  private readonly defaultScale = 24;
  private readonly defaultLatexExportConfig = {
    colorMode: 'direct-rgb',
    wrapInFigure: false,
    figurePlacement: 'H',
    alignment: 'center',
    maxWidthPercent: 100,
    fontSize: 'footnotesize',
    includeCaption: true,
    caption: '',
    includeLabel: true,
    label: ''
  } satisfies LatexExportConfig;
  readonly store = inject(EditorStore);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly canvasSvg = viewChild.required<ElementRef<SVGSVGElement>>('canvasSvg');
  readonly canvasViewport = viewChild.required<ElementRef<HTMLDivElement>>('canvasViewport');
  readonly inlineTextInput = viewChild<ElementRef<HTMLInputElement>>('inlineTextInput');
  readonly topbarActions = viewChild<ElementRef<HTMLDivElement>>('topbarActions');

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

  readonly language = signal<LanguageCode>(this.restoreLanguage());
  readonly inspectorTab = signal<InspectorTab>('properties');
  readonly activeTool = signal<ToolId>('select');
  readonly viewportCenter = signal<Point>({ x: 0, y: 0 });
  readonly canvasWidth = signal(1280);
  readonly canvasHeight = signal(840);
  readonly interactionState = signal<InteractionState | null>(null);
  readonly contextMenu = signal<ContextMenuState | null>(null);
  readonly fileMenuOpen = signal(false);
  readonly compactTopbarActions = signal(false);
  readonly exportModalOpen = signal(false);
  readonly exportSettingsModalOpen = signal(false);
  readonly exportMode = signal<ExportMode>('snippet');
  readonly latexExportConfig = signal<LatexExportConfig>(this.defaultLatexExportConfig);
  readonly savedTemplates = signal<readonly SavedTemplate[]>([]);
  readonly libraryQuery = signal('');
  readonly shareFeedback = signal('');
  readonly notifications = signal<readonly ToastNotification[]>([]);
  readonly selectedImageFilename = signal('');
  readonly templateDialogOpen = signal(false);
  readonly templateDialogMode = signal<'create' | 'edit'>('create');
  readonly editingTemplateId = signal<string | null>(null);
  readonly templateTitleInput = signal('');
  readonly templateDescriptionInput = signal('');
  readonly templateUseCurrentSelection = signal(true);
  readonly templateDeleteTarget = signal<SavedTemplate | null>(null);
  readonly inlineTextEditor = signal<InlineTextEditorState | null>(null);
  readonly clipboardShapes = signal<ClipboardShapeSet | null>(null);
  readonly leftSidebarWidth = signal(288);
  readonly rightSidebarWidth = signal(340);
  readonly sidebarResizeState = signal<SidebarResizeState | null>(null);
  readonly minimapPanPointerId = signal<number | null>(null);
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

  readonly zoomPercent = computed(() => Math.round((this.preferences().scale / this.defaultScale) * 100));
  readonly allInsertablePresets = computed<readonly ObjectPreset[]>(() => [
    ...this.savedTemplates().map((template) => this.savedTemplateToPreset(template)),
    ...this.objectPresets
  ]);
  readonly selectionLabel = computed(() => {
    if (this.selectionCount() === 0) return this.t('noneSelected');
    if (this.selectionCount() === 1) return this.selectedShape()?.name ?? this.t('noneSelected');
    return `${this.selectionCount()} ${this.t('objects').toLowerCase()}`;
  });
  readonly selectedMergeIds = computed(() =>
    Array.from(
      new Set(
        this.selectedShapes()
          .map((shape) => shape.mergeId)
          .filter((mergeId): mergeId is string => !!mergeId)
      )
    )
  );
  readonly canGroupSelection = computed(() => this.selectionCount() > 1 && this.selectedMergeIds().length === 0);
  readonly canUngroupSelection = computed(() => this.selectedMergeIds().length > 0);
  readonly activePreset = computed(
    () => this.allInsertablePresets().find((preset) => preset.id === this.activeTool()) ?? null
  );
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
  readonly sceneContentBounds = computed(() => this.computeBounds(this.scene().shapes));
  readonly xSliderRange = computed(() => this.sliderRange('x'));
  readonly ySliderRange = computed(() => this.sliderRange('y'));
  readonly minimapOverview = computed<MinimapOverview | null>(() => {
    const sceneBounds = this.sceneContentBounds();
    if (!sceneBounds) return null;

    const visibleBounds = this.visibleWorldBounds();
    const padding = 1.5;
    const left = Math.min(sceneBounds.left, visibleBounds.left) - padding;
    const right = Math.max(sceneBounds.right, visibleBounds.right) + padding;
    const bottom = Math.min(sceneBounds.bottom, visibleBounds.bottom) - padding;
    const top = Math.max(sceneBounds.top, visibleBounds.top) + padding;
    const width = Math.max(right - left, 1);
    const height = Math.max(top - bottom, 1);
    const mapSize = 180;
    const scaleX = mapSize / width;
    const scaleY = mapSize / height;
    const scale = Math.min(scaleX, scaleY);
    const contentWidth = width * scale;
    const contentHeight = height * scale;
    const offsetX = (mapSize - contentWidth) / 2;
    const offsetY = (mapSize - contentHeight) / 2;
    const toMapX = (x: number): number => offsetX + (x - left) * scale;
    const toMapY = (y: number): number => offsetY + (top - y) * scale;
    const toMapRect = (bounds: SelectionBounds): MinimapRect => ({
      x: toMapX(bounds.left),
      y: toMapY(bounds.top),
      width: Math.max((bounds.right - bounds.left) * scale, 1.6),
      height: Math.max((bounds.top - bounds.bottom) * scale, 1.6)
    });

    return {
      viewBoxWidth: mapSize,
      viewBoxHeight: mapSize,
      worldLeft: left,
      worldTop: top,
      mapScale: scale,
      offsetX,
      offsetY,
      viewportRect: toMapRect(visibleBounds),
      shapes: this.scene().shapes.map((shape) => this.toMinimapShape(shape, toMapX, toMapY, scale))
    };
  });
  readonly showMinimap = computed(() => {
    const sceneBounds = this.sceneContentBounds();
    if (!sceneBounds) return false;
    const visibleBounds = this.visibleWorldBounds();
    const sceneFitsInView =
      sceneBounds.left >= visibleBounds.left &&
      sceneBounds.right <= visibleBounds.right &&
      sceneBounds.bottom >= visibleBounds.bottom &&
      sceneBounds.top <= visibleBounds.top;
    return !sceneFitsInView || this.preferences().scale > this.defaultScale + 8;
  });
  readonly inlineTextEditorLayout = computed(() => {
    const editor = this.inlineTextEditor();
    if (!editor) {
      return null;
    }

    const shape = this.scene().shapes.find((entry) => entry.id === editor.shapeId);
    if (!shape || shape.kind !== 'text') {
      return null;
    }

    const fontSize = Math.max(shape.fontSize * this.preferences().scale, 14);
    const width = Math.max(editor.value.length * fontSize * 0.58, fontSize * 3.2, 88);
    const height = Math.max(fontSize * 1.9, 36);
    return {
      left: this.toSvgX(shape.x),
      top: this.toSvgY(shape.y),
      width,
      height,
      fontSize
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
    ...this.allInsertablePresets()
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
  readonly visibleSavedTemplates = computed<readonly SavedTemplate[]>(() => {
    const query = this.libraryQuery().trim().toLowerCase();
    return this.savedTemplates().filter((template) => {
      if (!query) return true;
      return [template.title, template.description].join(' ').toLowerCase().includes(query);
    });
  });
  readonly selectionBounds = computed<SelectionBounds | null>(() => this.computeBounds(this.selectedShapes()));
  readonly selectionHandles = computed<readonly HandleDescriptor[]>(() => {
    const selectedShape = this.selectedShape();
    if (!selectedShape) return [];
    if (selectedShape.kind === 'line') {
      return [
        {
          id: 'from',
          x: this.toSvgX(selectedShape.from.x),
          y: this.toSvgY(selectedShape.from.y),
          cursor: 'crosshair',
          variant: 'endpoint'
        },
        ...selectedShape.anchors.map((anchor, index) => ({
          id: `anchor-${index}` as const,
          x: this.toSvgX(anchor.x),
          y: this.toSvgY(anchor.y),
          cursor: 'grab',
          variant: 'anchor' as const
        })),
        {
          id: 'to',
          x: this.toSvgX(selectedShape.to.x),
          y: this.toSvgY(selectedShape.to.y),
          cursor: 'crosshair',
          variant: 'endpoint'
        }
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
  readonly insertionPreviewShapes = computed<readonly CanvasShape[]>(() => {
    const interactionState = this.interactionState();
    if (!interactionState || interactionState.kind !== 'insert') {
      return [];
    }

    return this.buildInsertionPreviewShapes(
      interactionState.toolId,
      interactionState.startWorldPoint,
      interactionState.currentWorldPoint
    );
  });
  readonly insertionPreviewShape = computed<CanvasShape | null>(() => this.insertionPreviewShapes()[0] ?? null);
  readonly exportOptions = computed<TikzExportOptions>(() => ({
    colorMode: this.latexExportConfig().colorMode
  }));
  readonly baseTikzExportBundle = computed(() => sceneToTikzBundle(this.scene(), this.exportOptions()));
  readonly snippetExport = computed(() => this.buildSnippetExport());
  readonly standaloneDocument = computed(() => this.buildStandaloneDocument());
  readonly displayedExportCode = computed(() =>
    this.exportMode() === 'snippet' ? this.snippetExport().code : this.standaloneDocument()
  );
  readonly displayedExportImports = computed(() =>
    this.exportMode() === 'snippet' ? this.snippetExport().imports : ''
  );
  readonly highlightedSnippetCode = computed(() => highlightLatex(this.snippetExport().combined));
  readonly highlightedExportImports = computed(() => highlightLatex(this.displayedExportImports()));
  readonly highlightedExportCode = computed(() => highlightLatex(this.displayedExportCode()));
  readonly shareUrl = signal('');
  readonly sceneReplaceDialog = signal<SceneReplaceDialogState | null>(null);
  private shareUrlRequestId = 0;

  constructor() {
    afterNextRender(() => {
      const viewport = this.canvasViewport().nativeElement;
      const topbarActions = this.topbarActions()?.nativeElement ?? null;
      const updateCanvasSize = () => {
        this.canvasWidth.set(Math.max(420, Math.round(viewport.clientWidth)));
        this.canvasHeight.set(Math.max(320, Math.round(viewport.clientHeight)));
      };
      const updateTopbarActions = () => {
        if (!topbarActions) {
          return;
        }

        const compact =
          topbarActions.scrollWidth > topbarActions.clientWidth + 1 ||
          viewport.clientWidth <= 1180 ||
          globalThis.innerWidth <= 1320;
        this.compactTopbarActions.set(compact);
        if (!compact) {
          this.closeFileMenu();
        }
      };

      const resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
        updateTopbarActions();
      });
      resizeObserver.observe(viewport);
      if (topbarActions) {
        resizeObserver.observe(topbarActions);
      }
      updateCanvasSize();
      updateTopbarActions();
      this.restoreSavedTemplates();
      void this.restoreSharedSceneFromUrl();
      this.destroyRef.onDestroy(() => resizeObserver.disconnect());
    });

    effect(() => {
      this.scene();
      this.preferences();
      this.viewportCenter();
      this.store.importCode();
      this.latexExportConfig();
      void this.refreshShareUrl();
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
      case 'image':
        return 'I';
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
    this.document.defaultView?.localStorage?.setItem(this.languageStorageKey, language);
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

  openExportModal(mode: ExportMode = 'snippet'): void {
    this.closeFileMenu();
    this.exportMode.set(mode);
    this.exportModalOpen.set(true);
    this.shareFeedback.set('');
  }

  closeExportModal(): void {
    this.exportModalOpen.set(false);
    this.exportSettingsModalOpen.set(false);
    this.shareFeedback.set('');
  }

  openExportSettingsModal(): void {
    this.exportSettingsModalOpen.set(true);
  }

  closeExportSettingsModal(): void {
    this.exportSettingsModalOpen.set(false);
  }

  patchLatexExportConfig(patch: Partial<LatexExportConfig>): void {
    this.latexExportConfig.update((config) => ({
      ...config,
      ...patch
    }));
  }

  updateLatexExportText(key: 'figurePlacement' | 'caption' | 'label', event: Event): void {
    this.patchLatexExportConfig({
      [key]: (event.target as HTMLInputElement | HTMLSelectElement).value
    } as Partial<LatexExportConfig>);
  }

  updateLatexExportNumber(key: 'maxWidthPercent', event: Event, min: number, max: number): void {
    const input = event.target as HTMLInputElement;
    const value = Number.parseFloat(input.value);
    if (!Number.isFinite(value)) {
      return;
    }
    this.patchLatexExportConfig({
      [key]: Math.min(max, Math.max(min, value))
    } as Partial<LatexExportConfig>);
  }

  updateLatexExportBoolean(key: 'wrapInFigure' | 'includeCaption' | 'includeLabel', event: Event): void {
    this.patchLatexExportConfig({
      [key]: (event.target as HTMLInputElement).checked
    } as Partial<LatexExportConfig>);
  }

  setExportColorMode(mode: LatexColorMode): void {
    this.patchLatexExportConfig({ colorMode: mode });
  }

  setLatexAlignment(alignment: LatexAlignment): void {
    this.patchLatexExportConfig({ alignment });
  }

  setLatexFontSize(fontSize: LatexFontSize): void {
    this.patchLatexExportConfig({ fontSize });
  }

  applySuggestedCaptionAndLabel(): void {
    this.patchLatexExportConfig({
      caption: this.suggestedCaption(),
      label: this.suggestedLabel()
    });
  }

  setInspectorTab(tab: InspectorTab): void {
    this.inspectorTab.set(tab);
  }

  setLibraryQuery(value: string): void {
    this.libraryQuery.set(value);
  }

  setActiveTool(toolId: ToolId): void {
    if (toolId !== 'select' && this.activeTool() === toolId) {
      this.runSceneMutation(() => {
        this.insertPresetAt(toolId, this.snapScenePoint(this.viewportCenter()));
        this.activeTool.set('select');
        this.inspectorTab.set('properties');
      });
      return;
    }

    this.activeTool.set(toolId);
    this.closeContextMenu();
    this.closeFileMenu();
  }

  openSaveTemplateDialog(): void {
    if (this.selectionCount() === 0) {
      return;
    }

    this.templateDialogMode.set('create');
    this.editingTemplateId.set(null);
    this.templateTitleInput.set(this.selectionLabel());
    this.templateDescriptionInput.set('');
    this.templateUseCurrentSelection.set(true);
    this.templateDialogOpen.set(true);
  }

  openEditTemplateDialog(template: SavedTemplate): void {
    this.templateDialogMode.set('edit');
    this.editingTemplateId.set(template.id);
    this.templateTitleInput.set(template.title);
    this.templateDescriptionInput.set(template.description);
    this.templateUseCurrentSelection.set(false);
    this.templateDialogOpen.set(true);
  }

  closeTemplateDialog(): void {
    this.templateDialogOpen.set(false);
    this.editingTemplateId.set(null);
  }

  updateTemplateDialogText(key: 'title' | 'description', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (key === 'title') {
      this.templateTitleInput.set(value);
      return;
    }
    this.templateDescriptionInput.set(value);
  }

  updateTemplateUseCurrentSelection(event: Event): void {
    this.templateUseCurrentSelection.set((event.target as HTMLInputElement).checked);
  }

  saveTemplate(): void {
    const title = this.templateTitleInput().trim();
    if (!title) {
      return;
    }

    const mode = this.templateDialogMode();
    const existing = this.savedTemplates().find((template) => template.id === this.editingTemplateId());
    const sourceShapes =
      mode === 'edit' && !this.templateUseCurrentSelection()
        ? (existing?.shapes ?? [])
        : structuredClone(this.selectedShapes());

    if (!sourceShapes.length) {
      return;
    }

    const template: SavedTemplate = {
      id: mode === 'edit' && existing ? existing.id : crypto.randomUUID(),
      title,
      description: this.templateDescriptionInput().trim(),
      icon: this.iconForShapes(sourceShapes),
      shapes: structuredClone(sourceShapes)
    };

    this.savedTemplates.update((templates) =>
      mode === 'edit' && existing
        ? templates.map((entry) => (entry.id === existing.id ? template : entry))
        : [template, ...templates]
    );
    this.persistSavedTemplates();
    this.closeTemplateDialog();
    this.showNotification(this.t(mode === 'edit' ? 'templateUpdated' : 'templateSaved'));
  }

  confirmDeleteTemplate(template: SavedTemplate): void {
    this.templateDeleteTarget.set(template);
  }

  closeDeleteTemplateDialog(): void {
    this.templateDeleteTarget.set(null);
  }

  deleteTemplate(): void {
    const template = this.templateDeleteTarget();
    if (!template) {
      return;
    }

    this.savedTemplates.update((templates) => templates.filter((entry) => entry.id !== template.id));
    this.persistSavedTemplates();
    if (this.activeTool() === template.id) {
      this.activeTool.set('select');
    }
    this.templateDeleteTarget.set(null);
    this.showNotification(this.t('templateDeleted'));
  }

  selectShape(shapeId: string | null): void {
    this.closeContextMenu();
    this.selectedImageFilename.set('');
    this.store.selectShape(shapeId);
    if (shapeId) {
      this.setInspectorTab('properties');
    }
  }

  applyScenePreset(presetId: string): void {
    this.requestSceneReplacement(presetId);
  }

  private applyScenePresetConfirmed(presetId: string): void {
    this.runSceneMutation(() => {
      const preset = this.scenePresets.find((entry) => entry.id === presetId);
      this.store.applyScenePreset(presetId);
      this.store.patchPreferences({ scale: this.defaultScale });
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
    this.closeFileMenu();
    this.requestSceneReplacement('blank');
  }

  private resetSceneConfirmed(): void {
    this.runSceneMutation(() => {
      const preset = this.scenePresets.find((entry) => entry.id === 'blank');
      this.store.applyScenePreset('blank');
      this.store.patchPreferences({ scale: this.defaultScale });
      if (preset) {
        this.store.renameScene(this.scenePresetTitle(preset));
      }
      this.viewportCenter.set({ x: 0, y: 0 });
      this.activeTool.set('select');
      this.inspectorTab.set('scene');
      this.closeFileMenu();
    });
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
      this.insertPresetAt(activeTool, this.snapScenePoint(point));
      this.activeTool.set('select');
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
    this.setScaleFromViewportCenter(this.defaultScale);
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
    void navigator.clipboard?.writeText(this.snippetExport().code);
  }

  copyStandaloneCode(): void {
    void navigator.clipboard?.writeText(this.standaloneDocument());
  }

  copySnippetImports(): void {
    void navigator.clipboard?.writeText(this.snippetExport().imports);
  }

  copyCurrentExportCode(): void {
    if (this.exportMode() === 'snippet') {
      this.copyExportedCode();
      return;
    }

    this.copyStandaloneCode();
  }

  async copyShareLink(): Promise<void> {
    if (!navigator.clipboard) {
      return;
    }

    const url = await this.generateShareUrl();
    if (!url) {
      return;
    }
    this.shareUrl.set(url);
    await navigator.clipboard.writeText(url);
    this.shareFeedback.set(this.t('copied'));
    this.showNotification(this.t('shareLinkReady'));
    this.closeFileMenu();
  }

  startMinimapPan(event: PointerEvent, minimap: MinimapOverview): void {
    event.preventDefault();
    event.stopPropagation();
    this.minimapPanPointerId.set(event.pointerId);
    this.updateViewportFromMinimapPointer(event.clientX, event.clientY, minimap);
  }

  onShapeClick(event: MouseEvent, shape: CanvasShape): void {
    event.stopPropagation();

    if (this.activeTool() !== 'select') {
      this.closeInlineTextEditor();
      if (!this.canPreviewInsert(this.activeTool())) {
        this.addShapeAt(this.toScenePoint(event.clientX, event.clientY));
      }
      return;
    }

    if (shape.kind === 'text' && event.detail >= 2) {
      this.openInlineTextEditor(shape);
      return;
    }

    this.closeInlineTextEditor();

    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      if (shape.mergeId) {
        this.toggleMergedShapeSelection(shape.mergeId);
        this.setInspectorTab('properties');
        return;
      }
      this.setInspectorTab('properties');
      return;
    }

    if (!this.selectionContainsShape(shape.id)) {
      this.selectShapeSet(shape);
    }
    this.setInspectorTab('properties');
  }

  onShapeDoubleClick(event: MouseEvent, shape: CanvasShape): void {
    if (this.activeTool() !== 'select' || shape.kind !== 'text') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.selectShape(shape.id);
    this.openInlineTextEditor(shape);
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

  copySelected(): void {
    const shapes = this.selectedShapes();
    if (!shapes.length) {
      return;
    }

    this.clipboardShapes.set({
      shapes: structuredClone(shapes),
      pasteCount: 0
    });
    this.showNotification(this.t('selectionCopied'));
  }

  cutSelected(): void {
    const shapes = this.selectedShapes();
    if (!shapes.length) {
      return;
    }

    this.clipboardShapes.set({
      shapes: structuredClone(shapes),
      pasteCount: 0
    });
    this.removeSelected();
    this.showNotification(this.t('selectionCut'));
  }

  pasteClipboard(): void {
    const clipboard = this.clipboardShapes();
    if (!clipboard?.shapes.length) {
      return;
    }

    const offsetStep = 0.8;
    const offset = offsetStep * (clipboard.pasteCount + 1);
    const mergeIdMap = new Map<string, string>();
    const pastedShapes = clipboard.shapes.map((shape) => {
      const duplicate = structuredClone(shape);
      let nextMergeId: string | undefined;
      if (duplicate.mergeId) {
        nextMergeId = mergeIdMap.get(duplicate.mergeId);
        if (!nextMergeId) {
          nextMergeId = crypto.randomUUID();
          mergeIdMap.set(duplicate.mergeId, nextMergeId);
        }
      }
      return {
        ...translateShapeBy(duplicate, offset, -offset),
        id: crypto.randomUUID(),
        name: `${duplicate.name} copy`,
        ...(nextMergeId ? { mergeId: nextMergeId } : { mergeId: undefined })
      } as CanvasShape;
    });

    this.runSceneMutation(() => this.store.addShapes(pastedShapes));
    this.clipboardShapes.set({
      shapes: clipboard.shapes,
      pasteCount: clipboard.pasteCount + 1
    });
    this.showNotification(this.t('selectionPasted'));
  }

  mergeSelected(): void {
    this.runSceneMutation(() => this.store.mergeSelected());
    this.showNotification(this.t('figuresGrouped'));
  }

  ungroupSelected(): void {
    this.runSceneMutation(() => this.store.ungroupSelected());
    this.showNotification(this.t('figuresUngrouped'));
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

  updateShapeText(key: 'name' | 'stroke' | 'fill' | 'text' | 'color' | 'arrowColor', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.store.patchSelectedShape((shape) => ({ ...shape, [key]: value }) as CanvasShape);
  }

  updateShapeOpacity(key: 'strokeOpacity' | 'fillOpacity' | 'colorOpacity' | 'arrowOpacity', event: Event): void {
    const value = Math.min(1, Math.max(0, Number((event.target as HTMLInputElement).value)));
    this.store.patchSelectedShape((shape) => ({ ...shape, [key]: value }) as CanvasShape);
  }

  updateInlineTextEditor(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inlineTextEditor.update((editor) => (editor ? { ...editor, value } : null));
  }

  commitInlineTextEditor(): void {
    const editor = this.inlineTextEditor();
    if (!editor) {
      return;
    }

    const shape = this.scene().shapes.find((entry) => entry.id === editor.shapeId);
    if (!shape || shape.kind !== 'text') {
      this.inlineTextEditor.set(null);
      return;
    }

    const nextValue = editor.value;
    this.runSceneMutation(() => {
      this.store.replaceShapes([{ ...shape, text: nextValue }]);
    });
    this.inlineTextEditor.set(null);
  }

  onInlineTextEditorKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitInlineTextEditor();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeInlineTextEditor();
    }
  }

  closeInlineTextEditor(): void {
    this.inlineTextEditor.set(null);
  }

  updateImageText(key: 'src' | 'latexSource', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.patchSelectedShape((shape) =>
      shape.kind === 'image' ? ({ ...shape, [key]: value } as CanvasShape) : shape
    );
  }

  updateImageDimension(key: 'width' | 'height', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    this.store.patchSelectedShape((shape) => {
      if (shape.kind !== 'image') {
        return shape;
      }

      const aspectRatio = shape.aspectRatio || (shape.height !== 0 ? shape.width / shape.height : 1);
      return key === 'width'
        ? ({
            ...shape,
            width: value,
            height: Math.max(value / Math.max(aspectRatio, 0.01), 0.2)
          } as CanvasShape)
        : ({
            ...shape,
            height: value,
            width: Math.max(value * Math.max(aspectRatio, 0.01), 0.2)
          } as CanvasShape);
    });
  }

  async onImageFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const dataUrl = await this.readFileAsDataUrl(file);
    const dimensions = await this.loadImageDimensions(dataUrl);
    this.selectedImageFilename.set(file.name);

    this.store.patchSelectedShape((shape) =>
      shape.kind === 'image'
        ? ({
            ...shape,
            src: dataUrl,
            ...(dimensions
              ? {
                  aspectRatio: dimensions.width / dimensions.height,
                  height: Math.max(shape.width / Math.max(dimensions.width / dimensions.height, 0.01), 0.2)
                }
              : {}),
            latexSource: shape.latexSource || file.name
          } as CanvasShape)
        : shape
    );
    input.value = '';
  }

  setTextPresetSize(fontSize: number): void {
    this.store.patchSelectedShape((shape) => (shape.kind === 'text' ? ({ ...shape, fontSize } as CanvasShape) : shape));
  }

  transformSelectedText(mode: 'uppercase' | 'lowercase' | 'titlecase'): void {
    this.store.patchSelectedShape((shape) => {
      if (shape.kind !== 'text') return shape;
      const text =
        mode === 'uppercase'
          ? shape.text.toUpperCase()
          : mode === 'lowercase'
            ? shape.text.toLowerCase()
            : shape.text.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      return { ...shape, text } as CanvasShape;
    });
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

  setLineArrowDirection(direction: 'none' | 'forward' | 'backward' | 'both'): void {
    this.store.patchSelectedShape((shape) => {
      if (shape.kind !== 'line') {
        return shape;
      }

      return {
        ...shape,
        arrowStart: direction === 'backward' || direction === 'both',
        arrowEnd: direction === 'forward' || direction === 'both'
      } as LineShape;
    });
  }

  lineArrowDirection(shape: LineShape): 'none' | 'forward' | 'backward' | 'both' {
    if (shape.arrowStart && shape.arrowEnd) return 'both';
    if (shape.arrowStart) return 'backward';
    if (shape.arrowEnd) return 'forward';
    return 'none';
  }

  setLineArrowType(value: string): void {
    this.store.patchSelectedShape((shape) =>
      shape.kind === 'line' ? ({ ...shape, arrowType: value as ArrowTipKind } as LineShape) : shape
    );
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

  updateLineAnchorPoint(index: number, axis: 'x' | 'y', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.store.patchSelectedShape((shape) => {
      if (shape.kind !== 'line' || !shape.anchors[index]) {
        return shape;
      }

      return {
        ...shape,
        anchors: shape.anchors.map((anchor, anchorIndex) =>
          anchorIndex === index ? { ...anchor, [axis]: value } : anchor
        )
      } as LineShape;
    });
  }

  addLineAnchor(): void {
    const shape = this.selectedShape();
    if (!shape || shape.kind !== 'line') {
      return;
    }

    const points = [shape.from, ...shape.anchors, shape.to];
    const lastPoint = points.at(-2) ?? shape.from;
    const nextPoint = shape.to;
    const anchor = {
      x: Number(((lastPoint.x + nextPoint.x) / 2).toFixed(3)),
      y: Number(((lastPoint.y + nextPoint.y) / 2).toFixed(3))
    };

    this.runSceneMutation(() => {
      this.store.patchSelectedShape((currentShape) =>
        currentShape.kind === 'line'
          ? ({
              ...currentShape,
              anchors: [...currentShape.anchors, anchor]
            } as LineShape)
          : currentShape
      );
    });
  }

  removeLineAnchor(index: number): void {
    this.runSceneMutation(() => {
      this.store.patchSelectedShape((shape) =>
        shape.kind === 'line'
          ? ({
              ...shape,
              anchors: shape.anchors.filter((_, anchorIndex) => anchorIndex !== index)
            } as LineShape)
          : shape
      );
    });
  }

  sliderRange(axis: 'x' | 'y'): { readonly min: number; readonly max: number } {
    const bounds = this.sceneContentBounds();
    if (!bounds) {
      return axis === 'x' ? { min: -20, max: 20 } : { min: -20, max: 20 };
    }

    const maxAbs =
      axis === 'x'
        ? Math.max(Math.abs(bounds.left), Math.abs(bounds.right), 1)
        : Math.max(Math.abs(bounds.bottom), Math.abs(bounds.top), 1);

    return {
      min: Number((-maxAbs).toFixed(2)),
      max: Number(maxAbs.toFixed(2))
    };
  }

  positiveSliderMax(value: number, minimum: number): number {
    return Number(Math.max(value, minimum).toFixed(2));
  }

  opacityPercent(value: number): number {
    return Math.round(value * 100);
  }

  selectionContainsShape(shapeId: string): boolean {
    return this.selectedShapes().some((shape) => shape.id === shapeId);
  }

  private selectShapeSet(shape: CanvasShape): void {
    if (shape.mergeId) {
      const groupedIds = this.scene()
        .shapes.filter((entry) => entry.mergeId === shape.mergeId)
        .map((entry) => entry.id);
      this.store.setSelectedShapes(groupedIds);
      return;
    }
    this.store.selectShape(shape.id);
  }

  private toggleMergedShapeSelection(mergeId: string): void {
    const groupedIds = this.scene()
      .shapes.filter((entry) => entry.mergeId === mergeId)
      .map((entry) => entry.id);
    const selectedIds = new Set(this.selectedShapes().map((shape) => shape.id));
    const alreadySelected = groupedIds.every((id) => selectedIds.has(id));
    this.store.setSelectedShapes(
      alreadySelected ? [...selectedIds].filter((id) => !groupedIds.includes(id)) : [...selectedIds, ...groupedIds]
    );
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
      this.selectShapeSet(shape);
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

  runContextAction(action: 'duplicate' | 'delete' | 'front' | 'back' | 'group' | 'ungroup'): void {
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
      case 'group':
        this.mergeSelected();
        break;
      case 'ungroup':
        this.ungroupSelected();
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

    if (event.button === 0 && this.activeTool() !== 'select' && this.canPreviewInsert(this.activeTool())) {
      const worldPoint = this.snapScenePoint(this.toScenePoint(event.clientX, event.clientY));
      this.interactionState.set({
        kind: 'insert',
        pointerId: event.pointerId,
        toolId: this.activeTool(),
        startWorldPoint: worldPoint,
        currentWorldPoint: worldPoint
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
        additive: event.shiftKey || event.ctrlKey || event.metaKey
      });
      this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
    }
  }

  onCanvasDragOver(event: DragEvent): void {
    const hasImageFile = Array.from(event.dataTransfer?.items ?? []).some(
      (item) => item.kind === 'file' && item.type.startsWith('image/')
    );
    if (!hasImageFile) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  async onCanvasDrop(event: DragEvent): Promise<void> {
    const imageFile = Array.from(event.dataTransfer?.files ?? []).find((file) => file.type.startsWith('image/'));
    if (!imageFile) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    await this.insertImageFileAtPoint(imageFile, this.snapScenePoint(this.toScenePoint(event.clientX, event.clientY)));
  }

  startMove(event: PointerEvent, shape: CanvasShape): void {
    if (this.activeTool() !== 'select' || event.button !== 0 || this.spacePressed()) {
      return;
    }

    if (shape.kind === 'text' && event.detail >= 2) {
      event.preventDefault();
      event.stopPropagation();
      this.selectShape(shape.id);
      this.openInlineTextEditor(shape);
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      if (shape.mergeId) {
        this.toggleMergedShapeSelection(shape.mergeId);
      } else {
        this.store.toggleShapeInSelection(shape.id);
      }
      this.setInspectorTab('properties');
      return;
    }

    if (!this.selectionContainsShape(shape.id)) {
      this.selectShapeSet(shape);
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

    if (interactionState.kind === 'insert') {
      this.interactionState.set({
        ...interactionState,
        currentWorldPoint: this.snapScenePoint(this.toScenePoint(event.clientX, event.clientY))
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

    if (interactionState.kind === 'insert') {
      const previewShapes = this.buildInsertionPreviewShapes(
        interactionState.toolId,
        interactionState.startWorldPoint,
        interactionState.currentWorldPoint
      );
      if (previewShapes.length) {
        this.runSceneMutation(() => {
          this.store.addShapes(previewShapes.map((shape) => ({ ...shape, id: crypto.randomUUID() })));
          this.activeTool.set('select');
          this.inspectorTab.set('properties');
        });
      }
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
    this.closeInlineTextEditor();
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

    if (!this.canPreviewInsert(this.activeTool())) {
      this.addShapeAt(this.toScenePoint(event.clientX, event.clientY));
    }
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
    return this.lineSvgPath(selectedShape);
  }

  lineSvgPath(shape: LineShape): string {
    return this.buildLinePath(shape, (point) => ({
      x: this.toSvgX(point.x),
      y: this.toSvgY(point.y)
    }));
  }

  arrowMarkerId(shape: LineShape, side: 'start' | 'end'): string {
    return `${shape.id}-${shape.arrowType}-${side}`;
  }

  arrowMarkerPath(shape: LineShape): string {
    switch (shape.arrowType) {
      case 'triangle':
        return 'M0,0 L0,6 L8,3 z';
      case 'stealth':
        return 'M0.5,3 L7.5,0.4 L5.6,3 L7.5,5.6 z';
      case 'diamond':
        return 'M0,3 L3.8,0 L8,3 L3.8,6 z';
      case 'circle':
        return 'M4,1.1 A1.9,1.9 0 1 1 4,4.9 A1.9,1.9 0 1 1 4,1.1 z';
    }
  }

  arrowMarkerFill(shape: LineShape): string {
    return shape.arrowType === 'circle' ? 'none' : shape.arrowColor;
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

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      this.copySelected();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'x') {
      event.preventDefault();
      this.cutSelected();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
      event.preventDefault();
      this.pasteClipboard();
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
      case 'i':
        this.setActiveTool('image');
        return;
      case 'delete':
      case 'backspace':
        this.removeSelected();
        return;
      case 'escape':
        if (this.templateDeleteTarget()) {
          this.closeDeleteTemplateDialog();
          return;
        }
        if (this.templateDialogOpen()) {
          this.closeTemplateDialog();
          return;
        }
        if (this.exportSettingsModalOpen()) {
          this.closeExportSettingsModal();
          return;
        }
        if (this.exportModalOpen()) {
          this.closeExportModal();
          return;
        }
        if (this.sceneReplaceDialog()) {
          this.closeSceneReplaceDialog();
          return;
        }
        if (this.fileMenuOpen()) {
          this.closeFileMenu();
          return;
        }
        if (this.contextMenu()) {
          this.closeContextMenu();
          return;
        }
        if (this.activeTool() !== 'select') {
          this.setActiveTool('select');
          return;
        }
        this.store.selectShape(null);
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
    this.minimapPanPointerId.set(null);
  }

  handleWindowPointerMove(event: PointerEvent): void {
    const minimapPanPointerId = this.minimapPanPointerId();
    if (minimapPanPointerId === event.pointerId) {
      const minimap = this.minimapOverview();
      if (minimap) {
        this.updateViewportFromMinimapPointer(event.clientX, event.clientY, minimap);
      }
      return;
    }

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
    this.minimapPanPointerId.set(null);
  }

  private showNotification(message: string): void {
    const id = crypto.randomUUID();
    this.notifications.update((notifications) => [...notifications, { id, message }]);
    globalThis.setTimeout(() => {
      this.notifications.update((notifications) => notifications.filter((notification) => notification.id !== id));
    }, 2400);
  }

  private runSceneMutation(action: () => void): void {
    this.closeContextMenu();
    this.store.recordHistoryCheckpoint();
    action();
  }

  private buildSharePayload(): SharedScenePayload {
    return {
      scene: this.scene(),
      preferences: this.preferences(),
      importCode: this.store.importCode(),
      viewportCenter: this.viewportCenter(),
      latexExportConfig: this.latexExportConfig()
    };
  }

  private async refreshShareUrl(): Promise<void> {
    const requestId = ++this.shareUrlRequestId;
    const url = await this.generateShareUrl();
    if (requestId === this.shareUrlRequestId) {
      this.shareUrl.set(url);
    }
  }

  private async generateShareUrl(): Promise<string> {
    const location = globalThis.location;
    if (!location) {
      return '';
    }

    const baseUrl = new URL(location.origin + location.pathname);
    if (location.hash) {
      baseUrl.hash = location.hash;
    }
    baseUrl.searchParams.set('share', await encodeSharePayload(this.buildSharePayload()));
    return baseUrl.toString();
  }

  private async restoreSharedSceneFromUrl(): Promise<void> {
    const location = globalThis.location;
    if (!location) {
      return;
    }

    const sharedState = await decodeSharePayload(new URL(location.href).searchParams.get('share') ?? '');
    if (!sharedState) {
      return;
    }

    this.store.restoreSharedState(sharedState);
    this.viewportCenter.set(sharedState.viewportCenter ?? { x: 0, y: 0 });
    if (sharedState.latexExportConfig) {
      this.latexExportConfig.set({
        ...this.defaultLatexExportConfig,
        ...sharedState.latexExportConfig
      });
    }
  }

  private requestSceneReplacement(presetId: string): void {
    if (this.scene().shapes.length === 0) {
      if (presetId === 'blank') {
        this.resetSceneConfirmed();
      } else {
        this.applyScenePresetConfirmed(presetId);
      }
      return;
    }

    const preset = presetId === 'blank' ? null : this.scenePresets.find((entry) => entry.id === presetId);
    this.sceneReplaceDialog.set({
      presetId,
      title: presetId === 'blank' ? this.t('newScene') : preset ? this.scenePresetTitle(preset) : this.t('newScene')
    });
  }

  confirmSceneReplaceDialog(): void {
    const dialog = this.sceneReplaceDialog();
    if (!dialog) {
      return;
    }

    this.sceneReplaceDialog.set(null);
    if (dialog.presetId === 'blank') {
      this.resetSceneConfirmed();
      return;
    }
    this.applyScenePresetConfirmed(dialog.presetId);
  }

  closeSceneReplaceDialog(): void {
    this.sceneReplaceDialog.set(null);
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
    const clampedScale = Math.min(120, Math.max(12, Math.round(nextScale)));
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

  private updateViewportFromMinimapPointer(clientX: number, clientY: number, minimap: MinimapOverview): void {
    const target = this.document.elementFromPoint(clientX, clientY);
    if (!(target instanceof SVGElement)) {
      return;
    }

    const minimapSvg = target.closest('.minimap__svg');
    if (!(minimapSvg instanceof SVGSVGElement)) {
      return;
    }

    const rect = minimapSvg.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const localX = ((clientX - rect.left) / rect.width) * minimap.viewBoxWidth;
    const localY = ((clientY - rect.top) / rect.height) * minimap.viewBoxHeight;
    const worldX = minimap.worldLeft + (localX - minimap.offsetX) / minimap.mapScale;
    const worldY = minimap.worldTop - (localY - minimap.offsetY) / minimap.mapScale;
    this.viewportCenter.set({ x: worldX, y: worldY });
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

  suggestedCaption(): string {
    const name = this.scene().name.trim();
    return name || 'TikZ figure';
  }

  suggestedLabel(): string {
    const slug = this.scene()
      .name.toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `fig:${slug || 'tikz-figure'}`;
  }

  private latexAlignmentCommand(alignment: LatexAlignment): string {
    switch (alignment) {
      case 'center':
        return '\\centering';
      case 'left':
        return '\\raggedright';
      case 'right':
        return '\\raggedleft';
    }
  }

  private latexWidthExpression(percent: number): string {
    if (percent >= 100) {
      return '\\textwidth';
    }

    const normalized = Number.parseFloat((percent / 100).toFixed(2));
    return `${normalized}\\textwidth`;
  }

  private canPreviewInsert(toolId: ToolId): boolean {
    return this.allInsertablePresets().some((preset) => preset.id === toolId);
  }

  private presetKeepsOwnStyle(toolId: ToolId): boolean {
    return this.savedTemplates().some((template) => template.id === toolId);
  }

  private applyInsertionDefaults(shape: CanvasShape): CanvasShape {
    const preferences = this.preferences();
    switch (shape.kind) {
      case 'line':
        return {
          ...shape,
          stroke: preferences.defaultStroke,
          arrowColor: preferences.defaultStroke,
          arrowOpacity: 1,
          strokeOpacity: 1,
          strokeWidth: preferences.defaultStrokeWidth
        };
      case 'rectangle':
      case 'circle':
      case 'ellipse':
        return {
          ...shape,
          stroke: preferences.defaultStroke,
          fill: preferences.defaultFill,
          strokeOpacity: 1,
          fillOpacity: 1,
          strokeWidth: preferences.defaultStrokeWidth
        };
      case 'image':
        return {
          ...shape,
          stroke: preferences.defaultStroke,
          strokeOpacity: 1,
          strokeWidth: preferences.defaultStrokeWidth
        };
      case 'text':
        return {
          ...shape,
          colorOpacity: 1
        };
    }
  }

  private buildInsertionPreviewShapes(toolId: ToolId, startPoint: Point, currentPoint: Point): readonly CanvasShape[] {
    const preset = this.allInsertablePresets().find((entry) => entry.id === toolId);
    if (!preset) {
      return [];
    }
    const deltaX = currentPoint.x - startPoint.x;
    const deltaY = currentPoint.y - startPoint.y;
    const hasDrag = Math.abs(deltaX) > 0.12 || Math.abs(deltaY) > 0.12;
    const keepOwnStyle = this.presetKeepsOwnStyle(toolId);
    const templateShapes = structuredClone(preset.shapes);
    const templateBounds = this.computeBounds(templateShapes);
    if (!templateBounds) {
      return [];
    }

    if (!hasDrag) {
      const centerX = (templateBounds.left + templateBounds.right) / 2;
      const centerY = (templateBounds.bottom + templateBounds.top) / 2;
      return templateShapes.map((shape, index) =>
        this.applyPresetStyle(
          this.transformShape(
            shape,
            startPoint.x - centerX,
            startPoint.y - centerY,
            1,
            1,
            templateBounds.left,
            templateBounds.bottom,
            `preview-${index}`
          ),
          keepOwnStyle
        )
      );
    }

    const targetLeft = Math.min(startPoint.x, currentPoint.x);
    const targetBottom = Math.min(startPoint.y, currentPoint.y);
    const targetWidth = Math.max(Math.abs(deltaX), 0.2);
    const targetHeight = Math.max(Math.abs(deltaY), 0.2);
    const templateWidth = Math.max(templateBounds.right - templateBounds.left, 0.2);
    const templateHeight = Math.max(templateBounds.top - templateBounds.bottom, 0.2);
    const scaleX = targetWidth / templateWidth;
    const scaleY = targetHeight / templateHeight;

    return templateShapes.map((shape, index) =>
      this.applyPresetStyle(
        this.transformShape(
          shape,
          targetLeft - templateBounds.left * scaleX,
          targetBottom - templateBounds.bottom * scaleY,
          scaleX,
          scaleY,
          0,
          0,
          `preview-${index}`
        ),
        keepOwnStyle
      )
    );
  }

  private insertPresetAt(toolId: ToolId, point: Point): void {
    const preset = this.allInsertablePresets().find((entry) => entry.id === toolId);
    if (!preset) {
      return;
    }
    const keepOwnStyle = this.presetKeepsOwnStyle(toolId);

    const templateBounds = this.computeBounds(preset.shapes);
    if (!templateBounds) {
      return;
    }

    const centerX = (templateBounds.left + templateBounds.right) / 2;
    const centerY = (templateBounds.bottom + templateBounds.top) / 2;
    const shapes = structuredClone(preset.shapes).map((shape) =>
      this.applyPresetStyle(
        this.transformShape(shape, point.x - centerX, point.y - centerY, 1, 1, 0, 0, crypto.randomUUID()),
        keepOwnStyle
      )
    );
    this.store.addShapes(shapes);
  }

  private applyPresetStyle(shape: CanvasShape, keepOwnStyle: boolean): CanvasShape {
    return keepOwnStyle ? shape : this.applyInsertionDefaults(shape);
  }

  private transformShape(
    shape: CanvasShape,
    deltaX: number,
    deltaY: number,
    scaleX: number,
    scaleY: number,
    originX: number,
    originY: number,
    id: string
  ): CanvasShape {
    const scalePoint = (point: Point): Point => ({
      x: (point.x - originX) * scaleX + originX + deltaX,
      y: (point.y - originY) * scaleY + originY + deltaY
    });

    switch (shape.kind) {
      case 'line':
        return {
          ...shape,
          id,
          from: scalePoint(shape.from),
          to: scalePoint(shape.to),
          anchors: shape.anchors.map((anchor) => scalePoint(anchor))
        };
      case 'rectangle':
        return {
          ...shape,
          id,
          x: (shape.x - originX) * scaleX + originX + deltaX,
          y: (shape.y - originY) * scaleY + originY + deltaY,
          width: Math.max(shape.width * scaleX, 0.2),
          height: Math.max(shape.height * scaleY, 0.2),
          cornerRadius: Math.max(shape.cornerRadius * Math.min(scaleX, scaleY), 0)
        };
      case 'circle':
        return {
          ...shape,
          id,
          cx: (shape.cx - originX) * scaleX + originX + deltaX,
          cy: (shape.cy - originY) * scaleY + originY + deltaY,
          r: Math.max(shape.r * Math.max(Math.min(scaleX, scaleY), 0.2), 0.1)
        };
      case 'ellipse':
        return {
          ...shape,
          id,
          cx: (shape.cx - originX) * scaleX + originX + deltaX,
          cy: (shape.cy - originY) * scaleY + originY + deltaY,
          rx: Math.max(shape.rx * scaleX, 0.1),
          ry: Math.max(shape.ry * scaleY, 0.1)
        };
      case 'text':
        return {
          ...shape,
          id,
          x: (shape.x - originX) * scaleX + originX + deltaX,
          y: (shape.y - originY) * scaleY + originY + deltaY,
          fontSize: Math.max(shape.fontSize * Math.max(Math.min(scaleX, scaleY), 0.7), 0.2)
        };
      case 'image':
        return {
          ...shape,
          id,
          x: (shape.x - originX) * scaleX + originX + deltaX,
          y: (shape.y - originY) * scaleY + originY + deltaY,
          width: Math.max(shape.width * scaleX, 0.4),
          height: Math.max(shape.height * scaleY, 0.4)
        };
    }
  }

  private savedTemplateToPreset(template: SavedTemplate): ObjectPreset {
    return {
      id: template.id,
      category: 'essentials',
      icon: template.icon,
      title: template.title,
      description: template.description,
      shapes: template.shapes,
      quickAccess: false
    };
  }

  private iconForShapes(shapes: readonly CanvasShape[]): string {
    const firstShape = shapes[0];
    if (!firstShape) {
      return 'library';
    }
    return firstShape.kind === 'line' && firstShape.arrowEnd
      ? 'arrow'
      : firstShape.kind === 'line'
        ? 'segment'
        : firstShape.kind;
  }

  private restoreSavedTemplates(): void {
    const raw = this.document.defaultView?.localStorage?.getItem(this.savedTemplatesStorageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SavedTemplate[];
      this.savedTemplates.set(Array.isArray(parsed) ? parsed : []);
    } catch {
      this.savedTemplates.set([]);
    }
  }

  private persistSavedTemplates(): void {
    this.document.defaultView?.localStorage?.setItem(
      this.savedTemplatesStorageKey,
      JSON.stringify(this.savedTemplates())
    );
  }

  private restoreLanguage(): LanguageCode {
    const saved = this.document.defaultView?.localStorage?.getItem(this.languageStorageKey);
    return saved === 'ca' || saved === 'es' || saved === 'en' ? saved : detectLanguage();
  }

  private buildSnippetExport(): { readonly imports: string; readonly code: string; readonly combined: string } {
    const baseBundle = this.baseTikzExportBundle();
    const config = this.latexExportConfig();
    const caption = config.caption.trim() || this.suggestedCaption();
    const label = config.label.trim() || this.suggestedLabel();
    const imports = [baseBundle.imports, '\\usepackage{adjustbox}'];

    if (config.wrapInFigure && config.figurePlacement.includes('H')) {
      imports.push('\\usepackage{float}');
    }

    const contentLines = [
      this.latexAlignmentCommand(config.alignment),
      config.fontSize === 'normalsize' ? '' : `\\${config.fontSize}`,
      `\\begin{adjustbox}{max width=${this.latexWidthExpression(config.maxWidthPercent)}${config.alignment === 'center' ? ',center' : ''}}`,
      baseBundle.code,
      '\\end{adjustbox}'
    ].filter(Boolean);

    const code = config.wrapInFigure
      ? [
          `\\begin{figure}[${config.figurePlacement || 'H'}]`,
          ...contentLines.map((line) => `  ${line}`),
          ...(config.includeCaption ? [`  \\caption{${caption}}`] : []),
          ...(config.includeLabel ? [`  \\label{${label}}`] : []),
          '\\end{figure}'
        ].join('\n')
      : contentLines.join('\n');

    const normalizedImports = Array.from(new Set(imports.filter(Boolean))).join('\n');

    return {
      imports: normalizedImports,
      code,
      combined: [normalizedImports, code].filter(Boolean).join('\n\n')
    };
  }

  private buildStandaloneDocument(): string {
    const snippet = this.buildSnippetExport();
    return [
      '\\documentclass[tikz]{standalone}',
      snippet.imports,
      '\\begin{document}',
      snippet.code,
      '\\end{document}'
    ].join('\n');
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

  private linePoints(shape: LineShape): readonly Point[] {
    return [shape.from, ...shape.anchors, shape.to];
  }

  private buildLinePath(
    shape: LineShape,
    projectPoint: (point: Point) => { readonly x: number; readonly y: number }
  ): string {
    const points = this.linePoints(shape).map(projectPoint);
    if (points.length < 2) {
      return '';
    }

    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 0; index < points.length - 1; index += 1) {
      const previous = points[index - 1] ?? points[index];
      const current = points[index];
      const next = points[index + 1];
      const afterNext = points[index + 2] ?? next;
      const control1 = {
        x: current.x + (next.x - previous.x) / 6,
        y: current.y + (next.y - previous.y) / 6
      };
      const control2 = {
        x: next.x - (afterNext.x - current.x) / 6,
        y: next.y - (afterNext.y - current.y) / 6
      };
      path += ` C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${next.x} ${next.y}`;
    }

    return path;
  }

  private toMinimapShape(
    shape: CanvasShape,
    toMapX: (x: number) => number,
    toMapY: (y: number) => number,
    scale: number
  ): MinimapShape {
    switch (shape.kind) {
      case 'line':
        return {
          kind: 'line',
          stroke: shape.stroke,
          strokeWidth: Math.max(shape.strokeWidth * scale, 0.8),
          path: this.buildLinePath(shape, (point) => ({
            x: toMapX(point.x),
            y: toMapY(point.y)
          }))
        };
      case 'rectangle':
        return {
          kind: 'rectangle',
          stroke: shape.stroke,
          strokeWidth: Math.max(shape.strokeWidth * scale, 0.8),
          fill: shape.fill,
          x: toMapX(shape.x),
          y: toMapY(shape.y + shape.height),
          width: Math.max(shape.width * scale, 1.4),
          height: Math.max(shape.height * scale, 1.4),
          rx: Math.max(shape.cornerRadius * scale, 0.6)
        };
      case 'circle':
        return {
          kind: 'circle',
          stroke: shape.stroke,
          strokeWidth: Math.max(shape.strokeWidth * scale, 0.8),
          fill: shape.fill,
          cx: toMapX(shape.cx),
          cy: toMapY(shape.cy),
          r: Math.max(shape.r * scale, 0.9)
        };
      case 'ellipse':
        return {
          kind: 'ellipse',
          stroke: shape.stroke,
          strokeWidth: Math.max(shape.strokeWidth * scale, 0.8),
          fill: shape.fill,
          cx: toMapX(shape.cx),
          cy: toMapY(shape.cy),
          rx: Math.max(shape.rx * scale, 0.9),
          ry: Math.max(shape.ry * scale, 0.9)
        };
      case 'text': {
        const width = Math.max(shape.text.length * shape.fontSize * 0.48 * scale, 1.6);
        const height = Math.max(shape.fontSize * 0.72 * scale, 1.2);
        return {
          kind: 'text',
          stroke: 'transparent',
          strokeWidth: 0,
          fill: shape.color,
          x: toMapX(shape.x) - width / 2,
          y: toMapY(shape.y) - height / 2,
          width,
          height
        };
      }
      case 'image':
        return {
          kind: 'image',
          stroke: shape.stroke,
          strokeWidth: Math.max(shape.strokeWidth * scale, 0.8),
          x: toMapX(shape.x),
          y: toMapY(shape.y + shape.height),
          width: Math.max(shape.width * scale, 1.4),
          height: Math.max(shape.height * scale, 1.4),
          href: shape.src
        };
    }
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
        return this.linePoints(shape).reduce<SelectionBounds>(
          (bounds, point) => ({
            left: Math.min(bounds.left, point.x),
            right: Math.max(bounds.right, point.x),
            bottom: Math.min(bounds.bottom, point.y),
            top: Math.max(bounds.top, point.y)
          }),
          {
            left: Number.POSITIVE_INFINITY,
            right: Number.NEGATIVE_INFINITY,
            bottom: Number.POSITIVE_INFINITY,
            top: Number.NEGATIVE_INFINITY
          }
        );
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
      case 'image':
        return { left: shape.x, right: shape.x + shape.width, bottom: shape.y, top: shape.y + shape.height };
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
      case 'image':
        return this.resizeRectangle(shape, handle, point);
    }
  }

  private resizeRectangle(
    shape: Extract<CanvasShape, { kind: 'rectangle' | 'image' }>,
    handle: ResizeHandle,
    point: Point
  ): CanvasShape {
    const resizedBounds = this.resizeBounds(
      { left: shape.x, right: shape.x + shape.width, bottom: shape.y, top: shape.y + shape.height },
      handle,
      point,
      0.2,
      0.2,
      shape.kind === 'image' ? shape.aspectRatio : shape.width / shape.height
    );
    const resizedShape = {
      ...shape,
      x: resizedBounds.left,
      y: resizedBounds.bottom,
      width: resizedBounds.right - resizedBounds.left,
      height: resizedBounds.top - resizedBounds.bottom
    };
    return shape.kind === 'image'
      ? ({
          ...resizedShape,
          aspectRatio: shape.aspectRatio || (resizedShape.height !== 0 ? resizedShape.width / resizedShape.height : 1)
        } as CanvasShape)
      : resizedShape;
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
    if (handle === 'from') {
      return { ...shape, from: point };
    }

    if (handle === 'to') {
      return { ...shape, to: point };
    }

    if (handle.startsWith('anchor-')) {
      const anchorIndex = Number(handle.slice('anchor-'.length));
      if (!Number.isInteger(anchorIndex) || !shape.anchors[anchorIndex]) {
        return shape;
      }

      return {
        ...shape,
        anchors: shape.anchors.map((anchor, index) => (index === anchorIndex ? point : anchor))
      };
    }

    return shape;
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

    if (aspectRatio && (this.shiftPressed() || this.selectedShape()?.kind === 'image')) {
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

  private loadImageDimensions(src: string): Promise<{ readonly width: number; readonly height: number } | null> {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        resolve(
          image.naturalWidth && image.naturalHeight ? { width: image.naturalWidth, height: image.naturalHeight } : null
        );
      };
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private async insertImageFileAtPoint(file: File, point: Point): Promise<void> {
    const dataUrl = await this.readFileAsDataUrl(file);
    const dimensions = await this.loadImageDimensions(dataUrl);
    const aspectRatio = dimensions && dimensions.height > 0 ? Math.max(dimensions.width / dimensions.height, 0.01) : 1;
    const width = 8;
    const height = Math.max(width / aspectRatio, 0.4);
    const imageShape = this.applyInsertionDefaults({
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^/.]+$/, '') || 'Image',
      kind: 'image',
      stroke: this.preferences().defaultStroke,
      strokeOpacity: 1,
      strokeWidth: this.preferences().defaultStrokeWidth,
      x: point.x - width / 2,
      y: point.y - height / 2,
      width,
      height,
      aspectRatio,
      src: dataUrl,
      latexSource: file.name
    });

    this.selectedImageFilename.set(file.name);
    this.runSceneMutation(() => {
      this.store.addShapes([imageShape]);
      this.store.selectShape(imageShape.id);
      this.activeTool.set('select');
      this.inspectorTab.set('properties');
    });
  }

  private openInlineTextEditor(shape: Extract<CanvasShape, { kind: 'text' }>): void {
    this.inlineTextEditor.set({
      shapeId: shape.id,
      value: shape.text
    });
    afterNextRender(() => {
      const input = this.inlineTextInput()?.nativeElement;
      input?.focus();
      input?.select();
    });
  }
}
