import type { LatexColorMode } from '../../tikz/tikz.codegen';
import type {
  ArrowTipKind,
  CanvasShape,
  ObjectPreset,
  Point,
  PresetCategory,
  TextShape
} from '../../models/tikz.models';
import type { SelectionBounds } from '../../utils/editor-page.utils';

export type InspectorTab = 'properties' | 'scene' | 'code';
export type ExportMode = 'snippet' | 'standalone';
export type CodeHighlightTheme = 'aurora' | 'sunset' | 'midnight' | 'forest' | 'rose' | 'graphite';
export type ToolId = 'select' | string;
export type NotificationTone = 'info' | 'warning';
export type SidebarSide = 'left' | 'right';
export type SidebarResizeTarget = SidebarSide | 'mobile-left' | 'mobile-right';
export type SvgTextAnchor = 'start' | 'middle' | 'end';
export type CssTextAlign = 'left' | 'center' | 'right';
export type TextStyleKey = 'fontWeight' | 'fontStyle' | 'textDecoration';
export type TextStylePropertyKey = TextStyleKey | 'textAlign';
export type LatexExportTextKey = 'figurePlacement' | 'caption' | 'label';
export type LatexExportNumberKey = 'maxWidthPercent' | 'standaloneBorderMm';
export type LatexExportBooleanKey =
  | 'wrapInFigure'
  | 'scaleToWidth'
  | 'includeFrame'
  | 'includeCaption'
  | 'includeLabel';
export type TemplateDialogTextKey = 'title' | 'description';
export type PreferenceNumberKey = 'scale' | 'snapStep' | 'defaultStrokeWidth' | 'defaultArrowScale';
export type PreferenceTextKey = 'defaultStroke' | 'defaultFill';
export type PreferenceBooleanKey = 'snapToGrid' | 'showGrid' | 'showAxes';
export type ShapeTextKey = 'name' | 'stroke' | 'fill' | 'text' | 'color' | 'arrowColor';
export type ShapeOpacityKey = 'strokeOpacity' | 'fillOpacity' | 'colorOpacity' | 'arrowOpacity';
export type ImageTextKey = 'src' | 'latexSource';
export type ImageDimensionKey = 'width' | 'height';
export type TextTransformMode = 'uppercase' | 'lowercase' | 'titlecase';
export type LineBooleanKey = 'arrowStart' | 'arrowEnd' | 'arrowOpen' | 'arrowRound';
export type ContextAction =
  | 'copy'
  | 'cut'
  | 'paste'
  | 'duplicate'
  | 'delete'
  | 'front'
  | 'back'
  | 'group'
  | 'ungroup'
  | 'png';
export type LineEndpoint = 'from' | 'to';
export type ArrowEndpoint = 'start' | 'end';
export type ArrowScaleKind = 'length' | 'width';
export type ResizeCursor = 'ew-resize' | 'ns-resize' | 'nesw-resize' | 'nwse-resize';
export type ArrowControlHandle = 'arrow-length-start' | 'arrow-length-end' | 'arrow-width-start' | 'arrow-width-end';
export type ArrowDirection = 'none' | 'forward' | 'backward' | 'both';
export type TextCanvasShape = Extract<CanvasShape, { kind: 'text' }>;
export type LineCanvasShape = Extract<CanvasShape, { kind: 'line' }>;
export type RectangleCanvasShape = Extract<CanvasShape, { kind: 'rectangle' }>;
export type CircleCanvasShape = Extract<CanvasShape, { kind: 'circle' }>;
export type EllipseCanvasShape = Extract<CanvasShape, { kind: 'ellipse' }>;
export type RectangleOrImageCanvasShape = Extract<CanvasShape, { kind: 'rectangle' | 'image' }>;
export type ResizeHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | LineEndpoint
  | ArrowControlHandle
  | `anchor-${number}`
  | `insert-anchor-${number}`;
export type ContextTarget = 'canvas' | 'shape';

export interface ToastNotification {
  readonly id: string;
  readonly message: string;
  readonly tone: NotificationTone;
}

export const LATEX_ALIGNMENTS = ['center', 'left', 'right'] as const;
export type LatexAlignment = (typeof LATEX_ALIGNMENTS)[number];

export const LATEX_FONT_SIZES = ['tiny', 'scriptsize', 'footnotesize', 'small', 'normalsize', 'large'] as const;
export type LatexFontSize = (typeof LATEX_FONT_SIZES)[number];

export const LATEX_COLOR_MODES = ['direct-rgb', 'define-colors'] as const satisfies readonly LatexColorMode[];

export interface LatexExportConfig {
  readonly colorMode: LatexColorMode;
  readonly wrapInFigure: boolean;
  readonly figurePlacement: string;
  readonly alignment: LatexAlignment;
  readonly scaleToWidth: boolean;
  readonly includeFrame: boolean;
  readonly maxWidthPercent: number;
  readonly standaloneBorderMm: number;
  readonly fontSize: LatexFontSize;
  readonly includeCaption: boolean;
  readonly caption: string;
  readonly includeLabel: boolean;
  readonly label: string;
}

export interface ToolDescriptor {
  readonly id: ToolId;
  readonly label: string;
  readonly description: string;
  readonly iconPath: string;
  readonly shortcut?: string;
}

export interface LibrarySection {
  readonly category: PresetCategory;
  readonly title: string;
  readonly iconPath: string;
  readonly presets: readonly ObjectPreset[];
}

export interface SavedTemplate {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly pinned?: boolean;
  readonly shapes: readonly CanvasShape[];
}

export interface HandleDescriptor {
  readonly id: ResizeHandle;
  readonly x: number;
  readonly y: number;
  readonly cursor: string;
  readonly variant?: 'endpoint' | 'anchor' | 'ghost-anchor' | 'arrow-control';
}

export interface HomogeneousSelectionInfo {
  readonly kind: CanvasShape['kind'];
  readonly shapes: readonly CanvasShape[];
}

export interface MoveInteractionState {
  readonly kind: 'move';
  readonly pointerId: number;
  readonly startClientPoint: Point;
  readonly startWorldPoint: Point;
  readonly initialShapes: readonly CanvasShape[];
  readonly tapEligibleShapeId: string | null;
}

export interface PanInteractionState {
  readonly kind: 'pan';
  readonly pointerId: number;
  readonly lastClientPoint: Point;
  readonly sourceButton: number;
}

export interface PendingPanInteractionState {
  readonly kind: 'pending-pan';
  readonly pointerId: number;
  readonly startClientPoint: Point;
  readonly lastClientPoint: Point;
  readonly sourceButton: number;
}

export interface ResizeInteractionState {
  readonly kind: 'resize';
  readonly pointerId: number;
  readonly handle: ResizeHandle;
  readonly initialShape: CanvasShape | null;
  readonly initialShapes: readonly CanvasShape[];
  readonly initialBounds: SelectionBounds | null;
}

export interface MarqueeInteractionState {
  readonly kind: 'marquee';
  readonly pointerId: number;
  readonly startWorldPoint: Point;
  readonly currentWorldPoint: Point;
  readonly additive: boolean;
}

export interface InsertInteractionState {
  readonly kind: 'insert';
  readonly pointerId: number;
  readonly toolId: ToolId;
  readonly startWorldPoint: Point;
  readonly currentWorldPoint: Point;
}

export interface FreehandInteractionState {
  readonly kind: 'freehand';
  readonly pointerId: number;
  readonly points: readonly Point[];
}

export type InteractionState =
  | MoveInteractionState
  | PanInteractionState
  | PendingPanInteractionState
  | ResizeInteractionState
  | MarqueeInteractionState
  | InsertInteractionState
  | FreehandInteractionState;

export interface ContextMenuState {
  readonly clientX: number;
  readonly clientY: number;
  readonly target: ContextTarget;
  readonly shapeId: string | null;
}

export interface InlineTextEditorState {
  readonly shapeId: string;
  readonly value: string;
}

export interface TextSymbolGroup {
  readonly label: string;
  readonly symbols: readonly {
    readonly label: string;
    readonly insert: string;
    readonly title: string;
  }[];
}

export interface SceneReplaceDialogState {
  readonly presetId: string;
  readonly title: string;
}

export interface ClipboardShapeSet {
  readonly shapes: readonly CanvasShape[];
  readonly pasteCount: number;
}

export type Axis = 'x' | 'y';
export interface SidebarResizeState {
  readonly side: SidebarSide;
  readonly axis: Axis;
  readonly startPointer: number;
  readonly startSize: number;
}

export interface PinchZoomState {
  readonly initialDistance: number;
  readonly initialScale: number;
}

export interface RecentTextTap {
  readonly shapeId: string;
  readonly timestamp: number;
}

export interface TextSymbolPalettePosition {
  readonly top: number;
  readonly left: number;
  readonly maxHeight: number;
}

export interface ArrowTipOption {
  readonly id: ArrowTipKind;
  readonly title: string;
}

export interface ExportSvgDocument {
  readonly markup: string;
  readonly width: number;
  readonly height: number;
}

export interface MinimapRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface MinimapShapeBase {
  readonly kind: CanvasShape['kind'];
  readonly stroke: string;
  readonly strokeWidth: number;
}

export interface MinimapLineShape extends MinimapShapeBase {
  readonly kind: 'line';
  readonly path: string;
}

export interface MinimapRectangleShape extends MinimapShapeBase {
  readonly kind: 'rectangle';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
  readonly rx: number;
}

export interface MinimapCircleShape extends MinimapShapeBase {
  readonly kind: 'circle';
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly fill: string;
}

export interface MinimapEllipseShape extends MinimapShapeBase {
  readonly kind: 'ellipse';
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly fill: string;
}

export interface MinimapTextShape extends MinimapShapeBase {
  readonly kind: 'text';
  readonly x: number;
  readonly y: number;
  readonly lines: readonly string[];
  readonly fontSize: number;
  readonly fill: string;
  readonly fillOpacity: number;
  readonly textAnchor: SvgTextAnchor;
  readonly fontWeight: TextShape['fontWeight'];
  readonly fontStyle: TextShape['fontStyle'];
  readonly textDecoration: TextShape['textDecoration'];
  readonly transform: string | null;
}

export interface MinimapImageShape extends MinimapShapeBase {
  readonly kind: 'image';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly href: string;
}

export type MinimapShape =
  | MinimapLineShape
  | MinimapRectangleShape
  | MinimapCircleShape
  | MinimapEllipseShape
  | MinimapTextShape
  | MinimapImageShape;

export interface MinimapOverview {
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
