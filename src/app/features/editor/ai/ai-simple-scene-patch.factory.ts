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

    if (/(cercle|circulo|circle)/.test(normalized)) {
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => ({
        kind: 'circle',
        name: this.languageService.localizedShapeKind('circle'),
        cx: x,
        cy: y,
        r: /petit|pequeno|pequeño|small/.test(normalized) ? 0.7 : 1,
        stroke: count > 1 ? color.stroke : colors.stroke,
        fill: count > 1 ? color.fill : colors.fill,
        strokeWidth: 0.06
      }));
    }

    if (/(triangle)/.test(normalized)) {
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

    if (/(elipse|ellipse)/.test(normalized)) {
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

    if (/(rectangle|rectangulo|rectangel|quadrat|cuadrat|cuadrado|square)/.test(normalized)) {
      const square = /(quadrat|cuadrat|cuadrado|square)/.test(normalized);
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

    if (/(fletxa|flecha|arrow)/.test(normalized)) {
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => this.simpleLineShape(x, y, color.stroke));
    }

    if (/(figura|forma|shape|element)/.test(normalized)) {
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => ({
        kind: 'ellipse',
        name: this.languageService.localizedShapeKind('ellipse'),
        cx: x,
        cy: y,
        rx: 1.4,
        ry: 0.85,
        stroke: count > 1 ? color.stroke : colors.stroke,
        fill: count > 1 ? color.fill : colors.fill,
        strokeWidth: 0.06
      }));
    }

    return [];
  }

  private requestedSimpleShapeKinds(instruction: string): readonly SimpleShapeKind[] {
    const kinds: SimpleShapeKind[] = [];
    if (/(cercle|circulo|circle)/.test(instruction)) {
      kinds.push('circle');
    }
    if (/(triangle)/.test(instruction)) {
      kinds.push('triangle');
    }
    if (/(elipse|ellipse)/.test(instruction)) {
      kinds.push('ellipse');
    }
    if (/(quadrat|cuadrat|cuadrado|square)/.test(instruction)) {
      kinds.push('square');
    } else if (/(rectangle|rectangulo|rectangel)/.test(instruction)) {
      kinds.push('rectangle');
    }
    if (/(fletxa|flecha|arrow)/.test(instruction)) {
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

  private repeatGeneratedShapes(
    count: number,
    createShape: (index: number, x: number, y: number, color: { readonly stroke: string; readonly fill: string }) => Partial<CanvasShape>
  ): readonly Partial<CanvasShape>[] {
    const safeCount = Math.min(Math.max(count, 1), 8);
    const columns = Math.ceil(Math.sqrt(safeCount));
    const rows = Math.ceil(safeCount / columns);
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

    return Array.from({ length: safeCount }, (_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return createShape(index, (column - (columns - 1) / 2) * 2.25, ((rows - 1) / 2 - row) * 2, palette[index % palette.length]);
    });
  }

  private shapeCountFromInstruction(instruction: string): number {
    const digitMatch = /\b([2-8])\b/.exec(instruction);
    if (digitMatch?.[1]) {
      return Number(digitMatch[1]);
    }

    const countWords: readonly [RegExp, number][] = [
      [/\b(dos|dues|two)\b/, 2],
      [/\b(tres|three)\b/, 3],
      [/\b(quatre|cuatro|four)\b/, 4],
      [/\b(cinc|cinco|five)\b/, 5],
      [/\b(sis|seis|six)\b/, 6],
      [/\b(set|siete|seven)\b/, 7],
      [/\b(vuit|ocho|eight)\b/, 8]
    ];
    return countWords.find(([pattern]) => pattern.test(instruction))?.[1] ?? 1;
  }

  private colorFromInstruction(instruction: string): { readonly stroke: string; readonly fill: string } {
    if (/(verd|verde|green)/.test(instruction)) {
      return { stroke: '#16a34a', fill: '#dcfce7' };
    }
    if (/(vermell|rojo|red)/.test(instruction)) {
      return { stroke: '#dc2626', fill: '#fee2e2' };
    }
    if (/(groc|amarillo|yellow)/.test(instruction)) {
      return { stroke: '#d97706', fill: '#fef3c7' };
    }
    if (/(blau|azul|blue)/.test(instruction)) {
      return { stroke: '#1d4ed8', fill: '#dbeafe' };
    }

    return { stroke: '#1f2937', fill: '#f1f5f9' };
  }
}
