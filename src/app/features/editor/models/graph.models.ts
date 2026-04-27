import type { CanvasShape, Point } from './tikz.models';

export type GraphPresetKind = 'complete' | 'cycle' | 'path' | 'star' | 'bipartite' | 'grid' | 'binary-tree';

export interface GraphDimensions {
  readonly kind: GraphPresetKind;
  readonly vertices: number;
  readonly leftVertices: number;
  readonly rightVertices: number;
  readonly rows: number;
  readonly columns: number;
  readonly levels: number;
  readonly directed: boolean;
  readonly showLabels: boolean;
}

export interface GraphDialogState extends GraphDimensions {
  readonly submitMode: 'arm-insert' | 'center-insert';
}

export interface GraphNodeLayout {
  readonly id: string;
  readonly label: string;
  readonly position: Point;
}

export interface GraphEdgeLayout {
  readonly source: string;
  readonly target: string;
}

export interface GraphLayout {
  readonly nodes: readonly GraphNodeLayout[];
  readonly edges: readonly GraphEdgeLayout[];
}

export interface BuildGraphShapesOptions extends GraphDimensions {
  readonly cx: number;
  readonly cy: number;
  readonly nodeRadius?: number;
  readonly scale?: number;
  readonly mergeId?: string;
  readonly name?: string;
}

export type GraphShape = Extract<CanvasShape, { kind: 'line' | 'circle' | 'text' }>;

export const GRAPH_PRESET_ID_PREFIX = 'graph-';

export const GRAPH_PRESET_IDS = [
  'graph-complete',
  'graph-cycle',
  'graph-path',
  'graph-star',
  'graph-bipartite',
  'graph-grid',
  'graph-binary-tree'
] as const;

export type GraphPresetId = (typeof GRAPH_PRESET_IDS)[number];

export const GRAPH_PRESET_KIND_BY_ID: Readonly<Record<GraphPresetId, GraphPresetKind>> = {
  'graph-complete': 'complete',
  'graph-cycle': 'cycle',
  'graph-path': 'path',
  'graph-star': 'star',
  'graph-bipartite': 'bipartite',
  'graph-grid': 'grid',
  'graph-binary-tree': 'binary-tree'
};

export const GRAPH_PRESET_ID_BY_KIND: Readonly<Record<GraphPresetKind, GraphPresetId>> = {
  complete: 'graph-complete',
  cycle: 'graph-cycle',
  path: 'graph-path',
  star: 'graph-star',
  bipartite: 'graph-bipartite',
  grid: 'graph-grid',
  'binary-tree': 'graph-binary-tree'
};

export const GRAPH_MIN_VERTICES = 2;
export const GRAPH_MAX_VERTICES = 24;
export const GRAPH_MAX_GRID_AXIS = 8;
export const GRAPH_MAX_TREE_LEVELS = 6;

export const DEFAULT_GRAPH_DIMENSIONS: GraphDimensions = {
  kind: 'cycle',
  vertices: 6,
  leftVertices: 3,
  rightVertices: 4,
  rows: 3,
  columns: 4,
  levels: 3,
  directed: false,
  showLabels: true
};
