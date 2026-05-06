import {
  DEFAULT_ARROW_SCALE,
  DEFAULT_LINE_COLOR,
  DEFAULT_LINE_STROKE_WIDTH,
  DEFAULT_SHAPE_STROKE_WIDTH,
  DEFAULT_TEXT_COLOR
} from '../constants/editor.constants';
import {
  DEFAULT_GRAPH_DIMENSIONS,
  GRAPH_KARY_TREE_MAX_COLUMNS,
  GRAPH_KARY_TREE_MAX_LEVELS,
  GRAPH_MAX_GRID_AXIS,
  GRAPH_MAX_TREE_LEVELS,
  GRAPH_MAX_VERTICES,
  GRAPH_MIN_VERTICES,
  GRAPH_WHEEL_PRISM_MIN_VERTICES,
  type BuildGraphShapesOptions,
  type GraphDimensions,
  type GraphEdgeLayout,
  type GraphLayout,
  type GraphNodeLayout,
  type GraphPresetKind,
  type GraphShape
} from '../models/graph.models';
import type { CircleShape, LineShape, Point, TextShape } from '../models/tikz.models';

const DEFAULT_GRAPH_RADIUS = 2.1;
const DEFAULT_GRAPH_NODE_RADIUS = 0.18;
const DEFAULT_GRAPH_SCALE = 1;
const GRAPH_FULL_TURN_RADIANS = Math.PI * 2;
const GRAPH_START_ANGLE_RADIANS = Math.PI / 2;
const GRAPH_LAYOUT_CENTER = 0;
const GRAPH_LAYOUT_HALF_FACTOR = 2;
const PETERSEN_VERTEX_COUNT = 10;
const PETERSEN_EDGE_COUNT = 15;
const PETERSEN_RING_NODE_COUNT = 5;
const PETERSEN_INNER_LABEL_OFFSET = 6;
const PETERSEN_INNER_RADIUS_FACTOR = 0.45;
const PETERSEN_INNER_EDGE_SKIP = 2;
const DEFAULT_GRAPH_NODE_FILL_COLOR = '#fbfbfb';
const GRAPH_LABEL_FONT_SIZE = 0.2;
const GRAPH_EDGE_MIN_LENGTH = 0.0001;
const GRAPH_EDGE_MAX_INSET_FACTOR = 0.42;
const PATH_COMPACT_VERTEX_THRESHOLD = 8;
const PATH_SPACING_REGULAR = 1;
const PATH_SPACING_COMPACT = 0.72;
const BIPARTITE_COLUMN_X_OFFSET = 1.6;
const VERTICAL_NODE_COMPACT_THRESHOLD = 6;
const VERTICAL_NODE_SPACING_REGULAR = 0.82;
const VERTICAL_NODE_SPACING_COMPACT = 0.58;
const GRID_MAX_SPACING = 1.05;
const GRID_LAYOUT_SPAN = 5.6;
const LADDER_MIN_COLUMNS_FOR_SPACING = 2;
const LADDER_ROW_Y = 0.72;
const PRISM_INNER_RADIUS_FACTOR = 0.58;
const TREE_BINARY_VERTICAL_GAP = 0.92;
const TREE_BINARY_SPREAD_FACTOR = 0.64;
const TREE_KARY_VERTICAL_GAP = 0.9;
const TREE_KARY_NARROW_BRANCHING_THRESHOLD = 2;
const LAYERED_MAX_LAYER_GAP = 1.25;
const LAYERED_MAX_NODE_GAP = 0.86;
const LAYERED_HORIZONTAL_SPAN = 5.4;
const LAYERED_VERTICAL_SPAN = 4.5;
const FLOW_TERMINAL_X_OFFSET = 2.85;

const clampInteger = (value: number, minimumValue: number, maximumValue: number): number => {
  if (!Number.isFinite(value)) {
    return minimumValue;
  }

  return Math.min(maximumValue, Math.max(minimumValue, Math.round(value)));
};

export const normalizeGraphDimensions = (dimensions: Partial<GraphDimensions>): GraphDimensions => {
  const kind = dimensions.kind ?? DEFAULT_GRAPH_DIMENSIONS.kind;
  const minimumVertices = kind === 'wheel' || kind === 'prism' ? GRAPH_WHEEL_PRISM_MIN_VERTICES : GRAPH_MIN_VERTICES;
  const maximumColumns = kind === 'kary-tree' ? GRAPH_KARY_TREE_MAX_COLUMNS : GRAPH_MAX_GRID_AXIS;
  const maximumLevels = kind === 'kary-tree' ? GRAPH_KARY_TREE_MAX_LEVELS : GRAPH_MAX_TREE_LEVELS;
  return {
    kind,
    vertices: clampInteger(dimensions.vertices ?? DEFAULT_GRAPH_DIMENSIONS.vertices, minimumVertices, GRAPH_MAX_VERTICES),
    leftVertices: clampInteger(dimensions.leftVertices ?? DEFAULT_GRAPH_DIMENSIONS.leftVertices, GRAPH_MIN_VERTICES, GRAPH_MAX_VERTICES),
    rightVertices: clampInteger(dimensions.rightVertices ?? DEFAULT_GRAPH_DIMENSIONS.rightVertices, GRAPH_MIN_VERTICES, GRAPH_MAX_VERTICES),
    rows: clampInteger(dimensions.rows ?? DEFAULT_GRAPH_DIMENSIONS.rows, GRAPH_MIN_VERTICES, GRAPH_MAX_GRID_AXIS),
    columns: clampInteger(dimensions.columns ?? DEFAULT_GRAPH_DIMENSIONS.columns, GRAPH_MIN_VERTICES, maximumColumns),
    levels: clampInteger(dimensions.levels ?? DEFAULT_GRAPH_DIMENSIONS.levels, 1, maximumLevels),
    directed: dimensions.directed ?? DEFAULT_GRAPH_DIMENSIONS.directed,
    showLabels: dimensions.showLabels ?? DEFAULT_GRAPH_DIMENSIONS.showLabels
  };
};

export const graphDisplayName = (kind: GraphPresetKind): string => {
  switch (kind) {
    case 'independent':
      return 'I_n';
    case 'complete':
      return 'K_n';
    case 'cycle':
      return 'C_n';
    case 'path':
      return 'P_n';
    case 'star':
      return 'S_n';
    case 'wheel':
      return 'W_n';
    case 'bipartite':
      return 'K_m,n';
    case 'grid':
      return 'Grid';
    case 'ladder':
      return 'Ladder';
    case 'prism':
      return 'Prism';
    case 'binary-tree':
      return 'Tree';
    case 'kary-tree':
      return 'k-ary';
    case 'layered-dag':
      return 'DAG';
    case 'flow-network':
      return 'Flow';
    case 'neural-network':
      return 'Network';
    case 'petersen':
      return 'Petersen';
  }
};

export const graphVertexCount = (dimensions: GraphDimensions): number => {
  const normalized = normalizeGraphDimensions(dimensions);
  switch (normalized.kind) {
    case 'bipartite':
      return normalized.leftVertices + normalized.rightVertices;
    case 'grid':
      return normalized.rows * normalized.columns;
    case 'ladder':
      return normalized.columns * 2;
    case 'prism':
      return normalized.vertices * 2;
    case 'binary-tree':
      return 2 ** normalized.levels - 1;
    case 'kary-tree':
      return karyTreeVertexCount(normalized.columns, normalized.levels);
    case 'layered-dag':
    case 'neural-network':
      return normalized.rows * normalized.columns;
    case 'flow-network':
      return normalized.rows * normalized.columns + 2;
    case 'petersen':
      return PETERSEN_VERTEX_COUNT;
    case 'independent':
    case 'complete':
    case 'cycle':
    case 'path':
    case 'star':
      return normalized.vertices;
    case 'wheel':
      return normalized.vertices + 1;
  }
};

export const graphEdgeCount = (dimensions: GraphDimensions): number => {
  const normalized = normalizeGraphDimensions(dimensions);
  switch (normalized.kind) {
    case 'complete':
      return (normalized.vertices * (normalized.vertices - 1)) / 2;
    case 'cycle':
      return normalized.vertices;
    case 'path':
    case 'star':
      return normalized.vertices - 1;
    case 'wheel':
      return normalized.vertices * 2;
    case 'bipartite':
      return normalized.leftVertices * normalized.rightVertices;
    case 'grid':
      return normalized.rows * (normalized.columns - 1) + normalized.columns * (normalized.rows - 1);
    case 'ladder':
      return normalized.columns * 3 - 2;
    case 'prism':
      return normalized.vertices * 3;
    case 'binary-tree':
      return Math.max(graphVertexCount(normalized) - 1, 0);
    case 'kary-tree':
      return Math.max(graphVertexCount(normalized) - 1, 0);
    case 'layered-dag':
    case 'neural-network':
      return (normalized.rows - 1) * normalized.columns * normalized.columns;
    case 'flow-network':
      return normalized.columns + (normalized.rows - 1) * normalized.columns * normalized.columns + normalized.columns;
    case 'petersen':
      return PETERSEN_EDGE_COUNT;
    case 'independent':
      return 0;
  }
};

export const buildGraphLayout = (dimensions: GraphDimensions): GraphLayout => {
  const normalized = normalizeGraphDimensions(dimensions);
  switch (normalized.kind) {
    case 'independent':
      return buildIndependentLayout(normalized.vertices);
    case 'complete':
      return buildCompleteLayout(normalized.vertices);
    case 'cycle':
      return buildCycleLayout(normalized.vertices);
    case 'path':
      return buildPathLayout(normalized.vertices);
    case 'star':
      return buildStarLayout(normalized.vertices);
    case 'wheel':
      return buildWheelLayout(normalized.vertices);
    case 'bipartite':
      return buildBipartiteLayout(normalized.leftVertices, normalized.rightVertices);
    case 'grid':
      return buildGridLayout(normalized.rows, normalized.columns);
    case 'ladder':
      return buildLadderLayout(normalized.columns);
    case 'prism':
      return buildPrismLayout(normalized.vertices);
    case 'binary-tree':
      return buildBinaryTreeLayout(normalized.levels);
    case 'kary-tree':
      return buildKaryTreeLayout(normalized.columns, normalized.levels);
    case 'layered-dag':
      return buildLayeredDagLayout(normalized.rows, normalized.columns);
    case 'flow-network':
      return buildFlowNetworkLayout(normalized.rows, normalized.columns);
    case 'neural-network':
      return buildNeuralNetworkLayout(normalized.rows, normalized.columns);
    case 'petersen':
      return buildPetersenLayout();
  }
};

export const buildGraphShapes = (options: BuildGraphShapesOptions): readonly GraphShape[] => {
  const normalized = normalizeGraphDimensions(options);
  const layout = buildGraphLayout(normalized);
  const scale = options.scale ?? DEFAULT_GRAPH_SCALE;
  const nodeRadius = options.nodeRadius ?? DEFAULT_GRAPH_NODE_RADIUS;
  const project = (point: Point): Point => ({
    x: options.cx + point.x * scale,
    y: options.cy + point.y * scale
  });
  const layoutNodeById = new Map(layout.nodes.map((node) => [node.id, node]));
  const graphName = options.name ?? graphDisplayName(normalized.kind);
  const nodes = layout.nodes.map((node): CircleShape => {
    const position = project(node.position);
    return {
      id: crypto.randomUUID(),
      name: `${graphName} node ${node.label}`,
      kind: 'circle',
      stroke: DEFAULT_LINE_COLOR,
      strokeOpacity: 1,
      strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
      fill: DEFAULT_GRAPH_NODE_FILL_COLOR,
      fillOpacity: 1,
      cx: position.x,
      cy: position.y,
      r: nodeRadius,
      mergeId: crypto.randomUUID()
    };
  });
  const canvasNodeByLayoutId = new Map(nodes.map((node, index) => [layout.nodes[index]?.id ?? '', node]));
  const edges = layout.edges
    .map((edge): LineShape | null => {
      const sourceShape = canvasNodeByLayoutId.get(edge.source);
      const targetShape = canvasNodeByLayoutId.get(edge.target);
      if (!sourceShape || !targetShape) {
        return null;
      }
      const edgeEndpoints = graphEdgeEndpoints(sourceShape, targetShape);
      return buildLine({
        name: graphEdgeName(edge, layoutNodeById),
        from: edgeEndpoints.from,
        to: edgeEndpoints.to,
        directed: normalized.directed,
        sourceShapeId: sourceShape.id,
        targetShapeId: targetShape.id,
        sourceAnchor: edgeEndpoints.fromAnchor,
        targetAnchor: edgeEndpoints.toAnchor
      });
    })
    .filter((shape): shape is LineShape => !!shape);
  const labels = normalized.showLabels
    ? layout.nodes.map((node, index): TextShape => {
        const position = project(node.position);
        const nodeShape = nodes[index];
        return {
          id: crypto.randomUUID(),
          name: `${graphName} label ${node.label}`,
          kind: 'text',
          stroke: 'none',
          strokeOpacity: 1,
          strokeWidth: 0,
          x: position.x,
          y: position.y,
          text: node.label,
          textBox: false,
          boxWidth: nodeRadius * 2,
          fontSize: GRAPH_LABEL_FONT_SIZE,
          color: DEFAULT_TEXT_COLOR,
          colorOpacity: 1,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'center',
          rotation: 0,
          mergeId: nodeShape?.mergeId
        };
      })
    : [];

  return [...edges, ...nodes, ...labels];
};

export const insetGraphEdge = (from: Point, to: Point, nodeRadius: number): { readonly from: Point; readonly to: Point } => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= GRAPH_EDGE_MIN_LENGTH) {
    return { from, to };
  }

  const unitX = dx / length;
  const unitY = dy / length;
  const startInset = nodeRadius;
  const endInset = nodeRadius;
  const maxInset = length * GRAPH_EDGE_MAX_INSET_FACTOR;
  const safeStartInset = Math.min(startInset, maxInset);
  const safeEndInset = Math.min(endInset, maxInset);

  return {
    from: {
      x: from.x + unitX * safeStartInset,
      y: from.y + unitY * safeStartInset
    },
    to: {
      x: to.x - unitX * safeEndInset,
      y: to.y - unitY * safeEndInset
    }
  };
};

const graphEdgeEndpoints = (
  source: CircleShape,
  target: CircleShape
): {
  readonly from: Point;
  readonly to: Point;
  readonly fromAnchor: Point;
  readonly toAnchor: Point;
} => {
  const sourceCenter = circleCenter(source);
  const targetCenter = circleCenter(target);
  const fromAnchor = normalizedAnchorFromCenter(sourceCenter, targetCenter);
  const toAnchor = normalizedAnchorFromCenter(targetCenter, sourceCenter);

  return {
    from: pointOnCircle(source, fromAnchor),
    to: pointOnCircle(target, toAnchor),
    fromAnchor,
    toAnchor
  };
};

const graphEdgeName = (edge: GraphEdgeLayout, layoutNodeById: ReadonlyMap<string, GraphNodeLayout>): string => {
  const source = layoutNodeById.get(edge.source);
  const target = layoutNodeById.get(edge.target);
  if (!source || !target) {
    return `${edge.source} - ${edge.target}`;
  }

  return `${source.label} - ${target.label}`;
};

const circleCenter = (circle: CircleShape): Point => ({
  x: circle.cx,
  y: circle.cy
});

const pointOnCircle = (circle: CircleShape, anchor: Point): Point => ({
  x: circle.cx + anchor.x * circle.r,
  y: circle.cy + anchor.y * circle.r
});

interface BuildLineOptions {
  readonly name: string;
  readonly from: Point;
  readonly to: Point;
  readonly directed: boolean;
  readonly sourceShapeId: string;
  readonly targetShapeId: string;
  readonly sourceAnchor: Point;
  readonly targetAnchor: Point;
}

const buildLine = ({ name, from, to, directed, sourceShapeId, targetShapeId, sourceAnchor, targetAnchor }: BuildLineOptions): LineShape => ({
  id: crypto.randomUUID(),
  name,
  kind: 'line',
  stroke: DEFAULT_LINE_COLOR,
  strokeOpacity: 1,
  strokeWidth: DEFAULT_LINE_STROKE_WIDTH,
  from,
  to,
  fromAttachment: { shapeId: sourceShapeId, anchor: sourceAnchor },
  toAttachment: { shapeId: targetShapeId, anchor: targetAnchor },
  anchors: [],
  lineMode: 'straight',
  strokeStyle: 'solid',
  arrowStart: false,
  arrowEnd: directed,
  arrowType: 'triangle',
  arrowColor: DEFAULT_LINE_COLOR,
  arrowOpacity: 1,
  arrowOpen: false,
  arrowRound: false,
  arrowScale: DEFAULT_ARROW_SCALE,
  arrowLengthScale: 1,
  arrowWidthScale: 1,
  arrowBendMode: 'none'
});

const normalizedAnchorFromCenter = (center: Point, point: Point): Point => {
  const deltaX = point.x - center.x;
  const deltaY = point.y - center.y;
  const length = Math.hypot(deltaX, deltaY);
  if (length <= GRAPH_EDGE_MIN_LENGTH) {
    return { x: 0, y: 0 };
  }

  return { x: deltaX / length, y: deltaY / length };
};

const buildCircularNodes = (vertices: number): readonly GraphNodeLayout[] =>
  Array.from({ length: vertices }, (_, index) => {
    const angle = GRAPH_START_ANGLE_RADIANS - (GRAPH_FULL_TURN_RADIANS * index) / vertices;
    return {
      id: String(index + 1),
      label: String(index + 1),
      position: {
        x: Math.cos(angle) * DEFAULT_GRAPH_RADIUS,
        y: Math.sin(angle) * DEFAULT_GRAPH_RADIUS
      }
    };
  });

const buildIndependentLayout = (vertices: number): GraphLayout => ({
  nodes: buildCircularNodes(vertices),
  edges: []
});

const buildCompleteLayout = (vertices: number): GraphLayout => {
  const nodes = buildCircularNodes(vertices);
  const edges: GraphEdgeLayout[] = [];
  for (let source = 0; source < nodes.length; source += 1) {
    for (let target = source + 1; target < nodes.length; target += 1) {
      edges.push({ source: nodes[source].id, target: nodes[target].id });
    }
  }
  return { nodes, edges };
};

const buildCycleLayout = (vertices: number): GraphLayout => {
  const nodes = buildCircularNodes(vertices);
  return {
    nodes,
    edges: nodes.map((node, index) => ({
      source: node.id,
      target: nodes[(index + 1) % nodes.length].id
    }))
  };
};

const buildPathLayout = (vertices: number): GraphLayout => {
  const spacing = vertices <= PATH_COMPACT_VERTEX_THRESHOLD ? PATH_SPACING_REGULAR : PATH_SPACING_COMPACT;
  const left = (-spacing * (vertices - 1)) / GRAPH_LAYOUT_HALF_FACTOR;
  const nodes = Array.from({ length: vertices }, (_, index): GraphNodeLayout => {
    const id = String(index + 1);
    return { id, label: id, position: { x: left + index * spacing, y: GRAPH_LAYOUT_CENTER } };
  });
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({ source: node.id, target: nodes[index + 1].id }))
  };
};

const buildStarLayout = (vertices: number): GraphLayout => {
  const leaves = Math.max(vertices - 1, 1);
  const center: GraphNodeLayout = { id: '1', label: '1', position: { x: GRAPH_LAYOUT_CENTER, y: GRAPH_LAYOUT_CENTER } };
  const leafNodes = Array.from({ length: leaves }, (_, index): GraphNodeLayout => {
    const angle = GRAPH_START_ANGLE_RADIANS - (GRAPH_FULL_TURN_RADIANS * index) / leaves;
    const id = String(index + 2);
    return {
      id,
      label: id,
      position: {
        x: Math.cos(angle) * DEFAULT_GRAPH_RADIUS,
        y: Math.sin(angle) * DEFAULT_GRAPH_RADIUS
      }
    };
  });
  return {
    nodes: [center, ...leafNodes],
    edges: leafNodes.map((node) => ({ source: center.id, target: node.id }))
  };
};

const buildWheelLayout = (vertices: number): GraphLayout => {
  const rimVertices = Math.max(vertices, GRAPH_WHEEL_PRISM_MIN_VERTICES);
  const center: GraphNodeLayout = { id: '1', label: '1', position: { x: GRAPH_LAYOUT_CENTER, y: GRAPH_LAYOUT_CENTER } };
  const rimNodes = Array.from({ length: rimVertices }, (_, index): GraphNodeLayout => {
    const angle = GRAPH_START_ANGLE_RADIANS - (GRAPH_FULL_TURN_RADIANS * index) / rimVertices;
    const id = String(index + 2);
    return {
      id,
      label: id,
      position: {
        x: Math.cos(angle) * DEFAULT_GRAPH_RADIUS,
        y: Math.sin(angle) * DEFAULT_GRAPH_RADIUS
      }
    };
  });

  return {
    nodes: [center, ...rimNodes],
    edges: [
      ...rimNodes.map((node, index) => ({
        source: node.id,
        target: rimNodes[(index + 1) % rimNodes.length].id
      })),
      ...rimNodes.map((node) => ({ source: center.id, target: node.id }))
    ]
  };
};

const buildBipartiteLayout = (leftVertices: number, rightVertices: number): GraphLayout => {
  const left = verticalNodes('L', leftVertices, -BIPARTITE_COLUMN_X_OFFSET);
  const right = verticalNodes('R', rightVertices, BIPARTITE_COLUMN_X_OFFSET);
  return {
    nodes: [...left, ...right],
    edges: left.flatMap((source) => right.map((target) => ({ source: source.id, target: target.id })))
  };
};

const verticalNodes = (prefix: string, count: number, x: number): readonly GraphNodeLayout[] => {
  const spacing = count <= VERTICAL_NODE_COMPACT_THRESHOLD ? VERTICAL_NODE_SPACING_REGULAR : VERTICAL_NODE_SPACING_COMPACT;
  const top = (spacing * (count - 1)) / GRAPH_LAYOUT_HALF_FACTOR;
  return Array.from({ length: count }, (_, index): GraphNodeLayout => {
    const label = `${prefix}${index + 1}`;
    return {
      id: label,
      label,
      position: { x, y: top - index * spacing }
    };
  });
};

const buildGridLayout = (rows: number, columns: number): GraphLayout => {
  const spacing = Math.min(GRID_MAX_SPACING, GRID_LAYOUT_SPAN / Math.max(rows, columns));
  const left = (-spacing * (columns - 1)) / GRAPH_LAYOUT_HALF_FACTOR;
  const top = (spacing * (rows - 1)) / GRAPH_LAYOUT_HALF_FACTOR;
  const nodes: GraphNodeLayout[] = [];
  const edges: GraphEdgeLayout[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const id = `${row + 1},${column + 1}`;
      nodes.push({
        id,
        label: `${row + 1}.${column + 1}`,
        position: { x: left + column * spacing, y: top - row * spacing }
      });
      if (column > 0) {
        edges.push({ source: `${row + 1},${column}`, target: id });
      }
      if (row > 0) {
        edges.push({ source: `${row},${column + 1}`, target: id });
      }
    }
  }
  return { nodes, edges };
};

const buildLadderLayout = (columns: number): GraphLayout => {
  const spacing = Math.min(GRID_MAX_SPACING, GRID_LAYOUT_SPAN / Math.max(columns, LADDER_MIN_COLUMNS_FOR_SPACING));
  const left = (-spacing * (columns - 1)) / GRAPH_LAYOUT_HALF_FACTOR;
  const rowY = LADDER_ROW_Y;
  const nodes: GraphNodeLayout[] = [];
  const edges: GraphEdgeLayout[] = [];

  for (let column = 0; column < columns; column += 1) {
    const topId = `T${column + 1}`;
    const bottomId = `B${column + 1}`;
    nodes.push(
      { id: topId, label: topId, position: { x: left + column * spacing, y: rowY } },
      { id: bottomId, label: bottomId, position: { x: left + column * spacing, y: -rowY } }
    );
    edges.push({ source: topId, target: bottomId });
    if (column > 0) {
      edges.push({ source: `T${column}`, target: topId }, { source: `B${column}`, target: bottomId });
    }
  }

  return { nodes, edges };
};

const buildPrismLayout = (vertices: number): GraphLayout => {
  const outerRadius = DEFAULT_GRAPH_RADIUS;
  const innerRadius = DEFAULT_GRAPH_RADIUS * PRISM_INNER_RADIUS_FACTOR;
  const top = Array.from({ length: vertices }, (_, index): GraphNodeLayout => {
    const angle = GRAPH_START_ANGLE_RADIANS - (GRAPH_FULL_TURN_RADIANS * index) / vertices;
    const id = `A${index + 1}`;
    return {
      id,
      label: id,
      position: { x: Math.cos(angle) * outerRadius, y: Math.sin(angle) * outerRadius }
    };
  });
  const bottom = Array.from({ length: vertices }, (_, index): GraphNodeLayout => {
    const angle = GRAPH_START_ANGLE_RADIANS - (GRAPH_FULL_TURN_RADIANS * index) / vertices;
    const id = `B${index + 1}`;
    return {
      id,
      label: id,
      position: { x: Math.cos(angle) * innerRadius, y: Math.sin(angle) * innerRadius }
    };
  });

  return {
    nodes: [...top, ...bottom],
    edges: [
      ...top.map((node, index) => ({ source: node.id, target: top[(index + 1) % top.length].id })),
      ...bottom.map((node, index) => ({ source: node.id, target: bottom[(index + 1) % bottom.length].id })),
      ...top.map((node, index) => ({ source: node.id, target: bottom[index].id }))
    ]
  };
};

const buildBinaryTreeLayout = (levels: number): GraphLayout => {
  const nodes: GraphNodeLayout[] = [];
  const edges: GraphEdgeLayout[] = [];
  const verticalGap = TREE_BINARY_VERTICAL_GAP;
  for (let level = 0; level < levels; level += 1) {
    const count = 2 ** level;
    const spread = Math.max(2 ** (levels - level - 1), 1) * TREE_BINARY_SPREAD_FACTOR;
    for (let index = 0; index < count; index += 1) {
      const id = String(2 ** level + index);
      const parentId = level > 0 ? String(2 ** (level - 1) + Math.floor(index / 2)) : null;
      nodes.push({
        id,
        label: id,
        position: {
          x: (index - (count - 1) / GRAPH_LAYOUT_HALF_FACTOR) * spread,
          y: ((levels - 1) / GRAPH_LAYOUT_HALF_FACTOR - level) * verticalGap
        }
      });
      if (parentId) {
        edges.push({ source: parentId, target: id });
      }
    }
  }
  return { nodes, edges };
};

const karyTreeVertexCount = (branchingFactor: number, levels: number): number => {
  if (branchingFactor <= 1) {
    return levels;
  }

  return (branchingFactor ** levels - 1) / (branchingFactor - 1);
};

const buildKaryTreeLayout = (branchingFactor: number, levels: number): GraphLayout => {
  const nodes: GraphNodeLayout[] = [];
  const edges: GraphEdgeLayout[] = [];
  const verticalGap = TREE_KARY_VERTICAL_GAP;
  const horizontalGap = branchingFactor <= TREE_KARY_NARROW_BRANCHING_THRESHOLD ? VERTICAL_NODE_SPACING_REGULAR : VERTICAL_NODE_SPACING_COMPACT;
  let currentLevel: readonly string[] = [];
  let nextIndex = 1;

  for (let level = 0; level < levels; level += 1) {
    const count = level === 0 ? 1 : currentLevel.length * branchingFactor;
    const levelIds = Array.from({ length: count }, () => String(nextIndex++));
    const spread = Math.max((count - 1) * horizontalGap, 0);
    for (let index = 0; index < count; index += 1) {
      nodes.push({
        id: levelIds[index],
        label: levelIds[index],
        position: {
          x: index * horizontalGap - spread / GRAPH_LAYOUT_HALF_FACTOR,
          y: ((levels - 1) / GRAPH_LAYOUT_HALF_FACTOR - level) * verticalGap
        }
      });
      if (level > 0) {
        edges.push({
          source: currentLevel[Math.floor(index / branchingFactor)] ?? '',
          target: levelIds[index]
        });
      }
    }
    currentLevel = levelIds;
  }

  return { nodes, edges };
};

const buildLayeredNodes = (layers: number, nodesPerLayer: number): readonly GraphNodeLayout[] => {
  const layerGap = Math.min(LAYERED_MAX_LAYER_GAP, LAYERED_HORIZONTAL_SPAN / Math.max(layers - 1, 1));
  const nodeGap = Math.min(LAYERED_MAX_NODE_GAP, LAYERED_VERTICAL_SPAN / Math.max(nodesPerLayer - 1, 1));
  const left = (-layerGap * (layers - 1)) / GRAPH_LAYOUT_HALF_FACTOR;
  const top = (nodeGap * (nodesPerLayer - 1)) / GRAPH_LAYOUT_HALF_FACTOR;
  return Array.from({ length: layers }).flatMap((_, layer) =>
    Array.from({ length: nodesPerLayer }, (_, index): GraphNodeLayout => {
      const id = `${layer + 1}.${index + 1}`;
      return {
        id,
        label: id,
        position: {
          x: left + layer * layerGap,
          y: top - index * nodeGap
        }
      };
    })
  );
};

const buildLayeredDagLayout = (layers: number, nodesPerLayer: number): GraphLayout => {
  const nodes = buildLayeredNodes(layers, nodesPerLayer);
  const edges: GraphEdgeLayout[] = [];
  for (let layer = 1; layer < layers; layer += 1) {
    for (let source = 1; source <= nodesPerLayer; source += 1) {
      for (let target = 1; target <= nodesPerLayer; target += 1) {
        edges.push({ source: `${layer}.${source}`, target: `${layer + 1}.${target}` });
      }
    }
  }
  return { nodes, edges };
};

const buildFlowNetworkLayout = (layers: number, nodesPerLayer: number): GraphLayout => {
  const layeredNodes = buildLayeredNodes(layers, nodesPerLayer);
  const source: GraphNodeLayout = {
    id: 's',
    label: 's',
    position: { x: -FLOW_TERMINAL_X_OFFSET, y: GRAPH_LAYOUT_CENTER }
  };
  const sink: GraphNodeLayout = {
    id: 't',
    label: 't',
    position: { x: FLOW_TERMINAL_X_OFFSET, y: GRAPH_LAYOUT_CENTER }
  };
  const layerEdges = buildLayeredDagLayout(layers, nodesPerLayer).edges;
  const edges: GraphEdgeLayout[] = [
    ...Array.from({ length: nodesPerLayer }, (_, index) => ({ source: source.id, target: `1.${index + 1}` })),
    ...layerEdges,
    ...Array.from({ length: nodesPerLayer }, (_, index) => ({
      source: `${layers}.${index + 1}`,
      target: sink.id
    }))
  ];
  return { nodes: [source, ...layeredNodes, sink], edges };
};

const buildNeuralNetworkLayout = (layers: number, nodesPerLayer: number): GraphLayout => buildLayeredDagLayout(layers, nodesPerLayer);

const buildPetersenLayout = (): GraphLayout => {
  const outer = buildCircularNodes(PETERSEN_RING_NODE_COUNT).map(
    (node, index): GraphNodeLayout => ({
      ...node,
      id: `O${index + 1}`,
      label: String(index + 1)
    })
  );
  const inner = buildCircularNodes(PETERSEN_RING_NODE_COUNT).map(
    (node, index): GraphNodeLayout => ({
      ...node,
      id: `I${index + 1}`,
      label: String(index + PETERSEN_INNER_LABEL_OFFSET),
      position: {
        x: node.position.x * PETERSEN_INNER_RADIUS_FACTOR,
        y: node.position.y * PETERSEN_INNER_RADIUS_FACTOR
      }
    })
  );

  return {
    nodes: [...outer, ...inner],
    edges: [
      ...outer.map((node, index) => ({ source: node.id, target: outer[(index + 1) % outer.length].id })),
      ...inner.map((node, index) => ({
        source: node.id,
        target: inner[(index + PETERSEN_INNER_EDGE_SKIP) % inner.length].id
      })),
      ...outer.map((node, index) => ({ source: node.id, target: inner[index].id }))
    ]
  };
};
