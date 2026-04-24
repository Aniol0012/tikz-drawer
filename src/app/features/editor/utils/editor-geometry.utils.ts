import type {
  RectangleCanvasShape,
  ResizeHandle,
  TriangleCanvasShape
} from '../components/editor-page/editor-page.types';
import { TEXT_RENDER_LINE_HEIGHT_FACTOR } from '../constants/editor.constants';
import type { CanvasShape, LineShape, Point } from '../models/tikz.models';
import type { SelectionBounds } from './editor-page.utils';
import { displayTextLinesForShape, estimateTextHeight, estimateTextWidth, textLeftForWidth } from './text.utils';

export const linePoints = (shape: LineShape): readonly Point[] => [shape.from, ...shape.anchors, shape.to];

export const trianglePoints = (shape: TriangleCanvasShape): readonly [Point, Point, Point] => {
  const apex = {
    x: shape.x + shape.width * shape.apexOffset,
    y: shape.y + shape.height
  };
  const left = { x: shape.x, y: shape.y };
  const right = { x: shape.x + shape.width, y: shape.y };
  return [apex, left, right];
};

export const buildTrianglePath = (
  shape: TriangleCanvasShape,
  projectPoint: (point: Point) => { readonly x: number; readonly y: number }
): string => {
  const [apex, left, right] = trianglePoints(shape).map(projectPoint);
  return `M ${apex.x} ${apex.y} L ${left.x} ${left.y} L ${right.x} ${right.y} Z`;
};

export const buildLinePath = (
  shape: LineShape,
  projectPoint: (point: Point) => { readonly x: number; readonly y: number }
): string => {
  const points = linePoints(shape).map(projectPoint);
  if (points.length < 2) {
    return '';
  }

  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  if (shape.lineMode === 'straight') {
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const control1 = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6
    };
    const control2 = {
      x: next.x - (afterNext.x - current.x) / 6,
      y: next.y - (afterNext.y - current.y) / 6
    };
    path += ` C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${next.x} ${next.y}`;
  }

  return path;
};

export const rotatePointAround = (point: Point, pivot: Point, rotationDegrees: number): Point => {
  if (Math.abs(rotationDegrees) < 0.0001) {
    return { ...point };
  }
  const radians = (rotationDegrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const deltaX = point.x - pivot.x;
  const deltaY = point.y - pivot.y;
  return {
    x: pivot.x + deltaX * cosine - deltaY * sine,
    y: pivot.y + deltaX * sine + deltaY * cosine
  };
};

export const normalizeRotationDegrees = (rotationDegrees: number): number => {
  const normalized = ((((rotationDegrees + 180) % 360) + 360) % 360) - 180;
  const rounded = Number.parseFloat(normalized.toFixed(3));
  return Math.abs(rounded) < 0.001 ? 0 : rounded;
};

export const boundsFromPoints = (points: readonly Point[]): SelectionBounds | null => {
  if (points.length === 0) {
    return null;
  }
  return points.reduce<SelectionBounds>(
    (bounds, point) => ({
      left: Math.min(bounds.left, point.x),
      right: Math.max(bounds.right, point.x),
      bottom: Math.min(bounds.bottom, point.y),
      top: Math.max(bounds.top, point.y)
    }),
    {
      left: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      bottom: Number.POSITIVE_INFINITY,
      top: Number.NEGATIVE_INFINITY
    }
  );
};

export const rotatedRectangleBounds = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotationDegrees: number
): SelectionBounds => {
  const corners: readonly Point[] = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ];
  if (!rotationDegrees) {
    return boundsFromPoints(corners) as SelectionBounds;
  }
  const pivot = { x: x + width / 2, y: y + height / 2 };
  return boundsFromPoints(
    corners.map((corner) => rotatePointAround(corner, pivot, rotationDegrees))
  ) as SelectionBounds;
};

export const rotatedEllipseBounds = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotationDegrees: number
): SelectionBounds => {
  if (!rotationDegrees) {
    return { left: cx - rx, right: cx + rx, bottom: cy - ry, top: cy + ry };
  }
  const radians = (rotationDegrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const halfWidth = Math.sqrt(rx * rx * cosine * cosine + ry * ry * sine * sine);
  const halfHeight = Math.sqrt(rx * rx * sine * sine + ry * ry * cosine * cosine);
  return { left: cx - halfWidth, right: cx + halfWidth, bottom: cy - halfHeight, top: cy + halfHeight };
};

export const shapeCenter = (shape: CanvasShape): Point => {
  switch (shape.kind) {
    case 'line': {
      const points = linePoints(shape);
      const bounds = points.reduce(
        (accumulator, point) => ({
          left: Math.min(accumulator.left, point.x),
          right: Math.max(accumulator.right, point.x),
          bottom: Math.min(accumulator.bottom, point.y),
          top: Math.max(accumulator.top, point.y)
        }),
        {
          left: Number.POSITIVE_INFINITY,
          right: Number.NEGATIVE_INFINITY,
          bottom: Number.POSITIVE_INFINITY,
          top: Number.NEGATIVE_INFINITY
        }
      );
      return { x: (bounds.left + bounds.right) / 2, y: (bounds.bottom + bounds.top) / 2 };
    }
    case 'rectangle':
    case 'triangle':
    case 'image':
      return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
    case 'circle':
    case 'ellipse':
      return { x: shape.cx, y: shape.cy };
    case 'text':
      return { x: shape.x, y: shape.y };
  }
};

export const shapeRotation = (shape: CanvasShape): number => {
  switch (shape.kind) {
    case 'line':
      return 0;
    case 'text':
      return shape.rotation;
    case 'rectangle':
    case 'triangle':
    case 'ellipse':
    case 'image':
      return shape.rotation ?? 0;
    case 'circle':
      return 0;
  }
};

export const shapeBounds = (shape: CanvasShape): SelectionBounds | null => {
  switch (shape.kind) {
    case 'rectangle':
      return rotatedRectangleBounds(shape.x, shape.y, shape.width, shape.height, shape.rotation ?? 0);
    case 'triangle':
      return rotatedRectangleBounds(shape.x, shape.y, shape.width, shape.height, shape.rotation ?? 0);
    case 'circle':
      return {
        left: shape.cx - shape.r,
        right: shape.cx + shape.r,
        bottom: shape.cy - shape.r,
        top: shape.cy + shape.r
      };
    case 'ellipse':
      return rotatedEllipseBounds(shape.cx, shape.cy, shape.rx, shape.ry, shape.rotation ?? 0);
    case 'line':
      return linePoints(shape).reduce<SelectionBounds>(
        (bounds, point) => ({
          left: Math.min(bounds.left, point.x),
          right: Math.max(bounds.right, point.x),
          bottom: Math.min(bounds.bottom, point.y),
          top: Math.max(bounds.top, point.y)
        }),
        {
          left: Number.POSITIVE_INFINITY,
          right: Number.NEGATIVE_INFINITY,
          bottom: Number.POSITIVE_INFINITY,
          top: Number.NEGATIVE_INFINITY
        }
      );
    case 'text': {
      const lines = displayTextLinesForShape(shape);
      const width = estimateTextWidth(shape, 1, undefined, lines);
      const height = estimateTextHeight(shape, lines.length, 1, TEXT_RENDER_LINE_HEIGHT_FACTOR);
      const left = textLeftForWidth(shape, shape.x, width);
      const baseCorners: readonly Point[] = [
        { x: left, y: shape.y - height / 2 },
        { x: left + width, y: shape.y - height / 2 },
        { x: left + width, y: shape.y + height / 2 },
        { x: left, y: shape.y + height / 2 }
      ];
      const rotatedCorners = shape.rotation
        ? baseCorners.map((corner) => rotatePointAround(corner, { x: shape.x, y: shape.y }, shape.rotation))
        : baseCorners;
      return boundsFromPoints(rotatedCorners);
    }
    case 'image':
      return rotatedRectangleBounds(shape.x, shape.y, shape.width, shape.height, shape.rotation ?? 0);
  }
};

export const computeBounds = (shapes: readonly CanvasShape[]): SelectionBounds | null => {
  if (!shapes.length) {
    return null;
  }

  return shapes.reduce<SelectionBounds | null>((currentBounds, shape) => {
    const nextBounds = shapeBounds(shape);
    if (!nextBounds) {
      return currentBounds;
    }
    if (!currentBounds) {
      return nextBounds;
    }
    return {
      left: Math.min(currentBounds.left, nextBounds.left),
      right: Math.max(currentBounds.right, nextBounds.right),
      top: Math.max(currentBounds.top, nextBounds.top),
      bottom: Math.min(currentBounds.bottom, nextBounds.bottom)
    };
  }, null);
};

export const cornerRadiusFromPointer = (shape: RectangleCanvasShape, handle: ResizeHandle, pointer: Point): number => {
  const maxRadius = Math.min(shape.width, shape.height) / 2;
  if (maxRadius <= 0) {
    return 0;
  }
  const center = shapeCenter(shape);
  const localPointer = rotatePointAround(pointer, center, -shapeRotation(shape));
  let horizontalInset = shape.cornerRadius;
  let verticalInset = shape.cornerRadius;
  switch (handle) {
    case 'corner-radius-nw':
      horizontalInset = localPointer.x - shape.x;
      verticalInset = shape.y + shape.height - localPointer.y;
      break;
    case 'corner-radius-ne':
      horizontalInset = shape.x + shape.width - localPointer.x;
      verticalInset = shape.y + shape.height - localPointer.y;
      break;
    case 'corner-radius-se':
      horizontalInset = shape.x + shape.width - localPointer.x;
      verticalInset = localPointer.y - shape.y;
      break;
    case 'corner-radius-sw':
      horizontalInset = localPointer.x - shape.x;
      verticalInset = localPointer.y - shape.y;
      break;
    default:
      return shape.cornerRadius;
  }
  return Math.max(0, Math.min(maxRadius, horizontalInset, verticalInset));
};

export const rotateShapeAround = (shape: CanvasShape, pivot: Point, rotationDeltaDegrees: number): CanvasShape => {
  if (Math.abs(rotationDeltaDegrees) < 0.0001) {
    return shape;
  }

  switch (shape.kind) {
    case 'line':
      return shape;
    case 'rectangle': {
      const center = shapeCenter(shape);
      const nextCenter = rotatePointAround(center, pivot, rotationDeltaDegrees);
      return {
        ...shape,
        x: nextCenter.x - shape.width / 2,
        y: nextCenter.y - shape.height / 2,
        rotation: normalizeRotationDegrees((shape.rotation ?? 0) + rotationDeltaDegrees)
      } as CanvasShape;
    }
    case 'triangle': {
      const center = shapeCenter(shape);
      const nextCenter = rotatePointAround(center, pivot, rotationDeltaDegrees);
      return {
        ...shape,
        x: nextCenter.x - shape.width / 2,
        y: nextCenter.y - shape.height / 2,
        rotation: normalizeRotationDegrees((shape.rotation ?? 0) + rotationDeltaDegrees)
      } as CanvasShape;
    }
    case 'circle': {
      const nextCenter = rotatePointAround({ x: shape.cx, y: shape.cy }, pivot, rotationDeltaDegrees);
      return {
        ...shape,
        cx: nextCenter.x,
        cy: nextCenter.y
      } as CanvasShape;
    }
    case 'ellipse': {
      const nextCenter = rotatePointAround({ x: shape.cx, y: shape.cy }, pivot, rotationDeltaDegrees);
      return {
        ...shape,
        cx: nextCenter.x,
        cy: nextCenter.y,
        rotation: normalizeRotationDegrees((shape.rotation ?? 0) + rotationDeltaDegrees)
      } as CanvasShape;
    }
    case 'text': {
      const nextCenter = rotatePointAround({ x: shape.x, y: shape.y }, pivot, rotationDeltaDegrees);
      return {
        ...shape,
        x: nextCenter.x,
        y: nextCenter.y,
        rotation: normalizeRotationDegrees(shape.rotation + rotationDeltaDegrees)
      } as CanvasShape;
    }
    case 'image': {
      const center = shapeCenter(shape);
      const nextCenter = rotatePointAround(center, pivot, rotationDeltaDegrees);
      return {
        ...shape,
        x: nextCenter.x - shape.width / 2,
        y: nextCenter.y - shape.height / 2,
        rotation: normalizeRotationDegrees((shape.rotation ?? 0) + rotationDeltaDegrees)
      } as CanvasShape;
    }
  }
};
