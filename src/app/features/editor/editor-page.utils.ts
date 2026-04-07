import type { CanvasShape } from './tikz.models';
import type { SharedScenePayload } from './editor-page.i18n';

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

export const encodeSharePayload = (payload: SharedScenePayload): string =>
  btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

export const decodeSharePayload = (raw: string): SharedScenePayload | null => {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(raw)))) as SharedScenePayload;
  } catch {
    return null;
  }
};
