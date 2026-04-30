import { buildGraphShapes, graphEdgeCount, graphVertexCount, normalizeGraphDimensions } from './graph.utils';

describe('graph utils', () => {
  it('computes common graph sizes', () => {
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'independent', vertices: 5 }))).toBe(5);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'independent', vertices: 5 }))).toBe(0);
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'complete', vertices: 5 }))).toBe(5);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'complete', vertices: 5 }))).toBe(10);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'cycle', vertices: 6 }))).toBe(6);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'path', vertices: 6 }))).toBe(5);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'star', vertices: 6 }))).toBe(5);
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'wheel', vertices: 6 }))).toBe(7);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'wheel', vertices: 6 }))).toBe(12);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'bipartite', leftVertices: 3, rightVertices: 4 }))).toBe(12);
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'grid', rows: 3, columns: 4 }))).toBe(12);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'grid', rows: 3, columns: 4 }))).toBe(17);
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'ladder', columns: 4 }))).toBe(8);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'ladder', columns: 4 }))).toBe(10);
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'prism', vertices: 5 }))).toBe(10);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'prism', vertices: 5 }))).toBe(15);
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'binary-tree', levels: 4 }))).toBe(15);
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'kary-tree', columns: 3, levels: 3 }))).toBe(13);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'kary-tree', columns: 3, levels: 3 }))).toBe(12);
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'layered-dag', rows: 3, columns: 4 }))).toBe(12);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'layered-dag', rows: 3, columns: 4 }))).toBe(32);
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'flow-network', rows: 3, columns: 4 }))).toBe(14);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'flow-network', rows: 3, columns: 4 }))).toBe(40);
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'neural-network', rows: 3, columns: 4 }))).toBe(12);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'neural-network', rows: 3, columns: 4 }))).toBe(32);
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'petersen' }))).toBe(10);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'petersen' }))).toBe(15);
  });

  it('builds graph shapes with edges, nodes and optional labels', () => {
    const shapes = buildGraphShapes({
      ...normalizeGraphDimensions({ kind: 'cycle', vertices: 4, showLabels: true }),
      cx: 0,
      cy: 0
    });

    expect(shapes.filter((shape) => shape.kind === 'line')).toHaveLength(4);
    expect(shapes.filter((shape) => shape.kind === 'circle')).toHaveLength(4);
    expect(shapes.filter((shape) => shape.kind === 'text')).toHaveLength(4);
    expect(shapes.filter((shape) => shape.kind === 'text').every((shape) => !shape.textBox)).toBe(true);
    expect(shapes.filter((shape) => shape.kind === 'line').every((shape) => !shape.mergeId)).toBe(true);
    expect(new Set(shapes.filter((shape) => shape.kind === 'circle').map((shape) => shape.mergeId)).size).toBe(4);
  });

  it('omits labels and adds arrowheads for directed graphs', () => {
    const shapes = buildGraphShapes({
      ...normalizeGraphDimensions({ kind: 'path', vertices: 4, directed: true, showLabels: false }),
      cx: 0,
      cy: 0
    });
    const lines = shapes.filter(
      (shape): shape is Extract<(typeof shapes)[number], { kind: 'line' }> => shape.kind === 'line'
    );

    expect(lines).toHaveLength(3);
    expect(lines.every((line) => line.arrowEnd)).toBe(true);
    expect(lines.every((line) => line.fromAttachment && line.toAttachment)).toBe(true);
    expect(lines[0].from.x).toBeGreaterThan(-1.5);
    expect(lines[0].to.x).toBeLessThan(-0.5);
    expect(shapes.some((shape) => shape.kind === 'text')).toBe(false);
  });

  it('anchors every generated edge to its source and target node', () => {
    const shapes = buildGraphShapes({
      ...normalizeGraphDimensions({ kind: 'grid', rows: 3, columns: 4, showLabels: true }),
      cx: 0,
      cy: 0
    });
    const shapeIds = new Set(shapes.map((shape) => shape.id));
    const lines = shapes.filter(
      (shape): shape is Extract<(typeof shapes)[number], { kind: 'line' }> => shape.kind === 'line'
    );

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.fromAttachment).toBeDefined();
      expect(line.toAttachment).toBeDefined();
      expect(shapeIds.has(line.fromAttachment?.shapeId ?? '')).toBe(true);
      expect(shapeIds.has(line.toAttachment?.shapeId ?? '')).toBe(true);
      expect(Number.isFinite(line.fromAttachment?.anchor?.x)).toBe(true);
      expect(Number.isFinite(line.fromAttachment?.anchor?.y)).toBe(true);
      expect(Number.isFinite(line.toAttachment?.anchor?.x)).toBe(true);
      expect(Number.isFinite(line.toAttachment?.anchor?.y)).toBe(true);
    }
  });

  it('places generated edge endpoints exactly on their attached node anchors', () => {
    const shapes = buildGraphShapes({
      ...normalizeGraphDimensions({ kind: 'bipartite', leftVertices: 3, rightVertices: 4, showLabels: true }),
      cx: 0,
      cy: 0
    });
    const nodesById = new Map(
      shapes
        .filter((shape): shape is Extract<(typeof shapes)[number], { kind: 'circle' }> => shape.kind === 'circle')
        .map((shape) => [shape.id, shape])
    );
    const lines = shapes.filter(
      (shape): shape is Extract<(typeof shapes)[number], { kind: 'line' }> => shape.kind === 'line'
    );

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const fromNode = nodesById.get(line.fromAttachment?.shapeId ?? '');
      const toNode = nodesById.get(line.toAttachment?.shapeId ?? '');
      expect(fromNode).toBeDefined();
      expect(toNode).toBeDefined();
      expect(line.from.x).toBeCloseTo((fromNode?.cx ?? 0) + (line.fromAttachment?.anchor?.x ?? 0) * (fromNode?.r ?? 0));
      expect(line.from.y).toBeCloseTo((fromNode?.cy ?? 0) + (line.fromAttachment?.anchor?.y ?? 0) * (fromNode?.r ?? 0));
      expect(line.to.x).toBeCloseTo((toNode?.cx ?? 0) + (line.toAttachment?.anchor?.x ?? 0) * (toNode?.r ?? 0));
      expect(line.to.y).toBeCloseTo((toNode?.cy ?? 0) + (line.toAttachment?.anchor?.y ?? 0) * (toNode?.r ?? 0));
    }
  });
});
