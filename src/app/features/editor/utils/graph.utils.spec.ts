import { buildGraphShapes, graphEdgeCount, graphVertexCount, normalizeGraphDimensions } from './graph.utils';

describe('graph utils', () => {
  it('computes common graph sizes', () => {
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'complete', vertices: 5 }))).toBe(5);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'complete', vertices: 5 }))).toBe(10);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'cycle', vertices: 6 }))).toBe(6);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'path', vertices: 6 }))).toBe(5);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'star', vertices: 6 }))).toBe(5);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'bipartite', leftVertices: 3, rightVertices: 4 }))).toBe(12);
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'grid', rows: 3, columns: 4 }))).toBe(12);
    expect(graphEdgeCount(normalizeGraphDimensions({ kind: 'grid', rows: 3, columns: 4 }))).toBe(17);
    expect(graphVertexCount(normalizeGraphDimensions({ kind: 'binary-tree', levels: 4 }))).toBe(15);
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
    expect(shapes.filter((shape) => shape.kind === 'text').every((shape) => shape.textBox)).toBe(true);
    expect(new Set(shapes.map((shape) => shape.mergeId)).size).toBe(1);
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
    expect(lines[0].from.x).toBeGreaterThan(-1.5);
    expect(lines[0].to.x).toBeLessThan(-0.5);
    expect(shapes.some((shape) => shape.kind === 'text')).toBe(false);
  });
});
