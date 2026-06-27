import { describe, expect, it } from 'vitest';
import { expandObjectSnapBounds, objectResizeSnapResult, objectSnapResult, type ObjectSnapBounds } from './editor-object-snap.utils';

const snapBounds = (id: string, left: number, bottom: number, right: number, top: number): ObjectSnapBounds => ({
  id,
  bounds: { left, bottom, right, top }
});

describe('objectSnapResult', () => {
  it('expands snap bounds by visual stroke padding', () => {
    expect(expandObjectSnapBounds({ left: 1, bottom: 2, right: 3, top: 4 }, 0.25)).toEqual({
      left: 0.75,
      bottom: 1.75,
      right: 3.25,
      top: 4.25
    });
  });

  it('snaps a moving edge to the nearest target edge', () => {
    const result = objectSnapResult([snapBounds('moving', 0, 0, 2, 2)], [snapBounds('target', 2.2, 3, 4.2, 5)], 0.25);

    expect(result.offset.x).toBeCloseTo(0.2);
    expect(result.offset.y).toBe(0);
    expect(result.guides).toEqual([{ axis: 'x', position: 2.2, start: 0, end: 5 }]);
  });

  it('snaps centers independently from edges', () => {
    const result = objectSnapResult([snapBounds('moving', 0, 1.9, 2, 3.9)], [snapBounds('target', 6, 0, 8, 2)], 0.15);

    expect(result.offset.x).toBe(0);
    expect(result.offset.y).toBeCloseTo(0.1);
    expect(result.guides).toEqual([{ axis: 'y', position: 2, start: 0, end: 8 }]);
  });

  it('does not snap beyond the tolerance', () => {
    const result = objectSnapResult([snapBounds('moving', 0, 0, 2, 2)], [snapBounds('target', 2.4, 4, 4.4, 6)], 0.25);

    expect(result.offset).toEqual({ x: 0, y: 0 });
    expect(result.guides).toEqual([]);
  });

  it('snaps only the active resize edge', () => {
    const result = objectResizeSnapResult([snapBounds('resizing', 0, 0, 2.15, 2)], [snapBounds('target', 2.25, 4, 4.25, 6)], { x: 'max' }, 0.2);

    expect(result.offset.x).toBeCloseTo(0.1);
    expect(result.offset.y).toBe(0);
    expect(result.guides).toEqual([{ axis: 'x', position: 2.25, start: 0, end: 6 }]);
  });

  it('does not resize-snap inactive edges even when they are closer', () => {
    const result = objectResizeSnapResult([snapBounds('resizing', 2.05, 0, 5, 2)], [snapBounds('target', 2, 4, 7, 6)], { x: 'max' }, 0.1);

    expect(result.offset).toEqual({ x: 0, y: 0 });
    expect(result.guides).toEqual([]);
  });
});
