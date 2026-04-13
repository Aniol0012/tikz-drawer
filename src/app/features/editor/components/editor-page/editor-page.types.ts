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
export type ArrowControlHandle = 'arrow-length-start' | 'arrow-length-end' | 'arrow-width-start' | 'arrow-width-end';
export type ArrowDirection = 'none' | 'forward' | 'backward' | 'both';
export type ResizeHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'from'
  | 'to'
  | ArrowControlHandle
  | `anchor-${number}`
  | `insert-anchor-${number}`;
export type ContextTarget = 'canvas' | 'shape';

export interface ToastNotification {
  readonly id: string;
  readonly message: string;
  readonly tone: 'info' | 'warning';
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
  readonly startWorldPoint: Point;
  readonly initialShapes: readonly CanvasShape[];
}

export interface PanInteractionState {
  readonly kind: 'pan';
  readonly pointerId: number;
  readonly lastClientPoint: Point;
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
  readonly side: 'left' | 'right';
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
  readonly textAnchor: 'start' | 'middle' | 'end';
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
