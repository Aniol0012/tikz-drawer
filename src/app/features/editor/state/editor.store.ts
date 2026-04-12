import { computed, effect, Injectable, signal } from '@angular/core';
import { DEFAULT_TEXT_BOX_WIDTH, EDITOR_HISTORY_LIMIT, EDITOR_STORAGE_KEYS } from '../constants/editor.constants';
import { defaultPreferences, defaultScene, objectPresets, scenePresets } from '../presets/presets';
import { sceneToTikz } from '../tikz/tikz.codegen';
import { parseTikz } from '../tikz/tikz.parser';
import type {
  CanvasShape,
  EditorPreferences,
  ParsedTikzResult,
  PersistedEditorState,
  TikzScene
} from '../models/tikz.models';
import { remapStructuralShapeIds } from '../utils/table.utils';
import { displayTextLinesForShape, estimateTextHeight, estimateTextWidth, textLeftForWidth } from '../utils/text.utils';

const cloneShape = (shape: CanvasShape): CanvasShape => ({
  ...structuredClone(shape),
  id: crypto.randomUUID(),
  name: `${shape.name} copy`
});

const normalizeShape = (shape: CanvasShape): CanvasShape => {
  switch (shape.kind) {
    case 'line':
      return {
        ...shape,
        anchors: shape.anchors ?? [],
        lineMode: shape.lineMode ?? 'straight',
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
    case 'circle':
    case 'ellipse':
      return {
        ...shape,
        strokeOpacity: shape.strokeOpacity ?? 1,
        fillOpacity: shape.fillOpacity ?? 1
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
        strokeOpacity: shape.strokeOpacity ?? 1
      } as CanvasShape;
  }
};

const normalizeScene = (scene: TikzScene): TikzScene => ({
  ...scene,
  shapes: scene.shapes.map((shape) => normalizeShape(shape))
});

const cloneScene = (scene: TikzScene): TikzScene => structuredClone(normalizeScene(scene));

const shapeBounds = (
  shape: CanvasShape
): { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } => {
  switch (shape.kind) {
    case 'rectangle':
      return { left: shape.x, right: shape.x + shape.width, bottom: shape.y, top: shape.y + shape.height };
    case 'circle':
      return {
        left: shape.cx - shape.r,
        right: shape.cx + shape.r,
        bottom: shape.cy - shape.r,
        top: shape.cy + shape.r
      };
    case 'ellipse':
      return {
        left: shape.cx - shape.rx,
        right: shape.cx + shape.rx,
        bottom: shape.cy - shape.ry,
        top: shape.cy + shape.ry
      };
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
      const lines = displayTextLinesForShape(shape);
      const width = estimateTextWidth(shape, 1, 1, lines);
      const height = estimateTextHeight(shape, lines.length);
      const left = textLeftForWidth(shape, shape.x, width);
      return {
        left,
        right: left + width,
        bottom: shape.y - height / 2,
        top: shape.y + height / 2
      };
    }
    case 'image':
      return { left: shape.x, right: shape.x + shape.width, bottom: shape.y, top: shape.y + shape.height };
  }
};

const centerShapesOnPoint = (
  shapes: readonly CanvasShape[],
  point: { x: number; y: number }
): readonly CanvasShape[] => {
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
      return {
        ...shape,
        x: shape.x + deltaX,
        y: shape.y + deltaY
      };
    case 'circle':
      return {
        ...shape,
        cx: shape.cx + deltaX,
        cy: shape.cy + deltaY
      };
    case 'ellipse':
      return {
        ...shape,
        cx: shape.cx + deltaX,
        cy: shape.cy + deltaY
      };
    case 'text':
      return {
        ...shape,
        x: shape.x + deltaX,
        y: shape.y + deltaY
      };
    case 'image':
      return {
        ...shape,
        x: shape.x + deltaX,
        y: shape.y + deltaY
      };
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
        lineMode: shape.lineMode ?? 'straight',
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
    case 'circle':
    case 'ellipse':
      return {
        ...shape,
        stroke: shape.stroke,
        fill: shape.fill,
        strokeOpacity: shape.strokeOpacity ?? 1,
        fillOpacity: shape.fillOpacity ?? 1,
        strokeWidth: shape.strokeWidth || preferences.defaultStrokeWidth
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
        strokeWidth: shape.strokeWidth || preferences.defaultStrokeWidth
      };
  }
};

const moveShapeToPoint = (shape: CanvasShape, point: { x: number; y: number }): CanvasShape => {
  switch (shape.kind) {
    case 'line': {
      const centerX = (shape.from.x + shape.to.x) / 2;
      const centerY = (shape.from.y + shape.to.y) / 2;
      return translateShape(shape, point.x - centerX, point.y - centerY);
    }
    case 'rectangle':
      return {
        ...shape,
        x: point.x - shape.width / 2,
        y: point.y - shape.height / 2
      };
    case 'circle':
      return {
        ...shape,
        cx: point.x,
        cy: point.y
      };
    case 'ellipse':
      return {
        ...shape,
        cx: point.x,
        cy: point.y
      };
    case 'text':
      return {
        ...shape,
        x: point.x,
        y: point.y
      };
    case 'image':
      return {
        ...shape,
        x: point.x - shape.width / 2,
        y: point.y - shape.height / 2
      };
  }
};

@Injectable()
export class EditorStore {
  private readonly storage = typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  private readonly undoSnapshots = signal<readonly EditorSnapshot[]>([]);
  private readonly redoSnapshots = signal<readonly EditorSnapshot[]>([]);

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

    effect(() => {
      const state: PersistedEditorState = {
        scene: this.scene(),
        preferences: this.preferences(),
        importCode: this.importCode()
      };

      this.storage?.setItem(EDITOR_STORAGE_KEYS.state, JSON.stringify(state));
    });
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
    this.selectedShapeIds.set(shapeId ? [shapeId] : []);
  }

  setSelectedShapes(shapeIds: readonly string[]): void {
    this.selectedShapeIds.set([...new Set(shapeIds)]);
  }

  toggleShapeInSelection(shapeId: string): void {
    this.selectedShapeIds.update((selectedShapeIds) =>
      selectedShapeIds.includes(shapeId)
        ? selectedShapeIds.filter((selectedShapeId) => selectedShapeId !== shapeId)
        : [...selectedShapeIds, shapeId]
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

    const shapes = preset.shapes.map((shape) => applyDefaultShapeStyle(cloneShape(shape), this.preferences()));
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

    const duplicatedShapes = remapStructuralShapeIds(
      selectedShapes.map((shape) => translateShape(cloneShape(shape), 0.6, -0.6))
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
      theme
    }));
  }

  patchPreferences(patch: Partial<EditorPreferences>): void {
    this.preferences.update((preferences) => ({
      ...preferences,
      ...patch
    }));
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
      const safeInsertionIndex =
        insertionIndex >= 0 ? Math.min(insertionIndex, remainingShapes.length) : remainingShapes.length;

      return {
        ...scene,
        shapes: [
          ...remainingShapes.slice(0, safeInsertionIndex),
          ...addedShapes,
          ...remainingShapes.slice(safeInsertionIndex)
        ]
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
      shapes: scene.shapes.map((shape) =>
        selectedShapeIdSet.has(shape.id) ? translateShape(shape, deltaX, deltaY) : shape
      )
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
        shapes: [
          ...scene.shapes.filter((shape) => !selectedShapeIdSet.has(shape.id)),
          ...scene.shapes.filter((shape) => selectedShapeIdSet.has(shape.id))
        ]
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
        .shapes.filter((shape) => selectedShapeIdSet.has(shape.id) && shape.mergeId)
        .map((shape) => shape.mergeId as string)
    );
    const tableIds = new Set(
      this.scene()
        .shapes.filter((shape) => selectedShapeIdSet.has(shape.id) && shape.table)
        .map((shape) => shape.table?.id as string)
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
  }

  sendSelectedToBack(): void {
    const selectedShapeIdSet = new Set(this.selectedShapeIds());

    if (selectedShapeIdSet.size === 0) {
      return;
    }

    this.scene.update((scene) => {
      return {
        ...scene,
        shapes: [
          ...scene.shapes.filter((shape) => selectedShapeIdSet.has(shape.id)),
          ...scene.shapes.filter((shape) => !selectedShapeIdSet.has(shape.id))
        ]
      };
    });
  }

  updateImportCode(value: string): void {
    this.importCode.set(value);
  }

  applyImportCode(): ParsedTikzResult {
    const parsed = parseTikz(this.importCode());
    this.setScene(parsed.scene);
    this.importCode.set(sceneToTikz(parsed.scene));
    this.parserWarnings.set(parsed.warnings);
    return parsed;
  }

  useExportedCodeAsImport(): void {
    this.importCode.set(this.exportedCode());
  }

  restoreSharedState(state: PersistedEditorState): void {
    this.scene.set(cloneScene(state.scene));
    this.preferences.set({
      ...defaultPreferences,
      ...structuredClone(state.preferences)
    });
    this.importCode.set(typeof state.importCode === 'string' ? state.importCode : sceneToTikz(state.scene));
    this.parserWarnings.set([]);
    this.selectedShapeIds.set([]);
    this.undoSnapshots.set([]);
    this.redoSnapshots.set([]);
  }

  private restoreState(): void {
    const raw = this.storage?.getItem(EDITOR_STORAGE_KEYS.state);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<PersistedEditorState>;

      if (parsed.preferences) {
        this.preferences.set({
          ...defaultPreferences,
          ...parsed.preferences
        });
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

  private setScene(scene: TikzScene): void {
    const normalizedScene = normalizeScene(scene);
    this.scene.set(cloneScene(normalizedScene));
    this.selectedShapeIds.set(normalizedScene.shapes[0] ? [normalizedScene.shapes[0].id] : []);
  }
}
