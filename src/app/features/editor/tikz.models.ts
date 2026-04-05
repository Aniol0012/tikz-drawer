export type ThemeMode = 'light' | 'dark';
export type ShapeKind = 'line' | 'rectangle' | 'circle' | 'ellipse' | 'text';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface CanvasShapeBase {
  readonly id: string;
  readonly name: string;
  readonly kind: ShapeKind;
  readonly stroke: string;
  readonly strokeWidth: number;
}

export interface LineShape extends CanvasShapeBase {
  readonly kind: 'line';
  readonly from: Point;
  readonly to: Point;
  readonly arrowStart: boolean;
  readonly arrowEnd: boolean;
}

export interface RectangleShape extends CanvasShapeBase {
  readonly kind: 'rectangle';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
  readonly cornerRadius: number;
}

export interface CircleShape extends CanvasShapeBase {
  readonly kind: 'circle';
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly fill: string;
}

export interface EllipseShape extends CanvasShapeBase {
  readonly kind: 'ellipse';
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly fill: string;
}

export interface TextShape extends CanvasShapeBase {
  readonly kind: 'text';
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly fontSize: number;
  readonly color: string;
}

export type CanvasShape = LineShape | RectangleShape | CircleShape | EllipseShape | TextShape;

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
}

export interface PersistedEditorState {
  readonly scene: TikzScene;
  readonly preferences: EditorPreferences;
  readonly importCode: string;
}

export interface ObjectPreset {
  readonly id: string;
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly shape: CanvasShape;
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
