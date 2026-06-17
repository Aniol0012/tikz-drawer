import { DEFAULT_ARROW_SCALE, DEFAULT_LINE_COLOR, DEFAULT_LINE_STROKE_WIDTH, DEFAULT_TEXT_FONT_SIZE } from '../constants/editor.constants';
import type { CanvasShape, LineShape, Point, RectangleShape, TextShape, TikzScene } from '../models/tikz.models';
import { REGEX } from '../../../shared/regex/regex.utils';

interface MermaidNode {
  readonly id: string;
  readonly label: string;
  readonly level?: number;
  readonly parentId?: string;
}

interface MermaidEdge {
  readonly from: string;
  readonly to: string;
  readonly directed: boolean;
}

interface MermaidGraph {
  readonly kind: 'flowchart' | 'mindmap';
  readonly direction: 'TD' | 'TB' | 'BT' | 'LR' | 'RL';
  readonly nodes: readonly MermaidNode[];
  readonly edges: readonly MermaidEdge[];
}

interface MermaidRenderedNode extends MermaidNode {
  readonly center: Point;
  readonly width: number;
  readonly height: number;
  readonly shapeId: string;
  readonly mergeId: string;
  readonly isRoot: boolean;
}

const FLOW_NODE_GAP = 2.8;
const FLOW_LAYER_GAP = 2.1;
const MINDMAP_NODE_GAP = 3.2;
const MINDMAP_LEVEL_GAP = 2.35;
const TEXT_BASELINE_CENTER_OFFSET_FACTOR = 0.32;

export const importMermaidToScene = (source: string): TikzScene => {
  const graph = parseMermaidSource(source);
  const renderedNodes = graph.kind === 'mindmap' ? layoutMindmap(graph) : layoutFlowchart(graph);
  const renderedNodeById = new Map(renderedNodes.map((node) => [node.id, node]));
  const lines = graph.edges
    .map((edge) => {
      const from = renderedNodeById.get(edge.from);
      const to = renderedNodeById.get(edge.to);
      return from && to ? mermaidLine(from, to, edge.directed) : null;
    })
    .filter((shape): shape is LineShape => Boolean(shape));
  const nodeShapes = renderedNodes.flatMap((node) => mermaidNodeShapes(node));

  return {
    name: graph.kind === 'mindmap' ? 'Imported Mermaid mindmap' : 'Imported Mermaid flowchart',
    bounds: { width: 960, height: 640 },
    shapes: [...lines, ...nodeShapes]
  };
};

const parseMermaidSource = (source: string): MermaidGraph => {
  const content = source.trim().replace(REGEX.importSources.mermaidFrontMatter, '').trim();
  return REGEX.importSources.mermaidMindmapHeader.test(content) ? parseMindmap(content) : parseFlowchart(content);
};

const parseFlowchart = (source: string): MermaidGraph => {
  const nodeById = new Map<string, MermaidNode>();
  const edges: MermaidEdge[] = [];
  const lines = source.split(REGEX.shared.lineBreak).map((line) => line.trim());
  const direction = (REGEX.importSources.mermaidFlowchartHeader.exec(lines[0] ?? '')?.groups?.['direction']?.toUpperCase() ??
    'TD') as MermaidGraph['direction'];

  for (const line of lines.slice(1).filter(isMermaidContentLine)) {
    const edgeMatch = REGEX.importSources.mermaidEdgeOperator.exec(line);
    if (!edgeMatch) {
      registerFlowNode(nodeById, line);
      continue;
    }

    const rawFrom = line.slice(0, edgeMatch.index);
    const rawTo = line.slice(edgeMatch.index + edgeMatch[0].length);
    const fromRefs = parseFlowNodeReferences(rawFrom);
    const toRefs = parseFlowNodeReferences(rawTo);
    for (const ref of [...fromRefs, ...toRefs]) {
      upsertNode(nodeById, ref.id, ref.label);
    }
    for (const from of fromRefs) {
      for (const to of toRefs) {
        edges.push({ from: from.id, to: to.id, directed: edgeMatch[1].includes('>') });
      }
    }
  }

  return { kind: 'flowchart', direction, nodes: Array.from(nodeById.values()), edges };
};

const parseMindmap = (source: string): MermaidGraph => {
  const nodeById = new Map<string, MermaidNode>();
  const edges: MermaidEdge[] = [];
  const stack: { readonly indent: number; readonly node: MermaidNode }[] = [];
  let generatedId = 0;

  for (const line of source.split(REGEX.shared.lineBreak).slice(1)) {
    if (!isMermaidContentLine(line)) {
      continue;
    }

    const match = REGEX.importSources.mermaidMindmapLine.exec(line);
    const rawNode = match?.groups?.['node']?.trim() ?? '';
    if (!rawNode) {
      continue;
    }

    const indent = match?.groups?.['indent']?.length ?? 0;
    while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parsed = parseNodeReference(rawNode);
    const explicitId = Boolean(REGEX.importSources.mermaidNodeReference.exec(rawNode)?.groups?.['label']);
    const id = uniqueMermaidId(nodeById, explicitId ? parsed.id : `mindmap-${++generatedId}`);
    const parent = stack.at(-1)?.node;
    const node = {
      id,
      label: parsed.label,
      level: stack.length,
      parentId: parent?.id
    };
    nodeById.set(id, node);
    if (parent) {
      edges.push({ from: parent.id, to: id, directed: false });
    }
    stack.push({ indent, node });
  }

  return { kind: 'mindmap', direction: 'LR', nodes: Array.from(nodeById.values()), edges };
};

const isMermaidContentLine = (line: string): boolean => {
  const trimmed = line.trim();
  return Boolean(trimmed) && !REGEX.importSources.mermaidComment.test(trimmed);
};

const registerFlowNode = (nodeById: Map<string, MermaidNode>, statement: string): void => {
  const nodeMatch = REGEX.importSources.mermaidNodeStatement.exec(statement);
  if (!nodeMatch?.groups) {
    return;
  }

  upsertNode(nodeById, nodeMatch.groups['id'], normalizeMermaidLabel(nodeMatch.groups['label']));
};

const parseFlowNodeReferences = (source: string): readonly MermaidNode[] =>
  source
    .split(REGEX.importSources.mermaidFanoutSeparator)
    .map((entry) => parseNodeReference(entry))
    .filter((node) => Boolean(node.id));

const parseNodeReference = (source: string): MermaidNode => {
  const trimmed = source.trim();
  const match = REGEX.importSources.mermaidNodeReference.exec(trimmed);
  if (!match?.groups) {
    return { id: normalizeMermaidId(trimmed), label: normalizeMermaidLabel(trimmed) };
  }

  const id = normalizeMermaidId(match.groups['id']);
  const label = match.groups['label'] ? normalizeMermaidLabel(match.groups['label']) : normalizeMermaidLabel(id);
  return { id, label };
};

const upsertNode = (nodeById: Map<string, MermaidNode>, id: string, label: string): void => {
  const normalizedId = normalizeMermaidId(id);
  const existing = nodeById.get(normalizedId);
  nodeById.set(normalizedId, {
    id: normalizedId,
    label: existing?.label && existing.label !== existing.id ? existing.label : label
  });
};

const uniqueMermaidId = (nodeById: ReadonlyMap<string, MermaidNode>, preferredId: string): string => {
  const baseId = normalizeMermaidId(preferredId) || `node-${nodeById.size + 1}`;
  let id = baseId;
  let suffix = 2;
  while (nodeById.has(id)) {
    id = `${baseId}-${suffix++}`;
  }
  return id;
};

const normalizeMermaidId = (value: string): string => value.replaceAll(REGEX.importSources.mermaidInvalidIdChars, '').trim();

const normalizeMermaidLabel = (value: string): string =>
  value
    .trim()
    .replace(REGEX.importSources.mermaidLabelQuoteBoundary, '')
    .replace(REGEX.importSources.mermaidRootPrefix, '')
    .replace(REGEX.importSources.mermaidDoubleRoundBoundary, '')
    .replace(REGEX.importSources.mermaidDoubleBraceBoundary, '')
    .replace(REGEX.importSources.mermaidSingleRoundBoundary, '')
    .replaceAll(REGEX.importSources.htmlBreak, '\n')
    .trim();

const layoutFlowchart = (graph: MermaidGraph): readonly MermaidRenderedNode[] => {
  const depthById = flowDepths(graph);
  const nodesByDepth = new Map<number, MermaidNode[]>();
  for (const node of graph.nodes) {
    const depth = depthById.get(node.id) ?? 0;
    nodesByDepth.set(depth, [...(nodesByDepth.get(depth) ?? []), node]);
  }

  return Array.from(nodesByDepth.entries()).flatMap(([depth, nodes]) => {
    const rowOffset = ((nodes.length - 1) * FLOW_NODE_GAP) / 2;
    return nodes.map((node, index) => {
      const crossAxis = index * FLOW_NODE_GAP - rowOffset;
      const mainAxis = depth * FLOW_LAYER_GAP;
      const center = flowPosition(graph.direction, mainAxis, crossAxis);
      return renderNode(node, center, false);
    });
  });
};

const flowDepths = (graph: MermaidGraph): ReadonlyMap<string, number> => {
  const depthById = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (let iteration = 0; iteration < graph.nodes.length; iteration += 1) {
    let changed = false;
    for (const edge of graph.edges) {
      const nextDepth = (depthById.get(edge.from) ?? 0) + 1;
      if (nextDepth > (depthById.get(edge.to) ?? 0)) {
        depthById.set(edge.to, nextDepth);
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  return depthById;
};

const flowPosition = (direction: MermaidGraph['direction'], mainAxis: number, crossAxis: number): Point => {
  switch (direction) {
    case 'LR':
      return { x: mainAxis, y: crossAxis };
    case 'RL':
      return { x: -mainAxis, y: crossAxis };
    case 'BT':
      return { x: crossAxis, y: -mainAxis };
    case 'TB':
    case 'TD':
      return { x: crossAxis, y: mainAxis };
  }
};

const layoutMindmap = (graph: MermaidGraph): readonly MermaidRenderedNode[] => {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const childrenById = new Map<string, MermaidNode[]>();
  for (const edge of graph.edges) {
    const child = nodeById.get(edge.to);
    if (child) {
      childrenById.set(edge.from, [...(childrenById.get(edge.from) ?? []), child]);
    }
  }

  const root = graph.nodes.find((node) => !node.parentId) ?? graph.nodes[0];
  if (!root) {
    return [];
  }

  const leafCounts = mindmapLeafCounts(root, childrenById);
  const rendered: MermaidRenderedNode[] = [];
  layoutMindmapSubtree(root, 0, 0, childrenById, leafCounts, rendered);

  return rendered;
};

const mindmapLeafCounts = (
  node: MermaidNode,
  childrenById: ReadonlyMap<string, readonly MermaidNode[]>,
  leafCounts = new Map<string, number>()
): ReadonlyMap<string, number> => {
  const children = childrenById.get(node.id) ?? [];
  const count = children.length ? children.reduce((total, child) => total + (mindmapLeafCounts(child, childrenById, leafCounts).get(child.id) ?? 1), 0) : 1;
  leafCounts.set(node.id, count);
  return leafCounts;
};

const layoutMindmapSubtree = (
  node: MermaidNode,
  depth: number,
  centerX: number,
  childrenById: ReadonlyMap<string, readonly MermaidNode[]>,
  leafCounts: ReadonlyMap<string, number>,
  rendered: MermaidRenderedNode[]
): void => {
  rendered.push(renderNode(node, { x: centerX, y: depth * MINDMAP_LEVEL_GAP }, depth === 0));

  const children = childrenById.get(node.id) ?? [];
  const totalLeaves = children.reduce((total, child) => total + (leafCounts.get(child.id) ?? 1), 0);
  let nextLeft = centerX - ((Math.max(totalLeaves, 1) - 1) * MINDMAP_NODE_GAP) / 2;
  for (const child of children) {
    const childLeaves = leafCounts.get(child.id) ?? 1;
    const childCenterX = nextLeft + ((childLeaves - 1) * MINDMAP_NODE_GAP) / 2;
    layoutMindmapSubtree(child, depth + 1, childCenterX, childrenById, leafCounts, rendered);
    nextLeft += childLeaves * MINDMAP_NODE_GAP;
  }
};

const renderNode = (node: MermaidNode, center: Point, isRoot: boolean): MermaidRenderedNode => {
  const lines = node.label.split(REGEX.shared.lineBreak);
  const widestLine = Math.max(...lines.map((line) => line.length), 1);
  return {
    ...node,
    center,
    width: Math.min(Math.max(widestLine * 0.22 + 0.8, isRoot ? 1.8 : 1.45), 3.8),
    height: Math.max(0.75, lines.length * 0.36 + 0.42),
    shapeId: crypto.randomUUID(),
    mergeId: crypto.randomUUID(),
    isRoot
  };
};

const mermaidNodeShapes = (node: MermaidRenderedNode): readonly CanvasShape[] => {
  const rectangle: RectangleShape = {
    id: node.shapeId,
    name: `Mermaid node ${node.label}`,
    kind: 'rectangle',
    stroke: DEFAULT_LINE_COLOR,
    strokeOpacity: 1,
    strokeWidth: 0.06,
    x: node.center.x - node.width / 2,
    y: node.center.y - node.height / 2,
    width: node.width,
    height: node.height,
    fill: node.isRoot ? '#f3f4f6' : '#ffffff',
    fillOpacity: 1,
    cornerRadius: node.isRoot ? 0.35 : 0.12,
    mergeId: node.mergeId
  };
  const text: TextShape = {
    id: crypto.randomUUID(),
    name: `Mermaid label ${node.label}`,
    kind: 'text',
    stroke: 'none',
    strokeOpacity: 1,
    strokeWidth: 0,
    x: node.center.x - Math.max(node.width - 0.28, 0.4) / 2,
    y: node.center.y - DEFAULT_TEXT_FONT_SIZE * TEXT_BASELINE_CENTER_OFFSET_FACTOR,
    text: node.label,
    textBox: true,
    boxWidth: Math.max(node.width - 0.28, 0.4),
    fontSize: DEFAULT_TEXT_FONT_SIZE,
    color: DEFAULT_LINE_COLOR,
    colorOpacity: 1,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'center',
    rotation: 0,
    mergeId: node.mergeId
  };
  return [rectangle, text];
};

const mermaidLine = (from: MermaidRenderedNode, to: MermaidRenderedNode, directed: boolean): LineShape => {
  const fromAnchor = normalizedDirection(from.center, to.center);
  const toAnchor = normalizedDirection(to.center, from.center);
  return {
    id: crypto.randomUUID(),
    name: `${from.label} to ${to.label}`,
    kind: 'line',
    stroke: DEFAULT_LINE_COLOR,
    strokeOpacity: 1,
    strokeWidth: DEFAULT_LINE_STROKE_WIDTH,
    from: rectangleBoundaryPoint(from, fromAnchor),
    to: rectangleBoundaryPoint(to, toAnchor),
    fromAttachment: { shapeId: from.shapeId, anchor: fromAnchor },
    toAttachment: { shapeId: to.shapeId, anchor: toAnchor },
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
  };
};

const normalizedDirection = (from: Point, to: Point): Point => {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY);
  return length <= 0.0001 ? { x: 1, y: 0 } : { x: deltaX / length, y: deltaY / length };
};

const rectangleBoundaryPoint = (node: MermaidRenderedNode, anchor: Point): Point => {
  const scale = 1 / Math.max(Math.abs(anchor.x) / (node.width / 2), Math.abs(anchor.y) / (node.height / 2));
  return {
    x: node.center.x + anchor.x * scale,
    y: node.center.y + anchor.y * scale
  };
};
