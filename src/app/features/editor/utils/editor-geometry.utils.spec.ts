import type { RectangleCanvasShape } from '../components/editor-page/editor-page.types';
import type { CanvasShape, LineShape } from '../models/tikz.models';
import {
  buildLinePath,
  computeBounds,
  cornerRadiusFromPointer,
  normalizeRotationDegrees,
  rotateShapeAround,
  shapeBounds
} from './editor-geometry.utils';

const lineShape: LineShape = {
  id: 'line-1',
  name: 'Curve',
  kind: 'line',
  stroke: '#111111',
  strokeOpacity: 1,
  strokeWidth: 0.28,
  from: { x: 0, y: 0 },
  to: { x: 6, y: 0 },
  anchors: [
    { x: 2, y: 3 },
    { x: 4, y: -2 }
  ],
  lineMode: 'curved',
  arrowStart: false,
  arrowEnd: true,
  arrowType: 'latex',
  arrowColor: '#111111',
  arrowOpacity: 1,
  arrowOpen: false,
  arrowRound: false,
  arrowScale: 1.2,
  arrowLengthScale: 1,
  arrowWidthScale: 1,
  arrowBendMode: 'none'
};

const rectangleShape: RectangleCanvasShape = {
  id: 'rect-1',
  name: 'Rectangle',
  kind: 'rectangle',
  stroke: '#111111',
  strokeOpacity: 1,
  strokeWidth: 0.28,
  x: 0,
  y: 0,
  width: 10,
  height: 6,
  fill: '#ffffff',
  fillOpacity: 1,
  cornerRadius: 1.5,
  rotation: 0
};

describe('editor-geometry utils', () => {
  it('builds curved and straight line paths', () => {
    const curvedPath = buildLinePath(lineShape, (point) => point);
    const straightPath = buildLinePath({ ...lineShape, lineMode: 'straight' }, (point) => point);

    expect(curvedPath.startsWith('M 0 0 C')).toBe(true);
    expect(curvedPath.includes('C')).toBe(true);
    expect(straightPath).toBe('M 0 0 L 2 3 L 4 -2 L 6 0');
  });

  it('normalizes rotation values into the editor range', () => {
    expect(normalizeRotationDegrees(181)).toBe(-179);
    expect(normalizeRotationDegrees(-721)).toBe(-1);
    expect(normalizeRotationDegrees(0.0004)).toBe(0);
  });

  it('computes shape bounds and aggregated bounds', () => {
    const shapes: readonly CanvasShape[] = [
      rectangleShape,
      {
        id: 'circle-1',
        name: 'Circle',
        kind: 'circle',
        stroke: '#111111',
        strokeOpacity: 1,
        strokeWidth: 0.28,
        cx: 20,
        cy: -4,
        r: 2,
        fill: '#ffffff',
        fillOpacity: 1
      }
    ];

    expect(shapeBounds(rectangleShape)).toEqual({ left: 0, right: 10, bottom: 0, top: 6 });
    expect(computeBounds(shapes)).toEqual({ left: 0, right: 22, bottom: -6, top: 6 });
  });

  it('rotates a rectangle around a pivot while preserving size', () => {
    const rotated = rotateShapeAround(rectangleShape, { x: 0, y: 0 }, 90);
    expect(rotated.kind).toBe('rectangle');
    if (rotated.kind !== 'rectangle') {
      throw new Error('Expected a rectangle shape');
    }

    expect(rotated.width).toBe(10);
    expect(rotated.height).toBe(6);
    expect(rotated.x).toBeCloseTo(-8, 6);
    expect(rotated.y).toBeCloseTo(2, 6);
    expect(rotated.rotation).toBe(90);
  });

  it('clamps corner radius from pointer movement', () => {
    const radius = cornerRadiusFromPointer(rectangleShape, 'corner-radius-nw', { x: 3, y: 4 });
    const clampedRadius = cornerRadiusFromPointer(rectangleShape, 'corner-radius-nw', { x: 99, y: -99 });

    expect(radius).toBeCloseTo(2);
    expect(clampedRadius).toBe(3);
  });
});
