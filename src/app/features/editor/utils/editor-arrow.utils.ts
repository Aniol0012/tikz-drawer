import {
  DEFAULT_ARROW_TIP_LENGTH,
  DEFAULT_ARROW_TIP_WIDTH,
  DEFAULT_EDITOR_SCALE,
  MIN_RENDER_STROKE_WIDTH,
  SHAPE_STROKE_SCALE_FACTOR
} from '../constants/editor.constants';
import type { ArrowMarkerGeometry, LineShape } from '../models/tikz.models';

export const renderedStrokeWidthForScale = (strokeWidth: number, scale: number): number =>
  Math.max(strokeWidth * scale * SHAPE_STROKE_SCALE_FACTOR, MIN_RENDER_STROKE_WIDTH);

export const zoomScaledArrowStrokeWidth = (strokeWidth: number, scale: number): number =>
  renderedStrokeWidthForScale(strokeWidth, DEFAULT_EDITOR_SCALE) * (scale / DEFAULT_EDITOR_SCALE);

export const arrowMarkerViewportScale = (strokeWidth: number, scale: number): number =>
  zoomScaledArrowStrokeWidth(strokeWidth, scale) / renderedStrokeWidthForScale(strokeWidth, scale);

export const arrowTipLength = (shape: LineShape): number => DEFAULT_ARROW_TIP_LENGTH * shape.arrowLengthScale;

export const arrowTipWidth = (shape: LineShape): number => DEFAULT_ARROW_TIP_WIDTH * shape.arrowWidthScale;

export const arrowRenderedLength = (shape: LineShape, scale: number): number =>
  arrowTipLength(shape) * zoomScaledArrowStrokeWidth(shape.strokeWidth, scale) * shape.arrowScale;

export const arrowRenderedHalfWidth = (shape: LineShape, scale: number): number =>
  (arrowTipWidth(shape) / 2) * zoomScaledArrowStrokeWidth(shape.strokeWidth, scale) * shape.arrowScale;

export const arrowMarkerFill = (shape: LineShape): string =>
  shape.arrowOpen ||
  shape.arrowType === 'latex' ||
  shape.arrowType === 'diamond' ||
  shape.arrowType === 'bar' ||
  shape.arrowType === 'hooks' ||
  shape.arrowType === 'bracket' ||
  shape.arrowType === 'parenthesis' ||
  shape.arrowType === 'straight-barb'
    ? 'none'
    : shape.arrowColor;

export const arrowMarkerGeometry = (shape: LineShape): ArrowMarkerGeometry => {
  const length = arrowTipLength(shape);
  const width = arrowTipWidth(shape);
  const halfWidth = width / 2;
  const padding = shape.arrowType === 'latex' ? 1.6 : 1.25;
  const bendsTip = shape.lineMode === 'curved' && shape.arrowBendMode !== 'none';
  const bendOffset =
    shape.arrowBendMode === 'flex'
      ? halfWidth * 0.32
      : shape.arrowBendMode === 'flex-prime'
        ? -halfWidth * 0.32
        : shape.arrowBendMode === 'bend'
          ? halfWidth * 0.52
          : 0;
  const bendControlX = shape.arrowBendMode === 'bend' ? length * 0.72 : length * 0.46;
  const curvedOpenTipPath = `M0,0 Q${bendControlX},${Math.max(0.1, halfWidth * 0.18 + bendOffset)} ${length},${halfWidth} Q${bendControlX},${Math.max(0.9, width - halfWidth * 0.18 + bendOffset)} 0,${width}`;
  const curvedFilledTipPath = `${curvedOpenTipPath} z`;
  let refX = length;
  let path = '';

  switch (shape.arrowType) {
    case 'triangle':
      path = bendsTip ? curvedFilledTipPath : `M0,0 L0,${width} L${length},${halfWidth} z`;
      break;
    case 'latex':
      path = bendsTip ? curvedOpenTipPath : `M0.2,0.1 L${length},${halfWidth} L0.2,${Math.max(width - 0.1, 0.9)}`;
      break;
    case 'stealth':
      path = `M0.45,${halfWidth} C${length * 0.34},${Math.max(halfWidth * 0.18 + bendOffset, 0.5)} ${length * 0.68},0.1 ${length},${halfWidth} C${length * 0.68},${Math.max(width - 0.1, 0.9)} ${length * 0.34},${Math.max(width - halfWidth * 0.18 + bendOffset, 0.9)} 0.45,${halfWidth} z`;
      break;
    case 'diamond':
      path = `M0,0 L0,${width} L${length},${halfWidth} z`;
      break;
    case 'circle':
      {
        const radius = Math.max(Math.min(length, width) * 0.32, 1.2);
        const centerX = Math.max(length - radius - 0.8, radius + 0.8);
        refX = centerX + radius;
        path = `M${centerX},${halfWidth - radius} A${radius},${radius} 0 1 1 ${centerX},${halfWidth + radius} A${radius},${radius} 0 1 1 ${centerX},${halfWidth - radius} z`;
      }
      break;
    case 'bar':
      path = `M${length},0 L${length},${width}`;
      break;
    case 'hooks':
      path = `M${length},0.6 C${length * 0.62},0.6 ${length * 0.62},${Math.max(width - 0.6, 0.8)} ${length},${Math.max(width - 0.6, 0.8)} M${length * 0.55},0.6 C${Math.max(length * 0.18, 0.8)},0.6 ${Math.max(length * 0.18, 0.8)},${Math.max(width - 0.6, 0.8)} ${length * 0.55},${Math.max(width - 0.6, 0.8)}`;
      break;
    case 'bracket':
      path = `M${length},0 L${length * 0.5},0 L${length * 0.5},${width} L${length},${width}`;
      break;
    case 'kite':
      path = `M0,${halfWidth} L${length * 0.62},0 L${length},${halfWidth} L${length * 0.62},${width} z`;
      break;
    case 'square':
      {
        const side = Math.min(length, width);
        const left = Math.max(length - side, 0);
        path = `M${left},${halfWidth - side / 2} L${length},${halfWidth - side / 2} L${length},${halfWidth + side / 2} L${left},${halfWidth + side / 2} z`;
      }
      break;
    case 'parenthesis':
      path = `M${length},0 C${length * 0.55},${width * 0.18} ${length * 0.55},${width * 0.82} ${length},${width}`;
      break;
    case 'straight-barb':
      path = bendsTip ? curvedOpenTipPath : `M0,0 L${length},${halfWidth} L0,${width}`;
      break;
  }

  return {
    markerWidth: (length + padding * 2) * shape.arrowScale,
    markerHeight: (width + padding * 2) * shape.arrowScale,
    viewBox: `${-padding} ${-padding} ${length + padding * 2} ${width + padding * 2}`,
    refX,
    refY: halfWidth,
    path
  };
};
