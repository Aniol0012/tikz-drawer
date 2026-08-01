export interface ArtworkRotation {
  readonly x: number;
  readonly y: number;
}

export interface ArtworkPointerPosition {
  readonly xPercent: number;
  readonly yPercent: number;
}

const ROTATION_SENSITIVITY = 0.008;
const MAX_VERTICAL_ROTATION = Math.PI * 0.42;

export const updatedArtworkRotation = (rotation: ArtworkRotation, deltaX: number, deltaY: number): ArtworkRotation => ({
  x: Math.max(-MAX_VERTICAL_ROTATION, Math.min(MAX_VERTICAL_ROTATION, rotation.x + deltaY * ROTATION_SENSITIVITY)),
  y: rotation.y + deltaX * ROTATION_SENSITIVITY
});

export const boundedArtworkPointerPosition = (
  pointerX: number,
  pointerY: number,
  width: number,
  height: number,
  highlightRadius: number
): ArtworkPointerPosition => {
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const insetX = Math.min(Math.max(highlightRadius, 0), safeWidth / 2);
  const insetY = Math.min(Math.max(highlightRadius, 0), safeHeight / 2);
  const x = Math.min(safeWidth - insetX, Math.max(insetX, pointerX));
  const y = Math.min(safeHeight - insetY, Math.max(insetY, pointerY));

  return {
    xPercent: (x / safeWidth) * 100,
    yPercent: (y / safeHeight) * 100
  };
};
