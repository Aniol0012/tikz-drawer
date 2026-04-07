import type { CanvasShape } from './tikz.models';
import type { SharedScenePayload } from './editor-page.i18n';
import { sceneToTikz } from './tikz.codegen';

export const translateShapeBy = (shape: CanvasShape, deltaX: number, deltaY: number): CanvasShape => {
  switch (shape.kind) {
    case 'line':
      return {
        ...shape,
        from: { x: shape.from.x + deltaX, y: shape.from.y + deltaY },
        to: { x: shape.to.x + deltaX, y: shape.to.y + deltaY }
      };
    case 'rectangle':
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
