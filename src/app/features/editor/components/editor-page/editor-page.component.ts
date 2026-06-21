import { DOCUMENT } from '@angular/common';
import type { ElementRef } from '@angular/core';
import { afterNextRender, afterRenderEffect, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal, viewChild } from '@angular/core';
import packageManifest from '../../../../../../package.json';
import {
  DEFAULT_ARROW_TIP_LENGTH,
  DEFAULT_ARROW_TIP_WIDTH,
  EDITOR_AI_SELECTION_COLOR,
  DEFAULT_EDITOR_SCALE,
  DEFAULT_TEXT_BOX_WIDTH,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_FONT_SIZE,
  EDITOR_CANVAS_DEFAULT_HEIGHT,
  EDITOR_CANVAS_MIN_HEIGHT,
  EDITOR_CANVAS_MIN_WIDTH,
  EDITOR_COARSE_LINE_ATTACHMENT_PREVIEW_RADIUS_PX,
  EDITOR_COARSE_LINE_ATTACHMENT_SNAP_RADIUS_PX,
  EDITOR_COLLAPSED_SIDEBAR_SIZE,
  EDITOR_CONTEXT_MENU_SUPPRESSION_MS,
  EDITOR_CONTEXT_MENU_VIEWPORT_PADDING,
  EDITOR_CORNER_RADIUS_HANDLE_INSET_FACTOR,
  EDITOR_DEFAULT_SLIDER_RANGE,
  EDITOR_IMAGE_ASPECT_RATIO_EPSILON,
  EDITOR_IMAGE_INSERT_MAX_RENDERED_LONG_EDGE_PX,
  EDITOR_IMAGE_INSERT_MIN_RENDERED_LONG_EDGE_PX,
  EDITOR_IMAGE_INSERT_VIEWPORT_RATIO,
  EDITOR_INLINE_TEXT_EDITOR_METRICS,
  EDITOR_KEYBOARD_NAVIGATION_BASE_SPEED,
  EDITOR_KEYBOARD_NAVIGATION_FAST_MULTIPLIER,
  EDITOR_KEYBOARD_NAVIGATION_SNAP_SPEED_MULTIPLIER,
  EDITOR_LEFT_SIDEBAR_MIN_WIDTH,
  EDITOR_LEFT_SIDEBAR_MOBILE_MIN_HEIGHT,
  EDITOR_LINE_ANCHOR_DECIMALS,
  EDITOR_LINE_ARROW_SCALE_MAX,
  EDITOR_LINE_ARROW_SCALE_MIN,
  EDITOR_LINE_ATTACHMENT_PREVIEW_RADIUS_PX,
  EDITOR_LINE_ATTACHMENT_SNAP_RADIUS_PX,
  EDITOR_LINE_HIT_STROKE_EXTRA_PX,
  EDITOR_LINE_HIT_STROKE_MIN_PX,
  EDITOR_LINE_MARQUEE_TOLERANCE_PX,
  EDITOR_MOBILE_BREAKPOINT_PX,
  EDITOR_MOBILE_SIDEBAR_DEFAULT_HEIGHT,
  EDITOR_NOTIFICATION_DURATION_MS,
  EDITOR_PASTE_OFFSET_STEP,
  EDITOR_PNG_EXPORT_SCALE,
  EDITOR_POINTER_TAP_MAX_DISTANCE_PX,
  EDITOR_RIGHT_SIDEBAR_DESKTOP_STACKED_MIN_HEIGHT,
  EDITOR_RIGHT_SIDEBAR_MIN_WIDTH,
  EDITOR_RIGHT_SIDEBAR_MOBILE_MIN_HEIGHT,
  EDITOR_ROTATION_SNAP_STEP_DEGREES,
  EDITOR_SCALE_DECIMAL_FACTOR,
  EDITOR_SCALE_MAX,
  EDITOR_SCALE_MIN,
  EDITOR_SELECTION_HANDLE_SIZE_BY_POINTER,
  EDITOR_SELECTION_ROTATE_HANDLE_DISTANCE_FACTOR,
  EDITOR_SELECTION_ROTATE_HANDLE_MIN_DISTANCE,
  EDITOR_SIDEBAR_OVERLAY_BREAKPOINT_PX,
  EDITOR_SIDEBAR_RESIZE_LIMITS,
  EDITOR_STORAGE_KEYS,
  EDITOR_TEXT_SYMBOL_PALETTE_DEFAULT_MAX_HEIGHT,
  EDITOR_TEXT_SYMBOL_POPOVER_METRICS,
  EDITOR_THEME_TOGGLE_COOLDOWN_MS,
  EDITOR_VIEWPORT_CENTER_EPSILON,
  EDITOR_VIEWPORT_FALLBACK_WIDTH,
  EDITOR_WHEEL_LINE_HEIGHT_PX,
  EDITOR_WHEEL_PAGE_HEIGHT_FALLBACK,
  EDITOR_WHEEL_ROTATION_MAX_STEP_DEGREES,
  EDITOR_WHEEL_ROTATION_MIN_STEP_DEGREES,
  EDITOR_WHEEL_ROTATION_SCALE,
  EDITOR_WHEEL_ZOOM_SENSITIVITY,
  EDITOR_ZOOM_STEP,
  FREEHAND_POINT_MIN_DISTANCE,
  LINE_DASH_DOTTED_PATTERN,
  LINE_DASHED_PATTERN,
  LINE_DOTTED_PATTERN,
  LINE_LOOSELY_DASHED_PATTERN,
  MIN_IMAGE_DIMENSION,
  MIN_POINTER_DRAG_DELTA,
  MIN_SHAPE_DIMENSION,
  MIN_TEXT_BOX_WIDTH,
  MIN_TEXT_FONT_SIZE,
  MIN_TEXT_RESIZE_HEIGHT,
  MIN_TEXT_RESIZE_WIDTH,
  OPACITY_MAX,
  OPACITY_MIN,
  SLIDER_DECIMAL_PLACES,
  TEXT_DOUBLE_TAP_WINDOW_MS,
  TEXT_MIN_HEIGHT_FACTOR
} from '../../constants/editor.constants';
import { getIconPath, iconPaths } from '../../config/editor-icons';
import { ARROW_TIP_OPTIONS, arrowTipIconFilled as isSharedArrowTipIconFilled } from '../../config/arrow-tip.config';
import { LINE_STROKE_STYLE_OPTIONS } from '../../config/line-stroke-style.config';
import type { Axis, LineAttachmentCandidate } from './editor-page.types';
import {
  type ArrowControlHandle,
  type ArrowDirection,
  type ArrowEndpoint,
  type ArrowScaleKind,
  type ClipboardShapeSet,
  type ContextMenuState,
  type CssTextAlign,
  type ExportMode,
  type ExportSvgDocument,
  type HandleDescriptor,
  type ImageDimensionKey,
  type ImageTextKey,
  type InlineTextEditorState,
  type InspectorTab,
  type InteractionState,
  type LatexAlignment,
  type LibrarySection,
  type LineAttachmentPreviewDescriptor,
  type LineBooleanKey,
  type LineCanvasShape,
  type LineEndpoint,
  type MultiEditSelectionInfo,
  type NotificationTone,
  type PinchZoomState,
  type RecentTextTap,
  type RectangleCanvasShape,
  type ResizeCursor,
  type ResizeHandle,
  type SavedTemplate,
  type SceneReplaceDialogState,
  type ShapeOpacityKey,
  type ShapeTextKey,
  type SidebarResizeState,
  type SidebarResizeTarget,
  type SidebarSide,
  type SvgTextAnchor,
  type TemplateDialogTextKey,
  type TextCanvasShape,
  type TextStyleKey,
  type TextStylePropertyKey,
  type TextSymbolGroup,
  type TextSymbolPalettePosition,
  type TextTransformMode,
  type ToastNotification,
  type ToolDescriptor,
  type TriangleCanvasShape
} from './editor-page.types';
import { EditorTopbarComponent } from '../editor-topbar/editor-topbar.component';
import { EditorLeftSidebarComponent } from '../editor-left-sidebar/editor-left-sidebar.component';
import { EditorRightSidebarComponent } from '../editor-right-sidebar/editor-right-sidebar.component';
import { EditorCanvasToolbarComponent } from '../editor-canvas-toolbar/editor-canvas-toolbar.component';
import { TableDialogComponent } from '../table-dialog/table-dialog.component';
import { ImportCodeModalComponent } from '../import-code-modal/import-code-modal.component';
import { ExportModalComponent } from '../export-modal/export-modal.component';
import { AppConfigurationDialogComponent, type ApplicationConfigurationTab } from '../app-configuration-dialog/app-configuration-dialog.component';
import { RangeInputCardComponent } from '../range-input-card/range-input-card.component';
import { RegularPolygonDialogComponent } from '../regular-polygon-dialog/regular-polygon-dialog.component';
import { GraphDialogComponent } from '../graph-dialog/graph-dialog.component';
import { FigureSearchOverlayComponent } from '../figure-search-overlay/figure-search-overlay.component';
import { AiPanelComponent } from '../ai-panel/ai-panel.component';
import { ImportReplaceDialogComponent } from '../import-replace-dialog/import-replace-dialog.component';
import { EditorMinimapComponent } from '../editor-minimap/editor-minimap.component';
import { AiSparklesIconComponent } from '../ai-sparkles-icon/ai-sparkles-icon.component';
import { AiIntroFlightComponent } from '../ai-intro-flight/ai-intro-flight.component';
import { AppSelectComponent, type AppSelectOption } from '../../../../shared/app-select/app-select.component';
import { BadgeComponent } from '../../../../shared/badge/badge.component';
import { ToggleFieldComponent } from '../../../../shared/toggle-field/toggle-field.component';
import { categoryOrder, categoryTranslationKey, type SharedScenePayload } from '../../i18n/editor-page.i18n';
import { EditorLanguageService } from '../../i18n/editor-language.service';
import { EditorTranslatePipe } from '../../i18n/editor-translate.pipe';
import {
  decodeSharePayload,
  encodeSharePayload,
  type SelectionBounds,
  transformCanvasShape,
  type TransformCanvasShapeOptions,
  translateShapeBy,
  viewportCenterAfterHorizontalResize
} from '../../utils/editor-page.utils';
import { resizeSelection, resizeShape as resizeShapeUtil } from '../../utils/editor-resize.utils';
import { buildCanvasExportDocument as buildCanvasExportDocumentUtil, svgMarkupDataUrl } from '../../utils/editor-export-svg.utils';
import { parseCollapsedSectionsFromStorage, parsePinnedToolIdsFromStorage, parseSavedTemplatesFromStorage } from '../../utils/editor-storage.utils';
import { buildProjectJsonExport } from '../../utils/editor-project-json.utils';
import {
  selectionContainsShape as selectionContainsShapeUtil,
  shapeSetIds as shapeSetIdsUtil,
  toggledShapeSetSelection
} from '../../utils/editor-selection.utils';
import {
  arrowNavigationDeltaFromKeys,
  arrowNavigationKeyFromKey,
  isCopyShortcut,
  isCutShortcut,
  isDeleteShortcut,
  isEscapeShortcutKey,
  isFigureSearchShortcut,
  isOpenSettingsShortcut,
  isOpenImportShortcut,
  isPasteShortcut,
  isRedoShortcut,
  isSelectAllShortcut,
  isSelectionModifierPressed,
  isUndoShortcut,
  isZoomInShortcut,
  isZoomOutShortcut,
  keyboardShortcutForAction,
  keyboardShortcutLabel,
  type KeyboardShortcutAction,
  type ModifierKey,
  pressedModifierFromKey,
  toolIdFromShortcutEvent
} from '../../utils/editor-keyboard.utils';
import { buildTablePresetShapes, localizePresetCanvasShapes as localizePresetTemplateShapes } from '../../presets/presets';
import { sceneToTikzBundle, type TikzExportOptions } from '../../tikz/tikz.codegen';
import { EditorStore } from '../../state/editor.store';
import { EditorLocalStorageService } from '../../state/editor-local-storage.service';
import { CodeHighlightThemeService } from '../../state/code-highlight-theme.service';
import { AppThemeService } from '../../state/app-theme.service';
import { EditorDevModeService } from '../../state/editor-dev-mode.service';
import { ScenePatchService } from '../../ai/scene-patch.service';
import { DEFAULT_TABLE_DIMENSIONS, type TableDialogState, type TableDimensions, type TableSelectionInfo } from '../../models/table.models';
import {
  DEFAULT_REGULAR_POLYGON_DIMENSIONS,
  REGULAR_POLYGON_MAX_SIDES,
  REGULAR_POLYGON_MIN_SIDES,
  REGULAR_POLYGON_PRESET_ID,
  type RegularPolygonDialogState,
  type RegularPolygonDimensions
} from '../../models/regular-polygon.models';
import { buildRegularPolygonShapes, normalizeRegularPolygonDimensions } from '../../utils/regular-polygon.utils';
import {
  DEFAULT_GRAPH_DIMENSIONS,
  GRAPH_PRESET_ID_BY_KIND,
  GRAPH_PRESET_IDS,
  GRAPH_PRESET_KIND_BY_ID,
  type GraphDialogState,
  type GraphDimensions,
  type GraphPresetId
} from '../../models/graph.models';
import { buildGraphShapes, normalizeGraphDimensions } from '../../utils/graph.utils';
import { EditorConfigurationService, type EditorContextMenuAction as ContextAction } from '../../state/editor-configuration.service';
import { buildTableShapes, getTableSelectionInfo, normalizeTableDimensions, remapStructuralShapeIds, tableSizeLabel } from '../../utils/table.utils';
import {
  arrowMarkerFill as arrowMarkerFillUtil,
  arrowMarkerGeometry as arrowMarkerGeometryUtil,
  arrowMarkerViewportScale,
  arrowRenderedHalfWidth as arrowRenderedHalfWidthUtil,
  arrowRenderedLength as arrowRenderedLengthUtil,
  arrowTipLength as arrowTipLengthUtil,
  arrowTipWidth as arrowTipWidthUtil,
  renderedStrokeWidthForScale,
  zoomScaledArrowStrokeWidth
} from '../../utils/editor-arrow.utils';
import type { ImportDialogResult } from '../../import/import-sources';
import type {
  ArrowTipKind,
  CanvasShape,
  EditorSyncMessage,
  LineEndpointAttachment,
  LineShape,
  LineStrokeStyle,
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
  cornerRadiusHandlePoint as cornerRadiusHandlePointUtil,
  cornerRadiusFromPointer as cornerRadiusFromPointerUtil,
  effectiveRectangleCornerRadius as effectiveRectangleCornerRadiusUtil,
  effectiveTriangleCornerRadius as effectiveTriangleCornerRadiusUtil,
  linePoints as linePointsUtil,
  maxRectangleCornerRadius as maxRectangleCornerRadiusUtil,
  maxTriangleCornerRadius as maxTriangleCornerRadiusUtil,
  normalizeRotationDegrees as normalizeRotationDegreesUtil,
  pointInTriangleShape as pointInTriangleShapeUtil,
  rotatePointAround as rotatePointAroundUtil,
  rotateShapeAround as rotateShapeAroundUtil,
  shapeBounds as shapeBoundsUtil,
  shapeCenter as shapeCenterUtil,
  shapeRotation as shapeRotationUtil,
  triangleCornerAttachmentAnchors as triangleCornerAttachmentAnchorsUtil,
  triangleCornerAttachmentPointFromAnchor as triangleCornerAttachmentPointFromAnchorUtil,
  triangleOutlinePoints as triangleOutlinePointsUtil,
  trianglePoints as trianglePointsUtil
} from '../../utils/editor-geometry.utils';
import { displayTextLinesForShape, textLeftForWidth } from '../../utils/text.utils';
import { REGEX } from '../../../../shared/regex/regex.utils';

@Component({
  selector: 'app-editor-page',
  imports: [
    EditorTopbarComponent,
    EditorLeftSidebarComponent,
    EditorRightSidebarComponent,
    EditorCanvasToolbarComponent,
    TableDialogComponent,
    ImportCodeModalComponent,
    ExportModalComponent,
    AppConfigurationDialogComponent,
    RangeInputCardComponent,
    RegularPolygonDialogComponent,
    GraphDialogComponent,
    FigureSearchOverlayComponent,
    AiPanelComponent,
    ImportReplaceDialogComponent,
    EditorMinimapComponent,
    AiSparklesIconComponent,
    AiIntroFlightComponent,
    AppSelectComponent,
    BadgeComponent,
    ToggleFieldComponent,
    EditorTranslatePipe
  ],
  templateUrl: './editor-page.component.html',
  styleUrl: './editor-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [EditorStore, EditorConfigurationService, ScenePatchService],
  host: {
    '[attr.data-theme]': 'store.preferences().theme',
    '[attr.data-tooltip-disabled]': 'configuration.generalConfig().showHelpTooltips ? null : ""',
    '(window:keydown)': 'handleWindowKeydown($event)',
    '(window:paste)': 'handleWindowPaste($event)',
    '(window:keyup)': 'handleWindowKeyup($event)',
    '(window:blur)': 'handleWindowBlur()',
    '(window:pointermove)': 'handleWindowPointerMove($event)',
    '(window:pointerup)': 'handleWindowPointerUp()',
    '(focusout)': 'handleFocusOut($event)'
  }
})
export class EditorPageComponent {
  private readonly savedTemplatesStorageKey = EDITOR_STORAGE_KEYS.savedTemplates;
  private readonly pinnedToolsStorageKey = EDITOR_STORAGE_KEYS.pinnedTools;
  private readonly sidebarSizesStorageKey = EDITOR_STORAGE_KEYS.sidebarSizes;
  private readonly librarySectionsStorageKey = EDITOR_STORAGE_KEYS.librarySections;
  private readonly editorStateStorageKey = EDITOR_STORAGE_KEYS.state;
  private readonly editorSyncStorageKey = EDITOR_STORAGE_KEYS.syncState;
  private readonly syncClientId = crypto.randomUUID();
  readonly defaultScale = DEFAULT_EDITOR_SCALE;
  readonly store = inject(EditorStore);
  readonly configuration = inject(EditorConfigurationService);
  readonly aiPatch = inject(ScenePatchService);
  readonly devMode = inject(EditorDevModeService);
  private readonly codeHighlightThemeService = inject(CodeHighlightThemeService);
  private readonly appThemeService = inject(AppThemeService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly editorStorage = inject(EditorLocalStorageService);
  private readonly languageService = inject(EditorLanguageService);

  readonly canvasSvg = viewChild.required<ElementRef<SVGSVGElement>>('canvasSvg');
  readonly canvasViewport = viewChild.required<ElementRef<HTMLDivElement>>('canvasViewport');
  readonly printCanvasDataUrl = computed(() => svgMarkupDataUrl(this.buildCanvasExportDocument(false, []).markup));
  readonly contextMenuPanel = viewChild<ElementRef<HTMLDivElement>>('contextMenuPanel');
  readonly inlineTextInput = viewChild<ElementRef<HTMLTextAreaElement>>('inlineTextInput');
  readonly inspectorTextInput = viewChild<ElementRef<HTMLTextAreaElement>>('inspectorTextInput');
  readonly layersSection = viewChild<ElementRef<HTMLElement>>('layersSection');
  readonly rightSidebar = viewChild(EditorRightSidebarComponent);
  readonly importReplaceDialog = viewChild.required(ImportReplaceDialogComponent);

  readonly appVersion = packageManifest.version;
  readonly editorApi = this;
  readonly scene = this.store.scene;
  readonly preferences = this.store.preferences;
  readonly selectedShape = this.store.selectedShape;
  readonly selectedShapes = this.store.selectedShapes;
  readonly selectionCount = this.store.selectionCount;
  readonly singleSelectedTriangle = computed<TriangleCanvasShape | null>(() => {
    if (this.selectionCount() !== 1) {
      return null;
    }

    const selectedShape = this.selectedShape();
    return selectedShape?.kind === 'triangle' ? selectedShape : null;
  });
  readonly parserWarnings = this.store.parserWarnings;
  readonly objectPresets = this.store.objectPresets;
  readonly scenePresets = this.store.scenePresets;
  readonly objectCount = this.store.objectCount;
  readonly canUndo = this.store.canUndo;
  readonly canRedo = this.store.canRedo;

  readonly language = this.languageService.language;
  readonly inspectorTab = signal<InspectorTab>('properties');
  readonly activeTool = signal<string>('select');
  readonly viewportCenter = signal<Point>({ x: 0, y: 0 });
  readonly canvasWidth = signal(EDITOR_VIEWPORT_FALLBACK_WIDTH);
  readonly canvasHeight = signal(EDITOR_CANVAS_DEFAULT_HEIGHT);
  readonly canvasViewportWidth = signal(EDITOR_VIEWPORT_FALLBACK_WIDTH);
  readonly interactionState = signal<InteractionState | null>(null);
  readonly contextMenu = signal<ContextMenuState | null>(null);
  readonly contextMenuPosition = signal<{ readonly left: number; readonly top: number } | null>(null);
  readonly fileMenuOpen = signal(false);
  readonly exportModalOpen = signal(false);
  readonly importModalOpen = signal(false);
  readonly appConfigurationDialogOpen = signal(false);
  readonly appConfigurationInitialTab = signal<ApplicationConfigurationTab>('general');
  readonly reopenExportAfterConfiguration = signal(false);
  readonly exportMode = signal<ExportMode>('snippet');
  readonly codeHighlightTheme = this.configuration.codeHighlightTheme;
  readonly latexExportConfig = this.configuration.latexExportConfig;
  readonly savedTemplates = signal<readonly SavedTemplate[]>([]);
  readonly pinnedToolIds = signal<readonly string[]>([]);
  readonly pinnedToolsReady = signal(false);
  readonly libraryQuery = signal('');
  readonly shareFeedback = signal('');
  readonly shareFeedbackTone = signal<NotificationTone>('info');
  readonly notifications = signal<readonly ToastNotification[]>([]);
  readonly aiSelectionColor = EDITOR_AI_SELECTION_COLOR;
  readonly figureSearchOpen = signal(false);
  readonly figureSearchShortcutLabel = computed(() => this.shortcutLabel('figureSearch'));
  readonly selectedImageFilename = signal('');
  readonly templateDialogOpen = signal(false);
  readonly templateDialogMode = signal<'create' | 'edit'>('create');
  readonly editingTemplateId = signal<string | null>(null);
  readonly tableDialogState = signal<TableDialogState | null>(null);
  readonly tablePresetDimensions = signal<TableDimensions>(DEFAULT_TABLE_DIMENSIONS);
  readonly regularPolygonDialogState = signal<RegularPolygonDialogState | null>(null);
  readonly regularPolygonDimensions = signal<RegularPolygonDimensions>(DEFAULT_REGULAR_POLYGON_DIMENSIONS);
  readonly graphDialogState = signal<GraphDialogState | null>(null);
  readonly graphDimensions = signal<GraphDimensions>(DEFAULT_GRAPH_DIMENSIONS);
  readonly regularPolygonMinSides = REGULAR_POLYGON_MIN_SIDES;
  readonly regularPolygonMaxSides = REGULAR_POLYGON_MAX_SIDES;
  readonly regularPolygonFigureName = (sides: number): string => this.regularPolygonName(sides);
  readonly templateTitleInput = signal('');
  readonly templateDescriptionInput = signal('');
  readonly templateIconInput = signal('library');
  readonly templateUseCurrentSelection = signal(true);
  readonly templateDeleteTarget = signal<SavedTemplate | null>(null);
  readonly inlineTextEditor = signal<InlineTextEditorState | null>(null);
  readonly textSymbolPaletteOpen = signal(false);
  readonly textSymbolPalettePosition = signal<TextSymbolPalettePosition>({
    top: 0,
    left: 0,
    maxHeight: EDITOR_TEXT_SYMBOL_PALETTE_DEFAULT_MAX_HEIGHT
  });
  readonly recentTextTap = signal<RecentTextTap | null>(null);
  readonly recentSelectedShapeTap = signal<RecentTextTap | null>(null);
  readonly suppressContextMenuUntil = signal(0);
  readonly suppressNextContextMenu = signal(false);
  readonly clipboardShapes = signal<ClipboardShapeSet | null>(null);
  readonly ignoreNextShapeClickId = signal<string | null>(null);
  private readonly initialSidebarSizes = this.restoreSidebarSizes();
  readonly leftSidebarWidth = signal(this.initialSidebarSizes.left);
  readonly rightSidebarWidth = signal(this.initialSidebarSizes.right);
  readonly mobileRightSidebarHeight = signal(EDITOR_MOBILE_SIDEBAR_DEFAULT_HEIGHT);
  readonly mobileLeftSidebarHeight = signal(EDITOR_MOBILE_SIDEBAR_DEFAULT_HEIGHT);
  readonly sidebarResizeState = signal<SidebarResizeState | null>(null);
  readonly coarsePointer = signal(false);
  readonly mobileLayout = signal(false);
  readonly sidebarsOverlayLayout = signal(false);
  readonly mobileLibraryPanelOpen = signal(false);
  readonly leftSidebarCollapsed = signal(false);
  readonly rightSidebarCollapsed = signal(false);
  readonly inspectorPanelVisible = computed(() => !this.configuration.generalConfig().showInspectorOnlyWithSelection || this.selectionCount() > 0);
  private readonly librarySectionIds = new Set<string>(['savedTemplates', 'scenePresets', ...categoryOrder]);
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
    layers: false,
    ...this.restoredLibrarySectionState()
  });
  readonly spacePressed = signal(false);
  readonly shiftPressed = signal(false);
  readonly controlPressed = signal(false);
  readonly metaPressed = signal(false);
  readonly altPressed = signal(false);
  readonly ignoreNextCanvasClick = signal(false);
  readonly iconMap = iconPaths;
  readonly figureSearchPresetTitle = (preset: ObjectPreset): string => this.presetTitle(preset);
  readonly figureSearchPresetDescription = (preset: ObjectPreset): string => this.presetDescription(preset);
  readonly textSymbolGroups: readonly TextSymbolGroup[] = [
    {
      label: 'Greek',
      symbols: [
        { label: 'α', insert: String.raw`\alpha`, title: 'alpha' },
        { label: 'β', insert: String.raw`\beta`, title: 'beta' },
        { label: 'γ', insert: String.raw`\gamma`, title: 'gamma' },
        { label: 'δ', insert: String.raw`\delta`, title: 'delta' },
        { label: 'ε', insert: String.raw`\epsilon`, title: 'epsilon' },
        { label: 'θ', insert: String.raw`\theta`, title: 'theta' },
        { label: 'λ', insert: String.raw`\lambda`, title: 'lambda' },
        { label: 'μ', insert: String.raw`\mu`, title: 'mu' },
        { label: 'π', insert: String.raw`\pi`, title: 'pi' },
        { label: 'σ', insert: String.raw`\sigma`, title: 'sigma' },
        { label: 'φ', insert: String.raw`\phi`, title: 'phi' },
        { label: 'ω', insert: String.raw`\omega`, title: 'omega' }
      ]
    },
    {
      label: 'Arrows',
      symbols: [
        { label: '←', insert: String.raw`\leftarrow`, title: 'left arrow' },
        { label: '→', insert: String.raw`\rightarrow`, title: 'right arrow' },
        { label: '↑', insert: String.raw`\uparrow`, title: 'up arrow' },
        { label: '↓', insert: String.raw`\downarrow`, title: 'down arrow' },
        { label: '↔', insert: String.raw`\leftrightarrow`, title: 'left-right arrow' },
        { label: '⇒', insert: String.raw`\Rightarrow`, title: 'double right arrow' },
        { label: '⇐', insert: String.raw`\Leftarrow`, title: 'double left arrow' },
        { label: '⇔', insert: String.raw`\Leftrightarrow`, title: 'double left-right arrow' }
      ]
    },
    {
      label: 'Math',
      symbols: [
        { label: '×', insert: String.raw`\times`, title: 'times' },
        { label: '÷', insert: String.raw`\div`, title: 'divide' },
        { label: '±', insert: String.raw`\pm`, title: 'plus minus' },
        { label: '∞', insert: String.raw`\infty`, title: 'infinity' },
        { label: '∑', insert: String.raw`\sum`, title: 'sum' },
        { label: '∏', insert: String.raw`\prod`, title: 'product' },
        { label: '∫', insert: String.raw`\int`, title: 'integral' },
        { label: '∂', insert: String.raw`\partial`, title: 'partial' }
      ]
    },
    {
      label: 'Logic',
      symbols: [
        { label: '∀', insert: String.raw`\forall`, title: 'for all' },
        { label: '∃', insert: String.raw`\exists`, title: 'exists' },
        { label: '∈', insert: String.raw`\in`, title: 'belongs to' },
        { label: '∉', insert: String.raw`\notin`, title: 'not belongs to' },
        { label: '∪', insert: String.raw`\cup`, title: 'union' },
        { label: '∩', insert: String.raw`\cap`, title: 'intersection' }
      ]
    }
  ];
  readonly arrowTipOptions = ARROW_TIP_OPTIONS;
  readonly lineStrokeStyleOptions = LINE_STROKE_STYLE_OPTIONS;
  readonly lineStrokeStyleSelectOptions = computed<readonly AppSelectOption[]>(() =>
    this.lineStrokeStyleOptions.map((style) => ({
      value: style.id,
      label: this.t(style.labelKey),
      iconPath: style.iconPath
    }))
  );
  readonly arrowDirectionSelectOptions = computed<readonly AppSelectOption[]>(() => [
    { value: 'none', label: this.t('arrowDirectionNone'), iconPath: 'M5 12h14' },
    { value: 'forward', label: this.t('arrowDirectionForward'), iconPath: iconPaths.arrow },
    { value: 'backward', label: this.t('arrowDirectionBackward'), iconPath: 'M19 12H8m0 0 3-3m-3 3 3 3' },
    { value: 'both', label: this.t('arrowDirectionBoth'), iconPath: 'M8 12h8M8 12l3-3m-3 3 3 3m5-3-3-3m3 3-3 3' }
  ]);
  readonly lineModeSelectOptions = computed<readonly AppSelectOption[]>(() => [
    { value: 'straight', label: this.t('lineModeStraight'), iconPath: iconPaths.segment },
    { value: 'curved', label: this.t('lineModeCurved'), iconPath: 'M5 16C8 7 16 17 19 8' }
  ]);
  readonly arrowBendModeSelectOptions = computed<readonly AppSelectOption[]>(() => [
    { value: 'none', label: this.t('arrowBendNone'), iconPath: 'M4 12h16' },
    { value: 'flex', label: this.t('arrowBendFlex'), iconPath: 'M4 16C8 7 16 7 20 16' },
    { value: 'flex-prime', label: this.t('arrowBendFlexPrime'), iconPath: 'M4 8C8 17 16 17 20 8' },
    { value: 'bend', label: this.t('arrowBendBend'), iconPath: 'M4 16Q12 4 20 16' }
  ]);
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
  readonly selectionModifierPressed = computed(() => this.shiftPressed() || this.controlPressed() || this.metaPressed());
  readonly selectedTable = computed<TableSelectionInfo | null>(() => getTableSelectionInfo(this.selectedShapes()));
  readonly multiEditSelection = computed<MultiEditSelectionInfo | null>(() => {
    if (this.selectionCount() < 2 || this.selectedTable()) {
      return null;
    }

    const shapes = this.selectedShapes();
    const firstShape = shapes[0];
    if (!firstShape) {
      return null;
    }

    return {
      kind: this.multiEditSelectionKind(shapes),
      shapes,
      capabilities: this.multiEditCapabilities(shapes)
    };
  });
  readonly multiEditShape = computed<CanvasShape | null>(() => this.multiEditSelection()?.shapes[0] ?? null);
  readonly isViewportCentered = computed(() => {
    const viewportCenter = this.viewportCenter();
    return Math.abs(viewportCenter.x) <= EDITOR_VIEWPORT_CENTER_EPSILON && Math.abs(viewportCenter.y) <= EDITOR_VIEWPORT_CENTER_EPSILON;
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
  readonly canUngroupSelection = computed(() => this.selectedMergeIds().length > 0 || this.selectedShapes().some((shape) => !!shape.table));
  readonly activePreset = computed(() => this.allInsertablePresets().find((preset) => preset.id === this.activeTool()) ?? null);
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
  readonly gridColumns = computed(() => {
    const visibleWorldBounds = this.visibleWorldBounds();
    const gridStep = 1;
    const start = Math.floor(visibleWorldBounds.left / gridStep) - 1;
    const end = Math.ceil(visibleWorldBounds.right / gridStep) + 1;
    return Array.from({ length: end - start + 1 }, (_, index) => (start + index) * gridStep);
  });
  readonly gridRows = computed(() => {
    const visibleWorldBounds = this.visibleWorldBounds();
    const gridStep = 1;
    const start = Math.floor(visibleWorldBounds.bottom / gridStep) - 1;
    const end = Math.ceil(visibleWorldBounds.top / gridStep) + 1;
    return Array.from({ length: end - start + 1 }, (_, index) => (start + index) * gridStep);
  });
  readonly sceneContentBounds = computed(() => this.computeBounds(this.scene().shapes));
  readonly xSliderRange = computed(() => this.sliderRange('x'));
  readonly ySliderRange = computed(() => this.sliderRange('y'));
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

    const metrics = EDITOR_INLINE_TEXT_EDITOR_METRICS;
    const fontSize = Math.max(shape.fontSize * this.preferences().scale, metrics.minFontSize);
    const lines = this.displayTextLinesForShape({ ...shape, text: editor.value });
    const paddingX = Math.max(metrics.minPaddingX, fontSize * 0.08);
    const paddingY = Math.max(metrics.minPaddingY, fontSize * 0.08);
    const width = shape.textBox
      ? Math.max(shape.boxWidth * this.preferences().scale, metrics.minBoxWidth)
      : Math.max(
          ...lines.map((line) => Math.max(line.length * fontSize * metrics.characterWidthFactor, fontSize * metrics.minLineWidthFactor, metrics.minLineWidth))
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
  readonly defaultToolbarTools = computed<readonly ToolDescriptor[]>(() => {
    const quickPresetOrder: readonly string[] = ['segment', 'arrow', 'box', 'triangle', 'circle', 'ellipse', 'label', 'image'];
    const quickPresets = this.allInsertablePresets().filter((preset) => preset.quickAccess && preset.id !== 'note');
    const orderedQuickPresets = [
      ...quickPresetOrder.map((id) => quickPresets.find((preset) => preset.id === id)).filter((preset): preset is ObjectPreset => !!preset),
      ...quickPresets.filter((preset) => !quickPresetOrder.includes(preset.id))
    ];

    return [
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
      ...orderedQuickPresets.map((preset) => ({
        id: preset.id,
        label: this.presetTitle(preset),
        description: this.presetDescription(preset),
        iconPath: getIconPath(preset.icon),
        iconWidth: preset.iconWidth,
        iconStrokeWidth: preset.iconStrokeWidth,
        shortcut: this.toolShortcut(preset.id)
      }))
    ];
  });
  readonly pinnedToolbarTools = computed<readonly ToolDescriptor[]>(() =>
    this.pinnedToolIds()
      .map((id) => this.allInsertablePresets().find((preset) => preset.id === id))
      .filter((preset): preset is ObjectPreset => !!preset)
      .map((preset) => ({
        id: preset.id,
        label: this.presetTitle(preset),
        description: this.presetDescription(preset),
        iconPath: getIconPath(preset.icon),
        iconWidth: preset.iconWidth,
        iconStrokeWidth: preset.iconStrokeWidth,
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
          const haystack = [this.presetTitle(preset), this.presetDescription(preset), preset.title, preset.description, ...(preset.searchTerms ?? [])]
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
  readonly aiSelectionActive = computed(() => {
    const aiShapeIds = this.aiPatch.pendingAffectedShapeIds();
    const selectedShapeIds = this.store.selectedShapeIds();
    return selectedShapeIds.length > 0 && selectedShapeIds.every((shapeId) => aiShapeIds.includes(shapeId));
  });
  readonly aiSelectionBubbleLayout = computed(() => {
    if (!this.aiSelectionActive() || !this.aiPatch.pendingPatch()) {
      return null;
    }

    const bounds = this.selectionBounds();
    if (!bounds) {
      return null;
    }

    const bubbleWidth = 104;
    const margin = 12;
    const topGap = 64;
    const centerX = this.toSvgX((bounds.left + bounds.right) / 2);
    const top = this.toSvgY(bounds.top);
    return {
      left: Math.min(Math.max(centerX - bubbleWidth / 2, margin), Math.max(margin, this.canvasWidth() - bubbleWidth - margin)),
      top: Math.max(margin, top - topGap),
      width: bubbleWidth
    };
  });
  readonly aiSelectionIconLayout = computed(() => {
    if (!this.aiSelectionActive()) {
      return null;
    }

    const bounds = this.selectionBounds();
    if (!bounds) {
      return null;
    }

    const size = 22;
    return {
      x: this.toSvgX(bounds.right) - size - 6,
      y: this.toSvgY(bounds.top) - size - 6,
      size
    };
  });
  readonly aiSelectionStandaloneIconLayout = computed(() => (this.aiSelectionBubbleLayout() ? null : this.aiSelectionIconLayout()));
  readonly selectionHandles = computed<readonly HandleDescriptor[]>(() => {
    const selectedShapes = this.selectedShapes();
    const singleSelectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null;
    if (!selectedShapes.length) {
      return [];
    }
    const selectionBounds = this.selectionBounds();
    const rotateHandle = selectionBounds && this.selectionCanRotate(selectedShapes) ? this.rotationHandleFromBounds(selectionBounds) : null;
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
    if (singleSelectedShape?.kind === 'triangle') {
      const handles: HandleDescriptor[] = [...this.triangleSelectionHandles(singleSelectedShape)];
      if (this.selectionCanRotate(selectedShapes)) {
        handles.push(this.rotationHandleFromHandles(handles, singleSelectedShape));
      }
      handles.push(...this.cornerRadiusHandles(singleSelectedShape));
      return handles;
    }
    const rotatedSingleShapeHandles = singleSelectedShape ? this.rotatedSingleShapeHandles(singleSelectedShape) : null;
    if (rotatedSingleShapeHandles) {
      const handles: HandleDescriptor[] = [...rotatedSingleShapeHandles];
      if (this.selectionCanRotate(selectedShapes)) {
        handles.push(this.rotationHandleFromHandles(rotatedSingleShapeHandles, singleSelectedShape as CanvasShape));
      }
      if (singleSelectedShape?.kind === 'rectangle') {
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
    if (singleSelectedShape?.kind === 'rectangle') {
      handles.push(...this.cornerRadiusHandles(singleSelectedShape));
    }
    return handles;
  });
  readonly lineAttachmentPreviewHandles = computed<readonly LineAttachmentPreviewDescriptor[]>(() => {
    const interactionState = this.interactionState();
    if (interactionState?.kind === 'insert' && !this.altPressed()) {
      const previewLine = this.insertionPreviewShapes().find((shape): shape is LineCanvasShape => shape.kind === 'line');
      if (!previewLine) {
        return [];
      }

      return [
        ...this.lineAttachmentPreviewHandlesFor(previewLine, 'from', previewLine.from),
        ...this.lineAttachmentPreviewHandlesFor(previewLine, 'to', previewLine.to)
      ];
    }

    const selectedShape = this.selectedShape();
    if (
      interactionState?.kind !== 'resize' ||
      selectedShape?.kind !== 'line' ||
      (interactionState.handle !== 'from' && interactionState.handle !== 'to') ||
      this.altPressed()
    ) {
      return [];
    }

    const endpoint = interactionState.handle;
    const endpointPoint = endpoint === 'from' ? selectedShape.from : selectedShape.to;
    return this.lineAttachmentPreviewHandlesFor(selectedShape, endpoint, endpointPoint);
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
    if (interactionState?.kind !== 'marquee') {
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
    const aiPreviewShapes = this.aiPatch.previewShapes();
    const interactionState = this.interactionState();
    if (interactionState?.kind !== 'insert') {
      if (interactionState?.kind === 'freehand') {
        const line = this.buildFreehandLine(interactionState.points, 'preview-freehand');
        return line ? [...aiPreviewShapes, line] : aiPreviewShapes;
      }
      return aiPreviewShapes;
    }

    return [
      ...aiPreviewShapes,
      ...this.buildInsertionPreviewShapes(interactionState.toolId, interactionState.startWorldPoint, interactionState.currentWorldPoint)
    ];
  });
  readonly exportOptions = computed<TikzExportOptions>(() => ({
    colorMode: this.latexExportConfig().colorMode
  }));
  readonly baseTikzExportBundle = computed(() => sceneToTikzBundle(this.scene(), this.exportOptions()));
  readonly snippetExport = computed(() => this.buildSnippetExport());
  readonly standaloneDocument = computed(() => this.buildStandaloneDocument());
  readonly displayedExportCode = computed(() => (this.exportMode() === 'snippet' ? this.snippetExport().code : this.standaloneDocument()));
  readonly displayedExportImports = computed(() => (this.exportMode() === 'snippet' ? this.snippetExport().imports : ''));
  readonly highlightedExportImports = computed(() => this.codeHighlightThemeService.highlight(this.displayedExportImports()));
  readonly highlightedExportCode = computed(() => this.codeHighlightThemeService.highlight(this.displayedExportCode()));
  readonly highlightedGeneratedImports = computed(() => this.codeHighlightThemeService.highlight(this.snippetExport().imports));
  readonly highlightedGeneratedCode = computed(() => this.codeHighlightThemeService.highlight(this.snippetExport().code));
  readonly selectionHandleSize = computed(() =>
    this.coarsePointer() ? EDITOR_SELECTION_HANDLE_SIZE_BY_POINTER.coarse : EDITOR_SELECTION_HANDLE_SIZE_BY_POINTER.fine
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
  readonly skipFutureSceneReplaceConfirmations = signal(false);
  private shareUrlRequestId = 0;
  private themeToggleCooldownHandle: ReturnType<typeof setTimeout> | null = null;
  private themeToggleLocked = false;
  private contextMenuPositionRafHandle: number | null = null;
  private keyboardNavigationRafHandle: number | null = null;
  private keyboardNavigationLastTimestamp: number | null = null;
  private keyboardNavigationHistoryActive = false;
  private inspectorEditHistoryActive = false;
  private syncChannel: BroadcastChannel | null = null;
  private syncBroadcastRafHandle: number | null = null;
  private syncRevision = 0;
  private applyingRemoteSync = false;
  private editorSyncInitialized = false;
  private sidebarResizeMoved = false;
  private sidebarResizeStartedFromToggle = false;
  private suppressNextSidebarToggleClick = false;
  private pendingSyncDocument: { readonly scene: TikzScene; readonly importCode: string } | null = null;
  private readonly pressedArrowNavigationKeys = new Set<string>();
  private readonly lastRemoteRevisionByClient = new Map<string, number>();
  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.themeToggleCooldownHandle !== null) {
        clearTimeout(this.themeToggleCooldownHandle);
      }
      if (this.contextMenuPositionRafHandle !== null && this.document.defaultView) {
        this.document.defaultView.cancelAnimationFrame(this.contextMenuPositionRafHandle);
      }
      if (this.keyboardNavigationRafHandle !== null && this.document.defaultView) {
        this.document.defaultView.cancelAnimationFrame(this.keyboardNavigationRafHandle);
      }
      if (this.syncBroadcastRafHandle !== null && this.document.defaultView) {
        this.document.defaultView.cancelAnimationFrame(this.syncBroadcastRafHandle);
      }
      this.syncChannel?.close();
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

    let previousInspectorPanelVisible = this.inspectorPanelVisible();
    afterRenderEffect({
      earlyRead: () => {
        const viewport = this.canvasViewport().nativeElement;
        return {
          inspectorPanelVisible: this.inspectorPanelVisible(),
          viewportWidth: Math.round(viewport.clientWidth),
          viewportHeight: Math.round(viewport.clientHeight)
        };
      },
      write: (measurement) => {
        const { inspectorPanelVisible, viewportWidth, viewportHeight } = measurement();
        const nextCanvasWidth = Math.max(EDITOR_CANVAS_MIN_WIDTH, viewportWidth);
        if (inspectorPanelVisible !== previousInspectorPanelVisible && nextCanvasWidth !== this.canvasWidth()) {
          this.viewportCenter.update((center) => viewportCenterAfterHorizontalResize(center, this.canvasWidth(), nextCanvasWidth, this.preferences().scale));
        }
        previousInspectorPanelVisible = inspectorPanelVisible;
        this.canvasViewportWidth.set(viewportWidth);
        this.canvasWidth.set(nextCanvasWidth);
        this.canvasHeight.set(Math.max(EDITOR_CANVAS_MIN_HEIGHT, viewportHeight));
      }
    });

    afterNextRender(() => {
      const viewport = this.canvasViewport().nativeElement;
      const canvasSvg = this.canvasSvg().nativeElement;
      const mobileLayoutQuery = this.document.defaultView?.matchMedia?.(`(max-width: ${EDITOR_MOBILE_BREAKPOINT_PX}px)`) ?? null;
      const sidebarsOverlayLayoutQuery = this.document.defaultView?.matchMedia?.(`(max-width: ${EDITOR_SIDEBAR_OVERLAY_BREAKPOINT_PX}px)`) ?? null;
      const updateCanvasSize = () => {
        const nextViewportWidth = Math.round(viewport.clientWidth);
        const nextCanvasWidth = Math.max(EDITOR_CANVAS_MIN_WIDTH, nextViewportWidth);
        this.canvasViewportWidth.set(nextViewportWidth);
        this.canvasWidth.set(nextCanvasWidth);
        this.canvasHeight.set(Math.max(EDITOR_CANVAS_MIN_HEIGHT, Math.round(viewport.clientHeight)));
      };

      const resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
      });
      const coarsePointerQuery = this.document.defaultView?.matchMedia?.('(pointer: coarse)') ?? null;
      const updateCoarsePointer = () => {
        this.coarsePointer.set(coarsePointerQuery?.matches ?? (this.document.defaultView?.navigator.maxTouchPoints ?? 0) > 0);
      };
      const updateMobileLayout = () => {
        const isMobile = mobileLayoutQuery?.matches ?? (this.document.defaultView?.innerWidth ?? EDITOR_VIEWPORT_FALLBACK_WIDTH) <= EDITOR_MOBILE_BREAKPOINT_PX;
        this.mobileLayout.set(isMobile);
      };
      const updateSidebarsOverlayLayout = () => {
        const useOverlayLayout =
          sidebarsOverlayLayoutQuery?.matches ??
          (this.document.defaultView?.innerWidth ?? EDITOR_VIEWPORT_FALLBACK_WIDTH) <= EDITOR_SIDEBAR_OVERLAY_BREAKPOINT_PX;
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
      this.openEditorSyncChannel();
      const handleStorage = (event: StorageEvent) => this.handleStorageEvent(event);
      const handleCanvasDoubleClickCapture = (event: MouseEvent) => this.onCanvasDoubleClickCapture(event);

      this.document.defaultView?.addEventListener('storage', handleStorage);
      canvasSvg.addEventListener('dblclick', handleCanvasDoubleClickCapture, { capture: true });
      this.destroyRef.onDestroy(() => this.document.defaultView?.removeEventListener('storage', handleStorage));
      this.destroyRef.onDestroy(() => canvasSvg.removeEventListener('dblclick', handleCanvasDoubleClickCapture, { capture: true }));
      this.destroyRef.onDestroy(() => coarsePointerQuery?.removeEventListener?.('change', updateCoarsePointer));
      this.destroyRef.onDestroy(() => mobileLayoutQuery?.removeEventListener?.('change', updateMobileLayout));
      this.destroyRef.onDestroy(() => sidebarsOverlayLayoutQuery?.removeEventListener?.('change', updateSidebarsOverlayLayout));
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
      const document = this.currentSyncedEditorDocument();
      if (!this.editorSyncInitialized) {
        this.editorSyncInitialized = true;
        return;
      }
      if (this.applyingRemoteSync) {
        this.applyingRemoteSync = false;
        return;
      }
      this.scheduleEditorSyncBroadcast(document);
    });

    effect(() => {
      this.editorStorage.setJson(this.sidebarSizesStorageKey, {
        left: this.leftSidebarWidth(),
        right: this.rightSidebarWidth()
      });
    });
    effect(() => {
      if (!this.pinnedToolsReady()) {
        return;
      }
      this.editorStorage.setJson(this.pinnedToolsStorageKey, this.pinnedToolIds());
    });
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  tOrFallback(key: string, fallback: string): string {
    return this.languageService.tOrFallback(key, fallback);
  }

  localizedShapeKind(kind: CanvasShape['kind']): string {
    return this.languageService.localizedShapeKind(kind);
  }

  localizedMultiEditKind(selection: MultiEditSelectionInfo): string {
    return selection.kind === 'mixed' ? this.t('mixedSelection') : this.localizedShapeKind(selection.kind);
  }

  multiEditTextValue(selection: MultiEditSelectionInfo, key: string, fallback: string = ''): string {
    const value = this.multiEditValue(selection, key);
    return typeof value === 'string' ? value : fallback;
  }

  multiEditNumberValue(selection: MultiEditSelectionInfo, key: string, fallback: number = 0): number {
    const value = this.multiEditValue(selection, key);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  openFigureSearch(): void {
    this.figureSearchOpen.set(true);
    this.closeContextMenu();
    this.closeFileMenu();
    this.closeTextSymbolPalette();
    this.closeMobileLibraryPanelIfNeeded();
  }

  closeFigureSearch(): void {
    this.figureSearchOpen.set(false);
  }

  selectFigureSearchPreset(toolId: string): void {
    this.closeFigureSearch();
    this.setActiveTool(toolId);
  }

  regularPolygonName(sides: number): string {
    const dimensions = normalizeRegularPolygonDimensions({ sides });
    const specificName = this.tOrFallback(`regularPolygonName.${dimensions.sides}`, '');
    if (specificName) {
      return specificName;
    }

    return this.tOrFallback('regularPolygonName.generic', '{sides}-gon').replace('{sides}', String(dimensions.sides));
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

  toolShortcut(toolId: string): string | undefined {
    const action = this.shortcutActionForTool(toolId);
    return action ? this.shortcutLabel(action) : undefined;
  }

  private shortcutActionForTool(toolId: string): KeyboardShortcutAction | null {
    switch (toolId) {
      case 'select':
        return 'selectTool';
      case 'label':
        return 'labelTool';
      case 'box':
        return 'boxTool';
      case 'circle':
        return 'circleTool';
      case 'segment':
        return 'segmentTool';
      case 'arrow':
        return 'arrowTool';
      case 'pencil':
        return 'pencilTool';
      case 'note':
        return 'noteTool';
      case 'ellipse':
        return 'ellipseTool';
      case 'image':
        return 'imageTool';
      default:
        return null;
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
      case 'graphs':
        return 'graph';
      case 'data':
        return 'bars';
      case 'interface':
        return 'browser';
      case 'concepts':
        return 'hub';
    }
  }

  isSectionCollapsed(sectionId: string): boolean {
    return this.collapsedSections()[sectionId] ?? false;
  }

  toggleSection(sectionId: string): void {
    this.collapsedSections.update((sections) => {
      const nextSections = {
        ...sections,
        [sectionId]: !(sections[sectionId] ?? false)
      };
      if (this.librarySectionIds.has(sectionId)) {
        this.editorStorage.setJson(this.librarySectionsStorageKey, this.persistedLibrarySectionState(nextSections));
      }
      return nextSections;
    });
  }

  private persistedLibrarySectionState(sections: Readonly<Record<string, boolean>>): Readonly<Record<string, boolean>> {
    return Object.fromEntries([...this.librarySectionIds].map((sectionId) => [sectionId, sections[sectionId] ?? false]));
  }

  private restoredLibrarySectionState(): Readonly<Record<string, boolean>> {
    const storedSections = parseCollapsedSectionsFromStorage(this.editorStorage.getString(this.librarySectionsStorageKey));
    return Object.fromEntries(Object.entries(storedSections).filter(([sectionId]) => this.librarySectionIds.has(sectionId)));
  }

  toggleSidebarCollapsed(side: SidebarSide): void {
    if (this.suppressNextSidebarToggleClick) {
      this.suppressNextSidebarToggleClick = false;
      return;
    }

    if (side === 'left') {
      this.leftSidebarCollapsed.update((collapsed) => !collapsed);
      this.sidebarResizeState.set(null);
      return;
    }

    this.rightSidebarCollapsed.update((collapsed) => !collapsed);
    this.sidebarResizeState.set(null);
  }

  startSidebarResize(event: PointerEvent, side: SidebarSide, fromToggle = false): void {
    if ((side === 'left' && this.leftSidebarCollapsed()) || (side === 'right' && this.rightSidebarCollapsed())) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.sidebarResizeMoved = false;
    this.sidebarResizeStartedFromToggle = fromToggle;
    this.captureSidebarResizePointer(event);
    const stackedLayout = this.sidebarsOverlayLayout();
    const axis = stackedLayout ? 'y' : 'x';
    this.sidebarResizeState.set({
      side,
      axis,
      startPointer: axis === 'y' ? event.clientY : event.clientX,
      startSize: this.sidebarResizeStartSize(side, stackedLayout)
    });
  }

  startSidebarResizeFromToggle(event: PointerEvent, side: SidebarSide): void {
    if (!this.sidebarsOverlayLayout()) {
      event.stopPropagation();
      return;
    }

    this.startSidebarResize(event, side, true);
  }

  private captureSidebarResizePointer(event: PointerEvent): void {
    if (!(event.currentTarget instanceof Element)) {
      return;
    }

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers refuse capture if the pointer has already been released.
    }
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
        return EDITOR_COLLAPSED_SIDEBAR_SIZE.desktopWidth;
      }
      return this.leftSidebarWidth();
    }

    if (this.rightSidebarCollapsed()) {
      return EDITOR_COLLAPSED_SIDEBAR_SIZE.desktopWidth;
    }

    return this.rightSidebarWidth();
  }

  private desktopSidebarMinWidth(side: SidebarSide): number {
    if (side === 'left') {
      if (this.leftSidebarCollapsed()) {
        return EDITOR_COLLAPSED_SIDEBAR_SIZE.desktopWidth;
      }
      return EDITOR_LEFT_SIDEBAR_MIN_WIDTH;
    }

    if (this.rightSidebarCollapsed()) {
      return EDITOR_COLLAPSED_SIDEBAR_SIZE.desktopWidth;
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

    return EDITOR_COLLAPSED_SIDEBAR_SIZE.mobileHeight;
  }

  private leftSidebarHeight(): number {
    if (this.leftSidebarCollapsed()) {
      return EDITOR_COLLAPSED_SIDEBAR_SIZE.mobileHeight;
    }

    return this.mobileLeftSidebarHeight();
  }

  private rightSidebarMinHeightValue(): number {
    if (this.rightSidebarCollapsed()) {
      if (this.sidebarsOverlayLayout()) {
        return 0;
      }
      return EDITOR_COLLAPSED_SIDEBAR_SIZE.mobileHeight;
    }

    if (this.mobileLayout()) {
      return EDITOR_RIGHT_SIDEBAR_MOBILE_MIN_HEIGHT;
    }

    return EDITOR_RIGHT_SIDEBAR_DESKTOP_STACKED_MIN_HEIGHT;
  }

  private leftSidebarMinHeightValue(): number {
    if (this.leftSidebarCollapsed()) {
      return EDITOR_COLLAPSED_SIDEBAR_SIZE.mobileHeight;
    }

    return EDITOR_LEFT_SIDEBAR_MOBILE_MIN_HEIGHT;
  }

  private clampSidebarSize(side: SidebarResizeTarget, value: number): number {
    const limits = EDITOR_SIDEBAR_RESIZE_LIMITS;
    switch (side) {
      case 'mobile-left':
        return Math.min(limits.mobileMaxHeight, Math.max(EDITOR_LEFT_SIDEBAR_MOBILE_MIN_HEIGHT, value));
      case 'mobile-right':
        return Math.min(limits.mobileMaxHeight, Math.max(EDITOR_RIGHT_SIDEBAR_MOBILE_MIN_HEIGHT, value));
      case 'left':
        return Math.min(limits.leftMaxWidth, Math.max(limits.leftMinWidth, value));
      case 'right':
        return Math.min(limits.rightMaxWidth, Math.max(limits.rightMinWidth, value));
    }
  }

  setTheme(theme: ThemeMode): void {
    const nextTheme = this.appThemeService.normalize(theme, this.preferences().theme);
    if (this.themeToggleLocked || this.preferences().theme === nextTheme) {
      return;
    }

    this.themeToggleLocked = true;
    this.store.setTheme(nextTheme);
    if (this.themeToggleCooldownHandle !== null) {
      clearTimeout(this.themeToggleCooldownHandle);
    }
    this.themeToggleCooldownHandle = setTimeout(() => {
      this.themeToggleLocked = false;
      this.themeToggleCooldownHandle = null;
    }, EDITOR_THEME_TOGGLE_COOLDOWN_MS);
  }

  toggleTheme(): void {
    this.setTheme(this.appThemeService.nextTheme(this.preferences().theme));
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
    this.shareFeedback.set('');
    this.shareFeedbackTone.set('info');
  }

  openAppConfigurationDialog(tab: ApplicationConfigurationTab = 'general', returnToExport = false): void {
    const shouldReturnToExport = returnToExport && this.exportModalOpen();
    this.reopenExportAfterConfiguration.set(shouldReturnToExport);
    if (shouldReturnToExport) {
      this.exportModalOpen.set(false);
    }
    this.appConfigurationInitialTab.set(tab);
    this.appConfigurationDialogOpen.set(true);
    this.closeFileMenu();
  }

  closeAppConfigurationDialog(): void {
    this.appConfigurationDialogOpen.set(false);
    if (this.reopenExportAfterConfiguration()) {
      this.reopenExportAfterConfiguration.set(false);
      this.exportModalOpen.set(true);
    }
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
    this.runAfterNextPaint(() => {
      const sidebarScroll = this.rightSidebar()?.sidebarScroll()?.nativeElement;
      const layersSection = this.layersSection()?.nativeElement;
      if (sidebarScroll && layersSection) {
        const top = Math.max(layersSection.offsetTop - 12, 0);
        sidebarScroll.scrollTo({ top, behavior: 'smooth' });
        return;
      }
      layersSection?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  openAssistant(): void {
    this.rightSidebarCollapsed.set(false);
    this.inspectorTab.set('assistant');
  }

  setLibraryQuery(value: string): void {
    this.libraryQuery.set(value);
  }

  setActiveTool(toolId: string): void {
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

    if (toolId === REGULAR_POLYGON_PRESET_ID) {
      this.openRegularPolygonDialog({
        submitMode: this.activeTool() === REGULAR_POLYGON_PRESET_ID ? 'center-insert' : 'arm-insert',
        ...this.regularPolygonDimensions()
      });
      this.closeContextMenu();
      this.closeFileMenu();
      this.closeMobileLibraryPanelIfNeeded();
      return;
    }

    if (this.isGraphPresetId(toolId)) {
      const kind = GRAPH_PRESET_KIND_BY_ID[toolId];
      this.openGraphDialog({
        submitMode: this.activeTool() === toolId ? 'center-insert' : 'arm-insert',
        ...this.graphDimensions(),
        kind
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

  closeRegularPolygonDialog(): void {
    this.regularPolygonDialogState.set(null);
  }

  closeGraphDialog(): void {
    this.graphDialogState.set(null);
  }

  confirmRegularPolygonDialog(dimensions: RegularPolygonDimensions): void {
    const dialogState = this.regularPolygonDialogState();
    if (!dialogState) {
      return;
    }

    const nextDimensions = normalizeRegularPolygonDimensions(dimensions);
    this.regularPolygonDimensions.set(nextDimensions);
    this.regularPolygonDialogState.set(null);

    if (dialogState.submitMode === 'center-insert') {
      this.runSceneMutation(() => {
        this.insertPresetAt(REGULAR_POLYGON_PRESET_ID, this.snapScenePoint(this.viewportCenter()));
        this.activeTool.set('select');
        this.inspectorTab.set('properties');
      });
      return;
    }

    this.activeTool.set(REGULAR_POLYGON_PRESET_ID);
    this.inspectorTab.set('properties');
  }

  confirmGraphDialog(dimensions: GraphDimensions): void {
    const dialogState = this.graphDialogState();
    if (!dialogState) {
      return;
    }

    const nextDimensions = normalizeGraphDimensions(dimensions);
    const toolId = this.graphToolIdForKind(nextDimensions.kind);
    this.graphDimensions.set(nextDimensions);
    this.graphDialogState.set(null);

    if (dialogState.submitMode === 'center-insert') {
      this.runSceneMutation(() => {
        this.insertPresetAt(toolId, this.snapScenePoint(this.viewportCenter()));
        this.activeTool.set('select');
        this.inspectorTab.set('properties');
      });
      return;
    }

    this.activeTool.set(toolId);
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

  updateTemplateUseCurrentSelection(checked: boolean): void {
    this.templateUseCurrentSelection.set(checked);
  }

  saveTemplate(): void {
    const title = this.templateTitleInput().trim();
    if (!title) {
      return;
    }

    const mode = this.templateDialogMode();
    const existing = this.savedTemplates().find((template) => template.id === this.editingTemplateId());
    const sourceShapes = mode === 'edit' && !this.templateUseCurrentSelection() ? (existing?.shapes ?? []) : structuredClone(this.selectedShapes());

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
      mode === 'edit' && existing ? templates.map((entry) => (entry.id === existing.id ? template : entry)) : [template, ...templates]
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

  selectSceneShape(shapeId: string): void {
    this.selectShape(shapeId);
    this.centerViewportOnShape(shapeId);
  }

  handleAiPatchApplied(shapeIds: readonly string[]): void {
    const shapeIdSet = new Set(shapeIds);
    this.centerViewportOnShapes(this.scene().shapes.filter((shape) => shapeIdSet.has(shape.id)));
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
    this.finishInspectorEditHistory();
    this.store.undo();
  }

  redo(): void {
    this.closeContextMenu();
    this.finishInspectorEditHistory();
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

  setCanvasToolbarScale(scale: number): void {
    this.setScaleFromViewportCenter(scale);
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

  downloadProjectJson(): void {
    const project = buildProjectJsonExport(this.scene(), this.preferences(), this.store.importCode(), this.appVersion);
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.exportFileBaseName()}.json`;
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
    const pngBlob = await this.renderCanvasExportToPngBlob(exportDocument);
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
  }

  private async renderCanvasExportToPngBlob(exportDocument: ExportSvgDocument): Promise<Blob | null> {
    const exportShapes = this.canvasExportShapes();
    if (!exportShapes.some((shape) => shape.kind === 'image')) {
      return this.renderSvgExportToPngBlob(exportDocument);
    }

    const vectorDocument = this.buildCanvasExportDocument(true);
    const canvas = this.createExportCanvas(exportDocument);
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    const scale = EDITOR_PNG_EXPORT_SCALE;
    context.scale(scale, scale);
    await this.drawExportVectorLayer(context, vectorDocument);
    await this.drawExportImages(context, exportDocument, exportShapes);

    const pngBlob = await this.canvasToPngBlob(canvas);
    if (pngBlob) {
      return pngBlob;
    }

    try {
      return await this.renderSvgExportToPngBlob(vectorDocument);
    } catch {
      return null;
    }
  }

  private async renderSvgExportToPngBlob(exportDocument: ExportSvgDocument): Promise<Blob | null> {
    return this.withSvgExportImage(exportDocument.markup, (image) => {
      const canvas = this.createExportCanvas(exportDocument);
      const context = canvas.getContext('2d');
      if (!context) {
        return null;
      }

      const scale = EDITOR_PNG_EXPORT_SCALE;
      context.scale(scale, scale);
      context.drawImage(image, 0, 0, exportDocument.width, exportDocument.height);

      return this.canvasToPngBlob(canvas);
    });
  }

  private createExportCanvas(exportDocument: ExportSvgDocument): HTMLCanvasElement {
    const canvas = this.document.createElement('canvas');
    canvas.width = exportDocument.width * EDITOR_PNG_EXPORT_SCALE;
    canvas.height = exportDocument.height * EDITOR_PNG_EXPORT_SCALE;
    return canvas;
  }

  private async withSvgExportImage<T>(svgMarkup: string, useImage: (image: HTMLImageElement) => T | Promise<T>): Promise<T> {
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const image = await this.loadImageFromSource(svgUrl, 'Unable to render canvas export.');
      return await useImage(image);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  private canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    return new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob(resolve, 'image/png');
      } catch {
        resolve(null);
      }
    });
  }

  private async drawExportVectorLayer(context: CanvasRenderingContext2D, exportDocument: ExportSvgDocument): Promise<void> {
    try {
      await this.withSvgExportImage(exportDocument.markup, (vectorImage) => {
        context.drawImage(vectorImage, 0, 0, exportDocument.width, exportDocument.height);
      });
    } catch {
      this.fillExportBackground(context, exportDocument);
    }
  }

  private fillExportBackground(context: CanvasRenderingContext2D, exportDocument: ExportSvgDocument): void {
    context.save();
    context.fillStyle = this.preferences().theme === 'dark' ? '#161616' : '#ffffff';
    context.fillRect(0, 0, exportDocument.width, exportDocument.height);
    context.restore();
  }

  private async drawExportImages(context: CanvasRenderingContext2D, exportDocument: ExportSvgDocument, shapes: readonly CanvasShape[]): Promise<void> {
    const projection = exportDocument.projection;
    if (!projection) {
      return;
    }

    for (const shape of shapes) {
      if (shape.kind !== 'image') {
        continue;
      }

      try {
        const image = await this.loadRasterImage(shape.src);
        this.drawImageShape(context, image, shape, projection);
      } catch {
        continue;
      }
    }
  }

  private async loadRasterImage(src: string): Promise<HTMLImageElement> {
    return this.loadImageFromSource(src, 'Unable to load embedded image.');
  }

  private async loadImageFromSource(src: string, errorMessage: string): Promise<HTMLImageElement> {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(errorMessage));
      image.src = src;
    });
  }

  private drawImageShape(
    context: CanvasRenderingContext2D,
    image: HTMLImageElement,
    shape: Extract<CanvasShape, { kind: 'image' }>,
    projection: NonNullable<ExportSvgDocument['projection']>
  ): void {
    const { bounds, padding, scale } = projection;
    const x = (shape.x - bounds.left) * scale + padding;
    const y = (bounds.top - (shape.y + shape.height)) * scale + padding;
    const width = shape.width * scale;
    const height = shape.height * scale;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const fitted = this.containedImageRect(image, x, y, width, height);

    context.save();
    context.globalAlpha = shape.strokeOpacity;
    context.translate(centerX, centerY);
    context.rotate(((shape.rotation ?? 0) * Math.PI) / 180);
    context.drawImage(image, fitted.x - centerX, fitted.y - centerY, fitted.width, fitted.height);
    context.restore();
  }

  private containedImageRect(
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number
  ): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
    const imageRatio = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1;
    const targetRatio = width / Math.max(height, 1);
    if (imageRatio > targetRatio) {
      const fittedHeight = width / imageRatio;
      return { x, y: y + (height - fittedHeight) / 2, width, height: fittedHeight };
    }

    const fittedWidth = height * imageRatio;
    return { x: x + (width - fittedWidth) / 2, y, width: fittedWidth, height };
  }

  readonly shareLinkCopyValue = async (): Promise<string> => {
    const url = await this.generateShareUrl();
    if (!url) {
      throw new Error('Unable to generate share link.');
    }

    this.shareUrl.set(url);
    return url;
  };

  handleShareLinkCopied(): void {
    const hasImages = this.scene().shapes.some((shape) => shape.kind === 'image');
    if (hasImages) {
      const warningMessage = this.t('shareLinkImagesWarning');
      this.showNotification(warningMessage, 'warning');
    } else {
      this.showNotification(this.t('shareLinkReady'));
    }
    this.closeFileMenu();
  }

  handleCopyError(): void {
    this.showNotification(this.t('copyError'), 'warning');
  }

  onShapeClick(event: MouseEvent, shape: CanvasShape): void {
    if (!this.pointerHitsShape(event, shape)) {
      return;
    }

    event.stopPropagation();
    this.focusCanvasViewport();

    if (this.consumeIgnoredShapeClick(shape.id)) {
      return;
    }

    const wasSingleSelected = this.selectionCount() === 1 && this.selectedShape()?.id === shape.id;

    if (this.handleShapeClickWhileToolInactive(event)) {
      return;
    }

    const textShape = this.editableTextShapeAtEvent(event, shape);
    if (textShape && event.detail >= 2) {
      event.preventDefault();
      this.startTextEditing(textShape);
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

  onShapeKeydown(event: Event, shape: CanvasShape): void {
    event.preventDefault();
    event.stopPropagation();
    this.focusCanvasViewport();

    if (event instanceof KeyboardEvent && isSelectionModifierPressed(event)) {
      this.toggleShapeSetSelection(shape);
      return;
    }

    this.selectShapeSet(shape);
    this.setInspectorTab('properties');
  }

  onCanvasViewportKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    this.handleWindowKeydown(event);
  }

  onCanvasSurfaceKeydown(event: KeyboardEvent): void {
    this.onCanvasViewportKeydown(event);
  }

  onCanvasDoubleClickCapture(event: MouseEvent): void {
    if (this.activeTool() !== 'select') {
      return;
    }

    const textShape = this.sceneEditableTextShapeAtEvent(event);
    if (!textShape) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.startTextEditing(textShape);
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

    if (!this.pointerHitsShape(event, shape)) {
      this.recentSelectedShapeTap.set(null);
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const textShape = this.editableTextShapeAtEvent(event, shape);
    if (textShape) {
      this.startTextEditing(textShape);
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

  applyImportDialogResult(result: ImportDialogResult): void {
    if (result.clearScene === true && this.scene().shapes.length > 0) {
      this.importModalOpen.set(false);
      this.importReplaceDialog().requestImportReplacement(result);
      return;
    }

    this.applyImportDialogResultConfirmed(result);
  }

  handleImportReplacementCancelled(): void {
    this.importModalOpen.set(true);
  }

  handleShareReplacementCancelled(): void {
    this.clearSharedSceneFromUrl();
  }

  applySharedSceneStateConfirmed(sharedState: SharedScenePayload): void {
    this.applySharedSceneState(sharedState);
    this.clearSharedSceneFromUrl();
  }

  applyImportDialogResultConfirmed(result: ImportDialogResult): void {
    this.runSceneMutation(() => {
      this.store.applyImportedScene(result.scene, result.importCode, result.warnings, result.clearScene === true, result.preserveImportCode === true);
      this.viewportCenter.set({ x: 0, y: 0 });
      this.inspectorTab.set('scene');
    });
    this.closeImportModal();
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
    this.copySingleSelectedImageToSystemClipboard(shapes);
  }

  private copySingleSelectedImageToSystemClipboard(shapes: readonly CanvasShape[]): void {
    const [shape] = shapes;
    if (shapes.length !== 1 || shape?.kind !== 'image' || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      return;
    }

    const pngBlob = this.imageSourceToPngBlob(shape.src);
    this.runAsync(navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]));
  }

  private async imageSourceToPngBlob(src: string): Promise<Blob> {
    const image = await this.loadRasterImage(src);
    const canvas = this.document.createElement('canvas');
    canvas.width = Math.max(1, image.naturalWidth || image.width);
    canvas.height = Math.max(1, image.naturalHeight || image.height);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to prepare clipboard image.');
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await this.canvasToPngBlob(canvas);
    if (!blob) {
      throw new Error('Unable to copy image to the clipboard.');
    }

    return blob;
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
    const idMap = this.shapeIdMap(clipboard.shapes, () => crypto.randomUUID());
    const pastedShapes = remapStructuralShapeIds(
      this.remapShapeSetAttachments(
        clipboard.shapes.map((shape) => {
          const duplicate = structuredClone(shape);
          return {
            ...translateShapeBy(duplicate, offset, -offset),
            id: idMap.get(shape.id) ?? shape.id,
            name: `${duplicate.name} copy`
          } as CanvasShape;
        }),
        idMap
      )
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

  onSceneNameInputValue(value: string): void {
    this.store.renameScene(value);
  }

  updateShapeText(key: ShapeTextKey, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.patchInspectorSelection((shape) => ({ ...shape, [key]: value }) as CanvasShape);
  }

  setTextStyle(
    key: TextStylePropertyKey,
    value: TextShape['fontWeight'] | TextShape['fontStyle'] | TextShape['textDecoration'] | TextShape['textAlign']
  ): void {
    this.patchInspectorSelection((shape) => (shape.kind === 'text' ? ({ ...shape, [key]: value } as CanvasShape) : shape));
  }

  setTextRotation(value: number): void {
    this.patchInspectorSelection((shape) => (shape.kind === 'text' ? ({ ...shape, rotation: value } as CanvasShape) : shape));
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
    if (!inspectorInput || selectedShape?.kind !== 'text') {
      return;
    }

    this.insertTextAtCursor(inspectorInput, symbol, (nextValue) => {
      this.store.patchSelectedShape((shape) => (shape.kind === 'text' ? ({ ...shape, text: nextValue } as CanvasShape) : shape));
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
    const metrics = EDITOR_TEXT_SYMBOL_POPOVER_METRICS;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = this.document.defaultView?.innerWidth ?? metrics.viewportWidthFallback;
    const viewportHeight = this.document.defaultView?.innerHeight ?? metrics.viewportHeightFallback;
    const popoverWidth = Math.min(metrics.maxWidth, Math.max(viewportWidth - metrics.edgePadding * 2, metrics.minWidth));
    const spaceBelow = viewportHeight - rect.bottom - metrics.edgePadding;
    const spaceAbove = rect.top - metrics.edgePadding;
    const maxHeight = Math.max(metrics.minHeight, Math.min(metrics.preferredHeight, Math.max(spaceBelow, spaceAbove)));
    const top = this.computeTextSymbolPaletteTop(rect, viewportHeight, maxHeight, spaceBelow, spaceAbove);
    const left = Math.max(metrics.edgePadding, Math.min(rect.right - popoverWidth, viewportWidth - popoverWidth - metrics.edgePadding));

    return {
      top,
      left,
      maxHeight
    };
  }

  private computeTextSymbolPaletteTop(rect: DOMRect, viewportHeight: number, maxHeight: number, spaceBelow: number, spaceAbove: number): number {
    const metrics = EDITOR_TEXT_SYMBOL_POPOVER_METRICS;
    const renderedHeight = Math.min(metrics.preferredHeight, maxHeight);
    const openUpward = spaceBelow < metrics.openUpwardThreshold && spaceAbove > spaceBelow;

    if (openUpward) {
      return Math.max(metrics.edgePadding, rect.top - renderedHeight - metrics.offset);
    }

    return Math.max(metrics.edgePadding, Math.min(rect.bottom + metrics.offset, viewportHeight - maxHeight - metrics.edgePadding));
  }

  updateImageText(key: ImageTextKey, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.patchInspectorSelection((shape) => (shape.kind === 'image' ? ({ ...shape, [key]: value } as CanvasShape) : shape));
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
      if (key === 'width') {
        return {
          ...shape,
          width: value,
          height: Math.max(value / Math.max(aspectRatio, EDITOR_IMAGE_ASPECT_RATIO_EPSILON), MIN_SHAPE_DIMENSION)
        } as CanvasShape;
      }

      return {
        ...shape,
        height: value,
        width: Math.max(value * Math.max(aspectRatio, EDITOR_IMAGE_ASPECT_RATIO_EPSILON), MIN_SHAPE_DIMENSION)
      } as CanvasShape;
    });
  }

  updateCommonDimension(key: ImageDimensionKey, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    this.patchInspectorSelection((shape) => {
      if (shape.kind === 'image') {
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
      }

      if (shape.kind === 'rectangle' || shape.kind === 'triangle') {
        return { ...shape, [key]: value } as CanvasShape;
      }

      return shape;
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
                  height: Math.max(shape.width / Math.max(dimensions.width / dimensions.height, EDITOR_IMAGE_ASPECT_RATIO_EPSILON), MIN_SHAPE_DIMENSION)
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
      let text = shape.text.replaceAll(REGEX.editor.wordTitleCase, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      if (mode === 'uppercase') {
        text = shape.text.toUpperCase();
      } else if (mode === 'lowercase') {
        text = shape.text.toLowerCase();
      }
      return { ...shape, text } as CanvasShape;
    });
  }

  updateShapeNumber(
    key: 'strokeWidth' | 'x' | 'y' | 'width' | 'height' | 'cornerRadius' | 'cx' | 'cy' | 'r' | 'rx' | 'ry' | 'boxWidth' | 'fontSize' | 'rotation',
    event: Event
  ): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (key === 'rotation') {
      this.setShapeRotation(value);
      return;
    }
    this.patchInspectorSelection((shape) => {
      if (key === 'cornerRadius' && (shape.kind === 'rectangle' || shape.kind === 'triangle')) {
        const maxRadius = shape.kind === 'rectangle' ? maxRectangleCornerRadiusUtil(shape) : maxTriangleCornerRadiusUtil(shape);
        return { ...shape, cornerRadius: Math.max(0, Math.min(maxRadius, value)) } as CanvasShape;
      }

      return { ...shape, [key]: value } as CanvasShape;
    });
  }

  updateTriangleApex(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) {
      return;
    }
    const apexOffset = Math.max(0, Math.min(1, value));
    this.patchInspectorSelection((shape) => (shape.kind === 'triangle' ? ({ ...shape, apexOffset } as CanvasShape) : shape));
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
            arrowScale: Number.isFinite(value) ? Math.min(EDITOR_LINE_ARROW_SCALE_MAX, Math.max(EDITOR_LINE_ARROW_SCALE_MIN, value)) : shape.arrowScale
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
      if (shape.kind === 'line') {
        return {
          ...shape,
          arrowStart: direction === 'backward' || direction === 'both',
          arrowEnd: direction === 'forward' || direction === 'both'
        } as LineShape;
      }

      return shape;
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
    const arrowType = value as ArrowTipKind;
    this.patchInspectorSelection((shape) =>
      shape.kind === 'line'
        ? ({
            ...shape,
            arrowType,
            arrowOpen: false,
            arrowRound: false,
            arrowBendMode: this.arrowTipSupportsBending(arrowType) ? shape.arrowBendMode : 'none'
          } as LineShape)
        : shape
    );
  }

  setLineMode(value: string): void {
    this.patchInspectorSelection((shape) =>
      shape.kind === 'line' && (value === 'straight' || value === 'curved')
        ? ({
            ...shape,
            lineMode: value,
            anchors:
              value === 'curved' && shape.anchors.length === 0 ? [{ x: (shape.from.x + shape.to.x) / 2, y: (shape.from.y + shape.to.y) / 2 }] : shape.anchors,
            arrowBendMode: value === 'curved' && shape.arrowBendMode === 'none' && this.arrowTipSupportsBending(shape.arrowType) ? 'flex' : shape.arrowBendMode
          } as LineShape)
        : shape
    );
  }

  setLineStrokeStyle(value: string): void {
    const allowedStyles: readonly LineStrokeStyle[] = ['solid', 'dashed', 'dotted', 'dash-dotted', 'loosely-dashed'];
    if (!allowedStyles.includes(value as LineStrokeStyle)) {
      return;
    }

    this.patchInspectorSelection((shape) => (shape.kind === 'line' ? ({ ...shape, strokeStyle: value as LineStrokeStyle } as LineShape) : shape));
  }

  setTextBoxEnabled(value: boolean): void {
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
    this.ensureInspectorEditHistoryCheckpoint();

    const selectedShapes = this.selectedShapes();
    if (selectedShapes.length === 0) {
      return;
    }

    this.replaceShapesAndSyncAttachedLines(selectedShapes.map((shape) => mutator(shape)));
  }

  private ensureInspectorEditHistoryCheckpoint(): void {
    if (this.inspectorEditHistoryActive) {
      return;
    }

    this.store.recordHistoryCheckpoint();
    this.inspectorEditHistoryActive = true;
  }

  private finishInspectorEditHistory(): void {
    this.inspectorEditHistoryActive = false;
  }

  private multiEditSelectionKind(shapes: readonly CanvasShape[]): MultiEditSelectionInfo['kind'] {
    const firstShape = shapes[0];
    return firstShape && shapes.every((shape) => shape.kind === firstShape.kind) ? firstShape.kind : 'mixed';
  }

  private multiEditCapabilities(shapes: readonly CanvasShape[]): MultiEditSelectionInfo['capabilities'] {
    const allNonText = shapes.every((shape) => shape.kind !== 'text');
    const allFillable = shapes.every((shape) => shape.kind === 'rectangle' || shape.kind === 'triangle' || shape.kind === 'circle' || shape.kind === 'ellipse');
    const allDimensioned = shapes.every((shape) => shape.kind === 'rectangle' || shape.kind === 'triangle' || shape.kind === 'image');
    const allRounded = shapes.every((shape) => shape.kind === 'rectangle' || shape.kind === 'triangle');
    const allRotatable = shapes.every((shape) => shape.kind !== 'line' && shape.kind !== 'circle');
    const allLines = shapes.every((shape) => shape.kind === 'line');
    const allText = shapes.every((shape) => shape.kind === 'text');
    const allImages = shapes.every((shape) => shape.kind === 'image');

    return {
      stroke: allNonText,
      fill: allFillable,
      dimensions: allDimensioned,
      cornerRadius: allRounded,
      triangleApex: shapes.every((shape) => shape.kind === 'triangle'),
      circleRadius: shapes.every((shape) => shape.kind === 'circle'),
      ellipseRadii: shapes.every((shape) => shape.kind === 'ellipse'),
      rotation: allRotatable,
      line: allLines,
      text: allText,
      image: allImages
    };
  }

  private multiEditValue(selection: MultiEditSelectionInfo, key: string): unknown {
    const shape = selection.shapes.find((entry) => key in entry);
    return shape ? (shape as unknown as Record<string, unknown>)[key] : null;
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
        ...(target === 'from' ? { fromAttachment: undefined } : { toAttachment: undefined }),
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
        anchors: shape.anchors.map((anchor, anchorIndex) => (anchorIndex === index ? { ...anchor, [axis]: value } : anchor))
      } as LineShape;
    });
  }

  addLineAnchor(): void {
    const shape = this.selectedShape();
    if (shape?.kind !== 'line') {
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
      return EDITOR_DEFAULT_SLIDER_RANGE;
    }

    const maxAbs = axis === 'x' ? Math.max(Math.abs(bounds.left), Math.abs(bounds.right), 1) : Math.max(Math.abs(bounds.bottom), Math.abs(bounds.top), 1);

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

  isAiPendingShape(shapeId: string): boolean {
    return this.aiPatch.pendingAffectedShapeIds().includes(shapeId);
  }

  applyPendingAiPatchFromCanvas(): void {
    const changedShapes = this.aiPatch.applyPendingPatch();
    this.handleAiPatchApplied(changedShapes.map((shape) => shape.id));
  }

  discardPendingAiPatchFromCanvas(): void {
    this.aiPatch.discardPendingPatch();
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
    if (!this.pointerHitsShape(event, shape)) {
      return;
    }

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
    const padding = EDITOR_CONTEXT_MENU_VIEWPORT_PADDING;
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
      case 'saveTemplate':
        this.openSaveTemplateDialog();
        break;
    }
    this.closeContextMenu();
  }

  contextMenuActionEnabled(action: ContextAction): boolean {
    return this.configuration.generalConfig().contextMenuActions[action];
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
      const clientPoint = { x: event.clientX, y: event.clientY };
      this.interactionState.set({
        kind: 'pan',
        pointerId: event.pointerId,
        startClientPoint: clientPoint,
        lastClientPoint: clientPoint,
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
    const hasImageFile = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === 'file' && item.type.startsWith('image/'));
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
    if (!this.pointerHitsShape(event, shape)) {
      return;
    }

    if (!this.canStartMove(event)) {
      this.recentSelectedShapeTap.set(null);
      return;
    }

    const plainPrimaryGesture = !isSelectionModifierPressed(event);
    const isSingleSelectedShape = this.selectionCount() === 1 && this.selectedShape()?.id === shape.id;
    const textShape = this.editableTextShapeAtEvent(event, shape);

    if (textShape && (event.detail >= 2 || this.isRepeatedTextTap(textShape.id))) {
      event.preventDefault();
      event.stopPropagation();
      this.startTextEditing(textShape);
      return;
    }

    if (shape.kind === 'text' && !this.textMovesWithShapeSet(shape)) {
      if (this.handleMoveStartForTextShape(event, shape)) {
        return;
      }
    } else {
      this.recentTextTap.set(textShape ? { shapeId: textShape.id, timestamp: Date.now() } : null);
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

  private pointerHitsShape(event: Pick<MouseEvent, 'clientX' | 'clientY'>, shape: CanvasShape): boolean {
    if (shape.kind !== 'triangle') {
      return true;
    }

    const strokeTolerance = Math.max(shape.strokeWidth / 2, 0.06);
    return pointInTriangleShapeUtil(shape, this.toScenePoint(event.clientX, event.clientY), strokeTolerance);
  }

  private editableTextShapeAtEvent(event: Pick<MouseEvent, 'clientX' | 'clientY'>, shape: CanvasShape): TextCanvasShape | null {
    if (shape.kind === 'text') {
      return shape;
    }

    return this.groupedTextShapeAtEvent(event, shape);
  }

  private groupedTextShapeAtEvent(event: Pick<MouseEvent, 'clientX' | 'clientY'>, shape: CanvasShape): TextCanvasShape | null {
    const groupedShapeIds = shapeSetIdsUtil(shape, this.scene().shapes);
    if (groupedShapeIds.length < 2) {
      return null;
    }

    const pointerPoint = this.toScenePoint(event.clientX, event.clientY);
    const groupedTextShapes = this.scene()
      .shapes.filter((entry): entry is TextCanvasShape => entry.kind === 'text' && entry.id !== shape.id && groupedShapeIds.includes(entry.id))
      .slice()
      .reverse();

    return (
      groupedTextShapes.find((textShape) => this.pointHitsTextShape(pointerPoint, textShape)) ??
      this.groupedTextShapeInsideShapeAtPoint(pointerPoint, shape, groupedTextShapes)
    );
  }

  private selectedTextShapeAtEvent(event: Pick<MouseEvent, 'clientX' | 'clientY'>): TextCanvasShape | null {
    const pointerPoint = this.toScenePoint(event.clientX, event.clientY);
    const selectedShapes = this.selectedShapes();
    const selectedTextShapes = selectedShapes
      .filter((entry): entry is TextCanvasShape => entry.kind === 'text')
      .slice()
      .reverse();

    const directTextHit = selectedTextShapes.find((textShape) => this.pointHitsTextShape(pointerPoint, textShape));
    if (directTextHit) {
      return directTextHit;
    }

    const selectedShapeHit = selectedShapes
      .filter((entry) => entry.kind !== 'text')
      .slice()
      .reverse()
      .find((entry) => this.pointHitsShapeBounds(pointerPoint, entry));

    return selectedShapeHit ? this.groupedTextShapeInsideShapeAtPoint(pointerPoint, selectedShapeHit, selectedTextShapes) : null;
  }

  private sceneEditableTextShapeAtEvent(event: Pick<MouseEvent, 'clientX' | 'clientY'>): TextCanvasShape | null {
    const pointerPoint = this.toScenePoint(event.clientX, event.clientY);
    const textShapes = this.scene()
      .shapes.filter((entry): entry is TextCanvasShape => entry.kind === 'text')
      .slice()
      .reverse();

    const directTextHit = textShapes.find((textShape) => this.pointHitsTextShape(pointerPoint, textShape));
    if (directTextHit) {
      return directTextHit;
    }

    const selectedTextHit = this.selectedTextShapeAtEvent(event);
    if (selectedTextHit) {
      return selectedTextHit;
    }

    const shapeHit = this.scene()
      .shapes.filter((entry) => entry.kind !== 'text')
      .slice()
      .reverse()
      .find((entry) => this.pointHitsShapeBounds(pointerPoint, entry));

    return shapeHit ? this.groupedTextShapeAtPoint(pointerPoint, shapeHit) : null;
  }

  private pointHitsTextShape(point: Point, shape: TextCanvasShape): boolean {
    const bounds = this.shapeBounds(shape);
    return bounds ? this.pointInsideBounds(point, bounds) : false;
  }

  private pointHitsShapeBounds(point: Point, shape: CanvasShape): boolean {
    const bounds = this.shapeBounds(shape);
    return bounds ? this.pointInsideBounds(point, bounds) : false;
  }

  private groupedTextShapeAtPoint(point: Point, shape: CanvasShape): TextCanvasShape | null {
    const groupedShapeIds = shapeSetIdsUtil(shape, this.scene().shapes);
    if (groupedShapeIds.length < 2) {
      return null;
    }

    const groupedTextShapes = this.scene()
      .shapes.filter((entry): entry is TextCanvasShape => entry.kind === 'text' && entry.id !== shape.id && groupedShapeIds.includes(entry.id))
      .slice()
      .reverse();

    return (
      groupedTextShapes.find((textShape) => this.pointHitsTextShape(point, textShape)) ??
      this.groupedTextShapeInsideShapeAtPoint(point, shape, groupedTextShapes)
    );
  }

  private groupedTextShapeInsideShapeAtPoint(point: Point, shape: CanvasShape, groupedTextShapes: readonly TextCanvasShape[]): TextCanvasShape | null {
    const shapeBounds = this.shapeBounds(shape);
    if (!shapeBounds || !this.pointInsideBounds(point, shapeBounds)) {
      return null;
    }

    return (
      groupedTextShapes
        .map((textShape) => ({ shape: textShape, center: this.textShapeBoundsCenter(textShape) }))
        .filter(
          (entry): entry is { readonly shape: TextCanvasShape; readonly center: Point } => !!entry.center && this.pointInsideBounds(entry.center, shapeBounds)
        )
        .sort((a, b) => Math.hypot(point.x - a.center.x, point.y - a.center.y) - Math.hypot(point.x - b.center.x, point.y - b.center.y))[0]?.shape ?? null
    );
  }

  private textShapeBoundsCenter(shape: TextCanvasShape): Point | null {
    const bounds = this.shapeBounds(shape);
    return bounds ? { x: (bounds.left + bounds.right) / 2, y: (bounds.bottom + bounds.top) / 2 } : null;
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
      this.selectShapeSet(shape);
      this.setInspectorTab('properties');
      if (event.pointerType === 'touch') {
        event.preventDefault();
        event.stopPropagation();
        this.ignoreNextCanvasClick.set(true);
        return true;
      }
    }

    return false;
  }

  private textMovesWithShapeSet(shape: TextCanvasShape): boolean {
    if (!shape.mergeId) {
      return false;
    }

    return this.scene().shapes.some((entry) => entry.mergeId === shape.mergeId && entry.kind !== 'text');
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

  private beginMoveInteraction(event: PointerEvent, shape: CanvasShape, plainPrimaryGesture: boolean, isSingleSelectedShape: boolean): void {
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
      const pivot = this.selectionRotationPivot(selectedShapes, selectionBounds);
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
      pointerOffset: this.resizePointerOffset(handle, pointerPoint, selectedShape),
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
    if (interactionState?.pointerId !== event.pointerId) {
      return;
    }
    if (event.altKey !== this.altPressed()) {
      this.altPressed.set(event.altKey);
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

  private handlePendingPanPointerMove(event: PointerEvent, interactionState: Extract<InteractionState, { kind: 'pending-pan' }>): void {
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
      startClientPoint: interactionState.startClientPoint,
      lastClientPoint: { x: event.clientX, y: event.clientY },
      sourceButton: interactionState.sourceButton
    });
  }

  private handleMovePointerMove(event: PointerEvent, interactionState: Extract<InteractionState, { kind: 'move' }>): void {
    const nextWorldPoint = this.toScenePoint(event.clientX, event.clientY);
    const deltaX = this.snap(nextWorldPoint.x - interactionState.startWorldPoint.x);
    const deltaY = this.snap(nextWorldPoint.y - interactionState.startWorldPoint.y);
    const translatedShapes = interactionState.initialShapes.map((shape) => translateShapeBy(shape, deltaX, deltaY));
    const attachmentShapeById = this.lineAttachmentShapeMap(translatedShapes);
    const nextShapes = event.altKey
      ? translatedShapes.map((shape) => this.withLineAttachmentsDetached(shape))
      : translatedShapes.map((shape) => this.withMovedLineAttachmentsSynced(shape, attachmentShapeById));
    this.store.replaceShapes(this.withAttachedLinesMoved(nextShapes));
  }

  private lineAttachmentShapeMap(movedShapes: readonly CanvasShape[]): ReadonlyMap<string, CanvasShape> {
    const shapeById = new Map(this.scene().shapes.map((shape) => [shape.id, shape]));
    movedShapes.forEach((shape) => shapeById.set(shape.id, shape));
    return shapeById;
  }

  private withLineAttachmentsDetached(shape: CanvasShape): CanvasShape {
    if (shape.kind !== 'line') {
      return shape;
    }

    return {
      ...shape,
      fromAttachment: undefined,
      toAttachment: undefined
    } as LineShape;
  }

  private withMovedLineAttachmentsSynced(shape: CanvasShape, attachmentShapeById: ReadonlyMap<string, CanvasShape>): CanvasShape {
    if (shape.kind !== 'line') {
      return shape;
    }

    const fromShape = shape.fromAttachment ? attachmentShapeById.get(shape.fromAttachment.shapeId) : undefined;
    const toShape = shape.toAttachment ? attachmentShapeById.get(shape.toAttachment.shapeId) : undefined;
    if (!fromShape && !toShape) {
      return shape;
    }

    return {
      ...shape,
      from: this.movedLineEndpoint(shape.from, shape.fromAttachment, attachmentShapeById),
      to: this.movedLineEndpoint(shape.to, shape.toAttachment, attachmentShapeById)
    } as LineShape;
  }

  private movedLineEndpoint(currentPoint: Point, attachment: LineEndpointAttachment | undefined, attachmentShapeById: ReadonlyMap<string, CanvasShape>): Point {
    if (!attachment) {
      return currentPoint;
    }

    const attachedShape = attachmentShapeById.get(attachment.shapeId);
    if (!attachedShape) {
      return currentPoint;
    }

    return this.lineAttachmentPoint(attachedShape, attachment, currentPoint);
  }

  private withAttachedLinesMoved(nextMovedShapes: readonly CanvasShape[]): readonly CanvasShape[] {
    const movedShapeIds = new Set(nextMovedShapes.map((shape) => shape.id));
    const movedShapeById = new Map(nextMovedShapes.map((shape) => [shape.id, shape]));

    const attachedLines = this.scene().shapes.flatMap((shape): readonly LineShape[] => {
      if (shape.kind !== 'line' || movedShapeIds.has(shape.id)) {
        return [];
      }

      const fromShape = shape.fromAttachment ? movedShapeById.get(shape.fromAttachment.shapeId) : undefined;
      const toShape = shape.toAttachment ? movedShapeById.get(shape.toAttachment.shapeId) : undefined;
      if (!fromShape && !toShape) {
        return [];
      }

      return [
        {
          ...shape,
          from: fromShape && shape.fromAttachment ? this.lineAttachmentPoint(fromShape, shape.fromAttachment, shape.from) : shape.from,
          to: toShape && shape.toAttachment ? this.lineAttachmentPoint(toShape, shape.toAttachment, shape.to) : shape.to
        }
      ];
    });

    return [...nextMovedShapes, ...attachedLines];
  }

  private replaceShapesAndSyncAttachedLines(nextShapes: readonly CanvasShape[]): void {
    this.store.replaceShapes(this.withAttachedLinesMoved(nextShapes));
  }

  private handlePanPointerMove(event: PointerEvent, interactionState: Extract<InteractionState, { kind: 'pan' }>): void {
    const deltaClientX = event.clientX - interactionState.lastClientPoint.x;
    const deltaClientY = event.clientY - interactionState.lastClientPoint.y;
    const scale = this.preferences().scale;
    this.viewportCenter.update((viewportCenter) => ({
      x: viewportCenter.x - deltaClientX / scale,
      y: viewportCenter.y + deltaClientY / scale
    }));
    this.interactionState.set({ ...interactionState, lastClientPoint: { x: event.clientX, y: event.clientY } });
  }

  private handleMarqueePointerMove(event: PointerEvent, interactionState: Extract<InteractionState, { kind: 'marquee' }>): void {
    this.interactionState.set({
      ...interactionState,
      currentWorldPoint: this.toScenePoint(event.clientX, event.clientY)
    });
  }

  private handleInsertPointerMove(event: PointerEvent, interactionState: Extract<InteractionState, { kind: 'insert' }>): void {
    this.interactionState.set({
      ...interactionState,
      currentWorldPoint: this.snapScenePoint(this.toScenePoint(event.clientX, event.clientY))
    });
  }

  private handleFreehandPointerMove(event: PointerEvent, interactionState: Extract<InteractionState, { kind: 'freehand' }>): void {
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

  private handleResizePointerMove(event: PointerEvent, interactionState: Extract<InteractionState, { kind: 'resize' }>): void {
    const pointerPoint = this.toScenePoint(event.clientX, event.clientY);
    const adjustedPointerPoint = {
      x: pointerPoint.x + interactionState.pointerOffset.x,
      y: pointerPoint.y + interactionState.pointerOffset.y
    };
    if (
      (interactionState.initialShape?.kind === 'rectangle' || interactionState.initialShape?.kind === 'triangle') &&
      interactionState.handle.startsWith('corner-radius-')
    ) {
      const nextCornerRadius = this.cornerRadiusFromPointer(interactionState.initialShape, interactionState.handle, adjustedPointerPoint);
      this.replaceShapesAndSyncAttachedLines([{ ...interactionState.initialShape, cornerRadius: nextCornerRadius } as CanvasShape]);
      return;
    }

    const nextPoint = interactionState.initialShape
      ? this.snapResizePointer(interactionState.initialShape, adjustedPointerPoint)
      : this.snapScenePoint(adjustedPointerPoint);
    if (interactionState.initialShape) {
      const resizedShape = this.withLineEndpointAttachment(
        this.resizeShape(interactionState.initialShape, interactionState.handle, nextPoint),
        interactionState.handle,
        nextPoint,
        event.altKey
      );
      this.replaceShapesAndSyncAttachedLines([resizedShape]);
      return;
    }

    if (!interactionState.initialBounds || interactionState.initialShapes.length === 0) {
      return;
    }

    this.replaceShapesAndSyncAttachedLines(
      this.resizeShapeSelection(interactionState.initialShapes, interactionState.initialBounds, interactionState.handle, nextPoint)
    );
  }

  private withLineEndpointAttachment(shape: CanvasShape, handle: ResizeHandle, point: Point, forceDetach = false): CanvasShape {
    if (shape.kind !== 'line' || (handle !== 'from' && handle !== 'to')) {
      return shape;
    }

    if (forceDetach || this.altPressed()) {
      return handle === 'from' ? ({ ...shape, fromAttachment: undefined } as LineShape) : ({ ...shape, toAttachment: undefined } as LineShape);
    }

    const attachment = this.findLineEndpointAttachment(shape, handle, point);
    if (!attachment) {
      return handle === 'from' ? ({ ...shape, fromAttachment: undefined } as LineShape) : ({ ...shape, toAttachment: undefined } as LineShape);
    }

    return handle === 'from'
      ? ({
          ...shape,
          from: attachment.point,
          fromAttachment: { shapeId: attachment.shape.id, anchor: attachment.anchor }
        } as LineShape)
      : ({
          ...shape,
          to: attachment.point,
          toAttachment: { shapeId: attachment.shape.id, anchor: attachment.anchor }
        } as LineShape);
  }

  private findLineEndpointAttachment(line: LineShape, endpoint: LineEndpoint, point: Point): LineAttachmentCandidate | null {
    const preview = this.lineAttachmentPreview(line, endpoint, point);
    if (!preview) {
      return null;
    }

    const threshold = this.lineAttachmentSnapRadiusWorld();
    return preview.active.distance <= threshold ? preview.active : null;
  }

  private lineAttachmentPreviewHandlesFor(line: LineShape, endpoint: LineEndpoint, point: Point): readonly LineAttachmentPreviewDescriptor[] {
    const preview = this.lineAttachmentPreview(line, endpoint, point);
    if (!preview) {
      return [];
    }

    return preview.candidates.map((candidate) => ({
      id: `${endpoint}-${candidate.shape.id}-${candidate.anchor.x}-${candidate.anchor.y}`,
      x: this.toSvgX(candidate.point.x),
      y: this.toSvgY(candidate.point.y),
      active: candidate === preview.active
    }));
  }

  private lineAttachmentPreview(
    line: LineShape,
    endpoint: LineEndpoint,
    point: Point
  ): { readonly active: LineAttachmentCandidate; readonly candidates: readonly LineAttachmentCandidate[] } | null {
    const threshold = this.lineAttachmentSnapRadiusWorld();
    const previewRadius = this.lineAttachmentPreviewRadiusWorld();
    const candidateGroups = this.scene()
      .shapes.filter((shape) => this.canAttachLineEndpointToShape(line, shape))
      .map((shape) => ({
        shape,
        shapeDistance: this.distanceToAttachableShape(point, shape),
        anchors: this.lineAttachmentCandidatesForShape(shape, point)
      }))
      .filter((entry) => entry.shapeDistance <= previewRadius || entry.anchors.some((anchor) => anchor.distance <= threshold))
      .sort((a, b) => {
        const aDistance = Math.min(a.shapeDistance, ...a.anchors.map((anchor) => anchor.distance));
        const bDistance = Math.min(b.shapeDistance, ...b.anchors.map((anchor) => anchor.distance));
        return aDistance - bDistance;
      });
    const group = candidateGroups[0];
    if (!group) {
      return null;
    }

    const currentAttachment = endpoint === 'from' ? line.fromAttachment : line.toAttachment;
    const active =
      (currentAttachment?.shapeId === group.shape.id && currentAttachment.anchor
        ? group.anchors.find((anchor) => this.sameAnchor(anchor.anchor, currentAttachment.anchor as Point))
        : null) ?? group.anchors.slice().sort((a, b) => a.distance - b.distance)[0];
    if (!active || active.distance > threshold) {
      return {
        active: group.anchors.slice().sort((a, b) => a.distance - b.distance)[0],
        candidates: group.anchors
      };
    }

    return { active, candidates: group.anchors };
  }

  private lineAttachmentSnapRadiusWorld(): number {
    const radiusPx = this.coarsePointer() || this.mobileLayout() ? EDITOR_COARSE_LINE_ATTACHMENT_SNAP_RADIUS_PX : EDITOR_LINE_ATTACHMENT_SNAP_RADIUS_PX;
    return radiusPx / this.preferences().scale;
  }

  private lineAttachmentPreviewRadiusWorld(): number {
    const radiusPx = this.coarsePointer() || this.mobileLayout() ? EDITOR_COARSE_LINE_ATTACHMENT_PREVIEW_RADIUS_PX : EDITOR_LINE_ATTACHMENT_PREVIEW_RADIUS_PX;
    return radiusPx / this.preferences().scale;
  }

  private canAttachLineEndpointToShape(line: LineShape, shape: CanvasShape): boolean {
    return shape.id !== line.id && shape.kind !== 'line' && shape.kind !== 'text';
  }

  private distanceToAttachableShape(point: Point, shape: CanvasShape): number {
    if (shape.kind === 'circle') {
      return Math.max(Math.hypot(point.x - shape.cx, point.y - shape.cy) - shape.r, 0);
    }

    if (shape.kind === 'ellipse' && !shape.rotation) {
      const dx = point.x - shape.cx;
      const dy = point.y - shape.cy;
      if ((dx * dx) / (shape.rx * shape.rx) + (dy * dy) / (shape.ry * shape.ry) <= 1) {
        return 0;
      }
    }

    const bounds = this.shapeBounds(shape);
    if (!bounds) {
      return Number.POSITIVE_INFINITY;
    }

    const deltaX = Math.max(bounds.left - point.x, 0, point.x - bounds.right);
    const deltaY = Math.max(bounds.bottom - point.y, 0, point.y - bounds.top);
    return Math.hypot(deltaX, deltaY);
  }

  private lineAttachmentCandidatesForShape(shape: CanvasShape, point: Point): readonly LineAttachmentCandidate[] {
    return this.shapeAttachmentAnchors(shape).map((anchor) => {
      const candidatePoint = this.lineAttachmentPoint(shape, { anchor });
      return {
        shape,
        anchor,
        point: candidatePoint,
        distance: Math.hypot(point.x - candidatePoint.x, point.y - candidatePoint.y)
      };
    });
  }

  private shapeAttachmentAnchors(shape: CanvasShape): readonly Point[] {
    if (shape.kind === 'triangle') {
      return triangleCornerAttachmentAnchorsUtil(shape);
    }

    return [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 }
    ];
  }

  private normalizeAttachmentAnchor(center: Point, point: Point): Point {
    const deltaX = point.x - center.x;
    const deltaY = point.y - center.y;
    const length = Math.hypot(deltaX, deltaY);
    if (length <= 0.0001) {
      return { x: 0, y: 0 };
    }

    return { x: deltaX / length, y: deltaY / length };
  }

  private fallbackAttachmentAnchor(shape: CanvasShape, center: Point, fallbackPoint?: Point): Point | null {
    if (!fallbackPoint) {
      return null;
    }

    const rotation = this.shapeRotation(shape);
    const localPoint = rotation ? this.rotatePointAround(fallbackPoint, center, rotation) : fallbackPoint;
    return this.normalizeAttachmentAnchor(center, localPoint);
  }

  private rotatedShapeAttachmentPoint(shape: CanvasShape, point: Point, center: Point): Point {
    const rotation = this.shapeRotation(shape);
    return rotation ? this.rotatePointAround(point, center, -rotation) : point;
  }

  private sameAnchor(first: Point, second: Point): boolean {
    return Math.abs(first.x - second.x) < 0.001 && Math.abs(first.y - second.y) < 0.001;
  }

  private lineAttachmentPoint(shape: CanvasShape, attachment: { readonly anchor?: Point }, fallbackPoint?: Point): Point {
    const center = this.shapeCenter(shape);
    const anchor = attachment.anchor ?? this.fallbackAttachmentAnchor(shape, center, fallbackPoint);
    if (!anchor) {
      return center;
    }

    const deltaX = anchor.x;
    const deltaY = anchor.y;
    const length = Math.hypot(deltaX, deltaY);
    if (length <= 0.0001) {
      return center;
    }

    const unit = { x: deltaX / length, y: deltaY / length };
    if (shape.kind === 'circle') {
      return {
        x: shape.cx + unit.x * shape.r,
        y: shape.cy + unit.y * shape.r
      };
    }

    if (shape.kind === 'ellipse') {
      const scale = 1 / Math.sqrt((unit.x * unit.x) / (shape.rx * shape.rx) + (unit.y * unit.y) / (shape.ry * shape.ry));
      const point = {
        x: shape.cx + unit.x * scale,
        y: shape.cy + unit.y * scale
      };
      return this.rotatedShapeAttachmentPoint(shape, point, center);
    }

    if (shape.kind === 'triangle') {
      return this.rotatedShapeAttachmentPoint(shape, triangleCornerAttachmentPointFromAnchorUtil(shape, anchor), center);
    }

    if (shape.kind === 'rectangle' || shape.kind === 'image') {
      const halfWidth = Math.max(shape.width / 2, 0.0001);
      const halfHeight = Math.max(shape.height / 2, 0.0001);
      const scale = 1 / Math.max(Math.abs(unit.x) / halfWidth, Math.abs(unit.y) / halfHeight);
      const point = {
        x: center.x + unit.x * scale,
        y: center.y + unit.y * scale
      };
      return this.rotatedShapeAttachmentPoint(shape, point, center);
    }

    const bounds = this.shapeBounds(shape);
    if (!bounds) {
      return center;
    }

    const halfWidth = Math.max((bounds.right - bounds.left) / 2, 0.0001);
    const halfHeight = Math.max((bounds.top - bounds.bottom) / 2, 0.0001);
    const scale = 1 / Math.max(Math.abs(unit.x) / halfWidth, Math.abs(unit.y) / halfHeight);
    return {
      x: center.x + unit.x * scale,
      y: center.y + unit.y * scale
    };
  }

  private handleRotatePointerMove(event: PointerEvent, interactionState: Extract<InteractionState, { kind: 'rotate' }>): void {
    const pointerPoint = this.toScenePoint(event.clientX, event.clientY);
    const angleRadians = Math.atan2(pointerPoint.y - interactionState.pivot.y, pointerPoint.x - interactionState.pivot.x);
    let rotationDeltaDegrees = ((interactionState.startAngleRadians - angleRadians) * 180) / Math.PI;
    if (this.shiftPressed()) {
      rotationDeltaDegrees = Math.round(rotationDeltaDegrees / EDITOR_ROTATION_SNAP_STEP_DEGREES) * EDITOR_ROTATION_SNAP_STEP_DEGREES;
    }
    const rotatedShapes = interactionState.initialShapes.map((shape) => this.rotateShapeAround(shape, interactionState.pivot, rotationDeltaDegrees));
    this.store.replaceShapes(this.withAttachedLinesMoved(rotatedShapes));
  }

  endInteraction(event: PointerEvent): void {
    if (this.pinchZoomState) {
      return;
    }
    const interactionState = this.interactionState();
    if (interactionState?.pointerId !== event.pointerId) {
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
        this.finishPanInteraction(event, interactionState);
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
    this.store.setSelectedShapes(interactionState.additive ? [...this.selectedShapes().map((shape) => shape.id), ...marqueeShapeIds] : marqueeShapeIds);
  }

  private finishInsertInteraction(interactionState: Extract<InteractionState, { kind: 'insert' }>): void {
    const previewShapes = this.buildInsertionPreviewShapes(interactionState.toolId, interactionState.startWorldPoint, interactionState.currentWorldPoint);
    if (!previewShapes.length) {
      return;
    }

    this.runSceneMutation(() => {
      this.store.addShapes(this.remapShapeSetIds(previewShapes, () => crypto.randomUUID()));
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

  private finishMoveInteraction(event: PointerEvent, interactionState: Extract<InteractionState, { kind: 'move' }>): void {
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

  private resolveMoveTapShapeId(event: PointerEvent, interactionState: Extract<InteractionState, { kind: 'move' }>): string | null {
    const tapShapeId = interactionState.tapEligibleShapeId;
    if (!tapShapeId) {
      return null;
    }

    const tapDistance = Math.hypot(event.clientX - interactionState.startClientPoint.x, event.clientY - interactionState.startClientPoint.y);
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

  private finishPanInteraction(event: PointerEvent, interactionState: Extract<InteractionState, { kind: 'pan' }>): void {
    const tapDistance = Math.hypot(event.clientX - interactionState.startClientPoint.x, event.clientY - interactionState.startClientPoint.y);
    if (
      event.pointerType === 'touch' &&
      interactionState.sourceButton === 0 &&
      tapDistance < EDITOR_POINTER_TAP_MAX_DISTANCE_PX &&
      this.activeTool() === 'select'
    ) {
      this.store.selectShape(null);
      this.recentTextTap.set(null);
      this.recentSelectedShapeTap.set(null);
      return;
    }

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
          EDITOR_WHEEL_ROTATION_MIN_STEP_DEGREES,
          Math.min(EDITOR_WHEEL_ROTATION_MAX_STEP_DEGREES, Math.abs(axisDelta) * EDITOR_WHEEL_ROTATION_SCALE)
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
    const wasPinching = this.pinchZoomState !== null;
    if (event.touches.length < 2) {
      this.pinchZoomState = null;
      if (wasPinching) {
        this.ignoreNextCanvasClick.set(true);
      }
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
    if (this.activeTool() !== 'select') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const selectedTextShape = this.selectedTextShapeAtEvent(event);
    if (selectedTextShape) {
      this.startTextEditing(selectedTextShape);
      return;
    }

    if (this.selectionCount() !== 1) {
      return;
    }

    const shape = this.selectedShape();
    if (!shape || shape.kind === 'text') {
      return;
    }

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
    return renderedStrokeWidthForScale(strokeWidth, this.preferences().scale);
  }

  lineStrokeDashArray(shape: LineShape): string | null {
    const strokeWidth = this.scaledStrokeWidth(shape.strokeWidth);
    return this.strokeDashArray(shape.strokeStyle ?? 'solid', strokeWidth);
  }

  private strokeDashArray(strokeStyle: LineStrokeStyle, strokeWidth: number): string | null {
    const dashArray = (pattern: readonly number[]): string => pattern.map((multiplier) => strokeWidth * multiplier).join(' ');
    switch (strokeStyle) {
      case 'solid':
        return null;
      case 'dashed':
        return dashArray(LINE_DASHED_PATTERN);
      case 'dotted':
        return dashArray(LINE_DOTTED_PATTERN);
      case 'dash-dotted':
        return dashArray(LINE_DASH_DOTTED_PATTERN);
      case 'loosely-dashed':
        return dashArray(LINE_LOOSELY_DASHED_PATTERN);
    }
  }

  lineHitStrokeWidth(strokeWidth: number): number {
    return Math.max(this.scaledStrokeWidth(strokeWidth) + EDITOR_LINE_HIT_STROKE_EXTRA_PX, EDITOR_LINE_HIT_STROKE_MIN_PX);
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

  private resizePointerOffset(handle: ResizeHandle, pointerPoint: Point, selectedShape: CanvasShape | null = this.selectedShape()): Point {
    if ((selectedShape?.kind === 'rectangle' || selectedShape?.kind === 'triangle') && handle.startsWith('corner-radius-')) {
      const localHandlePoint = cornerRadiusHandlePointUtil(selectedShape, handle);
      if (localHandlePoint) {
        const center = this.shapeCenter(selectedShape);
        const angle = this.shapeRotation(selectedShape);
        const handlePoint = this.rotatePointAround(localHandlePoint, center, -angle);
        return {
          x: handlePoint.x - pointerPoint.x,
          y: handlePoint.y - pointerPoint.y
        };
      }
    }

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
    return this.arrowTipOptions.find((option) => option.id === arrowType)?.iconPath ?? getIconPath('arrowTipLatex');
  }

  arrowTipIconFilled(arrowType: ArrowTipKind): boolean {
    return isSharedArrowTipIconFilled(arrowType);
  }

  arrowTipLabel(arrowType: ArrowTipKind): string {
    return this.t(this.arrowTipOptions.find((option) => option.id === arrowType)?.labelKey ?? 'arrowTypeLatex');
  }

  arrowTipSupportsBending(arrowType: ArrowTipKind): boolean {
    return arrowType === 'straight-barb' || arrowType === 'triangle' || arrowType === 'latex' || arrowType === 'stealth';
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
      EDITOR_SELECTION_ROTATE_HANDLE_MIN_DISTANCE,
      (this.selectionHandleSize() * EDITOR_SELECTION_ROTATE_HANDLE_DISTANCE_FACTOR) / this.preferences().scale
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
      EDITOR_SELECTION_ROTATE_HANDLE_MIN_DISTANCE * this.preferences().scale,
      this.selectionHandleSize() * EDITOR_SELECTION_ROTATE_HANDLE_DISTANCE_FACTOR
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

  private triangleSelectionHandles(shape: TriangleCanvasShape): readonly HandleDescriptor[] {
    const center = this.shapeCenter(shape);
    const rotation = this.shapeRotation(shape);
    const [apex, left, right] = this.trianglePoints(shape);
    const handles: ReadonlyArray<{ readonly id: ResizeHandle; readonly point: Point }> = [
      { id: 'n', point: apex },
      { id: 'sw', point: left },
      { id: 'se', point: right }
    ];
    const centerSvg = { x: this.toSvgX(center.x), y: this.toSvgY(center.y) };

    return handles.map(({ id, point }) => {
      const renderedPoint = rotation ? this.rotatePointAround(point, center, -rotation) : point;
      const x = this.toSvgX(renderedPoint.x);
      const y = this.toSvgY(renderedPoint.y);
      return {
        id,
        x,
        y,
        cursor: this.resizeCursorForVector({ x: x - centerSvg.x, y: y - centerSvg.y })
      };
    });
  }

  private cornerRadiusHandles(shape: RectangleCanvasShape | TriangleCanvasShape): readonly HandleDescriptor[] {
    return shape.kind === 'rectangle' ? this.rectangleCornerRadiusHandles(shape) : this.triangleCornerRadiusHandles(shape);
  }

  private rectangleCornerRadiusHandles(shape: RectangleCanvasShape): readonly HandleDescriptor[] {
    const maxRadius = maxRectangleCornerRadiusUtil(shape);
    if (maxRadius <= 0) {
      return [];
    }
    const minimumVisibleInset = (this.selectionHandleSize() * EDITOR_CORNER_RADIUS_HANDLE_INSET_FACTOR) / this.preferences().scale;
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
    const minimumVisibleInset = (this.selectionHandleSize() * EDITOR_CORNER_RADIUS_HANDLE_INSET_FACTOR * 2.15) / this.preferences().scale;
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
      const ids: readonly ResizeHandle[] = ['corner-radius-apex', 'corner-radius-left', 'corner-radius-right'];
      const id = ids[index] ?? 'corner-radius-right';
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
    return this.lineSvgPath(this.lineSelectionShape(selectedShape));
  }

  private lineSelectionShape(shape: LineShape): LineShape {
    if (!shape.arrowStart && !shape.arrowEnd) {
      return shape;
    }

    const points = linePointsUtil(shape);
    if (points.length < 2) {
      return shape;
    }

    const from = shape.arrowStart ? this.insetLineSelectionEndpoint(shape, shape.from, points[1]) : shape.from;
    const to = shape.arrowEnd ? this.insetLineSelectionEndpoint(shape, shape.to, points.at(-2) ?? shape.from) : shape.to;

    if (from === shape.from && to === shape.to) {
      return shape;
    }

    return { ...shape, from, to };
  }

  private insetLineSelectionEndpoint(shape: LineShape, endpoint: Point, adjacentPoint: Point): Point {
    const deltaX = adjacentPoint.x - endpoint.x;
    const deltaY = adjacentPoint.y - endpoint.y;
    const segmentLength = Math.hypot(deltaX, deltaY);
    if (!Number.isFinite(segmentLength) || segmentLength < 0.001) {
      return endpoint;
    }

    const renderedInset = this.arrowRenderedLength(shape) / this.preferences().scale;
    const inset = Math.min(renderedInset * 0.95, segmentLength * 0.45);
    if (inset <= 0) {
      return endpoint;
    }

    return {
      x: endpoint.x + (deltaX / segmentLength) * inset,
      y: endpoint.y + (deltaY / segmentLength) * inset
    };
  }

  lineSvgPath(shape: LineShape): string {
    return this.buildLinePath(shape, (point) => ({
      x: this.toSvgX(point.x),
      y: this.toSvgY(point.y)
    }));
  }

  lineArrowHitPath(shape: LineShape, endpoint: LineEndpoint): string | null {
    const points = this.lineArrowTipHitPoints(shape, endpoint);
    if (!points) {
      return null;
    }

    return `${points
      .map((point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${command} ${this.toSvgX(point.x)} ${this.toSvgY(point.y)}`;
      })
      .join(' ')} Z`;
  }

  triangleSvgPath(shape: TriangleCanvasShape): string {
    return this.buildTrianglePath(
      shape,
      (point) => ({
        x: this.toSvgX(point.x),
        y: this.toSvgY(point.y)
      }),
      effectiveTriangleCornerRadiusUtil(shape) * this.preferences().scale
    );
  }

  rectangleCornerRadiusSvg(shape: RectangleCanvasShape): number {
    return effectiveRectangleCornerRadiusUtil(shape) * this.preferences().scale;
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
    return `${shape.id}-${shape.arrowType}-${shape.arrowOpen ? 'open' : 'fill'}-${shape.arrowRound ? 'round' : 'sharp'}-${shape.arrowScale}-${shape.arrowLengthScale}-${shape.arrowWidthScale}-${shape.lineMode}-${shape.arrowBendMode}-${side}`;
  }

  arrowMarkerWidth(shape: LineShape): number {
    return this.arrowMarkerGeometry(shape).markerWidth;
  }

  arrowCanvasMarkerWidth(shape: LineShape): number {
    return this.arrowMarkerWidth(shape) * arrowMarkerViewportScale(shape.strokeWidth, this.preferences().scale);
  }

  arrowMarkerHeight(shape: LineShape): number {
    return this.arrowMarkerGeometry(shape).markerHeight;
  }

  arrowCanvasMarkerHeight(shape: LineShape): number {
    return this.arrowMarkerHeight(shape) * arrowMarkerViewportScale(shape.strokeWidth, this.preferences().scale);
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
    return arrowTipLengthUtil(shape);
  }

  arrowTipWidth(shape: LineShape): number {
    return arrowTipWidthUtil(shape);
  }

  arrowRenderedLength(shape: LineShape): number {
    return arrowRenderedLengthUtil(shape, this.preferences().scale);
  }

  arrowRenderedHalfWidth(shape: LineShape): number {
    return arrowRenderedHalfWidthUtil(shape, this.preferences().scale);
  }

  arrowMarkerGeometry(shape: LineShape) {
    return arrowMarkerGeometryUtil(shape);
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
    const strokeUnit = Math.max(zoomScaledArrowStrokeWidth(shape.strokeWidth, this.preferences().scale) * shape.arrowScale, 0.5);
    const controlScaleMin = 0.45;
    const controlScaleMax = 8;

    if (kind === 'length') {
      return Math.min(controlScaleMax, Math.max(controlScaleMin, alongPixels / (DEFAULT_ARROW_TIP_LENGTH * strokeUnit)));
    }

    return Math.min(controlScaleMax, Math.max(controlScaleMin, (acrossPixels * 2) / (DEFAULT_ARROW_TIP_WIDTH * strokeUnit)));
  }

  arrowMarkerFill(shape: LineShape): string {
    return arrowMarkerFillUtil(shape);
  }

  arrowMarkerStrokeLineJoin(shape: LineShape): 'round' | 'miter' {
    return shape.arrowRound ? 'round' : 'miter';
  }

  arrowMarkerStrokeLineCap(shape: LineShape): 'round' | 'butt' {
    return shape.arrowRound ? 'round' : 'butt';
  }

  presetTrackBy(_: number, preset: ObjectPreset | ScenePreset): string {
    return preset.id;
  }

  handleTrackBy(_: number, handle: HandleDescriptor): string {
    return handle.id;
  }

  handleWindowKeydown(event: KeyboardEvent): void {
    if (this.isDevModeToggleShortcut(event)) {
      event.preventDefault();
      event.stopPropagation();
      this.devMode.toggle();
      return;
    }

    this.handleModifierKeydown(event);

    if (this.shouldLetBrowserHandleNativeTextShortcut(event)) {
      return;
    }

    if (this.handleWindowDialogShortcut(event)) {
      return;
    }

    if (this.isEditableTarget(event.target)) {
      if (this.isShapeInspectorControlTarget(event.target) && this.handleUndoRedoShortcut(event)) {
        return;
      }

      return;
    }

    if (this.handleSelectAllShortcut(event)) {
      return;
    }

    if (this.handleEditShortcut(event)) {
      return;
    }

    if (this.handleArrowNavigation(event)) {
      return;
    }

    const toolId = toolIdFromShortcutEvent(event, this.configuration.generalConfig().keyboardShortcuts);
    if (toolId) {
      this.setActiveTool(toolId);
      return;
    }

    if (isDeleteShortcut(event, this.configuration.generalConfig().keyboardShortcuts)) {
      this.removeSelected();
      return;
    }

    if (isZoomInShortcut(event, this.configuration.generalConfig().keyboardShortcuts)) {
      this.zoomIn();
      return;
    }

    if (isZoomOutShortcut(event, this.configuration.generalConfig().keyboardShortcuts)) {
      this.zoomOut();
      return;
    }
  }

  private handleWindowDialogShortcut(event: KeyboardEvent): boolean {
    const shortcuts = this.configuration.generalConfig().keyboardShortcuts;
    if (isOpenImportShortcut(event, shortcuts)) {
      event.preventDefault();
      event.stopPropagation();
      this.openImportModal();
      return true;
    }

    if (isOpenSettingsShortcut(event, shortcuts)) {
      event.preventDefault();
      event.stopPropagation();
      this.openAppConfigurationDialog();
      return true;
    }

    if (isFigureSearchShortcut(event, shortcuts)) {
      event.preventDefault();
      event.stopPropagation();
      this.openFigureSearch();
      return true;
    }

    if (isEscapeShortcutKey(event.key)) {
      event.preventDefault();
      this.handleEscapeShortcut();
      return true;
    }

    return false;
  }

  private isDevModeToggleShortcut(event: KeyboardEvent): boolean {
    return event.ctrlKey && !event.altKey && !event.metaKey && event.key === 'F12' && !event.repeat;
  }

  private handleModifierKeydown(event: KeyboardEvent): void {
    const modifier = pressedModifierFromKey(event.key);
    if (!modifier) {
      return;
    }

    this.setModifierPressed(modifier, true);
    if (modifier === 'space' && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
      event.preventDefault();
    }
  }

  private handleSelectAllShortcut(event: KeyboardEvent): boolean {
    if (!isSelectAllShortcut(event, this.configuration.generalConfig().keyboardShortcuts)) {
      return false;
    }

    if (this.isPopupOpen()) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    this.selectAllSceneShapes();
    return true;
  }

  private handleEditShortcut(event: KeyboardEvent): boolean {
    if (this.handleUndoRedoShortcut(event)) {
      return true;
    }
    const shortcuts = this.configuration.generalConfig().keyboardShortcuts;
    if (
      this.handlePreventableShortcut(
        event,
        (shortcutEvent) => isCopyShortcut(shortcutEvent, shortcuts),
        () => this.copySelected()
      )
    ) {
      return true;
    }
    if (
      this.handlePreventableShortcut(
        event,
        (shortcutEvent) => isCutShortcut(shortcutEvent, shortcuts),
        () => this.cutSelected()
      )
    ) {
      return true;
    }
    return isPasteShortcut(event, shortcuts);
  }

  private handleUndoRedoShortcut(event: KeyboardEvent): boolean {
    const shortcuts = this.configuration.generalConfig().keyboardShortcuts;
    if (
      this.handlePreventableShortcut(
        event,
        (shortcutEvent) => isRedoShortcut(shortcutEvent, shortcuts),
        () => this.redo()
      )
    ) {
      return true;
    }
    return this.handlePreventableShortcut(
      event,
      (shortcutEvent) => isUndoShortcut(shortcutEvent, shortcuts),
      () => this.undo()
    );
  }

  private shouldLetBrowserHandleNativeTextShortcut(event: KeyboardEvent): boolean {
    const shortcuts = this.configuration.generalConfig().keyboardShortcuts;
    if (!isCopyShortcut(event, shortcuts) && !isCutShortcut(event, shortcuts) && !isSelectAllShortcut(event, shortcuts)) {
      return false;
    }

    return this.hasNativeTextSelectionInAiPanel() || this.isAiPanelTarget(event.target);
  }

  private hasNativeTextSelectionInAiPanel(): boolean {
    const selection = this.document.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !selection.toString()) {
      return false;
    }

    for (let index = 0; index < selection.rangeCount; index += 1) {
      const range = selection.getRangeAt(index);
      if (
        this.isAiPanelSelectionNode(range.commonAncestorContainer) ||
        this.isAiPanelSelectionNode(selection.anchorNode) ||
        this.isAiPanelSelectionNode(selection.focusNode)
      ) {
        return true;
      }
    }

    return false;
  }

  private isAiPanelSelectionNode(node: Node | null): boolean {
    const element = node instanceof Element ? node : node?.parentElement;
    return !!element?.closest('.ai-panel');
  }

  private isAiPanelTarget(target: EventTarget | null): boolean {
    return target instanceof Element && !!target.closest('.ai-panel');
  }

  private handleArrowNavigation(event: KeyboardEvent): boolean {
    const arrowKey = arrowNavigationKeyFromKey(event.key);
    if (!arrowKey) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    this.pressedArrowNavigationKeys.add(arrowKey);
    this.startKeyboardNavigationLoop();
    return true;
  }

  private keyboardNavigationSpeed(): number {
    const preferences = this.preferences();
    const baseSpeed =
      preferences.snapToGrid && !this.altPressed()
        ? Math.max(preferences.snapStep, 0.01) * EDITOR_KEYBOARD_NAVIGATION_SNAP_SPEED_MULTIPLIER
        : EDITOR_KEYBOARD_NAVIGATION_BASE_SPEED;
    return this.shiftPressed() ? baseSpeed * EDITOR_KEYBOARD_NAVIGATION_FAST_MULTIPLIER : baseSpeed;
  }

  private startKeyboardNavigationLoop(): void {
    if (this.keyboardNavigationRafHandle !== null) {
      return;
    }

    this.keyboardNavigationLastTimestamp = null;
    const view = this.document.defaultView;
    if (!view) {
      return;
    }
    this.keyboardNavigationRafHandle = view.requestAnimationFrame((timestamp) => this.handleKeyboardNavigationFrame(timestamp));
  }

  private handleKeyboardNavigationFrame(timestamp: number): void {
    this.keyboardNavigationRafHandle = null;
    if (this.pressedArrowNavigationKeys.size === 0) {
      this.stopKeyboardNavigationLoop();
      return;
    }

    const lastTimestamp = this.keyboardNavigationLastTimestamp ?? timestamp;
    const deltaSeconds = Math.min(Math.max((timestamp - lastTimestamp) / 1000, 0), 0.05);
    this.keyboardNavigationLastTimestamp = timestamp;

    const delta = arrowNavigationDeltaFromKeys(this.pressedArrowNavigationKeys, this.keyboardNavigationSpeed() * deltaSeconds);
    if (delta) {
      this.applyKeyboardNavigationDelta(delta.x, delta.y);
    }

    const view = this.document.defaultView;
    if (view) {
      this.keyboardNavigationRafHandle = view.requestAnimationFrame((nextTimestamp) => this.handleKeyboardNavigationFrame(nextTimestamp));
    }
  }

  private applyKeyboardNavigationDelta(deltaX: number, deltaY: number): void {
    if (this.selectionCount() > 0) {
      if (!this.keyboardNavigationHistoryActive) {
        this.closeContextMenu();
        this.store.recordHistoryCheckpoint();
        this.keyboardNavigationHistoryActive = true;
      }
      this.moveSelectedByKeyboard(deltaX, deltaY);
      return;
    }

    this.viewportCenter.update((viewportCenter) => ({
      x: viewportCenter.x + deltaX,
      y: viewportCenter.y + deltaY
    }));
  }

  private moveSelectedByKeyboard(deltaX: number, deltaY: number): void {
    const initialShapes = this.selectedShapes();
    if (initialShapes.length === 0) {
      return;
    }

    const translatedShapes = initialShapes.map((shape) => translateShapeBy(shape, deltaX, deltaY));
    const attachmentShapeById = this.lineAttachmentShapeMap(translatedShapes);
    const nextShapes = translatedShapes.map((shape) => this.withMovedLineAttachmentsSynced(shape, attachmentShapeById));
    this.store.replaceShapes(this.withAttachedLinesMoved(nextShapes));
  }

  private stopKeyboardNavigationLoop(): void {
    const view = this.document.defaultView;
    if (this.keyboardNavigationRafHandle !== null && view) {
      view.cancelAnimationFrame(this.keyboardNavigationRafHandle);
    }
    this.keyboardNavigationRafHandle = null;
    this.keyboardNavigationLastTimestamp = null;
    this.keyboardNavigationHistoryActive = false;
  }

  private handlePreventableShortcut(event: KeyboardEvent, isMatch: (event: KeyboardEvent) => boolean, action: () => void): boolean {
    if (!isMatch(event)) {
      return false;
    }

    event.preventDefault();
    action();
    return true;
  }

  private handleEscapeShortcut(): void {
    this.pressedArrowNavigationKeys.clear();
    this.stopKeyboardNavigationLoop();

    const closeHandlers: ReadonlyArray<{ readonly isOpen: () => boolean; readonly close: () => void }> = [
      { isOpen: () => !!this.templateDeleteTarget(), close: () => this.closeDeleteTemplateDialog() },
      { isOpen: () => this.figureSearchOpen(), close: () => this.closeFigureSearch() },
      { isOpen: () => !!this.tableDialogState(), close: () => this.closeTableDialog() },
      { isOpen: () => !!this.regularPolygonDialogState(), close: () => this.closeRegularPolygonDialog() },
      { isOpen: () => !!this.graphDialogState(), close: () => this.closeGraphDialog() },
      { isOpen: () => this.templateDialogOpen(), close: () => this.closeTemplateDialog() },
      { isOpen: () => this.appConfigurationDialogOpen(), close: () => this.closeAppConfigurationDialog() },
      { isOpen: () => this.importModalOpen(), close: () => this.closeImportModal() },
      { isOpen: () => this.exportModalOpen(), close: () => this.closeExportModal() },
      { isOpen: () => !!this.sceneReplaceDialog(), close: () => this.closeSceneReplaceDialog() },
      { isOpen: () => this.importReplaceDialog().isOpen(), close: () => this.importReplaceDialog().close() },
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
    const arrowKey = arrowNavigationKeyFromKey(event.key);
    if (arrowKey) {
      this.pressedArrowNavigationKeys.delete(arrowKey);
      if (this.pressedArrowNavigationKeys.size === 0) {
        this.stopKeyboardNavigationLoop();
      }
    }

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
    this.pressedArrowNavigationKeys.clear();
    this.stopKeyboardNavigationLoop();
    this.ignoreNextShapeClickId.set(null);
    this.interactionState.set(null);
    this.sidebarResizeState.set(null);
    this.mobileLibraryPanelOpen.set(false);
    this.finishInspectorEditHistory();
  }

  handleWindowPointerMove(event: PointerEvent): void {
    const resizeState = this.sidebarResizeState();
    if (!resizeState) {
      return;
    }

    if (resizeState.axis === 'y') {
      const delta = event.clientY - resizeState.startPointer;
      this.sidebarResizeMoved ||= Math.abs(delta) > 3;
      if (resizeState.side === 'left') {
        this.mobileLeftSidebarHeight.set(this.clampSidebarSize('mobile-left', resizeState.startSize - delta));
        return;
      }
      this.mobileRightSidebarHeight.set(this.clampSidebarSize('mobile-right', resizeState.startSize - delta));
      return;
    }

    if (resizeState.side === 'left') {
      const delta = event.clientX - resizeState.startPointer;
      this.sidebarResizeMoved ||= Math.abs(delta) > 3;
      this.leftSidebarWidth.set(this.clampSidebarSize('left', resizeState.startSize + delta));
      return;
    }

    const delta = resizeState.startPointer - event.clientX;
    this.sidebarResizeMoved ||= Math.abs(delta) > 3;
    this.rightSidebarWidth.set(this.clampSidebarSize('right', resizeState.startSize + delta));
  }

  handleWindowPointerUp(): void {
    if (this.sidebarResizeState() && this.sidebarResizeStartedFromToggle && this.sidebarResizeMoved) {
      this.suppressNextSidebarToggleClick = true;
    }
    this.sidebarResizeState.set(null);
    this.sidebarResizeMoved = false;
    this.sidebarResizeStartedFromToggle = false;
  }

  handleFocusOut(event: FocusEvent): void {
    if (this.isShapeInspectorControlTarget(event.target)) {
      this.finishInspectorEditHistory();
    }
  }

  private showNotification(message: string, tone: NotificationTone = 'info'): void {
    const id = crypto.randomUUID();
    this.notifications.update((notifications) => [...notifications, { id, message, tone }]);
    globalThis.setTimeout(() => {
      this.notifications.update((notifications) => notifications.filter((notification) => notification.id !== id));
    }, EDITOR_NOTIFICATION_DURATION_MS);
  }

  private showExportNotification(format: 'png' | 'svg'): void {
    const scope = this.selectedShapes().length ? 'Selection' : 'Scene';
    const formatKey = format === 'png' ? 'Png' : 'Svg';
    this.showNotification(this.t(`exportNotice${scope}${formatKey}`));
  }

  private runAsync(task: Promise<unknown>): void {
    task.catch(() => undefined);
  }

  private handleStorageEvent(event: StorageEvent): void {
    const { key, newValue } = event;
    if (key === this.editorStateStorageKey && newValue) {
      this.applyStoredEditorState(newValue);
      return;
    }

    if (this.configuration.restoreFromStorageEvent(key, newValue)) {
      return;
    }

    if (this.devMode.restoreFromStorageEvent(key, newValue)) {
      return;
    }

    if (key === this.editorSyncStorageKey && newValue && !this.syncChannel) {
      this.applyRemoteEditorSyncMessageFromRaw(newValue);
      return;
    }

    if (key === this.sidebarSizesStorageKey) {
      this.applyStoredSidebarSizes(newValue);
    }
  }

  private applyStoredEditorState(value: string): void {
    if (!this.syncChannel) {
      this.applyRemoteEditorStateFromRaw(value);
      return;
    }

    const parsed = this.editorStorage.parseJson<Partial<PersistedEditorState>>(value);
    const nextTheme = parsed?.preferences?.theme;
    if (nextTheme === 'light' || nextTheme === 'dark') {
      this.store.setTheme(nextTheme);
    }
  }

  private applyStoredSidebarSizes(value: string | null): void {
    const sidebarSizes = this.parseStoredSidebarSizes(value);
    this.leftSidebarWidth.set(sidebarSizes.left);
    this.rightSidebarWidth.set(sidebarSizes.right);
  }

  private currentSyncedEditorDocument(): { readonly scene: TikzScene; readonly importCode: string } {
    return {
      scene: this.scene(),
      importCode: this.store.importCode()
    };
  }

  private openEditorSyncChannel(): void {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }

    this.syncChannel = new BroadcastChannel('tikz-drawer.editor-sync');
    this.syncChannel.onmessage = (event: MessageEvent<unknown>) => {
      const message = this.parseEditorSyncMessage(event.data);
      if (message) {
        this.applyRemoteEditorSyncMessage(message);
      }
    };
  }

  private scheduleEditorSyncBroadcast(document: { readonly scene: TikzScene; readonly importCode: string }): void {
    this.pendingSyncDocument = document;
    if (this.syncBroadcastRafHandle !== null) {
      return;
    }

    const broadcast = () => {
      this.syncBroadcastRafHandle = null;
      const pendingDocument = this.pendingSyncDocument;
      this.pendingSyncDocument = null;
      if (!pendingDocument) {
        return;
      }

      const message: EditorSyncMessage = {
        type: 'document',
        senderId: this.syncClientId,
        revision: ++this.syncRevision,
        scene: pendingDocument.scene,
        importCode: pendingDocument.importCode
      };

      this.syncChannel?.postMessage(message);
      if (!this.syncChannel) {
        this.editorStorage.setJson(this.editorSyncStorageKey, message);
      }
    };

    const view = this.document.defaultView;
    if (!view) {
      broadcast();
      return;
    }
    this.syncBroadcastRafHandle = view.requestAnimationFrame(broadcast);
  }

  private applyRemoteEditorStateFromRaw(raw: string): void {
    const state = this.editorStorage.parseJson<PersistedEditorState>(raw);
    if (!state?.scene) {
      return;
    }

    this.applyingRemoteSync = true;
    this.store.restoreSyncedDocument(state.scene, state.importCode);
  }

  private applyRemoteEditorSyncMessageFromRaw(raw: string): void {
    const parsed = this.editorStorage.parseJson<unknown>(raw);
    const message = this.parseEditorSyncMessage(parsed);
    if (!message) {
      return;
    }

    this.applyRemoteEditorSyncMessage(message);
  }

  private parseEditorSyncMessage(value: unknown): EditorSyncMessage | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const message = value as Partial<EditorSyncMessage>;
    if (
      message.type !== 'document' ||
      typeof message.senderId !== 'string' ||
      typeof message.revision !== 'number' ||
      !message.scene ||
      typeof message.importCode !== 'string'
    ) {
      return null;
    }
    return message as EditorSyncMessage;
  }

  private applyRemoteEditorSyncMessage(message: EditorSyncMessage): void {
    if (message.senderId === this.syncClientId) {
      return;
    }

    const lastRevision = this.lastRemoteRevisionByClient.get(message.senderId) ?? 0;
    if (message.revision <= lastRevision) {
      return;
    }

    this.lastRemoteRevisionByClient.set(message.senderId, message.revision);
    this.applyingRemoteSync = true;
    this.store.restoreSyncedDocument(message.scene, message.importCode);
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
    let multiplier = 1;
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      multiplier = lineHeight;
    } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      multiplier = pageHeight;
    }
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

    if (this.scene().shapes.length > 0) {
      this.importReplaceDialog().requestSharedReplacement(sharedState);
      return;
    }

    this.applySharedSceneState(sharedState);
    this.clearSharedSceneFromUrl();
  }

  private applySharedSceneState(sharedState: SharedScenePayload): void {
    this.store.restoreSharedState(sharedState);
    this.viewportCenter.set(sharedState.viewportCenter ?? { x: 0, y: 0 });
    if (sharedState.latexExportConfig) {
      this.configuration.setLatexExportConfig(sharedState.latexExportConfig);
    }
  }

  private clearSharedSceneFromUrl(): void {
    const location = globalThis.location;
    const history = globalThis.history;
    if (!location || !history?.replaceState) {
      return;
    }

    const url = new URL(location.href);
    if (!url.searchParams.has('share')) {
      return;
    }

    url.searchParams.delete('share');
    history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  private requestSceneReplacement(presetId: string): void {
    if (this.scene().shapes.length === 0 || !this.configuration.generalConfig().confirmSceneReplacement) {
      if (presetId === 'blank') {
        this.resetSceneConfirmed();
      } else {
        this.applyScenePresetConfirmed(presetId);
      }
      return;
    }

    const preset = presetId === 'blank' ? null : (this.scenePresets.find((entry) => entry.id === presetId) ?? null);
    this.skipFutureSceneReplaceConfirmations.set(false);
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

    if (this.skipFutureSceneReplaceConfirmations()) {
      this.configuration.patchGeneralConfig({ confirmSceneReplacement: false });
    }
    this.sceneReplaceDialog.set(null);
    this.skipFutureSceneReplaceConfirmations.set(false);
    if (dialog.presetId === 'blank') {
      this.resetSceneConfirmed();
      return;
    }
    this.applyScenePresetConfirmed(dialog.presetId);
  }

  closeSceneReplaceDialog(): void {
    this.sceneReplaceDialog.set(null);
    this.skipFutureSceneReplaceConfirmations.set(false);
  }

  private setScaleFromViewportCenter(nextScale: number): void {
    const viewportRect = this.canvasViewport().nativeElement.getBoundingClientRect();
    this.setScaleAtClientPoint(nextScale, viewportRect.left + viewportRect.width / 2, viewportRect.top + viewportRect.height / 2);
  }

  private setScaleAtClientPoint(nextScale: number, clientX: number, clientY: number, roundToInteger: boolean = true): void {
    const normalizedScale = roundToInteger ? Math.round(nextScale) : Math.round(nextScale * EDITOR_SCALE_DECIMAL_FACTOR) / EDITOR_SCALE_DECIMAL_FACTOR;
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

  centerViewportOnShape(shapeId: string): void {
    const shape = this.scene().shapes.find((entry) => entry.id === shapeId);
    if (!shape) {
      return;
    }

    this.viewportCenter.set(this.shapeCenter(shape));
  }

  centerViewportOnPendingPatch(): void {
    const pendingCreatedShapeIds = new Set(this.aiPatch.pendingCreatedShapeIds());
    if (pendingCreatedShapeIds.size) {
      this.centerViewportOnShapes(this.scene().shapes.filter((shape) => pendingCreatedShapeIds.has(shape.id)));
      return;
    }

    this.centerViewportOnShapes(this.aiPatch.previewShapes());
  }

  private centerViewportOnShapes(shapes: readonly CanvasShape[]): void {
    const bounds = this.computeBounds(shapes);
    if (!bounds) {
      return;
    }

    this.viewportCenter.set({
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.bottom + bounds.top) / 2
    });
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

  private snapResizePointer(shape: CanvasShape, point: Point): Point {
    const rotation = this.shapeRotation(shape);
    if (!this.shouldSnapInShapeLocalSpace(shape, rotation)) {
      return this.snapScenePoint(point);
    }

    const center = this.shapeCenter(shape);
    const localPoint = this.rotatePointAround(point, center, rotation);
    const snappedLocal = this.snapScenePoint(localPoint);
    return this.rotatePointAround(snappedLocal, center, -rotation);
  }

  private shouldSnapInShapeLocalSpace(shape: CanvasShape, rotation: number): boolean {
    if (Math.abs(rotation) < 0.0001) {
      return false;
    }

    switch (shape.kind) {
      case 'rectangle':
      case 'triangle':
      case 'ellipse':
      case 'image':
      case 'text':
        return true;
      default:
        return false;
    }
  }

  suggestedCaption(): string {
    const name = this.scene().name.trim();
    return name || 'TikZ figure';
  }

  suggestedLabel(): string {
    const slug = this.scene().name.toLowerCase().trim().replaceAll(REGEX.editor.slugInvalidChars, '-').replaceAll(REGEX.editor.slugTrimDashes, '');
    return `fig:${slug || 'tikz-figure'}`;
  }

  private latexAlignmentCommand(alignment: LatexAlignment): string {
    switch (alignment) {
      case 'center':
        return String.raw`\centering`;
      case 'left':
        return String.raw`\raggedright`;
      case 'right':
        return String.raw`\raggedleft`;
    }
  }

  private latexWidthExpression(percent: number): string {
    if (percent >= 100) {
      return String.raw`\textwidth`;
    }

    const normalized = Number.parseFloat((percent / 100).toFixed(2));
    return String.raw`${normalized}\textwidth`;
  }

  private canPreviewInsert(toolId: string): boolean {
    return this.allInsertablePresets().some((preset) => preset.id === toolId);
  }

  private presetKeepsOwnStyle(toolId: string): boolean {
    return (
      this.savedTemplates().some((template) => template.id === toolId) || this.objectPresets.some((preset) => preset.id === toolId && preset.preserveStyle)
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
          arrowType: preferences.defaultArrowType,
          arrowScale: preferences.defaultArrowScale,
          arrowLengthScale: 1,
          arrowWidthScale: 1,
          arrowBendMode: 'none',
          strokeOpacity: 1,
          strokeWidth: preferences.defaultStrokeWidth,
          strokeStyle: preferences.defaultLineStrokeStyle
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
          ...(shape.kind === 'rectangle' || shape.kind === 'triangle' ? { cornerRadius: preferences.defaultCornerRadius } : {}),
          ...(shape.kind === 'triangle' ? { apexOffset: shape.apexOffset ?? 0.5 } : {}),
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
          color: preferences.defaultTextColor,
          colorOpacity: 1,
          fontSize: Math.max(Math.sqrt(shape.fontSize / DEFAULT_TEXT_FONT_SIZE) * preferences.defaultTextFontSize, MIN_TEXT_FONT_SIZE)
        };
    }
  }

  private buildInsertionPreviewShapes(toolId: string, startPoint: Point, currentPoint: Point): readonly CanvasShape[] {
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

    const directLinePreview = this.buildDirectLineInsertionPreview(preset, startPoint, currentPoint, hasDrag, keepOwnStyle);
    if (directLinePreview) {
      return directLinePreview;
    }

    if (!hasDrag) {
      const centerX = (templateBounds.left + templateBounds.right) / 2;
      const centerY = (templateBounds.bottom + templateBounds.top) / 2;
      const idMap = this.shapeIdMap(templateShapes, (_, index) => `preview-${index}`);
      const previewShapes = this.localizeInsertedPresetShapes(
        preset,
        this.remapShapeSetAttachments(
          templateShapes.map((shape) =>
            this.applyPresetStyle(
              this.transformShape(shape, {
                deltaX: startPoint.x - centerX,
                deltaY: startPoint.y - centerY,
                scaleX: 1,
                scaleY: 1,
                originX: templateBounds.left,
                originY: templateBounds.bottom,
                id: idMap.get(shape.id) ?? shape.id
              }),
              keepOwnStyle
            )
          ),
          idMap
        ),
        keepOwnStyle
      );
      return this.syncLineAttachmentsInShapeSet(previewShapes);
    }

    const targetLeft = Math.min(startPoint.x, currentPoint.x);
    const targetBottom = Math.min(startPoint.y, currentPoint.y);
    const targetWidth = Math.max(Math.abs(deltaX), MIN_SHAPE_DIMENSION);
    const targetHeight = Math.max(Math.abs(deltaY), MIN_SHAPE_DIMENSION);
    const templateWidth = Math.max(templateBounds.right - templateBounds.left, MIN_SHAPE_DIMENSION);
    const templateHeight = Math.max(templateBounds.top - templateBounds.bottom, MIN_SHAPE_DIMENSION);
    const scaleX = targetWidth / templateWidth;
    const scaleY = targetHeight / templateHeight;
    const idMap = this.shapeIdMap(templateShapes, (_, index) => `preview-${index}`);

    const previewShapes = this.localizeInsertedPresetShapes(
      preset,
      this.remapShapeSetAttachments(
        templateShapes.map((shape) =>
          this.applyPresetStyle(
            this.transformShape(shape, {
              deltaX: targetLeft - templateBounds.left * scaleX,
              deltaY: targetBottom - templateBounds.bottom * scaleY,
              scaleX,
              scaleY,
              originX: 0,
              originY: 0,
              id: idMap.get(shape.id) ?? shape.id
            }),
            keepOwnStyle
          )
        ),
        idMap
      ),
      keepOwnStyle
    );
    return this.syncLineAttachmentsInShapeSet(previewShapes);
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
      strokeStyle: this.preferences().defaultLineStrokeStyle,
      arrowStart: false,
      arrowEnd: false,
      arrowType: this.preferences().defaultArrowType,
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
    if (shape?.kind !== 'line') {
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
    ) as LineShape;

    return this.localizeInsertedPresetShapes(preset, [this.withLineInsertionEndpointAttachments(nextLine)], keepOwnStyle);
  }

  private withLineInsertionEndpointAttachments(line: LineShape): LineShape {
    const withFromAttachment = this.withLineEndpointAttachment(line, 'from', line.from) as LineShape;
    return this.withLineEndpointAttachment(withFromAttachment, 'to', withFromAttachment.to) as LineShape;
  }

  private insertPresetAt(toolId: string, point: Point): void {
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
    const idMap = this.shapeIdMap(templateShapes, () => crypto.randomUUID());
    const shapes = this.syncLineAttachmentsInShapeSet(
      remapStructuralShapeIds(
        this.localizeInsertedPresetShapes(
          preset,
          this.remapShapeSetAttachments(
            templateShapes.map((shape) =>
              this.applyPresetStyle(
                this.transformShape(shape, {
                  deltaX: point.x - centerX,
                  deltaY: point.y - centerY,
                  scaleX: 1,
                  scaleY: 1,
                  originX: 0,
                  originY: 0,
                  id: idMap.get(shape.id) ?? shape.id
                }),
                keepOwnStyle
              )
            ),
            idMap
          ),
          keepOwnStyle
        )
      )
    );
    this.store.addShapes(shapes);
    this.store.selectShape(null);
  }

  private isQuickLineInsertionPreset(preset: ObjectPreset): boolean {
    return (preset.id === 'segment' || preset.id === 'arrow') && preset.shapes.length === 1 && preset.shapes[0]?.kind === 'line';
  }

  private applyPresetStyle(shape: CanvasShape, keepOwnStyle: boolean): CanvasShape {
    return keepOwnStyle ? shape : this.applyInsertionDefaults(shape);
  }

  private resolvePresetTemplateShapes(toolId: string, preset: ObjectPreset): readonly CanvasShape[] {
    if (toolId === 'table') {
      return buildTablePresetShapes(this.tablePresetDimensions());
    }

    if (toolId === REGULAR_POLYGON_PRESET_ID) {
      const dimensions = this.regularPolygonDimensions();
      return buildRegularPolygonShapes({
        ...dimensions,
        cx: 0,
        cy: 0,
        radius: 2.2,
        name: this.regularPolygonName(dimensions.sides)
      });
    }

    if (this.isGraphPresetId(toolId)) {
      const dimensions = normalizeGraphDimensions({
        ...this.graphDimensions(),
        kind: GRAPH_PRESET_KIND_BY_ID[toolId]
      });
      return buildGraphShapes({
        ...dimensions,
        cx: 0,
        cy: 0,
        scale: 1,
        name: this.presetTitle(preset)
      });
    }

    return structuredClone(preset.shapes);
  }

  private localizeInsertedPresetShapes(preset: ObjectPreset, shapes: readonly CanvasShape[], keepOwnStyle: boolean): readonly CanvasShape[] {
    const localizedShapes = keepOwnStyle ? shapes : this.localizePresetCanvasShapes(shapes);

    if (keepOwnStyle || preset.id === REGULAR_POLYGON_PRESET_ID || this.isGraphPresetId(preset.id) || localizedShapes.length !== 1) {
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

  private transformShape(shape: CanvasShape, options: TransformCanvasShapeOptions): CanvasShape {
    return transformCanvasShape(shape, options);
  }

  private shapeIdMap(shapes: readonly CanvasShape[], nextId: (shape: CanvasShape, index: number) => string): ReadonlyMap<string, string> {
    return new Map(shapes.map((shape, index) => [shape.id, nextId(shape, index)]));
  }

  private remapShapeSetIds(shapes: readonly CanvasShape[], nextId: (shape: CanvasShape, index: number) => string): readonly CanvasShape[] {
    const idMap = this.shapeIdMap(shapes, nextId);
    return this.remapShapeSetAttachments(
      shapes.map((shape) => ({ ...shape, id: idMap.get(shape.id) ?? shape.id }) as CanvasShape),
      idMap
    );
  }

  private remapShapeSetAttachments(shapes: readonly CanvasShape[], idMap: ReadonlyMap<string, string>): readonly CanvasShape[] {
    return shapes.map((shape) => this.remapLineAttachments(shape, idMap));
  }

  private remapLineAttachments(shape: CanvasShape, idMap: ReadonlyMap<string, string>): CanvasShape {
    if (shape.kind !== 'line') {
      return shape;
    }

    return {
      ...shape,
      fromAttachment: this.remapLineAttachment(shape.fromAttachment, idMap),
      toAttachment: this.remapLineAttachment(shape.toAttachment, idMap)
    } as LineShape;
  }

  private remapLineAttachment(attachment: LineEndpointAttachment | undefined, idMap: ReadonlyMap<string, string>): LineEndpointAttachment | undefined {
    if (!attachment) {
      return undefined;
    }

    return {
      ...attachment,
      shapeId: idMap.get(attachment.shapeId) ?? attachment.shapeId
    };
  }

  private syncLineAttachmentsInShapeSet(shapes: readonly CanvasShape[]): readonly CanvasShape[] {
    const shapeById = new Map(shapes.map((shape) => [shape.id, shape]));
    return shapes.map((shape) => this.syncLineAttachmentEndpoints(shape, shapeById));
  }

  private syncLineAttachmentEndpoints(shape: CanvasShape, shapeById: ReadonlyMap<string, CanvasShape>): CanvasShape {
    if (shape.kind !== 'line') {
      return shape;
    }

    return {
      ...shape,
      from: this.syncedLineAttachmentPoint(shape.from, shape.fromAttachment, shapeById),
      to: this.syncedLineAttachmentPoint(shape.to, shape.toAttachment, shapeById)
    } as LineShape;
  }

  private syncedLineAttachmentPoint(currentPoint: Point, attachment: LineEndpointAttachment | undefined, shapeById: ReadonlyMap<string, CanvasShape>): Point {
    if (!attachment) {
      return currentPoint;
    }

    const attachedShape = shapeById.get(attachment.shapeId);
    if (!attachedShape) {
      return currentPoint;
    }

    return this.lineAttachmentPoint(attachedShape, attachment, currentPoint);
  }

  private openTableDialog(state: TableDialogState): void {
    this.tableDialogState.set({
      ...normalizeTableDimensions(state),
      mode: state.mode,
      submitMode: state.submitMode
    });
  }

  private openRegularPolygonDialog(state: RegularPolygonDialogState): void {
    this.regularPolygonDialogState.set({
      ...normalizeRegularPolygonDimensions(state),
      submitMode: state.submitMode
    });
  }

  private openGraphDialog(state: GraphDialogState): void {
    this.graphDialogState.set({
      ...normalizeGraphDimensions(state),
      submitMode: state.submitMode
    });
  }

  private isGraphPresetId(toolId: string): toolId is GraphPresetId {
    return GRAPH_PRESET_IDS.includes(toolId as GraphPresetId);
  }

  private graphToolIdForKind(kind: GraphDimensions['kind']): GraphPresetId {
    return GRAPH_PRESET_ID_BY_KIND[kind];
  }

  private replaceSelectedTable(dimensions: TableDimensions): void {
    const table = this.selectedTable();
    if (!table) {
      return;
    }

    const frame = table.shapes.find((shape): shape is RectangleCanvasShape => shape.kind === 'rectangle' && shape.table?.role === 'frame');
    if (!frame) {
      return;
    }

    const dividerPrototype =
      table.shapes.find((shape): shape is LineCanvasShape => shape.kind === 'line' && shape.table?.role === 'row-divider') ??
      table.shapes.find((shape): shape is LineCanvasShape => shape.kind === 'line' && shape.table?.role === 'column-divider');

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
    if (firstShape.kind !== 'line') {
      return firstShape.kind;
    }

    return firstShape.arrowEnd ? 'arrow' : 'segment';
  }

  private restoreSavedTemplates(): void {
    const raw = this.editorStorage.getString(this.savedTemplatesStorageKey);
    this.savedTemplates.set(parseSavedTemplatesFromStorage(raw));
  }

  private restorePinnedTools(): void {
    const raw = this.editorStorage.getString(this.pinnedToolsStorageKey);
    this.pinnedToolIds.set(parsePinnedToolIdsFromStorage(raw, this.savedTemplates()));
  }

  private persistSavedTemplates(): void {
    this.editorStorage.setJson(this.savedTemplatesStorageKey, this.savedTemplates());
  }

  private restoreSidebarSizes(): { readonly left: number; readonly right: number } {
    return this.parseStoredSidebarSizes(this.editorStorage.getString(this.sidebarSizesStorageKey));
  }

  private parseStoredSidebarSizes(raw: string | null | undefined): { readonly left: number; readonly right: number } {
    const fallback: { readonly left: number; readonly right: number } = { left: 288, right: 340 };
    if (!raw) {
      return fallback;
    }

    const parsed = this.editorStorage.parseJson<{ readonly left?: unknown; readonly right?: unknown }>(raw);
    if (!parsed) {
      return fallback;
    }

    let left = fallback.left;
    let right = fallback.right;

    if (typeof parsed.left === 'number' && Number.isFinite(parsed.left)) {
      left = this.clampSidebarSize('left', parsed.left);
    }

    if (typeof parsed.right === 'number' && Number.isFinite(parsed.right)) {
      right = this.clampSidebarSize('right', parsed.right);
    }

    return { left, right };
  }

  private buildSnippetExport(): { readonly imports: string; readonly code: string; readonly combined: string } {
    const baseBundle = this.baseTikzExportBundle();
    const config = this.latexExportConfig();
    const caption = config.caption.trim() || this.suggestedCaption();
    const label = config.label.trim() || this.suggestedLabel();
    const useAdjustbox = config.scaleToWidth || config.includeFrame;
    const imports = [baseBundle.imports, ...(useAdjustbox ? [String.raw`\usepackage{adjustbox}`] : [])];
    const adjustboxOptions = [
      ...(config.includeFrame ? ['frame'] : []),
      ...(config.scaleToWidth ? [`max width=${this.latexWidthExpression(config.maxWidthPercent)}`] : []),
      ...(config.scaleToWidth && config.alignment === 'center' ? ['center'] : [])
    ];

    if (config.wrapInFigure && config.figurePlacement.includes('H')) {
      imports.push(String.raw`\usepackage{float}`);
    }

    const contentLines = [
      this.latexAlignmentCommand(config.alignment),
      config.fontSize === 'normalsize' ? '' : `\\${config.fontSize}`,
      ...(useAdjustbox ? [String.raw`\begin{adjustbox}{${adjustboxOptions.join(',')}}`, baseBundle.code, String.raw`\end{adjustbox}`] : [baseBundle.code])
    ].filter(Boolean);

    const code = config.wrapInFigure
      ? [
          String.raw`\begin{figure}[${config.figurePlacement || 'H'}]`,
          ...contentLines.map((line) => `  ${line}`),
          ...(config.includeCaption ? [String.raw`  \caption{${caption}}`] : []),
          ...(config.includeLabel ? [String.raw`  \label{${label}}`] : []),
          String.raw`\end{figure}`
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
      String.raw`\documentclass[${documentClassOptions}]{standalone}`,
      snippet.imports,
      String.raw`\begin{document}`,
      snippet.code,
      String.raw`\end{document}`
    ].join('\n');
  }

  private formatLatexDecimal(value: number): string {
    return Number.parseFloat(value.toFixed(2)).toString();
  }

  private findShapesInsideBounds(bounds: SelectionBounds): string[] {
    return this.scene()
      .shapes.filter((shape) => this.shapeIntersectsMarqueeBounds(shape, bounds))
      .map((shape) => shape.id);
  }

  private shapeIntersectsMarqueeBounds(shape: CanvasShape, bounds: SelectionBounds): boolean {
    if (shape.kind === 'line') {
      return this.lineIntersectsMarqueeBounds(shape, bounds);
    }

    if (shape.kind === 'triangle') {
      return this.triangleIntersectsMarqueeBounds(shape, bounds);
    }

    const shapeBounds = this.computeBounds([shape]);
    return (
      shapeBounds !== null &&
      shapeBounds.left <= bounds.right &&
      shapeBounds.right >= bounds.left &&
      shapeBounds.bottom <= bounds.top &&
      shapeBounds.top >= bounds.bottom
    );
  }

  private triangleIntersectsMarqueeBounds(shape: TriangleCanvasShape, bounds: SelectionBounds): boolean {
    const width = bounds.right - bounds.left;
    const height = bounds.top - bounds.bottom;
    const point = { x: (bounds.left + bounds.right) / 2, y: (bounds.bottom + bounds.top) / 2 };
    const tolerance = Math.max(shape.strokeWidth / 2, 0.06);
    if (width <= 0.0001 && height <= 0.0001) {
      return pointInTriangleShapeUtil(shape, point, tolerance);
    }

    const center = this.shapeCenter(shape);
    const rotation = this.shapeRotation(shape);
    const outlinePoints = triangleOutlinePointsUtil(shape).map((outlinePoint) =>
      rotation ? this.rotatePointAround(outlinePoint, center, -rotation) : outlinePoint
    );

    if (outlinePoints.some((outlinePoint) => this.pointInsideBounds(outlinePoint, bounds))) {
      return true;
    }

    const corners = [
      { x: bounds.left, y: bounds.bottom },
      { x: bounds.right, y: bounds.bottom },
      { x: bounds.right, y: bounds.top },
      { x: bounds.left, y: bounds.top }
    ];
    return (
      corners.some((corner) => pointInTriangleShapeUtil(shape, corner, tolerance)) ||
      outlinePoints.some((outlinePoint, index) =>
        this.segmentIntersectsBounds(outlinePoint, outlinePoints[(index + 1) % outlinePoints.length] ?? outlinePoint, bounds)
      )
    );
  }

  private lineIntersectsMarqueeBounds(shape: LineShape, bounds: SelectionBounds): boolean {
    const tolerance = EDITOR_LINE_MARQUEE_TOLERANCE_PX / this.preferences().scale;
    const expandedBounds = {
      left: bounds.left - tolerance,
      right: bounds.right + tolerance,
      bottom: bounds.bottom - tolerance,
      top: bounds.top + tolerance
    };
    const points = this.linePoints(shape);
    return (
      points.some((point) => this.pointInsideBounds(point, expandedBounds)) ||
      points.slice(0, -1).some((point, index) => {
        const nextPoint = points[index + 1];
        return nextPoint ? this.segmentIntersectsBounds(point, nextPoint, expandedBounds) : false;
      }) ||
      this.lineArrowTipIntersectsBounds(shape, 'from', expandedBounds) ||
      this.lineArrowTipIntersectsBounds(shape, 'to', expandedBounds)
    );
  }

  private lineArrowTipIntersectsBounds(shape: LineShape, endpoint: LineEndpoint, bounds: SelectionBounds): boolean {
    const points = this.lineArrowTipHitPoints(shape, endpoint);
    if (!points) {
      return false;
    }

    const corners = [
      { x: bounds.left, y: bounds.bottom },
      { x: bounds.right, y: bounds.bottom },
      { x: bounds.right, y: bounds.top },
      { x: bounds.left, y: bounds.top }
    ];

    return (
      points.some((point) => this.pointInsideBounds(point, bounds)) ||
      corners.some((corner) => this.pointInPolygon(corner, points)) ||
      points.some((point, index) => this.segmentIntersectsBounds(point, points[(index + 1) % points.length] ?? point, bounds))
    );
  }

  private lineArrowTipHitPoints(shape: LineShape, endpoint: LineEndpoint): readonly Point[] | null {
    const showsArrow = endpoint === 'from' ? shape.arrowStart : shape.arrowEnd;
    if (!showsArrow) {
      return null;
    }

    const points = this.linePoints(shape);
    if (points.length < 2) {
      return null;
    }

    const target = endpoint === 'from' ? shape.from : shape.to;
    const adjacent = endpoint === 'from' ? points[1] : (points.at(-2) ?? shape.from);
    const deltaX = target.x - adjacent.x;
    const deltaY = target.y - adjacent.y;
    const segmentLength = Math.hypot(deltaX, deltaY);
    if (!Number.isFinite(segmentLength) || segmentLength < 0.001) {
      return null;
    }

    const unit = { x: deltaX / segmentLength, y: deltaY / segmentLength };
    const normal = { x: -unit.y, y: unit.x };
    const hitPadding = Math.max(this.lineHitStrokeWidth(shape.strokeWidth) / this.preferences().scale / 2, 0.06);
    const length = Math.min(this.arrowRenderedLength(shape) / this.preferences().scale + hitPadding, segmentLength * 0.6);
    const halfWidth = this.arrowRenderedHalfWidth(shape) / this.preferences().scale + hitPadding;
    const tip = {
      x: target.x + unit.x * hitPadding,
      y: target.y + unit.y * hitPadding
    };
    const baseCenter = {
      x: target.x - unit.x * length,
      y: target.y - unit.y * length
    };

    return [
      tip,
      { x: baseCenter.x + normal.x * halfWidth, y: baseCenter.y + normal.y * halfWidth },
      { x: baseCenter.x - normal.x * halfWidth, y: baseCenter.y - normal.y * halfWidth }
    ];
  }

  private pointInsideBounds(point: Point, bounds: SelectionBounds): boolean {
    return point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.bottom && point.y <= bounds.top;
  }

  private segmentIntersectsBounds(start: Point, end: Point, bounds: SelectionBounds): boolean {
    if (this.pointInsideBounds(start, bounds) || this.pointInsideBounds(end, bounds)) {
      return true;
    }

    const segmentBounds = this.boundsFromPoints([start, end]);
    if (
      !segmentBounds ||
      segmentBounds.right < bounds.left ||
      segmentBounds.left > bounds.right ||
      segmentBounds.top < bounds.bottom ||
      segmentBounds.bottom > bounds.top
    ) {
      return false;
    }

    const corners = [
      { x: bounds.left, y: bounds.bottom },
      { x: bounds.right, y: bounds.bottom },
      { x: bounds.right, y: bounds.top },
      { x: bounds.left, y: bounds.top }
    ];
    return corners.some((corner, index) => this.segmentsIntersect(start, end, corner, corners[(index + 1) % corners.length] ?? corner));
  }

  private segmentsIntersect(firstStart: Point, firstEnd: Point, secondStart: Point, secondEnd: Point): boolean {
    const direction = (origin: Point, target: Point, point: Point): number =>
      (target.x - origin.x) * (point.y - origin.y) - (target.y - origin.y) * (point.x - origin.x);
    const firstDirectionStart = direction(firstStart, firstEnd, secondStart);
    const firstDirectionEnd = direction(firstStart, firstEnd, secondEnd);
    const secondDirectionStart = direction(secondStart, secondEnd, firstStart);
    const secondDirectionEnd = direction(secondStart, secondEnd, firstEnd);
    return firstDirectionStart * firstDirectionEnd <= 0 && secondDirectionStart * secondDirectionEnd <= 0;
  }

  private pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
    let inside = false;
    for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
      const current = polygon[index];
      const previous = polygon[previousIndex];
      if (!current || !previous) {
        continue;
      }
      const crossesY = current.y > point.y !== previous.y > point.y;
      if (!crossesY) {
        continue;
      }
      const intersectionX = ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
      if (point.x < intersectionX) {
        inside = !inside;
      }
    }
    return inside;
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

  private buildTrianglePath(shape: TriangleCanvasShape, projectPoint: (point: Point) => { readonly x: number; readonly y: number }, cornerRadius = 0): string {
    return buildTrianglePathUtil(shape, projectPoint, cornerRadius);
  }

  private buildLinePath(shape: LineShape, projectPoint: (point: Point) => { readonly x: number; readonly y: number }): string {
    return buildLinePathUtil(shape, projectPoint);
  }

  private shapeBounds(shape: CanvasShape): SelectionBounds | null {
    return shapeBoundsUtil(shape);
  }

  private boundsFromPoints(points: readonly Point[]): SelectionBounds | null {
    return boundsFromPointsUtil(points);
  }

  private cornerRadiusFromPointer(shape: RectangleCanvasShape | TriangleCanvasShape, handle: ResizeHandle, pointer: Point): number {
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
    const selectionPivot = this.selectionRotationPivot(selectedShapes, bounds);
    this.store.recordHistoryCheckpoint();
    const rotatedShapes = selectedShapes.map((shape) => this.rotateShapeAround(shape, selectionPivot, rotationDeltaDegrees));
    this.store.replaceShapes(this.withAttachedLinesMoved(rotatedShapes));
  }

  private selectionRotationPivot(shapes: readonly CanvasShape[], bounds: SelectionBounds): Point {
    const singleShape = shapes.length === 1 ? shapes[0] : null;
    return singleShape
      ? this.shapeCenter(singleShape)
      : {
          x: (bounds.left + bounds.right) / 2,
          y: (bounds.bottom + bounds.top) / 2
        };
  }

  private selectionCanRotate(shapes: readonly CanvasShape[]): boolean {
    const firstShape = shapes[0] ?? null;
    return shapes.length > 0 && !(shapes.length === 1 && (firstShape?.kind === 'line' || firstShape?.kind === 'circle'));
  }

  private resizeShape(shape: CanvasShape, handle: ResizeHandle, point: Point): CanvasShape {
    return resizeShapeUtil(shape, handle, point, {
      shapeBounds: (entry) => this.shapeBounds(entry),
      lineArrowControlScale: (line, endpoint, targetPoint, kind) => this.lineArrowControlScale(line, endpoint, targetPoint, kind),
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

  private resizeShapeSelection(shapes: readonly CanvasShape[], selectionBounds: SelectionBounds, handle: ResizeHandle, point: Point): readonly CanvasShape[] {
    return resizeSelection(shapes, selectionBounds, handle, point, this.shiftPressed());
  }

  private loadImageDimensions(src: string): Promise<{ readonly width: number; readonly height: number } | null> {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        resolve(image.naturalWidth && image.naturalHeight ? { width: image.naturalWidth, height: image.naturalHeight } : null);
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
    const imageItem = Array.from(transfer?.items ?? []).find((item) => item.kind === 'file' && item.type.startsWith('image/'));
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
    const { width, height } = this.imageInsertionSize(aspectRatio);
    const imageShape = this.applyInsertionDefaults({
      id: crypto.randomUUID(),
      name: file.name.replaceAll(REGEX.editor.extensionSuffix, '') || 'Image',
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

  private imageInsertionSize(aspectRatio: number): { readonly width: number; readonly height: number } {
    const viewport = this.canvasViewport().nativeElement;
    const viewportWidth = viewport.clientWidth || this.canvasWidth();
    const viewportHeight = viewport.clientHeight || this.canvasHeight();
    const maxRenderedLongEdge = Math.min(
      Math.max(viewportWidth, viewportHeight) * EDITOR_IMAGE_INSERT_VIEWPORT_RATIO,
      EDITOR_IMAGE_INSERT_MAX_RENDERED_LONG_EDGE_PX
    );
    const maxRenderedWidth = Math.min(
      Math.max(viewportWidth * EDITOR_IMAGE_INSERT_VIEWPORT_RATIO, EDITOR_IMAGE_INSERT_MIN_RENDERED_LONG_EDGE_PX),
      maxRenderedLongEdge
    );
    const maxRenderedHeight = Math.min(
      Math.max(viewportHeight * EDITOR_IMAGE_INSERT_VIEWPORT_RATIO, EDITOR_IMAGE_INSERT_MIN_RENDERED_LONG_EDGE_PX),
      maxRenderedLongEdge
    );

    let renderedWidth = maxRenderedWidth;
    let renderedHeight = renderedWidth / aspectRatio;
    if (renderedHeight > maxRenderedHeight) {
      renderedHeight = maxRenderedHeight;
      renderedWidth = renderedHeight * aspectRatio;
    }

    const renderedLongEdge = Math.max(renderedWidth, renderedHeight);
    const minimumLongEdge = Math.min(EDITOR_IMAGE_INSERT_MIN_RENDERED_LONG_EDGE_PX, maxRenderedLongEdge);
    if (renderedLongEdge < minimumLongEdge) {
      const scale = minimumLongEdge / renderedLongEdge;
      renderedWidth *= scale;
      renderedHeight *= scale;
    }

    const currentScale = Math.max(this.preferences().scale, 1);
    const width = renderedWidth / currentScale;
    const height = renderedHeight / currentScale;
    const minimumWorldScale = Math.max(MIN_IMAGE_DIMENSION / width, MIN_IMAGE_DIMENSION / height, 1);

    return {
      width: width * minimumWorldScale,
      height: height * minimumWorldScale
    };
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    );
  }

  private isShapeInspectorControlTarget(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      this.selectionCount() > 0 &&
      target.closest('app-editor-right-sidebar') !== null &&
      target.closest('.field, .range-field, .color-chip-field, app-toggle-field') !== null
    );
  }

  private isPopupOpen(): boolean {
    return (
      this.fileMenuOpen() ||
      this.exportModalOpen() ||
      this.importModalOpen() ||
      this.appConfigurationDialogOpen() ||
      this.figureSearchOpen() ||
      this.templateDialogOpen() ||
      !!this.templateDeleteTarget() ||
      !!this.tableDialogState() ||
      !!this.regularPolygonDialogState() ||
      !!this.graphDialogState() ||
      !!this.sceneReplaceDialog() ||
      this.importReplaceDialog().isOpen() ||
      !!this.contextMenu() ||
      this.textSymbolPaletteOpen()
    );
  }

  private focusCanvasViewport(): void {
    this.canvasViewport().nativeElement.focus({ preventScroll: true });
  }

  private shortcutLabel(action: KeyboardShortcutAction): string {
    return keyboardShortcutLabel(keyboardShortcutForAction(this.configuration.generalConfig().keyboardShortcuts, action), this.isMacPlatform());
  }

  private isMacPlatform(): boolean {
    const platform = this.document.defaultView?.navigator.platform.toLowerCase() ?? '';
    return platform.includes('mac');
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
    this.runAfterNextPaint(() => {
      const input = this.inlineTextInput()?.nativeElement;
      if (!input) {
        return;
      }

      input.focus({ preventScroll: true });
      const end = input.value.length;
      input.setSelectionRange(0, end, 'forward');
      input.select();
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
    this.runAfterNextPaint(() => {
      input.focus();
      const nextCursor = start + symbol.length;
      input.setSelectionRange(nextCursor, nextCursor);
    });
  }

  private runAfterNextPaint(callback: () => void): void {
    const view = this.document.defaultView;
    if (!view) {
      callback();
      return;
    }

    view.requestAnimationFrame(() => view.requestAnimationFrame(callback));
  }

  private exportFileBaseName(): string {
    return (this.scene().name || 'figure').trim().replaceAll(REGEX.editor.filenameInvalidChars, '-');
  }

  private isRepeatedTextTap(shapeId: string): boolean {
    const previousTap = this.recentTextTap();
    return !!previousTap && previousTap.shapeId === shapeId && Date.now() - previousTap.timestamp < TEXT_DOUBLE_TAP_WINDOW_MS;
  }

  private isRepeatedSelectedShapeTap(shapeId: string): boolean {
    const previousTap = this.recentSelectedShapeTap();
    return !!previousTap && previousTap.shapeId === shapeId && Date.now() - previousTap.timestamp < TEXT_DOUBLE_TAP_WINDOW_MS;
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

  private canvasExportShapes(): readonly CanvasShape[] {
    const selectedShapes = this.selectedShapes();
    return selectedShapes.length ? selectedShapes : this.scene().shapes;
  }

  private buildCanvasExportDocument(omitImages = false, selectedShapes: readonly CanvasShape[] = this.selectedShapes()): ExportSvgDocument {
    return buildCanvasExportDocumentUtil({
      selectedShapes,
      sceneShapes: this.scene().shapes,
      theme: this.preferences().theme,
      omitImages,
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
