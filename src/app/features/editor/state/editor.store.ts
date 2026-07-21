import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import {
  DEFAULT_EDITOR_SCALE,
  DEFAULT_TEXT_BOX_WIDTH,
  EDITOR_HISTORY_LIMIT,
  EDITOR_SCALE_MAX,
  EDITOR_SCALE_MIN,
  EDITOR_STORAGE_KEYS
} from '../constants/editor.constants';
import { defaultPreferences, defaultScene, objectPresets, scenePresets } from '../presets/presets';
import { normalizeImageDirectoryPath } from '../utils/editor-image-path.utils';
import { sceneToTikz } from '../tikz/tikz.codegen';
import { parseTikz } from '../tikz/tikz.parser';
import type { ArrowTipKind, CanvasShape, EditorPreferences, ParsedTikzResult, PersistedEditorState, TikzScene } from '../models/tikz.models';
import { remapStructuralShapeIds } from '../utils/table.utils';
import { measureTextShape, textLeftForWidth } from '../utils/text.utils';
import { reserveNextNumberedCopyName } from '../utils/editor-shape-name.utils';
import { EditorLocalStorageService } from './editor-local-storage.service';
import { normalizeAppTheme } from './app-theme.service';
import { ARROW_TIP_OPTIONS, DEFAULT_ARROW_TIP_KIND } from '../config/arrow-tip.config';

const cloneShape = (shape: CanvasShape, unavailableNames: Set<string>): CanvasShape => {
  const name = reserveNextNumberedCopyName(shape.name, unavailableNames);
  return {
    ...structuredClone(shape),
    id: crypto.randomUUID(),
    name
  };
};

const remapLineAttachments = (shape: CanvasShape, idMap: ReadonlyMap<string, string>): CanvasShape => {
  if (shape.kind !== 'line') {
    return shape;
  }

  const fromShapeId = shape.fromAttachment?.shapeId;
  const toShapeId = shape.toAttachment?.shapeId;
  return {
    ...shape,
    fromAttachment: fromShapeId ? { shapeId: idMap.get(fromShapeId) ?? fromShapeId } : undefined,
    toAttachment: toShapeId ? { shapeId: idMap.get(toShapeId) ?? toShapeId } : undefined
  } as CanvasShape;
};

const normalizeShape = (shape: CanvasShape): CanvasShape => {
  switch (shape.kind) {
    case 'line':
      return {
        ...shape,
        anchors: shape.anchors ?? [],
        fromAttachment: shape.fromAttachment,
        toAttachment: shape.toAttachment,
        lineMode: shape.lineMode ?? 'straight',
        strokeStyle: shape.strokeStyle ?? 'solid',
        strokeOpacity: shape.strokeOpacity ?? 1,
        arrowType: shape.arrowType ?? 'latex',
        arrowColor: shape.arrowColor ?? shape.stroke,
        arrowOpacity: shape.arrowOpacity ?? shape.strokeOpacity ?? 1,
        arrowOpen: shape.arrowOpen ?? false,
        arrowRound: shape.arrowRound ?? false,
        arrowScale: shape.arrowScale ?? 1,
        arrowLengthScale: shape.arrowLengthScale ?? 1,
        arrowWidthScale: shape.arrowWidthScale ?? 1,
        arrowBendMode: shape.arrowBendMode ?? 'none'
      } as CanvasShape;
    case 'rectangle':
    case 'triangle':
    case 'circle':
    case 'ellipse':
      return {
        ...shape,
        strokeOpacity: shape.strokeOpacity ?? 1,
        fillOpacity: shape.fillOpacity ?? 1,
        strokeStyle: shape.strokeStyle ?? 'solid',
        ...(shape.kind === 'triangle' ? { apexOffset: shape.apexOffset ?? 0.5, cornerRadius: shape.cornerRadius ?? 0 } : {}),
        rotation: shape.rotation ?? 0
      } as CanvasShape;
    case 'text':
      return {
        ...shape,
        strokeOpacity: shape.strokeOpacity ?? 1,
        textBox: shape.textBox ?? false,
        boxWidth: shape.boxWidth ?? DEFAULT_TEXT_BOX_WIDTH,
        colorOpacity: shape.colorOpacity ?? 1,
        fontWeight: shape.fontWeight ?? 'normal',
        fontStyle: shape.fontStyle ?? 'normal',
        textDecoration: shape.textDecoration ?? 'none',
        textAlign: shape.textAlign ?? 'center',
        rotation: shape.rotation ?? 0
      } as CanvasShape;
    case 'image':
      return {
        ...shape,
        strokeOpacity: shape.strokeOpacity ?? 1,
        rotation: shape.rotation ?? 0
      } as CanvasShape;
  }
};

const unlockedShapeIds = (shapes: readonly CanvasShape[], shapeIds: readonly string[]): readonly string[] => {
  const lockedShapeIds = new Set(shapes.filter((shape) => shape.locked).map((shape) => shape.id));
  return shapeIds.filter((shapeId) => !lockedShapeIds.has(shapeId));
};

const normalizeScene = (scene: TikzScene): TikzScene => ({
  ...scene,
  shapes: scene.shapes.map((shape) => normalizeShape(shape))
});

const cloneScene = (scene: TikzScene): TikzScene => structuredClone(normalizeScene(scene));

const rotatePointAround = (point: { x: number; y: number }, pivot: { x: number; y: number }, rotation: number) => {
  if (!rotation) {
    return point;
  }
  const radians = (rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const deltaX = point.x - pivot.x;
  const deltaY = point.y - pivot.y;
  return {
    x: pivot.x + deltaX * cosine - deltaY * sine,
    y: pivot.y + deltaX * sine + deltaY * cosine
  };
};

const boundsFromPoints = (
  points: readonly { x: number; y: number }[]
): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } =>
  points.reduce(
    (bounds, point) => ({
      left: Math.min(bounds.left, point.x),
      right: Math.max(bounds.right, point.x),
      bottom: Math.min(bounds.bottom, point.y),
      top: Math.max(bounds.top, point.y)
    }),
    {
      left: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      bottom: Number.POSITIVE_INFINITY,
      top: Number.NEGATIVE_INFINITY
    }
  );

const rectangleBounds = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number
): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } => {
  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ] as const;
  if (!rotation) {
    return boundsFromPoints(corners);
  }
  const pivot = { x: x + width / 2, y: y + height / 2 };
  return boundsFromPoints(corners.map((corner) => rotatePointAround(corner, pivot, rotation)));
};

const ellipseBounds = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number
): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } => {
  if (!rotation) {
    return {
      left: cx - rx,
      right: cx + rx,
      bottom: cy - ry,
      top: cy + ry
    };
  }
  const radians = (rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const halfWidth = Math.sqrt(rx * rx * cosine * cosine + ry * ry * sine * sine);
  const halfHeight = Math.sqrt(rx * rx * sine * sine + ry * ry * cosine * cosine);
  return {
    left: cx - halfWidth,
    right: cx + halfWidth,
    bottom: cy - halfHeight,
    top: cy + halfHeight
  };
};

const shapeBounds = (shape: CanvasShape): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } => {
  switch (shape.kind) {
    case 'rectangle':
      return rectangleBounds(shape.x, shape.y, shape.width, shape.height, shape.rotation ?? 0);
    case 'triangle':
      return rectangleBounds(shape.x, shape.y, shape.width, shape.height, shape.rotation ?? 0);
    case 'circle':
      return ellipseBounds(shape.cx, shape.cy, shape.r, shape.r, shape.rotation ?? 0);
    case 'ellipse':
      return ellipseBounds(shape.cx, shape.cy, shape.rx, shape.ry, shape.rotation ?? 0);
    case 'line':
      return [shape.from, ...shape.anchors, shape.to].reduce(
        (bounds, point) => ({
          left: Math.min(bounds.left, point.x),
          right: Math.max(bounds.right, point.x),
          bottom: Math.min(bounds.bottom, point.y),
          top: Math.max(bounds.top, point.y)
        }),
        {
          left: Number.POSITIVE_INFINITY,
          right: Number.NEGATIVE_INFINITY,
          bottom: Number.POSITIVE_INFINITY,
          top: Number.NEGATIVE_INFINITY
        }
      );
    case 'text': {
      const metrics = measureTextShape(shape, 1, 1);
      const width = metrics.width;
      const left = textLeftForWidth(shape, shape.x, width);
      const corners = [
        { x: left, y: shape.y + metrics.bottomOffset },
        { x: left + width, y: shape.y + metrics.bottomOffset },
        { x: left + width, y: shape.y + metrics.topOffset },
        { x: left, y: shape.y + metrics.topOffset }
      ] as const;
      return boundsFromPoints(shape.rotation ? corners.map((corner) => rotatePointAround(corner, { x: shape.x, y: shape.y }, shape.rotation)) : corners);
    }
    case 'image':
      return rectangleBounds(shape.x, shape.y, shape.width, shape.height, shape.rotation ?? 0);
  }
};

const centerShapesOnPoint = (shapes: readonly CanvasShape[], point: { x: number; y: number }): readonly CanvasShape[] => {
  if (!shapes.length) {
    return shapes;
  }

  const bounds = shapes.reduce(
    (currentBounds, shape) => {
      const nextBounds = shapeBounds(shape);
      return {
        left: Math.min(currentBounds.left, nextBounds.left),
        right: Math.max(currentBounds.right, nextBounds.right),
        top: Math.max(currentBounds.top, nextBounds.top),
        bottom: Math.min(currentBounds.bottom, nextBounds.bottom)
      };
    },
    {
      left: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      top: Number.NEGATIVE_INFINITY,
      bottom: Number.POSITIVE_INFINITY
    }
  );

  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  return shapes.map((shape) => translateShape(shape, point.x - centerX, point.y - centerY));
};

interface EditorSnapshot {
  readonly scene: TikzScene;
  readonly preferences: EditorPreferences;
  readonly importCode: string;
  readonly selectedShapeIds: readonly string[];
}

const translatePositionedShape = (shape: Extract<CanvasShape, { x: number; y: number }>, deltaX: number, deltaY: number): CanvasShape => ({
  ...shape,
  x: shape.x + deltaX,
  y: shape.y + deltaY
});

const translateCenteredShape = (shape: Extract<CanvasShape, { cx: number; cy: number }>, deltaX: number, deltaY: number): CanvasShape => ({
  ...shape,
  cx: shape.cx + deltaX,
  cy: shape.cy + deltaY
});

const translateShape = (shape: CanvasShape, deltaX: number, deltaY: number): CanvasShape => {
  switch (shape.kind) {
    case 'line':
      return {
        ...shape,
        from: {
          x: shape.from.x + deltaX,
          y: shape.from.y + deltaY
        },
        to: {
          x: shape.to.x + deltaX,
          y: shape.to.y + deltaY
        },
        anchors: shape.anchors.map((anchor) => ({
          x: anchor.x + deltaX,
          y: anchor.y + deltaY
        }))
      };
    case 'rectangle':
    case 'triangle':
      return translatePositionedShape(shape, deltaX, deltaY);
    case 'circle':
    case 'ellipse':
      return translateCenteredShape(shape, deltaX, deltaY);
    case 'text':
    case 'image':
      return translatePositionedShape(shape, deltaX, deltaY);
  }
};

const applyDefaultShapeStyle = (shape: CanvasShape, preferences: EditorPreferences): CanvasShape => {
  switch (shape.kind) {
    case 'line':
      return {
        ...shape,
        stroke: shape.stroke,
        strokeOpacity: shape.strokeOpacity ?? 1,
        strokeWidth: shape.strokeWidth || preferences.defaultStrokeWidth,
        fromAttachment: shape.fromAttachment,
        toAttachment: shape.toAttachment,
        lineMode: shape.lineMode ?? 'straight',
        strokeStyle: shape.strokeStyle ?? 'solid',
        arrowColor: shape.arrowColor ?? shape.stroke,
        arrowOpacity: shape.arrowOpacity ?? shape.strokeOpacity ?? 1,
        arrowOpen: shape.arrowOpen ?? false,
        arrowRound: shape.arrowRound ?? false,
        arrowScale: shape.arrowScale ?? 1,
        arrowLengthScale: shape.arrowLengthScale ?? 1,
        arrowWidthScale: shape.arrowWidthScale ?? 1,
        arrowBendMode: shape.arrowBendMode ?? 'none'
      };
    case 'rectangle':
    case 'triangle':
    case 'circle':
    case 'ellipse':
      return {
        ...shape,
        stroke: shape.stroke,
        fill: shape.fill,
        strokeOpacity: shape.strokeOpacity ?? 1,
        fillOpacity: shape.fillOpacity ?? 1,
        strokeStyle: shape.strokeStyle ?? preferences.defaultShapeLineStrokeStyle,
        ...(shape.kind === 'triangle' ? { apexOffset: shape.apexOffset ?? 0.5, cornerRadius: shape.cornerRadius ?? 0 } : {}),
        strokeWidth: shape.strokeWidth || preferences.defaultStrokeWidth,
        rotation: shape.rotation ?? 0
      };
    case 'text':
      return {
        ...shape,
        strokeOpacity: shape.strokeOpacity ?? 1,
        colorOpacity: shape.colorOpacity ?? 1,
        fontWeight: shape.fontWeight ?? 'normal',
        fontStyle: shape.fontStyle ?? 'normal',
        textDecoration: shape.textDecoration ?? 'none',
        textAlign: shape.textAlign ?? 'center',
        rotation: shape.rotation ?? 0
      };
    case 'image':
      return {
        ...shape,
        stroke: shape.stroke,
        strokeOpacity: shape.strokeOpacity ?? 1,
        strokeWidth: shape.strokeWidth || preferences.defaultStrokeWidth,
        rotation: shape.rotation ?? 0
      };
  }
};

const normalizePreferences = (preferences: Partial<EditorPreferences> | undefined): EditorPreferences => {
  const scale = Number(preferences?.scale);
  const normalizedScale = Number.isFinite(scale) ? Math.min(EDITOR_SCALE_MAX, Math.max(EDITOR_SCALE_MIN, scale)) : DEFAULT_EDITOR_SCALE;
  const defaultArrowType = normalizeArrowTipKind(preferences?.defaultArrowType);
  const gridStep = normalizeNumber(preferences?.gridStep, defaultPreferences.gridStep, 0.25, 4);
  const objectSnapTolerance = normalizeNumber(preferences?.objectSnapTolerance, defaultPreferences.objectSnapTolerance, 2, 32);

  return {
    ...defaultPreferences,
    ...preferences,
    theme: normalizeAppTheme(preferences?.theme, defaultPreferences.theme),
    scale: normalizedScale,
    gridStep,
    objectSnapTolerance,
    defaultArrowType,
    defaultStrokeOpacity: normalizeOpacity(preferences?.defaultStrokeOpacity),
    defaultFillOpacity: normalizeOpacity(preferences?.defaultFillOpacity),
    defaultTextOpacity: normalizeOpacity(preferences?.defaultTextOpacity),
    defaultImageOpacity: normalizeOpacity(preferences?.defaultImageOpacity),
    defaultImageScalePercent: normalizeNumber(preferences?.defaultImageScalePercent, defaultPreferences.defaultImageScalePercent, 50, 150),
    defaultImageBorderWidth: normalizeNumber(preferences?.defaultImageBorderWidth, defaultPreferences.defaultImageBorderWidth, 0.02, 4),
    defaultTextWeight: preferences?.defaultTextWeight === 'bold' ? 'bold' : 'normal',
    defaultTextStyle: preferences?.defaultTextStyle === 'italic' ? 'italic' : 'normal',
    defaultTextDecoration: preferences?.defaultTextDecoration === 'underline' ? 'underline' : 'none',
    defaultTextAlign: preferences?.defaultTextAlign === 'left' || preferences?.defaultTextAlign === 'right' ? preferences.defaultTextAlign : 'center',
    defaultImagePath: normalizeImageDirectoryPath(preferences?.defaultImagePath ?? defaultPreferences.defaultImagePath),
    defaultImageBorderColor:
      typeof preferences?.defaultImageBorderColor === 'string' && preferences.defaultImageBorderColor.trim()
        ? preferences.defaultImageBorderColor
        : defaultPreferences.defaultImageBorderColor
  };
};

const normalizeNumber = (value: unknown, fallback: number, minimum: number, maximum: number): number => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
};

const normalizeArrowTipKind = (value: unknown): ArrowTipKind =>
  ARROW_TIP_OPTIONS.some((option) => option.id === value) ? (value as ArrowTipKind) : DEFAULT_ARROW_TIP_KIND;

const normalizeOpacity = (value: unknown): number => {
  const opacity = Number(value);
  return Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 1;
};

@Injectable()
export class EditorStore {
  private readonly editorStorage = inject(EditorLocalStorageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly undoSnapshots = signal<readonly EditorSnapshot[]>([]);
  private readonly redoSnapshots = signal<readonly EditorSnapshot[]>([]);
  private pendingStatePersistHandle: ReturnType<typeof setTimeout> | null = null;
  private pendingStatePersist: PersistedEditorState | null = null;

  readonly preferences = signal<EditorPreferences>(defaultPreferences);
  readonly scene = signal<TikzScene>(cloneScene(defaultScene));
  readonly selectedShapeIds = signal<readonly string[]>([]);
  readonly importCode = signal(sceneToTikz(defaultScene));
  readonly parserWarnings = signal<readonly string[]>([]);

  readonly selectedShape = computed<CanvasShape | null>(() => {
    const selectedShapeIds = this.selectedShapeIds();

    if (selectedShapeIds.length !== 1) {
      return null;
    }

    return this.scene().shapes.find((shape) => shape.id === selectedShapeIds[0]) ?? null;
  });
  readonly selectedShapes = computed<readonly CanvasShape[]>(() => {
    const selectedShapeIdSet = new Set(this.selectedShapeIds());
    return this.scene().shapes.filter((shape) => selectedShapeIdSet.has(shape.id));
  });
  readonly selectionCount = computed(() => this.selectedShapeIds().length);

  readonly exportedCode = computed(() => sceneToTikz(this.scene()));
  readonly objectPresets = objectPresets;
  readonly scenePresets = scenePresets;
  readonly objectCount = computed(() => this.scene().shapes.length);
  readonly canUndo = computed(() => this.undoSnapshots().length > 0);
  readonly canRedo = computed(() => this.redoSnapshots().length > 0);

  constructor() {
    this.restoreState();
    const flushPendingState = () => this.flushStatePersist();
    globalThis.addEventListener?.('pagehide', flushPendingState);
    globalThis.addEventListener?.('beforeunload', flushPendingState);
    this.destroyRef.onDestroy(() => {
      globalThis.removeEventListener?.('pagehide', flushPendingState);
      globalThis.removeEventListener?.('beforeunload', flushPendingState);
    });

    effect(() => {
      const state: PersistedEditorState = {
        scene: this.scene(),
        preferences: this.preferences(),
        importCode: this.importCode()
      };

      this.scheduleStatePersist(state);
    });

    this.destroyRef.onDestroy(() => this.flushStatePersist());
  }

  recordHistoryCheckpoint(): void {
    const snapshot = this.createSnapshot();
    this.undoSnapshots.update((snapshots) => [...snapshots.slice(-(EDITOR_HISTORY_LIMIT - 1)), snapshot]);
    this.redoSnapshots.set([]);
  }

  undo(): void {
    const snapshot = this.undoSnapshots().at(-1);

    if (!snapshot) {
      return;
    }

    this.undoSnapshots.update((snapshots) => snapshots.slice(0, -1));
    this.redoSnapshots.update((snapshots) => [...snapshots, this.createSnapshot()]);
    this.restoreSnapshot(snapshot);
  }

  redo(): void {
    const snapshot = this.redoSnapshots().at(-1);

    if (!snapshot) {
      return;
    }

    this.redoSnapshots.update((snapshots) => snapshots.slice(0, -1));
    this.undoSnapshots.update((snapshots) => [...snapshots, this.createSnapshot()]);
    this.restoreSnapshot(snapshot);
  }

  selectShape(shapeId: string | null): void {
    const shape = shapeId ? this.scene().shapes.find((entry) => entry.id === shapeId) : null;
    this.selectedShapeIds.set(shape && !shape.locked ? [shape.id] : []);
  }

  setSelectedShapes(shapeIds: readonly string[]): void {
    this.selectedShapeIds.set([...new Set(unlockedShapeIds(this.scene().shapes, shapeIds))]);
  }

  toggleShapeInSelection(shapeId: string): void {
    const shape = this.scene().shapes.find((entry) => entry.id === shapeId);
    if (!shape || shape.locked) {
      return;
    }

    this.selectedShapeIds.update((selectedShapeIds) =>
      selectedShapeIds.includes(shapeId) ? selectedShapeIds.filter((selectedShapeId) => selectedShapeId !== shapeId) : [...selectedShapeIds, shapeId]
    );
  }

  applyScenePreset(presetId: string): void {
    const preset = this.scenePresets.find((entry) => entry.id === presetId);

    if (!preset) {
      return;
    }

    this.setScene(preset.scene);
    this.importCode.set(sceneToTikz(preset.scene));
    this.parserWarnings.set([]);
  }

  applyScene(scene: TikzScene): void {
    this.setScene(scene);
    this.importCode.set(sceneToTikz(scene));
    this.parserWarnings.set([]);
  }

  addPreset(presetId: string): readonly CanvasShape[] {
    const preset = this.objectPresets.find((entry) => entry.id === presetId);

    if (!preset) {
      return [];
    }

    const unavailableNames = new Set(this.scene().shapes.map((shape) => shape.name));
    const shapes = preset.shapes.map((shape) => applyDefaultShapeStyle(cloneShape(shape, unavailableNames), this.preferences()));
    this.scene.update((scene) => ({
      ...scene,
      shapes: [...scene.shapes, ...shapes]
    }));
    this.selectedShapeIds.set(shapes.map((shape) => shape.id));
    return shapes;
  }

  addPresetAt(presetId: string, point: { x: number; y: number }): readonly CanvasShape[] {
    const shapes = this.addPreset(presetId);

    if (!shapes.length) {
      return [];
    }

    const movedShapes = centerShapesOnPoint(shapes, point);
    this.replaceShapes(movedShapes);
    this.selectedShapeIds.set(movedShapes.map((shape) => shape.id));
    return movedShapes;
  }

  addShapes(shapes: readonly CanvasShape[]): void {
    if (!shapes.length) {
      return;
    }

    this.scene.update((scene) => ({
      ...scene,
      shapes: [...scene.shapes, ...shapes]
    }));
    this.selectedShapeIds.set(shapes.map((shape) => shape.id));
  }

  mergeSelected(): void {
    const mergeId = crypto.randomUUID();
    const selectedShapeIdSet = new Set(this.selectedShapeIds());
    if (selectedShapeIdSet.size < 2) {
      return;
    }

    this.scene.update((scene) => ({
      ...scene,
      shapes: scene.shapes.map((shape) =>
        selectedShapeIdSet.has(shape.id)
          ? ({
              ...shape,
              mergeId
            } as CanvasShape)
          : shape
      )
    }));
  }

  removeSelected(): void {
    const selectedShapeIdSet = new Set(this.selectedShapeIds());

    if (selectedShapeIdSet.size === 0) {
      return;
    }

    this.scene.update((scene) => ({
      ...scene,
      shapes: scene.shapes.filter((shape) => !selectedShapeIdSet.has(shape.id))
    }));
    this.selectedShapeIds.set([]);
  }

  duplicateSelected(): void {
    const selectedShapes = this.selectedShapes();

    if (!selectedShapes.length) {
      return;
    }

    const idMap = new Map(selectedShapes.map((shape) => [shape.id, crypto.randomUUID()]));
    const unavailableNames = new Set(this.scene().shapes.map((shape) => shape.name));
    const duplicatedShapes = remapStructuralShapeIds(
      selectedShapes.map((shape) => {
        const name = reserveNextNumberedCopyName(shape.name, unavailableNames);
        return remapLineAttachments(
          translateShape(
            {
              ...structuredClone(shape),
              id: idMap.get(shape.id) ?? shape.id,
              name
            } as CanvasShape,
            0.6,
            -0.6
          ),
          idMap
        );
      })
    );
    this.scene.update((scene) => ({
      ...scene,
      shapes: [...scene.shapes, ...duplicatedShapes]
    }));
    this.selectedShapeIds.set(duplicatedShapes.map((shape) => shape.id));
  }

  renameScene(name: string): void {
    this.scene.update((scene) => ({
      ...scene,
      name
    }));
  }

  setTheme(theme: EditorPreferences['theme']): void {
    this.preferences.update((preferences) => ({
      ...preferences,
      theme: normalizeAppTheme(theme, preferences.theme)
    }));
  }

  patchPreferences(patch: Partial<EditorPreferences>): void {
    this.preferences.update((preferences) => normalizePreferences({ ...preferences, ...patch }));
  }

  patchSelectedShape(mutator: (shape: CanvasShape) => CanvasShape): void {
    const selectedShape = this.selectedShape();

    if (!selectedShape) {
      return;
    }

    this.scene.update((scene) => ({
      ...scene,
      shapes: scene.shapes.map((shape) => (shape.id === selectedShape.id ? mutator(shape) : shape))
    }));
  }

  patchSelectedShapes(mutator: (shape: CanvasShape) => CanvasShape): void {
    const selectedShapeIdSet = new Set(this.selectedShapeIds());

    if (selectedShapeIdSet.size === 0) {
      return;
    }

    this.scene.update((scene) => ({
      ...scene,
      shapes: scene.shapes.map((shape) => (selectedShapeIdSet.has(shape.id) ? mutator(shape) : shape))
    }));
  }

  replaceShapes(nextShapes: readonly CanvasShape[]): void {
    const nextShapeMap = new Map(nextShapes.map((shape) => [shape.id, shape]));
    if (nextShapeMap.size === 0) {
      return;
    }

    this.scene.update((scene) => ({
      ...scene,
      shapes: scene.shapes.map((shape) => nextShapeMap.get(shape.id) ?? shape)
    }));
  }

  replaceShapeSet(removedShapeIds: readonly string[], addedShapes: readonly CanvasShape[]): void {
    const removedShapeIdSet = new Set(removedShapeIds);
    if (removedShapeIdSet.size === 0) {
      return;
    }

    this.scene.update((scene) => {
      const insertionIndex = scene.shapes.findIndex((shape) => removedShapeIdSet.has(shape.id));
      const remainingShapes = scene.shapes.filter((shape) => !removedShapeIdSet.has(shape.id));
      const safeInsertionIndex = insertionIndex >= 0 ? Math.min(insertionIndex, remainingShapes.length) : remainingShapes.length;

      return {
        ...scene,
        shapes: [...remainingShapes.slice(0, safeInsertionIndex), ...addedShapes, ...remainingShapes.slice(safeInsertionIndex)]
      };
    });
    this.selectedShapeIds.set(addedShapes.map((shape) => shape.id));
  }

  moveSelectedBy(deltaX: number, deltaY: number): void {
    const selectedShapeIdSet = new Set(this.selectedShapeIds());

    if (selectedShapeIdSet.size === 0) {
      return;
    }

    this.scene.update((scene) => ({
      ...scene,
      shapes: scene.shapes.map((shape) => (selectedShapeIdSet.has(shape.id) ? translateShape(shape, deltaX, deltaY) : shape))
    }));
  }

  bringSelectedToFront(): void {
    const selectedShapeIdSet = new Set(this.selectedShapeIds());

    if (selectedShapeIdSet.size === 0) {
      return;
    }

    this.scene.update((scene) => {
      return {
        ...scene,
        shapes: [...scene.shapes.filter((shape) => !selectedShapeIdSet.has(shape.id)), ...scene.shapes.filter((shape) => selectedShapeIdSet.has(shape.id))]
      };
    });
  }

  ungroupSelected(): void {
    const selectedShapeIdSet = new Set(this.selectedShapeIds());
    if (selectedShapeIdSet.size === 0) {
      return;
    }

    const mergeIds = new Set(
      this.scene()
        .shapes.map((shape) => (selectedShapeIdSet.has(shape.id) ? shape.mergeId : undefined))
        .filter((mergeId): mergeId is string => mergeId !== undefined)
    );
    const tableIds = new Set(
      this.scene()
        .shapes.map((shape) => (selectedShapeIdSet.has(shape.id) ? shape.table?.id : undefined))
        .filter((tableId): tableId is string => tableId !== undefined)
    );

    if (mergeIds.size === 0 && tableIds.size === 0) {
      return;
    }

    this.scene.update((scene) => ({
      ...scene,
      shapes: scene.shapes.map((shape) =>
        (shape.mergeId && mergeIds.has(shape.mergeId)) || (shape.table && tableIds.has(shape.table.id))
          ? ({
              ...shape,
              mergeId: shape.mergeId && mergeIds.has(shape.mergeId) ? undefined : shape.mergeId,
              table: shape.table && tableIds.has(shape.table.id) ? undefined : shape.table
            } as CanvasShape)
          : shape
      )
    }));
    this.selectedShapeIds.set([]);
  }

  sendSelectedToBack(): void {
    const selectedShapeIdSet = new Set(this.selectedShapeIds());

    if (selectedShapeIdSet.size === 0) {
      return;
    }

    this.scene.update((scene) => {
      return {
        ...scene,
        shapes: [...scene.shapes.filter((shape) => selectedShapeIdSet.has(shape.id)), ...scene.shapes.filter((shape) => !selectedShapeIdSet.has(shape.id))]
      };
    });
  }

  updateImportCode(value: string): void {
    this.importCode.set(value);
  }

  applyImportCode(): ParsedTikzResult {
    const source = this.importCode();
    const parsed = parseTikz(source);
    this.appendImportedScene(parsed.scene);
    this.importCode.set(source);
    this.parserWarnings.set(parsed.warnings);
    return parsed;
  }

  applyImportedScene(scene: TikzScene, importCode: string, warnings: readonly string[], replaceScene = false, preserveImportCode = false): void {
    if (replaceScene) {
      this.setScene(scene);
    } else {
      this.appendImportedScene(scene);
    }
    this.importCode.set(preserveImportCode ? importCode : importCode || sceneToTikz(scene));
    this.parserWarnings.set(warnings);
  }

  useExportedCodeAsImport(): void {
    this.importCode.set(this.exportedCode());
  }

  restoreSharedState(state: PersistedEditorState): void {
    this.scene.set(cloneScene(state.scene));
    this.preferences.set(normalizePreferences(structuredClone(state.preferences)));
    this.importCode.set(typeof state.importCode === 'string' ? state.importCode : sceneToTikz(state.scene));
    this.parserWarnings.set([]);
    this.selectedShapeIds.set([]);
    this.undoSnapshots.set([]);
    this.redoSnapshots.set([]);
  }

  restoreSyncedDocument(scene: TikzScene, importCode: string | undefined): void {
    const nextScene = cloneScene(scene);
    const nextShapeIds = new Set(nextScene.shapes.map((shape) => shape.id));
    this.scene.set(nextScene);
    this.importCode.set(typeof importCode === 'string' ? importCode : sceneToTikz(nextScene));
    this.parserWarnings.set([]);
    this.selectedShapeIds.update((shapeIds) =>
      unlockedShapeIds(
        nextScene.shapes,
        shapeIds.filter((shapeId) => nextShapeIds.has(shapeId))
      )
    );
  }

  private restoreState(): void {
    const parsed = this.editorStorage.getJson<Partial<PersistedEditorState>>(EDITOR_STORAGE_KEYS.state);

    if (!parsed) {
      return;
    }

    try {
      if (parsed.preferences) {
        this.preferences.set(normalizePreferences(parsed.preferences));
      }

      if (parsed.scene) {
        this.scene.set(normalizeScene(parsed.scene));
      }

      if (typeof parsed.importCode === 'string') {
        this.importCode.set(parsed.importCode);
      }
    } catch {
      this.scene.set(cloneScene(defaultScene));
      this.preferences.set(defaultPreferences);
      this.importCode.set(sceneToTikz(defaultScene));
    }
  }

  private scheduleStatePersist(state: PersistedEditorState): void {
    this.pendingStatePersist = state;
    if (this.pendingStatePersistHandle !== null) {
      return;
    }

    this.pendingStatePersistHandle = setTimeout(() => this.flushStatePersist(), 160);
  }

  private flushStatePersist(): void {
    if (this.pendingStatePersistHandle !== null) {
      clearTimeout(this.pendingStatePersistHandle);
      this.pendingStatePersistHandle = null;
    }

    const state = this.pendingStatePersist;
    if (!state) {
      return;
    }

    this.pendingStatePersist = null;
    this.editorStorage.setJson(EDITOR_STORAGE_KEYS.state, state);
  }

  private createSnapshot(): EditorSnapshot {
    return {
      scene: cloneScene(this.scene()),
      preferences: structuredClone(this.preferences()),
      importCode: this.importCode(),
      selectedShapeIds: structuredClone(this.selectedShapeIds())
    };
  }

  private restoreSnapshot(snapshot: EditorSnapshot): void {
    this.scene.set(cloneScene(snapshot.scene));
    this.preferences.set(structuredClone(snapshot.preferences));
    this.importCode.set(snapshot.importCode);
    this.selectedShapeIds.set(snapshot.selectedShapeIds);
  }

  private appendImportedScene(scene: TikzScene): void {
    const normalizedScene = normalizeScene(scene);
    const importedScene = cloneScene(normalizedScene);
    if (!importedScene.shapes.length) {
      return;
    }

    this.scene.update((currentScene) => ({
      ...currentScene,
      shapes: [...currentScene.shapes, ...importedScene.shapes]
    }));
  }

  private setScene(scene: TikzScene): void {
    const normalizedScene = normalizeScene(scene);
    this.scene.set(cloneScene(normalizedScene));
    const firstEditableShape = normalizedScene.shapes.find((shape) => !shape.locked);
    this.selectedShapeIds.set(firstEditableShape ? [firstEditableShape.id] : []);
  }
}
