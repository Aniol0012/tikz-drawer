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

  const entries: string[] = [];
  let current = '';
  let depth = 0;

  for (const character of raw) {
    if (character === ',' && depth === 0) {
      const entry = current.trim();
      if (entry) {
        entries.push(entry);
      }
      current = '';
      continue;
    }

    if (character === '[' || character === '{' || character === '(') {
      depth += 1;
    } else if ((character === ']' || character === '}' || character === ')') && depth > 0) {
      depth -= 1;
    }

    current += character;
  }

  const trailingEntry = current.trim();
  if (trailingEntry) {
    entries.push(trailingEntry);
  }

  return entries.reduce<Record<string, string>>((styles, entry) => {
    if (entry === '->' || entry === '<-' || entry === '<->') {
      styles[entry] = 'true';
      return styles;
    }

    if (entry.startsWith('-{') || entry.startsWith('{')) {
      const hasStart = entry.startsWith('{');
      const hasEnd = entry.includes('}-{') || entry.startsWith('-{');
      if (hasStart && hasEnd) {
        styles['<->'] = 'true';
      } else if (hasStart) {
        styles['<-'] = 'true';
      } else if (hasEnd) {
        styles['->'] = 'true';
      }
      styles['arrow meta'] = entry;
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

const styleOpacity = (styles: Record<string, string>, key: string): number => {
  const raw = Number.parseFloat(styles[key] ?? '1');
  return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 1;
};

const parseArrowType = (styles: Record<string, string>): LineShape['arrowType'] => {
  const raw = `${styles['arrow meta'] ?? styles['>='] ?? styles['<='] ?? ''}`.toLowerCase();
  if (raw.includes('bracket')) return 'bracket';
  if (raw.includes('hooks')) return 'hooks';
  if (raw.includes('bar')) return 'bar';
  if (raw.includes('diamond')) return 'diamond';
  if (raw.includes('circle')) return 'circle';
  if (raw.includes('stealth')) return 'stealth';
  if (raw.includes('triangle')) return 'triangle';
  return 'latex';
};

const parseArrowColor = (styles: Record<string, string>): string => {
  const raw = styles['arrow meta'] ?? '';
  const drawMatch = raw.match(/draw=({[^}]+}|[^,\]]+)/i);
  return drawMatch?.[1]?.trim() ?? styles['arrows'] ?? styles['draw'] ?? '#0f172a';
};

const parseArrowOpacity = (styles: Record<string, string>): number => {
  const raw = styles['arrow meta'] ?? '';
  const opacityMatch = raw.match(/opacity=([^,\]]+)/i);
  if (opacityMatch) {
    const parsed = Number.parseFloat(opacityMatch[1]);
    if (Number.isFinite(parsed)) {
      return Math.min(1, Math.max(0, parsed));
    }
  }
  return styleOpacity(styles, 'opacity');
};

const parseArrowOpen = (styles: Record<string, string>): boolean =>
  /(?:\[|,)\s*open(?:\s*[,}\]])/i.test(styles['arrow meta'] ?? '');

const parseArrowRound = (styles: Record<string, string>): boolean =>
  /(?:\[|,)\s*round(?:\s*[,}\]])/i.test(styles['arrow meta'] ?? '');

const parseArrowScale = (styles: Record<string, string>): number => {
  const raw = styles['arrow meta'] ?? '';
  const match = raw.match(/scale=([^,\]}]+)/i);
  const parsed = Number.parseFloat(match?.[1] ?? '');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const parseArrowBendMode = (styles: Record<string, string>): LineShape['arrowBendMode'] => {
  const raw = styles['arrow meta'] ?? '';
  if (/(?:\[|,)\s*bend(?:\s*[,}\]])/i.test(raw)) return 'bend';
  if (/flex'\s*(?:=|[,}\]])/i.test(raw)) return 'flex-prime';
  if (/flex\s*(?:=|[,}\]])/i.test(raw)) return 'flex';
  return 'none';
};

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
    anchors: [],
    lineMode: 'straight',
    arrowStart: styles['<-'] === 'true' || styles['<->'] === 'true',
    arrowEnd: styles['->'] === 'true' || styles['<->'] === 'true',
    strokeOpacity: styleOpacity(styles, 'draw opacity'),
    arrowType: parseArrowType(styles),
    arrowColor: parseArrowColor(styles),
    arrowOpacity: parseArrowOpacity(styles),
    arrowOpen: parseArrowOpen(styles),
    arrowRound: parseArrowRound(styles),
    arrowScale: parseArrowScale(styles),
    arrowBendMode: parseArrowBendMode(styles)
  };

  return shape;
};

const parseSmoothLine = (line: string): CanvasShape | null => {
  const match = line.match(
    /^\\draw(?:\[(?<styles>[^\]]*)\])?\s*plot\s*\[\s*smooth\s*\]\s*coordinates\s*\{\s*(?<points>.+?)\s*\}\s*;?$/
  );

  if (!match?.groups) {
    return null;
  }

  const points = Array.from(
    match.groups['points'].matchAll(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g)
  ).map(([, x, y]) => ({
    x: Number(x),
    y: Number(y)
  }));

  if (points.length < 2) {
    return null;
  }

  const styles = parseStyleMap(match.groups['styles']);

  const shape: LineShape = {
    id: createId(),
    name: 'Imported line',
    kind: 'line',
    ...sharedStroke(styles),
    from: points[0],
    to: points.at(-1)!,
    anchors: points.slice(1, -1),
    lineMode: 'curved',
    arrowStart: styles['<-'] === 'true' || styles['<->'] === 'true',
    arrowEnd: styles['->'] === 'true' || styles['<->'] === 'true',
    strokeOpacity: styleOpacity(styles, 'draw opacity'),
    arrowType: parseArrowType(styles),
    arrowColor: parseArrowColor(styles),
    arrowOpacity: parseArrowOpacity(styles),
    arrowOpen: parseArrowOpen(styles),
    arrowRound: parseArrowRound(styles),
    arrowScale: parseArrowScale(styles),
    arrowBendMode: parseArrowBendMode(styles)
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
    strokeOpacity: styleOpacity(styles, 'draw opacity'),
    x: Math.min(from.x, to.x),
    y: Math.max(from.y, to.y),
    width: Math.abs(to.x - from.x),
    height: Math.abs(from.y - to.y),
    fill: styles['fill'] ?? 'none',
    fillOpacity: styleOpacity(styles, 'fill opacity'),
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
    strokeOpacity: styleOpacity(styles, 'draw opacity'),
    cx: center.x,
    cy: center.y,
    r: Number(match.groups['radius']),
    fill: styles['fill'] ?? 'none',
    fillOpacity: styleOpacity(styles, 'fill opacity')
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
    strokeOpacity: styleOpacity(styles, 'draw opacity'),
    cx: center.x,
    cy: center.y,
    rx: Number(match.groups['rx']),
    ry: Number(match.groups['ry']),
    fill: styles['fill'] ?? 'none',
    fillOpacity: styleOpacity(styles, 'fill opacity')
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
  const anchor = styles['anchor'] ?? 'center';

  const shape: TextShape = {
    id: createId(),
    name: 'Imported text',
    kind: 'text',
    stroke: 'none',
    strokeOpacity: 1,
    strokeWidth: 0,
    x: point.x,
    y: point.y,
    text: match.groups['text'].trim(),
    textBox: /text width=/.test(match.groups['styles'] ?? ''),
    boxWidth: Number.parseFloat((styles['text width'] ?? '4').replace(/cm/g, '').trim()) || 4,
    fontSize: 0.42 * scale,
    color: styles['text'] ?? '#0f172a',
    colorOpacity: styleOpacity(styles, 'text opacity'),
    fontWeight: match.groups['text'].includes('\\bfseries') ? 'bold' : 'normal',
    fontStyle: match.groups['text'].includes('\\itshape') ? 'italic' : 'normal',
    textDecoration: match.groups['text'].includes('\\underline{') ? 'underline' : 'none',
    textAlign: anchor === 'west' ? 'left' : anchor === 'east' ? 'right' : 'center',
    rotation: Number.parseFloat(styles['rotate'] ?? '0') || 0
  };

  return shape;
};

const parseShape = (line: string): CanvasShape | null =>
  parseRectangle(line) ??
  parseCircle(line) ??
  parseEllipse(line) ??
  parseSmoothLine(line) ??
  parseLine(line) ??
  parseNode(line);

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
