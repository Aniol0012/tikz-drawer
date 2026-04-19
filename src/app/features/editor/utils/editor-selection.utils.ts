import type { CanvasShape } from '../models/tikz.models';

export const selectionContainsShape = (selectedShapes: readonly CanvasShape[], shapeId: string): boolean =>
  selectedShapes.some((shape) => shape.id === shapeId);

export const shapeSetIds = (shape: CanvasShape, sceneShapes: readonly CanvasShape[]): readonly string[] => {
  const mergeGroupIds = shape.mergeId
    ? sceneShapes.filter((entry) => entry.mergeId === shape.mergeId).map((entry) => entry.id)
    : [];
  const tableGroupIds = shape.table
    ? sceneShapes.filter((entry) => entry.table?.id === shape.table?.id).map((entry) => entry.id)
    : [];

  if (
    mergeGroupIds.length > 1 &&
    (!tableGroupIds.length ||
      mergeGroupIds.length !== tableGroupIds.length ||
      mergeGroupIds.some((id) => !tableGroupIds.includes(id)))
  ) {
    return mergeGroupIds;
  }

  if (tableGroupIds.length > 1) {
    return tableGroupIds;
  }

  if (mergeGroupIds.length > 1) {
    return mergeGroupIds;
  }

  return [shape.id];
};

export const toggledShapeSetSelection = (
  selectedShapeIds: readonly string[],
  groupedShapeIds: readonly string[]
): readonly string[] => {
  const selectedIds = new Set(selectedShapeIds);
  const alreadySelected = groupedShapeIds.every((id) => selectedIds.has(id));
  return alreadySelected
    ? [...selectedIds].filter((id) => !groupedShapeIds.includes(id))
    : Array.from(new Set([...selectedIds, ...groupedShapeIds]));
};
