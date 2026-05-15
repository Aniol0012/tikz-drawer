import { describe, expect, it } from 'vitest';
import { DEFAULT_EDITOR_SCALE } from '../constants/editor.constants';
import { arrowMarkerViewportScale, renderedStrokeWidthForScale, zoomScaledArrowStrokeWidth } from './editor-arrow.utils';

describe('editor arrow rendering helpers', () => {
  it('keeps line strokes clamped for visibility', () => {
    expect(renderedStrokeWidthForScale(0.18, DEFAULT_EDITOR_SCALE / 2)).toBe(1);
    expect(renderedStrokeWidthForScale(0.18, DEFAULT_EDITOR_SCALE)).toBe(1);
  });

  it('scales arrow tips with zoom instead of the clamped stroke width', () => {
    expect(zoomScaledArrowStrokeWidth(0.18, DEFAULT_EDITOR_SCALE / 2)).toBe(0.5);
    expect(zoomScaledArrowStrokeWidth(0.18, DEFAULT_EDITOR_SCALE)).toBe(1);
    expect(zoomScaledArrowStrokeWidth(0.18, DEFAULT_EDITOR_SCALE * 2)).toBe(2);
  });

  it('returns a marker viewport factor that counteracts stroke-width marker units', () => {
    expect(arrowMarkerViewportScale(0.18, DEFAULT_EDITOR_SCALE / 2)).toBe(0.5);
    expect(arrowMarkerViewportScale(0.18, DEFAULT_EDITOR_SCALE)).toBe(1);
    expect(arrowMarkerViewportScale(0.18, DEFAULT_EDITOR_SCALE * 2)).toBe(2);
  });
});
