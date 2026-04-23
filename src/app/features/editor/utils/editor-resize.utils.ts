import type {
  ArrowEndpoint,
  ArrowScaleKind,
  CircleCanvasShape,
  EllipseCanvasShape,
  LineCanvasShape,
  RectangleOrImageCanvasShape,
  ResizeHandle,
  TextCanvasShape
} from '../components/editor-page/editor-page.types';
import type { CanvasShape, Point } from '../models/tikz.models';
import { resizeGroupedShapes, type SelectionBounds, type SelectionResizeHandle } from './editor-page.utils';

const selectionResizeHandles: readonly SelectionResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const isSelectionResizeHandle = (handle: ResizeHandle): handle is SelectionResizeHandle =>
  selectionResizeHandles.includes(handle as SelectionResizeHandle);

interface ResizeBoundsOptions {
  readonly minimumWidth: number;
  readonly minimumHeight: number;
  readonly lockAspectRatio: boolean;
  readonly selectedShapeKind: CanvasShape['kind'] | null;
  readonly aspectRatio?: number;
}

export interface ResizeShapeOptions {
  readonly shapeBounds: (shape: CanvasShape) => SelectionBounds | null;
  readonly lineArrowControlScale: (
    shape: LineCanvasShape,
    endpoint: ArrowEndpoint,
    point: Point,
    kind: ArrowScaleKind
  ) => number;
  readonly selectedShapeKind: CanvasShape['kind'] | null;
  readonly shiftPressed: boolean;
  readonly minShapeDimension: number;
  readonly minTextResizeWidth: number;
  readonly minTextResizeHeight: number;
  readonly minTextBoxWidth: number;
  readonly minTextFontSize: number;
  readonly textMinHeightFactor: number;
}

const resizeBounds = (
  selectionBounds: SelectionBounds,
  handle: ResizeHandle,
  point: Point,
  options: ResizeBoundsOptions
): SelectionBounds => {
  let left = selectionBounds.left;
  let right = selectionBounds.right;
  let top = selectionBounds.top;
  let bottom = selectionBounds.bottom;

  if (handle.includes('w')) {
    left = Math.min(point.x, right - options.minimumWidth);
  }
  if (handle.includes('e')) {
    right = Math.max(point.x, left + options.minimumWidth);
  }
  if (handle.includes('n')) {
    top = Math.max(point.y, bottom + options.minimumHeight);
  }
  if (handle.includes('s')) {
    bottom = Math.min(point.y, top - options.minimumHeight);
  }

  if (options.aspectRatio && (options.lockAspectRatio || options.selectedShapeKind === 'image')) {
    const currentWidth = Math.max(right - left, options.minimumWidth);
    const currentHeight = Math.max(top - bottom, options.minimumHeight);
    const nextHeight = currentWidth / options.aspectRatio;
    const nextWidth = currentHeight * options.aspectRatio;

    if (handle === 'n' || handle === 's') {
      const adjustedWidth = Math.max(nextWidth, options.minimumWidth);
      const centerX = (left + right) / 2;
      left = centerX - adjustedWidth / 2;
      right = centerX + adjustedWidth / 2;
    } else {
      const adjustedHeight = Math.max(nextHeight, options.minimumHeight);
      if (handle.includes('n')) {
        top = bottom + adjustedHeight;
      } else {
        bottom = top - adjustedHeight;
      }
    }
  }

  return { left, right, top, bottom };
};

const resizeTextShape = (
  shape: TextCanvasShape,
  handle: ResizeHandle,
  point: Point,
  options: ResizeShapeOptions
): CanvasShape => {
  const bounds = options.shapeBounds(shape);
  if (!bounds) {
    return shape;
  }

  const resizedBounds = resizeBounds(bounds, handle, point, {
    minimumWidth: options.minTextResizeWidth,
    minimumHeight: options.minTextResizeHeight,
    lockAspectRatio: false,
    selectedShapeKind: options.selectedShapeKind
  });
  const originalWidth = Math.max(bounds.right - bounds.left, shape.fontSize);
  const originalHeight = Math.max(bounds.top - bounds.bottom, shape.fontSize * options.textMinHeightFactor);
  const nextWidth = Math.max(resizedBounds.right - resizedBounds.left, options.minTextResizeWidth);
  const nextHeight = Math.max(resizedBounds.top - resizedBounds.bottom, options.minTextResizeHeight);
  const scaleX = nextWidth / originalWidth;
  const scaleY = nextHeight / originalHeight;
  const scale = Math.max(Math.min(scaleX, scaleY), 0.35);

  if (shape.textBox) {
    return {
      ...shape,
      x: resizedBounds.left,
      y: (resizedBounds.top + resizedBounds.bottom) / 2,
      boxWidth: Math.max(resizedBounds.right - resizedBounds.left, options.minTextBoxWidth),
      fontSize: Math.max(shape.fontSize * scale, options.minTextFontSize)
    };
  }

  return {
    ...shape,
    x: (resizedBounds.left + resizedBounds.right) / 2,
    y: (resizedBounds.top + resizedBounds.bottom) / 2,
    fontSize: Math.max(shape.fontSize * scale, options.minTextFontSize)
  };
};

const resizeRectangleShape = (
  shape: RectangleOrImageCanvasShape,
  handle: ResizeHandle,
  point: Point,
  options: ResizeShapeOptions
): CanvasShape => {
  const resizedBounds = resizeBounds(
    { left: shape.x, right: shape.x + shape.width, bottom: shape.y, top: shape.y + shape.height },
    handle,
    point,
    {
      minimumWidth: options.minShapeDimension,
      minimumHeight: options.minShapeDimension,
      lockAspectRatio: options.shiftPressed,
      selectedShapeKind: options.selectedShapeKind,
      aspectRatio: shape.kind === 'image' ? shape.aspectRatio : shape.width / shape.height
    }
  );
  const resizedShape = {
    ...shape,
    x: resizedBounds.left,
    y: resizedBounds.bottom,
    width: resizedBounds.right - resizedBounds.left,
    height: resizedBounds.top - resizedBounds.bottom
  };
  return shape.kind === 'image'
    ? ({
        ...resizedShape,
        aspectRatio: shape.aspectRatio || (resizedShape.height !== 0 ? resizedShape.width / resizedShape.height : 1)
      } as CanvasShape)
    : resizedShape;
};

const resizeCircleShape = (shape: CircleCanvasShape, handle: ResizeHandle, point: Point): CanvasShape => {
  const resizedBounds = resizeBounds(
    { left: shape.cx - shape.r, right: shape.cx + shape.r, bottom: shape.cy - shape.r, top: shape.cy + shape.r },
    handle,
    point,
    {
      minimumWidth: 0.2,
      minimumHeight: 0.2,
      lockAspectRatio: true,
      selectedShapeKind: 'circle',
      aspectRatio: 1
    }
  );
  const radius = Math.max(
    (resizedBounds.right - resizedBounds.left) / 2,
    (resizedBounds.top - resizedBounds.bottom) / 2,
    0.1
  );
  return {
    ...shape,
    cx: (resizedBounds.left + resizedBounds.right) / 2,
    cy: (resizedBounds.top + resizedBounds.bottom) / 2,
    r: radius
  };
};

const resizeEllipseShape = (
  shape: EllipseCanvasShape,
  handle: ResizeHandle,
  point: Point,
  options: ResizeShapeOptions
): CanvasShape => {
  const aspectRatio = shape.ry === 0 ? 1 : shape.rx / shape.ry;
  const resizedBounds = resizeBounds(
    { left: shape.cx - shape.rx, right: shape.cx + shape.rx, bottom: shape.cy - shape.ry, top: shape.cy + shape.ry },
    handle,
    point,
    {
      minimumWidth: 0.2,
      minimumHeight: 0.2,
      lockAspectRatio: options.shiftPressed,
      selectedShapeKind: options.selectedShapeKind,
      aspectRatio
    }
  );
  return {
    ...shape,
    cx: (resizedBounds.left + resizedBounds.right) / 2,
    cy: (resizedBounds.top + resizedBounds.bottom) / 2,
    rx: Math.max((resizedBounds.right - resizedBounds.left) / 2, 0.1),
    ry: Math.max((resizedBounds.top - resizedBounds.bottom) / 2, 0.1)
  };
};

const resizeLineShape = (
  shape: LineCanvasShape,
  handle: ResizeHandle,
  point: Point,
  options: ResizeShapeOptions
): CanvasShape => {
  if (handle === 'from') {
    return { ...shape, from: point };
  }

  if (handle === 'to') {
    return { ...shape, to: point };
  }

  if (handle === 'arrow-length-start') {
    return { ...shape, arrowLengthScale: options.lineArrowControlScale(shape, 'start', point, 'length') };
  }

  if (handle === 'arrow-length-end') {
    return { ...shape, arrowLengthScale: options.lineArrowControlScale(shape, 'end', point, 'length') };
  }

  if (handle === 'arrow-width-start') {
    return { ...shape, arrowWidthScale: options.lineArrowControlScale(shape, 'start', point, 'width') };
  }

  if (handle === 'arrow-width-end') {
    return { ...shape, arrowWidthScale: options.lineArrowControlScale(shape, 'end', point, 'width') };
  }

  if (handle.startsWith('anchor-')) {
    const anchorIndex = Number(handle.slice('anchor-'.length));
    if (!Number.isInteger(anchorIndex) || !shape.anchors[anchorIndex]) {
      return shape;
    }

    return {
      ...shape,
      anchors: shape.anchors.map((anchor, index) => (index === anchorIndex ? point : anchor))
    };
  }

  return shape;
};

export const resizeShape = (
  shape: CanvasShape,
  handle: ResizeHandle,
  point: Point,
  options: ResizeShapeOptions
): CanvasShape => {
  switch (shape.kind) {
    case 'rectangle':
    case 'triangle':
      return resizeRectangleShape(shape, handle, point, options);
    case 'circle':
      return resizeCircleShape(shape, handle, point);
    case 'ellipse':
      return resizeEllipseShape(shape, handle, point, options);
    case 'line':
      return resizeLineShape(shape, handle, point, options);
    case 'text':
      return resizeTextShape(shape, handle, point, options);
    case 'image':
      return resizeRectangleShape(shape, handle, point, options);
  }
};

export const resizeSelection = (
  shapes: readonly CanvasShape[],
  selectionBounds: SelectionBounds,
  handle: ResizeHandle,
  point: Point,
  lockAspectRatio: boolean
): readonly CanvasShape[] => {
  if (!isSelectionResizeHandle(handle)) {
    return shapes;
  }

  return resizeGroupedShapes(shapes, selectionBounds, handle, point, lockAspectRatio);
};
