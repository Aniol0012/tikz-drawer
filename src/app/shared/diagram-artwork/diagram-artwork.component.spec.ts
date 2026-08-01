import { describe, expect, it } from 'vitest';
import { updatedArtworkRotation } from './diagram-artwork-rotation.utils';

describe('DiagramArtworkComponent rotation', () => {
  it('rotates vertically with the pointer while preserving horizontal drag direction', () => {
    const rotation = updatedArtworkRotation({ x: -0.08, y: 0.12 }, 10, 10);

    expect(rotation.x).toBeCloseTo(0);
    expect(rotation.y).toBeCloseTo(0.2);
  });
});
