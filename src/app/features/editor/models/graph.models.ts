import type { CanvasShape, Point } from './tikz.models';

export type GraphPresetKind =
  | 'independent'
  | 'complete'
  | 'cycle'
  | 'path'
  | 'star'
  | 'wheel'
  | 'bipartite'
  | 'grid'
  | 'ladder'
  | 'prism'
  | 'binary-tree'
  | 'kary-tree'
  | 'layered-dag'
  | 'flow-network'
  | 'neural-network'
  | 'petersen';

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
  'graph-independent',
  'graph-complete',
  'graph-cycle',
  'graph-path',
  'graph-star',
  'graph-wheel',
  'graph-bipartite',
  'graph-grid',
  'graph-ladder',
  'graph-prism',
  'graph-binary-tree',
  'graph-kary-tree',
  'graph-layered-dag',
  'graph-flow-network',
  'graph-neural-network',
  'graph-petersen'
] as const;

export type GraphPresetId = (typeof GRAPH_PRESET_IDS)[number];

export const GRAPH_PRESET_KIND_BY_ID: Readonly<Record<GraphPresetId, GraphPresetKind>> = {
  'graph-independent': 'independent',
  'graph-complete': 'complete',
  'graph-cycle': 'cycle',
  'graph-path': 'path',
  'graph-star': 'star',
  'graph-wheel': 'wheel',
  'graph-bipartite': 'bipartite',
  'graph-grid': 'grid',
  'graph-ladder': 'ladder',
  'graph-prism': 'prism',
  'graph-binary-tree': 'binary-tree',
  'graph-kary-tree': 'kary-tree',
  'graph-layered-dag': 'layered-dag',
  'graph-flow-network': 'flow-network',
  'graph-neural-network': 'neural-network',
  'graph-petersen': 'petersen'
};

export const GRAPH_PRESET_ID_BY_KIND: Readonly<Record<GraphPresetKind, GraphPresetId>> = {
  independent: 'graph-independent',
  complete: 'graph-complete',
  cycle: 'graph-cycle',
  path: 'graph-path',
  star: 'graph-star',
  wheel: 'graph-wheel',
  bipartite: 'graph-bipartite',
  grid: 'graph-grid',
  ladder: 'graph-ladder',
  prism: 'graph-prism',
  'binary-tree': 'graph-binary-tree',
  'kary-tree': 'graph-kary-tree',
  'layered-dag': 'graph-layered-dag',
  'flow-network': 'graph-flow-network',
  'neural-network': 'graph-neural-network',
  petersen: 'graph-petersen'
};

export const GRAPH_MIN_VERTICES = 2;
export const GRAPH_WHEEL_PRISM_MIN_VERTICES = 3;
export const GRAPH_MAX_VERTICES = 24;
export const GRAPH_MAX_GRID_AXIS = 8;
export const GRAPH_MAX_TREE_LEVELS = 6;
export const GRAPH_KARY_TREE_MAX_COLUMNS = 4;
export const GRAPH_KARY_TREE_MAX_LEVELS = 4;

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
