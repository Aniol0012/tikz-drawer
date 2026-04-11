export type ThemeMode = 'light' | 'dark';
export type ShapeKind = 'line' | 'rectangle' | 'circle' | 'ellipse' | 'text' | 'image';
export type TextWeight = 'normal' | 'bold';
export type TextStyle = 'normal' | 'italic';
export type TextAlign = 'left' | 'center' | 'right';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface CanvasShapeBase {
  readonly id: string;
  readonly name: string;
  readonly kind: ShapeKind;
  readonly stroke: string;
  readonly strokeOpacity: number;
  readonly strokeWidth: number;
  readonly mergeId?: string;
}

export type ArrowTipKind = 'latex' | 'triangle' | 'stealth' | 'diamond' | 'circle' | 'bar' | 'hooks' | 'bracket';

export interface LineShape extends CanvasShapeBase {
  readonly kind: 'line';
  readonly from: Point;
  readonly to: Point;
  readonly anchors: readonly Point[];
  readonly lineMode: 'straight' | 'curved';
  readonly arrowStart: boolean;
  readonly arrowEnd: boolean;
  readonly arrowType: ArrowTipKind;
  readonly arrowColor: string;
  readonly arrowOpacity: number;
  readonly arrowOpen: boolean;
  readonly arrowRound: boolean;
  readonly arrowScale: number;
  readonly arrowLengthScale: number;
  readonly arrowWidthScale: number;
  readonly arrowBendMode: 'none' | 'flex' | 'flex-prime' | 'bend';
}

export interface RectangleShape extends CanvasShapeBase {
  readonly kind: 'rectangle';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
  readonly fillOpacity: number;
  readonly cornerRadius: number;
}

export interface CircleShape extends CanvasShapeBase {
  readonly kind: 'circle';
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly fill: string;
  readonly fillOpacity: number;
}

export interface EllipseShape extends CanvasShapeBase {
  readonly kind: 'ellipse';
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly fill: string;
  readonly fillOpacity: number;
}

export interface TextShape extends CanvasShapeBase {
  readonly kind: 'text';
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly textBox: boolean;
  readonly boxWidth: number;
  readonly fontSize: number;
  readonly color: string;
  readonly colorOpacity: number;
  readonly fontWeight: TextWeight;
  readonly fontStyle: TextStyle;
  readonly textDecoration: 'none' | 'underline';
  readonly textAlign: TextAlign;
  readonly rotation: number;
}

export interface ImageShape extends CanvasShapeBase {
  readonly kind: 'image';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
  readonly src: string;
  readonly latexSource: string;
}

export type CanvasShape = LineShape | RectangleShape | CircleShape | EllipseShape | TextShape | ImageShape;

export interface SceneBounds {
  readonly width: number;
  readonly height: number;
}

export interface TikzScene {
  readonly name: string;
  readonly bounds: SceneBounds;
  readonly shapes: readonly CanvasShape[];
}

export interface EditorPreferences {
  readonly theme: ThemeMode;
  readonly snapToGrid: boolean;
  readonly showGrid: boolean;
  readonly showAxes: boolean;
  readonly scale: number;
  readonly snapStep: number;
  readonly defaultStroke: string;
  readonly defaultFill: string;
  readonly defaultStrokeWidth: number;
  readonly defaultArrowScale: number;
}

export interface PersistedEditorState {
  readonly scene: TikzScene;
  readonly preferences: EditorPreferences;
  readonly importCode: string;
}

export type PresetCategory = 'essentials' | 'flow' | 'geometry' | 'data' | 'interface' | 'concepts';

export interface ObjectPreset {
  readonly id: string;
  readonly category: PresetCategory;
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly quickAccess?: boolean;
  readonly preserveStyle?: boolean;
  readonly searchTerms?: readonly string[];
  readonly shapes: readonly CanvasShape[];
}

export interface ScenePreset {
  readonly id: string;
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly scene: TikzScene;
}

export interface ParsedTikzResult {
  readonly scene: TikzScene;
  readonly warnings: readonly string[];
}
