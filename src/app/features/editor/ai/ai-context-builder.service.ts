import { Injectable } from '@angular/core';
import type { CanvasShape } from '../models/tikz.models';
import type { AiSceneContext, AiSceneElement } from './ai-scene-context.model';

@Injectable({ providedIn: 'root' })
export class AiContextBuilderService {
  build(sceneName: string, shapes: readonly CanvasShape[], selectedElementIds: readonly string[]): AiSceneContext {
    return {
      sceneName,
      selectedElementIds,
      elements: shapes.slice(0, 80).map((shape) => this.toAiElement(shape)),
      capabilities: ['message', 'scenePatch', 'tikzCode'],
      supportedElementKinds: ['rectangle', 'circle', 'ellipse', 'line', 'text', 'triangle']
    };
  }

  private toAiElement(shape: CanvasShape): AiSceneElement {
    return {
      id: shape.id,
      name: shape.name,
      kind: shape.kind,
      locked: !!shape.locked,
      geometry: this.geometry(shape),
      style: this.style(shape),
      text: shape.kind === 'text' ? shape.text : undefined
    };
  }

  private geometry(shape: CanvasShape): AiSceneElement['geometry'] {
    switch (shape.kind) {
      case 'line':
        return {
          fromX: shape.from.x,
          fromY: shape.from.y,
          toX: shape.to.x,
          toY: shape.to.y,
          arrowStart: shape.arrowStart,
          arrowEnd: shape.arrowEnd,
          anchors: shape.anchors.map((anchor) => ({ x: anchor.x, y: anchor.y }))
        };
      case 'circle':
        return { cx: shape.cx, cy: shape.cy, r: shape.r, rotation: shape.rotation ?? 0 };
      case 'ellipse':
        return { cx: shape.cx, cy: shape.cy, rx: shape.rx, ry: shape.ry, rotation: shape.rotation ?? 0 };
      case 'rectangle':
      case 'triangle':
      case 'image':
        return { x: shape.x, y: shape.y, width: shape.width, height: shape.height, rotation: shape.rotation ?? 0 };
      case 'text':
        return { x: shape.x, y: shape.y, fontSize: shape.fontSize, boxWidth: shape.boxWidth, rotation: shape.rotation };
    }
  }

  private style(shape: CanvasShape): AiSceneElement['style'] {
    const base = {
      stroke: shape.stroke,
      strokeOpacity: shape.strokeOpacity,
      strokeWidth: shape.strokeWidth
    };

    switch (shape.kind) {
      case 'line':
        return { ...base, strokeStyle: shape.strokeStyle ?? 'solid', arrowType: shape.arrowType };
      case 'text':
        return { ...base, color: shape.color, colorOpacity: shape.colorOpacity, fontWeight: shape.fontWeight, fontStyle: shape.fontStyle };
      case 'image':
        return base;
      default:
        return { ...base, fill: shape.fill, fillOpacity: shape.fillOpacity };
    }
  }
}
