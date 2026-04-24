import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild
} from '@angular/core';
import packageManifest from '../../../../../../package.json';
import {
  DEFAULT_ARROW_TIP_LENGTH,
  DEFAULT_ARROW_TIP_WIDTH,
  EDITOR_CANVAS_MIN_HEIGHT,
  EDITOR_CANVAS_MIN_WIDTH,
  EDITOR_CONTEXT_MENU_SUPPRESSION_MS,
  EDITOR_IMAGE_ASPECT_RATIO_EPSILON,
  EDITOR_LEFT_SIDEBAR_MIN_WIDTH,
  EDITOR_LEFT_SIDEBAR_MOBILE_MIN_HEIGHT,
  EDITOR_LINE_ANCHOR_DECIMALS,
  EDITOR_LINE_ARROW_SCALE_MAX,
  EDITOR_LINE_ARROW_SCALE_MIN,
  EDITOR_MOBILE_BREAKPOINT_PX,
  EDITOR_PASTE_OFFSET_STEP,
  EDITOR_PNG_EXPORT_SCALE,
  EDITOR_POINTER_TAP_MAX_DISTANCE_PX,
  EDITOR_RIGHT_SIDEBAR_DESKTOP_STACKED_MIN_HEIGHT,
  EDITOR_RIGHT_SIDEBAR_MIN_WIDTH,
  EDITOR_RIGHT_SIDEBAR_MOBILE_MIN_HEIGHT,
  EDITOR_SCALE_DECIMAL_FACTOR,
  EDITOR_SCALE_MAX,
  EDITOR_SCALE_MIN,
  EDITOR_SIDEBAR_OVERLAY_BREAKPOINT_PX,
  EDITOR_VIEWPORT_FALLBACK_WIDTH,
  EDITOR_WHEEL_LINE_HEIGHT_PX,
  EDITOR_WHEEL_PAGE_HEIGHT_FALLBACK,
  EDITOR_WHEEL_ZOOM_SENSITIVITY,
  EDITOR_ZOOM_STEP,
  DEFAULT_EDITOR_SCALE,
  DEFAULT_TEXT_BOX_WIDTH,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_FONT_SIZE,
  EDITOR_STORAGE_KEYS,
  EDITOR_THEME_TOGGLE_COOLDOWN_MS,
  FREEHAND_POINT_MIN_DISTANCE,
  MIN_IMAGE_DIMENSION,
  MIN_POINTER_DRAG_DELTA,
  MIN_RENDER_STROKE_WIDTH,
  MIN_SHAPE_DIMENSION,
  MIN_TEXT_BOX_WIDTH,
  MIN_TEXT_FONT_SIZE,
  MIN_TEXT_RESIZE_HEIGHT,
  MIN_TEXT_RESIZE_WIDTH,
  MINIMAP_MIN_IMAGE_DIMENSION,
  MINIMAP_MIN_RADIUS,
  MINIMAP_MIN_TEXT_HEIGHT,
  OPACITY_MAX,
  OPACITY_MIN,
  SHAPE_STROKE_SCALE_FACTOR,
  SLIDER_DECIMAL_PLACES,
  TEXT_DOUBLE_TAP_WINDOW_MS,
  TEXT_MIN_HEIGHT_FACTOR
} from '../../constants/editor.constants';
import { getIconPath, iconPaths } from '../../config/editor-icons';
import {
  type ArrowControlHandle,
  type ArrowDirection,
  type ArrowEndpoint,
  type ArrowScaleKind,
  type ArrowTipOption,
  Axis,
  type ClipboardShapeSet,
  type CodeHighlightTheme,
  type ContextAction,
  type ContextMenuState,
  type CssTextAlign,
  type ExportMode,
  type ExportSvgDocument,
  type HandleDescriptor,
  type HomogeneousSelectionInfo,
  type ImageDimensionKey,
  type ImageTextKey,
  type InlineTextEditorState,
  type InspectorTab,
  type InteractionState,
  type LatexAlignment,
  type LatexExportBooleanKey,
  type LatexExportConfig,
  type LatexFontSize,
  type LatexExportNumberKey,
  type LatexExportTextKey,
  type LineBooleanKey,
  type LineCanvasShape,
  type LineEndpoint,
  type LibrarySection,
  type MinimapOverview,
  type MinimapRect,
  type MinimapShape,
  type NotificationTone,
  type PinchZoomState,
  type PreferenceBooleanKey,
  type PreferenceNumberKey,
  type PreferenceTextKey,
  type RecentTextTap,
  type RectangleCanvasShape,
  type ResizeHandle,
  type ResizeCursor,
  type SavedTemplate,
  type SceneReplaceDialogState,
  type ShapeOpacityKey,
  type ShapeTextKey,
  type SidebarResizeTarget,
  type SidebarSide,
  type SvgTextAnchor,
  type TemplateDialogTextKey,
  type TextCanvasShape,
  type TriangleCanvasShape,
  type TextStyleKey,
  type TextStylePropertyKey,
  type TextTransformMode,
  type SidebarResizeState,
  type TextSymbolGroup,
  type TextSymbolPalettePosition,
  type ToastNotification,
  type ToolDescriptor,
  type ToolId
} from './editor-page.types';
import { EditorTopbarComponent } from '../editor-topbar/editor-topbar.component';
import { EditorLeftSidebarComponent } from '../editor-left-sidebar/editor-left-sidebar.component';
import { EditorRightSidebarComponent } from '../editor-right-sidebar/editor-right-sidebar.component';
import { TableDialogComponent } from '../table-dialog/table-dialog.component';
import { ImportCodeModalComponent } from '../import-code-modal/import-code-modal.component';
import {
  categoryOrder,
  categoryTranslationKey,
  detectLanguage,
  type LanguageCode,
  localizedShapeKinds,
  type SharedScenePayload,
  translations
} from '../../i18n/editor-page.i18n';
import {
  decodeSharePayload,
  encodeSharePayload,
  highlightLatex,
  type SelectionBounds,
  transformCanvasShape,
  translateShapeBy
} from '../../utils/editor-page.utils';
import { resizeSelection, resizeShape as resizeShapeUtil } from '../../utils/editor-resize.utils';
import { buildCanvasExportDocument as buildCanvasExportDocumentUtil } from '../../utils/editor-export-svg.utils';
import {
  normalizeLatexExportConfig as normalizeLatexExportConfigUtil,
  parsePinnedToolIdsFromStorage,
  parseSavedTemplatesFromStorage,
  parseStoredLatexExportConfig as parseStoredLatexExportConfigUtil,
  restoreCodeHighlightThemeFromStorage,
  restoreLanguageFromStorage,
  serializableLatexExportConfig as serializableLatexExportConfigUtil
} from '../../utils/editor-storage.utils';
import {
  selectionContainsShape as selectionContainsShapeUtil,
  shapeSetIds as shapeSetIdsUtil,
  toggledShapeSetSelection
} from '../../utils/editor-selection.utils';
import {
  type ModifierKey,
  isCopyShortcut,
  isCutShortcut,
  isDeleteShortcutKey,
  isEscapeShortcutKey,
  isPasteShortcut,
  isRedoShortcut,
  isSelectionModifierPressed,
  isSelectAllShortcut,
  isUndoShortcut,
  isZoomInShortcutKey,
  isZoomOutShortcutKey,
  pressedModifierFromKey,
  toolIdFromShortcutKey
} from '../../utils/editor-keyboard.utils';
import {
  buildTablePresetShapes,
  localizePresetCanvasShapes as localizePresetTemplateShapes
} from '../../presets/presets';
import { type LatexColorMode, sceneToTikzBundle, type TikzExportOptions } from '../../tikz/tikz.codegen';
import { EditorStore } from '../../state/editor.store';
import {
  DEFAULT_TABLE_DIMENSIONS,
  type TableDialogState,
  type TableDimensions,
  type TableSelectionInfo
} from '../../models/table.models';
import {
  buildTableShapes,
  getTableSelectionInfo,
  normalizeTableDimensions,
  remapStructuralShapeIds,
  tableSizeLabel
} from '../../utils/table.utils';
import type {
  ArrowTipKind,
  CanvasShape,
  EditorPreferences,
  LineShape,
  ObjectPreset,
  PersistedEditorState,
  Point,
  PresetCategory,
  ScenePreset,
  TextAlign,
  TextShape,
  ThemeMode,
  TikzScene
} from '../../models/tikz.models';
import {
  boundsFromPoints as boundsFromPointsUtil,
  buildLinePath as buildLinePathUtil,
  buildTrianglePath as buildTrianglePathUtil,
  computeBounds as computeBoundsUtil,
  cornerRadiusFromPointer as cornerRadiusFromPointerUtil,
  linePoints as linePointsUtil,
  maxTriangleCornerRadius as maxTriangleCornerRadiusUtil,
  normalizeRotationDegrees as normalizeRotationDegreesUtil,
  rotatePointAround as rotatePointAroundUtil,
  rotateShapeAround as rotateShapeAroundUtil,
  rotatedEllipseBounds as rotatedEllipseBoundsUtil,
  rotatedRectangleBounds as rotatedRectangleBoundsUtil,
  shapeBounds as shapeBoundsUtil,
  shapeCenter as shapeCenterUtil,
  shapeRotation as shapeRotationUtil,
  trianglePoints as trianglePointsUtil
} from '../../utils/editor-geometry.utils';
import { displayTextLinesForShape, estimateTextWidth, textLeftForWidth } from '../../utils/text.utils';

@Component({
  selector: 'app-editor-page',
  imports: [
    EditorTopbarComponent,
    EditorLeftSidebarComponent,
    EditorRightSidebarComponent,
    TableDialogComponent,
    ImportCodeModalComponent
  ],
  templateUrl: './editor-page.component.html',
  styleUrl: './editor-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [EditorStore],
  host: {
    '[attr.data-theme]': 'store.preferences().theme',
    '(window:keydown)': 'handleWindowKeydown($event)',
    '(window:paste)': 'handleWindowPaste($event)',
    '(window:keyup)': 'handleWindowKeyup($event)',
    '(window:blur)': 'handleWindowBlur()',
    '(window:pointermove)': 'handleWindowPointerMove($event)',
    '(window:pointerup)': 'handleWindowPointerUp()'
  }
})
export class EditorPageComponent {
  private static readonly themeToggleCooldownMs = EDITOR_THEME_TOGGLE_COOLDOWN_MS;
  private static readonly inlineTextEditorMetrics = {
    minFontSize: 14,
    minPaddingX: 6,
    minPaddingY: 4,
    minBoxWidth: 56,
    minLineWidth: 36,
    characterWidthFactor: 0.56,
    minLineWidthFactor: 1.4,
    lineHeightFactor: 1.08
  } as const;
  private static readonly textSymbolPopoverMetrics = {
    viewportWidthFallback: 1280,
    viewportHeightFallback: 800,
    maxWidth: 420,
    minWidth: 280,
    preferredHeight: 420,
    minHeight: 220,
    edgePadding: 12,
    offset: 8,
    openUpwardThreshold: 260
  } as const;
  private static readonly selectionHandleSizeByPointer = {
    coarse: 18,
    fine: 10
  } as const;
  private static readonly cornerRadiusHandleInsetFactor = 1.65;
  private static readonly contextMenuViewportPadding = 8;
  private static readonly selectionRotateHandleDistanceFactor = 3.2;
  private static readonly selectionRotateHandleMinDistance = 0.65;
  private static readonly rotationSnapStepDegrees = 15;
  private static readonly wheelRotationScale = 0.04;
  private static readonly wheelRotationMinStepDegrees = 3;
  private static readonly wheelRotationMaxStepDegrees = 18;
  private static readonly lineHitStrokeExtraPx = 10;
  private static readonly lineHitStrokeMinPx = 14;
  private static readonly sidebarResizeLimits = {
    mobileMinHeight: 160,
    mobileMaxHeight: 640,
    leftMinWidth: 220,
    leftMaxWidth: 420,
    rightMinWidth: 260,
    rightMaxWidth: 460
  } as const;
  private static readonly collapsedSidebarSize = {
    desktopWidth: 0,
    mobileHeight: 56
  } as const;
  private static readonly defaultSliderRange = {
    min: -20,
    max: 20
  } as const;
  private static readonly notificationDurationMs = 2400;
  private readonly savedTemplatesStorageKey = EDITOR_STORAGE_KEYS.savedTemplates;
  private readonly pinnedToolsStorageKey = EDITOR_STORAGE_KEYS.pinnedTools;
  private readonly languageStorageKey = EDITOR_STORAGE_KEYS.language;
  private readonly codeThemeStorageKey = EDITOR_STORAGE_KEYS.codeTheme;
  private readonly latexExportConfigStorageKey = EDITOR_STORAGE_KEYS.latexExportConfig;
  private readonly sidebarSizesStorageKey = EDITOR_STORAGE_KEYS.sidebarSizes;
  private readonly editorStateStorageKey = EDITOR_STORAGE_KEYS.state;
  private readonly defaultScale = DEFAULT_EDITOR_SCALE;
  private readonly defaultLatexExportConfig = {
    colorMode: 'direct-rgb',
    wrapInFigure: false,
    figurePlacement: 'H',
    alignment: 'center',
    scaleToWidth: true,
    includeFrame: false,
    maxWidthPercent: 100,
    standaloneBorderMm: 6,
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
  readonly contextMenuPanel = viewChild<ElementRef<HTMLDivElement>>('contextMenuPanel');
  readonly inlineTextInput = viewChild<ElementRef<HTMLTextAreaElement>>('inlineTextInput');
  readonly inspectorTextInput = viewChild<ElementRef<HTMLTextAreaElement>>('inspectorTextInput');
  readonly layersSection = viewChild<ElementRef<HTMLElement>>('layersSection');
  readonly rightSidebar = viewChild(EditorRightSidebarComponent);

  readonly appVersion = packageManifest.version;
  readonly editorApi = this;
  readonly scene = this.store.scene;
  readonly preferences = this.store.preferences;
  readonly selectedShape = this.store.selectedShape;
  readonly selectedShapes = this.store.selectedShapes;
  readonly selectionCount = this.store.selectionCount;
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
  readonly canvasWidth = signal(EDITOR_VIEWPORT_FALLBACK_WIDTH);
  readonly canvasHeight = signal(840);
  readonly canvasViewportWidth = signal(EDITOR_VIEWPORT_FALLBACK_WIDTH);
  readonly interactionState = signal<InteractionState | null>(null);
  readonly contextMenu = signal<ContextMenuState | null>(null);
  readonly contextMenuPosition = signal<{ readonly left: number; readonly top: number } | null>(null);
  readonly fileMenuOpen = signal(false);
  readonly exportModalOpen = signal(false);
  readonly importModalOpen = signal(false);
  readonly exportSettingsModalOpen = signal(false);
  readonly exportMode = signal<ExportMode>('snippet');
  readonly codeHighlightTheme = signal<CodeHighlightTheme>(this.restoreCodeHighlightTheme());
  readonly latexExportConfig = signal<LatexExportConfig>(this.restoreLatexExportConfig());
  readonly savedTemplates = signal<readonly SavedTemplate[]>([]);
  readonly pinnedToolIds = signal<readonly string[]>([]);
  readonly pinnedToolsReady = signal(false);
  readonly libraryQuery = signal('');
  readonly shareFeedback = signal('');
  readonly shareFeedbackTone = signal<NotificationTone>('info');
  readonly notifications = signal<readonly ToastNotification[]>([]);
  readonly selectedImageFilename = signal('');
  readonly templateDialogOpen = signal(false);
  readonly templateDialogMode = signal<'create' | 'edit'>('create');
  readonly editingTemplateId = signal<string | null>(null);
  readonly tableDialogState = signal<TableDialogState | null>(null);
  readonly tablePresetDimensions = signal<TableDimensions>(DEFAULT_TABLE_DIMENSIONS);
  readonly templateTitleInput = signal('');
  readonly templateDescriptionInput = signal('');
  readonly templateIconInput = signal('library');
  readonly templateUseCurrentSelection = signal(true);
  readonly templateDeleteTarget = signal<SavedTemplate | null>(null);
  readonly inlineTextEditor = signal<InlineTextEditorState | null>(null);
  readonly textSymbolPaletteOpen = signal(false);
  readonly textSymbolPalettePosition = signal<TextSymbolPalettePosition>({ top: 0, left: 0, maxHeight: 320 });
  readonly recentTextTap = signal<RecentTextTap | null>(null);
  readonly recentSelectedShapeTap = signal<RecentTextTap | null>(null);
  readonly suppressContextMenuUntil = signal(0);
  readonly suppressNextContextMenu = signal(false);
  readonly clipboardShapes = signal<ClipboardShapeSet | null>(null);
  readonly ignoreNextShapeClickId = signal<string | null>(null);
  private readonly initialSidebarSizes = this.restoreSidebarSizes();
  readonly leftSidebarWidth = signal(this.initialSidebarSizes.left);
  readonly rightSidebarWidth = signal(this.initialSidebarSizes.right);
  readonly mobileRightSidebarHeight = signal(320);
  readonly mobileLeftSidebarHeight = signal(320);
  readonly sidebarResizeState = signal<SidebarResizeState | null>(null);
  readonly coarsePointer = signal(false);
  readonly mobileLayout = signal(false);
  readonly sidebarsOverlayLayout = signal(false);
  readonly mobileLibraryPanelOpen = signal(false);
  readonly leftSidebarCollapsed = signal(false);
  readonly rightSidebarCollapsed = signal(false);
  readonly minimapPanPointerId = signal<number | null>(null);
  private pinchZoomState: PinchZoomState | null = null;
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
    layers: false
  });
  readonly spacePressed = signal(false);
  readonly shiftPressed = signal(false);
  readonly controlPressed = signal(false);
  readonly metaPressed = signal(false);
  readonly altPressed = signal(false);
  readonly ignoreNextCanvasClick = signal(false);
  readonly iconMap = iconPaths;
  readonly topbarTranslate = (key: string): string => this.t(key);
  readonly textSymbolGroups: readonly TextSymbolGroup[] = [
    {
      label: 'Greek',
      symbols: [
        { label: 'α', insert: '\\alpha', title: 'alpha' },
        { label: 'β', insert: '\\beta', title: 'beta' },
        { label: 'γ', insert: '\\gamma', title: 'gamma' },
        { label: 'δ', insert: '\\delta', title: 'delta' },
        { label: 'ε', insert: '\\epsilon', title: 'epsilon' },
        { label: 'θ', insert: '\\theta', title: 'theta' },
        { label: 'λ', insert: '\\lambda', title: 'lambda' },
        { label: 'μ', insert: '\\mu', title: 'mu' },
        { label: 'π', insert: '\\pi', title: 'pi' },
        { label: 'σ', insert: '\\sigma', title: 'sigma' },
        { label: 'φ', insert: '\\phi', title: 'phi' },
        { label: 'ω', insert: '\\omega', title: 'omega' }
      ]
    },
    {
      label: 'Arrows',
      symbols: [
        { label: '←', insert: '\\leftarrow', title: 'left arrow' },
        { label: '→', insert: '\\rightarrow', title: 'right arrow' },
        { label: '↑', insert: '\\uparrow', title: 'up arrow' },
        { label: '↓', insert: '\\downarrow', title: 'down arrow' },
        { label: '↔', insert: '\\leftrightarrow', title: 'left-right arrow' },
        { label: '⇒', insert: '\\Rightarrow', title: 'double right arrow' },
        { label: '⇐', insert: '\\Leftarrow', title: 'double left arrow' },
        { label: '⇔', insert: '\\Leftrightarrow', title: 'double left-right arrow' }
      ]
    },
    {
      label: 'Math',
      symbols: [
        { label: '×', insert: '\\times', title: 'times' },
        { label: '÷', insert: '\\div', title: 'divide' },
        { label: '±', insert: '\\pm', title: 'plus minus' },
        { label: '∞', insert: '\\infty', title: 'infinity' },
        { label: '∑', insert: '\\sum', title: 'sum' },
        { label: '∏', insert: '\\prod', title: 'product' },
        { label: '∫', insert: '\\int', title: 'integral' },
        { label: '∂', insert: '\\partial', title: 'partial' }
      ]
    },
    {
      label: 'Logic',
      symbols: [
        { label: '∀', insert: '\\forall', title: 'for all' },
        { label: '∃', insert: '\\exists', title: 'exists' },
        { label: '∈', insert: '\\in', title: 'belongs to' },
        { label: '∉', insert: '\\notin', title: 'not belongs to' },
        { label: '∪', insert: '\\cup', title: 'union' },
        { label: '∩', insert: '\\cap', title: 'intersection' }
      ]
    }
  ];
  readonly arrowTipOptions: readonly ArrowTipOption[] = [
    { id: 'latex', title: 'Latex' },
    { id: 'triangle', title: 'Triangle' },
    { id: 'stealth', title: 'Stealth' },
    { id: 'diamond', title: 'Diamond' },
    { id: 'circle', title: 'Circle' },
    { id: 'bar', title: 'Bar' },
    { id: 'hooks', title: 'Hooks' },
    { id: 'bracket', title: 'Bracket' }
  ];
  readonly templateIconOptions = [
    'pencil',
    'arrow',
    'segment',
    'rectangle',
    'circle',
    'ellipse',
    'text',
    'note',
    'document',
    'card',
    'image',
    'triangle',
    'decision',
    'database',
    'bars',
    'browser',
    'pipeline',
    'hub',
    'library'
  ] as const;

  readonly zoomPercent = computed(() => Math.round((this.preferences().scale / this.defaultScale) * 100));
  readonly allInsertablePresets = computed<readonly ObjectPreset[]>(() => [
    ...this.savedTemplates().map((template) => this.savedTemplateToPreset(template)),
    ...this.objectPresets
  ]);
  readonly selectionLabel = computed(() => {
    if (this.selectionCount() === 0) {
      return this.t('noneSelected');
    }
    if (this.selectionCount() === 1) {
      return this.selectedShape()?.name ?? this.t('noneSelected');
    }
    return `${this.selectionCount()} ${this.t('objects').toLowerCase()}`;
  });
  readonly selectionModifierPressed = computed(
    () => this.shiftPressed() || this.controlPressed() || this.metaPressed()
  );
  readonly selectedTable = computed<TableSelectionInfo | null>(() => getTableSelectionInfo(this.selectedShapes()));
  readonly multiEditSelection = computed<HomogeneousSelectionInfo | null>(() => {
    if (this.selectionCount() < 2 || this.selectedTable()) {
      return null;
    }

    const shapes = this.selectedShapes();
    const firstShape = shapes[0];
    if (!firstShape || shapes.some((shape) => shape.kind !== firstShape.kind)) {
      return null;
    }

    return {
      kind: firstShape.kind,
      shapes
    };
  });
  readonly multiEditShape = computed<CanvasShape | null>(() => this.multiEditSelection()?.shapes[0] ?? null);
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
  readonly canUngroupSelection = computed(
    () => this.selectedMergeIds().length > 0 || this.selectedShapes().some((shape) => !!shape.table)
  );
  readonly activePreset = computed(
    () => this.allInsertablePresets().find((preset) => preset.id === this.activeTool()) ?? null
  );
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
  readonly minimapFrame = computed(() => {
    const aspectRatio = this.canvasWidth() / Math.max(this.canvasHeight(), 1);
    const width = Math.min(240, Math.max(132, Math.round(this.canvasWidth() * 0.12)));
    const height = Math.min(180, Math.max(96, Math.round(width / Math.max(aspectRatio, 0.35))));
    return { width, height };
  });
  readonly minimapOverview = computed<MinimapOverview | null>(() => {
    const sceneBounds = this.sceneContentBounds();
    if (!sceneBounds) {
      return null;
    }

    const visibleBounds = this.visibleWorldBounds();
    const padding = 1.5;
    const left = Math.min(sceneBounds.left, visibleBounds.left) - padding;
    const right = Math.max(sceneBounds.right, visibleBounds.right) + padding;
    const bottom = Math.min(sceneBounds.bottom, visibleBounds.bottom) - padding;
    const top = Math.max(sceneBounds.top, visibleBounds.top) + padding;
    const width = Math.max(right - left, 1);
    const height = Math.max(top - bottom, 1);
    const frame = this.minimapFrame();
    const scaleX = frame.width / width;
    const scaleY = frame.height / height;
    const scale = Math.min(scaleX, scaleY);
    const contentWidth = width * scale;
    const contentHeight = height * scale;
    const offsetX = (frame.width - contentWidth) / 2;
    const offsetY = (frame.height - contentHeight) / 2;
    const toMapX = (x: number): number => offsetX + (x - left) * scale;
    const toMapY = (y: number): number => offsetY + (top - y) * scale;
    const toMapRect = (bounds: SelectionBounds): MinimapRect => ({
      x: toMapX(bounds.left),
      y: toMapY(bounds.top),
      width: Math.max((bounds.right - bounds.left) * scale, 1.6),
      height: Math.max((bounds.top - bounds.bottom) * scale, 1.6)
    });

    return {
      viewBoxWidth: frame.width,
      viewBoxHeight: frame.height,
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
    if (this.mobileLayout() || this.sidebarsOverlayLayout()) {
      return false;
    }
    const sceneBounds = this.sceneContentBounds();
    if (!sceneBounds) {
      return false;
    }
    const visibleBounds = this.visibleWorldBounds();
    const sceneFitsInView =
      sceneBounds.left >= visibleBounds.left &&
      sceneBounds.right <= visibleBounds.right &&
      sceneBounds.bottom >= visibleBounds.bottom &&
      sceneBounds.top <= visibleBounds.top;
    return !sceneFitsInView || this.preferences().scale > this.defaultScale + 8;
  });
  readonly effectiveLeftSidebarWidth = computed(() => this.desktopSidebarWidth('left'));
  readonly effectiveRightSidebarWidth = computed(() => this.desktopSidebarWidth('right'));
  readonly effectiveMobileRightSidebarHeight = computed(() => this.rightSidebarHeight());
  readonly effectiveMobileLeftSidebarHeight = computed(() => this.leftSidebarHeight());
  readonly leftSidebarMinWidth = computed(() => this.desktopSidebarMinWidth('left'));
  readonly rightSidebarMinWidth = computed(() => this.desktopSidebarMinWidth('right'));
  readonly mobileRightSidebarMinHeight = computed(() => this.rightSidebarMinHeightValue());
  readonly mobileLeftSidebarMinHeight = computed(() => this.leftSidebarMinHeightValue());
  readonly inlineTextEditorLayout = computed(() => {
    const editor = this.inlineTextEditor();
    if (!editor) {
      return null;
    }

    const shape = this.scene().shapes.find((entry) => entry.id === editor.shapeId);
    if (shape?.kind !== 'text') {
      return null;
    }

    const metrics = EditorPageComponent.inlineTextEditorMetrics;
    const fontSize = Math.max(shape.fontSize * this.preferences().scale, metrics.minFontSize);
    const lines = this.displayTextLinesForShape({ ...shape, text: editor.value });
    const paddingX = Math.max(metrics.minPaddingX, fontSize * 0.08);
    const paddingY = Math.max(metrics.minPaddingY, fontSize * 0.08);
    const width = shape.textBox
      ? Math.max(shape.boxWidth * this.preferences().scale, metrics.minBoxWidth)
      : Math.max(
          ...lines.map((line) =>
            Math.max(
              line.length * fontSize * metrics.characterWidthFactor,
              fontSize * metrics.minLineWidthFactor,
              metrics.minLineWidth
            )
          )
        );
    const height = Math.max(lines.length * fontSize * metrics.lineHeightFactor + paddingY * 2, fontSize + paddingY * 2);
    const anchorX = this.toSvgX(shape.x);
    const left = textLeftForWidth(shape, anchorX, width);
    return {
      x: left - paddingX,
      y: this.toSvgY(shape.y) - height / 2,
      width: width + paddingX * 2,
      height,
      fontSize,
      textAlign: shape.textAlign,
      fontWeight: shape.fontWeight,
      fontStyle: shape.fontStyle
    };
  });
  readonly defaultToolbarTools = computed<readonly ToolDescriptor[]>(() => [
    {
      id: 'select',
      label: this.t('selection'),
      description: this.t('selection'),
      iconPath: getIconPath('select'),
      shortcut: 'V'
    },
    {
      id: 'pencil',
      label: this.t('freeDraw'),
      description: this.t('freeDraw'),
      iconPath: getIconPath('pencil'),
      shortcut: 'P'
    },
    ...this.allInsertablePresets()
      .filter((preset) => preset.quickAccess && preset.id !== 'note')
      .map((preset) => ({
        id: preset.id,
        label: this.presetTitle(preset),
        description: this.presetDescription(preset),
        iconPath: getIconPath(preset.icon),
        shortcut: this.toolShortcut(preset.id)
      }))
  ]);
  readonly pinnedToolbarTools = computed<readonly ToolDescriptor[]>(() =>
    this.pinnedToolIds()
      .map((id) => this.allInsertablePresets().find((preset) => preset.id === id))
      .filter((preset): preset is ObjectPreset => !!preset)
      .map((preset) => ({
        id: preset.id,
        label: this.presetTitle(preset),
        description: this.presetDescription(preset),
        iconPath: getIconPath(preset.icon),
        shortcut: this.toolShortcut(preset.id)
      }))
  );
  readonly librarySections = computed<readonly LibrarySection[]>(() => {
    const query = this.libraryQuery().trim().toLowerCase();
    return categoryOrder
      .map((category) => {
        const presets = this.objectPresets.filter((preset) => {
          if (preset.category !== category) {
            return false;
          }
          if (!query) {
            return true;
          }
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
      if (!query) {
        return true;
      }
      return [template.title, template.description].join(' ').toLowerCase().includes(query);
    });
  });
  readonly selectionBounds = computed<SelectionBounds | null>(() => this.computeBounds(this.selectedShapes()));
  readonly selectionHandles = computed<readonly HandleDescriptor[]>(() => {
    const selectedShapes = this.selectedShapes();
    const singleSelectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null;
    if (!selectedShapes.length) {
      return [];
    }
    const selectionBounds = this.selectionBounds();
    const rotateHandle =
      selectionBounds && this.selectionCanRotate(selectedShapes)
        ? this.rotationHandleFromBounds(selectionBounds)
        : null;
    if (singleSelectedShape?.kind === 'line') {
      const points = this.linePoints(singleSelectedShape);
      const fromAdjacentPoint = points[1] ?? singleSelectedShape.to;
      const toAdjacentPoint = points.at(-2) ?? singleSelectedShape.from;
      const lineHandles: HandleDescriptor[] = [
        this.lineEndpointHandle(singleSelectedShape, 'from', fromAdjacentPoint),
        ...this.lineArrowControlHandles(singleSelectedShape, 'from', fromAdjacentPoint),
        ...singleSelectedShape.anchors.map((anchor, index) => ({
          id: `anchor-${index}` as const,
          x: this.toSvgX(anchor.x),
          y: this.toSvgY(anchor.y),
          cursor: 'grab',
          variant: 'anchor' as const
        })),
        ...points.slice(0, -1).map((point, index) => {
          const nextPoint = points[index + 1];
          return {
            id: `insert-anchor-${index}` as const,
            x: this.toSvgX((point.x + nextPoint.x) / 2),
            y: this.toSvgY((point.y + nextPoint.y) / 2),
            cursor: 'copy',
            variant: 'ghost-anchor' as const
          };
        }),
        ...this.lineArrowControlHandles(singleSelectedShape, 'to', toAdjacentPoint),
        this.lineEndpointHandle(singleSelectedShape, 'to', toAdjacentPoint)
      ];
      return lineHandles;
    }
    if (!selectionBounds) {
      return [];
    }
    const rotatedSingleShapeHandles = singleSelectedShape ? this.rotatedSingleShapeHandles(singleSelectedShape) : null;
    if (rotatedSingleShapeHandles) {
      const handles: HandleDescriptor[] = [...rotatedSingleShapeHandles];
      if (this.selectionCanRotate(selectedShapes)) {
        handles.push(this.rotationHandleFromHandles(rotatedSingleShapeHandles, singleSelectedShape as CanvasShape));
      }
      if (singleSelectedShape?.kind === 'rectangle' || singleSelectedShape?.kind === 'triangle') {
        handles.push(...this.cornerRadiusHandles(singleSelectedShape));
      }
      return handles;
    }
    const centerX = (selectionBounds.left + selectionBounds.right) / 2;
    const centerY = (selectionBounds.top + selectionBounds.bottom) / 2;
    const handles: HandleDescriptor[] = [
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
    if (rotateHandle) {
      handles.push(rotateHandle);
    }
    if (singleSelectedShape?.kind === 'rectangle' || singleSelectedShape?.kind === 'triangle') {
      handles.push(...this.cornerRadiusHandles(singleSelectedShape));
    }
    return handles;
  });
  readonly selectionRotateGuide = computed<{
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  } | null>(() => {
    if (this.selectionCount() === 0) {
      return null;
    }
    const handles = this.selectionHandles();
    const rotateHandle = handles.find((handle) => handle.variant === 'rotate');
    const northHandle = handles.find((handle) => handle.id === 'n');
    if (!rotateHandle || !northHandle) {
      return null;
    }
    return {
      x1: northHandle.x,
      y1: northHandle.y,
      x2: rotateHandle.x,
      y2: rotateHandle.y
    };
  });
  readonly marqueeBounds = computed(() => {
    const interactionState = this.interactionState();
    if (!interactionState || interactionState.kind !== 'marquee') {
      return null;
    }
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
      if (interactionState?.kind === 'freehand') {
        const line = this.buildFreehandLine(interactionState.points, 'preview-freehand');
        return line ? [line] : [];
      }
      return [];
    }

    return this.buildInsertionPreviewShapes(
      interactionState.toolId,
      interactionState.startWorldPoint,
      interactionState.currentWorldPoint
    );
  });
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
  readonly highlightedExportImports = computed(() => highlightLatex(this.displayedExportImports()));
  readonly highlightedExportCode = computed(() => highlightLatex(this.displayedExportCode()));
  readonly highlightedGeneratedImports = computed(() => highlightLatex(this.snippetExport().imports));
  readonly highlightedGeneratedCode = computed(() => highlightLatex(this.snippetExport().code));
  readonly highlightedCodeThemePreview = computed(() =>
    highlightLatex('\\begin{tikzpicture}\n\\draw (0,0) -- (1.6,0.8);\n\\end{tikzpicture}')
  );
  readonly selectionHandleSize = computed(() =>
    this.coarsePointer()
      ? EditorPageComponent.selectionHandleSizeByPointer.coarse
      : EditorPageComponent.selectionHandleSizeByPointer.fine
  );
  readonly interactionCursor = computed<string | null>(() => {
    const interactionState = this.interactionState();
    if (!interactionState) {
      return null;
    }

    switch (interactionState.kind) {
      case 'resize':
        return interactionState.cursor;
      case 'rotate':
      case 'move':
      case 'pan':
      case 'pending-pan':
        return 'grabbing';
      case 'insert':
        return 'crosshair';
      default:
        return null;
    }
  });
  readonly shareUrl = signal('');
  readonly sceneReplaceDialog = signal<SceneReplaceDialogState | null>(null);
  private shareUrlRequestId = 0;
  private themeToggleCooldownHandle: ReturnType<typeof setTimeout> | null = null;
  private themeToggleLocked = false;
  private contextMenuPositionRafHandle: number | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.themeToggleCooldownHandle !== null) {
        clearTimeout(this.themeToggleCooldownHandle);
      }
      if (this.contextMenuPositionRafHandle !== null && this.document.defaultView) {
        this.document.defaultView.cancelAnimationFrame(this.contextMenuPositionRafHandle);
      }
    });

    effect(() => {
      const menu = this.contextMenu();
      if (!menu) {
        this.contextMenuPosition.set(null);
        return;
      }
      this.contextMenuPosition.set({ left: menu.clientX, top: menu.clientY });
      this.scheduleContextMenuReposition();
    });

    afterNextRender(() => {
      const viewport = this.canvasViewport().nativeElement;
      const mobileLayoutQuery =
        this.document.defaultView?.matchMedia?.(`(max-width: ${EDITOR_MOBILE_BREAKPOINT_PX}px)`) ?? null;
      const sidebarsOverlayLayoutQuery =
        this.document.defaultView?.matchMedia?.(`(max-width: ${EDITOR_SIDEBAR_OVERLAY_BREAKPOINT_PX}px)`) ?? null;
      const updateCanvasSize = () => {
        this.canvasViewportWidth.set(Math.round(viewport.clientWidth));
        this.canvasWidth.set(Math.max(EDITOR_CANVAS_MIN_WIDTH, Math.round(viewport.clientWidth)));
        this.canvasHeight.set(Math.max(EDITOR_CANVAS_MIN_HEIGHT, Math.round(viewport.clientHeight)));
      };

      const resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
      });
      const coarsePointerQuery = this.document.defaultView?.matchMedia?.('(pointer: coarse)') ?? null;
      const updateCoarsePointer = () => {
        this.coarsePointer.set(
          coarsePointerQuery?.matches ?? (this.document.defaultView?.navigator.maxTouchPoints ?? 0) > 0
        );
      };
      const updateMobileLayout = () => {
        const isMobile =
          mobileLayoutQuery?.matches ??
          (this.document.defaultView?.innerWidth ?? EDITOR_VIEWPORT_FALLBACK_WIDTH) <= EDITOR_MOBILE_BREAKPOINT_PX;
        this.mobileLayout.set(isMobile);
      };
      const updateSidebarsOverlayLayout = () => {
        const useOverlayLayout =
          sidebarsOverlayLayoutQuery?.matches ??
          (this.document.defaultView?.innerWidth ?? EDITOR_VIEWPORT_FALLBACK_WIDTH) <=
            EDITOR_SIDEBAR_OVERLAY_BREAKPOINT_PX;
        this.sidebarsOverlayLayout.set(useOverlayLayout);
        if (!useOverlayLayout) {
          this.mobileLibraryPanelOpen.set(false);
        }
      };
      updateCoarsePointer();
      updateMobileLayout();
      updateSidebarsOverlayLayout();
      coarsePointerQuery?.addEventListener?.('change', updateCoarsePointer);
      mobileLayoutQuery?.addEventListener?.('change', updateMobileLayout);
      sidebarsOverlayLayoutQuery?.addEventListener?.('change', updateSidebarsOverlayLayout);
      resizeObserver.observe(viewport);
      updateCanvasSize();
      this.restoreSavedTemplates();
      this.restorePinnedTools();
      this.pinnedToolsReady.set(true);
      this.runAsync(this.restoreSharedSceneFromUrl());
      const handleStorage = (event: StorageEvent) => {
        if (event.key === this.languageStorageKey && event.newValue) {
          if (event.newValue === 'ca' || event.newValue === 'es' || event.newValue === 'en') {
            this.language.set(event.newValue);
          }
          return;
        }

        if (event.key === this.editorStateStorageKey && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue) as Partial<PersistedEditorState>;
            const nextTheme = parsed.preferences?.theme;
            if (nextTheme === 'light' || nextTheme === 'dark') {
              this.store.setTheme(nextTheme);
            }
          } catch {
            return;
          }
        }

        if (event.key === this.codeThemeStorageKey && event.newValue) {
          this.setCodeHighlightTheme(event.newValue);
          return;
        }

        if (event.key === this.latexExportConfigStorageKey) {
          this.latexExportConfig.set(this.parseStoredLatexExportConfig(event.newValue));
          return;
        }

        if (event.key === this.sidebarSizesStorageKey) {
          const sidebarSizes = this.parseStoredSidebarSizes(event.newValue);
          this.leftSidebarWidth.set(sidebarSizes.left);
          this.rightSidebarWidth.set(sidebarSizes.right);
        }
      };

      this.document.defaultView?.addEventListener('storage', handleStorage);
      this.destroyRef.onDestroy(() => this.document.defaultView?.removeEventListener('storage', handleStorage));
      this.destroyRef.onDestroy(() => coarsePointerQuery?.removeEventListener?.('change', updateCoarsePointer));
      this.destroyRef.onDestroy(() => mobileLayoutQuery?.removeEventListener?.('change', updateMobileLayout));
      this.destroyRef.onDestroy(() =>
        sidebarsOverlayLayoutQuery?.removeEventListener?.('change', updateSidebarsOverlayLayout)
      );
      this.destroyRef.onDestroy(() => resizeObserver.disconnect());
    });

    effect(() => {
      this.scene();
      this.preferences();
      this.viewportCenter();
      this.store.importCode();
      this.latexExportConfig();
      this.runAsync(this.refreshShareUrl());
    });

    effect(() => {
      this.document.defaultView?.localStorage?.setItem(this.codeThemeStorageKey, this.codeHighlightTheme());
    });
    effect(() => {
      this.document.defaultView?.localStorage?.setItem(
        this.latexExportConfigStorageKey,
        JSON.stringify(this.serializableLatexExportConfig(this.latexExportConfig()))
      );
    });
    effect(() => {
      this.document.defaultView?.localStorage?.setItem(
        this.sidebarSizesStorageKey,
        JSON.stringify({
          left: this.leftSidebarWidth(),
          right: this.rightSidebarWidth()
        })
      );
    });
    effect(() => {
      if (!this.pinnedToolsReady()) {
        return;
      }
      this.document.defaultView?.localStorage?.setItem(
        this.pinnedToolsStorageKey,
        JSON.stringify(this.pinnedToolIds())
      );
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

  canPinPreset(preset: ObjectPreset): boolean {
    return !preset.quickAccess || this.savedTemplates().some((template) => template.id === preset.id);
  }

  isToolPinned(toolId: string): boolean {
    return this.pinnedToolIds().includes(toolId);
  }

  togglePinnedTool(toolId: string, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    const willPin = !this.pinnedToolIds().includes(toolId);
    this.pinnedToolIds.update((ids) => (ids.includes(toolId) ? ids.filter((id) => id !== toolId) : [...ids, toolId]));
    let hasTemplateUpdate = false;
    this.savedTemplates.update((templates) =>
      templates.map((template) => {
        if (template.id !== toolId) {
          return template;
        }
        hasTemplateUpdate = true;
        return { ...template, pinned: willPin };
      })
    );
    if (hasTemplateUpdate) {
      this.persistSavedTemplates();
    }
  }

  scenePresetTitle(preset: ScenePreset): string {
    return this.tOrFallback(`scenePreset.${preset.id}.title`, preset.title);
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
      case 'pencil':
        return 'P';
      case 'note':
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

  toggleSidebarCollapsed(side: SidebarSide): void {
    if (side === 'left') {
      this.leftSidebarCollapsed.update((collapsed) => !collapsed);
      this.sidebarResizeState.set(null);
      return;
    }

    this.rightSidebarCollapsed.update((collapsed) => !collapsed);
    this.sidebarResizeState.set(null);
  }

  startSidebarResize(event: PointerEvent, side: SidebarSide): void {
    if ((side === 'left' && this.leftSidebarCollapsed()) || (side === 'right' && this.rightSidebarCollapsed())) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const stackedLayout = this.sidebarsOverlayLayout();
    const axis = stackedLayout ? 'y' : 'x';
    this.sidebarResizeState.set({
      side,
      axis,
      startPointer: axis === 'y' ? event.clientY : event.clientX,
      startSize: this.sidebarResizeStartSize(side, stackedLayout)
    });
  }

  private sidebarResizeStartSize(side: SidebarSide, stackedLayout: boolean): number {
    if (stackedLayout) {
      return side === 'left' ? this.mobileLeftSidebarHeight() : this.mobileRightSidebarHeight();
    }

    return side === 'left' ? this.leftSidebarWidth() : this.rightSidebarWidth();
  }

  private desktopSidebarWidth(side: SidebarSide): number {
    if (side === 'left') {
      if (this.leftSidebarCollapsed()) {
        return EditorPageComponent.collapsedSidebarSize.desktopWidth;
      }
      return this.leftSidebarWidth();
    }

    if (this.rightSidebarCollapsed()) {
      return EditorPageComponent.collapsedSidebarSize.desktopWidth;
    }

    return this.rightSidebarWidth();
  }

  private desktopSidebarMinWidth(side: SidebarSide): number {
    if (side === 'left') {
      if (this.leftSidebarCollapsed()) {
        return EditorPageComponent.collapsedSidebarSize.desktopWidth;
      }
      return EDITOR_LEFT_SIDEBAR_MIN_WIDTH;
    }

    if (this.rightSidebarCollapsed()) {
      return EditorPageComponent.collapsedSidebarSize.desktopWidth;
    }

    return EDITOR_RIGHT_SIDEBAR_MIN_WIDTH;
  }

  private rightSidebarHeight(): number {
    if (!this.rightSidebarCollapsed()) {
      return this.mobileRightSidebarHeight();
    }

    if (this.sidebarsOverlayLayout()) {
      return 0;
    }

    return EditorPageComponent.collapsedSidebarSize.mobileHeight;
  }

  private leftSidebarHeight(): number {
    if (this.leftSidebarCollapsed()) {
      return EditorPageComponent.collapsedSidebarSize.mobileHeight;
    }

    return this.mobileLeftSidebarHeight();
  }

  private rightSidebarMinHeightValue(): number {
    if (this.rightSidebarCollapsed()) {
      if (this.sidebarsOverlayLayout()) {
        return 0;
      }
      return EditorPageComponent.collapsedSidebarSize.mobileHeight;
    }

    if (this.mobileLayout()) {
      return EDITOR_RIGHT_SIDEBAR_MOBILE_MIN_HEIGHT;
    }

    return EDITOR_RIGHT_SIDEBAR_DESKTOP_STACKED_MIN_HEIGHT;
  }

  private leftSidebarMinHeightValue(): number {
    if (this.leftSidebarCollapsed()) {
      return EditorPageComponent.collapsedSidebarSize.mobileHeight;
    }

    return EDITOR_LEFT_SIDEBAR_MOBILE_MIN_HEIGHT;
  }

  private clampSidebarSize(side: SidebarResizeTarget, value: number): number {
    const limits = EditorPageComponent.sidebarResizeLimits;
    switch (side) {
      case 'mobile-left':
      case 'mobile-right':
        return Math.min(limits.mobileMaxHeight, Math.max(limits.mobileMinHeight, value));
      case 'left':
        return Math.min(limits.leftMaxWidth, Math.max(limits.leftMinWidth, value));
      case 'right':
        return Math.min(limits.rightMaxWidth, Math.max(limits.rightMinWidth, value));
    }
  }

  setTheme(theme: ThemeMode): void {
    if (this.themeToggleLocked || this.preferences().theme === theme) {
      return;
    }

    this.themeToggleLocked = true;
    this.store.setTheme(theme);
    if (this.themeToggleCooldownHandle !== null) {
      clearTimeout(this.themeToggleCooldownHandle);
    }
    this.themeToggleCooldownHandle = setTimeout(() => {
      this.themeToggleLocked = false;
      this.themeToggleCooldownHandle = null;
    }, EditorPageComponent.themeToggleCooldownMs);
  }

  toggleTheme(): void {
    this.setTheme(this.preferences().theme === 'dark' ? 'light' : 'dark');
  }

  toggleFileMenu(): void {
    this.fileMenuOpen.update((isOpen) => {
      const nextOpen = !isOpen;
      if (nextOpen) {
        this.mobileLibraryPanelOpen.set(false);
      }
      return nextOpen;
    });
  }

  closeFileMenu(): void {
    this.fileMenuOpen.set(false);
    this.textSymbolPaletteOpen.set(false);
  }

  openMobileLibraryPanel(): void {
    if (!this.sidebarsOverlayLayout()) {
      return;
    }

    this.leftSidebarCollapsed.set(false);
    this.mobileLibraryPanelOpen.set(true);
  }

  closeMobileLibraryPanel(): void {
    this.mobileLibraryPanelOpen.set(false);
  }

  private closeMobileLibraryPanelIfNeeded(): void {
    if (this.sidebarsOverlayLayout()) {
      this.mobileLibraryPanelOpen.set(false);
    }
  }

  openExportModal(mode: ExportMode = 'snippet'): void {
    this.closeFileMenu();
    this.exportMode.set(mode);
    this.exportModalOpen.set(true);
    this.shareFeedback.set('');
    this.shareFeedbackTone.set('info');
  }

  openImportModal(): void {
    this.closeFileMenu();
    this.importModalOpen.set(true);
  }

  closeImportModal(): void {
    this.importModalOpen.set(false);
  }

  closeExportModal(): void {
    this.exportModalOpen.set(false);
    this.exportSettingsModalOpen.set(false);
    this.shareFeedback.set('');
    this.shareFeedbackTone.set('info');
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

  updateLatexExportText(key: LatexExportTextKey, event: Event): void {
    this.patchLatexExportConfig({
      [key]: (event.target as HTMLInputElement | HTMLSelectElement).value
    } as Partial<LatexExportConfig>);
  }

  updateLatexExportNumber(key: LatexExportNumberKey, event: Event, min: number, max: number): void {
    const input = event.target as HTMLInputElement;
    const value = Number.parseFloat(input.value);
    if (!Number.isFinite(value)) {
      return;
    }
    this.patchLatexExportConfig({
      [key]: Math.min(max, Math.max(min, value))
    } as Partial<LatexExportConfig>);
  }

  updateLatexExportBoolean(key: LatexExportBooleanKey, event: Event): void {
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

  openSceneLayers(): void {
    this.rightSidebarCollapsed.set(false);
    this.inspectorTab.set('scene');
    this.collapsedSections.update((sections) => ({
      ...sections,
      layers: false
    }));
    afterNextRender(() => {
      const scrollIntoLayers = () => {
        const sidebarScroll = this.rightSidebar()?.sidebarScroll()?.nativeElement;
        const layersSection = this.layersSection()?.nativeElement;
        if (sidebarScroll && layersSection) {
          const top = Math.max(layersSection.offsetTop - 12, 0);
          sidebarScroll.scrollTo({ top, behavior: 'smooth' });
          return;
        }
        layersSection?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      };
      requestAnimationFrame(() => requestAnimationFrame(scrollIntoLayers));
    });
  }

  setLibraryQuery(value: string): void {
    this.libraryQuery.set(value);
  }

  setActiveTool(toolId: ToolId): void {
    if (toolId === 'table') {
      this.openTableDialog({
        mode: 'create',
        submitMode: this.activeTool() === 'table' ? 'center-insert' : 'arm-insert',
        ...this.tablePresetDimensions()
      });
      this.closeContextMenu();
      this.closeFileMenu();
      this.closeMobileLibraryPanelIfNeeded();
      return;
    }

    if (toolId !== 'select' && toolId !== 'pencil' && this.activeTool() === toolId) {
      this.runSceneMutation(() => {
        this.insertPresetAt(toolId, this.snapScenePoint(this.viewportCenter()));
        this.activeTool.set('select');
        this.inspectorTab.set('properties');
      });
      this.closeMobileLibraryPanelIfNeeded();
      return;
    }

    this.activeTool.set(toolId);
    this.closeContextMenu();
    this.closeFileMenu();
    this.closeMobileLibraryPanelIfNeeded();
  }

  openSelectedTableDialog(): void {
    const table = this.selectedTable();
    if (!table) {
      return;
    }

    this.openTableDialog({
      mode: 'edit',
      submitMode: 'replace-selection',
      rows: table.rows,
      columns: table.columns
    });
  }

  closeTableDialog(): void {
    this.tableDialogState.set(null);
  }

  confirmTableDialog(dimensions: TableDimensions): void {
    const dialogState = this.tableDialogState();
    if (!dialogState) {
      return;
    }

    const nextDimensions = normalizeTableDimensions(dimensions);
    this.tablePresetDimensions.set(nextDimensions);
    this.tableDialogState.set(null);

    if (dialogState.submitMode === 'replace-selection') {
      this.runSceneMutation(() => this.replaceSelectedTable(nextDimensions));
      return;
    }

    if (dialogState.submitMode === 'center-insert') {
      this.runSceneMutation(() => {
        this.insertPresetAt('table', this.snapScenePoint(this.viewportCenter()));
        this.activeTool.set('select');
        this.inspectorTab.set('properties');
      });
      return;
    }

    this.activeTool.set('table');
    this.inspectorTab.set('properties');
  }

  openSaveTemplateDialog(): void {
    if (this.selectionCount() === 0) {
      return;
    }

    this.templateDialogMode.set('create');
    this.editingTemplateId.set(null);
    this.templateTitleInput.set(this.selectionLabel());
    this.templateDescriptionInput.set('');
    this.templateIconInput.set(this.iconForShapes(this.selectedShapes()));
    this.templateUseCurrentSelection.set(true);
    this.templateDialogOpen.set(true);
  }

  openEditTemplateDialog(template: SavedTemplate): void {
    this.templateDialogMode.set('edit');
    this.editingTemplateId.set(template.id);
    this.templateTitleInput.set(template.title);
    this.templateDescriptionInput.set(template.description);
    this.templateIconInput.set(template.icon);
    this.templateUseCurrentSelection.set(false);
    this.templateDialogOpen.set(true);
  }

  closeTemplateDialog(): void {
    this.templateDialogOpen.set(false);
    this.editingTemplateId.set(null);
    this.templateIconInput.set('library');
  }

  updateTemplateDialogText(key: TemplateDialogTextKey, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (key === 'title') {
      this.templateTitleInput.set(value);
      return;
    }
    this.templateDescriptionInput.set(value);
  }

  setTemplateIcon(icon: string): void {
    this.templateIconInput.set(icon);
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
      icon: this.templateIconInput() || this.iconForShapes(sourceShapes),
      pinned: existing?.pinned ?? false,
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
    this.pinnedToolIds.update((ids) => ids.filter((id) => id !== template.id));
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
    this.closeMobileLibraryPanelIfNeeded();
    this.requestSceneReplacement(presetId);
  }

  private applyScenePresetConfirmed(presetId: string): void {
    this.runSceneMutation(() => {
      const preset = this.scenePresets.find((entry) => entry.id === presetId);
      if (preset) {
        this.store.applyScene(this.localizedScenePreset(preset.scene));
      } else {
        this.store.applyScenePreset(presetId);
      }
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
      if (preset) {
        this.store.applyScene(this.localizedScenePreset(preset.scene));
      } else {
        this.store.applyScenePreset('blank');
      }
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
    this.setScaleFromViewportCenter(this.preferences().scale + EDITOR_ZOOM_STEP);
  }

  zoomOut(): void {
    this.setScaleFromViewportCenter(this.preferences().scale - EDITOR_ZOOM_STEP);
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

  downloadCanvasSvg(): void {
    const exportDocument = this.buildCanvasExportDocument();
    const blob = new Blob([exportDocument.markup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.exportFileBaseName()}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.showExportNotification('svg');
  }

  async downloadCanvasPng(): Promise<void> {
    const exportDocument = this.buildCanvasExportDocument();
    const svgMarkup = exportDocument.markup;
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Unable to render canvas export.'));
        img.src = svgUrl;
      });

      const width = exportDocument.width;
      const height = exportDocument.height;
      const scale = EDITOR_PNG_EXPORT_SCALE;
      const canvas = this.document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      context.scale(scale, scale);
      context.drawImage(image, 0, 0, width, height);

      const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!pngBlob) {
        return;
      }

      const pngUrl = URL.createObjectURL(pngBlob);
      const anchor = this.document.createElement('a');
      anchor.href = pngUrl;
      anchor.download = `${this.exportFileBaseName()}.png`;
      anchor.click();
      URL.revokeObjectURL(pngUrl);
      this.showExportNotification('png');
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  copyExportedCode(): void {
    this.copyTextToClipboard(this.snippetExport().code);
  }

  copyStandaloneCode(): void {
    this.copyTextToClipboard(this.standaloneDocument());
  }

  copySnippetImports(): void {
    this.copyTextToClipboard(this.snippetExport().imports);
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
    const hasImages = this.scene().shapes.some((shape) => shape.kind === 'image');
    if (hasImages) {
      const warningMessage = this.t('shareLinkImagesWarning');
      this.showNotification(warningMessage, 'warning');
    } else {
      this.showNotification(this.t('shareLinkReady'));
    }
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
    this.focusCanvasViewport();

    if (this.consumeIgnoredShapeClick(shape.id)) {
      return;
    }

    const wasSingleSelected = this.selectionCount() === 1 && this.selectedShape()?.id === shape.id;

    if (this.handleShapeClickWhileToolInactive(event)) {
      return;
    }

    if (shape.kind === 'text' && event.detail >= 2) {
      event.preventDefault();
      this.startTextEditing(shape);
      return;
    }

    if (this.handleNonTextShapeClick(event, shape, wasSingleSelected)) {
      return;
    }

    this.closeInlineTextEditor();

    if (this.handleShapeClickWithSelectionModifier(event, shape)) {
      return;
    }

    if (!this.selectionContainsShape(shape.id)) {
      this.selectShapeSet(shape);
    }
    this.setInspectorTab('properties');
  }

  private consumeIgnoredShapeClick(shapeId: string): boolean {
    if (this.ignoreNextShapeClickId() !== shapeId) {
      return false;
    }
    this.ignoreNextShapeClickId.set(null);
    return true;
  }

  private handleShapeClickWhileToolInactive(event: MouseEvent): boolean {
    if (this.activeTool() === 'select') {
      return false;
    }

    this.recentSelectedShapeTap.set(null);
    this.closeInlineTextEditor();
    if (!this.canPreviewInsert(this.activeTool())) {
      this.addShapeAt(this.toScenePoint(event.clientX, event.clientY));
    }
    return true;
  }

  private handleNonTextShapeClick(event: MouseEvent, shape: CanvasShape, wasSingleSelected: boolean): boolean {
    if (shape.kind === 'text') {
      this.recentSelectedShapeTap.set(null);
      return false;
    }

    if (wasSingleSelected && event.detail >= 2) {
      event.preventDefault();
      const textShape = this.insertCenteredTextForSelectedShape(shape);
      if (textShape) {
        this.openInlineTextEditor(textShape);
      }
      this.recentSelectedShapeTap.set(null);
      return true;
    }

    if (event.detail === 1 && wasSingleSelected) {
      this.recentSelectedShapeTap.set({ shapeId: shape.id, timestamp: Date.now() });
    } else if (event.detail === 1) {
      this.recentSelectedShapeTap.set(null);
    }
    return false;
  }

  private handleShapeClickWithSelectionModifier(event: MouseEvent, shape: CanvasShape): boolean {
    if (!isSelectionModifierPressed(event)) {
      return false;
    }

    this.recentSelectedShapeTap.set(null);
    this.toggleShapeSetSelection(shape);
    this.setInspectorTab('properties');
    return true;
  }

  onShapeDoubleClick(event: MouseEvent, shape: CanvasShape): void {
    if (this.activeTool() !== 'select') {
      this.recentSelectedShapeTap.set(null);
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (shape.kind === 'text') {
      this.startTextEditing(shape);
    }
  }

  updateImportCode(value: string): void {
    this.store.updateImportCode(value);
  }

  applyImportCode(): void {
    this.runSceneMutation(() => {
      this.store.applyImportCode();
      this.viewportCenter.set({ x: 0, y: 0 });
      this.inspectorTab.set('scene');
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
  }

  async pasteClipboard(): Promise<void> {
    const imageFile = await this.readImageFileFromNavigatorClipboard();
    if (imageFile) {
      await this.insertImageFileAtPoint(imageFile, this.snapScenePoint(this.viewportCenter()));
      return;
    }

    this.pasteInternalClipboard();
  }

  private pasteInternalClipboard(): void {
    const clipboard = this.clipboardShapes();
    if (!clipboard?.shapes.length) {
      return;
    }

    const offsetStep = EDITOR_PASTE_OFFSET_STEP;
    const offset = offsetStep * (clipboard.pasteCount + 1);
    const pastedShapes = remapStructuralShapeIds(
      clipboard.shapes.map((shape) => {
        const duplicate = structuredClone(shape);
        return {
          ...translateShapeBy(duplicate, offset, -offset),
          id: crypto.randomUUID(),
          name: `${duplicate.name} copy`
        } as CanvasShape;
      })
    );

    this.runSceneMutation(() => this.store.addShapes(pastedShapes));
    this.clipboardShapes.set({
      shapes: clipboard.shapes,
      pasteCount: clipboard.pasteCount + 1
    });
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

  updatePreferenceNumber(key: PreferenceNumberKey, event: Event, minimumValue: number, maximumValue?: number): void {
    const rawValue = Number((event.target as HTMLInputElement).value);
    const clampedValue =
      maximumValue === undefined
        ? Math.max(minimumValue, rawValue)
        : Math.min(maximumValue, Math.max(minimumValue, rawValue));
    this.store.patchPreferences({ [key]: clampedValue } as Partial<EditorPreferences>);
  }

  updatePreferenceText(key: PreferenceTextKey, event: Event): void {
    this.store.patchPreferences({ [key]: (event.target as HTMLInputElement).value } as Partial<EditorPreferences>);
  }

  onBooleanPreferenceChange(key: PreferenceBooleanKey, event: Event): void {
    this.store.patchPreferences({ [key]: (event.target as HTMLInputElement).checked } as Partial<EditorPreferences>);
  }

  onSceneNameInputValue(value: string): void {
    this.store.renameScene(value);
  }

  setCodeHighlightTheme(theme: string): void {
    if (
      theme === 'aurora' ||
      theme === 'sunset' ||
      theme === 'midnight' ||
      theme === 'forest' ||
      theme === 'rose' ||
      theme === 'graphite'
    ) {
      this.codeHighlightTheme.set(theme);
    }
  }

  updateShapeText(key: ShapeTextKey, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.patchInspectorSelection((shape) => ({ ...shape, [key]: value }) as CanvasShape);
  }

  setTextStyle(
    key: TextStylePropertyKey,
    value: TextShape['fontWeight'] | TextShape['fontStyle'] | TextShape['textDecoration'] | TextShape['textAlign']
  ): void {
    this.patchInspectorSelection((shape) =>
      shape.kind === 'text' ? ({ ...shape, [key]: value } as CanvasShape) : shape
    );
  }

  setTextRotation(value: number): void {
    this.patchInspectorSelection((shape) =>
      shape.kind === 'text' ? ({ ...shape, rotation: value } as CanvasShape) : shape
    );
  }

  setShapeRotation(value: number): void {
    const rotation = this.normalizeRotationDegrees(value);
    this.patchInspectorSelection((shape) => {
      if (shape.kind === 'line' || shape.kind === 'circle') {
        return shape;
      }
      return { ...shape, rotation } as CanvasShape;
    });
  }

  toggleTextStyle(key: TextStyleKey): void {
    this.patchInspectorSelection((shape) => {
      if (shape.kind !== 'text') {
        return shape;
      }
      if (key === 'fontWeight') {
        return { ...shape, fontWeight: shape.fontWeight === 'bold' ? 'normal' : 'bold' } as CanvasShape;
      }
      if (key === 'fontStyle') {
        return { ...shape, fontStyle: shape.fontStyle === 'italic' ? 'normal' : 'italic' } as CanvasShape;
      }
      return { ...shape, textDecoration: shape.textDecoration === 'underline' ? 'none' : 'underline' } as CanvasShape;
    });
  }

  insertTextSymbol(symbol: string): void {
    this.closeTextSymbolPalette();
    const inlineInput = this.inlineTextInput()?.nativeElement;
    if (this.inlineTextEditor() && inlineInput) {
      this.insertTextAtCursor(inlineInput, symbol, (nextValue) => {
        this.inlineTextEditor.update((editor) => (editor ? { ...editor, value: nextValue } : null));
      });
      return;
    }

    const inspectorInput = this.inspectorTextInput()?.nativeElement;
    const selectedShape = this.selectedShape();
    if (!inspectorInput || !selectedShape || selectedShape.kind !== 'text') {
      return;
    }

    this.insertTextAtCursor(inspectorInput, symbol, (nextValue) => {
      this.store.patchSelectedShape((shape) =>
        shape.kind === 'text' ? ({ ...shape, text: nextValue } as CanvasShape) : shape
      );
    });
  }

  updateShapeOpacity(key: ShapeOpacityKey, event: Event): void {
    const value = Math.min(OPACITY_MAX, Math.max(OPACITY_MIN, Number((event.target as HTMLInputElement).value)));
    this.patchInspectorSelection((shape) => ({ ...shape, [key]: value }) as CanvasShape);
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
    if (shape?.kind !== 'text') {
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
    if (event.key === 'Enter' && !event.shiftKey) {
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

  toggleTextSymbolPalette(event?: Event): void {
    event?.stopPropagation();
    const trigger = event?.currentTarget as HTMLElement | null;
    if (trigger) {
      this.textSymbolPalettePosition.set(this.computeTextSymbolPalettePosition(trigger));
    }
    this.textSymbolPaletteOpen.update((isOpen) => !isOpen);
  }

  closeTextSymbolPalette(): void {
    this.textSymbolPaletteOpen.set(false);
  }

  private computeTextSymbolPalettePosition(trigger: HTMLElement): TextSymbolPalettePosition {
    const metrics = EditorPageComponent.textSymbolPopoverMetrics;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = this.document.defaultView?.innerWidth ?? metrics.viewportWidthFallback;
    const viewportHeight = this.document.defaultView?.innerHeight ?? metrics.viewportHeightFallback;
    const popoverWidth = Math.min(
      metrics.maxWidth,
      Math.max(viewportWidth - metrics.edgePadding * 2, metrics.minWidth)
    );
    const spaceBelow = viewportHeight - rect.bottom - metrics.edgePadding;
    const spaceAbove = rect.top - metrics.edgePadding;
    const maxHeight = Math.max(metrics.minHeight, Math.min(metrics.preferredHeight, Math.max(spaceBelow, spaceAbove)));
    const top = this.computeTextSymbolPaletteTop(rect, viewportHeight, maxHeight, spaceBelow, spaceAbove);
    const left = Math.max(
      metrics.edgePadding,
      Math.min(rect.right - popoverWidth, viewportWidth - popoverWidth - metrics.edgePadding)
    );

    return {
      top,
      left,
      maxHeight
    };
  }

  private computeTextSymbolPaletteTop(
    rect: DOMRect,
    viewportHeight: number,
    maxHeight: number,
    spaceBelow: number,
    spaceAbove: number
  ): number {
    const metrics = EditorPageComponent.textSymbolPopoverMetrics;
    const renderedHeight = Math.min(metrics.preferredHeight, maxHeight);
    const openUpward = spaceBelow < metrics.openUpwardThreshold && spaceAbove > spaceBelow;

    if (openUpward) {
      return Math.max(metrics.edgePadding, rect.top - renderedHeight - metrics.offset);
    }

    return Math.max(
      metrics.edgePadding,
      Math.min(rect.bottom + metrics.offset, viewportHeight - maxHeight - metrics.edgePadding)
    );
  }

  updateImageText(key: ImageTextKey, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.patchInspectorSelection((shape) =>
      shape.kind === 'image' ? ({ ...shape, [key]: value } as CanvasShape) : shape
    );
  }

  updateImageDimension(key: ImageDimensionKey, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    this.patchInspectorSelection((shape) => {
      if (shape.kind !== 'image') {
        return shape;
      }

      const aspectRatio = shape.aspectRatio || (shape.height !== 0 ? shape.width / shape.height : 1);
      return key === 'width'
        ? ({
            ...shape,
            width: value,
            height: Math.max(value / Math.max(aspectRatio, EDITOR_IMAGE_ASPECT_RATIO_EPSILON), MIN_SHAPE_DIMENSION)
          } as CanvasShape)
        : ({
            ...shape,
            height: value,
            width: Math.max(value * Math.max(aspectRatio, EDITOR_IMAGE_ASPECT_RATIO_EPSILON), MIN_SHAPE_DIMENSION)
          } as CanvasShape);
    });
  }

  async onImageFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const dataUrl = await this.readFileAsDataUrl(file);
    const dimensions = await this.loadImageDimensions(dataUrl);
    this.selectedImageFilename.set(file.name);

    this.patchInspectorSelection((shape) =>
      shape.kind === 'image'
        ? ({
            ...shape,
            src: dataUrl,
            ...(dimensions
              ? {
                  aspectRatio: dimensions.width / dimensions.height,
                  height: Math.max(
                    shape.width / Math.max(dimensions.width / dimensions.height, EDITOR_IMAGE_ASPECT_RATIO_EPSILON),
                    MIN_SHAPE_DIMENSION
                  )
                }
              : {}),
            latexSource: shape.latexSource || file.name
          } as CanvasShape)
        : shape
    );
    input.value = '';
  }

  setTextPresetSize(fontSize: number): void {
    this.patchInspectorSelection((shape) => (shape.kind === 'text' ? ({ ...shape, fontSize } as CanvasShape) : shape));
  }

  transformSelectedText(mode: TextTransformMode): void {
    this.patchInspectorSelection((shape) => {
      if (shape.kind !== 'text') {
        return shape;
      }
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
      | 'boxWidth'
      | 'fontSize'
      | 'rotation',
    event: Event
  ): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (key === 'rotation') {
      this.setShapeRotation(value);
      return;
    }
    this.patchInspectorSelection((shape) => ({ ...shape, [key]: value }) as CanvasShape);
  }

  updateTriangleApex(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) {
      return;
    }
    const apexOffset = Math.max(0, Math.min(1, value));
    this.patchInspectorSelection((shape) =>
      shape.kind === 'triangle' ? ({ ...shape, apexOffset } as CanvasShape) : shape
    );
  }

  updateShapeBoolean(key: LineBooleanKey, event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.patchInspectorSelection((shape) => ({ ...shape, [key]: value }) as CanvasShape);
  }

  updateLineArrowScale(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.patchInspectorSelection((shape) =>
      shape.kind === 'line'
        ? ({
            ...shape,
            arrowScale: Number.isFinite(value)
              ? Math.min(EDITOR_LINE_ARROW_SCALE_MAX, Math.max(EDITOR_LINE_ARROW_SCALE_MIN, value))
              : shape.arrowScale
          } as LineShape)
        : shape
    );
  }

  setLineArrowBendMode(value: string): void {
    this.patchInspectorSelection((shape) =>
      shape.kind === 'line' && (value === 'none' || value === 'flex' || value === 'flex-prime' || value === 'bend')
        ? ({ ...shape, arrowBendMode: value } as LineShape)
        : shape
    );
  }

  setLineArrowDirection(direction: ArrowDirection): void {
    this.patchInspectorSelection((shape) => {
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

  lineArrowDirection(shape: LineShape): ArrowDirection {
    if (shape.arrowStart && shape.arrowEnd) {
      return 'both';
    }
    if (shape.arrowStart) {
      return 'backward';
    }
    if (shape.arrowEnd) {
      return 'forward';
    }
    return 'none';
  }

  setLineArrowType(value: string): void {
    this.patchInspectorSelection((shape) =>
      shape.kind === 'line' ? ({ ...shape, arrowType: value as ArrowTipKind } as LineShape) : shape
    );
  }

  setLineMode(value: string): void {
    this.patchInspectorSelection((shape) =>
      shape.kind === 'line' && (value === 'straight' || value === 'curved')
        ? ({
            ...shape,
            lineMode: value,
            anchors:
              value === 'curved' && shape.anchors.length === 0
                ? [{ x: (shape.from.x + shape.to.x) / 2, y: (shape.from.y + shape.to.y) / 2 }]
                : shape.anchors
          } as LineShape)
        : shape
    );
  }

  setTextBoxEnabled(event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.patchInspectorSelection((shape) => {
      if (shape.kind !== 'text') {
        return shape;
      }

      if (shape.textBox === value) {
        return shape;
      }

      const alignedX = this.textBoxAnchorX(shape, value);

      return { ...shape, textBox: value, x: alignedX } as CanvasShape;
    });
  }

  private patchInspectorSelection(mutator: (shape: CanvasShape) => CanvasShape): void {
    if (this.selectionCount() > 1) {
      this.store.patchSelectedShapes(mutator);
      return;
    }

    this.store.patchSelectedShape(mutator);
  }

  private textBoxAnchorX(shape: TextCanvasShape, textBoxEnabled: boolean): number {
    if (shape.textAlign === 'left') {
      return shape.x;
    }

    const direction = textBoxEnabled ? -1 : 1;
    if (shape.textAlign === 'right') {
      return shape.x + shape.boxWidth * direction;
    }

    return shape.x + (shape.boxWidth / 2) * direction;
  }

  updateLinePoint(target: LineEndpoint, axis: Axis, event: Event): void {
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

  updateLineAnchorPoint(index: number, axis: Axis, event: Event): void {
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
      x: Number(((lastPoint.x + nextPoint.x) / 2).toFixed(EDITOR_LINE_ANCHOR_DECIMALS)),
      y: Number(((lastPoint.y + nextPoint.y) / 2).toFixed(EDITOR_LINE_ANCHOR_DECIMALS))
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

  sliderRange(axis: Axis): { readonly min: number; readonly max: number } {
    const bounds = this.sceneContentBounds();
    if (!bounds) {
      return EditorPageComponent.defaultSliderRange;
    }

    const maxAbs =
      axis === 'x'
        ? Math.max(Math.abs(bounds.left), Math.abs(bounds.right), 1)
        : Math.max(Math.abs(bounds.bottom), Math.abs(bounds.top), 1);

    return {
      min: Number((-maxAbs).toFixed(SLIDER_DECIMAL_PLACES)),
      max: Number(maxAbs.toFixed(SLIDER_DECIMAL_PLACES))
    };
  }

  opacityPercent(value: number): number {
    return Math.round(value * 100);
  }

  selectionContainsShape(shapeId: string): boolean {
    return selectionContainsShapeUtil(this.selectedShapes(), shapeId);
  }

  private selectShapeSet(shape: CanvasShape): void {
    const shapeIds = shapeSetIdsUtil(shape, this.scene().shapes);
    if (shapeIds.length > 1) {
      this.store.setSelectedShapes(shapeIds);
      return;
    }

    this.store.selectShape(shape.id);
  }

  private toggleShapeSetSelection(shape: CanvasShape): void {
    const groupedIds = shapeSetIdsUtil(shape, this.scene().shapes);
    if (groupedIds.length === 1) {
      this.store.toggleShapeInSelection(shape.id);
      return;
    }

    this.store.setSelectedShapes(
      toggledShapeSetSelection(
        this.selectedShapes().map((entry) => entry.id),
        groupedIds
      )
    );
  }

  openCanvasContextMenu(event: MouseEvent): void {
    if (this.consumeContextMenuSuppression()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

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
    if (this.consumeContextMenuSuppression()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

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
    this.contextMenuPosition.set(null);
    if (this.contextMenuPositionRafHandle !== null && this.document.defaultView) {
      this.document.defaultView.cancelAnimationFrame(this.contextMenuPositionRafHandle);
      this.contextMenuPositionRafHandle = null;
    }
  }

  private scheduleContextMenuReposition(): void {
    const view = this.document.defaultView;
    if (!view) {
      return;
    }
    if (this.contextMenuPositionRafHandle !== null) {
      view.cancelAnimationFrame(this.contextMenuPositionRafHandle);
    }
    this.contextMenuPositionRafHandle = view.requestAnimationFrame(() => {
      this.contextMenuPositionRafHandle = null;
      this.repositionContextMenu();
    });
  }

  private repositionContextMenu(): void {
    const menu = this.contextMenu();
    if (!menu) {
      return;
    }
    const panel = this.contextMenuPanel()?.nativeElement;
    if (!panel) {
      return;
    }
    const view = this.document.defaultView;
    if (!view) {
      return;
    }
    const padding = EditorPageComponent.contextMenuViewportPadding;
    const viewportWidth = view.innerWidth;
    const viewportHeight = view.innerHeight;
    const bounds = panel.getBoundingClientRect();
    const maxLeft = viewportWidth - bounds.width - padding;
    const maxTop = viewportHeight - bounds.height - padding;

    const left = Math.min(Math.max(menu.clientX, padding), Math.max(padding, maxLeft));
    const top = Math.min(Math.max(menu.clientY, padding), Math.max(padding, maxTop));
    this.contextMenuPosition.set({ left, top });
  }

  runContextAction(action: ContextAction): void {
    switch (action) {
      case 'copy':
        this.copySelected();
        break;
      case 'cut':
        this.cutSelected();
        break;
      case 'paste':
        this.runAsync(this.pasteClipboard());
        break;
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
      case 'png':
        this.runAsync(this.downloadCanvasPng());
        break;
    }
    this.closeContextMenu();
  }

  onCanvasViewportPointerDown(event: PointerEvent): void {
    if (this.pinchZoomState) {
      return;
    }
    this.focusCanvasViewport();
    this.closeContextMenu();
    this.closeFileMenu();
    const touchSelectPan = event.pointerType === 'touch' && this.activeTool() === 'select';

    if (event.button === 2) {
      event.preventDefault();
      this.interactionState.set({
        kind: 'pending-pan',
        pointerId: event.pointerId,
        startClientPoint: { x: event.clientX, y: event.clientY },
        lastClientPoint: { x: event.clientX, y: event.clientY },
        sourceButton: event.button
      });
      this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
      return;
    }

    if (event.button === 1 || (event.button === 0 && (this.spacePressed() || touchSelectPan))) {
      event.preventDefault();
      this.interactionState.set({
        kind: 'pan',
        pointerId: event.pointerId,
        lastClientPoint: { x: event.clientX, y: event.clientY },
        sourceButton: event.button
      });
      this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
      return;
    }

    if (event.button === 0 && this.activeTool() === 'pencil') {
      this.interactionState.set({
        kind: 'freehand',
        pointerId: event.pointerId,
        points: [this.toScenePoint(event.clientX, event.clientY)]
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
        additive: isSelectionModifierPressed(event)
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
    if (!this.canStartMove(event)) {
      this.recentSelectedShapeTap.set(null);
      return;
    }

    const plainPrimaryGesture = !isSelectionModifierPressed(event);
    const isSingleSelectedShape = this.selectionCount() === 1 && this.selectedShape()?.id === shape.id;

    if (shape.kind === 'text') {
      if (this.handleMoveStartForTextShape(event, shape)) {
        return;
      }
    } else {
      this.recentTextTap.set(null);
      this.recentSelectedShapeTap.set(null);
    }

    if (this.prepareMoveSelection(event, shape)) {
      return;
    }

    this.beginMoveInteraction(event, shape, plainPrimaryGesture, isSingleSelectedShape);
  }

  private canStartMove(event: PointerEvent): boolean {
    return this.activeTool() === 'select' && event.button === 0 && !this.spacePressed();
  }

  private handleMoveStartForTextShape(event: PointerEvent, shape: TextCanvasShape): boolean {
    this.recentSelectedShapeTap.set(null);
    if (event.detail >= 2 || this.isRepeatedTextTap(shape.id)) {
      event.preventDefault();
      event.stopPropagation();
      this.startTextEditing(shape);
      return true;
    }

    this.recentTextTap.set({ shapeId: shape.id, timestamp: Date.now() });
    if (!isSelectionModifierPressed(event) && !this.selectionContainsShape(shape.id)) {
      event.preventDefault();
      event.stopPropagation();
      this.selectShapeSet(shape);
      this.setInspectorTab('properties');
      this.ignoreNextCanvasClick.set(true);
      return true;
    }

    return false;
  }

  private prepareMoveSelection(event: PointerEvent, shape: CanvasShape): boolean {
    event.preventDefault();
    event.stopPropagation();

    if (isSelectionModifierPressed(event)) {
      this.toggleShapeSetSelection(shape);
      this.setInspectorTab('properties');
      this.ignoreNextShapeClickId.set(shape.id);
      return true;
    }

    if (!this.selectionContainsShape(shape.id)) {
      this.selectShapeSet(shape);
      if (event.pointerType === 'touch') {
        this.setInspectorTab('properties');
        this.ignoreNextCanvasClick.set(true);
        return true;
      }
    }

    this.setInspectorTab('properties');
    return false;
  }

  private beginMoveInteraction(
    event: PointerEvent,
    shape: CanvasShape,
    plainPrimaryGesture: boolean,
    isSingleSelectedShape: boolean
  ): void {
    this.store.recordHistoryCheckpoint();
    this.interactionState.set({
      kind: 'move',
      pointerId: event.pointerId,
      startClientPoint: { x: event.clientX, y: event.clientY },
      startWorldPoint: this.toScenePoint(event.clientX, event.clientY),
      initialShapes: structuredClone(this.selectedShapes()),
      tapEligibleShapeId: shape.kind !== 'text' && plainPrimaryGesture && isSingleSelectedShape ? shape.id : null
    });
    this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
  }

  startSelectionMove(event: PointerEvent): void {
    if (this.activeTool() !== 'select' || event.button !== 0 || this.spacePressed() || this.selectionCount() === 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.setInspectorTab('properties');
    this.store.recordHistoryCheckpoint();
    this.interactionState.set({
      kind: 'move',
      pointerId: event.pointerId,
      startClientPoint: { x: event.clientX, y: event.clientY },
      startWorldPoint: this.toScenePoint(event.clientX, event.clientY),
      initialShapes: structuredClone(this.selectedShapes()),
      tapEligibleShapeId: null
    });
    this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
  }

  startResize(event: PointerEvent, handle: ResizeHandle): void {
    const selectedShape = this.selectedShape();
    const selectedShapes = this.selectedShapes();
    const selectionBounds = this.selectionBounds();
    if ((!selectedShape && selectedShapes.length === 0) || this.activeTool() !== 'select' || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const pointerPoint = this.toScenePoint(event.clientX, event.clientY);

    if (handle === 'rotate') {
      if (!selectionBounds || !this.selectionCanRotate(selectedShapes)) {
        return;
      }
      const pivot = {
        x: (selectionBounds.left + selectionBounds.right) / 2,
        y: (selectionBounds.bottom + selectionBounds.top) / 2
      };
      this.store.recordHistoryCheckpoint();
      this.interactionState.set({
        kind: 'rotate',
        pointerId: event.pointerId,
        initialShapes: structuredClone(selectedShapes),
        pivot,
        startAngleRadians: Math.atan2(pointerPoint.y - pivot.y, pointerPoint.x - pivot.x)
      });
      this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
      return;
    }

    if (selectedShape?.kind === 'line' && handle.startsWith('insert-anchor-')) {
      const segmentIndex = Number(handle.slice('insert-anchor-'.length));
      const points = this.linePoints(selectedShape);
      const fromPoint = points[segmentIndex];
      const toPoint = points[segmentIndex + 1];
      if (!fromPoint || !toPoint) {
        return;
      }

      const anchor = this.toScenePoint(event.clientX, event.clientY);
      this.store.recordHistoryCheckpoint();
      this.store.patchSelectedShape((shape) => {
        if (shape.kind !== 'line') {
          return shape;
        }

        const anchorIndex = Math.max(Math.min(segmentIndex, shape.anchors.length), 0);
        const anchors = [...shape.anchors];
        anchors.splice(anchorIndex, 0, anchor);
        return { ...shape, anchors } as LineShape;
      });
      this.interactionState.set({
        kind: 'resize',
        pointerId: event.pointerId,
        handle: `anchor-${segmentIndex}` as ResizeHandle,
        cursor: 'grab',
        pointerOffset: { x: 0, y: 0 },
        initialShape: structuredClone(this.selectedShape() ?? selectedShape),
        initialShapes: structuredClone(this.selectedShapes()),
        initialBounds: structuredClone(this.selectionBounds())
      });
      this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
      return;
    }

    this.store.recordHistoryCheckpoint();
    this.interactionState.set({
      kind: 'resize',
      pointerId: event.pointerId,
      handle,
      cursor: this.resizeHandleCursor(handle),
      pointerOffset: this.resizePointerOffset(handle, pointerPoint),
      initialShape: selectedShape ? structuredClone(selectedShape) : null,
      initialShapes: structuredClone(selectedShapes),
      initialBounds: structuredClone(selectionBounds)
    });
    this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
  }

  onCanvasPointerMove(event: PointerEvent): void {
    if (this.pinchZoomState) {
      return;
    }
    const interactionState = this.interactionState();
    if (!interactionState || interactionState.pointerId !== event.pointerId) {
      return;
    }

    switch (interactionState.kind) {
      case 'pending-pan':
        this.handlePendingPanPointerMove(event, interactionState);
        return;
      case 'move':
        this.handleMovePointerMove(event, interactionState);
        return;
      case 'pan':
        this.handlePanPointerMove(event, interactionState);
        return;
      case 'marquee':
        this.handleMarqueePointerMove(event, interactionState);
        return;
      case 'insert':
        this.handleInsertPointerMove(event, interactionState);
        return;
      case 'freehand':
        this.handleFreehandPointerMove(event, interactionState);
        return;
      case 'resize':
        this.handleResizePointerMove(event, interactionState);
        return;
      case 'rotate':
        this.handleRotatePointerMove(event, interactionState);
        return;
    }
  }

  private handlePendingPanPointerMove(
    event: PointerEvent,
    interactionState: Extract<InteractionState, { kind: 'pending-pan' }>
  ): void {
    const deltaClientX = event.clientX - interactionState.startClientPoint.x;
    const deltaClientY = event.clientY - interactionState.startClientPoint.y;
    const distance = Math.hypot(deltaClientX, deltaClientY);
    if (distance < EDITOR_POINTER_TAP_MAX_DISTANCE_PX) {
      this.interactionState.set({
        ...interactionState,
        lastClientPoint: { x: event.clientX, y: event.clientY }
      });
      return;
    }

    this.suppressContextMenuBriefly();
    this.suppressNextContextMenu.set(interactionState.sourceButton === 2);
    this.interactionState.set({
      kind: 'pan',
      pointerId: interactionState.pointerId,
      lastClientPoint: { x: event.clientX, y: event.clientY },
      sourceButton: interactionState.sourceButton
    });
  }

  private handleMovePointerMove(
    event: PointerEvent,
    interactionState: Extract<InteractionState, { kind: 'move' }>
  ): void {
    const nextWorldPoint = this.toScenePoint(event.clientX, event.clientY);
    const deltaX = this.snap(nextWorldPoint.x - interactionState.startWorldPoint.x);
    const deltaY = this.snap(nextWorldPoint.y - interactionState.startWorldPoint.y);
    const nextShapes = interactionState.initialShapes.map((shape) => translateShapeBy(shape, deltaX, deltaY));
    this.store.replaceShapes(nextShapes);
  }

  private handlePanPointerMove(
    event: PointerEvent,
    interactionState: Extract<InteractionState, { kind: 'pan' }>
  ): void {
    const deltaClientX = event.clientX - interactionState.lastClientPoint.x;
    const deltaClientY = event.clientY - interactionState.lastClientPoint.y;
    const scale = this.preferences().scale;
    this.viewportCenter.update((viewportCenter) => ({
      x: viewportCenter.x - deltaClientX / scale,
      y: viewportCenter.y + deltaClientY / scale
    }));
    this.interactionState.set({ ...interactionState, lastClientPoint: { x: event.clientX, y: event.clientY } });
  }

  private handleMarqueePointerMove(
    event: PointerEvent,
    interactionState: Extract<InteractionState, { kind: 'marquee' }>
  ): void {
    this.interactionState.set({
      ...interactionState,
      currentWorldPoint: this.toScenePoint(event.clientX, event.clientY)
    });
  }

  private handleInsertPointerMove(
    event: PointerEvent,
    interactionState: Extract<InteractionState, { kind: 'insert' }>
  ): void {
    this.interactionState.set({
      ...interactionState,
      currentWorldPoint: this.snapScenePoint(this.toScenePoint(event.clientX, event.clientY))
    });
  }

  private handleFreehandPointerMove(
    event: PointerEvent,
    interactionState: Extract<InteractionState, { kind: 'freehand' }>
  ): void {
    const nextPoint = this.toScenePoint(event.clientX, event.clientY);
    const lastPoint = interactionState.points.at(-1);
    if (!lastPoint) {
      this.interactionState.set({ ...interactionState, points: [nextPoint] });
      return;
    }

    const distance = Math.hypot(nextPoint.x - lastPoint.x, nextPoint.y - lastPoint.y);
    if (distance < FREEHAND_POINT_MIN_DISTANCE) {
      return;
    }

    this.interactionState.set({
      ...interactionState,
      points: [...interactionState.points, nextPoint]
    });
  }

  private handleResizePointerMove(
    event: PointerEvent,
    interactionState: Extract<InteractionState, { kind: 'resize' }>
  ): void {
    const pointerPoint = this.toScenePoint(event.clientX, event.clientY);
    const adjustedPointerPoint = {
      x: pointerPoint.x + interactionState.pointerOffset.x,
      y: pointerPoint.y + interactionState.pointerOffset.y
    };
    if (
      (interactionState.initialShape?.kind === 'rectangle' || interactionState.initialShape?.kind === 'triangle') &&
      interactionState.handle.startsWith('corner-radius-')
    ) {
      const nextCornerRadius = this.cornerRadiusFromPointer(
        interactionState.initialShape,
        interactionState.handle,
        adjustedPointerPoint
      );
      this.store.patchSelectedShape((shape) =>
        shape.kind === 'rectangle' || shape.kind === 'triangle'
          ? ({ ...shape, cornerRadius: nextCornerRadius } as CanvasShape)
          : shape
      );
      return;
    }

    const nextPoint = this.snapScenePoint(adjustedPointerPoint);
    if (interactionState.initialShape) {
      const resizedShape = this.resizeShape(interactionState.initialShape, interactionState.handle, nextPoint);
      this.store.patchSelectedShape(() => resizedShape);
      return;
    }

    if (!interactionState.initialBounds || interactionState.initialShapes.length === 0) {
      return;
    }

    this.store.replaceShapes(
      this.resizeShapeSelection(
        interactionState.initialShapes,
        interactionState.initialBounds,
        interactionState.handle,
        nextPoint
      )
    );
  }

  private handleRotatePointerMove(
    event: PointerEvent,
    interactionState: Extract<InteractionState, { kind: 'rotate' }>
  ): void {
    const pointerPoint = this.toScenePoint(event.clientX, event.clientY);
    const angleRadians = Math.atan2(
      pointerPoint.y - interactionState.pivot.y,
      pointerPoint.x - interactionState.pivot.x
    );
    let rotationDeltaDegrees = ((interactionState.startAngleRadians - angleRadians) * 180) / Math.PI;
    if (this.shiftPressed()) {
      rotationDeltaDegrees =
        Math.round(rotationDeltaDegrees / EditorPageComponent.rotationSnapStepDegrees) *
        EditorPageComponent.rotationSnapStepDegrees;
    }
    const usePerShapePivot = interactionState.initialShapes.length > 1;
    this.store.replaceShapes(
      interactionState.initialShapes.map((shape) =>
        this.rotateShapeAround(
          shape,
          usePerShapePivot ? this.shapeCenter(shape) : interactionState.pivot,
          rotationDeltaDegrees
        )
      )
    );
  }

  endInteraction(event: PointerEvent): void {
    if (this.pinchZoomState) {
      return;
    }
    const interactionState = this.interactionState();
    if (!interactionState || interactionState.pointerId !== event.pointerId) {
      return;
    }

    switch (interactionState.kind) {
      case 'marquee':
        this.finishMarqueeInteraction(interactionState);
        break;
      case 'insert':
        this.finishInsertInteraction(interactionState);
        break;
      case 'freehand':
        this.finishFreehandInteraction(interactionState);
        break;
      case 'move':
        this.finishMoveInteraction(event, interactionState);
        break;
      case 'pan':
        this.finishPanInteraction(interactionState);
        break;
      case 'pending-pan':
        this.releaseCanvasPointerCapture(event.pointerId);
        this.interactionState.set(null);
        return;
      case 'resize':
        break;
      case 'rotate':
        break;
    }

    this.releaseCanvasPointerCapture(event.pointerId);
    this.ignoreNextCanvasClick.set(true);
    this.interactionState.set(null);
  }

  private finishMarqueeInteraction(interactionState: Extract<InteractionState, { kind: 'marquee' }>): void {
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

  private finishInsertInteraction(interactionState: Extract<InteractionState, { kind: 'insert' }>): void {
    const previewShapes = this.buildInsertionPreviewShapes(
      interactionState.toolId,
      interactionState.startWorldPoint,
      interactionState.currentWorldPoint
    );
    if (!previewShapes.length) {
      return;
    }

    this.runSceneMutation(() => {
      this.store.addShapes(previewShapes.map((shape) => ({ ...shape, id: crypto.randomUUID() })));
      this.activeTool.set('select');
      this.inspectorTab.set('properties');
    });
  }

  private finishFreehandInteraction(interactionState: Extract<InteractionState, { kind: 'freehand' }>): void {
    const line = this.buildFreehandLine(interactionState.points);
    if (!line) {
      return;
    }

    this.runSceneMutation(() => {
      this.store.addShapes([line]);
      this.store.selectShape(line.id);
      this.inspectorTab.set('properties');
    });
  }

  private finishMoveInteraction(
    event: PointerEvent,
    interactionState: Extract<InteractionState, { kind: 'move' }>
  ): void {
    const tapShapeId = this.resolveMoveTapShapeId(event, interactionState);
    if (!tapShapeId) {
      this.recentSelectedShapeTap.set(null);
      return;
    }

    if (this.isRepeatedSelectedShapeTap(tapShapeId)) {
      this.openInlineEditorForTappedShape(tapShapeId);
      return;
    }

    this.recentSelectedShapeTap.set({ shapeId: tapShapeId, timestamp: Date.now() });
  }

  private resolveMoveTapShapeId(
    event: PointerEvent,
    interactionState: Extract<InteractionState, { kind: 'move' }>
  ): string | null {
    const tapShapeId = interactionState.tapEligibleShapeId;
    if (!tapShapeId) {
      return null;
    }

    const tapDistance = Math.hypot(
      event.clientX - interactionState.startClientPoint.x,
      event.clientY - interactionState.startClientPoint.y
    );
    return tapDistance < EDITOR_POINTER_TAP_MAX_DISTANCE_PX ? tapShapeId : null;
  }

  private openInlineEditorForTappedShape(shapeId: string): void {
    const shape = this.scene().shapes.find((candidate) => candidate.id === shapeId);
    if (!shape || shape.kind === 'text' || this.selectionCount() !== 1 || this.selectedShape()?.id !== shapeId) {
      return;
    }

    const textShape = this.insertCenteredTextForSelectedShape(shape);
    if (textShape) {
      this.openInlineTextEditor(textShape);
    }
  }

  private finishPanInteraction(interactionState: Extract<InteractionState, { kind: 'pan' }>): void {
    if (interactionState.sourceButton !== 2) {
      return;
    }

    this.suppressNextContextMenu.set(true);
    this.suppressContextMenuBriefly();
  }

  private releaseCanvasPointerCapture(pointerId: number): void {
    const canvas = this.canvasSvg().nativeElement;
    if (canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
  }

  onCanvasWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = this.normalizeWheelDelta(event);

    const selectedShapes = this.selectedShapes();
    if (event.altKey && this.activeTool() === 'select' && this.selectionCanRotate(selectedShapes)) {
      const axisDelta = Math.abs(delta.y) >= Math.abs(delta.x) ? delta.y : delta.x;
      if (axisDelta !== 0) {
        const magnitude = Math.max(
          EditorPageComponent.wheelRotationMinStepDegrees,
          Math.min(
            EditorPageComponent.wheelRotationMaxStepDegrees,
            Math.abs(axisDelta) * EditorPageComponent.wheelRotationScale
          )
        );
        const rotationDelta = axisDelta > 0 ? -magnitude : magnitude;
        this.rotateCurrentSelectionBy(rotationDelta);
      }
      return;
    }

    if (event.ctrlKey) {
      const zoomDelta = delta.y;
      const zoomFactor = Math.exp(-zoomDelta * EDITOR_WHEEL_ZOOM_SENSITIVITY);
      this.setScaleAtClientPoint(this.preferences().scale * zoomFactor, event.clientX, event.clientY, false);
      return;
    }

    if (event.shiftKey) {
      const horizontalDelta = Math.abs(delta.x) > Math.abs(delta.y) ? delta.x : delta.y;
      this.panViewportByClientDelta(horizontalDelta, 0);
      return;
    }

    this.panViewportByClientDelta(delta.x, delta.y);
  }

  onCanvasTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 2) {
      return;
    }

    event.preventDefault();
    this.cancelCurrentInteraction();
    const [firstTouch, secondTouch] = Array.from(event.touches);
    const initialDistance = this.touchDistance(firstTouch, secondTouch);
    if (initialDistance <= 0) {
      return;
    }

    this.pinchZoomState = {
      initialDistance,
      initialScale: this.preferences().scale
    };
    this.ignoreNextCanvasClick.set(true);
  }

  onCanvasTouchMove(event: TouchEvent): void {
    if (!this.pinchZoomState || event.touches.length !== 2) {
      return;
    }

    event.preventDefault();
    const [firstTouch, secondTouch] = Array.from(event.touches);
    const distance = this.touchDistance(firstTouch, secondTouch);
    if (distance <= 0) {
      return;
    }

    const centerX = (firstTouch.clientX + secondTouch.clientX) / 2;
    const centerY = (firstTouch.clientY + secondTouch.clientY) / 2;
    const scaleFactor = distance / this.pinchZoomState.initialDistance;
    this.setScaleAtClientPoint(this.pinchZoomState.initialScale * scaleFactor, centerX, centerY, false);
  }

  onCanvasTouchEnd(event: TouchEvent): void {
    if (event.touches.length < 2) {
      this.pinchZoomState = null;
      this.ignoreNextCanvasClick.set(true);
    }
  }

  onCanvasBackgroundClick(event: MouseEvent): void {
    this.focusCanvasViewport();
    this.ignoreNextShapeClickId.set(null);
    this.recentSelectedShapeTap.set(null);

    if (this.ignoreNextCanvasClick()) {
      this.ignoreNextCanvasClick.set(false);
      return;
    }

    if (this.inlineTextEditor()) {
      this.commitInlineTextEditor();
      this.ignoreNextCanvasClick.set(true);
      return;
    }

    this.recentTextTap.set(null);

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

  onSelectionOutlineDoubleClick(event: MouseEvent): void {
    if (this.activeTool() !== 'select' || this.selectionCount() !== 1) {
      return;
    }

    const shape = this.selectedShape();
    if (!shape || shape.kind === 'text') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const textShape = this.insertCenteredTextForSelectedShape(shape);
    if (textShape) {
      this.openInlineTextEditor(textShape);
    }
  }

  toSvgX(x: number): number {
    return this.canvasWidth() / 2 + (x - this.viewportCenter().x) * this.preferences().scale;
  }

  toSvgY(y: number): number {
    return this.canvasHeight() / 2 - (y - this.viewportCenter().y) * this.preferences().scale;
  }

  fromSvgX(svgX: number): number {
    return this.viewportCenter().x + (svgX - this.canvasWidth() / 2) / this.preferences().scale;
  }

  fromSvgY(svgY: number): number {
    return this.viewportCenter().y + (this.canvasHeight() / 2 - svgY) / this.preferences().scale;
  }

  scaledStrokeWidth(strokeWidth: number): number {
    return Math.max(strokeWidth * this.preferences().scale * SHAPE_STROKE_SCALE_FACTOR, MIN_RENDER_STROKE_WIDTH);
  }

  lineHitStrokeWidth(strokeWidth: number): number {
    return Math.max(
      this.scaledStrokeWidth(strokeWidth) + EditorPageComponent.lineHitStrokeExtraPx,
      EditorPageComponent.lineHitStrokeMinPx
    );
  }

  selectionHandleOffset(): number {
    return this.selectionHandleSize() / 2;
  }

  selectionRotateIconPath(): string {
    return getIconPath('rotationHandle');
  }

  private resizeHandleCursor(handle: ResizeHandle): string {
    if (handle === 'rotate') {
      return 'grab';
    }

    return this.selectionHandles().find((entry) => entry.id === handle)?.cursor ?? 'default';
  }

  private resizePointerOffset(handle: ResizeHandle, pointerPoint: Point): Point {
    const descriptor = this.selectionHandles().find((entry) => entry.id === handle);
    if (!descriptor) {
      return { x: 0, y: 0 };
    }

    const handlePoint = {
      x: this.fromSvgX(descriptor.x),
      y: this.fromSvgY(descriptor.y)
    };
    return {
      x: handlePoint.x - pointerPoint.x,
      y: handlePoint.y - pointerPoint.y
    };
  }

  shapeRotationTransform(shape: CanvasShape): string | null {
    const rotation = this.shapeRotation(shape);
    if (!rotation) {
      return null;
    }
    const center = this.shapeCenter(shape);
    if (!center) {
      return null;
    }
    return `rotate(${rotation} ${this.toSvgX(center.x)} ${this.toSvgY(center.y)})`;
  }

  presetIconPath(icon: string): string {
    return getIconPath(icon);
  }

  tableDimensionsLabel(columns: number, rows: number): string {
    return tableSizeLabel(columns, rows);
  }

  shapeIcon(shape: CanvasShape): string {
    return getIconPath(this.shapeIconName(shape));
  }

  private shapeIconName(shape: CanvasShape): CanvasShape['kind'] | 'arrow' | 'segment' {
    if (shape.kind !== 'line') {
      return shape.kind;
    }

    return shape.arrowEnd ? 'arrow' : 'segment';
  }

  arrowTipIconPath(arrowType: ArrowTipKind): string {
    switch (arrowType) {
      case 'latex':
        return getIconPath('arrowTipLatex');
      case 'triangle':
        return getIconPath('arrowTipTriangle');
      case 'stealth':
        return getIconPath('arrowTipStealth');
      case 'diamond':
        return getIconPath('arrowTipDiamond');
      case 'circle':
        return getIconPath('arrowTipCircle');
      case 'bar':
        return getIconPath('arrowTipBar');
      case 'hooks':
        return getIconPath('arrowTipHooks');
      case 'bracket':
        return getIconPath('arrowTipBracket');
    }
  }

  arrowTipLabel(arrowType: ArrowTipKind): string {
    switch (arrowType) {
      case 'latex':
        return this.t('arrowTypeLatex');
      case 'triangle':
        return this.t('arrowTypeTriangle');
      case 'stealth':
        return this.t('arrowTypeStealth');
      case 'diamond':
        return this.t('arrowTypeDiamond');
      case 'circle':
        return this.t('arrowTypeCircle');
      case 'bar':
        return this.t('arrowTypeBar');
      case 'hooks':
        return this.t('arrowTypeHooks');
      case 'bracket':
        return this.t('arrowTypeBracket');
    }
  }

  selectionOutline(): {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly transform: string | null;
  } | null {
    const selectionBounds = this.selectionBounds();
    if (!selectionBounds) {
      return null;
    }

    const selectedShapes = this.selectedShapes();
    const singleSelectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null;
    const rotatedFrame = singleSelectedShape ? this.singleShapeSelectionFrame(singleSelectedShape) : null;
    if (rotatedFrame && Math.abs(rotatedFrame.rotation) >= 0.0001) {
      return {
        x: this.toSvgX(rotatedFrame.left),
        y: this.toSvgY(rotatedFrame.top),
        width: (rotatedFrame.right - rotatedFrame.left) * this.preferences().scale,
        height: (rotatedFrame.top - rotatedFrame.bottom) * this.preferences().scale,
        transform: `rotate(${rotatedFrame.rotation} ${this.toSvgX(rotatedFrame.center.x)} ${this.toSvgY(rotatedFrame.center.y)})`
      };
    }

    return {
      x: this.toSvgX(selectionBounds.left),
      y: this.toSvgY(selectionBounds.top),
      width: (selectionBounds.right - selectionBounds.left) * this.preferences().scale,
      height: (selectionBounds.top - selectionBounds.bottom) * this.preferences().scale,
      transform: null
    };
  }

  private rotationHandleFromBounds(bounds: SelectionBounds): HandleDescriptor {
    const distance = Math.max(
      EditorPageComponent.selectionRotateHandleMinDistance,
      (this.selectionHandleSize() * EditorPageComponent.selectionRotateHandleDistanceFactor) / this.preferences().scale
    );
    const handleY = this.toSvgY(bounds.top + distance);
    return {
      id: 'rotate',
      x: this.toSvgX((bounds.left + bounds.right) / 2),
      y: Math.max(this.selectionHandleSize(), handleY),
      cursor: 'grab',
      variant: 'rotate'
    };
  }

  private singleShapeSelectionFrame(shape: CanvasShape): {
    readonly left: number;
    readonly right: number;
    readonly bottom: number;
    readonly top: number;
    readonly center: Point;
    readonly rotation: number;
  } | null {
    switch (shape.kind) {
      case 'rectangle':
      case 'triangle':
      case 'image':
        return {
          left: shape.x,
          right: shape.x + shape.width,
          bottom: shape.y,
          top: shape.y + shape.height,
          center: { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 },
          rotation: shape.rotation ?? 0
        };
      case 'ellipse':
        return {
          left: shape.cx - shape.rx,
          right: shape.cx + shape.rx,
          bottom: shape.cy - shape.ry,
          top: shape.cy + shape.ry,
          center: { x: shape.cx, y: shape.cy },
          rotation: shape.rotation ?? 0
        };
      default:
        return null;
    }
  }

  private rotationHandleFromHandles(handles: readonly HandleDescriptor[], shape: CanvasShape): HandleDescriptor {
    const northHandle = handles.find((handle) => handle.id === 'n');
    if (!northHandle) {
      const bounds = this.shapeBounds(shape);
      if (bounds) {
        return this.rotationHandleFromBounds(bounds);
      }
      return {
        id: 'rotate',
        x: this.toSvgX(this.shapeCenter(shape).x),
        y: this.toSvgY(this.shapeCenter(shape).y) - this.selectionHandleSize() * 2,
        cursor: 'grab',
        variant: 'rotate'
      };
    }

    const center = this.shapeCenter(shape);
    const centerSvg = { x: this.toSvgX(center.x), y: this.toSvgY(center.y) };
    const deltaX = northHandle.x - centerSvg.x;
    const deltaY = northHandle.y - centerSvg.y;
    const length = Math.hypot(deltaX, deltaY) || 1;
    const unit = { x: deltaX / length, y: deltaY / length };
    const distancePx = Math.max(
      EditorPageComponent.selectionRotateHandleMinDistance * this.preferences().scale,
      this.selectionHandleSize() * EditorPageComponent.selectionRotateHandleDistanceFactor
    );

    return {
      id: 'rotate',
      x: northHandle.x + unit.x * distancePx,
      y: northHandle.y + unit.y * distancePx,
      cursor: 'grab',
      variant: 'rotate'
    };
  }

  private rotatedSingleShapeHandles(shape: CanvasShape): readonly HandleDescriptor[] | null {
    if (shape.kind === 'line' || shape.kind === 'circle' || shape.kind === 'text') {
      return null;
    }

    const frame = this.singleShapeSelectionFrame(shape);
    if (!frame) {
      return null;
    }

    const rotation = frame.rotation;
    if (Math.abs(rotation) < 0.0001) {
      return null;
    }

    const center = frame.center;
    const centerX = (frame.left + frame.right) / 2;
    const centerY = (frame.top + frame.bottom) / 2;
    const baseHandles = [
      { id: 'nw' as const, point: { x: frame.left, y: frame.top } },
      { id: 'n' as const, point: { x: centerX, y: frame.top } },
      { id: 'ne' as const, point: { x: frame.right, y: frame.top } },
      { id: 'e' as const, point: { x: frame.right, y: centerY } },
      { id: 'se' as const, point: { x: frame.right, y: frame.bottom } },
      { id: 's' as const, point: { x: centerX, y: frame.bottom } },
      { id: 'sw' as const, point: { x: frame.left, y: frame.bottom } },
      { id: 'w' as const, point: { x: frame.left, y: centerY } }
    ];
    const centerSvg = { x: this.toSvgX(center.x), y: this.toSvgY(center.y) };

    return baseHandles.map(({ id, point }) => {
      const rotatedPoint = this.rotatePointAround(point, center, -rotation);
      const x = this.toSvgX(rotatedPoint.x);
      const y = this.toSvgY(rotatedPoint.y);
      return {
        id,
        x,
        y,
        cursor: this.resizeCursorForVector({ x: x - centerSvg.x, y: y - centerSvg.y })
      };
    });
  }

  private cornerRadiusHandles(shape: RectangleCanvasShape | TriangleCanvasShape): readonly HandleDescriptor[] {
    return shape.kind === 'rectangle'
      ? this.rectangleCornerRadiusHandles(shape)
      : this.triangleCornerRadiusHandles(shape);
  }

  private rectangleCornerRadiusHandles(shape: RectangleCanvasShape): readonly HandleDescriptor[] {
    const maxRadius = Math.min(shape.width, shape.height) / 2;
    if (maxRadius <= 0) {
      return [];
    }
    const minimumVisibleInset =
      (this.selectionHandleSize() * EditorPageComponent.cornerRadiusHandleInsetFactor) / this.preferences().scale;
    const inset = Math.min(maxRadius, Math.max(shape.cornerRadius, minimumVisibleInset));
    const corners: ReadonlyArray<{ readonly id: ResizeHandle; readonly corner: Point; readonly point: Point }> = [
      {
        id: 'corner-radius-nw',
        corner: { x: shape.x, y: shape.y + shape.height },
        point: { x: shape.x + inset, y: shape.y + shape.height - inset }
      },
      {
        id: 'corner-radius-ne',
        corner: { x: shape.x + shape.width, y: shape.y + shape.height },
        point: { x: shape.x + shape.width - inset, y: shape.y + shape.height - inset }
      },
      {
        id: 'corner-radius-se',
        corner: { x: shape.x + shape.width, y: shape.y },
        point: { x: shape.x + shape.width - inset, y: shape.y + inset }
      },
      {
        id: 'corner-radius-sw',
        corner: { x: shape.x, y: shape.y },
        point: { x: shape.x + inset, y: shape.y + inset }
      }
    ];
    const center = this.shapeCenter(shape);
    const angle = this.shapeRotation(shape);
    return corners.map(({ id, corner, point }) => {
      const rotatedCorner = this.rotatePointAround(corner, center, -angle);
      const rotatedPoint = this.rotatePointAround(point, center, -angle);
      const cornerSvg = { x: this.toSvgX(rotatedCorner.x), y: this.toSvgY(rotatedCorner.y) };
      const pointSvg = { x: this.toSvgX(rotatedPoint.x), y: this.toSvgY(rotatedPoint.y) };
      return {
        id,
        x: pointSvg.x,
        y: pointSvg.y,
        cursor: this.resizeCursorForVector({ x: pointSvg.x - cornerSvg.x, y: pointSvg.y - cornerSvg.y }),
        variant: 'corner-radius'
      };
    });
  }

  private triangleCornerRadiusHandles(shape: TriangleCanvasShape): readonly HandleDescriptor[] {
    const maxRadius = maxTriangleCornerRadiusUtil(shape);
    if (maxRadius <= 0) {
      return [];
    }
    const minimumVisibleInset =
      (this.selectionHandleSize() * EditorPageComponent.cornerRadiusHandleInsetFactor) / this.preferences().scale;
    const inset = Math.min(maxRadius, Math.max(shape.cornerRadius, minimumVisibleInset));
    const corners = this.trianglePoints(shape);
    const center = this.shapeCenter(shape);
    const angle = this.shapeRotation(shape);

    const handleConfig = corners.map((corner, index) => {
      const previous = corners[(index - 1 + corners.length) % corners.length];
      const next = corners[(index + 1) % corners.length];
      const toPreviousLength = Math.hypot(previous.x - corner.x, previous.y - corner.y) || 1;
      const toNextLength = Math.hypot(next.x - corner.x, next.y - corner.y) || 1;
      const toPrevious = {
        x: (previous.x - corner.x) / toPreviousLength,
        y: (previous.y - corner.y) / toPreviousLength
      };
      const toNext = {
        x: (next.x - corner.x) / toNextLength,
        y: (next.y - corner.y) / toNextLength
      };
      const bisectorLength = Math.hypot(toPrevious.x + toNext.x, toPrevious.y + toNext.y) || 1;
      const bisector = {
        x: (toPrevious.x + toNext.x) / bisectorLength,
        y: (toPrevious.y + toNext.y) / bisectorLength
      };
      const point = {
        x: corner.x + bisector.x * inset,
        y: corner.y + bisector.y * inset
      };
      const id: ResizeHandle =
        index === 0 ? 'corner-radius-apex' : index === 1 ? 'corner-radius-left' : 'corner-radius-right';
      return { id, corner, point };
    });

    return handleConfig.map(({ id, corner, point }) => {
      const rotatedCorner = this.rotatePointAround(corner, center, -angle);
      const rotatedPoint = this.rotatePointAround(point, center, -angle);
      const cornerSvg = { x: this.toSvgX(rotatedCorner.x), y: this.toSvgY(rotatedCorner.y) };
      const pointSvg = { x: this.toSvgX(rotatedPoint.x), y: this.toSvgY(rotatedPoint.y) };
      return {
        id,
        x: pointSvg.x,
        y: pointSvg.y,
        cursor: this.resizeCursorForVector({ x: pointSvg.x - cornerSvg.x, y: pointSvg.y - cornerSvg.y }),
        variant: 'corner-radius'
      };
    });
  }

  lineSelectionPath(): string | null {
    const selectedShape: CanvasShape | null = this.selectedShape();
    if (selectedShape?.kind !== 'line') {
      return null;
    }
    return this.lineSvgPath(selectedShape);
  }

  lineSvgPath(shape: LineShape): string {
    return this.buildLinePath(shape, (point) => ({
      x: this.toSvgX(point.x),
      y: this.toSvgY(point.y)
    }));
  }

  triangleSvgPath(shape: TriangleCanvasShape): string {
    return this.buildTrianglePath(
      shape,
      (point) => ({
        x: this.toSvgX(point.x),
        y: this.toSvgY(point.y)
      }),
      shape.cornerRadius * this.preferences().scale
    );
  }

  lineEndpointHandle(shape: LineShape, endpoint: LineEndpoint, adjacentPoint: Point): HandleDescriptor {
    const targetPoint = endpoint === 'from' ? shape.from : shape.to;
    const targetSvg = { x: this.toSvgX(targetPoint.x), y: this.toSvgY(targetPoint.y) };
    const showsArrow = endpoint === 'from' ? shape.arrowStart : shape.arrowEnd;
    if (!showsArrow) {
      return {
        id: endpoint,
        x: targetSvg.x,
        y: targetSvg.y,
        cursor: 'crosshair',
        variant: 'endpoint'
      };
    }

    const { unitSvg } = this.lineEndpointVectors(shape, endpoint, adjacentPoint);
    const offset = Math.max(this.selectionHandleSize() * 0.92, 8);

    return {
      id: endpoint,
      x: targetSvg.x + unitSvg.x * offset,
      y: targetSvg.y + unitSvg.y * offset,
      cursor: 'crosshair',
      variant: 'endpoint'
    };
  }

  lineArrowControlHandles(shape: LineShape, endpoint: LineEndpoint, adjacentPoint: Point): readonly HandleDescriptor[] {
    const showsArrow = endpoint === 'from' ? shape.arrowStart : shape.arrowEnd;
    if (!showsArrow) {
      return [];
    }

    const endpointId = endpoint === 'from' ? 'start' : 'end';
    const { targetSvg, unitSvg, normalSvg } = this.lineEndpointVectors(shape, endpoint, adjacentPoint);
    const renderedLength = this.arrowRenderedLength(shape);
    const renderedHalfWidth = this.arrowRenderedHalfWidth(shape);
    const handlePadding = Math.max(this.selectionHandleSize() * 0.45, 5);
    const baseCenterX = targetSvg.x - unitSvg.x * renderedLength;
    const baseCenterY = targetSvg.y - unitSvg.y * renderedLength;
    const lengthHandleX = baseCenterX - unitSvg.x * handlePadding;
    const lengthHandleY = baseCenterY - unitSvg.y * handlePadding;
    const sideBacktrack = Math.max(renderedLength * 0.58, this.selectionHandleSize() * 0.8);
    const sideDistance = renderedHalfWidth + handlePadding * 0.7;
    const widthHandleX = targetSvg.x - unitSvg.x * sideBacktrack + normalSvg.x * sideDistance;
    const widthHandleY = targetSvg.y - unitSvg.y * sideBacktrack + normalSvg.y * sideDistance;

    return [
      {
        id: `arrow-length-${endpointId}` as ArrowControlHandle,
        x: lengthHandleX,
        y: lengthHandleY,
        cursor: this.resizeCursorForVector(unitSvg),
        variant: 'arrow-control'
      },
      {
        id: `arrow-width-${endpointId}` as ArrowControlHandle,
        x: widthHandleX,
        y: widthHandleY,
        cursor: this.resizeCursorForVector(normalSvg),
        variant: 'arrow-control'
      }
    ];
  }

  resizeCursorForVector(vector: Point): ResizeCursor {
    const angle = ((Math.atan2(vector.y, vector.x) * 180) / Math.PI + 180) % 180;

    if (angle < 22.5 || angle >= 157.5) {
      return 'ew-resize';
    }

    if (angle < 67.5) {
      return 'nwse-resize';
    }

    if (angle < 112.5) {
      return 'ns-resize';
    }

    return 'nesw-resize';
  }

  arrowMarkerId(shape: LineShape, side: ArrowEndpoint): string {
    return `${shape.id}-${shape.arrowType}-${shape.arrowOpen ? 'open' : 'fill'}-${shape.arrowRound ? 'round' : 'sharp'}-${shape.arrowScale}-${shape.arrowLengthScale}-${shape.arrowWidthScale}-${side}`;
  }

  arrowMarkerWidth(shape: LineShape): number {
    return this.arrowMarkerGeometry(shape).markerWidth;
  }

  arrowMarkerHeight(shape: LineShape): number {
    return this.arrowMarkerGeometry(shape).markerHeight;
  }

  arrowMarkerViewBox(shape: LineShape): string {
    return this.arrowMarkerGeometry(shape).viewBox;
  }

  arrowMarkerRefX(shape: LineShape, side: ArrowEndpoint): number {
    const sideOffsetByEndpoint: Readonly<Record<ArrowEndpoint, number>> = {
      start: 0,
      end: 0
    };
    return this.arrowMarkerGeometry(shape).refX + sideOffsetByEndpoint[side];
  }

  arrowMarkerRefY(shape: LineShape): number {
    return this.arrowMarkerGeometry(shape).refY;
  }

  arrowMarkerPath(shape: LineShape): string {
    return this.arrowMarkerGeometry(shape).path;
  }

  arrowTipLength(shape: LineShape): number {
    return DEFAULT_ARROW_TIP_LENGTH * shape.arrowLengthScale;
  }

  arrowTipWidth(shape: LineShape): number {
    return DEFAULT_ARROW_TIP_WIDTH * shape.arrowWidthScale;
  }

  arrowRenderedLength(shape: LineShape): number {
    return this.arrowTipLength(shape) * this.scaledStrokeWidth(shape.strokeWidth) * shape.arrowScale;
  }

  arrowRenderedHalfWidth(shape: LineShape): number {
    return (this.arrowTipWidth(shape) / 2) * this.scaledStrokeWidth(shape.strokeWidth) * shape.arrowScale;
  }

  arrowMarkerGeometry(shape: LineShape): {
    readonly markerWidth: number;
    readonly markerHeight: number;
    readonly viewBox: string;
    readonly refX: number;
    readonly refY: number;
    readonly path: string;
  } {
    const length = this.arrowTipLength(shape);
    const width = this.arrowTipWidth(shape);
    const halfWidth = width / 2;
    const padding = shape.arrowType === 'latex' ? 1.6 : 1.25;
    let refX = length;
    let path = '';

    switch (shape.arrowType) {
      case 'triangle':
        path = `M0,0 L0,${width} L${length},${halfWidth} z`;
        break;
      case 'latex':
        path = `M0.8,0.65 L${length},${halfWidth} L0.8,${Math.max(width - 0.65, 0.9)}`;
        break;
      case 'stealth':
        path = `M0.7,${halfWidth} L${length},0.6 L${Math.max(length * 0.72, 1.8)},${halfWidth} L${length},${Math.max(width - 0.6, 0.8)} z`;
        break;
      case 'diamond':
        path = `M0,${halfWidth} L${length * 0.47},0 L${length},${halfWidth} L${length * 0.47},${width} z`;
        break;
      case 'circle':
        {
          const radius = Math.max(Math.min(length, width) * 0.32, 1.2);
          const centerX = Math.max(length - radius - 0.8, radius + 0.8);
          refX = centerX + radius;
          path = `M${centerX},${halfWidth - radius} A${radius},${radius} 0 1 1 ${centerX},${halfWidth + radius} A${radius},${radius} 0 1 1 ${centerX},${halfWidth - radius} z`;
        }
        break;
      case 'bar':
        path = `M${length},0 L${length},${width}`;
        break;
      case 'hooks':
        path = `M${length},0.6 C${length * 0.62},0.6 ${length * 0.62},${Math.max(width - 0.6, 0.8)} ${length},${Math.max(width - 0.6, 0.8)} M${length * 0.55},0.6 C${Math.max(length * 0.18, 0.8)},0.6 ${Math.max(length * 0.18, 0.8)},${Math.max(width - 0.6, 0.8)} ${length * 0.55},${Math.max(width - 0.6, 0.8)}`;
        break;
      case 'bracket':
        path = `M${length},0 L${length * 0.5},0 L${length * 0.5},${width} L${length},${width}`;
        break;
    }

    return {
      markerWidth: (length + padding * 2) * shape.arrowScale,
      markerHeight: (width + padding * 2) * shape.arrowScale,
      viewBox: `${-padding} ${-padding} ${length + padding * 2} ${width + padding * 2}`,
      refX,
      refY: halfWidth,
      path
    };
  }

  lineEndpointVectors(
    shape: LineShape,
    endpoint: LineEndpoint,
    adjacentPoint: Point
  ): {
    readonly targetSvg: Point;
    readonly unitSvg: Point;
    readonly normalSvg: Point;
  } {
    const targetPoint = endpoint === 'from' ? shape.from : shape.to;
    const targetSvg = { x: this.toSvgX(targetPoint.x), y: this.toSvgY(targetPoint.y) };
    const adjacentSvg = { x: this.toSvgX(adjacentPoint.x), y: this.toSvgY(adjacentPoint.y) };
    const deltaX = targetSvg.x - adjacentSvg.x;
    const deltaY = targetSvg.y - adjacentSvg.y;
    const length = Math.hypot(deltaX, deltaY) || 1;

    return {
      targetSvg,
      unitSvg: { x: deltaX / length, y: deltaY / length },
      normalSvg: { x: -deltaY / length, y: deltaX / length }
    };
  }

  lineArrowControlScale(shape: LineShape, endpoint: ArrowEndpoint, point: Point, kind: ArrowScaleKind): number {
    const targetPoint = endpoint === 'start' ? shape.from : shape.to;
    const adjacentPoint = endpoint === 'start' ? (shape.anchors[0] ?? shape.to) : (shape.anchors.at(-1) ?? shape.from);
    const deltaX = targetPoint.x - adjacentPoint.x;
    const deltaY = targetPoint.y - adjacentPoint.y;
    const length = Math.hypot(deltaX, deltaY) || 1;
    const unit = { x: deltaX / length, y: deltaY / length };
    const normal = { x: -unit.y, y: unit.x };
    const offset = { x: point.x - targetPoint.x, y: point.y - targetPoint.y };
    const alongPixels = Math.max(-(offset.x * unit.x + offset.y * unit.y) * this.preferences().scale, 4);
    const acrossPixels = Math.abs((offset.x * normal.x + offset.y * normal.y) * this.preferences().scale);
    const strokeUnit = Math.max(this.scaledStrokeWidth(shape.strokeWidth) * shape.arrowScale, 0.5);

    if (kind === 'length') {
      return Math.min(3.6, Math.max(0.45, alongPixels / (DEFAULT_ARROW_TIP_LENGTH * strokeUnit)));
    }

    return Math.min(3.6, Math.max(0.45, (acrossPixels * 2) / (DEFAULT_ARROW_TIP_WIDTH * strokeUnit)));
  }

  arrowMarkerFill(shape: LineShape): string {
    return shape.arrowOpen ||
      shape.arrowType === 'latex' ||
      shape.arrowType === 'bar' ||
      shape.arrowType === 'hooks' ||
      shape.arrowType === 'bracket'
      ? 'none'
      : shape.arrowColor;
  }

  arrowMarkerStrokeLineJoin(shape: LineShape): 'round' | 'miter' {
    return shape.arrowRound ? 'round' : 'miter';
  }

  arrowMarkerStrokeLineCap(shape: LineShape): 'round' | 'butt' {
    return shape.arrowRound ? 'round' : 'butt';
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

  handleWindowKeydown(event: KeyboardEvent): void {
    this.handleModifierKeydown(event);

    if (this.isEditableTarget(event.target)) {
      return;
    }

    if (this.handleSelectAllShortcut(event)) {
      return;
    }

    if (this.handleEditShortcut(event)) {
      return;
    }

    const toolId = toolIdFromShortcutKey(event.key);
    if (toolId) {
      this.setActiveTool(toolId);
      return;
    }

    if (isDeleteShortcutKey(event.key)) {
      this.removeSelected();
      return;
    }

    if (isEscapeShortcutKey(event.key)) {
      this.handleEscapeShortcut();
      return;
    }

    if (isZoomInShortcutKey(event.key)) {
      this.zoomIn();
      return;
    }

    if (isZoomOutShortcutKey(event.key)) {
      this.zoomOut();
      return;
    }
  }

  private handleModifierKeydown(event: KeyboardEvent): void {
    const modifier = pressedModifierFromKey(event.key);
    if (!modifier) {
      return;
    }

    this.setModifierPressed(modifier, true);
    if (
      modifier === 'space' &&
      !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
    ) {
      event.preventDefault();
    }
  }

  private handleSelectAllShortcut(event: KeyboardEvent): boolean {
    if (!isSelectAllShortcut(event)) {
      return false;
    }

    if (this.isCanvasViewportFocused()) {
      event.preventDefault();
      event.stopPropagation();
      this.selectAllSceneShapes();
    }
    return true;
  }

  private handleEditShortcut(event: KeyboardEvent): boolean {
    if (this.handlePreventableShortcut(event, isRedoShortcut, () => this.redo())) {
      return true;
    }
    if (this.handlePreventableShortcut(event, isUndoShortcut, () => this.undo())) {
      return true;
    }
    if (this.handlePreventableShortcut(event, isCopyShortcut, () => this.copySelected())) {
      return true;
    }
    if (this.handlePreventableShortcut(event, isCutShortcut, () => this.cutSelected())) {
      return true;
    }
    return isPasteShortcut(event);
  }

  private handlePreventableShortcut(
    event: KeyboardEvent,
    isMatch: (event: KeyboardEvent) => boolean,
    action: () => void
  ): boolean {
    if (!isMatch(event)) {
      return false;
    }

    event.preventDefault();
    action();
    return true;
  }

  private handleEscapeShortcut(): void {
    const closeHandlers: ReadonlyArray<{ readonly isOpen: () => boolean; readonly close: () => void }> = [
      { isOpen: () => !!this.templateDeleteTarget(), close: () => this.closeDeleteTemplateDialog() },
      { isOpen: () => !!this.tableDialogState(), close: () => this.closeTableDialog() },
      { isOpen: () => this.templateDialogOpen(), close: () => this.closeTemplateDialog() },
      { isOpen: () => this.exportSettingsModalOpen(), close: () => this.closeExportSettingsModal() },
      { isOpen: () => this.importModalOpen(), close: () => this.closeImportModal() },
      { isOpen: () => this.exportModalOpen(), close: () => this.closeExportModal() },
      { isOpen: () => !!this.sceneReplaceDialog(), close: () => this.closeSceneReplaceDialog() },
      { isOpen: () => this.fileMenuOpen(), close: () => this.closeFileMenu() },
      { isOpen: () => this.mobileLibraryPanelOpen(), close: () => this.closeMobileLibraryPanel() },
      { isOpen: () => !!this.contextMenu(), close: () => this.closeContextMenu() }
    ];

    for (const handler of closeHandlers) {
      if (handler.isOpen()) {
        handler.close();
        return;
      }
    }

    if (this.activeTool() !== 'select') {
      this.setActiveTool('select');
      return;
    }
    this.store.selectShape(null);
  }

  handleWindowPaste(event: ClipboardEvent): void {
    if (this.isEditableTarget(event.target)) {
      return;
    }

    const imageFile = this.getImageFileFromTransfer(event.clipboardData);
    if (imageFile) {
      event.preventDefault();
      event.stopPropagation();
      this.runAsync(this.insertImageFileAtPoint(imageFile, this.snapScenePoint(this.viewportCenter())));
      return;
    }

    if (this.clipboardShapes()?.shapes.length) {
      event.preventDefault();
      event.stopPropagation();
      this.pasteInternalClipboard();
    }
  }

  handleWindowKeyup(event: KeyboardEvent): void {
    const modifier = pressedModifierFromKey(event.key);
    if (modifier) {
      this.setModifierPressed(modifier, false);
    }
  }

  handleWindowBlur(): void {
    this.spacePressed.set(false);
    this.shiftPressed.set(false);
    this.controlPressed.set(false);
    this.metaPressed.set(false);
    this.altPressed.set(false);
    this.ignoreNextShapeClickId.set(null);
    this.interactionState.set(null);
    this.sidebarResizeState.set(null);
    this.minimapPanPointerId.set(null);
    this.mobileLibraryPanelOpen.set(false);
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
    if (!resizeState) {
      return;
    }

    if (resizeState.axis === 'y') {
      const delta = event.clientY - resizeState.startPointer;
      if (resizeState.side === 'left') {
        this.mobileLeftSidebarHeight.set(this.clampSidebarSize('mobile-left', resizeState.startSize - delta));
        return;
      }
      this.mobileRightSidebarHeight.set(this.clampSidebarSize('mobile-right', resizeState.startSize - delta));
      return;
    }

    if (resizeState.side === 'left') {
      const delta = event.clientX - resizeState.startPointer;
      this.leftSidebarWidth.set(this.clampSidebarSize('left', resizeState.startSize + delta));
      return;
    }

    const delta = resizeState.startPointer - event.clientX;
    this.rightSidebarWidth.set(this.clampSidebarSize('right', resizeState.startSize + delta));
  }

  handleWindowPointerUp(): void {
    this.sidebarResizeState.set(null);
    this.minimapPanPointerId.set(null);
  }

  private showNotification(message: string, tone: NotificationTone = 'info'): void {
    const id = crypto.randomUUID();
    this.notifications.update((notifications) => [...notifications, { id, message, tone }]);
    globalThis.setTimeout(() => {
      this.notifications.update((notifications) => notifications.filter((notification) => notification.id !== id));
    }, EditorPageComponent.notificationDurationMs);
  }

  private showExportNotification(format: 'png' | 'svg'): void {
    const scope = this.selectedShapes().length ? 'Selection' : 'Scene';
    const formatKey = format === 'png' ? 'Png' : 'Svg';
    this.showNotification(this.t(`exportNotice${scope}${formatKey}`));
  }

  private runAsync(task: Promise<unknown>): void {
    task.catch(() => undefined);
  }

  private copyTextToClipboard(text: string): void {
    if (!navigator.clipboard) {
      return;
    }
    this.runAsync(navigator.clipboard.writeText(text));
  }

  private runSceneMutation(action: () => void): void {
    this.closeContextMenu();
    this.store.recordHistoryCheckpoint();
    action();
  }

  private shouldSuppressContextMenu(): boolean {
    return this.suppressContextMenuUntil() > Date.now();
  }

  private consumeContextMenuSuppression(): boolean {
    if (this.suppressNextContextMenu()) {
      this.suppressNextContextMenu.set(false);
      return true;
    }

    return this.shouldSuppressContextMenu();
  }

  private suppressContextMenuBriefly(): void {
    this.suppressContextMenuUntil.set(Date.now() + EDITOR_CONTEXT_MENU_SUPPRESSION_MS);
  }

  private normalizeWheelDelta(event: WheelEvent): { readonly x: number; readonly y: number } {
    const lineHeight = EDITOR_WHEEL_LINE_HEIGHT_PX;
    const pageHeight = this.canvasViewport().nativeElement.clientHeight || EDITOR_WHEEL_PAGE_HEIGHT_FALLBACK;
    const multiplier =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? lineHeight
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? pageHeight
          : 1;
    return {
      x: event.deltaX * multiplier,
      y: event.deltaY * multiplier
    };
  }

  private panViewportByClientDelta(deltaClientX: number, deltaClientY: number): void {
    const scale = this.preferences().scale;
    this.viewportCenter.update((viewportCenter) => ({
      x: viewportCenter.x + deltaClientX / scale,
      y: viewportCenter.y - deltaClientY / scale
    }));
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
      this.latexExportConfig.set(this.normalizeLatexExportConfig(sharedState.latexExportConfig));
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

    const preset = presetId === 'blank' ? null : (this.scenePresets.find((entry) => entry.id === presetId) ?? null);
    this.sceneReplaceDialog.set({
      presetId,
      title: this.sceneReplacementTitle(presetId, preset)
    });
  }

  private sceneReplacementTitle(presetId: string, preset: ScenePreset | null): string {
    if (presetId === 'blank' || !preset) {
      return this.t('newScene');
    }

    return this.scenePresetTitle(preset);
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

  private setScaleAtClientPoint(
    nextScale: number,
    clientX: number,
    clientY: number,
    roundToInteger: boolean = true
  ): void {
    const normalizedScale = roundToInteger
      ? Math.round(nextScale)
      : Math.round(nextScale * EDITOR_SCALE_DECIMAL_FACTOR) / EDITOR_SCALE_DECIMAL_FACTOR;
    const clampedScale = Math.min(EDITOR_SCALE_MAX, Math.max(EDITOR_SCALE_MIN, normalizedScale));
    const currentScale = this.preferences().scale;
    if (clampedScale === currentScale) {
      return;
    }

    const viewportRect = this.canvasViewport().nativeElement.getBoundingClientRect();
    const offsetX = clientX - viewportRect.left - viewportRect.width / 2;
    const offsetY = viewportRect.height / 2 - (clientY - viewportRect.top);
    const viewportCenter = this.viewportCenter();
    const worldX = viewportCenter.x + offsetX / currentScale;
    const worldY = viewportCenter.y + offsetY / currentScale;

    this.store.patchPreferences({ scale: clampedScale });
    this.viewportCenter.set({ x: worldX - offsetX / clampedScale, y: worldY - offsetY / clampedScale });
  }

  private touchDistance(firstTouch: Touch, secondTouch: Touch): number {
    return Math.hypot(secondTouch.clientX - firstTouch.clientX, secondTouch.clientY - firstTouch.clientY);
  }

  private cancelCurrentInteraction(): void {
    const interactionState = this.interactionState();
    if (!interactionState) {
      return;
    }

    const canvasSvg = this.canvasSvg().nativeElement;
    if (canvasSvg.hasPointerCapture(interactionState.pointerId)) {
      canvasSvg.releasePointerCapture(interactionState.pointerId);
    }
    this.interactionState.set(null);
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
    return (
      this.savedTemplates().some((template) => template.id === toolId) ||
      this.objectPresets.some((preset) => preset.id === toolId && preset.preserveStyle)
    );
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
          arrowOpen: false,
          arrowRound: false,
          arrowScale: preferences.defaultArrowScale,
          arrowLengthScale: 1,
          arrowWidthScale: 1,
          arrowBendMode: 'none',
          strokeOpacity: 1,
          strokeWidth: preferences.defaultStrokeWidth
        };
      case 'rectangle':
      case 'triangle':
      case 'circle':
      case 'ellipse':
        return {
          ...shape,
          stroke: preferences.defaultStroke,
          fill: preferences.defaultFill,
          strokeOpacity: 1,
          fillOpacity: 1,
          ...(shape.kind === 'triangle'
            ? { apexOffset: shape.apexOffset ?? 0.5, cornerRadius: shape.cornerRadius ?? 0 }
            : {}),
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
    const hasDrag = Math.abs(deltaX) > MIN_POINTER_DRAG_DELTA || Math.abs(deltaY) > MIN_POINTER_DRAG_DELTA;
    const keepOwnStyle = this.presetKeepsOwnStyle(toolId);
    const templateShapes = this.resolvePresetTemplateShapes(toolId, preset);
    const templateBounds = this.computeBounds(templateShapes);
    if (!templateBounds) {
      return [];
    }

    const directLinePreview = this.buildDirectLineInsertionPreview(
      preset,
      startPoint,
      currentPoint,
      hasDrag,
      keepOwnStyle
    );
    if (directLinePreview) {
      return directLinePreview;
    }

    if (!hasDrag) {
      const centerX = (templateBounds.left + templateBounds.right) / 2;
      const centerY = (templateBounds.bottom + templateBounds.top) / 2;
      return this.localizeInsertedPresetShapes(
        preset,
        templateShapes.map((shape, index) =>
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
        ),
        keepOwnStyle
      );
    }

    const targetLeft = Math.min(startPoint.x, currentPoint.x);
    const targetBottom = Math.min(startPoint.y, currentPoint.y);
    const targetWidth = Math.max(Math.abs(deltaX), MIN_SHAPE_DIMENSION);
    const targetHeight = Math.max(Math.abs(deltaY), MIN_SHAPE_DIMENSION);
    const templateWidth = Math.max(templateBounds.right - templateBounds.left, MIN_SHAPE_DIMENSION);
    const templateHeight = Math.max(templateBounds.top - templateBounds.bottom, MIN_SHAPE_DIMENSION);
    const scaleX = targetWidth / templateWidth;
    const scaleY = targetHeight / templateHeight;

    return this.localizeInsertedPresetShapes(
      preset,
      templateShapes.map((shape, index) =>
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
      ),
      keepOwnStyle
    );
  }

  private buildFreehandLine(points: readonly Point[], id: string = crypto.randomUUID()): LineShape | null {
    const simplified = points.reduce<Point[]>((accumulator, point, index) => {
      if (index === 0) {
        accumulator.push(point);
        return accumulator;
      }

      const previous = accumulator.at(-1);
      if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= FREEHAND_POINT_MIN_DISTANCE) {
        accumulator.push(point);
      }
      return accumulator;
    }, []);

    if (simplified.length < 2) {
      return null;
    }

    const [from, ...rest] = simplified;
    const to = rest.at(-1);
    if (!to) {
      return null;
    }

    return this.applyInsertionDefaults({
      id,
      name: this.t('freeDraw'),
      kind: 'line',
      stroke: this.preferences().defaultStroke,
      strokeOpacity: 1,
      strokeWidth: this.preferences().defaultStrokeWidth,
      from,
      to,
      anchors: rest.slice(0, -1),
      lineMode: 'curved',
      arrowStart: false,
      arrowEnd: false,
      arrowType: 'latex',
      arrowColor: this.preferences().defaultStroke,
      arrowOpacity: 1,
      arrowOpen: false,
      arrowRound: false,
      arrowScale: this.preferences().defaultArrowScale,
      arrowLengthScale: 1,
      arrowWidthScale: 1,
      arrowBendMode: 'none'
    }) as LineShape;
  }

  private buildDirectLineInsertionPreview(
    preset: ObjectPreset,
    startPoint: Point,
    currentPoint: Point,
    hasDrag: boolean,
    keepOwnStyle: boolean
  ): readonly CanvasShape[] | null {
    if (!this.isQuickLineInsertionPreset(preset)) {
      return null;
    }

    const [shape] = structuredClone(preset.shapes);
    if (!shape || shape.kind !== 'line') {
      return null;
    }

    const defaultDelta = {
      x: shape.to.x - shape.from.x,
      y: shape.to.y - shape.from.y
    };
    const nextLine = this.applyPresetStyle(
      {
        ...shape,
        id: 'preview-0',
        from: startPoint,
        to: hasDrag ? currentPoint : { x: startPoint.x + defaultDelta.x, y: startPoint.y + defaultDelta.y },
        anchors: []
      } as LineShape,
      keepOwnStyle
    );

    return this.localizeInsertedPresetShapes(preset, [nextLine], keepOwnStyle);
  }

  private insertPresetAt(toolId: ToolId, point: Point): void {
    const preset = this.allInsertablePresets().find((entry) => entry.id === toolId);
    if (!preset) {
      return;
    }
    const keepOwnStyle = this.presetKeepsOwnStyle(toolId);

    const templateShapes = this.resolvePresetTemplateShapes(toolId, preset);
    const templateBounds = this.computeBounds(templateShapes);
    if (!templateBounds) {
      return;
    }

    const centerX = (templateBounds.left + templateBounds.right) / 2;
    const centerY = (templateBounds.bottom + templateBounds.top) / 2;
    const shapes = remapStructuralShapeIds(
      this.localizeInsertedPresetShapes(
        preset,
        templateShapes.map((shape) =>
          this.applyPresetStyle(
            this.transformShape(shape, point.x - centerX, point.y - centerY, 1, 1, 0, 0, crypto.randomUUID()),
            keepOwnStyle
          )
        ),
        keepOwnStyle
      )
    );
    this.store.addShapes(shapes);
  }

  private isQuickLineInsertionPreset(preset: ObjectPreset): boolean {
    return (
      (preset.id === 'segment' || preset.id === 'arrow') &&
      preset.shapes.length === 1 &&
      preset.shapes[0]?.kind === 'line'
    );
  }

  private applyPresetStyle(shape: CanvasShape, keepOwnStyle: boolean): CanvasShape {
    return keepOwnStyle ? shape : this.applyInsertionDefaults(shape);
  }

  private resolvePresetTemplateShapes(toolId: ToolId, preset: ObjectPreset): readonly CanvasShape[] {
    if (toolId === 'table') {
      return buildTablePresetShapes(this.tablePresetDimensions());
    }

    return structuredClone(preset.shapes);
  }

  private localizeInsertedPresetShapes(
    preset: ObjectPreset,
    shapes: readonly CanvasShape[],
    keepOwnStyle: boolean
  ): readonly CanvasShape[] {
    const localizedShapes = keepOwnStyle ? shapes : this.localizePresetCanvasShapes(shapes);

    if (keepOwnStyle || localizedShapes.length !== 1) {
      return localizedShapes;
    }

    const localizedName = this.presetTitle(preset);
    return localizedShapes.map((shape) => ({ ...shape, name: localizedName }) as CanvasShape);
  }

  private localizePresetCanvasShapes(shapes: readonly CanvasShape[]): readonly CanvasShape[] {
    return localizePresetTemplateShapes(shapes, (key, fallback) => this.tOrFallback(key, fallback));
  }

  private localizedScenePreset(scene: TikzScene): TikzScene {
    return {
      ...structuredClone(scene),
      shapes: this.localizePresetCanvasShapes(structuredClone(scene.shapes))
    };
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
    return transformCanvasShape(shape, deltaX, deltaY, scaleX, scaleY, originX, originY, id);
  }

  private openTableDialog(state: TableDialogState): void {
    this.tableDialogState.set({
      ...normalizeTableDimensions(state),
      mode: state.mode,
      submitMode: state.submitMode
    });
  }

  private replaceSelectedTable(dimensions: TableDimensions): void {
    const table = this.selectedTable();
    if (!table) {
      return;
    }

    const frame = table.shapes.find(
      (shape): shape is RectangleCanvasShape => shape.kind === 'rectangle' && shape.table?.role === 'frame'
    );
    if (!frame) {
      return;
    }

    const dividerPrototype =
      table.shapes.find(
        (shape): shape is LineCanvasShape => shape.kind === 'line' && shape.table?.role === 'row-divider'
      ) ??
      table.shapes.find(
        (shape): shape is LineCanvasShape => shape.kind === 'line' && shape.table?.role === 'column-divider'
      );

    const nextShapes = buildTableShapes({
      ...normalizeTableDimensions(dimensions),
      x: table.x,
      y: table.y,
      width: table.width,
      height: table.height,
      tableId: table.tableId,
      mergeId: table.mergeId,
      frameStroke: frame.stroke,
      frameStrokeOpacity: frame.strokeOpacity,
      frameStrokeWidth: frame.strokeWidth,
      frameFill: frame.fill,
      frameFillOpacity: frame.fillOpacity,
      frameCornerRadius: frame.cornerRadius,
      dividerStroke: dividerPrototype?.stroke ?? frame.stroke,
      dividerStrokeOpacity: dividerPrototype?.strokeOpacity ?? 1,
      dividerStrokeWidth: dividerPrototype?.strokeWidth ?? Math.max(frame.strokeWidth * 0.6, 0.05)
    });

    this.store.replaceShapeSet(
      table.shapes.map((shape) => shape.id),
      nextShapes
    );
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
    this.savedTemplates.set(parseSavedTemplatesFromStorage(raw));
  }

  private restorePinnedTools(): void {
    const raw = this.document.defaultView?.localStorage?.getItem(this.pinnedToolsStorageKey);
    this.pinnedToolIds.set(parsePinnedToolIdsFromStorage(raw, this.savedTemplates()));
  }

  private persistSavedTemplates(): void {
    this.document.defaultView?.localStorage?.setItem(
      this.savedTemplatesStorageKey,
      JSON.stringify(this.savedTemplates())
    );
  }

  private restoreLanguage(): LanguageCode {
    const saved = this.document.defaultView?.localStorage?.getItem(this.languageStorageKey);
    return restoreLanguageFromStorage(saved, detectLanguage);
  }

  private restoreCodeHighlightTheme(): CodeHighlightTheme {
    const saved = this.document.defaultView?.localStorage?.getItem(this.codeThemeStorageKey);
    return restoreCodeHighlightThemeFromStorage(saved, 'aurora');
  }

  private restoreLatexExportConfig(): LatexExportConfig {
    return this.parseStoredLatexExportConfig(
      this.document.defaultView?.localStorage?.getItem(this.latexExportConfigStorageKey)
    );
  }

  private restoreSidebarSizes(): { readonly left: number; readonly right: number } {
    return this.parseStoredSidebarSizes(this.document.defaultView?.localStorage?.getItem(this.sidebarSizesStorageKey));
  }

  private parseStoredSidebarSizes(raw: string | null | undefined): { readonly left: number; readonly right: number } {
    const fallback: { readonly left: number; readonly right: number } = { left: 288, right: 340 };
    if (!raw) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(raw) as { readonly left?: unknown; readonly right?: unknown };
      let left = fallback.left;
      let right = fallback.right;

      if (typeof parsed.left === 'number' && Number.isFinite(parsed.left)) {
        left = this.clampSidebarSize('left', parsed.left);
      }

      if (typeof parsed.right === 'number' && Number.isFinite(parsed.right)) {
        right = this.clampSidebarSize('right', parsed.right);
      }

      return { left, right };
    } catch {
      return fallback;
    }
  }

  private parseStoredLatexExportConfig(raw: string | null | undefined): LatexExportConfig {
    return parseStoredLatexExportConfigUtil(raw, this.defaultLatexExportConfig);
  }

  private serializableLatexExportConfig(config: LatexExportConfig): Partial<LatexExportConfig> {
    return serializableLatexExportConfigUtil(config);
  }

  private normalizeLatexExportConfig(
    config: Partial<LatexExportConfig> | null | undefined,
    preserveFreeText = true
  ): LatexExportConfig {
    return normalizeLatexExportConfigUtil(config, this.defaultLatexExportConfig, preserveFreeText);
  }

  private buildSnippetExport(): { readonly imports: string; readonly code: string; readonly combined: string } {
    const baseBundle = this.baseTikzExportBundle();
    const config = this.latexExportConfig();
    const caption = config.caption.trim() || this.suggestedCaption();
    const label = config.label.trim() || this.suggestedLabel();
    const useAdjustbox = config.scaleToWidth || config.includeFrame;
    const imports = [baseBundle.imports, ...(useAdjustbox ? ['\\usepackage{adjustbox}'] : [])];
    const adjustboxOptions = [
      ...(config.includeFrame ? ['frame'] : []),
      ...(config.scaleToWidth ? [`max width=${this.latexWidthExpression(config.maxWidthPercent)}`] : []),
      ...(config.scaleToWidth && config.alignment === 'center' ? ['center'] : [])
    ];

    if (config.wrapInFigure && config.figurePlacement.includes('H')) {
      imports.push('\\usepackage{float}');
    }

    const contentLines = [
      this.latexAlignmentCommand(config.alignment),
      config.fontSize === 'normalsize' ? '' : `\\${config.fontSize}`,
      ...(useAdjustbox
        ? [`\\begin{adjustbox}{${adjustboxOptions.join(',')}}`, baseBundle.code, '\\end{adjustbox}']
        : [baseBundle.code])
    ].filter(Boolean);

    const code = config.wrapInFigure
      ? [
          `\\begin{figure}[${config.figurePlacement || 'H'}]`,
          ...contentLines.map((line) => `  ${line}`),
          ...(config.includeCaption ? [`  \\caption{${caption}}`] : []),
          ...(config.includeLabel ? [`  \\label{${label}}`] : []),
          '\\end{figure}'
        ].join('\n')
      : ['{', ...contentLines, '}'].join('\n');

    const normalizedImports = Array.from(new Set(imports.filter(Boolean))).join('\n');

    return {
      imports: normalizedImports,
      code,
      combined: [normalizedImports, code].filter(Boolean).join('\n\n')
    };
  }

  private buildStandaloneDocument(): string {
    const snippet = this.buildSnippetExport();
    const border = this.formatLatexDecimal(this.latexExportConfig().standaloneBorderMm);
    const documentClassOptions = ['tikz', ...(Number.parseFloat(border) > 0 ? [`border=${border}mm`] : [])].join(',');
    return [
      `\\documentclass[${documentClassOptions}]{standalone}`,
      snippet.imports,
      '\\begin{document}',
      snippet.code,
      '\\end{document}'
    ].join('\n');
  }

  private formatLatexDecimal(value: number): string {
    return Number.parseFloat(value.toFixed(2)).toString();
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
    return computeBoundsUtil(shapes);
  }

  private linePoints(shape: LineShape): readonly Point[] {
    return linePointsUtil(shape);
  }

  private trianglePoints(shape: TriangleCanvasShape): readonly [Point, Point, Point] {
    return trianglePointsUtil(shape);
  }

  private buildTrianglePath(
    shape: TriangleCanvasShape,
    projectPoint: (point: Point) => { readonly x: number; readonly y: number },
    cornerRadius = 0
  ): string {
    return buildTrianglePathUtil(shape, projectPoint, cornerRadius);
  }

  private buildLinePath(
    shape: LineShape,
    projectPoint: (point: Point) => { readonly x: number; readonly y: number }
  ): string {
    return buildLinePathUtil(shape, projectPoint);
  }

  private toMinimapShape(
    shape: CanvasShape,
    toMapX: (x: number) => number,
    toMapY: (y: number) => number,
    scale: number
  ): MinimapShape {
    const minimapStrokeWidth = (strokeWidth: number): number =>
      Math.min(Math.max(strokeWidth * scale * 0.42, 0.16), 0.95);
    switch (shape.kind) {
      case 'line':
        return {
          kind: 'line',
          stroke: shape.stroke,
          strokeWidth: minimapStrokeWidth(shape.strokeWidth),
          path: this.buildLinePath(shape, (point) => ({
            x: toMapX(point.x),
            y: toMapY(point.y)
          }))
        };
      case 'rectangle':
        return {
          kind: 'rectangle',
          stroke: shape.stroke,
          strokeWidth: minimapStrokeWidth(shape.strokeWidth),
          fill: shape.fill,
          x: toMapX(shape.x),
          y: toMapY(shape.y + shape.height),
          width: Math.max(shape.width * scale, MINIMAP_MIN_IMAGE_DIMENSION),
          height: Math.max(shape.height * scale, MINIMAP_MIN_IMAGE_DIMENSION),
          rx: Math.max(shape.cornerRadius * scale, 0.6)
        };
      case 'triangle':
        return {
          kind: 'triangle',
          stroke: shape.stroke,
          strokeWidth: minimapStrokeWidth(shape.strokeWidth),
          fill: shape.fill,
          path: this.buildTrianglePath(
            shape,
            (point) => ({
              x: toMapX(point.x),
              y: toMapY(point.y)
            }),
            shape.cornerRadius * scale
          )
        };
      case 'circle':
        return {
          kind: 'circle',
          stroke: shape.stroke,
          strokeWidth: minimapStrokeWidth(shape.strokeWidth),
          fill: shape.fill,
          cx: toMapX(shape.cx),
          cy: toMapY(shape.cy),
          r: Math.max(shape.r * scale, MINIMAP_MIN_RADIUS)
        };
      case 'ellipse':
        return {
          kind: 'ellipse',
          stroke: shape.stroke,
          strokeWidth: minimapStrokeWidth(shape.strokeWidth),
          fill: shape.fill,
          cx: toMapX(shape.cx),
          cy: toMapY(shape.cy),
          rx: Math.max(shape.rx * scale, MINIMAP_MIN_RADIUS),
          ry: Math.max(shape.ry * scale, MINIMAP_MIN_RADIUS)
        };
      case 'text': {
        const lines = this.displayTextLinesForShape(shape);
        return {
          kind: 'text',
          stroke: 'transparent',
          strokeWidth: 0,
          fill: shape.color,
          fillOpacity: shape.colorOpacity,
          x: this.textRenderXAt(shape, toMapX, scale),
          y: toMapY(shape.y),
          lines,
          fontSize: Math.max(shape.fontSize * scale, MINIMAP_MIN_TEXT_HEIGHT),
          textAnchor: this.textAnchor(shape.textAlign),
          fontWeight: shape.fontWeight,
          fontStyle: shape.fontStyle,
          textDecoration: shape.textDecoration,
          transform: shape.rotation ? `rotate(${shape.rotation} ${toMapX(shape.x)} ${toMapY(shape.y)})` : null
        };
      }
      case 'image':
        return {
          kind: 'image',
          stroke: shape.stroke,
          strokeWidth: minimapStrokeWidth(shape.strokeWidth),
          x: toMapX(shape.x),
          y: toMapY(shape.y + shape.height),
          width: Math.max(shape.width * scale, MINIMAP_MIN_IMAGE_DIMENSION),
          height: Math.max(shape.height * scale, MINIMAP_MIN_IMAGE_DIMENSION),
          opacity: shape.strokeOpacity,
          href: shape.src
        };
    }
  }

  private shapeBounds(shape: CanvasShape): SelectionBounds | null {
    return shapeBoundsUtil(shape);
  }

  private rotatedRectangleBounds(
    x: number,
    y: number,
    width: number,
    height: number,
    rotationDegrees: number
  ): SelectionBounds {
    return rotatedRectangleBoundsUtil(x, y, width, height, rotationDegrees);
  }

  private rotatedEllipseBounds(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rotationDegrees: number
  ): SelectionBounds {
    return rotatedEllipseBoundsUtil(cx, cy, rx, ry, rotationDegrees);
  }

  private boundsFromPoints(points: readonly Point[]): SelectionBounds | null {
    return boundsFromPointsUtil(points);
  }

  private cornerRadiusFromPointer(
    shape: RectangleCanvasShape | TriangleCanvasShape,
    handle: ResizeHandle,
    pointer: Point
  ): number {
    return cornerRadiusFromPointerUtil(shape, handle, pointer);
  }

  private rotateShapeAround(shape: CanvasShape, pivot: Point, rotationDeltaDegrees: number): CanvasShape {
    return rotateShapeAroundUtil(shape, pivot, rotationDeltaDegrees);
  }

  private shapeCenter(shape: CanvasShape): Point {
    return shapeCenterUtil(shape);
  }

  private shapeRotation(shape: CanvasShape): number {
    return shapeRotationUtil(shape);
  }

  private rotatePointAround(point: Point, pivot: Point, rotationDegrees: number): Point {
    return rotatePointAroundUtil(point, pivot, rotationDegrees);
  }

  private normalizeRotationDegrees(rotationDegrees: number): number {
    return normalizeRotationDegreesUtil(rotationDegrees);
  }

  private rotateCurrentSelectionBy(rotationDeltaDegrees: number): void {
    if (Math.abs(rotationDeltaDegrees) < 0.0001) {
      return;
    }
    const bounds = this.selectionBounds();
    const selectedShapes = this.selectedShapes();
    if (!bounds || !this.selectionCanRotate(selectedShapes)) {
      return;
    }
    const selectionPivot = {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.bottom + bounds.top) / 2
    };
    const usePerShapePivot = selectedShapes.length > 1;
    this.store.recordHistoryCheckpoint();
    this.store.replaceShapes(
      selectedShapes.map((shape) =>
        this.rotateShapeAround(shape, usePerShapePivot ? this.shapeCenter(shape) : selectionPivot, rotationDeltaDegrees)
      )
    );
  }

  private selectionCanRotate(shapes: readonly CanvasShape[]): boolean {
    const firstShape = shapes[0] ?? null;
    return (
      shapes.length > 0 && !(shapes.length === 1 && (firstShape?.kind === 'line' || firstShape?.kind === 'circle'))
    );
  }

  private resizeShape(shape: CanvasShape, handle: ResizeHandle, point: Point): CanvasShape {
    return resizeShapeUtil(shape, handle, point, {
      shapeBounds: (entry) => this.shapeBounds(entry),
      lineArrowControlScale: (line, endpoint, targetPoint, kind) =>
        this.lineArrowControlScale(line, endpoint, targetPoint, kind),
      selectedShapeKind: this.selectedShape()?.kind ?? null,
      shiftPressed: this.shiftPressed(),
      minShapeDimension: MIN_SHAPE_DIMENSION,
      minTextResizeWidth: MIN_TEXT_RESIZE_WIDTH,
      minTextResizeHeight: MIN_TEXT_RESIZE_HEIGHT,
      minTextBoxWidth: MIN_TEXT_BOX_WIDTH,
      minTextFontSize: MIN_TEXT_FONT_SIZE,
      textMinHeightFactor: TEXT_MIN_HEIGHT_FACTOR
    });
  }

  private resizeShapeSelection(
    shapes: readonly CanvasShape[],
    selectionBounds: SelectionBounds,
    handle: ResizeHandle,
    point: Point
  ): readonly CanvasShape[] {
    return resizeSelection(shapes, selectionBounds, handle, point, this.shiftPressed());
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
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  private getImageFileFromTransfer(transfer: DataTransfer | null | undefined): File | null {
    const imageItem = Array.from(transfer?.items ?? []).find(
      (item) => item.kind === 'file' && item.type.startsWith('image/')
    );
    const itemFile = imageItem?.getAsFile();
    if (itemFile) {
      return itemFile;
    }

    return Array.from(transfer?.files ?? []).find((file) => file.type.startsWith('image/')) ?? null;
  }

  private async readImageFileFromNavigatorClipboard(): Promise<File | null> {
    if (!navigator.clipboard?.read) {
      return null;
    }

    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (!imageType) {
          continue;
        }

        const blob = await item.getType(imageType);
        const extension = imageType.split('/')[1] || 'png';
        return new File([blob], `clipboard-image.${extension}`, { type: imageType });
      }
    } catch {
      return null;
    }

    return null;
  }

  private async insertImageFileAtPoint(file: File, point: Point): Promise<void> {
    const dataUrl = await this.readFileAsDataUrl(file);
    const dimensions = await this.loadImageDimensions(dataUrl);
    const aspectRatio = dimensions && dimensions.height > 0 ? Math.max(dimensions.width / dimensions.height, 0.01) : 1;
    const width = 8;
    const height = Math.max(width / aspectRatio, MIN_IMAGE_DIMENSION);
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

  private isEditableTarget(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    );
  }

  private focusCanvasViewport(): void {
    this.canvasViewport().nativeElement.focus({ preventScroll: true });
  }

  private isCanvasViewportFocused(): boolean {
    return this.document.activeElement === this.canvasViewport().nativeElement;
  }

  private selectAllSceneShapes(): void {
    this.store.setSelectedShapes(this.scene().shapes.map((shape) => shape.id));
    this.setInspectorTab('properties');
    this.closeContextMenu();
  }

  private setModifierPressed(modifier: ModifierKey, pressed: boolean): void {
    switch (modifier) {
      case 'space':
        this.spacePressed.set(pressed);
        return;
      case 'shift':
        this.shiftPressed.set(pressed);
        return;
      case 'control':
        this.controlPressed.set(pressed);
        return;
      case 'meta':
        this.metaPressed.set(pressed);
        return;
      case 'alt':
        this.altPressed.set(pressed);
        return;
    }
  }

  private openInlineTextEditor(shape: TextCanvasShape): void {
    this.inlineTextEditor.set({
      shapeId: shape.id,
      value: shape.text
    });
    this.ignoreNextCanvasClick.set(true);
    this.focusInlineTextInput();
  }

  private startTextEditing(shape: TextCanvasShape): void {
    this.selectShape(shape.id);
    this.openInlineTextEditor(shape);
    this.recentTextTap.set(null);
    this.recentSelectedShapeTap.set(null);
  }

  private insertCenteredTextForSelectedShape(shape: CanvasShape): TextCanvasShape | null {
    if (shape.kind === 'text') {
      return null;
    }

    if (this.selectionCount() !== 1 || this.selectedShape()?.id !== shape.id) {
      this.recentSelectedShapeTap.set(null);
      return null;
    }

    const bounds = this.shapeBounds(shape);
    if (!bounds) {
      this.recentSelectedShapeTap.set(null);
      return null;
    }

    const mergeId = shape.mergeId ?? crypto.randomUUID();

    const textShape = this.applyInsertionDefaults({
      id: crypto.randomUUID(),
      name: this.t('text'),
      kind: 'text',
      stroke: 'none',
      strokeOpacity: 1,
      strokeWidth: 0,
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.bottom + bounds.top) / 2,
      text: this.t('text'),
      textBox: false,
      boxWidth: DEFAULT_TEXT_BOX_WIDTH,
      fontSize: DEFAULT_TEXT_FONT_SIZE,
      color: DEFAULT_TEXT_COLOR,
      colorOpacity: 1,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'center',
      rotation: 0,
      mergeId
    }) as TextCanvasShape;

    this.runSceneMutation(() => {
      if (shape.mergeId !== mergeId) {
        this.store.replaceShapes([{ ...shape, mergeId }]);
      }
      this.store.addShapes([textShape]);
      this.store.bringSelectedToFront();
      this.inspectorTab.set('properties');
    });
    this.ignoreNextShapeClickId.set(shape.id);
    this.ignoreNextCanvasClick.set(true);
    this.recentSelectedShapeTap.set(null);
    return textShape;
  }

  private focusInlineTextInput(): void {
    afterNextRender(() => {
      const runSelection = () => {
        const input = this.inlineTextInput()?.nativeElement;
        if (!input) {
          return;
        }

        input.focus({ preventScroll: true });
        const end = input.value.length;
        input.setSelectionRange(0, end, 'forward');
        input.select();
      };

      const view = this.document.defaultView;
      if (!view) {
        runSelection();
        return;
      }

      view.requestAnimationFrame(() => {
        runSelection();
        view.setTimeout(runSelection, 0);
      });
    });
  }

  displayTextLinesForShape(shape: TextShape): readonly string[] {
    return displayTextLinesForShape(shape);
  }

  textSymbolGroupLabel(label: string): string {
    return this.t(`textSymbolGroup.${label.toLowerCase()}`);
  }

  textAnchor(align: TextAlign): SvgTextAnchor {
    if (align === 'left') {
      return 'start';
    }
    if (align === 'right') {
      return 'end';
    }
    return 'middle';
  }

  textRenderX(shape: TextShape): number {
    return this.textRenderXAt(shape, (value) => this.toSvgX(value), this.preferences().scale);
  }

  textInputAlign(align: TextAlign): CssTextAlign {
    return align;
  }

  isTextStyleActive(shape: CanvasShape, key: TextStylePropertyKey, value: string): boolean {
    return shape.kind === 'text' && String(shape[key]) === value;
  }

  private insertTextAtCursor(input: HTMLTextAreaElement, symbol: string, onValue: (nextValue: string) => void): void {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const nextValue = `${input.value.slice(0, start)}${symbol}${input.value.slice(end)}`;
    onValue(nextValue);
    afterNextRender(() => {
      input.focus();
      const nextCursor = start + symbol.length;
      input.setSelectionRange(nextCursor, nextCursor);
    });
  }

  private exportFileBaseName(): string {
    return (this.scene().name || 'figure').trim().replace(/[\\/:*?"<>|]+/g, '-');
  }

  private isRepeatedTextTap(shapeId: string): boolean {
    const previousTap = this.recentTextTap();
    return (
      !!previousTap && previousTap.shapeId === shapeId && Date.now() - previousTap.timestamp < TEXT_DOUBLE_TAP_WINDOW_MS
    );
  }

  private isRepeatedSelectedShapeTap(shapeId: string): boolean {
    const previousTap = this.recentSelectedShapeTap();
    return (
      !!previousTap && previousTap.shapeId === shapeId && Date.now() - previousTap.timestamp < TEXT_DOUBLE_TAP_WINDOW_MS
    );
  }

  private textRenderXAt(shape: TextShape, projectX: (value: number) => number, scale: number): number {
    if (!shape.textBox) {
      return projectX(shape.x);
    }
    const width = shape.boxWidth * scale;
    const left = textLeftForWidth(shape, projectX(shape.x), width);
    if (shape.textAlign === 'right') {
      return left + width;
    }
    if (shape.textAlign === 'center') {
      return left + width / 2;
    }
    return left;
  }

  private estimateTextWidth(shape: TextShape, scale: number): number {
    return estimateTextWidth(shape, scale, undefined, this.displayTextLinesForShape(shape));
  }

  private buildCanvasExportDocument(): ExportSvgDocument {
    return buildCanvasExportDocumentUtil({
      selectedShapes: this.selectedShapes(),
      sceneShapes: this.scene().shapes,
      theme: this.preferences().theme,
      helpers: {
        computeBounds: (shapes) => this.computeBounds(shapes),
        buildLinePath: (shape, mapPoint) => this.buildLinePath(shape, mapPoint),
        displayTextLinesForShape: (shape) => this.displayTextLinesForShape(shape),
        textRenderXAt: (shape, projectX, scale) => this.textRenderXAt(shape, projectX, scale),
        textAnchor: (align) => this.textAnchor(align),
        arrowMarkerId: (shape, side) => this.arrowMarkerId(shape, side),
        arrowMarkerViewBox: (shape) => this.arrowMarkerViewBox(shape),
        arrowMarkerWidth: (shape) => this.arrowMarkerWidth(shape),
        arrowMarkerHeight: (shape) => this.arrowMarkerHeight(shape),
        arrowMarkerRefX: (shape, side) => this.arrowMarkerRefX(shape, side),
        arrowMarkerRefY: (shape) => this.arrowMarkerRefY(shape),
        arrowMarkerPath: (shape) => this.arrowMarkerPath(shape),
        arrowMarkerFill: (shape) => this.arrowMarkerFill(shape),
        arrowMarkerStrokeLineJoin: (shape) => this.arrowMarkerStrokeLineJoin(shape),
        arrowMarkerStrokeLineCap: (shape) => this.arrowMarkerStrokeLineCap(shape)
      }
    });
  }
}
