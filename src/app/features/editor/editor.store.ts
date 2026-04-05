import { computed, effect, Injectable, signal } from '@angular/core';
import { defaultPreferences, defaultScene, objectPresets, scenePresets } from './presets';
import { sceneToTikz } from './tikz.codegen';
import type {
  CanvasShape,
  EditorPreferences,
  ParsedTikzResult,
  PersistedEditorState,
  TikzScene
} from './tikz.models';
import { parseTikz } from './tikz.parser';

const storageKey = 'tikz-drawer.state';

const cloneShape = (shape: CanvasShape): CanvasShape => ({
  ...structuredClone(shape),
  id: crypto.randomUUID(),
  name: `${shape.name} copy`
});

const cloneScene = (scene: TikzScene): TikzScene => structuredClone(scene);

@Injectable()
export class EditorStore {
  private readonly storage = typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;

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

    const duplicated = cloneShape(selected);
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
    this.patchSelectedShape((selected) => {
      switch (selected.kind) {
        case 'line':
          return {
            ...selected,
            from: {
              x: selected.from.x + deltaX,
              y: selected.from.y + deltaY
            },
            to: {
              x: selected.to.x + deltaX,
              y: selected.to.y + deltaY
            }
          };
        case 'rectangle':
          return {
            ...selected,
            x: selected.x + deltaX,
            y: selected.y + deltaY
          };
        case 'circle':
          return {
            ...selected,
            cx: selected.cx + deltaX,
            cy: selected.cy + deltaY
          };
        case 'ellipse':
          return {
            ...selected,
            cx: selected.cx + deltaX,
            cy: selected.cy + deltaY
          };
        case 'text':
          return {
            ...selected,
            x: selected.x + deltaX,
            y: selected.y + deltaY
          };
      }
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

  private setScene(scene: TikzScene): void {
    this.scene.set(cloneScene(scene));
    this.selectedShapeId.set(scene.shapes[0]?.id ?? null);
  }
}
