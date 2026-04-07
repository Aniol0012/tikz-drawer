import type {
  CanvasShape,
  CircleShape,
  EllipseShape,
  LineShape,
  RectangleShape,
  TextShape,
  TikzScene
} from './tikz.models';

export interface TikzExportBundle {
  readonly imports: string;
  readonly code: string;
}

const formatNumber = (value: number): string => {
  const rounded = Number.parseFloat(value.toFixed(3));
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toString();
};

interface ShapeStyleConfig {
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly fill?: string;
}

interface TikzGenerationContext {
  readonly colorMap: Map<string, string>;
  readonly registerColor: (color: string) => string;
}

const sanitizeColorKey = (color: string): string => color.trim().toLowerCase();

const normalizeHexColor = (color: string): string | null => {
  const trimmed = color.trim();
  const match = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
  return match ? match[1].toUpperCase() : null;
};

const createTikzGenerationContext = (): TikzGenerationContext => {
  const colorMap = new Map<string, string>();
  let colorIndex = 1;

  return {
    colorMap,
    registerColor: (color: string): string => {
      const normalizedHex = normalizeHexColor(color);
      if (!normalizedHex) {
        return color;
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

  if ('fill' in shape && shape.fill && shape.fill !== 'none') {
    entries.push(`fill=${context.registerColor(shape.fill)}`);
  }

  return entries;
};

const lineToTikz = (shape: LineShape, context: TikzGenerationContext): string => {
  const entries = buildStyleEntries(shape, context);

  if (shape.arrowStart && shape.arrowEnd) {
    entries.push('<->');
  } else if (shape.arrowStart) {
    entries.push('<-');
  } else if (shape.arrowEnd) {
    entries.push('->');
  }

  return `\\draw[${entries.join(', ')}] (${formatNumber(shape.from.x)}, ${formatNumber(shape.from.y)}) -- (${formatNumber(shape.to.x)}, ${formatNumber(shape.to.y)});`;
};

const rectangleToTikz = (shape: RectangleShape, context: TikzGenerationContext): string => {
  const entries = buildStyleEntries(shape, context);

  if (shape.cornerRadius > 0) {
    entries.push(`rounded corners=${formatNumber(shape.cornerRadius)}cm`);
  }

  return `\\draw[${entries.join(', ')}] (${formatNumber(shape.x)}, ${formatNumber(shape.y)}) rectangle (${formatNumber(shape.x + shape.width)}, ${formatNumber(shape.y - shape.height)});`;
};

const circleToTikz = (shape: CircleShape, context: TikzGenerationContext): string =>
  `\\draw[${buildStyleEntries(shape, context).join(', ')}] (${formatNumber(shape.cx)}, ${formatNumber(shape.cy)}) circle (${formatNumber(shape.r)});`;

const ellipseToTikz = (shape: EllipseShape, context: TikzGenerationContext): string =>
  `\\draw[${buildStyleEntries(shape, context).join(', ')}] (${formatNumber(shape.cx)}, ${formatNumber(shape.cy)}) ellipse (${formatNumber(shape.rx)} and ${formatNumber(shape.ry)});`;

const textToTikz = (shape: TextShape, context: TikzGenerationContext): string =>
  `\\node[text=${context.registerColor(shape.color)}, scale=${formatNumber(Math.max(shape.fontSize / 0.42, 0.6))}] at (${formatNumber(shape.x)}, ${formatNumber(shape.y)}) {${shape.text}};`;

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
  }
};

export const sceneToTikzBundle = (scene: TikzScene): TikzExportBundle => {
  const context = createTikzGenerationContext();
  const lines = scene.shapes.map((shape) => shapeToTikz(shape, context));
  const imports = ['\\usepackage{tikz}', ...Array.from(context.colorMap.entries()).map(([hex, name]) => `\\definecolor{${name}}{HTML}{${hex}}`)];

  return {
    imports: imports.join('\n'),
    code: ['\\begin{tikzpicture}', ...lines.map((line) => `  ${line}`), '\\end{tikzpicture}'].join('\n')
  };
};

export const sceneToTikz = (scene: TikzScene): string => sceneToTikzBundle(scene).code;

export const sceneToStandaloneDocument = (scene: TikzScene): string =>
  (() => {
    const bundle = sceneToTikzBundle(scene);
    return ['\\documentclass[tikz]{standalone}', bundle.imports, '\\begin{document}', bundle.code, '\\end{document}'].join(
      '\n'
    );
  })();
