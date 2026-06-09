import type { Point } from '../models/tikz.models';

export interface ParsedNode {
  readonly name: string | null;
  readonly styles: string | undefined;
  readonly point: string | null;
  readonly text: string;
}

export interface NamedNode {
  readonly center: Point;
  readonly width: number;
  readonly height: number;
}

export interface TikzBasis {
  readonly x: Point;
  readonly y: Point;
  readonly z: Point;
}

export interface ParseContext {
  readonly styles: Record<string, Record<string, string>>;
  readonly nodes: Map<string, NamedNode>;
  readonly basis: TikzBasis;
}
