import type {
  CanvasShape,
  CircleShape,
  EllipseShape,
  LineShape,
  ParsedTikzResult,
  Point,
  RectangleShape,
  TextShape,
  TriangleShape,
  TikzScene
} from '../models/tikz.models';
import { DEFAULT_ARROW_TIP_LENGTH, DEFAULT_ARROW_TIP_WIDTH, DEFAULT_TEXT_BOX_WIDTH, DEFAULT_TEXT_FONT_SIZE } from '../constants/editor.constants';
import type { NamedNode, ParseContext, ParsedNode, TikzBasis } from './tikz.parser.types';

const defaultSceneBounds = {
  width: 960,
  height: 640
};

const defaultTikzBasis: TikzBasis = {
  x: { x: 1, y: 0 },
  y: { x: 0, y: 1 },
  z: { x: 0, y: 1 }
};

const TIKZ_NUMBER_PATTERN = String.raw`-?\d+(?:\.\d+)?`;
const POINT_PATTERN = new RegExp(String.raw`\(\s*(${TIKZ_NUMBER_PATTERN})\s*,\s*(${TIKZ_NUMBER_PATTERN})\s*\)`);
const HEX_COLOR_PATTERN = /^#?([0-9a-fA-F]{6})$/;
const ARROW_DRAW_PATTERN = /draw=({[^}]+}|[^,\]]+)/i;
const ARROW_OPACITY_PATTERN = /opacity=([^,\]]+)/i;
const ARROW_SCALE_PATTERN = /scale=([^,\]}]+)/i;
const TRIANGLE_PATTERN = /^\\draw(?:\[(?<styles>.+)\])?\s*(?<apex>\([^)]*\))\s*--\s*(?<left>\([^)]*\))\s*--\s*(?<right>\([^)]*\))\s*--\s*cycle\s*;?$/;
const SMOOTH_LINE_PATTERN = /^\\draw(?:\[(?<styles>.+)\])?\s*plot\s*\[\s*smooth\s*\]\s*coordinates\s*\{\s*(?<points>.+?)\s*\}\s*;?$/;
const RECTANGLE_PATTERN = /^\\draw(?:\[(?<styles>.+)\])?\s*(?<from>\([^)]*\))\s*rectangle\s*(?<to>\([^)]*\))\s*;?$/;
const ELLIPSE_PATTERN = new RegExp(
  String.raw`^\\draw(?:\[(?<styles>.+)\])?\s*(?<center>\([^)]*\))\s*ellipse\s*\(\s*(?<rx>${TIKZ_NUMBER_PATTERN})\s*and\s*(?<ry>${TIKZ_NUMBER_PATTERN})\s*\)\s*;?$`
);
const IMAGE_NODE_PATTERN =
  /^\\node(?:\[(?<styles>.+)\])?\s*at\s*(?<point>\([^)]*\))\s*\{\\includegraphics\[(?<imageOptions>[^\]]*)\]\{(?<source>[^}]+)\}\}\s*;?$/;
const IMAGE_WIDTH_PATTERN = /(?:^|,)\s*width\s*=\s*(-?\d+(?:\.\d+)?)\s*cm/i;
const IMAGE_HEIGHT_PATTERN = /(?:^|,)\s*height\s*=\s*(-?\d+(?:\.\d+)?)\s*cm/i;
const POINTS_PATTERN = new RegExp(String.raw`\(\s*(${TIKZ_NUMBER_PATTERN})\s*,\s*(${TIKZ_NUMBER_PATTERN})\s*\)`, 'g');
const ARROW_BEND_PATTERN = new RegExp(String.raw`[[,]\s*bend(?:\s*[,}\]])`, 'i');
const ARROW_FLEX_PRIME_PATTERN = new RegExp(String.raw`flex'\s*(?:=|[,}\]])`, 'i');
const ARROW_FLEX_PATTERN = new RegExp(String.raw`flex\s*(?:=|[,}\]])`, 'i');

const createId = (): string => crypto.randomUUID();

const parsePoint = (value: string): { x: number; y: number } | null => {
  const match = POINT_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  return {
    x: Number(match[1]),
    y: Number(match[2])
  };
};

const parseDimension = (value: string | undefined, fallback = 0): number => {
  if (!value) {
    return fallback;
  }

  const match = /^\s*(-?\d+(?:\.\d+)?)\s*(cm|mm|pt|in)?\s*$/i.exec(removeOuterBraces(value));
  if (!match) {
    return fallback;
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) {
    return fallback;
  }

  switch ((match[2] ?? 'cm').toLowerCase()) {
    case 'mm':
      return amount / 10;
    case 'pt':
      return amount / 28.45;
    case 'in':
      return amount * 2.54;
    default:
      return amount;
  }
};

const projectCoordinate = (x: number, y: number, z: number, basis: TikzBasis): Point => ({
  x: x * basis.x.x + y * basis.y.x + z * basis.z.x,
  y: x * basis.x.y + y * basis.y.y + z * basis.z.y
});

const replaceTikzVariables = (value: string, variables: Record<string, string>): string =>
  Object.entries(variables).reduce((nextValue, [name, replacement]) => nextValue.replaceAll(name, replacement), value);

const parseCoordinateLiteral = (value: string, basis: TikzBasis, variables: Record<string, string> = {}): Point | null => {
  const normalized = replaceTikzVariables(value.trim().replace(/^\((.*)\)$/, '$1'), variables);
  const polarMatch = new RegExp(String.raw`^\s*(${TIKZ_NUMBER_PATTERN})\s*:\s*(.+?)\s*$`).exec(normalized);
  if (polarMatch) {
    const angle = Number(polarMatch[1]);
    const radius = parseDimension(polarMatch[2], Number.NaN);
    if (!Number.isFinite(angle) || !Number.isFinite(radius)) {
      return null;
    }

    const radians = (angle * Math.PI) / 180;
    return projectCoordinate(Math.cos(radians) * radius, Math.sin(radians) * radius, 0, basis);
  }

  const parts = normalized.split(/\s*,\s*/);
  if (parts.length !== 2 && parts.length !== 3) {
    return null;
  }

  const coordinates = parts.map((part) => parseDimension(part, Number.NaN));
  if (coordinates.some((coordinate) => !Number.isFinite(coordinate))) {
    return null;
  }

  return projectCoordinate(coordinates[0], coordinates[1], coordinates[2] ?? 0, basis);
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

const NAMED_TIKZ_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  gray: '#808080',
  grey: '#808080',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  orange: '#ffa500',
  purple: '#800080',
  cyan: '#00ffff',
  magenta: '#ff00ff'
};

const mixHexWithWhite = (hex: string, percent: number): string => {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const weight = Math.max(0, Math.min(100, percent)) / 100;
  return `#${toHexByte(red * weight + 255 * (1 - weight))}${toHexByte(green * weight + 255 * (1 - weight))}${toHexByte(blue * weight + 255 * (1 - weight))}`;
};

const parseTikzRgbColor = (value: string): string | null => {
  const [model, ...channels] = removeOuterBraces(value).split(/\s*[:;]\s*/);

  if (!model || channels.length !== 3 || !/^rgb\s*,/i.test(model)) {
    return null;
  }

  const scale = Number(model.slice(model.lastIndexOf(',') + 1).trim());
  const red = tikzColorChannel(channels[0], 'red');
  const green = tikzColorChannel(channels[1], 'green');
  const blue = tikzColorChannel(channels[2], 'blue');

  if (!Number.isFinite(scale) || scale === 0 || red === null || green === null || blue === null) {
    return null;
  }

  const factor = 255 / scale;
  return `#${toHexByte(red * factor)}${toHexByte(green * factor)}${toHexByte(blue * factor)}`;
};

function tikzColorChannel(value: string | undefined, channel: 'red' | 'green' | 'blue'): number | null {
  if (!value) {
    return null;
  }

  const [name, raw] = value.split(/\s*,\s*/);
  if (name?.toLowerCase() !== channel) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

const normalizeTikzColor = (value: string | undefined, fallback: string): string => {
  if (!value) {
    return fallback;
  }

  const normalized = removeOuterBraces(value);
  if (!normalized || normalized === 'true') {
    return fallback;
  }

  if (normalized === 'none') {
    return 'none';
  }

  const rgbColor = parseTikzRgbColor(normalized);
  if (rgbColor) {
    return rgbColor;
  }

  const hexMatch = HEX_COLOR_PATTERN.exec(normalized);
  if (hexMatch) {
    return `#${hexMatch[1].toLowerCase()}`;
  }

  const mixMatch = /^([a-z]+)!(\d+(?:\.\d+)?)$/i.exec(normalized);
  if (mixMatch) {
    const base = NAMED_TIKZ_COLORS[mixMatch[1].toLowerCase()];
    const percent = Number(mixMatch[2]);
    if (base && Number.isFinite(percent)) {
      return mixHexWithWhite(base, percent);
    }
  }

  const named = NAMED_TIKZ_COLORS[normalized.toLowerCase()];
  if (named) {
    return named;
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

const resolveStyleMap = (raw: string | undefined, context?: ParseContext): Record<string, string> => {
  const inlineStyles = parseStyleMap(raw);
  const resolved: Record<string, string> = {};

  if (context) {
    for (const [key, value] of Object.entries(inlineStyles)) {
      if (value === 'true' && context.styles[key]) {
        Object.assign(resolved, context.styles[key]);
      }
    }
  }

  return {
    ...resolved,
    ...Object.fromEntries(Object.entries(inlineStyles).filter(([key]) => !key.endsWith('/.style')))
  };
};

const extractBalanced = (
  source: string,
  startIndex: number,
  opening: string,
  closing: string
): { readonly value: string; readonly endIndex: number } | null => {
  if (source[startIndex] !== opening) {
    return null;
  }

  let depth = 0;
  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];
    if (character === opening) {
      depth += 1;
    } else if (character === closing) {
      depth -= 1;
      if (depth === 0) {
        return {
          value: source.slice(startIndex + 1, index),
          endIndex: index + 1
        };
      }
    }
  }

  return null;
};

const extractTikzPictureOptions = (source: string): string | undefined => {
  const beginMatch = /\\begin\{tikzpicture\}/.exec(source);
  if (!beginMatch) {
    return undefined;
  }

  const afterBegin = beginMatch.index + beginMatch[0].length;
  const optionStart = source.slice(afterBegin).search(/\S/);
  if (optionStart < 0 || source[afterBegin + optionStart] !== '[') {
    return undefined;
  }

  return extractBalanced(source, afterBegin + optionStart, '[', ']')?.value;
};

const stripTikzPictureOptionBlocks = (source: string): string => {
  let nextSource = source;
  let searchIndex = 0;

  while (searchIndex < nextSource.length) {
    const beginMatch = /\\begin\{tikzpicture\}/.exec(nextSource.slice(searchIndex));
    if (!beginMatch) {
      break;
    }

    const beginIndex = searchIndex + beginMatch.index;
    const afterBegin = beginIndex + beginMatch[0].length;
    const optionStart = nextSource.slice(afterBegin).search(/\S/);
    if (optionStart < 0 || nextSource[afterBegin + optionStart] !== '[') {
      searchIndex = afterBegin;
      continue;
    }

    const absoluteOptionStart = afterBegin + optionStart;
    const extracted = extractBalanced(nextSource, absoluteOptionStart, '[', ']');
    if (!extracted) {
      searchIndex = afterBegin;
      continue;
    }

    nextSource = `${nextSource.slice(0, absoluteOptionStart)}${nextSource.slice(extracted.endIndex)}`;
    searchIndex = absoluteOptionStart;
  }

  return nextSource;
};

const stripNewCommandBlocks = (source: string): string => {
  let nextSource = source;
  let searchIndex = 0;

  while (searchIndex < nextSource.length) {
    const commandIndex = nextSource.indexOf(String.raw`\newcommand`, searchIndex);
    if (commandIndex < 0) {
      break;
    }

    const bodyStart = nextSource.indexOf(
      '{',
      nextSource.indexOf(']', commandIndex) >= 0 ? nextSource.indexOf(']', commandIndex) : commandIndex + String.raw`\newcommand`.length
    );
    if (bodyStart < 0) {
      break;
    }

    const body = extractBalanced(nextSource, bodyStart, '{', '}');
    if (!body) {
      break;
    }

    nextSource = `${nextSource.slice(0, commandIndex)}${nextSource.slice(body.endIndex)}`;
    searchIndex = commandIndex;
  }

  return nextSource;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const splitTopLevelCommaList = (source: string): readonly string[] => {
  const values: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '{' || character === '[' || character === '(') {
      depth += 1;
    } else if ((character === '}' || character === ']' || character === ')') && depth > 0) {
      depth -= 1;
    } else if (character === ',' && depth === 0) {
      const value = source.slice(start, index).trim();
      if (value) {
        values.push(value);
      }
      start = index + 1;
    }
  }

  const tail = source.slice(start).trim();
  if (tail) {
    values.push(tail);
  }

  return values;
};

const expandForeachLoops = (source: string): string => {
  let nextSource = source;
  let searchIndex = 0;

  while (searchIndex < nextSource.length) {
    const foreachIndex = nextSource.indexOf(String.raw`\foreach`, searchIndex);
    if (foreachIndex < 0) {
      break;
    }

    const inMatch = /\s+in\s+/.exec(nextSource.slice(foreachIndex + String.raw`\foreach`.length));
    if (!inMatch) {
      searchIndex = foreachIndex + String.raw`\foreach`.length;
      continue;
    }

    const variablesStart = foreachIndex + String.raw`\foreach`.length;
    const variablesEnd = variablesStart + inMatch.index;
    const variables = nextSource
      .slice(variablesStart, variablesEnd)
      .trim()
      .split('/')
      .map((variable) => variable.trim())
      .filter(Boolean);
    const listStart = variablesEnd + inMatch[0].length;
    const listOpenIndex = nextSource.slice(listStart).search(/\S/);
    if (listOpenIndex < 0 || nextSource[listStart + listOpenIndex] !== '{') {
      searchIndex = listStart;
      continue;
    }

    const absoluteListStart = listStart + listOpenIndex;
    const list = extractBalanced(nextSource, absoluteListStart, '{', '}');
    if (!list) {
      searchIndex = listStart;
      continue;
    }

    const bodyOpenIndex = nextSource.slice(list.endIndex).search(/\S/);
    if (bodyOpenIndex < 0 || nextSource[list.endIndex + bodyOpenIndex] !== '{') {
      searchIndex = list.endIndex;
      continue;
    }

    const absoluteBodyStart = list.endIndex + bodyOpenIndex;
    const body = extractBalanced(nextSource, absoluteBodyStart, '{', '}');
    if (!body) {
      searchIndex = absoluteBodyStart;
      continue;
    }

    const expanded = splitTopLevelCommaList(list.value)
      .map((item) => {
        const values = item.split('/').map((value) => value.trim());
        return variables.reduce((nextBody, variable, index) => {
          const replacement = values[index] ?? '';
          return nextBody.replace(new RegExp(escapeRegExp(variable), 'g'), replacement);
        }, body.value);
      })
      .join('\n');

    nextSource = `${nextSource.slice(0, foreachIndex)}${expanded}${nextSource.slice(body.endIndex)}`;
    searchIndex = foreachIndex + expanded.length;
  }

  return nextSource;
};

const parseStyleDefinitions = (source: string): Record<string, Record<string, string>> => {
  const options = extractTikzPictureOptions(source);
  const optionStyles = parseStyleMap(options);

  return Object.entries(optionStyles).reduce<Record<string, Record<string, string>>>((styles, [key, value]) => {
    if (!key.endsWith('/.style')) {
      return styles;
    }

    styles[key.slice(0, -'/.style'.length)] = parseStyleMap(removeOuterBraces(value));
    return styles;
  }, {});
};

const parseTikzBasis = (source: string): TikzBasis => {
  const options = extractTikzPictureOptions(source);
  const optionStyles = parseStyleMap(options);
  const basisVector = (key: keyof TikzBasis): Point => {
    const raw = optionStyles[key];
    if (!raw) {
      return defaultTikzBasis[key];
    }

    return parseCoordinateLiteral(removeOuterBraces(raw), defaultTikzBasis) ?? defaultTikzBasis[key];
  };

  return {
    x: basisVector('x'),
    y: basisVector('y'),
    z: basisVector('z')
  };
};

const parseTikzVariables = (source: string): Record<string, string> => {
  const variables: Record<string, string> = {};
  const definitionPattern = /\\def\\(?<name>[A-Za-z]+)\{(?<value>[^}]*)\}/g;
  let match: RegExpExecArray | null = definitionPattern.exec(source);

  while (match?.groups) {
    variables[`\\${match.groups['name']}`] = match.groups['value'];
    match = definitionPattern.exec(source);
  }

  return variables;
};

const parseNodeDistance = (source: string): ParseContext['nodeDistance'] => {
  const options = extractTikzPictureOptions(source);
  const optionStyles = parseStyleMap(options);
  const rawDistance = optionStyles['node distance'];
  if (!rawDistance) {
    return { horizontal: 1, vertical: 1 };
  }

  const [verticalRaw, horizontalRaw] = rawDistance.split(/\s+and\s+/i).map((part) => part.trim());
  const vertical = parseDimension(verticalRaw, 1);
  return {
    vertical,
    horizontal: parseDimension(horizontalRaw, vertical)
  };
};

const styleStrokeWidth = (styles: Record<string, string>): number => {
  const raw = styles['line width'];

  if (styles['ultra thick'] === 'true') {
    return 0.2;
  }
  if (styles['very thick'] === 'true') {
    return 0.16;
  }
  if (styles['thick'] === 'true') {
    return 0.12;
  }
  if (styles['thin'] === 'true') {
    return 0.04;
  }

  if (!raw) {
    return 0.08;
  }

  return parseDimension(raw, 0.08);
};

const sharedStroke = (styles: Record<string, string>): { stroke: string; strokeWidth: number } => ({
  stroke: normalizeTikzColor(styles['draw'], '#0f172a'),
  strokeWidth: styleStrokeWidth(styles)
});

const parseLineStrokeStyle = (styles: Record<string, string>): LineShape['strokeStyle'] => {
  if (styles['dash dot'] === 'true' || styles['dashdotted'] === 'true') {
    return 'dash-dotted';
  }
  if (styles['loosely dashed'] === 'true') {
    return 'loosely-dashed';
  }
  if (styles['dotted'] === 'true') {
    return 'dotted';
  }
  if (styles['dashed'] === 'true') {
    return 'dashed';
  }
  return 'solid';
};

const styleOpacity = (styles: Record<string, string>, key: string): number => {
  const raw = Number.parseFloat(styles[key] ?? '1');
  return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 1;
};

const styleRotation = (styles: Record<string, string>): number => {
  const rotateAround = styles['rotate around'];
  if (rotateAround) {
    const match = /[{]?\s*(-?\d+(?:\.\d+)?)/.exec(rotateAround);
    const parsed = Number.parseFloat(match?.[1] ?? '');
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return Number.parseFloat(styles['rotate'] ?? '0') || 0;
};

const parseArrowType = (styles: Record<string, string>): LineShape['arrowType'] => {
  const raw = `${styles['arrow meta'] ?? styles['>='] ?? styles['<='] ?? ''}`.toLowerCase();
  if (raw.includes('straight barb')) {
    return 'straight-barb';
  }
  if (raw.includes('parenthesis')) {
    return 'parenthesis';
  }
  if (raw.includes('square')) {
    return 'square';
  }
  if (raw.includes('kite')) {
    return 'kite';
  }
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
  const drawMatch = ARROW_DRAW_PATTERN.exec(raw);
  return normalizeTikzColor(drawMatch?.[1]?.trim() ?? styles['arrows'] ?? styles['draw'], '#0f172a');
};

const parseArrowOpacity = (styles: Record<string, string>): number => {
  const raw = styles['arrow meta'] ?? '';
  const opacityMatch = ARROW_OPACITY_PATTERN.exec(raw);
  if (opacityMatch) {
    const parsed = Number.parseFloat(opacityMatch[1]);
    if (Number.isFinite(parsed)) {
      return Math.min(1, Math.max(0, parsed));
    }
  }
  return styleOpacity(styles, 'opacity');
};

const parseArrowOpen = (styles: Record<string, string>): boolean => /[[,]\s*open(?:\s*[,}\]])/i.test(styles['arrow meta'] ?? '');

const parseArrowRound = (styles: Record<string, string>): boolean => /[[,]\s*round(?:\s*[,}\]])/i.test(styles['arrow meta'] ?? '');

const parseArrowScale = (styles: Record<string, string>): number => {
  const raw = styles['arrow meta'] ?? '';
  const match = ARROW_SCALE_PATTERN.exec(raw);
  const parsed = Number.parseFloat(match?.[1] ?? '');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const parseArrowDimensionScale = (styles: Record<string, string>, key: 'length' | 'width', defaultValue: number): number => {
  const raw = styles['arrow meta'] ?? '';
  const match = new RegExp(`${key}=([^,\\]}]+)`, 'i').exec(raw);
  const parsed = Number.parseFloat((match?.[1] ?? '').replaceAll(/(?:pt|cm|mm|ex|em)/g, '').trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return parsed / defaultValue;
};

const parseArrowBendMode = (styles: Record<string, string>): LineShape['arrowBendMode'] => {
  const raw = styles['arrow meta'] ?? '';
  if (ARROW_BEND_PATTERN.test(raw)) {
    return 'bend';
  }
  if (ARROW_FLEX_PRIME_PATTERN.test(raw)) {
    return 'flex-prime';
  }
  if (ARROW_FLEX_PATTERN.test(raw)) {
    return 'flex';
  }
  return 'none';
};

const anchorPointForNode = (node: NamedNode, anchor: string): Point => {
  const normalizedAnchor = anchor.toLowerCase().trim();
  const vertical = normalizedAnchor.includes('north') ? node.height / 2 : normalizedAnchor.includes('south') ? -node.height / 2 : 0;
  const horizontal = normalizedAnchor.includes('east') ? node.width / 2 : normalizedAnchor.includes('west') ? -node.width / 2 : 0;

  return {
    x: node.center.x + horizontal,
    y: node.center.y + vertical
  };
};

const parseNamedAnchorPoint = (value: string, context: ParseContext): Point | null => {
  const normalized = value
    .trim()
    .replace(/^\((.*)\)$/, '$1')
    .trim();
  const match = /^([A-Za-z][\w-]*)(?:\.([A-Za-z ]+))?$/.exec(normalized);
  if (!match) {
    return null;
  }

  const node = context.nodes.get(match[1]);
  if (!node) {
    return null;
  }

  return anchorPointForNode(node, match[2] ?? 'center');
};

const findTopLevelOperator = (source: string, operator: string): number => {
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '(' || character === '[' || character === '{') {
      depth += 1;
    } else if ((character === ')' || character === ']' || character === '}') && depth > 0) {
      depth -= 1;
    } else if (character === operator && depth === 0) {
      return index;
    }
  }

  return -1;
};

const removeWrappingParens = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) {
    return trimmed;
  }

  const extracted = extractBalanced(trimmed, 0, '(', ')');
  return extracted?.endIndex === trimmed.length ? extracted.value.trim() : trimmed;
};

const parseCoordinateExpression = (value: string, context: ParseContext): Point | null => {
  const trimmed = value.trim();
  const directPoint = parseCoordinateLiteral(trimmed, context.basis, context.variables);
  if (directPoint) {
    return directPoint;
  }

  const withoutOuterParens = removeWrappingParens(trimmed);
  const calcExpression = withoutOuterParens.startsWith('$') && withoutOuterParens.endsWith('$') ? withoutOuterParens.slice(1, -1).trim() : withoutOuterParens;

  const plusIndex = findTopLevelOperator(calcExpression, '+');
  if (plusIndex >= 0) {
    const base = parseCoordinateExpression(calcExpression.slice(0, plusIndex).trim(), context);
    const delta = parseCoordinateLiteral(calcExpression.slice(plusIndex + 1).trim(), context.basis, context.variables);
    if (!base || !delta) {
      return null;
    }

    return {
      x: base.x + delta.x,
      y: base.y + delta.y
    };
  }

  const interpolationMatch = /^\((?<from>[^)]+)\)\s*!\s*(?<ratio>-?\d+(?:\.\d+)?)\s*!\s*\((?<to>[^)]+)\)$/.exec(calcExpression);
  if (interpolationMatch?.groups) {
    const from = parseCoordinateExpression(`(${interpolationMatch.groups['from']})`, context);
    const to = parseCoordinateExpression(`(${interpolationMatch.groups['to']})`, context);
    const ratio = Number(interpolationMatch.groups['ratio']);
    if (!from || !to || !Number.isFinite(ratio)) {
      return null;
    }

    return {
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio
    };
  }

  return parseNamedAnchorPoint(trimmed, context);
};

const parseLine = (line: string, context?: ParseContext): CanvasShape | null => {
  const match = /^\\draw(?:\[(?<styles>.+)\])?\s*(?<from>\([^)]*\))\s*--\s*(?<to>\([^)]*\))\s*;?$/.exec(line);

  if (!match?.groups) {
    return null;
  }

  const from = parsePoint(match.groups['from']);
  const to = parsePoint(match.groups['to']);

  if (!from || !to) {
    return null;
  }

  const styles = resolveStyleMap(match.groups['styles'], context);

  const shape: LineShape = {
    id: createId(),
    name: 'Imported line',
    kind: 'line',
    ...sharedStroke(styles),
    from,
    to,
    anchors: [],
    lineMode: 'straight',
    strokeStyle: parseLineStrokeStyle(styles),
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

const parsePointList = (raw: string): readonly Point[] => {
  const points: Point[] = [];
  POINTS_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = POINTS_PATTERN.exec(raw);

  while (match) {
    points.push({
      x: Number(match[1]),
      y: Number(match[2])
    });
    match = POINTS_PATTERN.exec(raw);
  }

  return points;
};

const parseSmoothLine = (line: string, context?: ParseContext): CanvasShape | null => {
  const match = SMOOTH_LINE_PATTERN.exec(line);

  if (!match?.groups) {
    return null;
  }

  const points = parsePointList(match.groups['points']);

  if (points.length < 2) {
    return null;
  }

  const styles = resolveStyleMap(match.groups['styles'], context);

  const shape: LineShape = {
    id: createId(),
    name: 'Imported line',
    kind: 'line',
    ...sharedStroke(styles),
    from: points[0],
    to: points.at(-1)!,
    anchors: points.slice(1, -1),
    lineMode: 'curved',
    strokeStyle: parseLineStrokeStyle(styles),
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

const parseRectangle = (line: string, context?: ParseContext): CanvasShape | null => {
  const match = RECTANGLE_PATTERN.exec(line);

  if (!match?.groups) {
    return null;
  }

  const from = parsePoint(match.groups['from']);
  const to = parsePoint(match.groups['to']);

  if (!from || !to) {
    return null;
  }

  const styles = resolveStyleMap(match.groups['styles'], context);

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
    cornerRadius: parseDimension(styles['rounded corners'], 0),
    rotation: styleRotation(styles)
  };

  return shape;
};

const parseTriangle = (line: string, context?: ParseContext): CanvasShape | null => {
  const match = TRIANGLE_PATTERN.exec(line);

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
  const styles = resolveStyleMap(match.groups['styles'], context);
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
    cornerRadius: parseDimension(styles['rounded corners'], 0),
    apexOffset,
    rotation: styleRotation(styles)
  };

  return shape;
};

const parseCircle = (line: string, context?: ParseContext): CanvasShape | null => {
  const match = /^\\draw(?:\[(?<styles>.+)\])?\s*(?<center>\([^)]*\))\s*circle\s*\(\s*(?<radius>-?\d+(?:\.\d+)?)\s*\)\s*;?$/.exec(line);

  if (!match?.groups) {
    return null;
  }

  const center = parsePoint(match.groups['center']);

  if (!center) {
    return null;
  }

  const styles = resolveStyleMap(match.groups['styles'], context);
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
    rotation: styleRotation(styles)
  };

  return shape;
};

const parseEllipse = (line: string, context?: ParseContext): CanvasShape | null => {
  const match = ELLIPSE_PATTERN.exec(line);

  if (!match?.groups) {
    return null;
  }

  const center = parsePoint(match.groups['center']);

  if (!center) {
    return null;
  }

  const styles = resolveStyleMap(match.groups['styles'], context);
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
    rotation: styleRotation(styles)
  };

  return shape;
};

const imagePlaceholder = (label: string): string =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='420' viewBox='0 0 640 420'><rect width='640' height='420' fill='#eef4ff'/><rect x='36' y='36' width='568' height='348' rx='20' fill='#dbe9ff' stroke='#9db7f2' stroke-width='6'/><text x='320' y='220' text-anchor='middle' font-family='Arial, sans-serif' font-size='34' fill='#3251a8'>${label}</text></svg>`
  );

const parseImageNode = (line: string, context?: ParseContext): CanvasShape | null => {
  const match = IMAGE_NODE_PATTERN.exec(line);

  if (!match?.groups) {
    return null;
  }

  const point = parsePoint(match.groups['point']);
  if (!point) {
    return null;
  }

  const imageOptions = match.groups['imageOptions'] ?? '';
  const widthMatch = IMAGE_WIDTH_PATTERN.exec(imageOptions);
  const heightMatch = IMAGE_HEIGHT_PATTERN.exec(imageOptions);
  const width = Number.parseFloat(widthMatch?.[1] ?? '');
  const height = Number.parseFloat(heightMatch?.[1] ?? '');
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 4.8;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 3.2;
  const styles = resolveStyleMap(match.groups['styles'], context);
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
    rotation: styleRotation(styles)
  };
};

const textAlignFromAnchor = (anchor: string): TextShape['textAlign'] => {
  if (anchor.includes('west') || anchor === 'left') {
    return 'left';
  }

  if (anchor.includes('east') || anchor === 'right') {
    return 'right';
  }

  return 'center';
};

const textAlignFromStyles = (styles: Record<string, string>, anchor: string): TextShape['textAlign'] => {
  const align = styles['align']?.toLowerCase();
  if (align === 'left' || align === 'right' || align === 'center') {
    return align;
  }

  return textAlignFromAnchor(anchor);
};

const readOptionalBalanced = (source: string, opening: string, closing: string): { readonly value: string | undefined; readonly rest: string } => {
  const trimmed = source.trimStart();
  if (!trimmed.startsWith(opening)) {
    return { value: undefined, rest: trimmed };
  }

  const extracted = extractBalanced(trimmed, 0, opening, closing);
  if (!extracted) {
    return { value: undefined, rest: trimmed };
  }

  return {
    value: extracted.value,
    rest: trimmed.slice(extracted.endIndex).trimStart()
  };
};

const parseNodeCommand = (line: string): ParsedNode | null => {
  if (!line.startsWith(String.raw`\node`)) {
    return null;
  }

  let rest = line.slice(String.raw`\node`.length).trimStart();
  const styles = readOptionalBalanced(rest, '[', ']');
  rest = styles.rest;

  let name: string | null = null;
  const nameMatch = /^\(([A-Za-z]\w*)\)/.exec(rest);
  if (nameMatch) {
    name = nameMatch[1];
    rest = rest.slice(nameMatch[0].length).trimStart();
  }

  let point: string | null = null;
  if (rest.startsWith('at')) {
    rest = rest.slice(2).trimStart();
    const coordinate = readOptionalBalanced(rest, '(', ')');
    if (!coordinate.value) {
      return null;
    }
    point = `(${coordinate.value})`;
    rest = coordinate.rest;
  }

  if (!name) {
    const lateNameMatch = /^\(([A-Za-z]\w*)\)/.exec(rest);
    if (lateNameMatch) {
      name = lateNameMatch[1];
      rest = rest.slice(lateNameMatch[0].length).trimStart();
    }
  }

  const textMatch = /^\{(?<text>[\s\S]*)\}\s*;?$/.exec(rest);
  if (!textMatch?.groups) {
    return null;
  }

  return {
    name,
    styles: styles.value,
    point,
    text: textMatch.groups['text']
  };
};

const parseTextNodeContent = (
  rawText: string
): {
  readonly text: string;
  readonly fontWeight: TextShape['fontWeight'];
  readonly fontStyle: TextShape['fontStyle'];
  readonly textDecoration: TextShape['textDecoration'];
} => {
  const trimmedText = removeOuterBraces(rawText.trim());
  const fontWeight = trimmedText.includes(String.raw`\bfseries`) || trimmedText.includes(String.raw`\textbf{`) ? 'bold' : 'normal';
  const fontStyle = trimmedText.includes(String.raw`\itshape`) ? 'italic' : 'normal';
  const textDecoration = trimmedText.includes(String.raw`\underline{`) ? 'underline' : 'none';
  const textWithoutFontCommands = trimmedText
    .replaceAll(String.raw`\bfseries`, '')
    .replaceAll(String.raw`\itshape`, '')
    .replaceAll(/\\tikz\{[^}]*\}/g, '')
    .replaceAll(/\\textbf\{([^}]*)\}/g, '$1')
    .trim();
  const underlineMatch = /^\\underline\{(?<text>.*)\}$/.exec(textWithoutFontCommands);

  return {
    text: (underlineMatch?.groups?.['text'] ?? textWithoutFontCommands).replaceAll(String.raw`\\`, '\n').trim(),
    fontWeight,
    fontStyle,
    textDecoration
  };
};

const rectangleSplitPartCount = (styles: Record<string, string>, rawText: string): number | null => {
  if (styles['rectangle split'] !== 'true' && !styles['rectangle split parts']) {
    return null;
  }

  const explicitParts = Number.parseInt(styles['rectangle split parts'] ?? '', 10);
  if (Number.isFinite(explicitParts) && explicitParts > 0) {
    return explicitParts;
  }

  const nodePartCount = rawText.match(/\\nodepart\{[^}]+\}/g)?.length ?? 0;
  return Math.max(nodePartCount + 1, 1);
};

const rectangleSplitTextParts = (rawText: string): readonly string[] =>
  removeOuterBraces(rawText.trim())
    .split(/\\nodepart\{[^}]+\}/g)
    .map((part) => parseTextNodeContent(part).text)
    .filter((part) => part.length > 0);

const nodeSizeFromStyles = (styles: Record<string, string>, splitPartCount: number | null = null): { readonly width: number; readonly height: number } => ({
  width: Math.max(parseDimension(styles['minimum width'] ?? styles['text width'] ?? styles['minimum size'], DEFAULT_TEXT_BOX_WIDTH), 0.2),
  height: Math.max(
    parseDimension(styles['minimum height'] ?? styles['minimum size'], DEFAULT_TEXT_FONT_SIZE),
    splitPartCount ? splitPartCount * DEFAULT_TEXT_FONT_SIZE * 1.55 : 0.2
  )
});

const nodeFontSizeFromStyles = (styles: Record<string, string>, scale: number): number => {
  const rawFont = styles['font'] ?? '';
  if (rawFont.includes(String.raw`\scriptsize`)) {
    return DEFAULT_TEXT_FONT_SIZE * 0.72 * scale;
  }
  if (rawFont.includes(String.raw`\footnotesize`)) {
    return DEFAULT_TEXT_FONT_SIZE * 0.82 * scale;
  }
  if (rawFont.includes(String.raw`\small`)) {
    return DEFAULT_TEXT_FONT_SIZE * 0.9 * scale;
  }
  if (rawFont.includes(String.raw`\large`)) {
    return DEFAULT_TEXT_FONT_SIZE * 1.15 * scale;
  }

  return DEFAULT_TEXT_FONT_SIZE * scale;
};

const fitBoundsFromStyles = (
  styles: Record<string, string>,
  context: ParseContext
): { readonly center: Point; readonly width: number; readonly height: number } | null => {
  const rawFit = styles['fit'];
  if (!rawFit) {
    return null;
  }

  const nodeNames = [...rawFit.matchAll(/\(([A-Za-z][\w-]*)\)/g)].map((match) => match[1]);
  const nodes = nodeNames.map((name) => context.nodes.get(name)).filter((node): node is NamedNode => Boolean(node));
  if (!nodes.length) {
    return null;
  }

  const padding = parseDimension(styles['inner sep'], 0.25);
  const left = Math.min(...nodes.map((node) => node.center.x - node.width / 2)) - padding;
  const right = Math.max(...nodes.map((node) => node.center.x + node.width / 2)) + padding;
  const bottom = Math.min(...nodes.map((node) => node.center.y - node.height / 2)) - padding;
  const top = Math.max(...nodes.map((node) => node.center.y + node.height / 2)) + padding;

  return {
    center: { x: (left + right) / 2, y: (bottom + top) / 2 },
    width: Math.max(right - left, 0.2),
    height: Math.max(top - bottom, 0.2)
  };
};

const labelFromStyles = (styles: Record<string, string>): { readonly text: string; readonly position: 'above' | 'below' | 'left' | 'right' } | null => {
  const rawLabel = styles['label'];
  if (!rawLabel) {
    return null;
  }

  const normalized = removeOuterBraces(rawLabel);
  const match = /(?:\[[^\]]*\])?(above|below|left|right)\s*:\s*(.+)$/i.exec(normalized);
  if (!match) {
    return null;
  }

  return {
    position: match[1].toLowerCase() as 'above' | 'below' | 'left' | 'right',
    text: parseTextNodeContent(match[2]).text
  };
};

const rawLabelIsBold = (rawLabel: string | undefined): boolean => rawLabel?.includes(String.raw`\bfseries`) ?? false;

const centerFromAnchoredPoint = (point: Point, size: { readonly width: number; readonly height: number }, anchor: string): Point => {
  const normalizedAnchor = anchor.toLowerCase();
  return {
    x: point.x + (normalizedAnchor.includes('west') ? size.width / 2 : normalizedAnchor.includes('east') ? -size.width / 2 : 0),
    y: point.y + (normalizedAnchor.includes('south') ? size.height / 2 : normalizedAnchor.includes('north') ? -size.height / 2 : 0)
  };
};

const nodeCenterFromStyles = (
  styles: Record<string, string>,
  context: ParseContext,
  size: { readonly width: number; readonly height: number }
): Point | null => {
  for (const direction of ['below', 'above', 'right', 'left'] as const) {
    const raw = styles[direction];
    const match = /^(?:(?<distance>-?\d+(?:\.\d+)?\s*(?:cm|mm|pt|in)?)\s+)?of\s+(?<node>[A-Za-z][\w-]*)$/i.exec(raw ?? '');
    if (!match?.groups) {
      continue;
    }

    const target = context.nodes.get(match.groups['node']);
    if (!target) {
      return null;
    }

    const distance = parseDimension(
      match.groups['distance'],
      direction === 'below' || direction === 'above' ? context.nodeDistance.vertical : context.nodeDistance.horizontal
    );
    switch (direction) {
      case 'below':
        return { x: target.center.x, y: target.center.y - target.height / 2 - distance - size.height / 2 };
      case 'above':
        return { x: target.center.x, y: target.center.y + target.height / 2 + distance + size.height / 2 };
      case 'right':
        return { x: target.center.x + target.width / 2 + distance + size.width / 2, y: target.center.y };
      case 'left':
        return { x: target.center.x - target.width / 2 - distance - size.width / 2, y: target.center.y };
    }
  }

  return null;
};

const applyNodeShifts = (point: Point, styles: Record<string, string>): Point => ({
  x: point.x + parseDimension(styles['xshift'], 0),
  y: point.y + parseDimension(styles['yshift'], 0)
});

const parseNode = (line: string, context: ParseContext): readonly CanvasShape[] | null => {
  const parsedNode = parseNodeCommand(line);

  if (!parsedNode) {
    return null;
  }

  const styles = resolveStyleMap(parsedNode.styles, context);
  const scale = Number.parseFloat(styles['scale'] ?? '1') || 1;
  const anchor = styles['anchor'] ?? 'center';
  const textContent = parseTextNodeContent(parsedNode.text);
  const splitPartCount = rectangleSplitPartCount(styles, parsedNode.text);
  const fittedBounds = fitBoundsFromStyles(styles, context);
  const size = fittedBounds ? { width: fittedBounds.width, height: fittedBounds.height } : nodeSizeFromStyles(styles, splitPartCount);
  const rawPoint = parsedNode.point
    ? parseCoordinateExpression(parsedNode.point, context)
    : (fittedBounds?.center ?? nodeCenterFromStyles(styles, context, size) ?? { x: 0, y: 0 });

  if (!rawPoint) {
    return null;
  }
  const point = applyNodeShifts(fittedBounds ? rawPoint : centerFromAnchoredPoint(rawPoint, size, anchor), styles);

  const shape: TextShape = {
    id: createId(),
    name: 'Imported text',
    kind: 'text',
    stroke: 'none',
    strokeOpacity: 1,
    strokeWidth: 0,
    x: point.x,
    y: point.y,
    text: textContent.text,
    textBox: Boolean(styles['text width'] || styles['minimum width'] || textContent.text.includes('\n')),
    boxWidth: parseDimension(styles['text width'] ?? styles['minimum width'], DEFAULT_TEXT_BOX_WIDTH),
    fontSize: nodeFontSizeFromStyles(styles, scale),
    color: normalizeTikzColor(styles['text'], '#0f172a'),
    colorOpacity: styleOpacity(styles, 'text opacity'),
    fontWeight: textContent.fontWeight,
    fontStyle: textContent.fontStyle,
    textDecoration: textContent.textDecoration,
    textAlign: textAlignFromStyles(styles, anchor),
    rotation: styleRotation(styles)
  };

  const shapes: CanvasShape[] = [];
  const hasCircle = styles['circle'] === 'true';
  const hasVisualNode = Boolean(
    styles['draw'] || styles['fill'] || styles['minimum width'] || styles['minimum height'] || styles['minimum size'] || styles['fit']
  );
  if (hasCircle) {
    const radius = Math.max(size.width, size.height) / 2;
    shapes.push({
      id: createId(),
      name: parsedNode.name ?? 'Imported node',
      kind: 'circle',
      ...sharedStroke(styles),
      strokeOpacity: styleOpacity(styles, 'draw opacity'),
      cx: point.x,
      cy: point.y,
      r: radius,
      fill: normalizeTikzColor(styles['fill'], 'none'),
      fillOpacity: styleOpacity(styles, 'fill opacity'),
      rotation: styleRotation(styles)
    });
  } else if (hasVisualNode) {
    shapes.push({
      id: createId(),
      name: parsedNode.name ?? 'Imported node',
      kind: 'rectangle',
      ...sharedStroke(styles),
      strokeOpacity: styleOpacity(styles, 'draw opacity'),
      x: point.x - size.width / 2,
      y: point.y - size.height / 2,
      width: size.width,
      height: size.height,
      fill: normalizeTikzColor(styles['fill'], 'none'),
      fillOpacity: styleOpacity(styles, 'fill opacity'),
      cornerRadius: parseDimension(styles['rounded corners'], 0),
      rotation: styleRotation(styles)
    });
  }

  if (splitPartCount && hasVisualNode) {
    const parts = rectangleSplitTextParts(parsedNode.text);
    const rowHeight = size.height / splitPartCount;
    for (let index = 1; index < splitPartCount; index += 1) {
      const y = point.y + size.height / 2 - rowHeight * index;
      shapes.push(createImportedLine(styles, { x: point.x - size.width / 2, y }, { x: point.x + size.width / 2, y }, [], 'straight', 'Imported split divider'));
    }

    parts.slice(0, splitPartCount).forEach((part, index) => {
      const partContent = parseTextNodeContent(part);
      const textAlign = textAlignFromStyles(styles, anchor);
      const horizontalPadding = 0.16;
      shapes.push({
        ...shape,
        id: createId(),
        name: index === 0 ? 'Imported entity title' : 'Imported entity field',
        x: textAlign === 'left' ? point.x - size.width / 2 + horizontalPadding : textAlign === 'right' ? point.x + size.width / 2 - horizontalPadding : point.x,
        y: point.y + size.height / 2 - rowHeight * (index + 0.5) - DEFAULT_TEXT_FONT_SIZE * 0.18,
        text: partContent.text,
        textBox: textAlign !== 'center',
        boxWidth: Math.max(size.width - horizontalPadding * 2, 0.2),
        fontWeight: partContent.fontWeight,
        fontStyle: partContent.fontStyle,
        textDecoration: partContent.textDecoration,
        textAlign
      });
    });
  } else if (textContent.text) {
    shapes.push(shape);
  }

  const label = labelFromStyles(styles);
  if (label) {
    const offset = 0.32;
    shapes.push({
      id: createId(),
      name: 'Imported label',
      kind: 'text',
      stroke: 'none',
      strokeOpacity: 1,
      strokeWidth: 0,
      x: point.x + (label.position === 'right' ? size.width / 2 + offset : label.position === 'left' ? -size.width / 2 - offset : 0),
      y: point.y + (label.position === 'above' ? size.height / 2 + offset : label.position === 'below' ? -size.height / 2 - offset : 0),
      text: label.text,
      textBox: false,
      boxWidth: DEFAULT_TEXT_BOX_WIDTH,
      fontSize: nodeFontSizeFromStyles(styles, scale),
      color: '#0f172a',
      colorOpacity: 1,
      fontWeight: rawLabelIsBold(styles['label']) ? 'bold' : 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'center',
      rotation: 0
    });
  }

  if (parsedNode.name) {
    context.nodes.set(parsedNode.name, {
      center: point,
      width: hasVisualNode ? size.width : Math.max(shape.boxWidth, 0.8),
      height: hasVisualNode ? size.height : Math.max(shape.fontSize, 0.4)
    });
  }

  return shapes;
};

const readCoordinateToken = (source: string): { readonly token: string; readonly rest: string } | null => {
  const trimmed = source.trimStart();
  if (!trimmed.startsWith('(')) {
    return null;
  }

  const extracted = extractBalanced(trimmed, 0, '(', ')');
  if (!extracted) {
    return null;
  }

  return {
    token: `(${extracted.value})`,
    rest: trimmed.slice(extracted.endIndex).trimStart()
  };
};

const createImportedLine = (
  styles: Record<string, string>,
  from: Point,
  to: Point,
  anchors: readonly Point[] = [],
  lineMode: LineShape['lineMode'] = 'straight',
  name = 'Imported line'
): LineShape => ({
  id: createId(),
  name,
  kind: 'line',
  ...sharedStroke(styles),
  from,
  to,
  anchors,
  lineMode,
  strokeStyle: parseLineStrokeStyle(styles),
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
});

const parseInlinePathNode = (source: string): { readonly text: string; readonly styles: string | undefined; readonly rest: string } | null => {
  const trimmed = source.trimStart();
  if (!trimmed.startsWith('node')) {
    return null;
  }

  let rest = trimmed.slice('node'.length).trimStart();
  const styles = readOptionalBalanced(rest, '[', ']');
  rest = styles.rest;
  const text = readOptionalBalanced(rest, '{', '}');
  if (text.value === undefined) {
    return null;
  }

  return {
    text: text.value,
    styles: styles.value,
    rest: text.rest
  };
};

const readRequiredBraceArguments = (source: string, count: number): readonly string[] | null => {
  const args: string[] = [];
  let rest = source.trim();

  for (let index = 0; index < count; index += 1) {
    const extracted = readOptionalBalanced(rest, '{', '}');
    if (extracted.value === undefined) {
      return null;
    }
    args.push(extracted.value);
    rest = extracted.rest;
  }

  return rest.replace(/;$/, '').trim() ? null : args;
};

const registerCoordinate = (context: ParseContext, name: string, point: Point): void => {
  context.nodes.set(name, {
    center: point,
    width: 0,
    height: 0
  });
};

const cuboidPoint = (origin: Point, basis: TikzBasis, width: number, depth: number, height: number, x: number, y: number, z: number): Point => ({
  x: origin.x + width * x * basis.x.x + depth * y * basis.y.x + height * z * basis.z.x,
  y: origin.y + width * x * basis.x.y + depth * y * basis.y.y + height * z * basis.z.y
});

const parseCuboidInvocation = (line: string, context: ParseContext): readonly CanvasShape[] | null => {
  if (!line.startsWith(String.raw`\cuboid`)) {
    return null;
  }

  const args = readRequiredBraceArguments(line.slice(String.raw`\cuboid`.length), 5);
  if (!args) {
    return null;
  }

  const [name, originRaw, widthRaw, depthRaw, heightRaw] = args;
  const origin = parseCoordinateExpression(originRaw, context);
  const width = parseDimension(widthRaw, Number.NaN);
  const depth = parseDimension(depthRaw, Number.NaN);
  const height = parseDimension(heightRaw, Number.NaN);
  if (!origin || !Number.isFinite(width) || !Number.isFinite(depth) || !Number.isFinite(height)) {
    return null;
  }

  const points: Record<string, Point> = {
    A: cuboidPoint(origin, context.basis, width, depth, height, 0, 0, 0),
    B: cuboidPoint(origin, context.basis, width, depth, height, 1, 0, 0),
    C: cuboidPoint(origin, context.basis, width, depth, height, 1, 1, 0),
    D: cuboidPoint(origin, context.basis, width, depth, height, 0, 1, 0),
    E: cuboidPoint(origin, context.basis, width, depth, height, 0, 0, 1),
    F: cuboidPoint(origin, context.basis, width, depth, height, 1, 0, 1),
    G: cuboidPoint(origin, context.basis, width, depth, height, 1, 1, 1),
    H: cuboidPoint(origin, context.basis, width, depth, height, 0, 1, 1)
  };

  for (const [suffix, point] of Object.entries(points)) {
    registerCoordinate(context, `${name}-${suffix}`, point);
  }

  const styles = resolveStyleMap('edge', context);
  const edge = (from: keyof typeof points, to: keyof typeof points): LineShape =>
    createImportedLine(styles, points[from], points[to], [], 'straight', `${name} edge`);
  return [
    edge('A', 'B'),
    edge('B', 'C'),
    edge('C', 'D'),
    edge('D', 'A'),
    edge('E', 'F'),
    edge('F', 'G'),
    edge('G', 'H'),
    edge('H', 'E'),
    edge('A', 'E'),
    edge('B', 'F'),
    edge('C', 'G'),
    edge('D', 'H')
  ];
};

const parseDrawPath = (line: string, context: ParseContext): readonly CanvasShape[] | null => {
  if (!line.startsWith(String.raw`\draw`)) {
    return null;
  }

  let rest = line.slice(String.raw`\draw`.length).trimStart();
  const styleBlock = readOptionalBalanced(rest, '[', ']');
  rest = styleBlock.rest;
  const styles = resolveStyleMap(styleBlock.value, context);
  const fromToken = readCoordinateToken(rest);
  if (!fromToken) {
    return null;
  }

  const from = parseCoordinateExpression(fromToken.token, context);
  if (!from) {
    return null;
  }

  rest = fromToken.rest;
  let lineMode: LineShape['lineMode'] = 'straight';
  let orthogonalMode: '|-' | '-|' | null = null;
  if (rest.startsWith('--')) {
    rest = rest.slice(2).trimStart();
  } else if (rest.startsWith('|-') || rest.startsWith('-|')) {
    orthogonalMode = rest.startsWith('|-') ? '|-' : '-|';
    rest = rest.slice(2).trimStart();
  } else if (rest.startsWith('to')) {
    rest = rest.slice(2).trimStart();
    const toOptions = readOptionalBalanced(rest, '[', ']');
    if (toOptions.value) {
      lineMode = 'curved';
    }
    rest = toOptions.rest;
  } else {
    return null;
  }

  let inlineNode = parseInlinePathNode(rest);
  if (inlineNode) {
    rest = inlineNode.rest;
  }

  let relativeTarget = false;
  if (rest.startsWith('++')) {
    relativeTarget = true;
    rest = rest.slice(2).trimStart();
  } else if (rest.startsWith('+')) {
    relativeTarget = true;
    rest = rest.slice(1).trimStart();
  }

  const toToken = readCoordinateToken(rest);
  if (!toToken) {
    return null;
  }

  const parsedTo = parseCoordinateExpression(toToken.token, context);
  if (!parsedTo) {
    return null;
  }
  const to = relativeTarget ? { x: from.x + parsedTo.x, y: from.y + parsedTo.y } : parsedTo;

  let trailing = toToken.rest.replace(/;$/, '').trim();
  if (!inlineNode) {
    const trailingNode = parseInlinePathNode(trailing);
    if (trailingNode) {
      inlineNode = trailingNode;
      trailing = trailingNode.rest.replace(/;$/, '').trim();
    }
  }
  if (trailing) {
    return null;
  }

  const anchors =
    orthogonalMode === '|-'
      ? [{ x: from.x, y: to.y }]
      : orthogonalMode === '-|'
        ? [{ x: to.x, y: from.y }]
        : lineMode === 'curved'
          ? [{ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }]
          : [];
  const shapes: CanvasShape[] = [createImportedLine(styles, from, to, anchors, lineMode, styles['decorate'] === 'true' ? 'Imported brace' : 'Imported line')];

  if (inlineNode) {
    const nodeStyles = resolveStyleMap(inlineNode.styles, context);
    const textContent = parseTextNodeContent(inlineNode.text);
    shapes.push({
      id: createId(),
      name: 'Imported label',
      kind: 'text',
      stroke: 'none',
      strokeOpacity: 1,
      strokeWidth: 0,
      x:
        (from.x + to.x) / 2 +
        (nodeStyles['right'] ? parseDimension(nodeStyles['right'], 0.35) : nodeStyles['left'] ? -parseDimension(nodeStyles['left'], 0.35) : 0),
      y: (from.y + to.y) / 2,
      text: textContent.text,
      textBox: textContent.text.includes('\n'),
      boxWidth: DEFAULT_TEXT_BOX_WIDTH,
      fontSize: DEFAULT_TEXT_FONT_SIZE,
      color: normalizeTikzColor(nodeStyles['text'], '#0f172a'),
      colorOpacity: styleOpacity(nodeStyles, 'text opacity'),
      fontWeight: textContent.fontWeight,
      fontStyle: textContent.fontStyle,
      textDecoration: textContent.textDecoration,
      textAlign: textAlignFromAnchor(nodeStyles['anchor'] ?? (nodeStyles['left'] ? 'east' : nodeStyles['right'] ? 'west' : 'center')),
      rotation: styleRotation(nodeStyles)
    });
  }

  return shapes;
};

const parseShape = (line: string, context: ParseContext): readonly CanvasShape[] | null => {
  const cuboid = parseCuboidInvocation(line, context);
  if (cuboid) {
    return cuboid;
  }

  const drawPath = parseDrawPath(line, context);
  if (drawPath) {
    return drawPath;
  }

  const shape =
    parseRectangle(line, context) ??
    parseTriangle(line, context) ??
    parseCircle(line, context) ??
    parseEllipse(line, context) ??
    parseSmoothLine(line, context) ??
    parseLine(line, context) ??
    parseImageNode(line, context);

  if (shape) {
    return [shape];
  }

  return parseNode(line, context);
};

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
  /^\\begin\{scope\}(?:\[[^\]]*\])?;?$/,
  /^\\end\{scope\};?$/,
  /^\\begin\{center\};?$/,
  /^\\end\{center\};?$/,
  /^\\centering;?$/,
  /^\\raggedright;?$/,
  /^\\raggedleft;?$/,
  /^\\(?:tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge);?$/,
  /^\\caption(?:\[[^\]]*\])?\{.*\};?$/,
  /^\\label\{.*\};?$/,
  /^\\def\\[A-Za-z]+\{.*\};?$/
] as const;

const isIgnorableLine = (line: string): boolean => ignorableLinePatterns.some((pattern) => pattern.test(line));

const sourceLines = (source: string): readonly string[] =>
  source
    .split(/\r?\n/)
    .map((rawLine) => stripLineComment(rawLine).trim())
    .filter((line) => line.length > 0);

interface TikzBodyExtractionState {
  readonly insideTikz: boolean;
  readonly tikzDepth: number;
}

const startTikzBodyIfNeeded = (line: string, state: TikzBodyExtractionState, outsideLines: string[]): TikzBodyExtractionState => {
  if (tikzBeginPattern.test(line)) {
    return { insideTikz: true, tikzDepth: 1 };
  }

  outsideLines.push(line);
  return state;
};

const collectTikzBodyLine = (line: string, state: TikzBodyExtractionState, bodyLines: string[]): TikzBodyExtractionState => {
  let tikzDepth = state.tikzDepth + (tikzBeginPattern.test(line) ? 1 : 0);
  if (tikzEndPattern.test(line)) {
    tikzDepth -= 1;
    return { insideTikz: tikzDepth > 0, tikzDepth };
  }

  bodyLines.push(line);
  return { insideTikz: true, tikzDepth };
};

const extractTikzBodyLines = (lines: readonly string[]): readonly string[] => {
  const outsideLines: string[] = [];
  const bodyLines: string[] = [];
  let state: TikzBodyExtractionState = { insideTikz: false, tikzDepth: 0 };

  for (const line of lines) {
    state = state.insideTikz ? collectTikzBodyLine(line, state, bodyLines) : startTikzBodyIfNeeded(line, state, outsideLines);
  }

  return bodyLines.length > 0 ? bodyLines : outsideLines;
};

const collapseMultilineCommands = (lines: readonly string[]): readonly string[] => {
  const collapsed: string[] = [];
  let commandBuffer: string | null = null;

  for (const line of lines) {
    if (commandBuffer) {
      commandBuffer = `${commandBuffer} ${line}`.trim();
      if (line.endsWith(';')) {
        collapsed.push(commandBuffer);
        commandBuffer = null;
      }
      continue;
    }

    if (multilineCommandPattern.test(line) && !line.endsWith(';')) {
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
  const rawTikzLines: string[] = [];
  const preprocessedSource = expandForeachLoops(stripNewCommandBlocks(stripTikzPictureOptionBlocks(source)));
  const normalizedLines = collapseMultilineCommands(extractTikzBodyLines(sourceLines(preprocessedSource)));
  const context: ParseContext = {
    styles: parseStyleDefinitions(source),
    nodes: new Map(),
    basis: parseTikzBasis(source),
    variables: parseTikzVariables(source),
    nodeDistance: parseNodeDistance(source)
  };

  for (const line of normalizedLines) {
    if (!line || isIgnorableLine(line)) {
      continue;
    }

    const parsedShapes = parseShape(line, context);

    if (parsedShapes) {
      shapes.push(...parsedShapes);
      continue;
    }

    rawTikzLines.push(line);
    warnings.push(`Unsupported line preserved as raw TikZ: ${line}`);
  }

  const scene: TikzScene = {
    name: 'Imported TikZ scene',
    bounds: defaultSceneBounds,
    shapes,
    rawTikzLines
  };

  return {
    scene,
    warnings
  };
};
