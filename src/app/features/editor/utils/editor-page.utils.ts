import {
  MIN_CIRCLE_RADIUS,
  MIN_IMAGE_DIMENSION,
  MIN_ELLIPSE_RADIUS,
  MIN_SCALE_FACTOR,
  MIN_SHAPE_DIMENSION,
  MIN_TEXT_BOX_WIDTH,
  MIN_TEXT_FONT_SIZE
} from '../constants/editor.constants';
import type { SharedScenePayload } from '../i18n/editor-page.i18n';
import type { CanvasShape, Point } from '../models/tikz.models';
import { sceneToTikz } from '../tikz/tikz.codegen';
import { REGEX } from '../../../shared/regex/regex.utils';

export interface SelectionBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export type SelectionResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface TransformCanvasShapeOptions {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly originX: number;
  readonly originY: number;
  readonly id?: string;
}

export const viewportCenterAfterHorizontalResize = (viewportCenter: Point, previousWidth: number, nextWidth: number, scale: number): Point => ({
  x: viewportCenter.x + (nextWidth - previousWidth) / (2 * scale),
  y: viewportCenter.y
});

export const shouldAutoCollapseInspector = (enabled: boolean, selectionCount: number): boolean => enabled && selectionCount === 0;

const transformRoundedBoxShape = (
  shape: Extract<CanvasShape, { cornerRadius: number; height: number; width: number; x: number; y: number }>,
  options: Required<TransformCanvasShapeOptions>
): CanvasShape => ({
  ...shape,
  id: options.id,
  x: (shape.x - options.originX) * options.scaleX + options.originX + options.deltaX,
  y: (shape.y - options.originY) * options.scaleY + options.originY + options.deltaY,
  width: Math.max(shape.width * options.scaleX, MIN_SHAPE_DIMENSION),
  height: Math.max(shape.height * options.scaleY, MIN_SHAPE_DIMENSION),
  cornerRadius: Math.max(shape.cornerRadius * Math.min(options.scaleX, options.scaleY), 0)
});

export const transformCanvasShape = (shape: CanvasShape, options: TransformCanvasShapeOptions): CanvasShape => {
  const normalizedOptions: Required<TransformCanvasShapeOptions> = {
    ...options,
    id: options.id ?? shape.id
  };
  const scalePoint = (point: Point): Point => ({
    x: (point.x - normalizedOptions.originX) * normalizedOptions.scaleX + normalizedOptions.originX + normalizedOptions.deltaX,
    y: (point.y - normalizedOptions.originY) * normalizedOptions.scaleY + normalizedOptions.originY + normalizedOptions.deltaY
  });

  switch (shape.kind) {
    case 'line':
      return {
        ...shape,
        id: normalizedOptions.id,
        from: scalePoint(shape.from),
        to: scalePoint(shape.to),
        anchors: shape.anchors.map((anchor) => scalePoint(anchor))
      };
    case 'rectangle':
    case 'triangle':
      return transformRoundedBoxShape(shape, normalizedOptions);
    case 'circle':
      return {
        ...shape,
        id: normalizedOptions.id,
        cx: (shape.cx - normalizedOptions.originX) * normalizedOptions.scaleX + normalizedOptions.originX + normalizedOptions.deltaX,
        cy: (shape.cy - normalizedOptions.originY) * normalizedOptions.scaleY + normalizedOptions.originY + normalizedOptions.deltaY,
        r: Math.max(shape.r * Math.max(Math.min(normalizedOptions.scaleX, normalizedOptions.scaleY), MIN_SHAPE_DIMENSION), MIN_CIRCLE_RADIUS)
      };
    case 'ellipse':
      return {
        ...shape,
        id: normalizedOptions.id,
        cx: (shape.cx - normalizedOptions.originX) * normalizedOptions.scaleX + normalizedOptions.originX + normalizedOptions.deltaX,
        cy: (shape.cy - normalizedOptions.originY) * normalizedOptions.scaleY + normalizedOptions.originY + normalizedOptions.deltaY,
        rx: Math.max(shape.rx * normalizedOptions.scaleX, MIN_ELLIPSE_RADIUS),
        ry: Math.max(shape.ry * normalizedOptions.scaleY, MIN_ELLIPSE_RADIUS)
      };
    case 'text':
      return {
        ...shape,
        id: normalizedOptions.id,
        x: (shape.x - normalizedOptions.originX) * normalizedOptions.scaleX + normalizedOptions.originX + normalizedOptions.deltaX,
        y: (shape.y - normalizedOptions.originY) * normalizedOptions.scaleY + normalizedOptions.originY + normalizedOptions.deltaY,
        boxWidth: shape.textBox ? Math.max(shape.boxWidth * normalizedOptions.scaleX, MIN_TEXT_BOX_WIDTH) : shape.boxWidth,
        fontSize: Math.max(shape.fontSize * Math.max(normalizedOptions.scaleX, normalizedOptions.scaleY), MIN_TEXT_FONT_SIZE)
      };
    case 'image':
      return {
        ...shape,
        id: normalizedOptions.id,
        x: (shape.x - normalizedOptions.originX) * normalizedOptions.scaleX + normalizedOptions.originX + normalizedOptions.deltaX,
        y: (shape.y - normalizedOptions.originY) * normalizedOptions.scaleY + normalizedOptions.originY + normalizedOptions.deltaY,
        width: Math.max(shape.width * normalizedOptions.scaleX, MIN_IMAGE_DIMENSION),
        height: Math.max(shape.height * normalizedOptions.scaleY, MIN_IMAGE_DIMENSION)
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
    transformCanvasShape(shape, {
      deltaX,
      deltaY,
      scaleX,
      scaleY,
      originX: selectionBounds.left,
      originY: selectionBounds.bottom,
      id: shape.id
    })
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
  return Number.parseFloat(value.toFixed(2)).toString();
};

const escapeHtml = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export const highlightLatex = (source: string): string =>
  source
    .split('\n')
    .map((line) => {
      const escaped = escapeHtml(line);
      const commentIndex = escaped.indexOf('%');
      const base = commentIndex >= 0 ? escaped.slice(0, commentIndex) : escaped;
      const comment = commentIndex >= 0 ? escaped.slice(commentIndex) : '';
      const highlightedBase = base
        .replaceAll(REGEX.tikzHighlight.command, '<span class="tok-command">$1</span>')
        .replaceAll(REGEX.tikzHighlight.options, '<span class="tok-option">$1</span>')
        .replaceAll(REGEX.tikzHighlight.brackets, '<span class="tok-punctuation">$1</span>')
        .replaceAll(REGEX.tikzHighlight.color, '<span class="tok-color">$1</span>')
        .replaceAll(REGEX.tikzHighlight.number, '<span class="tok-number">$1</span>');
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
    binary += String.fromCodePoint(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll(REGEX.tikzHighlight.base64Padding, '');
};

const base64UrlToBytes = (value: string): Uint8Array => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.codePointAt(0) ?? 0);
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

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

  const compressed = await readCompressedBytes(new Blob([toArrayBuffer(encoder.encode(compactPayload))]).stream().pipeThrough(new CompressionStream('gzip')));
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

    const bytes = Uint8Array.from(atob(raw), (character) => character.codePointAt(0) ?? 0);
    return JSON.parse(decoder.decode(bytes)) as SharedScenePayload;
  } catch {
    return null;
  }
};
