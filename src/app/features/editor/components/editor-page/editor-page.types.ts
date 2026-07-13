import type { ArrowTipKind, CanvasShape, ObjectPreset, Point, PresetCategory } from '../../models/tikz.models';
import type { SelectionBounds } from '../../utils/editor-page.utils';
import type { LatexExportMode } from '../../config/latex-export.config';

export type InspectorTab = 'properties' | 'scene' | 'assistant';
export type ExportMode = LatexExportMode;
export type NotificationTone = 'info' | 'warning';
export type SidebarSide = 'left' | 'right';
export type SidebarResizeTarget = SidebarSide | 'mobile-left' | 'mobile-right';
export type SvgTextAnchor = 'start' | 'middle' | 'end';
export type CssTextAlign = 'left' | 'center' | 'right';
export type TextStyleKey = 'fontWeight' | 'fontStyle' | 'textDecoration';
export type TextStylePropertyKey = TextStyleKey | 'textAlign';
export type TemplateDialogTextKey = 'title' | 'description';
export type PreferenceNumberKey =
  | 'scale'
  | 'snapStep'
  | 'defaultStrokeOpacity'
  | 'defaultFillOpacity'
  | 'defaultStrokeWidth'
  | 'defaultArrowScale'
  | 'defaultCornerRadius'
  | 'defaultTextOpacity'
  | 'defaultTextFontSize';
export type PreferenceTextKey = 'defaultStroke' | 'defaultFill' | 'defaultArrowType' | 'defaultLineStrokeStyle' | 'defaultTextColor' | 'defaultImagePath';
export type PreferenceBooleanKey = 'snapToGrid' | 'snapToObjects' | 'showObjectSnapGuides' | 'showGrid' | 'showAxes';
export type ShapeTextKey = 'name' | 'stroke' | 'fill' | 'text' | 'color' | 'arrowColor';
export type ShapeOpacityKey = 'strokeOpacity' | 'fillOpacity' | 'colorOpacity' | 'arrowOpacity';
export type ImageTextKey = 'src' | 'latexSource';
export type ImageDimensionKey = 'width' | 'height';
export type TextTransformMode = 'uppercase' | 'lowercase' | 'titlecase';
export type LineBooleanKey = 'arrowStart' | 'arrowEnd' | 'arrowOpen' | 'arrowRound';
export type LineEndpoint = 'from' | 'to';
export type ArrowEndpoint = 'start' | 'end';
export type ArrowScaleKind = 'length' | 'width';
export type ResizeCursor = 'ew-resize' | 'ns-resize' | 'nesw-resize' | 'nwse-resize';
export type ArrowControlHandle = 'arrow-length-start' | 'arrow-length-end' | 'arrow-width-start' | 'arrow-width-end';
export type ArrowDirection = 'none' | 'forward' | 'backward' | 'both';
export type TextCanvasShape = Extract<CanvasShape, { kind: 'text' }>;
export type LineCanvasShape = Extract<CanvasShape, { kind: 'line' }>;
export type RectangleCanvasShape = Extract<CanvasShape, { kind: 'rectangle' }>;
export type TriangleCanvasShape = Extract<CanvasShape, { kind: 'triangle' }>;
export type CircleCanvasShape = Extract<CanvasShape, { kind: 'circle' }>;
export type EllipseCanvasShape = Extract<CanvasShape, { kind: 'ellipse' }>;
export type RectangleOrImageCanvasShape = Extract<CanvasShape, { kind: 'rectangle' | 'triangle' | 'image' }>;
export type ResizeHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate'
  | 'corner-radius-nw'
  | 'corner-radius-ne'
  | 'corner-radius-se'
  | 'corner-radius-sw'
  | 'corner-radius-apex'
  | 'corner-radius-left'
  | 'corner-radius-right'
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

export { LATEX_ALIGNMENTS, LATEX_COLOR_MODES, LATEX_EXPORT_MODES, LATEX_FONT_SIZES } from '../../config/latex-export.config';
export type {
  CodeHighlightTheme,
  LatexAlignment,
  LatexExportBooleanKey,
  LatexExportConfig,
  LatexExportNumberKey,
  LatexExportTextKey,
  LatexFontSize
} from '../../config/latex-export.config';

export interface ToolDescriptor {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly iconPath: string;
  readonly iconWidth?: number;
  readonly iconStrokeWidth?: number;
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

export interface LineAttachmentPreviewDescriptor {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly active: boolean;
}

export interface LineAttachmentCandidate {
  readonly shape: CanvasShape;
  readonly anchor: Point;
  readonly point: Point;
  readonly distance: number;
}

export interface HandleDescriptor {
  readonly id: ResizeHandle;
  readonly x: number;
  readonly y: number;
  readonly cursor: string;
  readonly variant?: 'endpoint' | 'anchor' | 'ghost-anchor' | 'arrow-control' | 'rotate' | 'corner-radius';
}

export interface MultiEditCapabilities {
  readonly stroke: boolean;
  readonly fill: boolean;
  readonly dimensions: boolean;
  readonly cornerRadius: boolean;
  readonly triangleApex: boolean;
  readonly circleRadius: boolean;
  readonly ellipseRadii: boolean;
  readonly rotation: boolean;
  readonly line: boolean;
  readonly text: boolean;
  readonly image: boolean;
}

export interface MultiEditSelectionInfo {
  readonly kind: CanvasShape['kind'] | 'mixed';
  readonly shapes: readonly CanvasShape[];
  readonly capabilities: MultiEditCapabilities;
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
  readonly startClientPoint: Point;
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
  readonly cursor: string;
  readonly pointerOffset: Point;
  readonly initialShape: CanvasShape | null;
  readonly initialShapes: readonly CanvasShape[];
  readonly initialBounds: SelectionBounds | null;
}

export interface RotateInteractionState {
  readonly kind: 'rotate';
  readonly pointerId: number;
  readonly initialShapes: readonly CanvasShape[];
  readonly pivot: Point;
  readonly startAngleRadians: number;
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
  readonly toolId: string;
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
  | RotateInteractionState
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
  readonly projection?: {
    readonly bounds: SelectionBounds;
    readonly padding: number;
    readonly scale: number;
  };
}
