import type {
  CanvasShape,
  CircleShape,
  EllipseShape,
  LineShape,
  ParsedTikzResult,
  RectangleShape,
  TextShape,
  TikzScene
} from './tikz.models';

const defaultSceneBounds = {
  width: 960,
  height: 640
};

const createId = (): string => crypto.randomUUID();

const parsePoint = (value: string): { x: number; y: number } | null => {
  const match = value.match(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/);

  if (!match) {
    return null;
  }

  return {
    x: Number(match[1]),
    y: Number(match[2])
  };
};

const parseStyleMap = (raw: string | undefined): Record<string, string> => {
  if (!raw) {
    return {};
  }

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((styles, entry) => {
      if (entry === '->' || entry === '<-' || entry === '<->') {
        styles[entry] = 'true';
        return styles;
      }

      const [key, ...rest] = entry.split('=');
      styles[key.trim()] = rest.join('=').trim() || 'true';
      return styles;
    }, {});
};

const styleStrokeWidth = (styles: Record<string, string>): number => {
  const raw = styles['line width'];

  if (!raw) {
    return 0.08;
  }

  return Number.parseFloat(raw.replace(/pt|cm/g, '').trim()) || 0.08;
};

const sharedStroke = (styles: Record<string, string>): { stroke: string; strokeWidth: number } => ({
  stroke: styles['draw'] ?? '#0f172a',
  strokeWidth: styleStrokeWidth(styles)
});

const parseLine = (line: string): CanvasShape | null => {
  const match = line.match(/^\\draw(?:\[(?<styles>[^\]]*)\])?\s*(?<from>\([^)]*\))\s*--\s*(?<to>\([^)]*\))\s*;?$/);

  if (!match?.groups) {
    return null;
  }

  const from = parsePoint(match.groups['from']);
  const to = parsePoint(match.groups['to']);

  if (!from || !to) {
    return null;
  }

  const styles = parseStyleMap(match.groups['styles']);

  const shape: LineShape = {
    id: createId(),
    name: 'Imported line',
    kind: 'line',
    ...sharedStroke(styles),
    from,
    to,
    arrowStart: styles['<-'] === 'true' || styles['<->'] === 'true',
    arrowEnd: styles['->'] === 'true' || styles['<->'] === 'true'
  };

  return shape;
};

const parseRectangle = (line: string): CanvasShape | null => {
  const match = line.match(
    /^\\draw(?:\[(?<styles>[^\]]*)\])?\s*(?<from>\([^)]*\))\s*rectangle\s*(?<to>\([^)]*\))\s*;?$/
  );

  if (!match?.groups) {
    return null;
  }

  const from = parsePoint(match.groups['from']);
  const to = parsePoint(match.groups['to']);

  if (!from || !to) {
    return null;
  }

  const styles = parseStyleMap(match.groups['styles']);

  const shape: RectangleShape = {
    id: createId(),
    name: 'Imported rectangle',
    kind: 'rectangle',
    ...sharedStroke(styles),
    x: Math.min(from.x, to.x),
    y: Math.max(from.y, to.y),
    width: Math.abs(to.x - from.x),
    height: Math.abs(from.y - to.y),
    fill: styles['fill'] ?? 'none',
    cornerRadius: Number.parseFloat((styles['rounded corners'] ?? '0').replace('cm', '').trim()) || 0
  };

  return shape;
};

const parseCircle = (line: string): CanvasShape | null => {
  const match = line.match(
    /^\\draw(?:\[(?<styles>[^\]]*)\])?\s*(?<center>\([^)]*\))\s*circle\s*\(\s*(?<radius>-?\d+(?:\.\d+)?)\s*\)\s*;?$/
  );

  if (!match?.groups) {
    return null;
  }

  const center = parsePoint(match.groups['center']);

  if (!center) {
    return null;
  }

  const styles = parseStyleMap(match.groups['styles']);
  const shape: CircleShape = {
    id: createId(),
    name: 'Imported circle',
    kind: 'circle',
    ...sharedStroke(styles),
    cx: center.x,
    cy: center.y,
    r: Number(match.groups['radius']),
    fill: styles['fill'] ?? 'none'
  };

  return shape;
};

const parseEllipse = (line: string): CanvasShape | null => {
  const match = line.match(
    /^\\draw(?:\[(?<styles>[^\]]*)\])?\s*(?<center>\([^)]*\))\s*ellipse\s*\(\s*(?<rx>-?\d+(?:\.\d+)?)\s*and\s*(?<ry>-?\d+(?:\.\d+)?)\s*\)\s*;?$/
  );

  if (!match?.groups) {
    return null;
  }

  const center = parsePoint(match.groups['center']);

  if (!center) {
    return null;
  }

  const styles = parseStyleMap(match.groups['styles']);
  const shape: EllipseShape = {
    id: createId(),
    name: 'Imported ellipse',
    kind: 'ellipse',
    ...sharedStroke(styles),
    cx: center.x,
    cy: center.y,
    rx: Number(match.groups['rx']),
    ry: Number(match.groups['ry']),
    fill: styles['fill'] ?? 'none'
  };

  return shape;
};

const parseNode = (line: string): CanvasShape | null => {
  const match = line.match(/^\\node(?:\[(?<styles>[^\]]*)\])?\s*at\s*(?<point>\([^)]*\))\s*\{(?<text>.*)\}\s*;?$/);

  if (!match?.groups) {
    return null;
  }

  const point = parsePoint(match.groups['point']);

  if (!point) {
    return null;
  }

  const styles = parseStyleMap(match.groups['styles']);
  const scale = Number.parseFloat(styles['scale'] ?? '1') || 1;

  const shape: TextShape = {
    id: createId(),
    name: 'Imported text',
    kind: 'text',
    stroke: 'none',
    strokeWidth: 0,
    x: point.x,
    y: point.y,
    text: match.groups['text'].trim(),
    fontSize: 0.42 * scale,
    color: styles['text'] ?? '#0f172a'
  };

  return shape;
};

const parseShape = (line: string): CanvasShape | null =>
  parseRectangle(line) ?? parseCircle(line) ?? parseEllipse(line) ?? parseLine(line) ?? parseNode(line);

export const parseTikz = (source: string): ParsedTikzResult => {
  const warnings: string[] = [];
  const shapes: CanvasShape[] = [];

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();

    if (
      !line ||
      line.startsWith('%') ||
      line.startsWith('\\begin{tikzpicture}') ||
      line.startsWith('\\end{tikzpicture}')
    ) {
      continue;
    }

    const shape = parseShape(line);

    if (shape) {
      shapes.push(shape);
      continue;
    }

    warnings.push(`Unsupported line skipped: ${line}`);
  }

  const scene: TikzScene = {
    name: 'Imported TikZ scene',
    bounds: defaultSceneBounds,
    shapes
  };

  return {
    scene,
    warnings
  };
};
