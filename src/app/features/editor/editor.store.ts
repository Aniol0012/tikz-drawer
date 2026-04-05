import { computed, effect, Injectable, signal } from '@angular/core';
import { defaultPreferences, defaultScene, objectPresets, scenePresets } from './presets';
import { sceneToTikz } from './tikz.codegen';
import type { CanvasShape, EditorPreferences, ParsedTikzResult, PersistedEditorState, TikzScene } from './tikz.models';
import { parseTikz } from './tikz.parser';

const storageKey = 'tikz-drawer.state';
const historyLimit = 80;

const cloneShape = (shape: CanvasShape): CanvasShape => ({
  ...structuredClone(shape),
  id: crypto.randomUUID(),
  name: `${shape.name} copy`
});

const cloneScene = (scene: TikzScene): TikzScene => structuredClone(scene);

interface EditorSnapshot {
  readonly scene: TikzScene;
  readonly preferences: EditorPreferences;
  readonly importCode: string;
  readonly selectedShapeId: string | null;
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
        }
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
  }
};

@Injectable()
export class EditorStore {
  private readonly storage = typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  private readonly undoSnapshots = signal<readonly EditorSnapshot[]>([]);
  private readonly redoSnapshots = signal<readonly EditorSnapshot[]>([]);

  readonly preferences = signal<EditorPreferences>(defaultPreferences);
  readonly scene = signal<TikzScene>(cloneScene(defaultScene));
  readonly selectedShapeId = signal<string | null>(null);
  readonly importCode = signal(sceneToTikz(defaultScene));
  readonly parserWarnings = signal<readonly string[]>([]);

  readonly selectedShape = computed<CanvasShape | null>(() => {
    const id = this.selectedShapeId();
    return this.scene().shapes.find((shape) => shape.id === id) ?? null;
  });

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

      this.storage?.setItem(storageKey, JSON.stringify(state));
    });
  }

  recordHistoryCheckpoint(): void {
    const snapshot = this.createSnapshot();
    this.undoSnapshots.update((snapshots) => [...snapshots.slice(-(historyLimit - 1)), snapshot]);
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
    this.selectedShapeId.set(shapeId);
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

  addShapeFromPreset(presetId: string): void {
    const preset = this.objectPresets.find((entry) => entry.id === presetId);

    if (!preset) {
      return;
    }

    const shape = cloneShape(preset.shape);
    this.scene.update((scene) => ({
      ...scene,
      shapes: [...scene.shapes, shape]
    }));
    this.selectedShapeId.set(shape.id);
  }

  removeSelected(): void {
    const selectedId = this.selectedShapeId();

    if (!selectedId) {
      return;
    }

    this.scene.update((scene) => ({
      ...scene,
      shapes: scene.shapes.filter((shape) => shape.id !== selectedId)
    }));
    this.selectedShapeId.set(null);
  }

  duplicateSelected(): void {
    const selected = this.selectedShape();

    if (!selected) {
      return;
    }

    const duplicated = translateShape(cloneShape(selected), 0.6, -0.6);
    this.scene.update((scene) => ({
      ...scene,
      shapes: [...scene.shapes, duplicated]
    }));
    this.selectedShapeId.set(duplicated.id);
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
    const selectedId = this.selectedShapeId();

    if (!selectedId) {
      return;
    }

    this.scene.update((scene) => ({
      ...scene,
      shapes: scene.shapes.map((shape) => (shape.id === selectedId ? mutator(shape) : shape))
    }));
  }

  moveSelectedBy(deltaX: number, deltaY: number): void {
    this.patchSelectedShape((selected) => translateShape(selected, deltaX, deltaY));
  }

  bringSelectedToFront(): void {
    const selectedId = this.selectedShapeId();

    if (!selectedId) {
      return;
    }

    this.scene.update((scene) => {
      const selectedShape = scene.shapes.find((shape) => shape.id === selectedId);

      if (!selectedShape) {
        return scene;
      }

      return {
        ...scene,
        shapes: [...scene.shapes.filter((shape) => shape.id !== selectedId), selectedShape]
      };
    });
  }

  sendSelectedToBack(): void {
    const selectedId = this.selectedShapeId();

    if (!selectedId) {
      return;
    }

    this.scene.update((scene) => {
      const selectedShape = scene.shapes.find((shape) => shape.id === selectedId);

      if (!selectedShape) {
        return scene;
      }

      return {
        ...scene,
        shapes: [selectedShape, ...scene.shapes.filter((shape) => shape.id !== selectedId)]
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

  private restoreState(): void {
    const raw = this.storage?.getItem(storageKey);

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
        this.scene.set(parsed.scene);
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
      selectedShapeId: this.selectedShapeId()
    };
  }

  private restoreSnapshot(snapshot: EditorSnapshot): void {
    this.scene.set(cloneScene(snapshot.scene));
    this.preferences.set(structuredClone(snapshot.preferences));
    this.importCode.set(snapshot.importCode);
    this.selectedShapeId.set(snapshot.selectedShapeId);
  }

  private setScene(scene: TikzScene): void {
    this.scene.set(cloneScene(scene));
    this.selectedShapeId.set(scene.shapes[0]?.id ?? null);
  }
}
