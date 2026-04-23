import {
  MIN_CIRCLE_RADIUS,
  MIN_IMAGE_DIMENSION,
  MIN_ELLIPSE_RADIUS,
  MIN_SCALE_FACTOR,
  MIN_SHAPE_DIMENSION,
  MIN_TEXT_BOX_WIDTH,
  MIN_TEXT_FONT_SIZE,
  MIN_TEXT_SCALE_FACTOR
} from '../constants/editor.constants';
import type { SharedScenePayload } from '../i18n/editor-page.i18n';
import type { CanvasShape, Point } from '../models/tikz.models';
import { sceneToTikz } from '../tikz/tikz.codegen';

export interface SelectionBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export type SelectionResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const transformCanvasShape = (
  shape: CanvasShape,
  deltaX: number,
  deltaY: number,
  scaleX: number,
  scaleY: number,
  originX: number,
  originY: number,
  id: string = shape.id
): CanvasShape => {
  const scalePoint = (point: Point): Point => ({
    x: (point.x - originX) * scaleX + originX + deltaX,
    y: (point.y - originY) * scaleY + originY + deltaY
  });

  switch (shape.kind) {
    case 'line':
      return {
        ...shape,
        id,
        from: scalePoint(shape.from),
        to: scalePoint(shape.to),
        anchors: shape.anchors.map((anchor) => scalePoint(anchor))
      };
    case 'rectangle':
      return {
        ...shape,
        id,
        x: (shape.x - originX) * scaleX + originX + deltaX,
        y: (shape.y - originY) * scaleY + originY + deltaY,
        width: Math.max(shape.width * scaleX, MIN_SHAPE_DIMENSION),
        height: Math.max(shape.height * scaleY, MIN_SHAPE_DIMENSION),
        cornerRadius: Math.max(shape.cornerRadius * Math.min(scaleX, scaleY), 0)
      };
    case 'triangle':
      return {
        ...shape,
        id,
        x: (shape.x - originX) * scaleX + originX + deltaX,
        y: (shape.y - originY) * scaleY + originY + deltaY,
        width: Math.max(shape.width * scaleX, MIN_SHAPE_DIMENSION),
        height: Math.max(shape.height * scaleY, MIN_SHAPE_DIMENSION)
      };
    case 'circle':
      return {
        ...shape,
        id,
        cx: (shape.cx - originX) * scaleX + originX + deltaX,
        cy: (shape.cy - originY) * scaleY + originY + deltaY,
        r: Math.max(shape.r * Math.max(Math.min(scaleX, scaleY), MIN_SHAPE_DIMENSION), MIN_CIRCLE_RADIUS)
      };
    case 'ellipse':
      return {
        ...shape,
        id,
        cx: (shape.cx - originX) * scaleX + originX + deltaX,
        cy: (shape.cy - originY) * scaleY + originY + deltaY,
        rx: Math.max(shape.rx * scaleX, MIN_ELLIPSE_RADIUS),
        ry: Math.max(shape.ry * scaleY, MIN_ELLIPSE_RADIUS)
      };
    case 'text':
      return {
        ...shape,
        id,
        x: (shape.x - originX) * scaleX + originX + deltaX,
        y: (shape.y - originY) * scaleY + originY + deltaY,
        boxWidth: shape.textBox ? Math.max(shape.boxWidth * scaleX, MIN_TEXT_BOX_WIDTH) : shape.boxWidth,
        fontSize: Math.max(
          shape.fontSize * Math.max(Math.min(scaleX, scaleY), MIN_TEXT_SCALE_FACTOR),
          MIN_TEXT_FONT_SIZE
        )
      };
    case 'image':
      return {
        ...shape,
        id,
        x: (shape.x - originX) * scaleX + originX + deltaX,
        y: (shape.y - originY) * scaleY + originY + deltaY,
        width: Math.max(shape.width * scaleX, MIN_IMAGE_DIMENSION),
        height: Math.max(shape.height * scaleY, MIN_IMAGE_DIMENSION)
      };
  }
};

const resizeSelectionBounds = (
  selectionBounds: SelectionBounds,
  handle: SelectionResizeHandle,
  point: Point,
  minimumWidth: number,
  minimumHeight: number,
  aspectRatio?: number
): SelectionBounds => {
  let left = selectionBounds.left;
  let right = selectionBounds.right;
  let top = selectionBounds.top;
  let bottom = selectionBounds.bottom;

  if (handle.includes('w')) {
    left = Math.min(point.x, right - minimumWidth);
  }
  if (handle.includes('e')) {
    right = Math.max(point.x, left + minimumWidth);
  }
  if (handle.includes('n')) {
    top = Math.max(point.y, bottom + minimumHeight);
  }
  if (handle.includes('s')) {
    bottom = Math.min(point.y, top - minimumHeight);
  }

  if (aspectRatio) {
    const currentWidth = Math.max(right - left, minimumWidth);
    const currentHeight = Math.max(top - bottom, minimumHeight);
    const nextHeight = currentWidth / aspectRatio;
    const nextWidth = currentHeight * aspectRatio;

    if (handle === 'n' || handle === 's') {
      const adjustedWidth = Math.max(nextWidth, minimumWidth);
      const centerX = (left + right) / 2;
      left = centerX - adjustedWidth / 2;
      right = centerX + adjustedWidth / 2;
    } else {
      const adjustedHeight = Math.max(nextHeight, minimumHeight);
      if (handle.includes('n')) {
        top = bottom + adjustedHeight;
      } else {
        bottom = top - adjustedHeight;
      }
    }
  }

  return { left, right, top, bottom };
};

export const resizeGroupedShapes = (
  shapes: readonly CanvasShape[],
  selectionBounds: SelectionBounds,
  handle: SelectionResizeHandle,
  point: Point,
  lockAspectRatio: boolean = false
): readonly CanvasShape[] => {
  const width = Math.max(selectionBounds.right - selectionBounds.left, MIN_SHAPE_DIMENSION);
  const height = Math.max(selectionBounds.top - selectionBounds.bottom, MIN_SHAPE_DIMENSION);
  const resizedBounds = resizeSelectionBounds(
    selectionBounds,
    handle,
    point,
    MIN_SHAPE_DIMENSION,
    MIN_SHAPE_DIMENSION,
    lockAspectRatio ? width / height : undefined
  );
  const scaleX = Math.max((resizedBounds.right - resizedBounds.left) / width, MIN_SCALE_FACTOR);
  const scaleY = Math.max((resizedBounds.top - resizedBounds.bottom) / height, MIN_SCALE_FACTOR);
  const deltaX = resizedBounds.left - selectionBounds.left;
  const deltaY = resizedBounds.bottom - selectionBounds.bottom;

  return shapes.map((shape) =>
    transformCanvasShape(shape, deltaX, deltaY, scaleX, scaleY, selectionBounds.left, selectionBounds.bottom, shape.id)
  );
};

export const translateShapeBy = (shape: CanvasShape, deltaX: number, deltaY: number): CanvasShape => {
  switch (shape.kind) {
    case 'line':
      return {
        ...shape,
        from: { x: shape.from.x + deltaX, y: shape.from.y + deltaY },
        to: { x: shape.to.x + deltaX, y: shape.to.y + deltaY },
        anchors: shape.anchors.map((anchor) => ({ x: anchor.x + deltaX, y: anchor.y + deltaY }))
      };
    case 'rectangle':
      return { ...shape, x: shape.x + deltaX, y: shape.y + deltaY };
    case 'triangle':
      return { ...shape, x: shape.x + deltaX, y: shape.y + deltaY };
    case 'circle':
      return { ...shape, cx: shape.cx + deltaX, cy: shape.cy + deltaY };
    case 'ellipse':
      return { ...shape, cx: shape.cx + deltaX, cy: shape.cy + deltaY };
    case 'text':
      return { ...shape, x: shape.x + deltaX, y: shape.y + deltaY };
    case 'image':
      return { ...shape, x: shape.x + deltaX, y: shape.y + deltaY };
  }
};

export const formatValue = (value: number): string => {
  const rounded = Number.parseFloat(value.toFixed(2));
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toString();
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const highlightLatex = (source: string): string =>
  source
    .split('\n')
    .map((line) => {
      const escaped = escapeHtml(line);
      const commentIndex = escaped.indexOf('%');
      const base = commentIndex >= 0 ? escaped.slice(0, commentIndex) : escaped;
      const comment = commentIndex >= 0 ? escaped.slice(commentIndex) : '';
      const highlightedBase = base
        .replace(/(\\[a-zA-Z@]+)/g, '<span class="tok-command">$1</span>')
        .replace(/(\[[^\]]*\])/g, '<span class="tok-option">$1</span>')
        .replace(/(\{|\}|\(|\)|\[|\])/g, '<span class="tok-punctuation">$1</span>')
        .replace(/(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}))/g, '<span class="tok-color">$1</span>')
        .replace(/(-?\d+(?:\.\d+)?)/g, '<span class="tok-number">$1</span>');
      const highlightedComment = comment ? `<span class="tok-comment">${comment}</span>` : '';
      return `${highlightedBase}${highlightedComment}`;
    })
    .join('<br />');

interface CompactSharedScenePayloadV1 {
  readonly v: 1;
  readonly s: SharedScenePayload['scene'];
  readonly p: SharedScenePayload['preferences'];
  readonly c: SharedScenePayload['viewportCenter'];
  readonly l?: SharedScenePayload['latexExportConfig'];
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
};

const base64UrlToBytes = (value: string): Uint8Array => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

const readCompressedBytes = async (stream: ReadableStream<Uint8Array>): Promise<Uint8Array> => {
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
};

const compactSharePayload = (payload: SharedScenePayload): CompactSharedScenePayloadV1 => ({
  v: 1,
  s: {
    ...payload.scene,
    shapes: payload.scene.shapes.filter((shape) => shape.kind !== 'image')
  },
  p: payload.preferences,
  c: payload.viewportCenter,
  ...(payload.latexExportConfig ? { l: payload.latexExportConfig } : {})
});

const expandSharePayload = (payload: CompactSharedScenePayloadV1): SharedScenePayload => ({
  scene: payload.s,
  preferences: payload.p,
  importCode: sceneToTikz(payload.s),
  viewportCenter: payload.c,
  ...(payload.l ? { latexExportConfig: payload.l } : {})
});

export const encodeSharePayload = async (payload: SharedScenePayload): Promise<string> => {
  const compact = compactSharePayload(payload);
  const compactPayload = JSON.stringify(compact);

  if (typeof CompressionStream === 'undefined') {
    return `b:${bytesToBase64Url(encoder.encode(compactPayload))}`;
  }

  const compressed = await readCompressedBytes(
    new Blob([toArrayBuffer(encoder.encode(compactPayload))]).stream().pipeThrough(new CompressionStream('gzip'))
  );
  return `gz:${bytesToBase64Url(compressed)}`;
};

export const decodeSharePayload = async (raw: string): Promise<SharedScenePayload | null> => {
  try {
    if (raw.startsWith('gz:')) {
      if (typeof DecompressionStream === 'undefined') {
        return null;
      }

      const decompressed = await readCompressedBytes(
        new Blob([toArrayBuffer(base64UrlToBytes(raw.slice(3)))]).stream().pipeThrough(new DecompressionStream('gzip'))
      );
      const parsed = JSON.parse(decoder.decode(decompressed)) as CompactSharedScenePayloadV1;
      return parsed?.v === 1 ? expandSharePayload(parsed) : null;
    }

    if (raw.startsWith('b:')) {
      const parsed = JSON.parse(decoder.decode(base64UrlToBytes(raw.slice(2)))) as CompactSharedScenePayloadV1;
      return parsed?.v === 1 ? expandSharePayload(parsed) : null;
    }

    return JSON.parse(decodeURIComponent(escape(atob(raw)))) as SharedScenePayload;
  } catch {
    return null;
  }
};
