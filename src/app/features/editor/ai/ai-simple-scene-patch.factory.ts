import { Injectable, inject } from '@angular/core';
import { EditorLanguageService } from '../i18n/editor-language.service';
import type { CanvasShape } from '../models/tikz.models';
import { AiInstructionIntentService } from './ai-instruction-intent.service';
import { ColorRangeRandomizerService, type ColorRangeInput, type RandomColorPair } from './color-range-randomizer.service';
import { REGEX } from '../../../shared/regex/regex.utils';

type SimpleShapeKind = 'circle' | 'triangle' | 'ellipse' | 'rectangle' | 'square' | 'line';
type ShapeColor = { readonly stroke: string; readonly fill: string };

const MAX_GENERATED_SHAPES = 8;
const DEFAULT_PALETTE_SIZE = 8;
const DEFAULT_SHAPE_STROKE_WIDTH = 0.06;
const DEFAULT_LINE_STROKE_WIDTH = 0.06;
const DEFAULT_CONNECTOR_STROKE_WIDTH = 0.07;
const SMALL_CIRCLE_RADIUS = 0.7;
const DEFAULT_CIRCLE_RADIUS = 1;
const SQUARE_SIZE = 1.2;
const RECTANGLE_WIDTH = 2;
const RECTANGLE_HEIGHT = 1.2;

@Injectable({ providedIn: 'root' })
export class AiSimpleScenePatchFactory {
  private readonly languageService = inject(EditorLanguageService);
  private readonly intentService = inject(AiInstructionIntentService);
  private readonly colorRandomizer = inject(ColorRangeRandomizerService);

  createShapes(instruction: string): readonly Partial<CanvasShape>[] {
    const normalized = this.intentService.normalizeInstruction(instruction);
    if (!this.intentService.hasLocalizedTerm(normalized, 'ai.intent.create')) {
      return [];
    }

    const colorTarget = this.colorFromInstruction(normalized);
    const colors = this.colorRandomizer.getRandomColorPair(colorTarget ?? undefined);
    const count = this.shapeCountFromInstruction(normalized);
    const requestedKinds = this.requestedSimpleShapeKinds(normalized);
    if (requestedKinds.length > 1) {
      return this.composedSimpleShapes(requestedKinds, colors);
    }

    if (this.intentService.hasLocalizedTerm(normalized, 'ai.intent.circleTargets')) {
      return this.repeatGeneratedShapes(
        count,
        (_index, x, y, color) => ({
          kind: 'circle',
          name: this.languageService.localizedShapeKind('circle'),
          cx: x,
          cy: y,
          r: this.circleRadius(normalized),
          stroke: color.stroke,
          fill: color.fill,
          strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH
        }),
        colorTarget
      );
    }

    if (this.intentService.hasLocalizedTerm(normalized, 'ai.intent.triangleTargets')) {
      return this.repeatGeneratedShapes(
        count,
        (_index, x, y, color) => ({
          kind: 'triangle',
          name: this.languageService.localizedShapeKind('triangle'),
          x: x - 1,
          y: y - 0.8,
          width: 2,
          height: 1.6,
          stroke: color.stroke,
          fill: color.fill,
          strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH
        }),
        colorTarget
      );
    }

    if (this.intentService.hasLocalizedTerm(normalized, 'ai.intent.ellipseTargets')) {
      return this.repeatGeneratedShapes(
        count,
        (_index, x, y, color) => ({
          kind: 'ellipse',
          name: this.languageService.localizedShapeKind('ellipse'),
          cx: x,
          cy: y,
          rx: 1.3,
          ry: 0.75,
          stroke: color.stroke,
          fill: color.fill,
          strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH
        }),
        colorTarget
      );
    }

    if (
      this.intentService.hasLocalizedTerm(normalized, 'ai.intent.rectangleTargets') ||
      this.intentService.hasLocalizedTerm(normalized, 'ai.intent.squareTargets')
    ) {
      const square = this.intentService.hasLocalizedTerm(normalized, 'ai.intent.squareTargets');
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => this.rectangleShape(x, y, square, color), colorTarget);
    }

    if (this.intentService.hasLocalizedTerm(normalized, 'ai.intent.arrowTargets')) {
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => this.simpleLineShape(x, y, color.stroke), colorTarget);
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

  private composedSimpleShapes(kinds: readonly SimpleShapeKind[], colors: RandomColorPair): readonly Partial<CanvasShape>[] {
    const safeKinds = kinds.slice(0, MAX_GENERATED_SHAPES);
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
            strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH
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
            strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH
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
            strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH
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
            strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH
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
            strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH
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
      strokeWidth: DEFAULT_LINE_STROKE_WIDTH,
      arrowEnd: true
    };
  }

  private circleRadius(instruction: string): number {
    if (this.intentService.hasLocalizedTerm(instruction, 'ai.intent.smallModifiers')) {
      return SMALL_CIRCLE_RADIUS;
    }

    return DEFAULT_CIRCLE_RADIUS;
  }

  private rectangleShape(x: number, y: number, square: boolean, color: ShapeColor): Partial<CanvasShape> {
    const dimensions = this.rectangleDimensions(square);
    return {
      kind: 'rectangle',
      name: this.languageService.localizedShapeKind('rectangle'),
      x: x - dimensions.width / 2,
      y: y - dimensions.height / 2,
      width: dimensions.width,
      height: dimensions.height,
      stroke: color.stroke,
      fill: color.fill,
      strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH
    };
  }

  private rectangleDimensions(square: boolean): { readonly width: number; readonly height: number } {
    if (square) {
      return { width: SQUARE_SIZE, height: SQUARE_SIZE };
    }

    return { width: RECTANGLE_WIDTH, height: RECTANGLE_HEIGHT };
  }

  private simpleFlowDiagram(colors: RandomColorPair): readonly Partial<CanvasShape>[] {
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
      strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH
    }));

    return [nodes[0], this.flowConnector(nodes[0], nodes[1], y, colors.stroke), nodes[1], this.flowConnector(nodes[1], nodes[2], y, colors.stroke), nodes[2]];
  }

  private mixedSimpleShapes(count: number, colors: RandomColorPair): readonly Partial<CanvasShape>[] {
    const palette = this.randomPalette(colors);
    const factories = [
      (x: number, y: number, color: ShapeColor) => ({
        kind: 'ellipse' as const,
        name: this.languageService.localizedShapeKind('ellipse'),
        cx: x,
        cy: y,
        rx: 1.2,
        ry: 0.72,
        stroke: color.stroke,
        fill: color.fill,
        strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH
      }),
      (x: number, y: number, color: ShapeColor) => ({
        kind: 'rectangle' as const,
        name: this.languageService.localizedShapeKind('rectangle'),
        x: x - 0.75,
        y: y - 0.55,
        width: 1.5,
        height: 1.1,
        stroke: color.stroke,
        fill: color.fill,
        strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH
      }),
      (x: number, y: number, color: ShapeColor) => ({
        kind: 'circle' as const,
        name: this.languageService.localizedShapeKind('circle'),
        cx: x,
        cy: y,
        r: 0.68,
        stroke: color.stroke,
        fill: color.fill,
        strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH
      }),
      (x: number, y: number, color: ShapeColor) => ({
        kind: 'triangle' as const,
        name: this.languageService.localizedShapeKind('triangle'),
        x: x - 0.78,
        y: y - 0.62,
        width: 1.56,
        height: 1.24,
        stroke: color.stroke,
        fill: color.fill,
        strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH
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
      strokeWidth: DEFAULT_CONNECTOR_STROKE_WIDTH,
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
    createShape: (index: number, x: number, y: number, color: ShapeColor) => Partial<CanvasShape>,
    colorTarget: ColorRangeInput | null = null
  ): readonly Partial<CanvasShape>[] {
    const safeCount = Math.min(Math.max(count, 1), MAX_GENERATED_SHAPES);
    const columns = Math.ceil(Math.sqrt(safeCount));
    const rows = Math.ceil(safeCount / columns);
    const palette = this.randomPalette(undefined, colorTarget);
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

  private randomPalette(preferred?: RandomColorPair, range?: ColorRangeInput | null): readonly RandomColorPair[] {
    if (range) {
      return this.colorRandomizer.getRandomPalette(DEFAULT_PALETTE_SIZE, preferred, range);
    }

    return this.colorRandomizer.getRandomPalette(DEFAULT_PALETTE_SIZE, preferred);
  }

  private randomFrom(values: readonly number[]): number {
    const fallback = values[0] ?? 0;
    return values[Math.floor(Math.random() * values.length)] ?? fallback;
  }

  private jitter(amount: number): number {
    return (Math.random() * 2 - 1) * amount;
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }

  private shapeCountFromInstruction(instruction: string): number {
    const digitMatch = REGEX.ai.sceneCount.exec(instruction);
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

  private colorFromInstruction(instruction: string): ColorRangeInput | null {
    return this.intentService.colorRangeFromInstruction(instruction);
  }
}
