import { Injectable, inject } from '@angular/core';
import { EditorLanguageService } from '../i18n/editor-language.service';
import type { CanvasShape } from '../models/tikz.models';
import { AiInstructionIntentService } from './ai-instruction-intent.service';

type SimpleShapeKind = 'circle' | 'triangle' | 'ellipse' | 'rectangle' | 'square' | 'line';

@Injectable({ providedIn: 'root' })
export class AiSimpleScenePatchFactory {
  private readonly languageService = inject(EditorLanguageService);
  private readonly intentService = inject(AiInstructionIntentService);

  createShapes(instruction: string): readonly Partial<CanvasShape>[] {
    const normalized = this.intentService.normalizeInstruction(instruction);
    if (!/(afegeix|afegir|posa|pon|crear|crea|anade|añade|dibuixa|dibuja)/.test(normalized)) {
      return [];
    }

    const colors = this.colorFromInstruction(normalized);
    const count = this.shapeCountFromInstruction(normalized);
    const requestedKinds = this.requestedSimpleShapeKinds(normalized);
    if (requestedKinds.length > 1) {
      return this.composedSimpleShapes(requestedKinds, colors);
    }

    if (this.intentService.hasLocalizedTerm(normalized, 'ai.intent.circleTargets')) {
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => ({
        kind: 'circle',
        name: this.languageService.localizedShapeKind('circle'),
        cx: x,
        cy: y,
        r: this.intentService.hasLocalizedTerm(normalized, 'ai.intent.smallModifiers') ? 0.7 : 1,
        stroke: count > 1 ? color.stroke : colors.stroke,
        fill: count > 1 ? color.fill : colors.fill,
        strokeWidth: 0.06
      }));
    }

    if (this.intentService.hasLocalizedTerm(normalized, 'ai.intent.triangleTargets')) {
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => ({
        kind: 'triangle',
        name: this.languageService.localizedShapeKind('triangle'),
        x: x - 1,
        y: y - 0.8,
        width: 2,
        height: 1.6,
        stroke: count > 1 ? color.stroke : colors.stroke,
        fill: count > 1 ? color.fill : colors.fill,
        strokeWidth: 0.06
      }));
    }

    if (this.intentService.hasLocalizedTerm(normalized, 'ai.intent.ellipseTargets')) {
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => ({
        kind: 'ellipse',
        name: this.languageService.localizedShapeKind('ellipse'),
        cx: x,
        cy: y,
        rx: 1.3,
        ry: 0.75,
        stroke: count > 1 ? color.stroke : colors.stroke,
        fill: count > 1 ? color.fill : colors.fill,
        strokeWidth: 0.06
      }));
    }

    if (
      this.intentService.hasLocalizedTerm(normalized, 'ai.intent.rectangleTargets') ||
      this.intentService.hasLocalizedTerm(normalized, 'ai.intent.squareTargets')
    ) {
      const square = this.intentService.hasLocalizedTerm(normalized, 'ai.intent.squareTargets');
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => ({
        kind: 'rectangle',
        name: this.languageService.localizedShapeKind('rectangle'),
        x: x - (square ? 0.6 : 1),
        y: y - 0.6,
        width: square ? 1.2 : 2,
        height: square ? 1.2 : 1.2,
        stroke: count > 1 ? color.stroke : colors.stroke,
        fill: count > 1 ? color.fill : colors.fill,
        strokeWidth: 0.06
      }));
    }

    if (this.intentService.hasLocalizedTerm(normalized, 'ai.intent.arrowTargets')) {
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => this.simpleLineShape(x, y, color.stroke));
    }

    if (this.intentService.hasLocalizedTerm(normalized, 'ai.intent.diagramTargets')) {
      return this.simpleFlowDiagram(colors);
    }

    if (this.vagueShapeTarget(normalized)) {
      return this.mixedSimpleShapes(count, colors);
    }

    return [];
  }

  private vagueShapeTarget(instruction: string): boolean {
    return this.intentService.hasLocalizedTerm(instruction, 'ai.intent.vagueShapeTargets');
  }

  private requestedSimpleShapeKinds(instruction: string): readonly SimpleShapeKind[] {
    const kinds: SimpleShapeKind[] = [];
    if (this.intentService.hasLocalizedTerm(instruction, 'ai.intent.circleTargets')) {
      kinds.push('circle');
    }
    if (this.intentService.hasLocalizedTerm(instruction, 'ai.intent.triangleTargets')) {
      kinds.push('triangle');
    }
    if (this.intentService.hasLocalizedTerm(instruction, 'ai.intent.ellipseTargets')) {
      kinds.push('ellipse');
    }
    if (this.intentService.hasLocalizedTerm(instruction, 'ai.intent.squareTargets')) {
      kinds.push('square');
    } else if (this.intentService.hasLocalizedTerm(instruction, 'ai.intent.rectangleTargets')) {
      kinds.push('rectangle');
    }
    if (this.intentService.hasLocalizedTerm(instruction, 'ai.intent.arrowTargets')) {
      kinds.push('line');
    }

    return [...new Set(kinds)];
  }

  private composedSimpleShapes(kinds: readonly SimpleShapeKind[], colors: { readonly stroke: string; readonly fill: string }): readonly Partial<CanvasShape>[] {
    const safeKinds = kinds.slice(0, 8);
    return safeKinds.map((kind, index) => {
      const x = (index - (safeKinds.length - 1) / 2) * 2.4;
      switch (kind) {
        case 'circle':
          return {
            kind: 'circle',
            name: this.languageService.localizedShapeKind('circle'),
            cx: x,
            cy: 0,
            r: 0.75,
            stroke: colors.stroke,
            fill: colors.fill,
            strokeWidth: 0.06
          };
        case 'triangle':
          return {
            kind: 'triangle',
            name: this.languageService.localizedShapeKind('triangle'),
            x: x - 0.85,
            y: -0.7,
            width: 1.7,
            height: 1.4,
            stroke: colors.stroke,
            fill: colors.fill,
            strokeWidth: 0.06
          };
        case 'ellipse':
          return {
            kind: 'ellipse',
            name: this.languageService.localizedShapeKind('ellipse'),
            cx: x,
            cy: 0,
            rx: 1.05,
            ry: 0.65,
            stroke: colors.stroke,
            fill: colors.fill,
            strokeWidth: 0.06
          };
        case 'square':
          return {
            kind: 'rectangle',
            name: this.languageService.localizedShapeKind('rectangle'),
            x: x - 0.65,
            y: -0.65,
            width: 1.3,
            height: 1.3,
            stroke: colors.stroke,
            fill: colors.fill,
            strokeWidth: 0.06
          };
        case 'rectangle':
          return {
            kind: 'rectangle',
            name: this.languageService.localizedShapeKind('rectangle'),
            x: x - 1,
            y: -0.55,
            width: 2,
            height: 1.1,
            stroke: colors.stroke,
            fill: colors.fill,
            strokeWidth: 0.06
          };
        case 'line':
          return this.simpleLineShape(x, 0, colors.stroke);
      }
    });
  }

  private simpleLineShape(x: number, y: number, stroke: string): Partial<CanvasShape> {
    return {
      kind: 'line',
      name: this.languageService.localizedShapeKind('line'),
      from: { x: x - 0.9, y },
      to: { x: x + 0.9, y },
      stroke,
      strokeWidth: 0.06,
      arrowEnd: true
    };
  }

  private simpleFlowDiagram(colors: { readonly stroke: string; readonly fill: string }): readonly Partial<CanvasShape>[] {
    const palette = this.randomPalette(colors);
    const spacing = this.randomFrom([2.35, 2.6, 2.85]);
    const nodeWidth = this.randomFrom([1.55, 1.7, 1.9]);
    const nodeHeight = this.randomFrom([0.82, 0.9, 1]);
    const y = this.jitter(0.08);
    const nodeIds = [`ai-flow-${crypto.randomUUID()}`, `ai-flow-${crypto.randomUUID()}`, `ai-flow-${crypto.randomUUID()}`];
    const nodes = [-spacing, 0, spacing].map((x, index) => ({
      id: nodeIds[index],
      kind: 'rectangle' as const,
      name: this.languageService.localizedShapeKind('rectangle'),
      x: this.round(x - nodeWidth / 2),
      y: this.round(y - nodeHeight / 2 + this.jitter(0.04)),
      width: nodeWidth,
      height: nodeHeight,
      stroke: palette[index % palette.length].stroke,
      fill: palette[index % palette.length].fill,
      strokeWidth: 0.06
    }));

    return [nodes[0], this.flowConnector(nodes[0], nodes[1], y, colors.stroke), nodes[1], this.flowConnector(nodes[1], nodes[2], y, colors.stroke), nodes[2]];
  }

  private mixedSimpleShapes(count: number, colors: { readonly stroke: string; readonly fill: string }): readonly Partial<CanvasShape>[] {
    const palette = this.randomPalette(colors);
    const factories = [
      (x: number, y: number, color: { readonly stroke: string; readonly fill: string }) => ({
        kind: 'ellipse' as const,
        name: this.languageService.localizedShapeKind('ellipse'),
        cx: x,
        cy: y,
        rx: 1.2,
        ry: 0.72,
        stroke: color.stroke,
        fill: color.fill,
        strokeWidth: 0.06
      }),
      (x: number, y: number, color: { readonly stroke: string; readonly fill: string }) => ({
        kind: 'rectangle' as const,
        name: this.languageService.localizedShapeKind('rectangle'),
        x: x - 0.75,
        y: y - 0.55,
        width: 1.5,
        height: 1.1,
        stroke: color.stroke,
        fill: color.fill,
        strokeWidth: 0.06
      }),
      (x: number, y: number, color: { readonly stroke: string; readonly fill: string }) => ({
        kind: 'circle' as const,
        name: this.languageService.localizedShapeKind('circle'),
        cx: x,
        cy: y,
        r: 0.68,
        stroke: color.stroke,
        fill: color.fill,
        strokeWidth: 0.06
      }),
      (x: number, y: number, color: { readonly stroke: string; readonly fill: string }) => ({
        kind: 'triangle' as const,
        name: this.languageService.localizedShapeKind('triangle'),
        x: x - 0.78,
        y: y - 0.62,
        width: 1.56,
        height: 1.24,
        stroke: color.stroke,
        fill: color.fill,
        strokeWidth: 0.06
      })
    ] as const;

    return this.repeatGeneratedShapes(count, (index, x, y) => factories[index % factories.length](x, y, palette[index % palette.length]));
  }

  private flowConnector(
    source: Partial<CanvasShape> & { readonly id?: string; readonly x?: number; readonly width?: number },
    target: Partial<CanvasShape> & { readonly id?: string; readonly x?: number; readonly width?: number },
    y: number,
    stroke: string
  ): Partial<CanvasShape> {
    const sourceRight = (source.x ?? 0) + (source.width ?? 0);
    const targetLeft = target.x ?? 0;
    const bend = this.randomFrom([-0.12, 0, 0.12]);
    return {
      kind: 'line',
      name: this.languageService.localizedShapeKind('line'),
      from: { x: this.round(sourceRight), y: this.round(y) },
      to: { x: this.round(targetLeft), y: this.round(y) },
      anchors: [{ x: this.round((sourceRight + targetLeft) / 2), y: this.round(y + bend) }],
      fromAttachment: { shapeId: source.id ?? '', anchor: { x: 1, y: 0 } },
      toAttachment: { shapeId: target.id ?? '', anchor: { x: -1, y: 0 } },
      stroke,
      strokeWidth: 0.07,
      lineMode: 'curved',
      strokeStyle: 'solid',
      arrowEnd: true,
      arrowType: 'stealth',
      arrowRound: true,
      arrowScale: 1.08
    };
  }

  private repeatGeneratedShapes(
    count: number,
    createShape: (index: number, x: number, y: number, color: { readonly stroke: string; readonly fill: string }) => Partial<CanvasShape>
  ): readonly Partial<CanvasShape>[] {
    const safeCount = Math.min(Math.max(count, 1), 8);
    const columns = Math.ceil(Math.sqrt(safeCount));
    const rows = Math.ceil(safeCount / columns);
    const palette = this.randomPalette();
    const spacingX = this.randomFrom([2.05, 2.25, 2.45]);
    const spacingY = this.randomFrom([1.85, 2, 2.15]);

    return Array.from({ length: safeCount }, (_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return createShape(
        index,
        (column - (columns - 1) / 2) * spacingX + this.jitter(0.08),
        ((rows - 1) / 2 - row) * spacingY + this.jitter(0.08),
        palette[index % palette.length]
      );
    });
  }

  private randomPalette(preferred?: { readonly stroke: string; readonly fill: string }): readonly { readonly stroke: string; readonly fill: string }[] {
    const palette = [
      { stroke: '#1d4ed8', fill: '#dbeafe' },
      { stroke: '#16a34a', fill: '#dcfce7' },
      { stroke: '#d97706', fill: '#fef3c7' },
      { stroke: '#7c3aed', fill: '#ede9fe' },
      { stroke: '#dc2626', fill: '#fee2e2' },
      { stroke: '#0891b2', fill: '#cffafe' },
      { stroke: '#4f46e5', fill: '#e0e7ff' },
      { stroke: '#be123c', fill: '#ffe4e6' }
    ] as const;
    const start = Math.floor(Math.random() * palette.length);
    const rotated = [...palette.slice(start), ...palette.slice(0, start)];
    return preferred ? [preferred, ...rotated.filter((entry) => entry.stroke !== preferred.stroke)] : rotated;
  }

  private randomFrom(values: readonly number[]): number {
    return values[Math.floor(Math.random() * values.length)] ?? values[0];
  }

  private jitter(amount: number): number {
    return (Math.random() * 2 - 1) * amount;
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }

  private shapeCountFromInstruction(instruction: string): number {
    const digitMatch = /\b([2-8])\b/.exec(instruction);
    if (digitMatch?.[1]) {
      return Number(digitMatch[1]);
    }

    const countWords: readonly [string, number][] = [
      ['ai.intent.countTwo', 2],
      ['ai.intent.countThree', 3],
      ['ai.intent.countFour', 4],
      ['ai.intent.countFive', 5],
      ['ai.intent.countSix', 6],
      ['ai.intent.countSeven', 7],
      ['ai.intent.countEight', 8]
    ];
    return countWords.find(([key]) => this.intentService.hasLocalizedTerm(instruction, key))?.[1] ?? 1;
  }

  private colorFromInstruction(instruction: string): { readonly stroke: string; readonly fill: string } {
    if (this.intentService.hasLocalizedTerm(instruction, 'ai.intent.colorGreen')) {
      return { stroke: '#16a34a', fill: '#dcfce7' };
    }
    if (this.intentService.hasLocalizedTerm(instruction, 'ai.intent.colorRed')) {
      return { stroke: '#dc2626', fill: '#fee2e2' };
    }
    if (this.intentService.hasLocalizedTerm(instruction, 'ai.intent.colorYellow')) {
      return { stroke: '#d97706', fill: '#fef3c7' };
    }
    if (this.intentService.hasLocalizedTerm(instruction, 'ai.intent.colorBlue')) {
      return { stroke: '#1d4ed8', fill: '#dbeafe' };
    }

    return { stroke: '#1f2937', fill: '#f1f5f9' };
  }
}
