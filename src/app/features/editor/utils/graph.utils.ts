import {
  DEFAULT_ARROW_SCALE,
  DEFAULT_LINE_COLOR,
  DEFAULT_LINE_STROKE_WIDTH,
  DEFAULT_SHAPE_STROKE_WIDTH,
  DEFAULT_TEXT_COLOR
} from '../constants/editor.constants';
import {
  DEFAULT_GRAPH_DIMENSIONS,
  GRAPH_MAX_GRID_AXIS,
  GRAPH_MAX_TREE_LEVELS,
  GRAPH_MAX_VERTICES,
  GRAPH_MIN_VERTICES,
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

const clampInteger = (value: number, minimumValue: number, maximumValue: number): number => {
  if (!Number.isFinite(value)) {
    return minimumValue;
  }

  return Math.min(maximumValue, Math.max(minimumValue, Math.round(value)));
};

export const normalizeGraphDimensions = (dimensions: Partial<GraphDimensions>): GraphDimensions => {
  const kind = (dimensions.kind ?? DEFAULT_GRAPH_DIMENSIONS.kind) as GraphPresetKind;
  const minimumVertices = kind === 'wheel' ? 4 : kind === 'prism' ? 3 : GRAPH_MIN_VERTICES;
  return {
    kind,
    vertices: clampInteger(
      dimensions.vertices ?? DEFAULT_GRAPH_DIMENSIONS.vertices,
      minimumVertices,
      GRAPH_MAX_VERTICES
    ),
    leftVertices: clampInteger(
      dimensions.leftVertices ?? DEFAULT_GRAPH_DIMENSIONS.leftVertices,
      GRAPH_MIN_VERTICES,
      GRAPH_MAX_VERTICES
    ),
    rightVertices: clampInteger(
      dimensions.rightVertices ?? DEFAULT_GRAPH_DIMENSIONS.rightVertices,
      GRAPH_MIN_VERTICES,
      GRAPH_MAX_VERTICES
    ),
    rows: clampInteger(dimensions.rows ?? DEFAULT_GRAPH_DIMENSIONS.rows, GRAPH_MIN_VERTICES, GRAPH_MAX_GRID_AXIS),
    columns: clampInteger(
      dimensions.columns ?? DEFAULT_GRAPH_DIMENSIONS.columns,
      GRAPH_MIN_VERTICES,
      GRAPH_MAX_GRID_AXIS
    ),
    levels: clampInteger(dimensions.levels ?? DEFAULT_GRAPH_DIMENSIONS.levels, 1, GRAPH_MAX_TREE_LEVELS),
    directed: dimensions.directed ?? DEFAULT_GRAPH_DIMENSIONS.directed,
    showLabels: dimensions.showLabels ?? DEFAULT_GRAPH_DIMENSIONS.showLabels
  };
};

export const graphDisplayName = (kind: GraphPresetKind): string => {
  switch (kind) {
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
    case 'petersen':
      return 10;
    case 'complete':
    case 'cycle':
    case 'path':
    case 'star':
    case 'wheel':
      return normalized.vertices;
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
      return (normalized.vertices - 1) * 2;
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
    case 'petersen':
      return 15;
  }
};

export const buildGraphLayout = (dimensions: GraphDimensions): GraphLayout => {
  const normalized = normalizeGraphDimensions(dimensions);
  switch (normalized.kind) {
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
      fill: '#fbfbfb',
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
      return buildLine(
        graphEdgeName(edge, layoutNodeById),
        edgeEndpoints.from,
        edgeEndpoints.to,
        normalized.directed,
        sourceShape.id,
        targetShape.id,
        edgeEndpoints.fromAnchor,
        edgeEndpoints.toAnchor
      );
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
          fontSize: 0.2,
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

export const insetGraphEdge = (
  from: Point,
  to: Point,
  nodeRadius: number
): { readonly from: Point; readonly to: Point } => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= 0.0001) {
    return { from, to };
  }

  const unitX = dx / length;
  const unitY = dy / length;
  const startInset = nodeRadius;
  const endInset = nodeRadius;
  const maxInset = length * 0.42;
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

const buildLine = (
  name: string,
  from: Point,
  to: Point,
  directed: boolean,
  sourceShapeId: string,
  targetShapeId: string,
  sourceAnchor: Point,
  targetAnchor: Point
): LineShape => ({
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
  if (length <= 0.0001) {
    return { x: 0, y: 0 };
  }

  return { x: deltaX / length, y: deltaY / length };
};

const buildCircularNodes = (vertices: number): readonly GraphNodeLayout[] =>
  Array.from({ length: vertices }, (_, index) => {
    const angle = Math.PI / 2 - (Math.PI * 2 * index) / vertices;
    return {
      id: String(index + 1),
      label: String(index + 1),
      position: {
        x: Math.cos(angle) * DEFAULT_GRAPH_RADIUS,
        y: Math.sin(angle) * DEFAULT_GRAPH_RADIUS
      }
    };
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
  const spacing = vertices <= 8 ? 1.0 : 0.72;
  const left = (-spacing * (vertices - 1)) / 2;
  const nodes = Array.from({ length: vertices }, (_, index): GraphNodeLayout => {
    const id = String(index + 1);
    return { id, label: id, position: { x: left + index * spacing, y: 0 } };
  });
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({ source: node.id, target: nodes[index + 1].id }))
  };
};

const buildStarLayout = (vertices: number): GraphLayout => {
  const leaves = Math.max(vertices - 1, 1);
  const center: GraphNodeLayout = { id: '1', label: '1', position: { x: 0, y: 0 } };
  const leafNodes = Array.from({ length: leaves }, (_, index): GraphNodeLayout => {
    const angle = Math.PI / 2 - (Math.PI * 2 * index) / leaves;
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
  const rimVertices = Math.max(vertices - 1, 3);
  const center: GraphNodeLayout = { id: '1', label: '1', position: { x: 0, y: 0 } };
  const rimNodes = Array.from({ length: rimVertices }, (_, index): GraphNodeLayout => {
    const angle = Math.PI / 2 - (Math.PI * 2 * index) / rimVertices;
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
  const left = verticalNodes('L', leftVertices, -1.6);
  const right = verticalNodes('R', rightVertices, 1.6);
  return {
    nodes: [...left, ...right],
    edges: left.flatMap((source) => right.map((target) => ({ source: source.id, target: target.id })))
  };
};

const verticalNodes = (prefix: string, count: number, x: number): readonly GraphNodeLayout[] => {
  const spacing = count <= 6 ? 0.82 : 0.58;
  const top = (spacing * (count - 1)) / 2;
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
  const spacing = Math.min(1.05, 5.6 / Math.max(rows, columns));
  const left = (-spacing * (columns - 1)) / 2;
  const top = (spacing * (rows - 1)) / 2;
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
  const spacing = Math.min(1.05, 5.6 / Math.max(columns, 2));
  const left = (-spacing * (columns - 1)) / 2;
  const rowY = 0.72;
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
  const innerRadius = DEFAULT_GRAPH_RADIUS * 0.58;
  const top = Array.from({ length: vertices }, (_, index): GraphNodeLayout => {
    const angle = Math.PI / 2 - (Math.PI * 2 * index) / vertices;
    const id = `A${index + 1}`;
    return {
      id,
      label: id,
      position: { x: Math.cos(angle) * outerRadius, y: Math.sin(angle) * outerRadius }
    };
  });
  const bottom = Array.from({ length: vertices }, (_, index): GraphNodeLayout => {
    const angle = Math.PI / 2 - (Math.PI * 2 * index) / vertices;
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
  const verticalGap = 0.92;
  for (let level = 0; level < levels; level += 1) {
    const count = 2 ** level;
    const spread = Math.max(2 ** (levels - level - 1), 1) * 0.64;
    for (let index = 0; index < count; index += 1) {
      const id = String(2 ** level + index);
      const parentId = level > 0 ? String(2 ** (level - 1) + Math.floor(index / 2)) : null;
      nodes.push({
        id,
        label: id,
        position: {
          x: (index - (count - 1) / 2) * spread,
          y: ((levels - 1) / 2 - level) * verticalGap
        }
      });
      if (parentId) {
        edges.push({ source: parentId, target: id });
      }
    }
  }
  return { nodes, edges };
};

const buildPetersenLayout = (): GraphLayout => {
  const outer = buildCircularNodes(5).map(
    (node, index): GraphNodeLayout => ({
      ...node,
      id: `O${index + 1}`,
      label: String(index + 1)
    })
  );
  const inner = buildCircularNodes(5).map(
    (node, index): GraphNodeLayout => ({
      ...node,
      id: `I${index + 1}`,
      label: String(index + 6),
      position: {
        x: node.position.x * 0.45,
        y: node.position.y * 0.45
      }
    })
  );

  return {
    nodes: [...outer, ...inner],
    edges: [
      ...outer.map((node, index) => ({ source: node.id, target: outer[(index + 1) % outer.length].id })),
      ...inner.map((node, index) => ({ source: node.id, target: inner[(index + 2) % inner.length].id })),
      ...outer.map((node, index) => ({ source: node.id, target: inner[index].id }))
    ]
  };
};
