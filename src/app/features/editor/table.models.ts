import type { CanvasShape } from './tikz.models';

export interface TableDimensions {
  readonly rows: number;
  readonly columns: number;
}

export interface TableGeometry extends TableDimensions {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface BuildTableShapesOptions extends TableGeometry {
  readonly mergeId?: string;
  readonly tableId?: string;
  readonly frameStroke?: string;
  readonly frameStrokeOpacity?: number;
  readonly frameStrokeWidth?: number;
  readonly frameFill?: string;
  readonly frameFillOpacity?: number;
  readonly frameCornerRadius?: number;
  readonly dividerStroke?: string;
  readonly dividerStrokeOpacity?: number;
  readonly dividerStrokeWidth?: number;
}

export interface TableSelectionInfo extends TableGeometry {
  readonly frameId: string;
  readonly mergeId?: string;
  readonly tableId: string;
  readonly shapes: readonly CanvasShape[];
}

export interface TableDialogState extends TableDimensions {
  readonly mode: 'create' | 'edit';
  readonly submitMode: 'arm-insert' | 'center-insert' | 'replace-selection';
}

export const DEFAULT_TABLE_DIMENSIONS: TableDimensions = {
  rows: 4,
  columns: 3
};

export const DEFAULT_TABLE_GEOMETRY: TableGeometry = {
  ...DEFAULT_TABLE_DIMENSIONS,
  x: -2.6,
  y: -1.6,
  width: 5.2,
  height: 3.2
};

export const TABLE_PICKER_MAX_ROWS = 6;
export const TABLE_PICKER_MAX_COLUMNS = 10;
