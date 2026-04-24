import type {
  CanvasShape,
  CircleShape,
  EllipseShape,
  LineShape,
  ParsedTikzResult,
  RectangleShape,
  TextShape,
  TriangleShape,
  TikzScene
} from '../models/tikz.models';
import {
  DEFAULT_ARROW_TIP_LENGTH,
  DEFAULT_ARROW_TIP_WIDTH,
  DEFAULT_TEXT_BOX_WIDTH,
  DEFAULT_TEXT_FONT_SIZE
} from '../constants/editor.constants';

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

const removeOuterBraces = (value: string): string => {
  let normalized = value.trim();
  while (normalized.startsWith('{') && normalized.endsWith('}')) {
    normalized = normalized.slice(1, -1).trim();
  }
  return normalized;
};

const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

const toHexByte = (value: number): string => clampByte(value).toString(16).padStart(2, '0');

const parseTikzRgbColor = (value: string): string | null => {
  const rgbMatch = removeOuterBraces(value).match(
    /^rgb\s*,\s*(?<scale>-?\d+(?:\.\d+)?)\s*:\s*red\s*,\s*(?<red>-?\d+(?:\.\d+)?)\s*;\s*green\s*,\s*(?<green>-?\d+(?:\.\d+)?)\s*;\s*blue\s*,\s*(?<blue>-?\d+(?:\.\d+)?)$/i
  );

  if (!rgbMatch?.groups) {
    return null;
  }

  const scale = Number(rgbMatch.groups['scale']);
  const red = Number(rgbMatch.groups['red']);
  const green = Number(rgbMatch.groups['green']);
  const blue = Number(rgbMatch.groups['blue']);

  if (
    !Number.isFinite(scale) ||
    scale === 0 ||
    !Number.isFinite(red) ||
    !Number.isFinite(green) ||
    !Number.isFinite(blue)
  ) {
    return null;
  }

  const factor = 255 / scale;
  return `#${toHexByte(red * factor)}${toHexByte(green * factor)}${toHexByte(blue * factor)}`;
};

const normalizeTikzColor = (value: string | undefined, fallback: string): string => {
  if (!value) {
    return fallback;
  }

  const normalized = removeOuterBraces(value);
  if (!normalized) {
    return fallback;
  }

  if (normalized === 'none') {
    return 'none';
  }

  const rgbColor = parseTikzRgbColor(normalized);
  if (rgbColor) {
    return rgbColor;
  }

  const hexMatch = normalized.match(/^#?([0-9a-fA-F]{6})$/);
  if (hexMatch) {
    return `#${hexMatch[1].toLowerCase()}`;
  }

  return normalized;
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
  stroke: normalizeTikzColor(styles['draw'], '#0f172a'),
  strokeWidth: styleStrokeWidth(styles)
});

const styleOpacity = (styles: Record<string, string>, key: string): number => {
  const raw = Number.parseFloat(styles[key] ?? '1');
  return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 1;
};

const parseArrowType = (styles: Record<string, string>): LineShape['arrowType'] => {
  const raw = `${styles['arrow meta'] ?? styles['>='] ?? styles['<='] ?? ''}`.toLowerCase();
  if (raw.includes('bracket')) {
    return 'bracket';
  }
  if (raw.includes('hooks')) {
    return 'hooks';
  }
  if (raw.includes('bar')) {
    return 'bar';
  }
  if (raw.includes('diamond')) {
    return 'diamond';
  }
  if (raw.includes('circle')) {
    return 'circle';
  }
  if (raw.includes('stealth')) {
    return 'stealth';
  }
  if (raw.includes('triangle')) {
    return 'triangle';
  }
  return 'latex';
};

const parseArrowColor = (styles: Record<string, string>): string => {
  const raw = styles['arrow meta'] ?? '';
  const drawMatch = raw.match(/draw=({[^}]+}|[^,\]]+)/i);
  return normalizeTikzColor(drawMatch?.[1]?.trim() ?? styles['arrows'] ?? styles['draw'], '#0f172a');
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

const parseArrowDimensionScale = (
  styles: Record<string, string>,
  key: 'length' | 'width',
  defaultValue: number
): number => {
  const raw = styles['arrow meta'] ?? '';
  const match = raw.match(new RegExp(`${key}=([^,\\]}]+)`, 'i'));
  const parsed = Number.parseFloat((match?.[1] ?? '').replace(/pt|cm|mm|ex|em/g, '').trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return parsed / defaultValue;
};

const parseArrowBendMode = (styles: Record<string, string>): LineShape['arrowBendMode'] => {
  const raw = styles['arrow meta'] ?? '';
  if (/(?:\[|,)\s*bend(?:\s*[,}\]])/i.test(raw)) {
    return 'bend';
  }
  if (/flex'\s*(?:=|[,}\]])/i.test(raw)) {
    return 'flex-prime';
  }
  if (/flex\s*(?:=|[,}\]])/i.test(raw)) {
    return 'flex';
  }
  return 'none';
};

const parseLine = (line: string): CanvasShape | null => {
  const match = line.match(/^\\draw(?:\[(?<styles>.+)\])?\s*(?<from>\([^)]*\))\s*--\s*(?<to>\([^)]*\))\s*;?$/);

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
    arrowLengthScale: parseArrowDimensionScale(styles, 'length', DEFAULT_ARROW_TIP_LENGTH),
    arrowWidthScale: parseArrowDimensionScale(styles, 'width', DEFAULT_ARROW_TIP_WIDTH),
    arrowBendMode: parseArrowBendMode(styles)
  };

  return shape;
};

const parseSmoothLine = (line: string): CanvasShape | null => {
  const match = line.match(
    /^\\draw(?:\[(?<styles>.+)\])?\s*plot\s*\[\s*smooth\s*\]\s*coordinates\s*\{\s*(?<points>.+?)\s*\}\s*;?$/
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
    arrowLengthScale: parseArrowDimensionScale(styles, 'length', DEFAULT_ARROW_TIP_LENGTH),
    arrowWidthScale: parseArrowDimensionScale(styles, 'width', DEFAULT_ARROW_TIP_WIDTH),
    arrowBendMode: parseArrowBendMode(styles)
  };

  return shape;
};

const parseRectangle = (line: string): CanvasShape | null => {
  const match = line.match(/^\\draw(?:\[(?<styles>.+)\])?\s*(?<from>\([^)]*\))\s*rectangle\s*(?<to>\([^)]*\))\s*;?$/);

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
    y: Math.min(from.y, to.y),
    width: Math.abs(to.x - from.x),
    height: Math.abs(from.y - to.y),
    fill: normalizeTikzColor(styles['fill'], 'none'),
    fillOpacity: styleOpacity(styles, 'fill opacity'),
    cornerRadius: Number.parseFloat((styles['rounded corners'] ?? '0').replace('cm', '').trim()) || 0,
    rotation: Number.parseFloat(styles['rotate'] ?? '0') || 0
  };

  return shape;
};

const parseTriangle = (line: string): CanvasShape | null => {
  const match = line.match(
    /^\\draw(?:\[(?<styles>.+)\])?\s*(?<apex>\([^)]*\))\s*--\s*(?<left>\([^)]*\))\s*--\s*(?<right>\([^)]*\))\s*--\s*cycle\s*;?$/
  );

  if (!match?.groups) {
    return null;
  }

  const apex = parsePoint(match.groups['apex']);
  const left = parsePoint(match.groups['left']);
  const right = parsePoint(match.groups['right']);

  if (!apex || !left || !right) {
    return null;
  }

  const points = [apex, left, right];
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const width = Math.max(maxX - minX, 0.2);
  const styles = parseStyleMap(match.groups['styles']);
  const unclampedApexOffset = width > 0 ? (apex.x - minX) / width : 0.5;
  const apexOffset = Math.max(0, Math.min(1, unclampedApexOffset));

  const shape: TriangleShape = {
    id: createId(),
    name: 'Imported triangle',
    kind: 'triangle',
    ...sharedStroke(styles),
    strokeOpacity: styleOpacity(styles, 'draw opacity'),
    x: minX,
    y: minY,
    width,
    height: Math.max(maxY - minY, 0.2),
    fill: normalizeTikzColor(styles['fill'], 'none'),
    fillOpacity: styleOpacity(styles, 'fill opacity'),
    cornerRadius: Number.parseFloat((styles['rounded corners'] ?? '0').replace('cm', '').trim()) || 0,
    apexOffset,
    rotation: Number.parseFloat(styles['rotate'] ?? '0') || 0
  };

  return shape;
};

const parseCircle = (line: string): CanvasShape | null => {
  const match = line.match(
    /^\\draw(?:\[(?<styles>.+)\])?\s*(?<center>\([^)]*\))\s*circle\s*\(\s*(?<radius>-?\d+(?:\.\d+)?)\s*\)\s*;?$/
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
    fill: normalizeTikzColor(styles['fill'], 'none'),
    fillOpacity: styleOpacity(styles, 'fill opacity'),
    rotation: Number.parseFloat(styles['rotate'] ?? '0') || 0
  };

  return shape;
};

const parseEllipse = (line: string): CanvasShape | null => {
  const match = line.match(
    /^\\draw(?:\[(?<styles>.+)\])?\s*(?<center>\([^)]*\))\s*ellipse\s*\(\s*(?<rx>-?\d+(?:\.\d+)?)\s*and\s*(?<ry>-?\d+(?:\.\d+)?)\s*\)\s*;?$/
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
    fill: normalizeTikzColor(styles['fill'], 'none'),
    fillOpacity: styleOpacity(styles, 'fill opacity'),
    rotation: Number.parseFloat(styles['rotate'] ?? '0') || 0
  };

  return shape;
};

const imagePlaceholder = (label: string): string =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='420' viewBox='0 0 640 420'><rect width='640' height='420' fill='#eef4ff'/><rect x='36' y='36' width='568' height='348' rx='20' fill='#dbe9ff' stroke='#9db7f2' stroke-width='6'/><text x='320' y='220' text-anchor='middle' font-family='Arial, sans-serif' font-size='34' fill='#3251a8'>${label}</text></svg>`
  );

const parseImageNode = (line: string): CanvasShape | null => {
  const match = line.match(
    /^\\node(?:\[(?<styles>.+)\])?\s*at\s*(?<point>\([^)]*\))\s*\{\\includegraphics\[(?<imageOptions>[^\]]*)\]\{(?<source>[^}]+)\}\}\s*;?$/
  );

  if (!match?.groups) {
    return null;
  }

  const point = parsePoint(match.groups['point']);
  if (!point) {
    return null;
  }

  const imageOptions = match.groups['imageOptions'] ?? '';
  const widthMatch = imageOptions.match(/(?:^|,)\s*width\s*=\s*(-?\d+(?:\.\d+)?)\s*cm/i);
  const heightMatch = imageOptions.match(/(?:^|,)\s*height\s*=\s*(-?\d+(?:\.\d+)?)\s*cm/i);
  const width = Number.parseFloat(widthMatch?.[1] ?? '');
  const height = Number.parseFloat(heightMatch?.[1] ?? '');
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 4.8;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 3.2;
  const styles = parseStyleMap(match.groups['styles']);
  const latexSource = match.groups['source'].trim();
  const imageLabel = latexSource.split('/').at(-1) ?? 'Image';
  const drawColor = styles['draw'] ? normalizeTikzColor(styles['draw'], 'none') : 'none';
  const drawWidth = drawColor === 'none' ? 0 : styleStrokeWidth(styles);

  return {
    id: createId(),
    name: 'Imported image',
    kind: 'image',
    stroke: drawColor,
    strokeOpacity: styleOpacity(styles, 'opacity'),
    strokeWidth: drawWidth,
    x: point.x - safeWidth / 2,
    y: point.y - safeHeight / 2,
    width: safeWidth,
    height: safeHeight,
    aspectRatio: safeWidth / safeHeight,
    src: imagePlaceholder(imageLabel),
    latexSource,
    rotation: Number.parseFloat(styles['rotate'] ?? '0') || 0
  };
};

const parseNode = (line: string): CanvasShape | null => {
  const match = line.match(/^\\node(?:\[(?<styles>.+)\])?\s*at\s*(?<point>\([^)]*\))\s*\{(?<text>.*)\}\s*;?$/);

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
    boxWidth:
      Number.parseFloat((styles['text width'] ?? DEFAULT_TEXT_BOX_WIDTH.toString()).replace(/cm/g, '').trim()) ||
      DEFAULT_TEXT_BOX_WIDTH,
    fontSize: DEFAULT_TEXT_FONT_SIZE * scale,
    color: normalizeTikzColor(styles['text'], '#0f172a'),
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
  parseTriangle(line) ??
  parseCircle(line) ??
  parseEllipse(line) ??
  parseSmoothLine(line) ??
  parseLine(line) ??
  parseImageNode(line) ??
  parseNode(line);

const stripLineComment = (line: string): string => {
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '%' && (index === 0 || line[index - 1] !== '\\')) {
      return line.slice(0, index);
    }
  }
  return line;
};

const tikzBeginPattern = /\\begin\{tikzpicture\}(?:\[[^\]]*\])?/;
const tikzEndPattern = /\\end\{tikzpicture\}/;
const multilineCommandPattern = /^\\(?:draw|node|path|fill|filldraw|clip)\b/;
const ignorableLinePatterns = [
  /^\\begin\{tikzpicture\}(?:\[[^\]]*\])?;?$/,
  /^\\end\{tikzpicture\};?$/,
  /^\\begin\{figure\*?\}(?:\[[^\]]*\])?;?$/,
  /^\\end\{figure\*?\};?$/,
  /^\\begin\{adjustbox\}(?:\[[^\]]*\])?\{.*\};?$/,
  /^\\end\{adjustbox\};?$/,
  /^\\begin\{center\};?$/,
  /^\\end\{center\};?$/,
  /^\\centering;?$/,
  /^\\raggedright;?$/,
  /^\\raggedleft;?$/,
  /^\\(?:tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge);?$/,
  /^\\caption(?:\[[^\]]*\])?\{.*\};?$/,
  /^\\label\{.*\};?$/
] as const;

const isIgnorableLine = (line: string): boolean => ignorableLinePatterns.some((pattern) => pattern.test(line));

const sourceLines = (source: string): readonly string[] =>
  source
    .split(/\r?\n/)
    .map((rawLine) => stripLineComment(rawLine).trim())
    .filter((line) => line.length > 0);

const extractTikzBodyLines = (lines: readonly string[]): readonly string[] => {
  const outsideLines: string[] = [];
  const bodyLines: string[] = [];
  let insideTikz = false;
  let tikzDepth = 0;

  for (const line of lines) {
    if (!insideTikz) {
      if (tikzBeginPattern.test(line)) {
        insideTikz = true;
        tikzDepth = 1;
      } else {
        outsideLines.push(line);
      }
      continue;
    }

    if (tikzBeginPattern.test(line)) {
      tikzDepth += 1;
    }

    if (tikzEndPattern.test(line)) {
      tikzDepth -= 1;
      if (tikzDepth <= 0) {
        insideTikz = false;
      }
      continue;
    }

    if (tikzDepth > 0) {
      bodyLines.push(line);
    }
  }

  return bodyLines.length > 0 ? bodyLines : outsideLines;
};

const collapseMultilineCommands = (lines: readonly string[]): readonly string[] => {
  const collapsed: string[] = [];
  let commandBuffer: string | null = null;

  for (const line of lines) {
    if (commandBuffer) {
      commandBuffer = `${commandBuffer} ${line}`.trim();
      if (line.includes(';')) {
        collapsed.push(commandBuffer);
        commandBuffer = null;
      }
      continue;
    }

    if (multilineCommandPattern.test(line) && !line.includes(';')) {
      commandBuffer = line;
      continue;
    }

    collapsed.push(line);
  }

  if (commandBuffer) {
    collapsed.push(commandBuffer);
  }

  return collapsed;
};

export const parseTikz = (source: string): ParsedTikzResult => {
  const warnings: string[] = [];
  const shapes: CanvasShape[] = [];
  const normalizedLines = collapseMultilineCommands(extractTikzBodyLines(sourceLines(source)));

  for (const line of normalizedLines) {
    if (!line || isIgnorableLine(line)) {
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
