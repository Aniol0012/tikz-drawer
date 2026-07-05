import type { RectangleCanvasShape } from '../components/editor-page/editor-page.types';
import type { CanvasShape, LineShape } from '../models/tikz.models';
import {
  buildLinePath,
  buildTrianglePath,
  computeBounds,
  cornerRadiusHandlePoint,
  cornerRadiusFromPointer,
  maxTriangleCornerRadius,
  normalizeRotationDegrees,
  pointInTriangleShape,
  rotateShapeAround,
  shapeBounds,
  triangleCornerAttachmentAnchors,
  triangleCornerAttachmentPointFromAnchor,
  triangleCornerAttachmentPoints
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

const triangleShape: Extract<CanvasShape, { kind: 'triangle' }> = {
  id: 'triangle-1',
  name: 'Triangle',
  kind: 'triangle',
  stroke: '#111111',
  strokeOpacity: 1,
  strokeWidth: 0.28,
  x: -3,
  y: -1.5,
  width: 6,
  height: 4,
  fill: '#ffffff',
  fillOpacity: 1,
  cornerRadius: 0.5,
  apexOffset: 0.5,
  rotation: 0
};

const rotatePointAround = (point: { x: number; y: number }, pivot: { x: number; y: number }, angleDegrees: number) => {
  const radians = (angleDegrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const deltaX = point.x - pivot.x;
  const deltaY = point.y - pivot.y;
  return {
    x: pivot.x + deltaX * cosine - deltaY * sine,
    y: pivot.y + deltaX * sine + deltaY * cosine
  };
};

describe('editor-geometry utils', () => {
  it('builds curved and straight line paths', () => {
    const curvedPath = buildLinePath(lineShape, (point) => point);
    const straightPath = buildLinePath({ ...lineShape, lineMode: 'straight' }, (point) => point);

    expect(curvedPath.startsWith('M 0 0 C')).toBe(true);
    expect(curvedPath.includes('C')).toBe(true);
    expect(straightPath).toBe('M 0 0 L 2 3 L 4 -2 L 6 0');
  });

  it('builds rounded triangle paths when corner radius is provided', () => {
    const roundedPath = buildTrianglePath(triangleShape, (point) => point, triangleShape.cornerRadius);
    const sharpPath = buildTrianglePath(triangleShape, (point) => point, 0);
    const [apexSnap, leftSnap, rightSnap] = triangleCornerAttachmentPoints(triangleShape);

    expect(roundedPath.includes('Q')).toBe(true);
    expect(sharpPath.includes('Q')).toBe(false);
    expect(maxTriangleCornerRadius(triangleShape)).toBeGreaterThan(0);
    expect(apexSnap.y).toBeLessThan(2.5);
    expect(leftSnap.x).toBeGreaterThan(-3);
    expect(leftSnap.y).toBeGreaterThan(-1.5);
    expect(rightSnap.x).toBeLessThan(3);
    expect(rightSnap.y).toBeGreaterThan(-1.5);
  });

  it('keeps triangle attachment anchors tied to their corner after radius and size changes', () => {
    const [, leftAnchor] = triangleCornerAttachmentAnchors({ ...triangleShape, cornerRadius: 0 });
    const resizedRoundedTriangle = {
      ...triangleShape,
      x: -3,
      y: -1.5,
      width: 8,
      height: 5,
      cornerRadius: 0.9
    };
    const [, leftAttachment] = triangleCornerAttachmentPoints(resizedRoundedTriangle);

    expect(triangleCornerAttachmentPointFromAnchor(resizedRoundedTriangle, leftAnchor)).toEqual(leftAttachment);
  });

  it('uses the rounded triangle outline for shape bounds', () => {
    const sharpBounds = shapeBounds({ ...triangleShape, cornerRadius: 0 });
    const roundedBounds = shapeBounds(triangleShape);

    expect(sharpBounds).toEqual({ left: -3, right: 3, bottom: -1.5, top: 2.5 });
    expect(roundedBounds?.left).toBeGreaterThan(-3);
    expect(roundedBounds?.right).toBeLessThan(3);
    expect(roundedBounds?.bottom).toBe(-1.5);
    expect(roundedBounds?.top).toBeLessThan(2.5);
  });

  it('hit-tests triangle shapes by their actual geometry', () => {
    expect(pointInTriangleShape({ ...triangleShape, cornerRadius: 0 }, { x: 0, y: 0 })).toBe(true);
    expect(pointInTriangleShape({ ...triangleShape, cornerRadius: 0 }, { x: -2.8, y: 2.2 })).toBe(false);
    expect(pointInTriangleShape({ ...triangleShape, cornerRadius: 0 }, { x: -2.95, y: -1.45 }, 0.12)).toBe(true);
  });

  it('hit-tests rounded triangles against the rounded outline', () => {
    expect(pointInTriangleShape(triangleShape, { x: 0, y: 2.48 })).toBe(false);
    expect(pointInTriangleShape(triangleShape, { x: 0, y: 1.9 })).toBe(true);
    expect(pointInTriangleShape(triangleShape, { x: -2.98, y: -1.48 })).toBe(false);
    expect(pointInTriangleShape(triangleShape, { x: -2.72, y: -1.24 }, 0.2)).toBe(true);
  });

  it('hit-tests rotated triangles in local shape space', () => {
    const rotatedTriangle = { ...triangleShape, cornerRadius: 0, rotation: 30 };
    const center = { x: rotatedTriangle.x + rotatedTriangle.width / 2, y: rotatedTriangle.y + rotatedTriangle.height / 2 };
    const insidePoint = rotatePointAround({ x: 0, y: 0 }, center, -30);
    const outsidePoint = rotatePointAround({ x: -2.8, y: 2.2 }, center, -30);

    expect(pointInTriangleShape(rotatedTriangle, insidePoint)).toBe(true);
    expect(pointInTriangleShape(rotatedTriangle, outsidePoint)).toBe(false);
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

  it('fits text bounds around the rendered baseline', () => {
    const bounds = shapeBounds({
      id: 'text-1',
      name: 'Text',
      kind: 'text',
      text: 'TEXT',
      x: 0,
      y: 0,
      textBox: false,
      boxWidth: 4,
      fontSize: 1,
      color: '#111111',
      colorOpacity: 1,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'center',
      rotation: 0
    });

    expect(bounds?.left).toBeCloseTo(-1.12, 6);
    expect(bounds?.right).toBeCloseTo(1.12, 6);
    expect(bounds?.bottom).toBeCloseTo(-0.26, 6);
    expect(bounds?.top).toBeCloseTo(0.58, 6);
  });

  it('fits text bounds around every explicit line break', () => {
    const bounds = shapeBounds({
      id: 'text-1',
      name: 'Text',
      kind: 'text',
      text: 'First\nSecond',
      x: 0,
      y: 0,
      textBox: false,
      boxWidth: 4,
      fontSize: 1,
      color: '#111111',
      colorOpacity: 1,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'center',
      rotation: 0
    });

    expect(bounds?.left).toBeCloseTo(-1.68, 6);
    expect(bounds?.right).toBeCloseTo(1.68, 6);
    expect(bounds?.bottom).toBeCloseTo(-1.4, 6);
    expect(bounds?.top).toBeCloseTo(0.58, 6);
  });

  it('rotates a rectangle around a pivot while preserving size', () => {
    const rotated = rotateShapeAround(rectangleShape, { x: 0, y: 0 }, 90);
    expect(rotated.kind).toBe('rectangle');
    if (rotated.kind !== 'rectangle') {
      throw new Error('Expected a rectangle shape');
    }

    expect(rotated.width).toBe(10);
    expect(rotated.height).toBe(6);
    expect(rotated.x).toBeCloseTo(-2, 6);
    expect(rotated.y).toBeCloseTo(-8, 6);
    expect(rotated.rotation).toBe(90);
  });

  it('rotates line points around a pivot', () => {
    const simpleLine: LineShape = {
      ...lineShape,
      anchors: [],
      from: { x: 0, y: 0 },
      to: { x: 2, y: 0 }
    };

    const rotated = rotateShapeAround(simpleLine, { x: 1, y: 0 }, 90);
    expect(rotated.kind).toBe('line');
    if (rotated.kind !== 'line') {
      throw new Error('Expected a line shape');
    }

    expect(rotated.from.x).toBeCloseTo(1);
    expect(rotated.from.y).toBeCloseTo(1);
    expect(rotated.to.x).toBeCloseTo(1);
    expect(rotated.to.y).toBeCloseTo(-1);
  });

  it('clamps corner radius from pointer movement', () => {
    const radius = cornerRadiusFromPointer(rectangleShape, 'corner-radius-nw', { x: 3, y: 4 });
    const clampedRadius = cornerRadiusFromPointer(rectangleShape, 'corner-radius-nw', { x: 99, y: -99 });

    expect(radius).toBeCloseTo(2);
    expect(clampedRadius).toBe(2.52);
  });

  it('places rectangle corner radius handles at the actual radius point', () => {
    const sharpRectangle = { ...rectangleShape, cornerRadius: 0 };

    expect(cornerRadiusHandlePoint(sharpRectangle, 'corner-radius-nw')).toEqual({ x: 0, y: 6 });
    expect(cornerRadiusHandlePoint(rectangleShape, 'corner-radius-nw')).toEqual({ x: 1.5, y: 4.5 });
    expect(cornerRadiusHandlePoint(rectangleShape, 'corner-radius-se')).toEqual({ x: 8.5, y: 1.5 });
  });

  it('keeps rotated rectangle corner radius pointer mapping stable', () => {
    const rotatedRectangle = {
      ...rectangleShape,
      rotation: 32
    } satisfies RectangleCanvasShape;
    const center = {
      x: rotatedRectangle.x + rotatedRectangle.width / 2,
      y: rotatedRectangle.y + rotatedRectangle.height / 2
    };
    const localPointer = { x: rotatedRectangle.x + 2, y: rotatedRectangle.y + rotatedRectangle.height - 2 };
    const pointer = rotatePointAround(localPointer, center, -(rotatedRectangle.rotation ?? 0));
    const radius = cornerRadiusFromPointer(rotatedRectangle, 'corner-radius-nw', pointer);

    expect(radius).toBeCloseTo(2, 3);
  });

  it('updates triangle corner radius from dedicated corner handles', () => {
    const radius = cornerRadiusFromPointer(triangleShape, 'corner-radius-apex', { x: 0, y: 1.8 });
    const clamped = cornerRadiusFromPointer(triangleShape, 'corner-radius-apex', { x: 0, y: -100 });

    expect(radius).toBeGreaterThan(0);
    expect(clamped).toBeCloseTo(maxTriangleCornerRadius(triangleShape));
  });

  it('places triangle corner radius handles at their current radius along the bisector', () => {
    const sharpTriangle = { ...triangleShape, cornerRadius: 0 };
    const apex = { x: triangleShape.x + triangleShape.width * triangleShape.apexOffset, y: triangleShape.y + triangleShape.height };
    const sharpHandlePoint = cornerRadiusHandlePoint(sharpTriangle, 'corner-radius-apex');
    const roundedHandlePoint = cornerRadiusHandlePoint(triangleShape, 'corner-radius-apex');

    expect(sharpHandlePoint).toEqual(apex);
    expect(roundedHandlePoint?.x).toBeCloseTo(apex.x);
    expect(roundedHandlePoint?.y).toBeLessThan(apex.y);
  });
});
