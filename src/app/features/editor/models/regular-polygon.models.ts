import type { CanvasShape } from './tikz.models';

export interface RegularPolygonDimensions {
  readonly sides: number;
}

export interface RegularPolygonGeometry extends RegularPolygonDimensions {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
}

export interface BuildRegularPolygonShapesOptions extends RegularPolygonGeometry {
  readonly name?: string;
  readonly mergeId?: string;
}

export interface RegularPolygonDialogState extends RegularPolygonDimensions {
  readonly submitMode: 'arm-insert' | 'center-insert';
}

export const REGULAR_POLYGON_PRESET_ID = 'regular-polygon';
export const REGULAR_POLYGON_MIN_SIDES = 3;
export const REGULAR_POLYGON_MAX_SIDES = 720;

export const DEFAULT_REGULAR_POLYGON_DIMENSIONS: RegularPolygonDimensions = {
  sides: 5
};

export const DEFAULT_REGULAR_POLYGON_GEOMETRY: RegularPolygonGeometry = {
  ...DEFAULT_REGULAR_POLYGON_DIMENSIONS,
  cx: 0,
  cy: 0,
  radius: 2.2
};

export type RegularPolygonShape = Extract<CanvasShape, { kind: 'line' }>;
