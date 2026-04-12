import type {
  ArrowTipKind,
  CanvasShape,
  CircleShape,
  EllipseShape,
  ImageShape,
  LineShape,
  RectangleShape,
  TextShape,
  TikzScene
} from './tikz.models';

export interface TikzExportBundle {
  readonly imports: string;
  readonly code: string;
}

export type LatexColorMode = 'direct-rgb' | 'define-colors';

export interface TikzExportOptions {
  readonly colorMode?: LatexColorMode;
}

const DEFAULT_ARROW_TIP_LENGTH = 8;
const DEFAULT_ARROW_TIP_WIDTH = 6;
const INLINE_MATH_COMMANDS = [
  'alpha',
  'beta',
  'gamma',
  'delta',
  'epsilon',
  'theta',
  'lambda',
  'mu',
  'pi',
  'sigma',
  'phi',
  'omega',
  'leftarrow',
  'rightarrow',
  'uparrow',
  'downarrow',
  'leftrightarrow',
  'Rightarrow',
  'Leftarrow',
  'Leftrightarrow',
  'times',
  'div',
  'pm',
  'infty',
  'sum',
  'prod',
  'int',
  'partial',
  'forall',
  'exists',
  'in',
  'notin',
  'cup',
  'cap'
] as const;
const INLINE_MATH_COMMAND_REGEX = new RegExp(String.raw`\\(?:${INLINE_MATH_COMMANDS.join('|')})(?![A-Za-z])`, 'g');

const formatNumber = (value: number): string => {
  const rounded = Number.parseFloat(value.toFixed(3));
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toString();
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

    result += inMathMode ? buffer : buffer.replace(INLINE_MATH_COMMAND_REGEX, (command) => `\\ensuremath{${command}}`);
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
  const match = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
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
      return 'Diamond';
    case 'circle':
      return 'Circle';
    case 'bar':
      return 'Bar';
    case 'hooks':
      return 'Hooks';
    case 'bracket':
      return 'Bracket';
  }
};

const arrowTipSpec = (shape: LineShape): string => {
  const options = [`color=${shape.arrowColor}`];
  if (shape.arrowType === 'bar' || shape.arrowType === 'hooks' || shape.arrowType === 'bracket') {
    // These tips are stroked shapes, so fill/open does not materially apply.
  } else if (shape.arrowOpen) {
    options.push('open');
  } else {
    options.push(`fill=${shape.arrowColor}`);
  }
  if (shape.arrowOpacity < 1) {
    options.push(`opacity=${formatNumber(shape.arrowOpacity)}`);
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

const lineToTikz = (shape: LineShape, context: TikzGenerationContext): string => {
  const entries = buildStyleEntries(shape, context);
  const tipSpec = arrowTipSpec({
    ...shape,
    arrowColor: context.registerColor(shape.arrowColor)
  });

  if (shape.arrowStart && shape.arrowEnd) {
    entries.push(`${tipSpec}-${tipSpec}`);
  } else if (shape.arrowStart) {
    entries.push(`${tipSpec}-`);
  } else if (shape.arrowEnd) {
    entries.push(`-${tipSpec}`);
  }

  const points = [shape.from, ...shape.anchors, shape.to];
  const pointList = points.map((point) => `(${formatNumber(point.x)}, ${formatNumber(point.y)})`);
  const path =
    shape.anchors.length > 0
      ? shape.lineMode === 'curved'
        ? `plot[smooth] coordinates {${pointList.join(' ')}}`
        : pointList.join(' -- ')
      : `(${formatNumber(shape.from.x)}, ${formatNumber(shape.from.y)}) -- (${formatNumber(shape.to.x)}, ${formatNumber(shape.to.y)})`;

  return `\\draw[${entries.join(', ')}] ${path};`;
};

const rectangleToTikz = (shape: RectangleShape, context: TikzGenerationContext): string => {
  const entries = buildStyleEntries(shape, context);

  if (shape.cornerRadius > 0) {
    entries.push(`rounded corners=${formatNumber(shape.cornerRadius)}cm`);
  }

  return `\\draw[${entries.join(', ')}] (${formatNumber(shape.x)}, ${formatNumber(shape.y + shape.height)}) rectangle (${formatNumber(shape.x + shape.width)}, ${formatNumber(shape.y)});`;
};

const circleToTikz = (shape: CircleShape, context: TikzGenerationContext): string =>
  `\\draw[${buildStyleEntries(shape, context).join(', ')}] (${formatNumber(shape.cx)}, ${formatNumber(shape.cy)}) circle (${formatNumber(shape.r)});`;

const ellipseToTikz = (shape: EllipseShape, context: TikzGenerationContext): string =>
  `\\draw[${buildStyleEntries(shape, context).join(', ')}] (${formatNumber(shape.cx)}, ${formatNumber(shape.cy)}) ellipse (${formatNumber(shape.rx)} and ${formatNumber(shape.ry)});`;

const textToTikz = (shape: TextShape, context: TikzGenerationContext): string => {
  const nodeOptions = [
    `text=${context.registerColor(shape.color)}`,
    `text opacity=${formatNumber(shape.colorOpacity)}`,
    `scale=${formatNumber(Math.max(shape.fontSize / 0.42, 0.6))}`,
    `anchor=${shape.textAlign === 'left' ? 'west' : shape.textAlign === 'right' ? 'east' : 'center'}`
  ];

  if (shape.textBox) {
    nodeOptions.push(`text width=${formatNumber(shape.boxWidth)}cm`);
    nodeOptions.push(`align=${shape.textAlign}`);
  }

  if (shape.rotation !== 0) {
    nodeOptions.push(`rotate=${formatNumber(shape.rotation)}`);
  }

  const fontTokens = [
    shape.fontWeight === 'bold' ? '\\bfseries' : '',
    shape.fontStyle === 'italic' ? '\\itshape' : ''
  ].filter(Boolean);

  const normalizedText = wrapInlineMathCommands(shape.text);
  const baseText = shape.textDecoration === 'underline' ? `\\underline{${normalizedText}}` : normalizedText;
  const content = fontTokens.length ? `{${fontTokens.join(' ')} ${baseText}}` : `{${baseText}}`;

  return `\\node[${nodeOptions.join(', ')}] at (${formatNumber(shape.x)}, ${formatNumber(shape.y)}) ${content};`;
};

const imageToTikz = (shape: ImageShape, context: TikzGenerationContext): string => {
  const centerX = shape.x + shape.width / 2;
  const centerY = shape.y + shape.height / 2;
  const lines = [
    `\\node[inner sep=0pt] at (${formatNumber(centerX)}, ${formatNumber(centerY)}) {\\includegraphics[width=${formatNumber(shape.width)}cm,height=${formatNumber(shape.height)}cm]{${shape.latexSource}}};`
  ];

  if (shape.strokeWidth > 0 && shape.stroke !== 'none') {
    lines.push(
      `\\draw[draw=${context.registerColor(shape.stroke)}, draw opacity=${formatNumber(shape.strokeOpacity)}, line width=${formatNumber(shape.strokeWidth)}pt] (${formatNumber(shape.x)}, ${formatNumber(shape.y)}) rectangle (${formatNumber(shape.x + shape.width)}, ${formatNumber(shape.y + shape.height)});`
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
    '\\usepackage{tikz}',
    ...(scene.shapes.some((shape) => shape.kind === 'line' && (shape.arrowStart || shape.arrowEnd))
      ? ['\\usetikzlibrary{arrows.meta}']
      : []),
    ...(scene.shapes.some((shape) => shape.kind === 'line' && shape.arrowBendMode !== 'none')
      ? ['\\usetikzlibrary{bending}']
      : []),
    ...(scene.shapes.some((shape) => shape.kind === 'image') ? ['\\usepackage{graphicx}'] : []),
    ...(context.colorMode === 'define-colors'
      ? Array.from(context.colorMap.entries()).map(([hex, name]) => `\\definecolor{${name}}{HTML}{${hex}}`)
      : [])
  ];

  return {
    imports: imports.join('\n'),
    code: ['\\begin{tikzpicture}', ...lines.map((line) => `  ${line}`), '\\end{tikzpicture}'].join('\n')
  };
};

export const sceneToTikz = (scene: TikzScene, options: TikzExportOptions = {}): string =>
  sceneToTikzBundle(scene, options).code;

export const sceneToStandaloneDocument = (scene: TikzScene, options: TikzExportOptions = {}): string =>
  (() => {
    const bundle = sceneToTikzBundle(scene, options);
    return [
      '\\documentclass[tikz]{standalone}',
      bundle.imports,
      '\\begin{document}',
      bundle.code,
      '\\end{document}'
    ].join('\n');
  })();
