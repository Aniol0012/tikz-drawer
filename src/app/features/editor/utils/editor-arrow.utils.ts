import { DEFAULT_EDITOR_SCALE, MIN_RENDER_STROKE_WIDTH, SHAPE_STROKE_SCALE_FACTOR } from '../constants/editor.constants';

export const renderedStrokeWidthForScale = (strokeWidth: number, scale: number): number =>
  Math.max(strokeWidth * scale * SHAPE_STROKE_SCALE_FACTOR, MIN_RENDER_STROKE_WIDTH);

export const zoomScaledArrowStrokeWidth = (strokeWidth: number, scale: number): number =>
  renderedStrokeWidthForScale(strokeWidth, DEFAULT_EDITOR_SCALE) * (scale / DEFAULT_EDITOR_SCALE);

export const arrowMarkerViewportScale = (strokeWidth: number, scale: number): number =>
  zoomScaledArrowStrokeWidth(strokeWidth, scale) / renderedStrokeWidthForScale(strokeWidth, scale);
