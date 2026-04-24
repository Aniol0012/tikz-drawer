import type { CanvasShape } from '../models/tikz.models';
import type { LineCanvasShape, ResizeHandle } from '../components/editor-page/editor-page.types';
import type { SelectionBounds } from './editor-page.utils';
import { resizeSelection, resizeShape, type ResizeShapeOptions } from './editor-resize.utils';

const rectangleShape: Extract<CanvasShape, { kind: 'rectangle' }> = {
  id: 'rect-1',
  name: 'Rect',
  kind: 'rectangle',
  x: 0,
  y: 0,
  width: 2,
  height: 1,
  stroke: '#111111',
  strokeOpacity: 1,
  strokeWidth: 0.1,
  fill: '#ffffff',
  fillOpacity: 1,
  cornerRadius: 0
};

const textShape: Extract<CanvasShape, { kind: 'text' }> = {
  id: 'text-1',
  name: 'Text',
  kind: 'text',
  x: 1,
  y: 1,
  text: 'Hello',
  textBox: true,
  boxWidth: 2,
  fontSize: 0.4,
  color: '#111111',
  colorOpacity: 1,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'left',
  rotation: 0,
  stroke: 'none',
  strokeOpacity: 1,
  strokeWidth: 0
};

const lineShape: LineCanvasShape = {
  id: 'line-1',
  name: 'Line',
  kind: 'line',
  from: { x: 0, y: 0 },
  to: { x: 1, y: 1 },
  anchors: [],
  lineMode: 'straight',
  stroke: '#111111',
  strokeOpacity: 1,
  strokeWidth: 0.1,
  arrowStart: true,
  arrowEnd: true,
  arrowType: 'latex',
  arrowColor: '#111111',
  arrowOpacity: 1,
  arrowOpen: false,
  arrowRound: false,
  arrowScale: 1,
  arrowLengthScale: 1,
  arrowWidthScale: 1,
  arrowBendMode: 'none'
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

const shapeBounds = (shape: CanvasShape): SelectionBounds | null => {
  if (shape.kind !== 'text') {
    return null;
  }
  return { left: shape.x, right: shape.x + shape.boxWidth, top: shape.y + 0.5, bottom: shape.y - 0.5 };
};

const resizeOptions = (selectedShapeKind: CanvasShape['kind'] | null = null): ResizeShapeOptions => ({
  shapeBounds,
  lineArrowControlScale: () => 2.5,
  selectedShapeKind,
  shiftPressed: false,
  minShapeDimension: 0.2,
  minTextResizeWidth: 0.4,
  minTextResizeHeight: 0.24,
  minTextBoxWidth: 1.2,
  minTextFontSize: 0.2,
  textMinHeightFactor: 0.72
});

describe('editor-resize utils', () => {
  it('resizes rectangle shapes with drag handles', () => {
    const resized = resizeShape(rectangleShape, 'se', { x: 4, y: -1 }, resizeOptions());
    expect(resized.kind).toBe('rectangle');
    if (resized.kind !== 'rectangle') {
      throw new Error('Expected rectangle');
    }

    expect(resized.width).toBeCloseTo(4);
    expect(resized.height).toBeCloseTo(2);
  });

  it('resizes rotated rectangle shapes in local axes', () => {
    const rotatedRectangle = {
      ...rectangleShape,
      rotation: 45
    } satisfies Extract<CanvasShape, { kind: 'rectangle' }>;
    const center = {
      x: rotatedRectangle.x + rotatedRectangle.width / 2,
      y: rotatedRectangle.y + rotatedRectangle.height / 2
    };
    const pointer = rotatePointAround({ x: 3, y: center.y }, center, -(rotatedRectangle.rotation ?? 0));
    const resized = resizeShape(rotatedRectangle, 'e', pointer, resizeOptions());
    expect(resized.kind).toBe('rectangle');
    if (resized.kind !== 'rectangle') {
      throw new Error('Expected rectangle');
    }

    expect(resized.width).toBeCloseTo(3, 3);
    expect(resized.height).toBeCloseTo(rotatedRectangle.height, 3);
  });

  it('resizes rotated triangle shapes in local axes', () => {
    const rotatedTriangle = {
      id: 'tri-1',
      name: 'Triangle',
      kind: 'triangle',
      x: 0,
      y: 0,
      width: 2,
      height: 1,
      apexOffset: 0.5,
      cornerRadius: 0,
      rotation: 30,
      stroke: '#111111',
      strokeOpacity: 1,
      strokeWidth: 0.1,
      fill: '#ffffff',
      fillOpacity: 1
    } satisfies Extract<CanvasShape, { kind: 'triangle' }>;
    const center = {
      x: rotatedTriangle.x + rotatedTriangle.width / 2,
      y: rotatedTriangle.y + rotatedTriangle.height / 2
    };
    const pointer = rotatePointAround({ x: 3, y: center.y }, center, -(rotatedTriangle.rotation ?? 0));
    const resized = resizeShape(rotatedTriangle, 'e', pointer, resizeOptions());
    expect(resized.kind).toBe('triangle');
    if (resized.kind !== 'triangle') {
      throw new Error('Expected triangle');
    }

    expect(resized.width).toBeCloseTo(3, 3);
    expect(resized.height).toBeCloseTo(rotatedTriangle.height, 3);
  });

  it('resizes textbox text using provided bounds', () => {
    const resized = resizeShape(textShape, 'e', { x: 4, y: 1 }, resizeOptions());
    expect(resized.kind).toBe('text');
    if (resized.kind !== 'text') {
      throw new Error('Expected text');
    }

    expect(resized.boxWidth).toBeGreaterThan(textShape.boxWidth);
    expect(resized.fontSize).toBeGreaterThanOrEqual(0.2);
  });

  it('resizes line arrow controls through callback', () => {
    const resized = resizeShape(lineShape, 'arrow-length-start', { x: 0, y: 0 }, resizeOptions()) as LineCanvasShape;
    expect(resized.arrowLengthScale).toBe(2.5);
  });

  it('resizes grouped selections only for selection handles', () => {
    const selectionBounds: SelectionBounds = { left: 0, right: 2, bottom: 0, top: 2 };
    const shapes: readonly CanvasShape[] = [rectangleShape];
    const unchanged = resizeSelection(shapes, selectionBounds, 'from' as ResizeHandle, { x: 1, y: 1 }, false);
    expect(unchanged).toEqual(shapes);

    const resized = resizeSelection(shapes, selectionBounds, 'se', { x: 4, y: -2 }, false);
    expect(resized).toHaveLength(1);
    expect(resized[0]?.kind).toBe('rectangle');
  });
});
