import type {
  ArrowTipKind,
  CanvasShape,
  CircleShape,
  EllipseShape,
  ImageShape,
  LineShape,
  RectangleShape,
  TriangleShape,
  TextShape,
  TikzScene
} from '../models/tikz.models';
import {
  DEFAULT_EDITOR_SCALE,
  DEFAULT_ARROW_TIP_LENGTH,
  DEFAULT_ARROW_TIP_WIDTH,
  DEFAULT_TEXT_FONT_SIZE,
  MIN_RENDER_STROKE_WIDTH,
  SHAPE_STROKE_SCALE_FACTOR
} from '../constants/editor.constants';
import { effectiveRectangleCornerRadius, effectiveTriangleCornerRadius } from '../utils/editor-geometry.utils';
import { REGEX } from '../../../shared/regex/regex.utils';

export interface TikzExportBundle {
  readonly imports: string;
  readonly code: string;
}

export type LatexColorMode = 'direct-rgb' | 'define-colors';

export interface TikzExportOptions {
  readonly colorMode?: LatexColorMode;
}

const INLINE_MATH_COMMANDS = [
  'leftrightarrow',
  'rightarrow',
  'Leftrightarrow',
  'leftarrow',
  'Rightarrow',
  'downarrow',
  'uparrow',
  'Leftarrow',
  'epsilon',
  'partial',
  'exists',
  'forall',
  'lambda',
  'alpha',
  'beta',
  'gamma',
  'delta',
  'theta',
  'mu',
  'pi',
  'sigma',
  'phi',
  'omega',
  'times',
  'div',
  'pm',
  'infty',
  'sum',
  'prod',
  'int',
  'in',
  'notin',
  'cup',
  'cap',
  'e'
] as const;
const INLINE_MATH_COMMAND_BY_NAME = new Map<string, string>(
  INLINE_MATH_COMMANDS.map((command) => [command, command === 'e' ? String.raw`\ensuremath{\mathrm{e}}` : `\\ensuremath{\\${command}}`])
);
const formatNumber = (value: number): string => {
  const rounded = Number.parseFloat(value.toFixed(3));
  return rounded.toString();
};

const formatPoint = (point: { readonly x: number; readonly y: number }): string => `(${formatNumber(point.x)}, ${formatNumber(point.y)})`;

const ptPerCm = 28.45274;
const MAX_TIKZ_COORDINATE_CM = 100;

const renderedStrokeWidth = (strokeWidth: number): number => Math.max(strokeWidth * DEFAULT_EDITOR_SCALE * SHAPE_STROKE_SCALE_FACTOR, MIN_RENDER_STROKE_WIDTH);

const arrowDimensionPt = (base: number, shape: LineShape, dimensionScale: number): number =>
  (base * renderedStrokeWidth(shape.strokeWidth) * shape.arrowScale * dimensionScale * ptPerCm) / DEFAULT_EDITOR_SCALE;

const rotateAroundOption = (rotation: number | undefined, center: { readonly x: number; readonly y: number }): string | null => {
  const normalizedRotation = rotation ?? 0;
  return normalizedRotation === 0 ? null : `rotate around={${formatNumber(normalizedRotation)}:${formatPoint(center)}}`;
};

const wrapInlineMathCommands = (text: string): string => {
  let result = '';
  let buffer = '';
  let inMathMode = false;
  let previousChar = '';

  const flushBuffer = (): void => {
    if (!buffer) {
      return;
    }

    result += inMathMode
      ? buffer
      : buffer.replaceAll(REGEX.tikzCodegen.inlineMathCommand, (command) => INLINE_MATH_COMMAND_BY_NAME.get(command.slice(1)) ?? command);
    buffer = '';
  };

  for (const char of text) {
    if (char === '$' && previousChar !== '\\') {
      flushBuffer();
      inMathMode = !inMathMode;
      result += char;
    } else {
      buffer += char;
    }
    previousChar = char;
  }

  flushBuffer();
  return result;
};

interface ShapeStyleConfig {
  readonly stroke: string;
  readonly strokeOpacity?: number;
  readonly strokeWidth: number;
  readonly strokeStyle?: LineShape['strokeStyle'];
  readonly fill?: string;
  readonly fillOpacity?: number;
}

interface TikzGenerationContext {
  readonly colorMap: Map<string, string>;
  readonly colorMode: LatexColorMode;
  readonly coordinateScale: number;
  readonly registerColor: (color: string) => string;
}

const sanitizeColorKey = (color: string): string => color.trim().toLowerCase();

const normalizeHexColor = (color: string): string | null => {
  const trimmed = color.trim();
  const match = REGEX.color.optionalHashHex6.exec(trimmed);
  return match ? match[1].toUpperCase() : null;
};

const createTikzGenerationContext = (options: TikzExportOptions = {}, coordinateScale = 1): TikzGenerationContext => {
  const colorMap = new Map<string, string>();
  let colorIndex = 1;
  const colorMode = options.colorMode ?? 'direct-rgb';

  return {
    colorMap,
    colorMode,
    coordinateScale,
    registerColor: (color: string): string => {
      const normalizedHex = normalizeHexColor(color);
      if (!normalizedHex) {
        return color;
      }

      if (colorMode === 'direct-rgb') {
        const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
        const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
        const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);
        return `{rgb,255:red,${red};green,${green};blue,${blue}}`;
      }

      const key = sanitizeColorKey(normalizedHex);
      const existing = colorMap.get(key);
      if (existing) {
        return existing;
      }

      const colorName = `tikzdrawercolor${colorIndex++}`;
      colorMap.set(key, colorName);
      return colorName;
    }
  };
};

const buildStyleEntries = (shape: ShapeStyleConfig, context: TikzGenerationContext): string[] => {
  const entries = [`draw=${context.registerColor(shape.stroke)}`];

  if (shape.strokeWidth > 0) {
    entries.push(`line width=${formatNumber(shape.strokeWidth)}pt`);
  }

  if (shape.strokeOpacity !== undefined && shape.strokeOpacity < 1) {
    entries.push(`draw opacity=${formatNumber(shape.strokeOpacity)}`);
  }

  switch (shape.strokeStyle ?? 'solid') {
    case 'solid':
      break;
    case 'dashed':
      entries.push('dashed');
      break;
    case 'dotted':
      entries.push('dotted');
      break;
    case 'dash-dotted':
      entries.push('dash dot');
      break;
    case 'loosely-dashed':
      entries.push('loosely dashed');
      break;
  }

  if ('fill' in shape && shape.fill && shape.fill !== 'none') {
    entries.push(`fill=${context.registerColor(shape.fill)}`);
    if (shape.fillOpacity !== undefined && shape.fillOpacity < 1) {
      entries.push(`fill opacity=${formatNumber(shape.fillOpacity)}`);
    }
  }

  return entries;
};

const arrowTipName = (arrowType: ArrowTipKind): string => {
  switch (arrowType) {
    case 'latex':
      return 'Latex';
    case 'triangle':
      return 'Triangle';
    case 'stealth':
      return 'Stealth';
    case 'diamond':
      return 'Triangle';
    case 'circle':
      return 'Circle';
    case 'bar':
      return 'Bar';
    case 'hooks':
      return 'Hooks';
    case 'bracket':
      return 'Bracket';
    case 'kite':
      return 'Kite';
    case 'square':
      return 'Square';
    case 'parenthesis':
      return 'Parenthesis';
    case 'straight-barb':
      return 'Straight Barb';
  }
};

const arrowTipSpec = (shape: LineShape): string => {
  const options = [`color=${shape.arrowColor}`];
  if (shape.arrowType === 'latex') {
    options.push('open');
  } else if (
    shape.arrowType === 'bar' ||
    shape.arrowType === 'hooks' ||
    shape.arrowType === 'bracket' ||
    shape.arrowType === 'parenthesis' ||
    shape.arrowType === 'straight-barb'
  ) {
    // These tips are stroked shapes, so fill/open does not materially apply.
  } else if (shape.arrowOpen || shape.arrowType === 'diamond') {
    options.push('open');
  } else {
    options.push(`fill=${shape.arrowColor}`);
  }
  if (shape.arrowRound) {
    options.push('round');
  }
  options.push(
    `length=${formatNumber(arrowDimensionPt(DEFAULT_ARROW_TIP_LENGTH, shape, shape.arrowLengthScale))}pt`,
    `width=${formatNumber(arrowDimensionPt(DEFAULT_ARROW_TIP_WIDTH, shape, shape.arrowWidthScale))}pt`
  );
  if (supportsArrowBending(shape) && shape.arrowBendMode === 'flex') {
    options.push('flex');
  } else if (supportsArrowBending(shape) && shape.arrowBendMode === 'flex-prime') {
    options.push("flex'");
  } else if (supportsArrowBending(shape) && shape.arrowBendMode === 'bend') {
    options.push('bend');
  }
  return `{${arrowTipName(shape.arrowType)}[${options.join(', ')}]}`;
};

const isStrokedArrowTip = (shape: LineShape): boolean =>
  shape.arrowOpen ||
  shape.arrowType === 'latex' ||
  shape.arrowType === 'bar' ||
  shape.arrowType === 'hooks' ||
  shape.arrowType === 'bracket' ||
  shape.arrowType === 'parenthesis' ||
  shape.arrowType === 'straight-barb';

const supportsArrowBending = (shape: LineShape): boolean =>
  shape.arrowType === 'straight-barb' || shape.arrowType === 'triangle' || shape.arrowType === 'latex' || shape.arrowType === 'stealth';

const tikzLibraryInferences: readonly { readonly library: string; readonly pattern: RegExp }[] = [
  {
    library: 'arrows.meta',
    pattern: /[-<]?\{(?:Latex|Triangle|Stealth|Circle|Bar|Hooks|Bracket|Kite|Square|Parenthesis|Straight Barb)\b/
  },
  {
    library: 'bending',
    pattern: /\b(?:flex'?|bend)\b/
  },
  {
    library: 'calc',
    pattern: /\$\s*\(|\([^)]*\)\s*!\s*-?\d+(?:\.\d+)?\s*!|\([^)]*\)\s*!\s*\([^)]*\)\s*!/
  },
  {
    library: 'positioning',
    pattern: /\b(?:above|below|left|right)(?:\s+(?:left|right))?\s*=\s*(?:[^,\]]+\s+)?of\s+[A-Za-z][\w-]*/
  },
  {
    library: 'fit',
    pattern: /\bfit\s*=/
  },
  {
    library: 'backgrounds',
    pattern: /\bon background layer\b|\\begin\{pgfonlayer\}\{background\}/
  },
  {
    library: 'shapes.geometric',
    pattern: /\b(?:diamond|trapezium|regular polygon|star|isosceles triangle|kite|dart|cylinder)\b/
  },
  {
    library: 'shapes.multipart',
    pattern: /\brectangle split\b|\\nodepart\b/
  },
  {
    library: 'shapes.symbols',
    pattern: /\b(?:cloud|signal|tape|magnetic tape|forbidden sign)\b/
  },
  {
    library: 'decorations.pathreplacing',
    pattern: /\bdecoration\s*=\s*\{?\s*(?:brace|calligraphic brace)\b/
  },
  {
    library: 'decorations.pathmorphing',
    pattern: /\bdecoration\s*=\s*\{?\s*(?:snake|zigzag|coil|bumps|saw)\b/
  },
  {
    library: 'decorations.markings',
    pattern: /\b(?:markings|mark\s*=)\b/
  },
  {
    library: 'patterns',
    pattern: /\bpattern\s*=/
  },
  {
    library: 'matrix',
    pattern: /\\matrix\b|\bmatrix of nodes\b/
  },
  {
    library: 'graphs',
    pattern: /\\graph\b/
  },
  {
    library: 'quotes',
    pattern: /\b(?:edge|to)\s*(?:\[[^\]]*\])?\s*["']/
  }
];

const inferredTikzLibrariesFromCode = (code: string): readonly string[] =>
  tikzLibraryInferences.filter(({ pattern }) => pattern.test(code)).map(({ library }) => library);

const isGeneratedImagePlaceholder = (shape: ImageShape): boolean => shape.src.startsWith('data:image/svg+xml;utf8,');

const requiresGraphicx = (scene: TikzScene, code: string): boolean =>
  scene.shapes.some((shape) => shape.kind === 'image' && !isGeneratedImagePlaceholder(shape)) || /\\includegraphics\b/.test(code);

const rawLineReferencesNamedTikzNode = (line: string): boolean => /\([A-Za-z][\w-]*(?:\.[A-Za-z ]+)?\)/.test(line);

const exportableRawTikzLines = (scene: TikzScene): readonly string[] => (scene.rawTikzLines ?? []).filter((line) => !rawLineReferencesNamedTikzNode(line));

const transparentArrowEntries = (shape: LineShape): string[] => {
  const entries = [`draw=${shape.arrowColor}`, `line width=${formatNumber(shape.strokeWidth)}pt`, `fill opacity=${formatNumber(shape.arrowOpacity)}`];

  if (isStrokedArrowTip(shape)) {
    entries.push(`draw opacity=${formatNumber(shape.arrowOpacity)}`);
  } else {
    entries.push('draw opacity=0');
  }

  return entries;
};

const lineToTikz = (shape: LineShape, context: TikzGenerationContext): string => {
  const entries = buildStyleEntries(shape, context);
  const tikzArrowColor = context.registerColor(shape.arrowColor);
  const tipShape = {
    ...shape,
    arrowColor: tikzArrowColor
  };
  const tipSpec = arrowTipSpec(tipShape);
  const shouldSplitTransparentArrows = (shape.arrowStart || shape.arrowEnd) && shape.arrowOpacity < 1;

  if (shape.arrowStart && shape.arrowEnd && !shouldSplitTransparentArrows) {
    entries.push(`${tipSpec}-${tipSpec}`);
  } else if (shape.arrowStart && !shouldSplitTransparentArrows) {
    entries.push(`${tipSpec}-`);
  } else if (shape.arrowEnd && !shouldSplitTransparentArrows) {
    entries.push(`-${tipSpec}`);
  }

  const points = [shape.from, ...shape.anchors, shape.to];
  const pointList = points.map((point) => formatPoint(point));
  let path = `${formatPoint(shape.from)} -- ${formatPoint(shape.to)}`;
  if (shape.anchors.length > 0) {
    path = shape.lineMode === 'curved' ? `plot[smooth] coordinates {${pointList.join(' ')}}` : pointList.join(' -- ');
  }

  const lines = [String.raw`\draw[${entries.join(', ')}] ${path};`];

  if (shouldSplitTransparentArrows) {
    const overlayEntries = transparentArrowEntries(tipShape);
    if (shape.arrowStart) {
      lines.push(String.raw`\draw[${overlayEntries.join(', ')}, ${tipSpec}-] ${path};`);
    }
    if (shape.arrowEnd) {
      lines.push(String.raw`\draw[${overlayEntries.join(', ')}, -${tipSpec}] ${path};`);
    }
  }

  return lines.join('\n  ');
};

const rectangleToTikz = (shape: RectangleShape, context: TikzGenerationContext): string => {
  const entries = buildStyleEntries(shape, context);
  const cornerRadius = effectiveRectangleCornerRadius(shape);
  const rotationOption = rotateAroundOption(shape.rotation, {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2
  });

  if (cornerRadius > 0) {
    entries.push(`rounded corners=${formatNumber(cornerRadius * context.coordinateScale)}cm`);
  }
  if (rotationOption) {
    entries.push(rotationOption);
  }

  return String.raw`\draw[${entries.join(', ')}] (${formatNumber(shape.x)}, ${formatNumber(shape.y + shape.height)}) rectangle (${formatNumber(shape.x + shape.width)}, ${formatNumber(shape.y)});`;
};

const triangleToTikz = (shape: TriangleShape, context: TikzGenerationContext): string => {
  const entries = buildStyleEntries(shape, context);
  const cornerRadius = effectiveTriangleCornerRadius(shape);
  const rotationOption = rotateAroundOption(shape.rotation, {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2
  });
  if (cornerRadius > 0) {
    entries.push(`rounded corners=${formatNumber(cornerRadius * context.coordinateScale)}cm`);
  }
  if (rotationOption) {
    entries.push(rotationOption);
  }

  const apexX = shape.x + shape.width * shape.apexOffset;
  const apexY = shape.y + shape.height;
  const leftX = shape.x;
  const leftY = shape.y;
  const rightX = shape.x + shape.width;
  const rightY = shape.y;

  return String.raw`\draw[${entries.join(', ')}] (${formatNumber(apexX)}, ${formatNumber(apexY)}) -- (${formatNumber(leftX)}, ${formatNumber(leftY)}) -- (${formatNumber(rightX)}, ${formatNumber(rightY)}) -- cycle;`;
};

const circleToTikz = (shape: CircleShape, context: TikzGenerationContext): string => {
  const entries = buildStyleEntries(shape, context);
  return String.raw`\draw[${entries.join(', ')}] (${formatNumber(shape.cx)}, ${formatNumber(shape.cy)}) circle (${formatNumber(shape.r)});`;
};

const ellipseToTikz = (shape: EllipseShape, context: TikzGenerationContext): string => {
  const entries = buildStyleEntries(shape, context);
  const rotationOption = rotateAroundOption(shape.rotation, { x: shape.cx, y: shape.cy });
  if (rotationOption) {
    entries.push(rotationOption);
  }
  return String.raw`\draw[${entries.join(', ')}] (${formatNumber(shape.cx)}, ${formatNumber(shape.cy)}) ellipse (${formatNumber(shape.rx)} and ${formatNumber(shape.ry)});`;
};

const textAnchorToTikz = (align: TextShape['textAlign']): 'west' | 'east' | 'center' => {
  if (align === 'left') {
    return 'west';
  }

  if (align === 'right') {
    return 'east';
  }

  return 'center';
};

const textContentToTikz = (text: string): string =>
  text
    .split(REGEX.shared.lineBreak)
    .map((line) => wrapInlineMathCommands(line || ' '))
    .join(String.raw`\\`);

const textToTikz = (shape: TextShape, context: TikzGenerationContext): string => {
  const textScale = Math.max(shape.fontSize / DEFAULT_TEXT_FONT_SIZE, 0.6);
  const nodeOptions = [
    `text=${context.registerColor(shape.color)}`,
    `text opacity=${formatNumber(shape.colorOpacity)}`,
    `scale=${formatNumber(textScale * context.coordinateScale)}`,
    `anchor=${textAnchorToTikz(shape.textAlign)}`
  ];

  if (shape.textBox) {
    nodeOptions.push(`text width=${formatNumber(shape.boxWidth / textScale)}cm`, `align=${shape.textAlign}`);
  } else if (REGEX.shared.lineBreak.test(shape.text)) {
    nodeOptions.push(`align=${shape.textAlign}`);
  }

  if (shape.rotation !== 0) {
    nodeOptions.push(`rotate=${formatNumber(shape.rotation)}`);
  }

  const fontTokens = [shape.fontWeight === 'bold' ? String.raw`\bfseries` : '', shape.fontStyle === 'italic' ? String.raw`\itshape` : ''].filter(Boolean);

  const normalizedText = textContentToTikz(shape.text);
  const baseText = shape.textDecoration === 'underline' ? String.raw`\underline{${normalizedText}}` : normalizedText;
  const content = fontTokens.length ? `{${fontTokens.join(' ')} ${baseText}}` : `{${baseText}}`;

  return String.raw`\node[${nodeOptions.join(', ')}] at (${formatNumber(shape.x)}, ${formatNumber(shape.y)}) ${content};`;
};

const imagePlaceholderLabel = (shape: ImageShape): string => shape.latexSource.split(/[\\/]/).at(-1) ?? shape.name;

const imagePlaceholderToTikz = (shape: ImageShape, context: TikzGenerationContext): string => {
  const centerX = shape.x + shape.width / 2;
  const centerY = shape.y + shape.height / 2;
  const drawOptions = [
    `draw=${context.registerColor(shape.stroke === 'none' ? '#9db7f2' : shape.stroke)}`,
    `draw opacity=${formatNumber(shape.strokeOpacity)}`,
    `line width=${formatNumber(Math.max(shape.strokeWidth, 0.08))}pt`,
    'fill={rgb,255:red,238;green,244;blue,255}'
  ];
  const labelOptions = ['text={rgb,255:red,50;green,81;blue,168}', 'text opacity=1', `scale=${formatNumber(0.9 * context.coordinateScale)}`, 'anchor=center'];

  return [
    String.raw`\draw[${drawOptions.join(', ')}] (${formatNumber(shape.x)}, ${formatNumber(shape.y)}) rectangle (${formatNumber(shape.x + shape.width)}, ${formatNumber(shape.y + shape.height)});`,
    String.raw`\node[${labelOptions.join(', ')}] at (${formatNumber(centerX)}, ${formatNumber(centerY)}) {${imagePlaceholderLabel(shape)}};`
  ].join('\n  ');
};

const imageToTikz = (shape: ImageShape, context: TikzGenerationContext): string => {
  if (isGeneratedImagePlaceholder(shape)) {
    return imagePlaceholderToTikz(shape, context);
  }

  const centerX = shape.x + shape.width / 2;
  const centerY = shape.y + shape.height / 2;
  const nodeOptions = ['inner sep=0pt'];
  if ((shape.rotation ?? 0) !== 0) {
    nodeOptions.push(`rotate=${formatNumber(shape.rotation ?? 0)}`);
  }
  if (shape.strokeOpacity < 1) {
    nodeOptions.push(`opacity=${formatNumber(shape.strokeOpacity)}`);
  }
  const lines = [
    String.raw`\node[${nodeOptions.join(', ')}] at (${formatNumber(centerX)}, ${formatNumber(centerY)}) {\includegraphics[width=${formatNumber(shape.width * context.coordinateScale)}cm,height=${formatNumber(shape.height * context.coordinateScale)}cm]{${shape.latexSource}}};`
  ];

  if (shape.strokeWidth > 0 && shape.stroke !== 'none') {
    const drawOptions = [
      `draw=${context.registerColor(shape.stroke)}`,
      `draw opacity=${formatNumber(shape.strokeOpacity)}`,
      `line width=${formatNumber(shape.strokeWidth)}pt`
    ];
    if ((shape.rotation ?? 0) !== 0) {
      drawOptions.push(`rotate around={${formatNumber(shape.rotation ?? 0)}:(${formatNumber(centerX)}, ${formatNumber(centerY)})}`);
    }
    lines.push(
      String.raw`\draw[${drawOptions.join(', ')}] (${formatNumber(shape.x)}, ${formatNumber(shape.y)}) rectangle (${formatNumber(shape.x + shape.width)}, ${formatNumber(shape.y + shape.height)});`
    );
  }

  return lines.join('\n  ');
};

export const shapeToTikz = (shape: CanvasShape, context: TikzGenerationContext): string => {
  switch (shape.kind) {
    case 'line':
      return lineToTikz(shape, context);
    case 'rectangle':
      return rectangleToTikz(shape, context);
    case 'triangle':
      return triangleToTikz(shape, context);
    case 'circle':
      return circleToTikz(shape, context);
    case 'ellipse':
      return ellipseToTikz(shape, context);
    case 'text':
      return textToTikz(shape, context);
    case 'image':
      return imageToTikz(shape, context);
  }
};

const shapeCoordinateMagnitude = (shape: CanvasShape): number => {
  switch (shape.kind) {
    case 'line':
      return Math.max(...[shape.from, ...shape.anchors, shape.to].flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]));
    case 'rectangle':
    case 'triangle':
      return Math.max(Math.abs(shape.x), Math.abs(shape.y), Math.abs(shape.x + shape.width), Math.abs(shape.y + shape.height));
    case 'circle':
      return Math.max(Math.abs(shape.cx) + shape.r, Math.abs(shape.cy) + shape.r);
    case 'ellipse':
      return Math.max(Math.abs(shape.cx) + shape.rx, Math.abs(shape.cy) + shape.ry);
    case 'text':
      return Math.max(Math.abs(shape.x), Math.abs(shape.y), shape.boxWidth, shape.fontSize);
    case 'image':
      return Math.max(Math.abs(shape.x), Math.abs(shape.y), Math.abs(shape.x + shape.width), Math.abs(shape.y + shape.height));
  }
};

const sceneCoordinateScale = (scene: TikzScene): number => {
  const magnitude = Math.max(1, ...scene.shapes.map((shape) => shapeCoordinateMagnitude(shape)));
  return Math.min(1, MAX_TIKZ_COORDINATE_CM / magnitude);
};
export const sceneToTikzBundle = (scene: TikzScene, options: TikzExportOptions = {}): TikzExportBundle => {
  const coordinateScale = sceneCoordinateScale(scene);
  const context = createTikzGenerationContext(options, coordinateScale);
  const lines = [...scene.shapes.map((shape) => shapeToTikz(shape, context)), ...exportableRawTikzLines(scene)];
  const pictureOptions = coordinateScale < 1 ? `[x=${formatNumber(coordinateScale)}cm,y=${formatNumber(coordinateScale)}cm]` : '';
  const code = [String.raw`\begin{tikzpicture}${pictureOptions}`, ...lines.map((line) => `  ${line}`), String.raw`\end{tikzpicture}`].join('\n');
  const tikzLibraries = new Set([
    ...(scene.shapes.some((shape) => shape.kind === 'line' && (shape.arrowStart || shape.arrowEnd)) ? ['arrows.meta'] : []),
    ...(scene.shapes.some((shape) => shape.kind === 'line' && shape.arrowBendMode !== 'none' && supportsArrowBending(shape)) ? ['bending'] : []),
    ...inferredTikzLibrariesFromCode(code)
  ]);
  const imports = [
    String.raw`\usepackage{tikz}`,
    ...Array.from(tikzLibraries).map((library) => String.raw`\usetikzlibrary{${library}}`),
    ...(requiresGraphicx(scene, code) ? [String.raw`\usepackage{graphicx}`] : []),
    ...(context.colorMode === 'define-colors'
      ? Array.from(context.colorMap.entries()).map(([hex, name]) => String.raw`\definecolor{${name}}{HTML}{${hex}}`)
      : [])
  ];

  return {
    imports: imports.join('\n'),
    code
  };
};

export const sceneToTikz = (scene: TikzScene, options: TikzExportOptions = {}): string => sceneToTikzBundle(scene, options).code;

export const sceneToStandaloneDocument = (scene: TikzScene, options: TikzExportOptions = {}): string =>
  (() => {
    const bundle = sceneToTikzBundle(scene, options);
    return [String.raw`\documentclass[tikz]{standalone}`, bundle.imports, String.raw`\begin{document}`, bundle.code, String.raw`\end{document}`].join('\n');
  })();
