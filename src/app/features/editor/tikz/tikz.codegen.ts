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
  DEFAULT_ARROW_TIP_LENGTH,
  DEFAULT_ARROW_TIP_WIDTH,
  DEFAULT_TEXT_FONT_SIZE
} from '../constants/editor.constants';
import { effectiveRectangleCornerRadius, effectiveTriangleCornerRadius } from '../utils/editor-geometry.utils';

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
  INLINE_MATH_COMMANDS.map((command) => [
    command,
    command === 'e' ? String.raw`\ensuremath{\mathrm{e}}` : `\\ensuremath{\\${command}}`
  ])
);
const INLINE_MATH_COMMAND_REGEX = new RegExp(String.raw`\\(?:${INLINE_MATH_COMMANDS.join('|')})`, 'g');

const formatNumber = (value: number): string => {
  const rounded = Number.parseFloat(value.toFixed(3));
  return rounded.toString();
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
      : buffer.replaceAll(
          INLINE_MATH_COMMAND_REGEX,
          (command) => INLINE_MATH_COMMAND_BY_NAME.get(command.slice(1)) ?? command
        );
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
  readonly registerColor: (color: string) => string;
}

const sanitizeColorKey = (color: string): string => color.trim().toLowerCase();

const normalizeHexColor = (color: string): string | null => {
  const trimmed = color.trim();
  const match = /^#?([0-9a-fA-F]{6})$/.exec(trimmed);
  return match ? match[1].toUpperCase() : null;
};

const createTikzGenerationContext = (options: TikzExportOptions = {}): TikzGenerationContext => {
  const colorMap = new Map<string, string>();
  let colorIndex = 1;
  const colorMode = options.colorMode ?? 'direct-rgb';

  return {
    colorMap,
    colorMode,
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
  if (
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
  if (shape.arrowScale !== 1) {
    options.push(`scale=${formatNumber(shape.arrowScale)}`);
  }
  if (shape.arrowLengthScale !== 1) {
    options.push(`length=${formatNumber(DEFAULT_ARROW_TIP_LENGTH * shape.arrowLengthScale)}pt`);
  }
  if (shape.arrowWidthScale !== 1) {
    options.push(`width=${formatNumber(DEFAULT_ARROW_TIP_WIDTH * shape.arrowWidthScale)}pt`);
  }
  if (shape.arrowBendMode === 'flex') {
    options.push('flex');
  } else if (shape.arrowBendMode === 'flex-prime') {
    options.push("flex'");
  } else if (shape.arrowBendMode === 'bend') {
    options.push('bend');
  }
  return `{${arrowTipName(shape.arrowType)}[${options.join(', ')}]}`;
};

const isStrokedArrowTip = (shape: LineShape): boolean =>
  shape.arrowOpen ||
  shape.arrowType === 'bar' ||
  shape.arrowType === 'hooks' ||
  shape.arrowType === 'bracket' ||
  shape.arrowType === 'parenthesis' ||
  shape.arrowType === 'straight-barb';

const transparentArrowEntries = (shape: LineShape): string[] => {
  const entries = [
    `draw=${shape.arrowColor}`,
    `line width=${formatNumber(shape.strokeWidth)}pt`,
    `fill opacity=${formatNumber(shape.arrowOpacity)}`
  ];

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
  const pointList = points.map((point) => `(${formatNumber(point.x)}, ${formatNumber(point.y)})`);
  let path = `(${formatNumber(shape.from.x)}, ${formatNumber(shape.from.y)}) -- (${formatNumber(shape.to.x)}, ${formatNumber(shape.to.y)})`;
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

  if (cornerRadius > 0) {
    entries.push(`rounded corners=${formatNumber(cornerRadius)}cm`);
  }
  if ((shape.rotation ?? 0) !== 0) {
    entries.push(`rotate=${formatNumber(shape.rotation ?? 0)}`);
  }

  return String.raw`\draw[${entries.join(', ')}] (${formatNumber(shape.x)}, ${formatNumber(shape.y + shape.height)}) rectangle (${formatNumber(shape.x + shape.width)}, ${formatNumber(shape.y)});`;
};

const triangleToTikz = (shape: TriangleShape, context: TikzGenerationContext): string => {
  const entries = buildStyleEntries(shape, context);
  const cornerRadius = effectiveTriangleCornerRadius(shape);
  if (cornerRadius > 0) {
    entries.push(`rounded corners=${formatNumber(cornerRadius)}cm`);
  }
  if ((shape.rotation ?? 0) !== 0) {
    entries.push(`rotate=${formatNumber(shape.rotation ?? 0)}`);
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
  if ((shape.rotation ?? 0) !== 0) {
    entries.push(`rotate=${formatNumber(shape.rotation ?? 0)}`);
  }
  return String.raw`\draw[${entries.join(', ')}] (${formatNumber(shape.cx)}, ${formatNumber(shape.cy)}) circle (${formatNumber(shape.r)});`;
};

const ellipseToTikz = (shape: EllipseShape, context: TikzGenerationContext): string => {
  const entries = buildStyleEntries(shape, context);
  if ((shape.rotation ?? 0) !== 0) {
    entries.push(`rotate=${formatNumber(shape.rotation ?? 0)}`);
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

const textToTikz = (shape: TextShape, context: TikzGenerationContext): string => {
  const nodeOptions = [
    `text=${context.registerColor(shape.color)}`,
    `text opacity=${formatNumber(shape.colorOpacity)}`,
    `scale=${formatNumber(Math.max(shape.fontSize / DEFAULT_TEXT_FONT_SIZE, 0.6))}`,
    `anchor=${textAnchorToTikz(shape.textAlign)}`
  ];

  if (shape.textBox) {
    nodeOptions.push(`text width=${formatNumber(shape.boxWidth)}cm`, `align=${shape.textAlign}`);
  }

  if (shape.rotation !== 0) {
    nodeOptions.push(`rotate=${formatNumber(shape.rotation)}`);
  }

  const fontTokens = [
    shape.fontWeight === 'bold' ? String.raw`\bfseries` : '',
    shape.fontStyle === 'italic' ? String.raw`\itshape` : ''
  ].filter(Boolean);

  const normalizedText = wrapInlineMathCommands(shape.text);
  const baseText = shape.textDecoration === 'underline' ? String.raw`\underline{${normalizedText}}` : normalizedText;
  const content = fontTokens.length ? `{${fontTokens.join(' ')} ${baseText}}` : `{${baseText}}`;

  return String.raw`\node[${nodeOptions.join(', ')}] at (${formatNumber(shape.x)}, ${formatNumber(shape.y)}) ${content};`;
};

const imageToTikz = (shape: ImageShape, context: TikzGenerationContext): string => {
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
    String.raw`\node[${nodeOptions.join(', ')}] at (${formatNumber(centerX)}, ${formatNumber(centerY)}) {\includegraphics[width=${formatNumber(shape.width)}cm,height=${formatNumber(shape.height)}cm]{${shape.latexSource}}};`
  ];

  if (shape.strokeWidth > 0 && shape.stroke !== 'none') {
    const drawOptions = [
      `draw=${context.registerColor(shape.stroke)}`,
      `draw opacity=${formatNumber(shape.strokeOpacity)}`,
      `line width=${formatNumber(shape.strokeWidth)}pt`
    ];
    if ((shape.rotation ?? 0) !== 0) {
      drawOptions.push(
        `rotate around={${formatNumber(shape.rotation ?? 0)}:(${formatNumber(centerX)}, ${formatNumber(centerY)})}`
      );
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

export const sceneToTikzBundle = (scene: TikzScene, options: TikzExportOptions = {}): TikzExportBundle => {
  const context = createTikzGenerationContext(options);
  const lines = scene.shapes.map((shape) => shapeToTikz(shape, context));
  const imports = [
    String.raw`\usepackage{tikz}`,
    ...(scene.shapes.some((shape) => shape.kind === 'line' && (shape.arrowStart || shape.arrowEnd))
      ? [String.raw`\usetikzlibrary{arrows.meta}`]
      : []),
    ...(scene.shapes.some((shape) => shape.kind === 'line' && shape.arrowBendMode !== 'none')
      ? [String.raw`\usetikzlibrary{bending}`]
      : []),
    ...(scene.shapes.some((shape) => shape.kind === 'image') ? [String.raw`\usepackage{graphicx}`] : []),
    ...(context.colorMode === 'define-colors'
      ? Array.from(context.colorMap.entries()).map(([hex, name]) => String.raw`\definecolor{${name}}{HTML}{${hex}}`)
      : [])
  ];

  return {
    imports: imports.join('\n'),
    code: [String.raw`\begin{tikzpicture}`, ...lines.map((line) => `  ${line}`), String.raw`\end{tikzpicture}`].join(
      '\n'
    )
  };
};

export const sceneToTikz = (scene: TikzScene, options: TikzExportOptions = {}): string =>
  sceneToTikzBundle(scene, options).code;

export const sceneToStandaloneDocument = (scene: TikzScene, options: TikzExportOptions = {}): string =>
  (() => {
    const bundle = sceneToTikzBundle(scene, options);
    return [
      String.raw`\documentclass[tikz]{standalone}`,
      bundle.imports,
      String.raw`\begin{document}`,
      bundle.code,
      String.raw`\end{document}`
    ].join('\n');
  })();
