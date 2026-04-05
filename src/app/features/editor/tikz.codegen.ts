import type {
  CanvasShape,
  CircleShape,
  EllipseShape,
  LineShape,
  RectangleShape,
  TextShape,
  TikzScene
} from './tikz.models';

const formatNumber = (value: number): string => {
  const rounded = Number.parseFloat(value.toFixed(3));
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toString();
};

const buildStyleEntries = (
  shape: Pick<CanvasShape, 'stroke' | 'strokeWidth'> & Partial<RectangleShape | CircleShape | EllipseShape>
): string[] => {
  const entries = [`draw=${shape.stroke}`];

  if (shape.strokeWidth > 0) {
    entries.push(`line width=${formatNumber(shape.strokeWidth)}pt`);
  }

  if ('fill' in shape && shape.fill && shape.fill !== 'none') {
    entries.push(`fill=${shape.fill}`);
  }

  return entries;
};

const lineToTikz = (shape: LineShape): string => {
  const entries = buildStyleEntries(shape);

  if (shape.arrowStart && shape.arrowEnd) {
    entries.push('<->');
  } else if (shape.arrowStart) {
    entries.push('<-');
  } else if (shape.arrowEnd) {
    entries.push('->');
  }

  return `\\draw[${entries.join(', ')}] (${formatNumber(shape.from.x)}, ${formatNumber(shape.from.y)}) -- (${formatNumber(shape.to.x)}, ${formatNumber(shape.to.y)});`;
};

const rectangleToTikz = (shape: RectangleShape): string => {
  const entries = buildStyleEntries(shape);

  if (shape.cornerRadius > 0) {
    entries.push(`rounded corners=${formatNumber(shape.cornerRadius)}cm`);
  }

  return `\\draw[${entries.join(', ')}] (${formatNumber(shape.x)}, ${formatNumber(shape.y)}) rectangle (${formatNumber(shape.x + shape.width)}, ${formatNumber(shape.y - shape.height)});`;
};

const circleToTikz = (shape: CircleShape): string =>
  `\\draw[${buildStyleEntries(shape).join(', ')}] (${formatNumber(shape.cx)}, ${formatNumber(shape.cy)}) circle (${formatNumber(shape.r)});`;

const ellipseToTikz = (shape: EllipseShape): string =>
  `\\draw[${buildStyleEntries(shape).join(', ')}] (${formatNumber(shape.cx)}, ${formatNumber(shape.cy)}) ellipse (${formatNumber(shape.rx)} and ${formatNumber(shape.ry)});`;

const textToTikz = (shape: TextShape): string =>
  `\\node[text=${shape.color}, scale=${formatNumber(Math.max(shape.fontSize / 0.42, 0.6))}] at (${formatNumber(shape.x)}, ${formatNumber(shape.y)}) {${shape.text}};`;

export const shapeToTikz = (shape: CanvasShape): string => {
  switch (shape.kind) {
    case 'line':
      return lineToTikz(shape);
    case 'rectangle':
      return rectangleToTikz(shape);
    case 'circle':
      return circleToTikz(shape);
    case 'ellipse':
      return ellipseToTikz(shape);
    case 'text':
      return textToTikz(shape);
  }
};

export const sceneToTikz = (scene: TikzScene): string => {
  const lines = scene.shapes.map((shape) => shapeToTikz(shape));

  return ['\\begin{tikzpicture}', ...lines.map((line) => `  ${line}`), '\\end{tikzpicture}'].join('\n');
};

export const sceneToStandaloneDocument = (scene: TikzScene): string =>
  [
    '\\documentclass[tikz]{standalone}',
    '\\usepackage{tikz}',
    '\\begin{document}',
    sceneToTikz(scene),
    '\\end{document}'
  ].join('\n');
