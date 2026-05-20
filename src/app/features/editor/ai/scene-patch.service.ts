import { Injectable, computed, inject, signal } from '@angular/core';
import {
  DEFAULT_TEXT_BOX_WIDTH,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_FONT_SIZE,
  EDITOR_AI_INSERT_MAX_RENDERED_LONG_EDGE_PX,
  EDITOR_AI_INSERT_MIN_RENDERED_LONG_EDGE_PX,
  EDITOR_AI_INSERT_TARGET_RENDERED_LONG_EDGE_PX,
  MIN_SHAPE_DIMENSION
} from '../constants/editor.constants';
import type { CanvasShape, EditorPreferences, LineStrokeStyle, TikzScene } from '../models/tikz.models';
import { sceneToTikz } from '../tikz/tikz.codegen';
import { EditorStore } from '../state/editor.store';
import { EditorLanguageService } from '../i18n/editor-language.service';
import type { ScenePatch } from './ai-message.model';
import { computeBounds } from '../utils/editor-geometry.utils';
import { transformCanvasShape } from '../utils/editor-page.utils';

@Injectable()
export class ScenePatchService {
  private readonly store = inject(EditorStore);
  private readonly languageService = inject(EditorLanguageService);
  readonly pendingPatch = signal<ScenePatch | null>(null);
  readonly pendingSummary = computed(() => {
    const patch = this.pendingPatch();
    return patch ? this.summarize(patch) : '';
  });
  readonly pendingCreatedShapeIds = signal<readonly string[]>([]);
  readonly previewShapes = computed<readonly CanvasShape[]>(() => {
    const patch = this.pendingPatch();
    if (!patch) {
      return [];
    }

    return this.preview(patch);
  });

  apply(patch: ScenePatch): readonly CanvasShape[] {
    const currentScene = this.store.scene();
    const preferences = this.store.preferences();
    const removedShapeIds = new Set(patch.remove.filter((id) => this.canMutateShape(currentScene, id)));
    const updatedShapes = this.updatedShapes(currentScene, patch, preferences);
    const createdShapes = this.createdShapes(patch, preferences);
    const updatedShapeMap = new Map(updatedShapes.map((shape) => [shape.id, shape]));

    this.store.recordHistoryCheckpoint();
    this.store.scene.update((scene) => ({
      ...scene,
      shapes: [...scene.shapes.filter((shape) => !removedShapeIds.has(shape.id)).map((shape) => updatedShapeMap.get(shape.id) ?? shape), ...createdShapes]
    }));
    this.store.selectedShapeIds.set(createdShapes.length ? createdShapes.map((shape) => shape.id) : updatedShapes.map((shape) => shape.id));
    this.store.importCode.set(sceneToTikz(this.store.scene()));
    return createdShapes;
  }

  setPendingPatch(patch: ScenePatch | null): void {
    this.removePendingCreatedShapes();
    this.pendingPatch.set(patch);
    if (patch?.create.length) {
      this.materializePendingCreatedShapes(patch);
    }
  }

  applyPendingPatch(): readonly CanvasShape[] {
    const patch = this.pendingPatch();
    if (!patch) {
      return [];
    }

    const pendingCreatedShapeIds = this.pendingCreatedShapeIds();
    if (pendingCreatedShapeIds.length) {
      const createdShapeIds = new Set(pendingCreatedShapeIds);
      const createdShapes = this.store.scene().shapes.filter((shape) => createdShapeIds.has(shape.id));
      this.applyPendingNonCreateChanges(patch);
      this.pendingPatch.set(null);
      this.pendingCreatedShapeIds.set([]);
      this.store.selectedShapeIds.set(createdShapes.map((shape) => shape.id));
      this.store.importCode.set(sceneToTikz(this.store.scene()));
      return createdShapes;
    }

    const createdShapes = this.apply(patch);
    this.pendingPatch.set(null);
    return createdShapes;
  }

  discardPendingPatch(): void {
    this.removePendingCreatedShapes();
    this.pendingPatch.set(null);
  }

  preview(patch: ScenePatch): readonly CanvasShape[] {
    const currentScene = this.store.scene();
    const preferences = this.store.preferences();
    return [...this.updatedShapes(currentScene, patch, preferences), ...(this.pendingCreatedShapeIds().length ? [] : this.createdShapes(patch, preferences))];
  }

  summarize(patch: ScenePatch): string {
    const pieces = [
      patch.create.length ? this.interpolate(this.languageService.t('ai.patchCreateCount'), { count: String(patch.create.length) }) : '',
      patch.update.length ? this.interpolate(this.languageService.t('ai.patchUpdateCount'), { count: String(patch.update.length) }) : '',
      patch.remove.length ? this.interpolate(this.languageService.t('ai.patchRemoveCount'), { count: String(patch.remove.length) }) : ''
    ].filter(Boolean);
    return pieces.join(' · ') || this.languageService.t('ai.patchNoChanges');
  }

  private interpolate(template: string, values: Record<string, string>): string {
    return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
  }

  private updatedShapes(scene: TikzScene, patch: ScenePatch, preferences: EditorPreferences): readonly CanvasShape[] {
    const shapeMap = new Map(scene.shapes.map((shape) => [shape.id, shape]));
    return patch.update
      .map((entry) => {
        const currentShape = shapeMap.get(entry.id);
        if (!currentShape || currentShape.locked) {
          return null;
        }

        return this.mergeShape(currentShape, entry.changes, preferences);
      })
      .filter((shape): shape is CanvasShape => !!shape);
  }

  private applyPendingNonCreateChanges(patch: ScenePatch): void {
    const currentScene = this.store.scene();
    const preferences = this.store.preferences();
    const removedShapeIds = new Set(patch.remove.filter((id) => this.canMutateShape(currentScene, id)));
    const updatedShapes = this.updatedShapes(currentScene, patch, preferences);
    const updatedShapeMap = new Map(updatedShapes.map((shape) => [shape.id, shape]));
    if (!removedShapeIds.size && !updatedShapeMap.size) {
      return;
    }

    this.store.scene.update((scene) => ({
      ...scene,
      shapes: scene.shapes.filter((shape) => !removedShapeIds.has(shape.id)).map((shape) => updatedShapeMap.get(shape.id) ?? shape)
    }));
  }

  private materializePendingCreatedShapes(patch: ScenePatch): void {
    const createdShapes = this.createdShapes(patch, this.store.preferences());
    if (!createdShapes.length) {
      return;
    }

    this.store.scene.update((scene) => ({
      ...scene,
      shapes: [...scene.shapes, ...createdShapes]
    }));
    this.store.selectedShapeIds.set(createdShapes.map((shape) => shape.id));
    this.pendingCreatedShapeIds.set(createdShapes.map((shape) => shape.id));
  }

  private removePendingCreatedShapes(): void {
    const pendingCreatedShapeIds = this.pendingCreatedShapeIds();
    if (!pendingCreatedShapeIds.length) {
      return;
    }

    const pendingCreatedShapeIdSet = new Set(pendingCreatedShapeIds);
    this.store.scene.update((scene) => ({
      ...scene,
      shapes: scene.shapes.filter((shape) => !pendingCreatedShapeIdSet.has(shape.id))
    }));
    this.store.selectedShapeIds.update((shapeIds) => shapeIds.filter((shapeId) => !pendingCreatedShapeIdSet.has(shapeId)));
    this.pendingCreatedShapeIds.set([]);
  }

  private createdShapes(patch: ScenePatch, preferences: EditorPreferences): readonly CanvasShape[] {
    const shapes = patch.create.map((shape) => this.createShape(shape, preferences)).filter((shape): shape is CanvasShape => !!shape);
    return this.scaleCreatedShapesForViewport(shapes, preferences.scale);
  }

  private canMutateShape(scene: TikzScene, shapeId: string): boolean {
    const shape = scene.shapes.find((entry) => entry.id === shapeId);
    return !!shape && !shape.locked;
  }

  private mergeShape(shape: CanvasShape, changes: Partial<CanvasShape>, preferences: EditorPreferences): CanvasShape {
    if (changes.kind && changes.kind !== shape.kind) {
      return shape;
    }

    return this.withDefaults({ ...shape, ...changes, id: shape.id, kind: shape.kind } as CanvasShape, preferences);
  }

  private createShape(shape: Partial<CanvasShape>, preferences: EditorPreferences): CanvasShape | null {
    const id = crypto.randomUUID();
    const name = this.textValue(shape.name, 'AI element');
    const stroke = this.textValue(shape.stroke, preferences.defaultStroke);
    const strokeWidth = this.numberValue(shape.strokeWidth, preferences.defaultStrokeWidth);

    switch (shape.kind) {
      case 'rectangle':
        return this.withDefaults(
          {
            id,
            name,
            kind: 'rectangle',
            stroke,
            strokeOpacity: 1,
            strokeWidth,
            x: this.numberValue(shape.x, -2),
            y: this.numberValue(shape.y, -1),
            width: this.positiveNumber(shape.width, 4),
            height: this.positiveNumber(shape.height, 2),
            fill: this.textValue(shape.fill, preferences.defaultFill),
            fillOpacity: 1,
            cornerRadius: preferences.defaultCornerRadius,
            rotation: 0
          },
          preferences
        );
      case 'triangle':
        return this.withDefaults(
          {
            id,
            name,
            kind: 'triangle',
            stroke,
            strokeOpacity: 1,
            strokeWidth,
            x: this.numberValue(shape.x, -2),
            y: this.numberValue(shape.y, -1),
            width: this.positiveNumber(shape.width, 4),
            height: this.positiveNumber(shape.height, 2.5),
            fill: this.textValue(shape.fill, preferences.defaultFill),
            fillOpacity: 1,
            cornerRadius: preferences.defaultCornerRadius,
            apexOffset: 0.5,
            rotation: 0
          },
          preferences
        );
      case 'circle':
        return this.withDefaults(
          {
            id,
            name,
            kind: 'circle',
            stroke,
            strokeOpacity: 1,
            strokeWidth,
            cx: this.numberValue(shape.cx, 0),
            cy: this.numberValue(shape.cy, 0),
            r: this.positiveNumber(shape.r, 1),
            fill: this.textValue(shape.fill, preferences.defaultFill),
            fillOpacity: 1,
            rotation: 0
          },
          preferences
        );
      case 'ellipse':
        return this.withDefaults(
          {
            id,
            name,
            kind: 'ellipse',
            stroke,
            strokeOpacity: 1,
            strokeWidth,
            cx: this.numberValue(shape.cx, 0),
            cy: this.numberValue(shape.cy, 0),
            rx: this.positiveNumber(shape.rx, 2),
            ry: this.positiveNumber(shape.ry, 1),
            fill: this.textValue(shape.fill, preferences.defaultFill),
            fillOpacity: 1,
            rotation: 0
          },
          preferences
        );
      case 'line':
        return this.withDefaults(
          {
            id,
            name,
            kind: 'line',
            stroke,
            strokeOpacity: 1,
            strokeWidth,
            from: { x: this.numberValue((shape as Record<string, unknown>)['fromX'], -2), y: this.numberValue((shape as Record<string, unknown>)['fromY'], 0) },
            to: { x: this.numberValue((shape as Record<string, unknown>)['toX'], 2), y: this.numberValue((shape as Record<string, unknown>)['toY'], 0) },
            anchors: [],
            lineMode: 'straight',
            strokeStyle: preferences.defaultLineStrokeStyle as LineStrokeStyle,
            arrowStart: !!shape.arrowStart,
            arrowEnd: shape.arrowEnd ?? true,
            arrowType: preferences.defaultArrowType,
            arrowColor: stroke,
            arrowOpacity: 1,
            arrowOpen: false,
            arrowRound: false,
            arrowScale: preferences.defaultArrowScale,
            arrowLengthScale: 1,
            arrowWidthScale: 1,
            arrowBendMode: 'none'
          },
          preferences
        );
      case 'text':
        return this.withDefaults(
          {
            id,
            name,
            kind: 'text',
            stroke: 'none',
            strokeOpacity: 1,
            strokeWidth: 0,
            x: this.numberValue(shape.x, 0),
            y: this.numberValue(shape.y, 0),
            text: this.textValue(shape.text, 'Texto'),
            textBox: false,
            boxWidth: DEFAULT_TEXT_BOX_WIDTH,
            fontSize: this.positiveNumber(shape.fontSize, DEFAULT_TEXT_FONT_SIZE),
            color: this.textValue(shape.color, DEFAULT_TEXT_COLOR),
            colorOpacity: 1,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            textAlign: 'center',
            rotation: 0
          },
          preferences
        );
      default:
        return null;
    }
  }

  private withDefaults(shape: CanvasShape, preferences: EditorPreferences): CanvasShape {
    switch (shape.kind) {
      case 'line':
        return {
          ...shape,
          anchors: shape.anchors ?? [],
          strokeOpacity: shape.strokeOpacity ?? 1,
          strokeWidth: shape.strokeWidth || preferences.defaultStrokeWidth,
          lineMode: shape.lineMode ?? 'straight',
          strokeStyle: shape.strokeStyle ?? preferences.defaultLineStrokeStyle,
          arrowType: shape.arrowType ?? preferences.defaultArrowType,
          arrowColor: shape.arrowColor ?? shape.stroke,
          arrowOpacity: shape.arrowOpacity ?? 1,
          arrowOpen: shape.arrowOpen ?? false,
          arrowRound: shape.arrowRound ?? false,
          arrowScale: shape.arrowScale ?? preferences.defaultArrowScale,
          arrowLengthScale: shape.arrowLengthScale ?? 1,
          arrowWidthScale: shape.arrowWidthScale ?? 1,
          arrowBendMode: shape.arrowBendMode ?? 'none'
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
      case 'rectangle':
      case 'triangle':
      case 'circle':
      case 'ellipse':
        return {
          ...shape,
          strokeOpacity: shape.strokeOpacity ?? 1,
          fillOpacity: shape.fillOpacity ?? 1,
          strokeWidth: shape.strokeWidth || preferences.defaultStrokeWidth,
          rotation: shape.rotation ?? 0
        } as CanvasShape;
      case 'image':
        return shape;
    }
  }

  private numberValue(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private positiveNumber(value: unknown, fallback: number): number {
    return Math.max(this.numberValue(value, fallback), 0.1);
  }

  private textValue(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private scaleCreatedShapesForViewport(shapes: readonly CanvasShape[], scale: number): readonly CanvasShape[] {
    if (!shapes.length) {
      return shapes;
    }

    const bounds = computeBounds(shapes);
    if (!bounds) {
      return shapes;
    }

    const longEdge = Math.max(bounds.right - bounds.left, bounds.top - bounds.bottom, MIN_SHAPE_DIMENSION);
    const renderedLongEdge = longEdge * Math.max(scale, 1);
    if (renderedLongEdge >= EDITOR_AI_INSERT_MIN_RENDERED_LONG_EDGE_PX && renderedLongEdge <= EDITOR_AI_INSERT_MAX_RENDERED_LONG_EDGE_PX) {
      return shapes;
    }

    const targetRenderedLongEdge = Math.min(
      EDITOR_AI_INSERT_MAX_RENDERED_LONG_EDGE_PX,
      Math.max(EDITOR_AI_INSERT_MIN_RENDERED_LONG_EDGE_PX, EDITOR_AI_INSERT_TARGET_RENDERED_LONG_EDGE_PX)
    );
    const resizeScale = targetRenderedLongEdge / renderedLongEdge;
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.bottom + bounds.top) / 2;

    return shapes.map((shape) =>
      transformCanvasShape(shape, {
        deltaX: 0,
        deltaY: 0,
        scaleX: resizeScale,
        scaleY: resizeScale,
        originX: centerX,
        originY: centerY,
        id: shape.id
      })
    );
  }
}
