import {
  DEFAULT_ARROW_SCALE,
  DEFAULT_LINE_COLOR,
  DEFAULT_SHAPE_STROKE_WIDTH,
  DEFAULT_TABLE_AXIS,
  DEFAULT_TABLE_DIVIDER_COLOR,
  DEFAULT_TABLE_DIVIDER_STROKE_WIDTH,
  DEFAULT_TABLE_FILL_COLOR
} from '../constants/editor.constants';
import type { BuildTableShapesOptions, TableDimensions, TableSelectionInfo } from '../models/table.models';
import type { CanvasShape, LineShape, RectangleShape, TableShapeMetadata } from '../models/tikz.models';

const clampInteger = (value: number, minimumValue: number): number => {
  if (!Number.isFinite(value)) {
    return minimumValue;
  }

  return Math.max(minimumValue, Math.round(value));
};

export const normalizeTableDimensions = (dimensions: TableDimensions): TableDimensions => ({
  rows: clampInteger(dimensions.rows, DEFAULT_TABLE_AXIS),
  columns: clampInteger(dimensions.columns, DEFAULT_TABLE_AXIS)
});

const buildTableMetadata = (
  tableId: string,
  role: TableShapeMetadata['role'],
  dimensions: TableDimensions
): TableShapeMetadata => ({
  id: tableId,
  role,
  rows: dimensions.rows,
  columns: dimensions.columns
});

export const buildTableShapes = (options: BuildTableShapesOptions): readonly CanvasShape[] => {
  const dimensions = normalizeTableDimensions(options);
  const tableId = options.tableId ?? crypto.randomUUID();
  const mergeId = options.mergeId ?? crypto.randomUUID();
  const rowHeight = options.height / dimensions.rows;
  const columnWidth = options.width / dimensions.columns;

  const frame: RectangleShape = {
    id: crypto.randomUUID(),
    name: 'Table frame',
    kind: 'rectangle',
    stroke: options.frameStroke ?? DEFAULT_LINE_COLOR,
    strokeOpacity: options.frameStrokeOpacity ?? 1,
    strokeWidth: options.frameStrokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH,
    fill: options.frameFill ?? DEFAULT_TABLE_FILL_COLOR,
    fillOpacity: options.frameFillOpacity ?? 1,
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    cornerRadius: options.frameCornerRadius ?? 0.08,
    mergeId,
    table: buildTableMetadata(tableId, 'frame', dimensions)
  };

  const rowDividers: LineShape[] = Array.from({ length: dimensions.rows - 1 }, (_, index) => {
    const dividerY = options.y + options.height - rowHeight * (index + 1);
    return {
      id: crypto.randomUUID(),
      name: `Table row ${index + 1}`,
      kind: 'line',
      stroke: options.dividerStroke ?? DEFAULT_TABLE_DIVIDER_COLOR,
      strokeOpacity: options.dividerStrokeOpacity ?? 1,
      strokeWidth: options.dividerStrokeWidth ?? DEFAULT_TABLE_DIVIDER_STROKE_WIDTH,
      from: { x: options.x, y: dividerY },
      to: { x: options.x + options.width, y: dividerY },
      anchors: [],
      lineMode: 'straight',
      arrowStart: false,
      arrowEnd: false,
      arrowType: 'triangle',
      arrowColor: options.dividerStroke ?? DEFAULT_TABLE_DIVIDER_COLOR,
      arrowOpacity: options.dividerStrokeOpacity ?? 1,
      arrowOpen: false,
      arrowRound: false,
      arrowScale: DEFAULT_ARROW_SCALE,
      arrowLengthScale: 1,
      arrowWidthScale: 1,
      arrowBendMode: 'none',
      mergeId,
      table: buildTableMetadata(tableId, 'row-divider', dimensions)
    };
  });

  const columnDividers: LineShape[] = Array.from({ length: dimensions.columns - 1 }, (_, index) => {
    const dividerX = options.x + columnWidth * (index + 1);
    return {
      id: crypto.randomUUID(),
      name: `Table col ${index + 1}`,
      kind: 'line',
      stroke: options.dividerStroke ?? DEFAULT_TABLE_DIVIDER_COLOR,
      strokeOpacity: options.dividerStrokeOpacity ?? 1,
      strokeWidth: options.dividerStrokeWidth ?? DEFAULT_TABLE_DIVIDER_STROKE_WIDTH,
      from: { x: dividerX, y: options.y + options.height },
      to: { x: dividerX, y: options.y },
      anchors: [],
      lineMode: 'straight',
      arrowStart: false,
      arrowEnd: false,
      arrowType: 'triangle',
      arrowColor: options.dividerStroke ?? DEFAULT_TABLE_DIVIDER_COLOR,
      arrowOpacity: options.dividerStrokeOpacity ?? 1,
      arrowOpen: false,
      arrowRound: false,
      arrowScale: DEFAULT_ARROW_SCALE,
      arrowLengthScale: 1,
      arrowWidthScale: 1,
      arrowBendMode: 'none',
      mergeId,
      table: buildTableMetadata(tableId, 'column-divider', dimensions)
    };
  });

  return [frame, ...rowDividers, ...columnDividers];
};

export const remapStructuralShapeIds = (shapes: readonly CanvasShape[]): readonly CanvasShape[] => {
  const mergeIdMap = new Map<string, string>();
  const tableIdMap = new Map<string, string>();

  return shapes.map((shape) => {
    const nextMergeId = shape.mergeId
      ? (mergeIdMap.get(shape.mergeId) ??
        (() => {
          const value = crypto.randomUUID();
          mergeIdMap.set(shape.mergeId as string, value);
          return value;
        })())
      : undefined;

    const nextTableId = shape.table
      ? (tableIdMap.get(shape.table.id) ??
        (() => {
          const value = crypto.randomUUID();
          tableIdMap.set(shape.table.id, value);
          return value;
        })())
      : undefined;

    return {
      ...shape,
      mergeId: nextMergeId,
      table: shape.table
        ? {
            ...shape.table,
            id: nextTableId as string
          }
        : undefined
    } as CanvasShape;
  });
};

export const getTableSelectionInfo = (shapes: readonly CanvasShape[]): TableSelectionInfo | null => {
  if (!shapes.length) {
    return null;
  }

  const tableShapes = shapes.filter((shape) => !!shape.table);
  if (tableShapes.length !== shapes.length) {
    return null;
  }

  const firstTable = tableShapes[0]?.table;
  if (!firstTable) {
    return null;
  }

  if (
    tableShapes.some(
      (shape) =>
        shape.table?.id !== firstTable.id ||
        shape.table?.rows !== firstTable.rows ||
        shape.table?.columns !== firstTable.columns
    )
  ) {
    return null;
  }

  const frame = tableShapes.find(
    (shape): shape is Extract<CanvasShape, { kind: 'rectangle' }> =>
      shape.kind === 'rectangle' && shape.table?.role === 'frame'
  );
  if (!frame) {
    return null;
  }

  const rowDividerCount = tableShapes.filter(
    (shape) => shape.kind === 'line' && shape.table?.role === 'row-divider'
  ).length;
  const columnDividerCount = tableShapes.filter(
    (shape) => shape.kind === 'line' && shape.table?.role === 'column-divider'
  ).length;

  if (rowDividerCount !== firstTable.rows - 1 || columnDividerCount !== firstTable.columns - 1) {
    return null;
  }

  return {
    frameId: frame.id,
    mergeId: frame.mergeId,
    tableId: firstTable.id,
    rows: firstTable.rows,
    columns: firstTable.columns,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    shapes: tableShapes
  };
};

export const tableSizeLabel = (columns: number, rows: number): string => `${columns} x ${rows}`;
