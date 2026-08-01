import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import type { SvgTextAnchor } from '../src/app/features/editor/components/editor-page/editor-page.types';
import type { CanvasShape, LineShape, TextAlign, TextShape } from '../src/app/features/editor/models/tikz.models';
import { arrowMarkerFill, arrowMarkerGeometry } from '../src/app/features/editor/utils/editor-arrow.utils';
import { buildCanvasExportDocument } from '../src/app/features/editor/utils/editor-export-svg.utils';
import { buildLinePath, computeBounds } from '../src/app/features/editor/utils/editor-geometry.utils';
import { displayTextLinesForShape, textLeftForWidth } from '../src/app/features/editor/utils/text.utils';

const OUTPUT_DIRECTORY = resolve('public/examples');
const OUTPUT_WIDTH = 1280;
const OUTPUT_HEIGHT = 720;
const INK = '#162033';
const MUTED = '#52606f';
const ACCENT = '#2f66e8';
const ACCENT_FILL = '#eaf0ff';
const WHITE = '#ffffff';
let nextId = 0;

const id = (_name: string): string => `shape-${(nextId += 1)}`;

const shapeBase = (name: string, stroke = MUTED) => ({
  id: id(name),
  name,
  stroke,
  strokeOpacity: 1,
  strokeWidth: 0.36,
  strokeStyle: 'solid' as const
});

const rectangle = (name: string, x: number, y: number, width: number, height: number, accent = false, rotation = 0): CanvasShape => ({
  ...shapeBase(name, accent ? ACCENT : MUTED),
  kind: 'rectangle',
  x,
  y,
  width,
  height,
  fill: accent ? ACCENT_FILL : WHITE,
  fillOpacity: 1,
  cornerRadius: 0.18,
  rotation
});

const circle = (name: string, cx: number, cy: number, radius = 0.52, accent = false): CanvasShape => ({
  ...shapeBase(name, accent ? ACCENT : MUTED),
  kind: 'circle',
  cx,
  cy,
  r: radius,
  fill: accent ? ACCENT_FILL : WHITE,
  fillOpacity: 1,
  rotation: 0
});

const ellipse = (name: string, cx: number, cy: number, rx: number, ry: number): CanvasShape => ({
  ...shapeBase(name),
  kind: 'ellipse',
  cx,
  cy,
  rx,
  ry,
  fill: WHITE,
  fillOpacity: 1,
  rotation: 0
});

const text = (
  value: string,
  x: number,
  y: number,
  options: { readonly accent?: boolean; readonly align?: TextAlign; readonly bold?: boolean } = {}
): TextShape => ({
  ...shapeBase(`Text ${value}`, 'transparent'),
  kind: 'text',
  x,
  y,
  text: value,
  textBox: false,
  boxWidth: 0,
  fontSize: 0.48,
  color: options.accent ? ACCENT : INK,
  colorOpacity: 1,
  fontWeight: options.bold ? 'bold' : 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: options.align ?? 'center',
  rotation: 0
});

const line = (
  name: string,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  options: {
    readonly accent?: boolean;
    readonly anchors?: readonly { readonly x: number; readonly y: number }[];
    readonly curved?: boolean;
    readonly strong?: boolean;
  } = {}
): LineShape => ({
  ...shapeBase(name, options.accent ? ACCENT : options.strong ? INK : MUTED),
  kind: 'line',
  from,
  to,
  anchors: options.anchors ?? [],
  lineMode: options.curved ? 'curved' : 'straight',
  arrowStart: false,
  arrowEnd: false,
  arrowType: 'stealth',
  arrowColor: options.accent ? ACCENT : MUTED,
  arrowOpacity: 1,
  arrowOpen: false,
  arrowRound: true,
  arrowScale: 1.2,
  arrowLengthScale: 1.15,
  arrowWidthScale: 1.15,
  arrowBendMode: 'none'
});

const arrow = (
  name: string,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  options: { readonly accent?: boolean; readonly insetEnd?: number; readonly insetStart?: number; readonly strong?: boolean } = {}
): readonly LineShape[] => {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.max(Math.hypot(deltaX, deltaY), 0.001);
  const unitX = deltaX / length;
  const unitY = deltaY / length;
  const start = { x: from.x + unitX * (options.insetStart ?? 0), y: from.y + unitY * (options.insetStart ?? 0) };
  const end = { x: to.x - unitX * (options.insetEnd ?? 0), y: to.y - unitY * (options.insetEnd ?? 0) };
  const headLength = 0.34;
  const headWidth = 0.23;
  const base = { x: end.x - unitX * headLength, y: end.y - unitY * headLength };
  const normalX = -unitY;
  const normalY = unitX;
  const lineOptions = { accent: options.accent, strong: options.strong };
  return [
    line(`${name} shaft`, start, end, lineOptions),
    line(`${name} head one`, end, { x: base.x + normalX * headWidth, y: base.y + normalY * headWidth }, lineOptions),
    line(`${name} head two`, end, { x: base.x - normalX * headWidth, y: base.y - normalY * headWidth }, lineOptions)
  ];
};

const labeledRectangle = (name: string, label: string, x: number, y: number, width: number, height: number, accent = false): readonly CanvasShape[] => [
  rectangle(name, x, y, width, height, accent),
  text(label, x + width / 2, y + height / 2 - 0.16, { bold: accent })
];

const flowchart = (): readonly CanvasShape[] => [
  ...labeledRectangle('Start node', 'Start', 4.7, 7.1, 3.6, 1.15, true),
  ...arrow('Start connector', { x: 6.5, y: 7.1 }, { x: 6.5, y: 5.85 }),
  ...labeledRectangle('Process node', 'Prepare data', 4.35, 4.65, 4.3, 1.2),
  ...arrow('Process connector', { x: 6.5, y: 4.65 }, { x: 6.5, y: 3.65 }),
  rectangle('Decision node', 5.25, 1.15, 2.5, 2.5, false, 45),
  text('Valid?', 6.5, 2.22),
  ...arrow('No branch', { x: 4.48, y: 2.4 }, { x: 2.35, y: 2.4 }),
  ...arrow('Yes branch', { x: 8.52, y: 2.4 }, { x: 10.65, y: 2.4 }),
  text('no', 3.42, 2.66),
  text('yes', 9.55, 2.66, { accent: true })
];

const directedGraph = (): readonly CanvasShape[] => {
  const nodes = [
    { id: 'A', x: 2.2, y: 5.8, accent: true },
    { id: 'B', x: 6.2, y: 7.4, accent: true },
    { id: 'C', x: 10.4, y: 5.3, accent: true },
    { id: 'D', x: 9.45, y: 1.55, accent: true },
    { id: 'E', x: 3, y: 2.15, accent: true }
  ] as const;
  const edges: readonly [string, string][] = [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'D'],
    ['D', 'E'],
    ['E', 'A'],
    ['A', 'C'],
    ['C', 'E']
  ];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return [
    ...edges.flatMap(([from, to]) => arrow(`${from} to ${to}`, byId.get(from)!, byId.get(to)!, { insetEnd: 0.62, insetStart: 0.62 })),
    ...nodes.flatMap((node) => [circle(`Node ${node.id}`, node.x, node.y, 0.56, node.accent), text(node.id, node.x, node.y - 0.16, { bold: true })])
  ];
};

const architecture = (): readonly CanvasShape[] => [
  ...labeledRectangle('Client', 'Client', 0.8, 3.35, 2.5, 1.55, true),
  ...labeledRectangle('API', 'API', 5.15, 5.15, 2.55, 1.35),
  ...labeledRectangle('Worker', 'Worker', 5.15, 1.1, 2.55, 1.35),
  ...arrow('Client to API', { x: 3.3, y: 4.35 }, { x: 5.15, y: 5.65 }, { insetEnd: 0.12 }),
  ...arrow('Client to worker', { x: 3.3, y: 3.8 }, { x: 5.15, y: 2 }, { insetEnd: 0.12 }),
  ...arrow('API to database', { x: 7.7, y: 5.82 }, { x: 9.35, y: 5.82 }, { insetEnd: 0.12 }),
  ...arrow('Worker to storage', { x: 7.7, y: 1.78 }, { x: 9.35, y: 1.78 }, { insetEnd: 0.12 }),
  line('Database left side', { x: 9.35, y: 4.6 }, { x: 9.35, y: 6 }),
  line('Database right side', { x: 12.05, y: 4.6 }, { x: 12.05, y: 6 }),
  ellipse('Database bottom', 10.7, 4.6, 1.35, 0.52),
  ellipse('Database top', 10.7, 6, 1.35, 0.52),
  text('Data', 10.7, 5.15),
  ...labeledRectangle('Storage', 'Storage', 9.35, 1.1, 2.7, 1.35)
];

const geometry = (): readonly CanvasShape[] => [
  {
    ...shapeBase('Triangle', INK),
    kind: 'triangle',
    x: 2.2,
    y: 1.3,
    width: 8.4,
    height: 6.1,
    fill: WHITE,
    fillOpacity: 1,
    cornerRadius: 0,
    apexOffset: 0.5,
    rotation: 0
  },
  line('Base accent', { x: 2.2, y: 1.3 }, { x: 10.6, y: 1.3 }, { accent: true }),
  line('Dimension', { x: 2.85, y: 0.48 }, { x: 9.95, y: 0.48 }),
  line('Left dimension tick', { x: 2.85, y: 0.25 }, { x: 2.85, y: 0.71 }),
  line('Right dimension tick', { x: 9.95, y: 0.25 }, { x: 9.95, y: 0.71 }),
  line(
    'Angle arc',
    { x: 3.05, y: 1.3 },
    { x: 2.68, y: 1.98 },
    {
      accent: true,
      anchors: [
        { x: 3.02, y: 1.55 },
        { x: 2.9, y: 1.8 }
      ],
      curved: true
    }
  ),
  text('A', 2.2, 0.82, { bold: true }),
  text('B', 6.4, 7.68, { bold: true }),
  text('C', 10.6, 0.82, { bold: true }),
  text('α', 2.78, 1.48, { accent: true, bold: true }),
  text('4.2 cm', 6.4, 0.16, { bold: true })
];

const neuralNetwork = (): readonly CanvasShape[] => {
  const inputs = [
    { id: 'x₁', x: 1.7, y: 6.8 },
    { id: 'x₂', x: 1.7, y: 4 },
    { id: 'x₃', x: 1.7, y: 1.2 }
  ];
  const hidden = [
    { id: 'h₁', x: 6.35, y: 7.15 },
    { id: 'h₂', x: 6.35, y: 4.15 },
    { id: 'h₃', x: 6.35, y: 1.15 }
  ];
  const outputs = [
    { id: 'y₁', x: 11, y: 5.7 },
    { id: 'y₂', x: 11, y: 2.25 }
  ];
  return [
    ...inputs.flatMap((from) => hidden.map((to) => line(`${from.id} to ${to.id}`, from, to))),
    ...hidden.flatMap((from) => outputs.map((to) => line(`${from.id} to ${to.id}`, from, to))),
    ...inputs.flatMap((node) => [circle(`Input ${node.id}`, node.x, node.y), text(node.id, node.x, node.y - 0.16, { bold: true })]),
    ...hidden.flatMap((node) => [circle(`Hidden ${node.id}`, node.x, node.y), text(node.id, node.x, node.y - 0.16, { bold: true })]),
    ...outputs.flatMap((node) => [circle(`Output ${node.id}`, node.x, node.y, 0.52, true), text(node.id, node.x, node.y - 0.16, { bold: true })])
  ];
};

const annotatedFigure = (): readonly CanvasShape[] => [
  line('X axis', { x: 1.1, y: 1 }, { x: 11.9, y: 1 }),
  line('Y axis', { x: 1.1, y: 1 }, { x: 1.1, y: 7.45 }),
  line(
    'Measured curve',
    { x: 1.55, y: 1.55 },
    { x: 11.55, y: 4.45 },
    {
      anchors: [
        { x: 3.4, y: 4.7 },
        { x: 6.5, y: 2.3 },
        { x: 9.9, y: 6.55 }
      ],
      curved: true,
      strong: true
    }
  ),
  circle('Local maximum', 3.4, 4.7, 0.14, true),
  circle('Measured peak', 9.9, 6.55, 0.14, true),
  ...labeledRectangle('Local maximum label', 'Local maximum', 1.55, 6.15, 4.05, 1.05),
  ...labeledRectangle('Measured peak label', 'Measured peak', 8.25, 1.45, 3.4, 1.05),
  ...arrow('Local maximum callout', { x: 3.55, y: 6.15 }, { x: 3.4, y: 4.9 }, { accent: true }),
  ...arrow('Measured peak callout', { x: 9.95, y: 2.5 }, { x: 9.9, y: 6.35 }, { accent: true }),
  text('x', 12.05, 0.72),
  text('y', 0.82, 7.55)
];

const figures: Readonly<Record<string, () => readonly CanvasShape[]>> = {
  flowchart,
  'directed-graph': directedGraph,
  'system-architecture': architecture,
  geometry,
  'neural-network': neuralNetwork,
  'annotated-figure': annotatedFigure
};

const textAnchor = (align: TextAlign): SvgTextAnchor => {
  if (align === 'left') {
    return 'start';
  }
  if (align === 'right') {
    return 'end';
  }
  return 'middle';
};

const textRenderXAt = (shape: TextShape, projectX: (value: number) => number, scale: number): number => {
  if (!shape.textBox) {
    return projectX(shape.x);
  }

  const width = shape.boxWidth * scale;
  const left = textLeftForWidth(shape, projectX(shape.x), width);
  if (shape.textAlign === 'right') {
    return left + width;
  }
  if (shape.textAlign === 'center') {
    return left + width / 2;
  }
  return left;
};

const renderFigure = async (name: string, createShapes: () => readonly CanvasShape[]): Promise<void> => {
  nextId = 0;
  const shapes = createShapes();
  const document = buildCanvasExportDocument({
    selectedShapes: [],
    sceneShapes: shapes,
    theme: 'light',
    helpers: {
      computeBounds,
      buildLinePath,
      displayTextLinesForShape,
      textRenderXAt,
      textAnchor,
      arrowMarkerId: (shape, side) => `${shape.id}-${side}`,
      arrowMarkerViewBox: (shape) => arrowMarkerGeometry(shape).viewBox,
      arrowMarkerWidth: (shape) => arrowMarkerGeometry(shape).markerWidth,
      arrowMarkerHeight: (shape) => arrowMarkerGeometry(shape).markerHeight,
      arrowMarkerRefX: (shape) => arrowMarkerGeometry(shape).refX,
      arrowMarkerRefY: (shape) => arrowMarkerGeometry(shape).refY,
      arrowMarkerPath: (shape) => arrowMarkerGeometry(shape).path,
      arrowMarkerFill,
      arrowMarkerStrokeLineJoin: (shape) => (shape.arrowRound ? 'round' : 'miter'),
      arrowMarkerStrokeLineCap: (shape) => (shape.arrowRound ? 'round' : 'butt')
    }
  });
  const svgPath = resolve(OUTPUT_DIRECTORY, `${name}.svg`);
  const webpPath = resolve(OUTPUT_DIRECTORY, `${name}.webp`);
  await writeFile(svgPath, document.markup, 'utf8');
  await sharp(Buffer.from(document.markup))
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: 'contain', background: WHITE })
    .webp({ quality: 90, smartSubsample: true })
    .toFile(webpPath);
};

await mkdir(OUTPUT_DIRECTORY, { recursive: true });
await Promise.all(Object.entries(figures).map(([name, createShapes]) => renderFigure(name, createShapes)));
