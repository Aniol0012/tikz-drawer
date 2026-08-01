export interface ArtworkRotation {
  readonly x: number;
  readonly y: number;
}

const ROTATION_SENSITIVITY = 0.008;
const MAX_VERTICAL_ROTATION = Math.PI * 0.42;

export const updatedArtworkRotation = (rotation: ArtworkRotation, deltaX: number, deltaY: number): ArtworkRotation => ({
  x: Math.max(-MAX_VERTICAL_ROTATION, Math.min(MAX_VERTICAL_ROTATION, rotation.x + deltaY * ROTATION_SENSITIVITY)),
  y: rotation.y + deltaX * ROTATION_SENSITIVITY
});
