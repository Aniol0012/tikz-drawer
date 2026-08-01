import { describe, expect, it } from 'vitest';
import { boundedArtworkPointerPosition, updatedArtworkRotation } from './diagram-artwork-rotation.utils';

describe('DiagramArtworkComponent rotation', () => {
  it('rotates vertically with the pointer while preserving horizontal drag direction', () => {
    const rotation = updatedArtworkRotation({ x: -0.08, y: 0.12 }, 10, 10);

    expect(rotation.x).toBeCloseTo(0);
    expect(rotation.y).toBeCloseTo(0.2);
  });

  it('keeps the pointer highlight fully inside the viewport when the pointer leaves the screen', () => {
    const position = boundedArtworkPointerPosition(900, -100, 320, 220, 38);

    expect(position.xPercent).toBeCloseTo(88.125);
    expect(position.yPercent).toBeCloseTo(17.273);
  });
});
