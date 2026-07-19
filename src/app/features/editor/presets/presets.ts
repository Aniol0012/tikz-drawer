import type {
  ArrowTipKind,
  CanvasShape,
  CircleShape,
  EditorPreferences,
  EllipseShape,
  LineShape,
  ObjectPreset,
  Point,
  PresetCategory,
  RectangleShape,
  TriangleShape,
  ScenePreset,
  ImageShape,
  TextShape,
  TikzScene
} from '../models/tikz.models';
import {
  DEFAULT_ARROW_SCALE,
  DEFAULT_CIRCLE_RADIUS,
  DEFAULT_ELLIPSE_RX,
  DEFAULT_ELLIPSE_RY,
  DEFAULT_FILL_COLOR,
  DEFAULT_LINE_COLOR,
  DEFAULT_LINE_STROKE_WIDTH,
  DEFAULT_RECTANGLE_CORNER_RADIUS,
  DEFAULT_RECTANGLE_HEIGHT,
  DEFAULT_RECTANGLE_WIDTH,
  DEFAULT_RECTANGLE_Y,
  DEFAULT_SHAPE_STROKE_WIDTH,
  DEFAULT_TEXT_BOX_WIDTH,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_FONT_SIZE,
  EDITOR_OBJECT_SNAP_TOLERANCE_PX
} from '../constants/editor.constants';
import { REGULAR_POLYGON_PRESET_ID } from '../models/regular-polygon.models';
import { DEFAULT_TABLE_GEOMETRY } from '../models/table.models';
import { DEFAULT_GRAPH_DIMENSIONS, GRAPH_PRESET_ID_BY_KIND, type GraphPresetKind } from '../models/graph.models';
import { DEFAULT_ARROW_TIP_KIND } from '../config/arrow-tip.config';
import { buildGraphShapes } from '../utils/graph.utils';
import { buildRegularPolygonShapes } from '../utils/regular-polygon.utils';
import { buildTableShapes } from '../utils/table.utils';

type PresetTextLocalizer = (key: string, fallback: string) => string;

const createLine = (overrides: Partial<LineShape> = {}): LineShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Line',
  kind: 'line',
  stroke: overrides.stroke ?? DEFAULT_LINE_COLOR,
  strokeOpacity: overrides.strokeOpacity ?? 1,
  strokeWidth: overrides.strokeWidth ?? DEFAULT_LINE_STROKE_WIDTH,
  mergeId: overrides.mergeId,
  from: overrides.from ?? { x: -2, y: 0 },
  to: overrides.to ?? { x: 2, y: 0 },
  fromAttachment: overrides.fromAttachment,
  toAttachment: overrides.toAttachment,
  anchors: overrides.anchors ?? [],
  lineMode: overrides.lineMode ?? 'straight',
  strokeStyle: overrides.strokeStyle ?? 'solid',
  arrowStart: overrides.arrowStart ?? false,
  arrowEnd: overrides.arrowEnd ?? false,
  arrowType: overrides.arrowType ?? ('triangle' satisfies ArrowTipKind),
  arrowColor: overrides.arrowColor ?? overrides.stroke ?? DEFAULT_LINE_COLOR,
  arrowOpacity: overrides.arrowOpacity ?? overrides.strokeOpacity ?? 1,
  arrowOpen: overrides.arrowOpen ?? false,
  arrowRound: overrides.arrowRound ?? false,
  arrowScale: overrides.arrowScale ?? DEFAULT_ARROW_SCALE,
  arrowLengthScale: overrides.arrowLengthScale ?? 1,
  arrowWidthScale: overrides.arrowWidthScale ?? 1,
  arrowBendMode: overrides.arrowBendMode ?? 'none'
});

const createRectangle = (overrides: Partial<RectangleShape> = {}): RectangleShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Rectangle',
  kind: 'rectangle',
  stroke: overrides.stroke ?? DEFAULT_LINE_COLOR,
  strokeOpacity: overrides.strokeOpacity ?? 1,
  strokeWidth: overrides.strokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH,
  mergeId: overrides.mergeId,
  x: overrides.x ?? -2,
  y: overrides.y ?? DEFAULT_RECTANGLE_Y,
  width: overrides.width ?? DEFAULT_RECTANGLE_WIDTH,
  height: overrides.height ?? DEFAULT_RECTANGLE_HEIGHT,
  fill: overrides.fill ?? DEFAULT_FILL_COLOR,
  fillOpacity: overrides.fillOpacity ?? 1,
  cornerRadius: overrides.cornerRadius ?? DEFAULT_RECTANGLE_CORNER_RADIUS
});

const createTriangle = (overrides: Partial<TriangleShape> = {}): TriangleShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Triangle',
  kind: 'triangle',
  stroke: overrides.stroke ?? DEFAULT_LINE_COLOR,
  strokeOpacity: overrides.strokeOpacity ?? 1,
  strokeWidth: overrides.strokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH,
  x: overrides.x ?? -2.6,
  y: overrides.y ?? -1.6,
  width: overrides.width ?? 5.2,
  height: overrides.height ?? 3.8,
  fill: overrides.fill ?? DEFAULT_FILL_COLOR,
  fillOpacity: overrides.fillOpacity ?? 1,
  cornerRadius: overrides.cornerRadius ?? 0,
  apexOffset: overrides.apexOffset ?? 0.5
});

const createCircle = (overrides: Partial<CircleShape> = {}): CircleShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Circle',
  kind: 'circle',
  stroke: overrides.stroke ?? DEFAULT_LINE_COLOR,
  strokeOpacity: overrides.strokeOpacity ?? 1,
  strokeWidth: overrides.strokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH,
  cx: overrides.cx ?? 0,
  cy: overrides.cy ?? 0,
  r: overrides.r ?? DEFAULT_CIRCLE_RADIUS,
  fill: overrides.fill ?? '#f5f5f5',
  fillOpacity: overrides.fillOpacity ?? 1
});

const createEllipse = (overrides: Partial<EllipseShape> = {}): EllipseShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Ellipse',
  kind: 'ellipse',
  stroke: overrides.stroke ?? DEFAULT_LINE_COLOR,
  strokeOpacity: overrides.strokeOpacity ?? 1,
  strokeWidth: overrides.strokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH,
  cx: overrides.cx ?? 0,
  cy: overrides.cy ?? 0,
  rx: overrides.rx ?? DEFAULT_ELLIPSE_RX,
  ry: overrides.ry ?? DEFAULT_ELLIPSE_RY,
  fill: overrides.fill ?? '#f5f5f5',
  fillOpacity: overrides.fillOpacity ?? 1
});

const createText = (overrides: Partial<TextShape> = {}): TextShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Label',
  kind: 'text',
  stroke: overrides.stroke ?? 'none',
  strokeOpacity: overrides.strokeOpacity ?? 1,
  strokeWidth: overrides.strokeWidth ?? 0,
  mergeId: overrides.mergeId,
  x: overrides.x ?? 0,
  y: overrides.y ?? 0,
  text: overrides.text ?? 'label',
  textBox: overrides.textBox ?? false,
  boxWidth: overrides.boxWidth ?? DEFAULT_TEXT_BOX_WIDTH,
  fontSize: overrides.fontSize ?? DEFAULT_TEXT_FONT_SIZE,
  color: overrides.color ?? DEFAULT_TEXT_COLOR,
  colorOpacity: overrides.colorOpacity ?? 1,
  fontWeight: overrides.fontWeight ?? 'normal',
  fontStyle: overrides.fontStyle ?? 'normal',
  textDecoration: overrides.textDecoration ?? 'none',
  textAlign: overrides.textAlign ?? 'center',
  rotation: overrides.rotation ?? 0
});

const buildImagePlaceholder = (label: string): string =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='420' viewBox='0 0 640 420'><rect width='640' height='420' fill='#eef4ff'/><rect x='36' y='36' width='568' height='348' rx='20' fill='#dbe9ff' stroke='#9db7f2' stroke-width='6'/><circle cx='180' cy='160' r='40' fill='#8fb1ff'/><path d='M120 300 250 210 340 280 430 180 520 300H120Z' fill='#6b8fe8'/><text x='320' y='360' text-anchor='middle' font-family='Arial, sans-serif' font-size='34' fill='#3251a8'>${label}</text></svg>`
  );

const defaultImagePlaceholder = buildImagePlaceholder('Image');

const textTranslationKeyByShapeName: Readonly<Record<string, string>> = {
  Note: 'preset.note.title',
  Text: 'preset.label.title',
  'Decision label': 'preset.decision.title',
  'Terminator label': 'presetText.terminator.start',
  'IO label': 'preset.input-output.title',
  'Database label': 'preset.database.title',
  'Label 1': 'presetText.timeline.kickoff',
  'Label 2': 'presetText.timeline.review',
  'Label 3': 'presetText.timeline.launch',
  'Callout text': 'presetText.callout.label',
  'Cloud label': 'preset.cloud.title',
  'Stage 1 label': 'presetText.pipeline.input',
  'Stage 2 label': 'presetText.pipeline.transform',
  'Stage 3 label': 'presetText.pipeline.output',
  'Hexagon label': 'presetText.hexagon.label',
  'Note label': 'preset.sticky-note.title',
  'Swimlane title': 'presetText.swimlane.label',
  'Actor label': 'presetText.actor.label',
  'Folder label': 'preset.folder.title',
  'Message text': 'preset.message.title',
  'Kanban todo': 'presetText.kanban.todo',
  'Kanban doing': 'presetText.kanban.doing',
  'Kanban done': 'presetText.kanban.done',
  'Process label': 'sceneText.flow-starter.process',
  'Client label': 'sceneText.system-map.client',
  'API label': 'sceneText.system-map.api',
  'Growth note': 'sceneText.metrics-board.note'
};

export const localizePresetCanvasShapes = (shapes: readonly CanvasShape[], localize: PresetTextLocalizer): readonly CanvasShape[] =>
  shapes.map((shape) => {
    if (shape.kind === 'text') {
      const key = textTranslationKeyByShapeName[shape.name];
      if (!key) {
        return shape;
      }

      return {
        ...shape,
        text: localize(key, shape.text)
      } satisfies TextShape;
    }

    if (shape.kind === 'image' && shape.latexSource === 'images/example.png') {
      return {
        ...shape,
        src: buildImagePlaceholder(localize('preset.image.title', 'Image'))
      } satisfies ImageShape;
    }

    return shape;
  });

const createImage = (overrides: Partial<ImageShape> = {}): ImageShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Image',
  kind: 'image',
  stroke: overrides.stroke ?? '#94a3b8',
  strokeOpacity: overrides.strokeOpacity ?? 1,
  strokeWidth: overrides.strokeWidth ?? 0.08,
  x: overrides.x ?? -2.4,
  y: overrides.y ?? -1.6,
  width: overrides.width ?? 4.8,
  height: overrides.height ?? 3.2,
  aspectRatio: overrides.aspectRatio ?? 1.5,
  src: overrides.src ?? defaultImagePlaceholder,
  latexSource: overrides.latexSource ?? 'images/example.png'
});

const createPreset = (
  id: string,
  category: PresetCategory,
  icon: string,
  title: string,
  description: string,
  shapes: readonly CanvasShape[],
  options: {
    readonly quickAccess?: boolean;
    readonly preserveStyle?: boolean;
    readonly searchTerms?: readonly string[];
    readonly iconWidth?: number;
    readonly iconStrokeWidth?: number;
  } = {}
): ObjectPreset => ({
  id,
  category,
  icon,
  iconWidth: options.iconWidth,
  iconStrokeWidth: options.iconStrokeWidth,
  title,
  description,
  shapes,
  quickAccess: options.quickAccess,
  preserveStyle: options.preserveStyle,
  searchTerms: options.searchTerms
});

const createGraphPreset = (
  kind: GraphPresetKind,
  icon: string,
  title: string,
  description: string,
  searchTerms: readonly string[],
  options: {
    readonly iconStrokeWidth?: number;
  } = {}
): ObjectPreset =>
  createPreset(GRAPH_PRESET_ID_BY_KIND[kind], 'graphs', icon, title, description, buildGraphShapes({ ...DEFAULT_GRAPH_DIMENSIONS, kind, cx: 0, cy: 0 }), {
    preserveStyle: true,
    searchTerms,
    iconWidth: 22,
    iconStrokeWidth: options.iconStrokeWidth ?? 1.35
  });

const circuitLine = (name: string, from: Point, to: Point, overrides: Partial<LineShape> = {}): LineShape =>
  createLine({
    name,
    from,
    to,
    strokeWidth: 0.07,
    stroke: '#1f1f1f',
    ...overrides
  });

const circuitText = (name: string, text: string, x: number, y: number, fontSize = 0.28): TextShape =>
  createText({
    name,
    text,
    x,
    y,
    fontSize,
    color: '#1f1f1f'
  });

const circuitPolyline = (name: string, points: readonly Point[], overrides: Partial<LineShape> = {}): readonly LineShape[] =>
  points.slice(0, -1).map((point, index) => circuitLine(`${name} ${index + 1}`, point, points[index + 1], overrides));

const createCircuitPreset = (
  id: string,
  icon: string,
  title: string,
  description: string,
  shapes: readonly CanvasShape[],
  searchTerms: readonly string[] = []
): ObjectPreset =>
  createPreset(id, 'electricity', icon, title, description, shapes, {
    preserveStyle: true,
    searchTerms: ['electricity', 'circuit', 'electronics', ...searchTerms]
  });

const createLogicPreset = (id: string, title: string, description: string, shapes: readonly CanvasShape[], searchTerms: readonly string[] = []): ObjectPreset =>
  createPreset(id, 'logic', 'logicGate', title, description, shapes, {
    preserveStyle: true,
    searchTerms: ['logic', 'gate', 'digital', ...searchTerms]
  });

const endNodeShapes = (): readonly CanvasShape[] => {
  const terminal = createCircle({ name: 'End node terminal', cx: 0, cy: 0, r: 0.24, fill: '#ffffff', strokeWidth: 0.07 });

  return [circuitLine('End node lead', { x: -2.4, y: 0 }, { x: -0.24, y: 0 }, { toAttachment: { shapeId: terminal.id, anchor: { x: -1, y: 0 } } }), terminal];
};

const junctionNodeShapes = (): readonly CanvasShape[] => {
  const dot = createCircle({ name: 'Junction dot', cx: 0, cy: 0, r: 0.18, fill: '#1f1f1f', stroke: '#1f1f1f', strokeWidth: 0.07 });

  return [
    circuitLine('Junction left branch', { x: -2.2, y: 0 }, { x: -0.18, y: 0 }, { toAttachment: { shapeId: dot.id, anchor: { x: -1, y: 0 } } }),
    circuitLine('Junction right branch', { x: 0.18, y: 0 }, { x: 2.2, y: 0 }, { fromAttachment: { shapeId: dot.id, anchor: { x: 1, y: 0 } } }),
    circuitLine('Junction lower branch', { x: 0, y: -1.6 }, { x: 0, y: -0.18 }, { toAttachment: { shapeId: dot.id, anchor: { x: 0, y: -1 } } }),
    circuitLine('Junction upper branch', { x: 0, y: 0.18 }, { x: 0, y: 1.6 }, { fromAttachment: { shapeId: dot.id, anchor: { x: 0, y: 1 } } }),
    dot
  ];
};

const resistorIecShapes = (): readonly CanvasShape[] => [
  circuitLine('Resistor lead left', { x: -2.8, y: 0 }, { x: -1.2, y: 0 }),
  createRectangle({
    name: 'Resistor body',
    x: -1.2,
    y: -0.38,
    width: 2.4,
    height: 0.76,
    fill: 'none',
    cornerRadius: 0.02,
    strokeWidth: 0.07
  }),
  circuitLine('Resistor lead right', { x: 1.2, y: 0 }, { x: 2.8, y: 0 })
];

const resistorAmericanShapes = (): readonly CanvasShape[] => [
  circuitLine('American resistor lead left', { x: -2.8, y: 0 }, { x: -1.7, y: 0 }),
  ...circuitPolyline('American resistor zigzag', [
    { x: -1.7, y: 0 },
    { x: -1.35, y: 0.55 },
    { x: -0.9, y: -0.55 },
    { x: -0.45, y: 0.55 },
    { x: 0, y: -0.55 },
    { x: 0.45, y: 0.55 },
    { x: 0.9, y: -0.55 },
    { x: 1.35, y: 0.55 },
    { x: 1.7, y: 0 }
  ]),
  circuitLine('American resistor lead right', { x: 1.7, y: 0 }, { x: 2.8, y: 0 })
];

const capacitorShapes = (options: { readonly variable?: boolean; readonly polarized?: boolean } = {}): readonly CanvasShape[] => [
  circuitLine('Capacitor lead left', { x: -2.8, y: 0 }, { x: -0.45, y: 0 }),
  circuitLine('Capacitor plate left', { x: -0.45, y: -1 }, { x: -0.45, y: 1 }),
  circuitLine('Capacitor plate right', { x: 0.45, y: -1 }, { x: 0.45, y: 1 }),
  circuitLine('Capacitor lead right', { x: 0.45, y: 0 }, { x: 2.8, y: 0 }),
  ...(options.polarized ? [circuitText('Capacitor plus', '+', -1.05, 0.72, 0.42)] : []),
  ...(options.variable
    ? [circuitLine('Capacitor adjustment arrow', { x: -1.1, y: -1.1 }, { x: 1.2, y: 1.1 }, { arrowEnd: true, arrowType: 'latex', arrowOpen: true })]
    : [])
];

const inductorShapes = (variable = false): readonly CanvasShape[] => [
  circuitLine('Inductor lead left', { x: -2.9, y: 0 }, { x: -1.5, y: 0 }),
  createEllipse({ name: 'Inductor coil 1', cx: -0.9, cy: 0, rx: 0.45, ry: 0.62, fill: 'none', strokeWidth: 0.07 }),
  createEllipse({ name: 'Inductor coil 2', cx: -0.25, cy: 0, rx: 0.45, ry: 0.62, fill: 'none', strokeWidth: 0.07 }),
  createEllipse({ name: 'Inductor coil 3', cx: 0.4, cy: 0, rx: 0.45, ry: 0.62, fill: 'none', strokeWidth: 0.07 }),
  createEllipse({ name: 'Inductor coil 4', cx: 1.05, cy: 0, rx: 0.45, ry: 0.62, fill: 'none', strokeWidth: 0.07 }),
  circuitLine('Inductor lead right', { x: 1.5, y: 0 }, { x: 2.9, y: 0 }),
  ...(variable
    ? [circuitLine('Inductor adjustment arrow', { x: -1.5, y: -1.2 }, { x: 1.5, y: 1.2 }, { arrowEnd: true, arrowType: 'latex', arrowOpen: true })]
    : [])
];

const fuseShapes = (asymmetric = false): readonly CanvasShape[] => [
  circuitLine('Fuse lead left', { x: -2.8, y: 0 }, { x: -1.3, y: 0 }),
  createRectangle({ name: 'Fuse body', x: -1.3, y: -0.55, width: 2.6, height: 1.1, fill: 'none', cornerRadius: 0.12, strokeWidth: 0.07 }),
  circuitLine('Fuse filament', { x: -0.85, y: asymmetric ? -0.16 : 0 }, { x: 0.85, y: asymmetric ? 0.24 : 0 }),
  circuitLine('Fuse lead right', { x: 1.3, y: 0 }, { x: 2.8, y: 0 })
];

const sourceCircleShapes = (label: string, name: string): readonly CanvasShape[] => {
  const body = createCircle({ name: `${name} body`, cx: 0, cy: 0, r: 1.05, fill: 'none', strokeWidth: 0.07 });

  return [
    circuitLine(`${name} lead left`, { x: -2.8, y: 0 }, { x: -1.05, y: 0 }, { toAttachment: { shapeId: body.id, anchor: { x: -1, y: 0 } } }),
    body,
    circuitText(`${name} symbol`, label, 0, 0, label.length > 2 ? 0.26 : 0.44),
    circuitLine(`${name} lead right`, { x: 1.05, y: 0 }, { x: 2.8, y: 0 }, { fromAttachment: { shapeId: body.id, anchor: { x: 1, y: 0 } } })
  ];
};

const meterShapes = (label: string, name: string): readonly CanvasShape[] => {
  const body = createCircle({ name: `${name} body`, cx: 0, cy: 0, r: 1.05, fill: 'none', strokeWidth: 0.07 });

  return [
    circuitLine(`${name} lead left`, { x: -2.8, y: 0 }, { x: -1.05, y: 0 }, { toAttachment: { shapeId: body.id, anchor: { x: -1, y: 0 } } }),
    body,
    circuitText(`${name} label`, label, 0, 0, 0.5),
    circuitLine(`${name} lead right`, { x: 1.05, y: 0 }, { x: 2.8, y: 0 }, { fromAttachment: { shapeId: body.id, anchor: { x: 1, y: 0 } } })
  ];
};

const diodeShapes = (variant: 'standard' | 'zener' | 'led' = 'standard'): readonly CanvasShape[] => [
  circuitLine('Diode lead left', { x: -2.8, y: 0 }, { x: -0.9, y: 0 }),
  circuitLine('Diode body top', { x: -0.9, y: -0.9 }, { x: 0.5, y: 0 }),
  circuitLine('Diode body bottom', { x: -0.9, y: 0.9 }, { x: 0.5, y: 0 }),
  circuitLine('Diode body back', { x: -0.9, y: -0.9 }, { x: -0.9, y: 0.9 }),
  circuitLine('Diode cathode', { x: 0.5, y: -0.95 }, { x: 0.5, y: 0.95 }),
  ...(variant === 'zener'
    ? [
        circuitLine('Zener cathode top', { x: 0.5, y: -0.95 }, { x: 0.85, y: -0.65 }),
        circuitLine('Zener cathode bottom', { x: 0.5, y: 0.95 }, { x: 0.15, y: 0.65 })
      ]
    : []),
  ...(variant === 'led'
    ? [
        circuitLine('LED ray 1', { x: 0.95, y: 1 }, { x: 1.75, y: 1.8 }, { arrowEnd: true, arrowType: 'latex' }),
        circuitLine('LED ray 2', { x: 1.25, y: 0.55 }, { x: 2.05, y: 1.35 }, { arrowEnd: true, arrowType: 'latex' })
      ]
    : []),
  circuitLine('Diode lead right', { x: 0.5, y: 0 }, { x: 2.8, y: 0 })
];

const transistorShapes = (kind: 'npn' | 'pnp'): readonly CanvasShape[] => [
  createCircle({ name: `${kind.toUpperCase()} body`, cx: 0, cy: 0, r: 1.45, fill: 'none', strokeWidth: 0.07 }),
  circuitLine(`${kind.toUpperCase()} base`, { x: -2.6, y: 0 }, { x: -0.75, y: 0 }),
  circuitLine(`${kind.toUpperCase()} base bar`, { x: -0.75, y: -0.8 }, { x: -0.75, y: 0.8 }),
  circuitLine(`${kind.toUpperCase()} collector`, { x: -0.75, y: 0.55 }, { x: 1.35, y: 1.55 }),
  circuitLine(
    `${kind.toUpperCase()} emitter`,
    { x: -0.75, y: -0.55 },
    { x: 1.35, y: -1.55 },
    { arrowEnd: kind === 'npn', arrowStart: kind === 'pnp', arrowType: 'latex' }
  ),
  circuitLine(`${kind.toUpperCase()} collector lead`, { x: 1.35, y: 1.55 }, { x: 2.4, y: 1.55 }),
  circuitLine(`${kind.toUpperCase()} emitter lead`, { x: 1.35, y: -1.55 }, { x: 2.4, y: -1.55 })
];

const groundShapes = (): readonly CanvasShape[] => [
  circuitLine('Ground stem', { x: 0, y: 1.8 }, { x: 0, y: 0.5 }),
  circuitLine('Ground bar wide', { x: -1.1, y: 0.5 }, { x: 1.1, y: 0.5 }),
  circuitLine('Ground bar mid', { x: -0.7, y: 0.05 }, { x: 0.7, y: 0.05 }),
  circuitLine('Ground bar narrow', { x: -0.32, y: -0.4 }, { x: 0.32, y: -0.4 })
];

const opAmpShapes = (): readonly CanvasShape[] => [
  ...circuitPolyline('Op amp outline', [
    { x: -1.45, y: -1.6 },
    { x: -1.45, y: 1.6 },
    { x: 1.55, y: 0 },
    { x: -1.45, y: -1.6 }
  ]),
  circuitLine('Op amp non-inverting input', { x: -2.8, y: 0.8 }, { x: -1.45, y: 0.8 }),
  circuitLine('Op amp inverting input', { x: -2.8, y: -0.8 }, { x: -1.45, y: -0.8 }),
  circuitLine('Op amp output', { x: 1.55, y: 0 }, { x: 2.8, y: 0 }),
  circuitText('Op amp plus', '+', -1.12, 0.78, 0.34),
  circuitText('Op amp minus', '-', -1.12, -0.8, 0.34)
];

const switchShapes = (closed = false): readonly CanvasShape[] => {
  const leftContact = createCircle({ name: 'Switch contact left', cx: -0.8, cy: 0, r: 0.14, fill: '#ffffff', strokeWidth: 0.07 });
  const rightContact = createCircle({ name: 'Switch contact right', cx: 0.95, cy: 0, r: 0.14, fill: '#ffffff', strokeWidth: 0.07 });

  return [
    circuitLine('Switch lead left', { x: -2.8, y: 0 }, { x: -0.94, y: 0 }, { toAttachment: { shapeId: leftContact.id, anchor: { x: -1, y: 0 } } }),
    leftContact,
    rightContact,
    circuitLine(
      'Switch blade',
      { x: -0.8, y: 0 },
      { x: 0.95, y: closed ? 0 : 0.7 },
      {
        fromAttachment: { shapeId: leftContact.id, anchor: { x: 0, y: 0 } },
        toAttachment: closed ? { shapeId: rightContact.id, anchor: { x: 0, y: 0 } } : undefined
      }
    ),
    circuitLine('Switch lead right', { x: 1.09, y: 0 }, { x: 2.8, y: 0 }, { fromAttachment: { shapeId: rightContact.id, anchor: { x: 1, y: 0 } } })
  ];
};

const pushButtonShapes = (closed = false): readonly CanvasShape[] => {
  const leftContact = createCircle({ name: 'Button contact left', cx: -0.8, cy: 0, r: 0.12, fill: '#ffffff', strokeWidth: 0.07 });
  const rightContact = createCircle({ name: 'Button contact right', cx: 0.8, cy: 0, r: 0.12, fill: '#ffffff', strokeWidth: 0.07 });

  return [
    circuitLine('Button lead left', { x: -2.8, y: 0 }, { x: -0.92, y: 0 }, { toAttachment: { shapeId: leftContact.id, anchor: { x: -1, y: 0 } } }),
    leftContact,
    rightContact,
    circuitLine(
      'Button bridge',
      { x: -0.8, y: closed ? 0 : 0.55 },
      { x: 0.8, y: closed ? 0 : 0.55 },
      {
        fromAttachment: closed ? { shapeId: leftContact.id, anchor: { x: 0, y: 0 } } : undefined,
        toAttachment: closed ? { shapeId: rightContact.id, anchor: { x: 0, y: 0 } } : undefined
      }
    ),
    circuitLine('Button stem', { x: 0, y: 0.55 }, { x: 0, y: 1.35 }),
    circuitLine('Button cap', { x: -0.55, y: 1.35 }, { x: 0.55, y: 1.35 }),
    circuitLine('Button lead right', { x: 0.92, y: 0 }, { x: 2.8, y: 0 }, { fromAttachment: { shapeId: rightContact.id, anchor: { x: 1, y: 0 } } })
  ];
};

const andGateShapes = (inverted = false): readonly CanvasShape[] => [
  circuitLine('AND left edge', { x: -1.45, y: -1.3 }, { x: -1.45, y: 1.3 }),
  circuitLine('AND top edge', { x: -1.45, y: 1.3 }, { x: 0, y: 1.3 }),
  circuitLine('AND bottom edge', { x: -1.45, y: -1.3 }, { x: 0, y: -1.3 }),
  circuitLine(
    'AND curve',
    { x: 0, y: 1.3 },
    { x: 0, y: -1.3 },
    {
      lineMode: 'curved',
      anchors: [
        { x: 1.75, y: 0.95 },
        { x: 1.75, y: -0.95 }
      ]
    }
  ),
  circuitLine('AND input 1', { x: -2.8, y: 0.7 }, { x: -1.45, y: 0.7 }),
  circuitLine('AND input 2', { x: -2.8, y: -0.7 }, { x: -1.45, y: -0.7 }),
  ...(inverted ? [createCircle({ name: 'AND inversion bubble', cx: 1.62, cy: 0, r: 0.22, fill: '#ffffff', strokeWidth: 0.07 })] : []),
  circuitLine('AND output', { x: inverted ? 1.84 : 1.62, y: 0 }, { x: 2.8, y: 0 })
];

const orGateShapes = (inverted = false, exclusive = false): readonly CanvasShape[] => [
  ...(exclusive ? [circuitLine('XOR extra curve', { x: -1.82, y: -1.25 }, { x: -1.82, y: 1.25 }, { lineMode: 'curved', anchors: [{ x: -1.18, y: 0 }] })] : []),
  circuitLine('OR left curve', { x: -1.45, y: -1.3 }, { x: -1.45, y: 1.3 }, { lineMode: 'curved', anchors: [{ x: -0.78, y: 0 }] }),
  circuitLine(
    'OR top curve',
    { x: -1.45, y: 1.3 },
    { x: 1.55, y: 0 },
    {
      lineMode: 'curved',
      anchors: [
        { x: 0.35, y: 1.38 },
        { x: 1.25, y: 0.75 }
      ]
    }
  ),
  circuitLine(
    'OR bottom curve',
    { x: -1.45, y: -1.3 },
    { x: 1.55, y: 0 },
    {
      lineMode: 'curved',
      anchors: [
        { x: 0.35, y: -1.38 },
        { x: 1.25, y: -0.75 }
      ]
    }
  ),
  circuitLine('OR input 1', { x: -2.8, y: 0.7 }, { x: -1.22, y: 0.7 }),
  circuitLine('OR input 2', { x: -2.8, y: -0.7 }, { x: -1.22, y: -0.7 }),
  ...(inverted ? [createCircle({ name: 'OR inversion bubble', cx: 1.78, cy: 0, r: 0.22, fill: '#ffffff', strokeWidth: 0.07 })] : []),
  circuitLine('OR output', { x: inverted ? 2 : 1.55, y: 0 }, { x: 2.8, y: 0 })
];

const bufferGateShapes = (inverted = false): readonly CanvasShape[] => [
  ...circuitPolyline('Buffer outline', [
    { x: -1.35, y: -1.2 },
    { x: -1.35, y: 1.2 },
    { x: 1.15, y: 0 },
    { x: -1.35, y: -1.2 }
  ]),
  circuitLine('Buffer input', { x: -2.8, y: 0 }, { x: -1.35, y: 0 }),
  ...(inverted ? [createCircle({ name: 'NOT inversion bubble', cx: 1.38, cy: 0, r: 0.22, fill: '#ffffff', strokeWidth: 0.07 })] : []),
  circuitLine('Buffer output', { x: inverted ? 1.6 : 1.15, y: 0 }, { x: 2.8, y: 0 })
];

const electricityPresets = (): readonly ObjectPreset[] => [
  createCircuitPreset('end-node', 'node', 'End node', 'Open terminal node for circuit endpoints.', endNodeShapes()),
  createCircuitPreset('junction-node', 'node', 'Junction node', 'Filled node for connected circuit branches.', junctionNodeShapes()),
  createCircuitPreset('resistor-iec', 'resistor', 'Resistor (IEC)', 'Rectangular IEC resistor with leads.', resistorIecShapes(), ['resistor', 'iec', 'ohm']),
  createCircuitPreset('resistor-american', 'resistor', 'American resistor', 'Zigzag resistor symbol with leads.', resistorAmericanShapes(), [
    'resistor',
    'american',
    'zigzag'
  ]),
  createCircuitPreset('capacitor-iec', 'capacitor', 'Capacitor (IEC)', 'Two-plate capacitor symbol.', capacitorShapes(), ['capacitor']),
  createCircuitPreset('variable-capacitor', 'capacitor', 'Variable capacitor', 'Capacitor with an adjustment arrow.', capacitorShapes({ variable: true }), [
    'capacitor',
    'variable',
    'adjustable'
  ]),
  createCircuitPreset('polarized-capacitor', 'capacitor', 'Polarized capacitor', 'Capacitor with polarity mark.', capacitorShapes({ polarized: true }), [
    'capacitor',
    'polarized',
    'electrolytic'
  ]),
  createCircuitPreset('inductor', 'electricity', 'Inductor', 'Coil inductor symbol with leads.', inductorShapes(), ['inductor', 'coil']),
  createCircuitPreset('variable-inductor', 'electricity', 'Variable inductor', 'Inductor with an adjustment arrow.', inductorShapes(true), [
    'inductor',
    'variable',
    'coil'
  ]),
  createCircuitPreset(
    'potentiometer-iec',
    'resistor',
    'Potentiometer (IEC)',
    'IEC resistor with wiper arrow.',
    [...resistorIecShapes(), circuitLine('Potentiometer wiper', { x: 0, y: -1.55 }, { x: 0, y: -0.38 }, { arrowEnd: true, arrowType: 'latex' })],
    ['potentiometer', 'variable resistor']
  ),
  createCircuitPreset('fuse', 'electricity', 'Fuse', 'Inline fuse symbol.', fuseShapes(), ['fuse']),
  createCircuitPreset('asymmetric-fuse', 'electricity', 'Asymmetric fuse', 'Fuse with slanted inner element.', fuseShapes(true), ['fuse', 'asymmetric']),
  createCircuitPreset(
    'cell',
    'capacitor',
    'Cell',
    'Single battery cell with long and short plates.',
    [
      circuitLine('Cell lead left', { x: -2.8, y: 0 }, { x: -0.45, y: 0 }),
      circuitLine('Cell short plate', { x: -0.45, y: -0.75 }, { x: -0.45, y: 0.75 }),
      circuitLine('Cell long plate', { x: 0.45, y: -1.1 }, { x: 0.45, y: 1.1 }),
      circuitLine('Cell lead right', { x: 0.45, y: 0 }, { x: 2.8, y: 0 })
    ],
    ['cell', 'battery']
  ),
  createCircuitPreset(
    'battery',
    'capacitor',
    'Battery',
    'Multi-cell battery symbol.',
    [
      circuitLine('Battery lead left', { x: -2.8, y: 0 }, { x: -1.05, y: 0 }),
      circuitLine('Battery plate 1 short', { x: -1.05, y: -0.65 }, { x: -1.05, y: 0.65 }),
      circuitLine('Battery plate 1 long', { x: -0.55, y: -1.05 }, { x: -0.55, y: 1.05 }),
      circuitLine('Battery plate 2 short', { x: 0.15, y: -0.65 }, { x: 0.15, y: 0.65 }),
      circuitLine('Battery plate 2 long', { x: 0.65, y: -1.05 }, { x: 0.65, y: 1.05 }),
      circuitLine('Battery lead right', { x: 0.65, y: 0 }, { x: 2.8, y: 0 })
    ],
    ['battery', 'cell']
  ),
  createCircuitPreset(
    'voltage-source',
    'electricity',
    'Voltage source',
    'Circular voltage source with polarity.',
    sourceCircleShapes('+ -', 'Voltage source'),
    ['source', 'voltage']
  ),
  createCircuitPreset(
    'current-source',
    'electricity',
    'Current source',
    'Circular current source with arrow.',
    (() => {
      const body = createCircle({ name: 'Current source body', cx: 0, cy: 0, r: 1.05, fill: 'none', strokeWidth: 0.07 });
      return [
        circuitLine('Current source lead left', { x: -2.8, y: 0 }, { x: -1.05, y: 0 }, { toAttachment: { shapeId: body.id, anchor: { x: -1, y: 0 } } }),
        body,
        circuitLine('Current source arrow', { x: 0, y: -0.55 }, { x: 0, y: 0.55 }, { arrowEnd: true, arrowType: 'latex' }),
        circuitLine('Current source lead right', { x: 1.05, y: 0 }, { x: 2.8, y: 0 }, { fromAttachment: { shapeId: body.id, anchor: { x: 1, y: 0 } } })
      ];
    })(),
    ['source', 'current']
  ),
  createCircuitPreset(
    'sinewave-source',
    'electricity',
    'Sinewave source',
    'Circular source marked with a sine wave.',
    sourceCircleShapes('~', 'Sinewave source'),
    ['source', 'sine', 'ac']
  ),
  createCircuitPreset(
    'squarewave-source',
    'electricity',
    'Squarewave source',
    'Circular source marked with a square wave.',
    sourceCircleShapes('sq', 'Squarewave source'),
    ['source', 'square', 'wave']
  ),
  createCircuitPreset('ammeter', 'electricity', 'Ammeter', 'Current meter symbol.', meterShapes('A', 'Ammeter'), ['meter', 'ammeter']),
  createCircuitPreset('voltmeter', 'electricity', 'Voltmeter', 'Voltage meter symbol.', meterShapes('V', 'Voltmeter'), ['meter', 'voltmeter']),
  createCircuitPreset('ohmmeter', 'electricity', 'Ohmmeter', 'Resistance meter symbol.', meterShapes(String.raw`\Omega`, 'Ohmmeter'), ['meter', 'ohm']),
  createCircuitPreset(
    'lamp',
    'electricity',
    'Lamp',
    'Lamp symbol in a circle.',
    (() => {
      const bulb = createCircle({ name: 'Lamp bulb', cx: 0, cy: 0, r: 1.05, fill: 'none', strokeWidth: 0.07 });
      return [
        circuitLine('Lamp lead left', { x: -2.8, y: 0 }, { x: -1.05, y: 0 }, { toAttachment: { shapeId: bulb.id, anchor: { x: -1, y: 0 } } }),
        bulb,
        circuitLine('Lamp cross 1', { x: -0.58, y: -0.58 }, { x: 0.58, y: 0.58 }),
        circuitLine('Lamp cross 2', { x: -0.58, y: 0.58 }, { x: 0.58, y: -0.58 }),
        circuitLine('Lamp lead right', { x: 1.05, y: 0 }, { x: 2.8, y: 0 }, { fromAttachment: { shapeId: bulb.id, anchor: { x: 1, y: 0 } } })
      ];
    })(),
    ['lamp', 'bulb', 'light']
  ),
  createCircuitPreset('ground', 'ground', 'Ground', 'Standard ground reference symbol.', groundShapes(), ['ground', 'earth']),
  createCircuitPreset('diode', 'diode', 'Diode', 'Standard diode symbol.', diodeShapes(), ['diode']),
  createCircuitPreset('zener-diode', 'diode', 'Zener diode', 'Diode with bent cathode marking.', diodeShapes('zener'), ['diode', 'zener']),
  createCircuitPreset('led', 'diode', 'Light emitting diode (LED)', 'Diode with outgoing light arrows.', diodeShapes('led'), ['diode', 'led', 'light']),
  createCircuitPreset('npn-transistor', 'electricity', 'NPN transistor', 'Bipolar NPN transistor symbol.', transistorShapes('npn'), ['transistor', 'npn']),
  createCircuitPreset('pnp-transistor', 'electricity', 'PNP transistor', 'Bipolar PNP transistor symbol.', transistorShapes('pnp'), ['transistor', 'pnp']),
  createCircuitPreset('op-amp', 'opAmp', 'OpAmp', 'Operational amplifier with inverting and non-inverting inputs.', opAmpShapes(), ['opamp', 'amplifier']),
  createCircuitPreset('open-switch', 'switch', 'Open switch', 'Open single-pole switch.', switchShapes(), ['switch', 'open']),
  createCircuitPreset('closed-switch', 'switch', 'Closed switch', 'Closed single-pole switch.', switchShapes(true), ['switch', 'closed']),
  createCircuitPreset('push-button', 'switch', 'Push button', 'Open push button contact.', pushButtonShapes(), ['button', 'push']),
  createCircuitPreset('closed-push-button', 'switch', 'Closed push button', 'Closed push button contact.', pushButtonShapes(true), ['button', 'push', 'closed'])
];

const logicPresets = (): readonly ObjectPreset[] => [
  createLogicPreset('and-gate', 'AND gate', 'Two-input AND logic gate.', andGateShapes(), ['and']),
  createLogicPreset('nand-gate', 'NAND gate', 'AND gate with inverted output.', andGateShapes(true), ['nand']),
  createLogicPreset('or-gate', 'OR gate', 'Two-input OR logic gate.', orGateShapes(), ['or']),
  createLogicPreset('nor-gate', 'NOR gate', 'OR gate with inverted output.', orGateShapes(true), ['nor']),
  createLogicPreset('xor-gate', 'XOR gate', 'Exclusive OR logic gate.', orGateShapes(false, true), ['xor']),
  createLogicPreset('xnor-gate', 'XNOR gate', 'Exclusive OR gate with inverted output.', orGateShapes(true, true), ['xnor']),
  createLogicPreset('buffer-gate', 'Buffer', 'Digital buffer gate.', bufferGateShapes(), ['buffer']),
  createLogicPreset('not-gate', 'NOT gate', 'Inverter logic gate.', bufferGateShapes(true), ['not', 'inverter'])
];

export const buildTablePresetShapes = (overrides: Partial<typeof DEFAULT_TABLE_GEOMETRY> = {}): readonly CanvasShape[] =>
  buildTableShapes({
    ...DEFAULT_TABLE_GEOMETRY,
    ...overrides
  });

export const defaultPreferences: EditorPreferences = {
  theme: 'light',
  snapToGrid: true,
  snapToObjects: true,
  showObjectSnapGuides: true,
  showGrid: true,
  showAxes: true,
  scale: 24,
  gridStep: 1,
  snapStep: 0.25,
  objectSnapTolerance: EDITOR_OBJECT_SNAP_TOLERANCE_PX,
  defaultStroke: '#1f1f1f',
  defaultFill: '#f1f1f1',
  defaultStrokeOpacity: 1,
  defaultFillOpacity: 1,
  defaultStrokeWidth: 0.28,
  defaultArrowScale: 1.35,
  defaultArrowType: DEFAULT_ARROW_TIP_KIND,
  defaultLineStrokeStyle: 'solid',
  defaultCornerRadius: DEFAULT_RECTANGLE_CORNER_RADIUS,
  defaultTextColor: DEFAULT_TEXT_COLOR,
  defaultTextOpacity: 1,
  defaultTextFontSize: DEFAULT_TEXT_FONT_SIZE,
  defaultTextWeight: 'normal',
  defaultTextStyle: 'normal',
  defaultTextDecoration: 'none',
  defaultTextAlign: 'center',
  defaultImagePath: 'images'
};

const complexDiagramPresets = (): readonly ObjectPreset[] => {
  const label = (name: string, text: string, x: number, y: number, fontSize = 0.24): TextShape => createText({ name, text, x, y, fontSize, textBox: false });
  const box = (name: string, text: string, x: number, y: number, width = 2.2, height = 0.9, fill = '#f7f9fc'): readonly CanvasShape[] => [
    createRectangle({ name, x, y, width, height, fill, cornerRadius: 0.16 }),
    label(`${name} label`, text, x + width / 2, y + height / 2, 0.24)
  ];
  const arrow = (name: string, from: Point, to: Point, dashed = false): LineShape =>
    createLine({ name, from, to, arrowEnd: true, arrowType: 'latex', strokeStyle: dashed ? 'dashed' : 'solid', strokeWidth: 0.07 });

  const sequenceActors = ['Client', 'API', 'Service', 'DB'];
  const sequenceX = [-4.5, -1.5, 1.5, 4.5];
  const sequenceShapes: CanvasShape[] = sequenceActors.flatMap((actor, index) => [
    ...box(`Sequence ${actor}`, actor, sequenceX[index] - 0.9, 2.6, 1.8, 0.72, '#eef4ff'),
    createLine({ name: `${actor} lifeline`, from: { x: sequenceX[index], y: 2.6 }, to: { x: sequenceX[index], y: -3.3 }, strokeStyle: 'dashed' })
  ]);
  const sequenceMessages = [
    [-4.5, -1.5, 1.7, 'request', false],
    [-1.5, 1.5, 0.85, 'validate', false],
    [1.5, 4.5, 0, 'query', false],
    [4.5, 1.5, -0.85, 'rows', true],
    [1.5, -1.5, -1.7, 'result', true],
    [-1.5, -4.5, -2.55, 'response', true]
  ] as const;
  for (const [fromX, toX, y, text, dashed] of sequenceMessages) {
    sequenceShapes.push(arrow(`Sequence ${text}`, { x: fromX, y }, { x: toX, y }, dashed), label(`Sequence ${text} label`, text, (fromX + toX) / 2, y + 0.27));
  }

  const layeredShapes: CanvasShape[] = [];
  ['Presentation', 'Application', 'Domain', 'Infrastructure'].forEach((text, index) => {
    const y = 2.35 - index * 1.55;
    layeredShapes.push(...box(`${text} layer`, `${text} layer`, -4.8, y, 9.6, 1.02, index % 2 ? '#f8fafc' : '#eef4ff'));
    ['A', 'B', 'C'].forEach((suffix, column) =>
      layeredShapes.push(...box(`${text} ${suffix}`, `${text.slice(0, 4)} ${suffix}`, -3.9 + column * 3, y + 0.18, 1.8, 0.66, '#ffffff'))
    );
    if (index < 3) {
      layeredShapes.push(arrow(`${text} dependency`, { x: 0, y }, { x: 0, y: y - 0.53 }));
    }
  });

  const networkPoints = [
    { x: -2.6, y: 1.2, text: 'A1' },
    { x: -0.8, y: 2.2, text: 'A2' },
    { x: 1.4, y: 1.2, text: 'A3' },
    { x: -0.4, y: -0.2, text: 'A4' }
  ];
  const clusteredNetwork: CanvasShape[] = [
    createRectangle({ name: 'Cluster frame', x: -3.5, y: -1.1, width: 6, height: 4.25, fill: '#f8fafc', cornerRadius: 0.3 })
  ];
  networkPoints.forEach((point) =>
    clusteredNetwork.push(
      createCircle({ name: point.text, cx: point.x, cy: point.y, r: 0.48, fill: '#ffffff' }),
      label(`${point.text} label`, point.text, point.x, point.y)
    )
  );
  [
    [0, 1, '0.91'],
    [1, 2, 'sync'],
    [2, 3, '0.31'],
    [3, 0, 'link']
  ].forEach(([from, to, text], index) => {
    const a = networkPoints[Number(from)];
    const b = networkPoints[Number(to)];
    clusteredNetwork.push(
      arrow(`Cluster ${text}`, a, b, index === 2),
      label(`Cluster ${text} label`, String(text), (a.x + b.x) / 2, (a.y + b.y) / 2 + 0.28, 0.2)
    );
  });
  clusteredNetwork.push(label('Cluster title', 'Cluster A', -0.5, 2.8, 0.3));

  const statePoints = [
    { x: -4.6, y: 0.8, text: 'Created' },
    { x: -2, y: 2, text: 'Validated' },
    { x: 0.8, y: 0.8, text: 'Pending' },
    { x: 3.5, y: 2, text: 'Executed' },
    { x: 5.5, y: 0.8, text: 'Closed' },
    { x: -1.8, y: -2, text: 'Rejected' },
    { x: 2.5, y: -2, text: 'Cancelled' }
  ];
  const stateMachine: CanvasShape[] = [];
  statePoints.forEach((point) =>
    stateMachine.push(
      createCircle({ name: point.text, cx: point.x, cy: point.y, r: 0.67, fill: '#ffffff' }),
      label(`${point.text} label`, point.text, point.x, point.y, 0.2)
    )
  );
  [
    [0, 1, 'valid'],
    [1, 2, 'confirm'],
    [2, 3, 'process'],
    [3, 4, 'balance'],
    [0, 5, 'invalid'],
    [2, 6, 'stop'],
    [6, 4, 'resolve']
  ].forEach(([from, to, text]) => {
    const a = statePoints[Number(from)];
    const b = statePoints[Number(to)];
    stateMachine.push(arrow(`State ${text}`, a, b), label(`State ${text} label`, String(text), (a.x + b.x) / 2, (a.y + b.y) / 2 + 0.26, 0.18));
  });

  const architectureBox = (name: string, text: string, x: number, y: number, width: number, height: number, fill: string) => {
    const mergeId = crypto.randomUUID();
    const rectangle = createRectangle({
      name,
      x,
      y,
      width,
      height,
      fill,
      cornerRadius: 0.659,
      stroke: '#1f1f1f',
      strokeWidth: 0.08,
      mergeId
    });
    const textShape = createText({
      name: `${name} label`,
      text,
      x: x + width / 2,
      y: y + height / 2,
      fontSize: 0.72,
      color: '#161616',
      textBox: false,
      mergeId
    });
    return { rectangle, text: textShape };
  };
  const webUi = architectureBox('Service Web UI', 'Web UI', -27.144, 29.304, 9.272, 3.694, '#ffffff');
  const restApi = architectureBox('Service REST API', 'REST API', -14.576, 29.304, 9.272, 3.694, '#ffffff');
  const appService = architectureBox('Service App service', 'App service', -2.007, 29.304, 9.272, 3.694, '#ffffff');
  const domainModel = architectureBox('Service Domain model', 'Domain model', 10.562, 29.304, 9.272, 3.694, '#ffffff');
  const eventBus = architectureBox('Event bus', 'Event bus / commands', -2.874, 21.515, 26.374, 3.829, '#eef4ff');
  const cache = architectureBox('Cache store', 'Cache', -26.205, 10.631, 7.417, 4.506, '#f8fafc');
  const sqlDb = architectureBox('SQL store', 'SQL DB', -13.646, 10.512, 7.418, 4.505, '#f8fafc');
  const asyncWorker = architectureBox('Async worker', 'Async worker', 5.784, 10.898, 9.066, 4.506, '#f8fafc');
  const serviceArchitecture: CanvasShape[] = [
    webUi.rectangle,
    webUi.text,
    restApi.rectangle,
    restApi.text,
    appService.rectangle,
    appService.text,
    domainModel.rectangle,
    domainModel.text,
    eventBus.rectangle,
    eventBus.text,
    cache.rectangle,
    cache.text,
    sqlDb.rectangle,
    sqlDb.text,
    asyncWorker.rectangle,
    asyncWorker.text
  ];
  const attachedArchitectureArrow = (
    name: string,
    fromShape: RectangleShape,
    from: Point,
    fromAnchor: Point,
    toShape: RectangleShape,
    to: Point,
    toAnchor: Point,
    dashed = false
  ): LineShape =>
    createLine({
      name,
      from,
      to,
      fromAttachment: { shapeId: fromShape.id, anchor: fromAnchor },
      toAttachment: { shapeId: toShape.id, anchor: toAnchor },
      arrowEnd: true,
      arrowType: 'latex',
      arrowOpen: true,
      arrowScale: 1.35,
      strokeStyle: dashed ? 'dashed' : 'solid',
      strokeWidth: 0.07
    });
  const leftAnchor = { x: -1, y: 0 };
  const rightAnchor = { x: 1, y: 0 };
  const topAnchor = { x: 0, y: 1 };
  const bottomAnchor = { x: 0, y: -1 };
  serviceArchitecture.push(
    attachedArchitectureArrow(
      'Web UI to REST API',
      webUi.rectangle,
      { x: -17.872, y: 31.151 },
      rightAnchor,
      restApi.rectangle,
      { x: -14.576, y: 31.151 },
      leftAnchor
    ),
    attachedArchitectureArrow(
      'REST API to App service',
      restApi.rectangle,
      { x: -5.304, y: 31.151 },
      rightAnchor,
      appService.rectangle,
      { x: -2.007, y: 31.151 },
      leftAnchor
    ),
    attachedArchitectureArrow(
      'App service to Domain model',
      appService.rectangle,
      { x: 7.265, y: 31.151 },
      rightAnchor,
      domainModel.rectangle,
      { x: 10.562, y: 31.151 },
      leftAnchor
    ),
    attachedArchitectureArrow(
      'Web UI to Cache',
      webUi.rectangle,
      { x: -22.508, y: 29.304 },
      bottomAnchor,
      cache.rectangle,
      { x: -22.497, y: 15.137 },
      topAnchor,
      true
    ),
    attachedArchitectureArrow(
      'REST API to SQL DB',
      restApi.rectangle,
      { x: -9.94, y: 29.304 },
      bottomAnchor,
      sqlDb.rectangle,
      { x: -9.937, y: 15.017 },
      topAnchor
    ),
    attachedArchitectureArrow(
      'Event bus to Async worker',
      eventBus.rectangle,
      { x: 10.313, y: 21.515 },
      bottomAnchor,
      asyncWorker.rectangle,
      { x: 10.317, y: 15.404 },
      topAnchor
    )
  );

  const processPoints = Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 2 - index * (Math.PI / 3);
    return { x: Math.cos(angle) * 3.4, y: Math.sin(angle) * 3.4, text: ['Plan', 'Build', 'Test', 'Deploy', 'Monitor', 'Improve'][index] };
  });
  const circularProcess: CanvasShape[] = [...box('Cycle center', 'Iterative cycle', -1.1, -0.45, 2.2, 0.9, '#eef4ff')];
  processPoints.forEach((point, index) => {
    circularProcess.push(
      createCircle({ name: `Phase ${point.text}`, cx: point.x, cy: point.y, r: 0.66, fill: '#ffffff' }),
      label(`Phase ${point.text} label`, point.text, point.x, point.y, 0.2)
    );
    const next = processPoints[(index + 1) % processPoints.length];
    circularProcess.push(arrow(`Phase arrow ${index}`, point, next));
  });

  const timeline: CanvasShape[] = [arrow('Timeline axis', { x: -5, y: 0 }, { x: 5, y: 0 })];
  ['Planning', 'Prototype', 'Testing', 'Release'].forEach((text, index) => {
    const x = -3.75 + index * 2.5;
    const above = index % 2 === 0;
    timeline.push(
      createCircle({ name: `Milestone ${index + 1}`, cx: x, cy: 0, r: 0.38, fill: '#ffffff' }),
      label(`Milestone number ${index + 1}`, String(index + 1), x, 0, 0.18),
      ...box(`Timeline ${text}`, text, x - 0.95, above ? 1 : -1.75, 1.9, 0.7, '#f8fafc'),
      createLine({ name: `Timeline tick ${index + 1}`, from: { x, y: above ? 0.38 : -0.38 }, to: { x, y: above ? 1 : -1.05 } })
    );
  });

  const entities = [
    { x: -4.8, y: 0.8, title: 'Customer', fields: 'id\nname\nfiscalNumber' },
    { x: -0.9, y: 0.8, title: 'Invoice', fields: 'id\ncustomerId\ntotalAmount' },
    { x: -0.9, y: -2.4, title: 'InvoiceLine', fields: 'id\ninvoiceId\nnetAmount' },
    { x: -4.8, y: -2.4, title: 'Payment', fields: 'id\ninvoiceId\npaidAmount' }
  ];
  const entityDiagram: CanvasShape[] = [];
  entities.forEach((entity) =>
    entityDiagram.push(
      ...box(`Entity ${entity.title}`, entity.title, entity.x, entity.y, 2.8, 2.15, '#ffffff'),
      createLine({ name: `${entity.title} divider`, from: { x: entity.x, y: entity.y + 1.48 }, to: { x: entity.x + 2.8, y: entity.y + 1.48 } }),
      createText({
        name: `${entity.title} fields`,
        text: entity.fields,
        x: entity.x + 0.25,
        y: entity.y + 0.72,
        textBox: true,
        boxWidth: 2.3,
        fontSize: 0.2,
        textAlign: 'left'
      })
    )
  );
  entityDiagram.push(
    arrow('Customer invoices', { x: -2, y: 1.88 }, { x: -0.9, y: 1.88 }),
    label('Customer invoices label', '1:N', -1.45, 2.18, 0.18),
    arrow('Invoice lines', { x: 0.5, y: 0.8 }, { x: 0.5, y: -0.25 }),
    label('Invoice lines label', '1:N', 0.85, 0.25, 0.18),
    arrow('Invoice payments', { x: -0.9, y: 0.8 }, { x: -2, y: -1.3 }),
    label('Invoice payments label', '1:N', -1.25, -0.15, 0.18)
  );

  const isometric: CanvasShape[] = [];
  [
    [-4, 0, 'Core'],
    [0, 0, 'API'],
    [4, 0, 'DB'],
    [0, 3, 'Cache']
  ].forEach(([rawX, rawY, rawText]) => {
    const x = Number(rawX),
      y = Number(rawY),
      text = String(rawText);
    const p = [
      { x: x - 1.2, y: y - 0.8 },
      { x: x + 0.8, y: y - 0.8 },
      { x: x + 1.4, y: y - 0.25 },
      { x: x - 0.6, y: y - 0.25 },
      { x: x - 1.2, y: y - 0.8 },
      { x: x - 1.2, y: y + 0.7 },
      { x: x + 0.8, y: y + 0.7 },
      { x: x + 1.4, y: y + 1.25 },
      { x: x + 1.4, y: y - 0.25 }
    ];
    for (let i = 0; i < p.length - 1; i++) {
      isometric.push(createLine({ name: `${text} edge ${i}`, from: p[i], to: p[i + 1] }));
    }
    isometric.push(
      createLine({ name: `${text} back edge`, from: { x: x - 0.6, y: y - 0.25 }, to: { x: x - 0.6, y: y + 1.25 } }),
      createLine({ name: `${text} top edge`, from: { x: x - 0.6, y: y + 1.25 }, to: { x: x + 1.4, y: y + 1.25 } }),
      label(`${text} cube label`, text, x + 0.1, y + 0.25, 0.24)
    );
  });
  isometric.push(
    arrow('Core API', { x: -2.5, y: 0.2 }, { x: -1.4, y: 0.2 }),
    arrow('API DB', { x: 1.5, y: 0.2 }, { x: 2.6, y: 0.2 }),
    arrow('API Cache', { x: 0.7, y: 1.35 }, { x: 0.7, y: 2.15 })
  );

  return [
    createPreset('sequence-diagram', 'flow', 'arrow', 'Sequence diagram', 'Actors, lifelines, messages and return values.', sequenceShapes, {
      preserveStyle: true,
      searchTerms: ['sequence', 'uml', 'lifeline', 'messages']
    }),
    createPreset('layered-architecture', 'concepts', 'server', 'Layered architecture', 'Four editable layers with modules and dependencies.', layeredShapes, {
      preserveStyle: true,
      searchTerms: ['architecture', 'layers', 'modules']
    }),
    createPreset('clustered-network', 'concepts', 'hub', 'Clustered network', 'Grouped network with weighted and dashed links.', clusteredNetwork, {
      preserveStyle: true,
      searchTerms: ['cluster', 'network', 'weighted']
    }),
    createPreset('state-machine', 'flow', 'graphCycle', 'State machine', 'States, transitions and readable condition labels.', stateMachine, {
      preserveStyle: true,
      searchTerms: ['state', 'machine', 'transitions', 'uml']
    }),
    createPreset('service-architecture', 'concepts', 'server', 'Service architecture', 'UI, API, domain, bus, stores and worker.', serviceArchitecture, {
      preserveStyle: true,
      searchTerms: ['service', 'architecture', 'bus', 'database']
    }),
    createPreset('circular-process', 'flow', 'graphCycle', 'Circular process', 'Six-stage iterative process around a central idea.', circularProcess, {
      preserveStyle: true,
      searchTerms: ['cycle', 'process', 'iterative']
    }),
    createPreset('project-timeline', 'data', 'timeline', 'Project timeline', 'Alternating milestone cards with a directional timeline.', timeline, {
      preserveStyle: true,
      searchTerms: ['timeline', 'milestones', 'project']
    }),
    createPreset('entity-relationship', 'data', 'table', 'Entity relationship', 'Editable entities, fields and cardinality labels.', entityDiagram, {
      preserveStyle: true,
      searchTerms: ['entity', 'relationship', 'erd', 'database']
    }),
    createPreset('isometric-architecture', 'geometry', 'cube', 'Isometric architecture', 'Wireframe service blocks with directional links.', isometric, {
      preserveStyle: true,
      searchTerms: ['isometric', '3d', 'cuboid', 'architecture']
    })
  ];
};

export const objectPresets: readonly ObjectPreset[] = [
  createPreset('segment', 'essentials', 'segment', 'Line', 'Straight segment for geometry and diagrams.', [createLine({ name: 'Line' })], {
    quickAccess: true,
    searchTerms: ['line', 'segment', 'edge']
  }),
  createPreset(
    'arrow',
    'essentials',
    'arrow',
    'Arrow',
    'Directional connector for flows and vectors.',
    [createLine({ name: 'Arrow', arrowEnd: true, stroke: '#8a4d16' })],
    { quickAccess: true, searchTerms: ['arrow', 'flow', 'connector'] }
  ),
  createPreset(
    'box',
    'essentials',
    'rectangle',
    'Rectangle',
    'Rounded rectangle for blocks and notes.',
    [createRectangle({ name: 'Rectangle', fill: '#f0f0f0' })],
    { quickAccess: true, searchTerms: ['rectangle', 'box', 'process'] }
  ),
  createPreset('circle', 'essentials', 'circle', 'Circle', 'Circle for highlights and nodes.', [createCircle({ name: 'Circle' })], {
    quickAccess: true,
    searchTerms: ['circle', 'node', 'round']
  }),
  createPreset(
    'ellipse',
    'essentials',
    'ellipse',
    'Ellipse',
    'Soft capsule-like form for labels and states.',
    [createEllipse({ name: 'Ellipse', fill: '#f3f3f3' })],
    { quickAccess: true, searchTerms: ['ellipse', 'state', 'pill'] }
  ),
  createPreset(
    'note',
    'essentials',
    'note',
    'Note',
    'Text box for annotations and descriptions.',
    [createText({ name: 'Note', text: 'Note', textBox: true, boxWidth: 4.8, textAlign: 'left' })],
    { searchTerms: ['note', 'text box', 'annotation', 'comment'] }
  ),
  createPreset('label', 'essentials', 'text', 'Text', 'Simple text label positioned on the canvas.', [createText({ name: 'Text', text: 'Text' })], {
    quickAccess: true,
    searchTerms: ['label', 'text', 'annotation']
  }),
  createPreset('image', 'interface', 'image', 'Image', 'Place an image with editable preview source and LaTeX path.', [createImage()], {
    quickAccess: true,
    searchTerms: ['image', 'photo', 'picture', 'asset']
  }),
  ...electricityPresets(),
  ...logicPresets(),
  ...complexDiagramPresets(),
  createPreset(
    'decision',
    'flow',
    'decision',
    'Decision',
    'Diamond node for decisions and branches.',
    [
      createLine({ name: 'Decision top-left', from: { x: 0, y: 1.6 }, to: { x: 1.9, y: 0 }, stroke: '#1f1f1f' }),
      createLine({ name: 'Decision top-right', from: { x: 1.9, y: 0 }, to: { x: 0, y: -1.6 }, stroke: '#1f1f1f' }),
      createLine({ name: 'Decision bottom-right', from: { x: 0, y: -1.6 }, to: { x: -1.9, y: 0 }, stroke: '#1f1f1f' }),
      createLine({ name: 'Decision bottom-left', from: { x: -1.9, y: 0 }, to: { x: 0, y: 1.6 }, stroke: '#1f1f1f' }),
      createText({ name: 'Decision label', text: 'Decision' })
    ],
    { searchTerms: ['decision', 'diamond', 'branch', 'flowchart'] }
  ),
  createPreset(
    'terminator',
    'flow',
    'terminator',
    'Terminator',
    'Start/end shape for process diagrams.',
    [createEllipse({ name: 'Terminator', rx: 2.3, ry: 1.1, fill: '#f0f0f0' }), createText({ name: 'Terminator label', text: 'Start' })],
    { searchTerms: ['start', 'end', 'terminator', 'capsule'] }
  ),
  createPreset(
    'input-output',
    'flow',
    'io',
    'Input / Output',
    'Parallelogram block for inputs and outputs.',
    [
      createLine({ name: 'IO top', from: { x: -1.8, y: 1.1 }, to: { x: 2.2, y: 1.1 } }),
      createLine({ name: 'IO right', from: { x: 2.2, y: 1.1 }, to: { x: 1.4, y: -1.1 } }),
      createLine({ name: 'IO bottom', from: { x: 1.4, y: -1.1 }, to: { x: -2.6, y: -1.1 } }),
      createLine({ name: 'IO left', from: { x: -2.6, y: -1.1 }, to: { x: -1.8, y: 1.1 } }),
      createText({ name: 'IO label', text: 'Input / Output', x: -0.2, y: 0 })
    ],
    { searchTerms: ['input', 'output', 'io', 'parallelogram'] }
  ),
  createPreset(
    'document',
    'flow',
    'document',
    'Document',
    'Document block for reports and generated output.',
    [
      createRectangle({
        name: 'Document page',
        x: -1.8,
        y: -2.35,
        width: 3.6,
        height: 4.9,
        fill: '#fbfbfb',
        cornerRadius: 0.08
      }),
      createRectangle({
        name: 'Document fold',
        x: 0.95,
        y: 1.8,
        width: 0.7,
        height: 0.7,
        fill: '#f3f3f3',
        cornerRadius: 0.06
      }),
      createLine({
        name: 'Document fold diagonal',
        from: { x: 0.95, y: 1.8 },
        to: { x: 1.65, y: 2.5 },
        stroke: '#8a918b',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Document title',
        from: { x: -1.2, y: 1.5 },
        to: { x: 0.55, y: 1.5 },
        stroke: '#5c6065',
        strokeWidth: 0.08
      }),
      createLine({
        name: 'Document line 1',
        from: { x: -1.2, y: 0.85 },
        to: { x: 1.2, y: 0.85 },
        stroke: '#8a918b',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Document line 2',
        from: { x: -1.2, y: 0.3 },
        to: { x: 1.2, y: 0.3 },
        stroke: '#8a918b',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Document line 3',
        from: { x: -1.2, y: -0.25 },
        to: { x: 1.2, y: -0.25 },
        stroke: '#8a918b',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Document line 4',
        from: { x: -1.2, y: -0.8 },
        to: { x: 1.2, y: -0.8 },
        stroke: '#8a918b',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Document line 5',
        from: { x: -1.2, y: -1.35 },
        to: { x: 0.65, y: -1.35 },
        stroke: '#8a918b',
        strokeWidth: 0.05
      })
    ],
    { searchTerms: ['document', 'report', 'paper'] }
  ),
  createPreset(
    'database',
    'data',
    'database',
    'Database',
    'Cylinder-like database symbol.',
    [
      createEllipse({ name: 'Database top', cx: 0, cy: 1.2, rx: 2.1, ry: 0.6, fill: '#ededed' }),
      createRectangle({
        name: 'Database body',
        x: -2.1,
        y: -1.3,
        width: 4.2,
        height: 2.5,
        fill: '#ededed',
        cornerRadius: 0
      }),
      createEllipse({ name: 'Database bottom', cx: 0, cy: -1.3, rx: 2.1, ry: 0.6, fill: '#e2e2e2' }),
      createText({ name: 'Database label', text: 'DB', y: 0 })
    ],
    { searchTerms: ['database', 'storage', 'db', 'cylinder'] }
  ),
  createPreset(
    'bar-chart',
    'data',
    'bars',
    'Bar Chart',
    'Mini chart group for dashboards and reports.',
    [
      createLine({ name: 'Chart axis x', from: { x: -2.3, y: -1.4 }, to: { x: 2.5, y: -1.4 }, arrowEnd: true }),
      createLine({ name: 'Chart axis y', from: { x: -2.3, y: -1.4 }, to: { x: -2.3, y: 1.8 }, arrowEnd: true }),
      createRectangle({
        name: 'Bar 1',
        x: -1.6,
        y: -1.4,
        width: 0.8,
        height: 1.2,
        fill: '#d8d8d8',
        cornerRadius: 0.08
      }),
      createRectangle({
        name: 'Bar 2',
        x: -0.4,
        y: -1.4,
        width: 0.8,
        height: 2.1,
        fill: '#9cb9ff',
        cornerRadius: 0.08
      }),
      createRectangle({ name: 'Bar 3', x: 0.8, y: -1.4, width: 0.8, height: 2.7, fill: '#2f66f3', cornerRadius: 0.08 })
    ],
    { searchTerms: ['bar', 'chart', 'graph', 'analytics'] }
  ),
  createPreset(
    'timeline',
    'data',
    'timeline',
    'Timeline',
    'Timeline lane with milestones.',
    [
      createLine({ name: 'Timeline axis', from: { x: -3.2, y: 0 }, to: { x: 3.2, y: 0 }, stroke: '#6d706b' }),
      createCircle({ name: 'Milestone 1', cx: -2.2, cy: 0, r: 0.24, fill: '#2f66f3', stroke: '#2f66f3' }),
      createCircle({ name: 'Milestone 2', cx: 0, cy: 0, r: 0.24, fill: '#2f66f3', stroke: '#2f66f3' }),
      createCircle({ name: 'Milestone 3', cx: 2.2, cy: 0, r: 0.24, fill: '#2f66f3', stroke: '#2f66f3' }),
      createText({ name: 'Label 1', text: 'Kickoff', x: -2.2, y: 0.72, fontSize: 0.34 }),
      createText({ name: 'Label 2', text: 'Review', x: 0, y: -0.78, fontSize: 0.34 }),
      createText({ name: 'Label 3', text: 'Launch', x: 2.2, y: 0.72, fontSize: 0.34 })
    ],
    { searchTerms: ['timeline', 'milestone', 'roadmap'] }
  ),
  createPreset(
    'axes',
    'geometry',
    'axes',
    'Axes',
    'Coordinate system with labels.',
    [
      createLine({ name: 'X axis', from: { x: -3.5, y: 0 }, to: { x: 3.8, y: 0 }, arrowEnd: true }),
      createLine({ name: 'Y axis', from: { x: 0, y: -2.8 }, to: { x: 0, y: 3.3 }, arrowEnd: true }),
      createText({ name: 'X label', text: 'x', x: 4.1, y: 0.22, fontSize: 0.34 }),
      createText({ name: 'Y label', text: 'y', x: 0.26, y: 3.55, fontSize: 0.34 })
    ],
    { searchTerms: ['axes', 'plane', 'math', 'graph'] }
  ),
  createPreset(
    'triangle',
    'geometry',
    'triangle',
    'Triangle',
    'Three-edge geometry starter.',
    [createTriangle({ name: 'Triangle', fill: '#f3f3f3', apexOffset: 0.5 })],
    { quickAccess: true, searchTerms: ['triangle', 'geometry', 'polygon'] }
  ),
  createPreset(
    REGULAR_POLYGON_PRESET_ID,
    'geometry',
    'hexagon',
    'Regular polygon',
    'Custom regular polygon with a chosen number of sides.',
    buildRegularPolygonShapes(),
    { searchTerms: ['polygon', 'regular', 'pentagon', 'hexagon', 'sides', 'geometry'] }
  ),
  createPreset(
    'venn',
    'geometry',
    'venn',
    'Venn Pair',
    'Two overlapping sets with labels.',
    [
      createCircle({ name: 'Set A', cx: -0.8, cy: 0, r: 1.6, fill: '#ececec' }),
      createCircle({ name: 'Set B', cx: 0.8, cy: 0, r: 1.6, fill: '#f5f5f5' }),
      createText({ name: 'A label', text: 'A', x: -1.5, y: 0 }),
      createText({ name: 'B label', text: 'B', x: 1.5, y: 0 })
    ],
    { searchTerms: ['venn', 'sets', 'overlap'] }
  ),
  createGraphPreset('independent', 'graphIndependent', 'Independent set', 'Isolated vertices with no edges.', [
    'graph',
    'independent',
    'isolated',
    'empty',
    'vertices'
  ]),
  createGraphPreset(
    'complete',
    'graphComplete',
    'Complete graph',
    'Clique K_n with every pair of vertices connected.',
    ['graph', 'complete', 'clique', 'k_n', 'network'],
    { iconStrokeWidth: 1.18 }
  ),
  createGraphPreset('cycle', 'graphCycle', 'Cycle graph', 'Cycle C_n with vertices arranged around a ring.', ['graph', 'cycle', 'c_n', 'ring']),
  createGraphPreset('path', 'graphPath', 'Path graph', 'Path P_n for ordered vertex chains.', ['graph', 'path', 'p_n', 'chain'], { iconStrokeWidth: 1.25 }),
  createGraphPreset('star', 'graphStar', 'Star graph', 'Central vertex connected to all leaves.', ['graph', 'star', 'hub', 'tree']),
  createGraphPreset('wheel', 'graphWheel', 'Wheel graph', 'Cycle with a central hub connected to every rim vertex.', [
    'graph',
    'wheel',
    'hub',
    'cycle',
    'spokes'
  ]),
  createGraphPreset(
    'bipartite',
    'graphBipartite',
    'Complete bipartite graph',
    'Two shores with all cross-connections.',
    ['graph', 'bipartite', 'k_mn', 'matching'],
    { iconStrokeWidth: 1.08 }
  ),
  createGraphPreset('grid', 'graphGrid', 'Grid graph', 'Rectangular lattice with horizontal and vertical edges.', ['graph', 'grid', 'lattice', 'mesh'], {
    iconStrokeWidth: 1.18
  }),
  createGraphPreset('ladder', 'graphLadder', 'Ladder graph', 'Two parallel paths connected by regular rungs.', [
    'graph',
    'ladder',
    'rungs',
    'parallel',
    'path'
  ]),
  createGraphPreset('prism', 'graphPrism', 'Prism graph', 'Two matching cycles joined vertex to vertex.', [
    'graph',
    'prism',
    'cycle',
    'polyhedral',
    'matching'
  ]),
  createGraphPreset('binary-tree', 'graphTree', 'Binary tree', 'Balanced binary tree with configurable levels.', ['graph', 'tree', 'binary', 'hierarchy']),
  createGraphPreset(
    'petersen',
    'graphPetersen',
    'Petersen graph',
    'Classic 10-vertex cubic graph for graph theory examples.',
    ['graph', 'petersen', 'cubic', 'regular'],
    { iconStrokeWidth: 1.08 }
  ),
  createGraphPreset('kary-tree', 'graphKaryTree', 'k-ary tree', 'Complete rooted tree with a configurable branching factor.', [
    'graph',
    'tree',
    'k-ary',
    'rooted',
    'hierarchy'
  ]),
  createGraphPreset(
    'layered-dag',
    'graphLayeredDag',
    'Layered DAG',
    'Directed acyclic graph arranged by layers.',
    ['graph', 'dag', 'directed', 'layers', 'acyclic'],
    { iconStrokeWidth: 1.12 }
  ),
  createGraphPreset(
    'flow-network',
    'graphFlowNetwork',
    'Flow network',
    'Source-to-sink layered network for capacities and flows.',
    ['graph', 'flow', 'network', 'source', 'sink', 'capacity'],
    { iconStrokeWidth: 1.12 }
  ),
  createGraphPreset(
    'neural-network',
    'graphNeuralNetwork',
    'Neural network',
    'Layered dense network with input, hidden and output nodes.',
    ['graph', 'neural', 'network', 'layers', 'machine learning'],
    { iconStrokeWidth: 1.08 }
  ),
  createPreset(
    'browser',
    'interface',
    'browser',
    'Browser Window',
    'Quick browser frame for UI sketches.',
    [
      createRectangle({
        name: 'Browser frame',
        x: -3.05,
        y: -1.2,
        width: 6.1,
        height: 3.95,
        cornerRadius: 0.34,
        fill: '#fbfbfb'
      }),
      createLine({
        name: 'Browser toolbar divider',
        from: { x: -3.05, y: 1.82 },
        to: { x: 3.05, y: 1.82 },
        stroke: '#b8bdc4',
        strokeWidth: 0.05
      }),
      createCircle({ name: 'Browser dot 1', cx: -2.7, cy: 2.22, r: 0.14, fill: '#ff5f57', stroke: '#d64b45' }),
      createCircle({ name: 'Browser dot 2', cx: -2.28, cy: 2.22, r: 0.14, fill: '#febc2e', stroke: '#d39a21' }),
      createCircle({ name: 'Browser dot 3', cx: -1.86, cy: 2.22, r: 0.14, fill: '#28c840', stroke: '#24a437' }),
      createRectangle({
        name: 'Browser address bar',
        x: -1.45,
        y: 2.03,
        width: 4,
        height: 0.42,
        cornerRadius: 0.18,
        fill: '#f3f5f7',
        stroke: '#cfd6dd',
        strokeWidth: 0.05
      })
    ],
    { preserveStyle: true, searchTerms: ['browser', 'window', 'web', 'ui'] }
  ),
  createPreset(
    'phone',
    'interface',
    'phone',
    'Phone Screen',
    'Mobile device frame.',
    [
      createRectangle({
        name: 'Phone body',
        x: -1.45,
        y: -2.95,
        width: 2.9,
        height: 5.9,
        cornerRadius: 0.46,
        fill: '#fbfbfb'
      }),
      createRectangle({
        name: 'Phone screen',
        x: -1.18,
        y: -2.58,
        width: 2.36,
        height: 5.16,
        cornerRadius: 0.38,
        fill: '#f7f7f7'
      }),
      createRectangle({
        name: 'Phone island',
        x: -0.42,
        y: 2.06,
        width: 0.84,
        height: 0.2,
        cornerRadius: 0.1,
        fill: '#1f1f1f',
        stroke: '#1f1f1f',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Phone home indicator',
        from: { x: -0.34, y: -2.1 },
        to: { x: 0.34, y: -2.1 },
        stroke: '#c6c8cb',
        strokeWidth: 0.09
      })
    ],
    { searchTerms: ['phone', 'mobile', 'device', 'app'] }
  ),
  createPreset(
    'server-stack',
    'interface',
    'server',
    'Server Stack',
    'Stack of server units for architecture diagrams.',
    [
      createRectangle({
        name: 'Server 1',
        x: -2.2,
        y: 1.6,
        width: 4.4,
        height: 0.8,
        fill: '#f5f5f5',
        cornerRadius: 0.12
      }),
      createRectangle({
        name: 'Server 2',
        x: -2.2,
        y: 0.4,
        width: 4.4,
        height: 0.8,
        fill: '#ececec',
        cornerRadius: 0.12
      }),
      createRectangle({
        name: 'Server 3',
        x: -2.2,
        y: -0.8,
        width: 4.4,
        height: 0.8,
        fill: '#e2e2e2',
        cornerRadius: 0.12
      }),
      createCircle({ name: 'Indicator 1', cx: 1.5, cy: 2, r: 0.08, fill: '#2f66f3', stroke: '#2f66f3' }),
      createCircle({ name: 'Indicator 2', cx: 1.5, cy: 0.8, r: 0.08, fill: '#2f66f3', stroke: '#2f66f3' }),
      createCircle({ name: 'Indicator 3', cx: 1.5, cy: -0.4, r: 0.08, fill: '#2f66f3', stroke: '#2f66f3' })
    ],
    { searchTerms: ['server', 'rack', 'backend', 'infrastructure'] }
  ),
  createPreset(
    'callout',
    'concepts',
    'callout',
    'Callout',
    'Annotation with a leader line.',
    [
      createRectangle({
        name: 'Callout body',
        x: -0.4,
        y: 0.3,
        width: 4.4,
        height: 2,
        fill: '#fbfbfb',
        cornerRadius: 0.24
      }),
      createLine({ name: 'Callout leader', from: { x: -0.4, y: 0.9 }, to: { x: -2.4, y: -1.1 }, stroke: '#6d706b' }),
      createCircle({ name: 'Callout target', cx: -2.4, cy: -1.1, r: 0.12, fill: '#2f66f3', stroke: '#2f66f3' }),
      createText({
        name: 'Callout text',
        x: 0.1,
        y: 1.35,
        text: 'Annotation',
        textBox: true,
        boxWidth: 3.4,
        fontSize: 0.34,
        textAlign: 'left'
      })
    ],
    { searchTerms: ['callout', 'annotation', 'note'] }
  ),
  createPreset(
    'cloud',
    'concepts',
    'cloud',
    'Cloud',
    'Soft cloud cluster for services and networks.',
    [
      createCircle({ name: 'Cloud fill left', cx: -1.25, cy: -0.2, r: 1.05, fill: '#fbfbfb', strokeOpacity: 0 }),
      createCircle({ name: 'Cloud fill center', cx: -0.1, cy: 0.45, r: 1.28, fill: '#fbfbfb', strokeOpacity: 0 }),
      createCircle({ name: 'Cloud fill right', cx: 1.2, cy: -0.18, r: 0.98, fill: '#fbfbfb', strokeOpacity: 0 }),
      createEllipse({
        name: 'Cloud fill base',
        cx: 0,
        cy: -0.62,
        rx: 2.35,
        ry: 0.88,
        fill: '#fbfbfb',
        strokeOpacity: 0
      }),
      createLine({
        name: 'Cloud outline',
        from: { x: -2.35, y: -0.65 },
        anchors: [
          { x: -2.32, y: 0.1 },
          { x: -1.65, y: 0.72 },
          { x: -1.02, y: 0.6 },
          { x: -0.68, y: 1.28 },
          { x: 0.18, y: 1.36 },
          { x: 0.78, y: 0.78 },
          { x: 1.48, y: 0.76 },
          { x: 2.18, y: 0.18 },
          { x: 2.2, y: -0.52 },
          { x: 1.7, y: -1.22 },
          { x: 0.15, y: -1.42 },
          { x: -1.62, y: -1.18 }
        ],
        to: { x: -2.35, y: -0.65 },
        lineMode: 'curved',
        strokeWidth: 0.06
      }),
      createText({ name: 'Cloud label', text: 'Cloud', y: -0.28, fontSize: 0.34 })
    ],
    { searchTerms: ['cloud', 'network', 'infra', 'service'] }
  ),
  createPreset(
    'pipeline',
    'concepts',
    'pipeline',
    'Pipeline',
    'Three-stage pipeline with connectors.',
    [
      createRectangle({ name: 'Stage 1', x: -4.8, y: -0.8, width: 2.2, height: 1.6, fill: '#ececec' }),
      createRectangle({ name: 'Stage 2', x: -1.1, y: -0.8, width: 2.2, height: 1.6, fill: '#dbe6ff' }),
      createRectangle({ name: 'Stage 3', x: 2.6, y: -0.8, width: 2.2, height: 1.6, fill: '#f4f4f4' }),
      createLine({ name: 'Stage 1 to 2', from: { x: -2.6, y: 0 }, to: { x: -1.1, y: 0 }, arrowEnd: true }),
      createLine({ name: 'Stage 2 to 3', from: { x: 1.1, y: 0 }, to: { x: 2.6, y: 0 }, arrowEnd: true }),
      createText({ name: 'Stage 1 label', text: 'Input', x: -3.7, y: 0 }),
      createText({ name: 'Stage 2 label', text: 'Transform', x: 0, y: 0 }),
      createText({ name: 'Stage 3 label', text: 'Output', x: 3.7, y: 0 })
    ],
    { searchTerms: ['pipeline', 'stages', 'process', 'flow'] }
  ),
  createPreset(
    'hub',
    'concepts',
    'hub',
    'Hub & Spoke',
    'Central concept linked to surrounding nodes.',
    [
      createCircle({ name: 'Hub center', cx: 0, cy: 0, r: 0.9, fill: '#dbe6ff' }),
      createCircle({ name: 'Hub north', cx: 0, cy: 2.5, r: 0.55, fill: '#f5f5f5' }),
      createCircle({ name: 'Hub east', cx: 2.5, cy: 0, r: 0.55, fill: '#f5f5f5' }),
      createCircle({ name: 'Hub south', cx: 0, cy: -2.5, r: 0.55, fill: '#f5f5f5' }),
      createCircle({ name: 'Hub west', cx: -2.5, cy: 0, r: 0.55, fill: '#f5f5f5' }),
      createLine({ name: 'Hub to north', from: { x: 0, y: 0.9 }, to: { x: 0, y: 1.95 } }),
      createLine({ name: 'Hub to east', from: { x: 0.9, y: 0 }, to: { x: 1.95, y: 0 } }),
      createLine({ name: 'Hub to south', from: { x: 0, y: -0.9 }, to: { x: 0, y: -1.95 } }),
      createLine({ name: 'Hub to west', from: { x: -0.9, y: 0 }, to: { x: -1.95, y: 0 } })
    ],
    { searchTerms: ['hub', 'spoke', 'mindmap', 'concept'] }
  ),
  createPreset(
    'hexagon',
    'geometry',
    'hexagon',
    'Hexagon',
    'Six-sided block for systems and conceptual diagrams.',
    [
      createLine({ name: 'Hexagon top', from: { x: -1.4, y: 1.3 }, to: { x: 1.4, y: 1.3 } }),
      createLine({ name: 'Hexagon top-right', from: { x: 1.4, y: 1.3 }, to: { x: 2.3, y: 0 } }),
      createLine({ name: 'Hexagon bottom-right', from: { x: 2.3, y: 0 }, to: { x: 1.4, y: -1.3 } }),
      createLine({ name: 'Hexagon bottom', from: { x: 1.4, y: -1.3 }, to: { x: -1.4, y: -1.3 } }),
      createLine({ name: 'Hexagon bottom-left', from: { x: -1.4, y: -1.3 }, to: { x: -2.3, y: 0 } }),
      createLine({ name: 'Hexagon top-left', from: { x: -2.3, y: 0 }, to: { x: -1.4, y: 1.3 } }),
      createText({ name: 'Hexagon label', text: 'Module', y: 0 })
    ],
    { searchTerms: ['hexagon', 'module', 'system'] }
  ),
  createPreset('table', 'data', 'table', 'Table', 'Simple table block for data layouts and comparisons.', buildTablePresetShapes(), {
    searchTerms: ['table', 'grid', 'matrix', 'data']
  }),
  createPreset(
    'sticky-note',
    'interface',
    'document',
    'Note',
    'Sticky note style block for quick annotations.',
    [
      createRectangle({
        name: 'Note body',
        x: -1.8,
        y: -1.6,
        width: 3.4,
        height: 3.1,
        fill: '#fff7c7',
        cornerRadius: 0.12
      }),
      createLine({
        name: 'Note fold',
        from: { x: 0.98, y: 1.5 },
        to: { x: 1.6, y: 0.88 },
        stroke: '#6f6f6f',
        strokeWidth: 0.05
      }),
      createText({
        name: 'Note label',
        text: 'Note',
        x: -1.36,
        y: 0.08,
        textBox: true,
        boxWidth: 2.7,
        fontSize: 0.38,
        textAlign: 'left'
      })
    ],
    { searchTerms: ['note', 'sticky', 'annotation'] }
  ),
  createPreset(
    'swimlane',
    'flow',
    'swimlane',
    'Swimlane',
    'Horizontal flow lane with grouped stages.',
    [
      createRectangle({
        name: 'Swimlane frame',
        x: -3.8,
        y: -1.7,
        width: 7.6,
        height: 3.4,
        fill: '#fbfbfb',
        cornerRadius: 0.08
      }),
      createLine({
        name: 'Swimlane divider 1',
        from: { x: -1.25, y: 1.7 },
        to: { x: -1.25, y: -1.7 },
        stroke: '#7e7e7e',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Swimlane divider 2',
        from: { x: 1.25, y: 1.7 },
        to: { x: 1.25, y: -1.7 },
        stroke: '#7e7e7e',
        strokeWidth: 0.05
      }),
      createText({ name: 'Swimlane title', text: 'Flow', x: -2.52, y: 0, fontSize: 0.34 })
    ],
    { searchTerms: ['swimlane', 'lane', 'workflow', 'process'] }
  ),
  createPreset(
    'actor',
    'concepts',
    'node',
    'Actor',
    'Simple actor figure for user and use-case diagrams.',
    [
      createCircle({ name: 'Actor head', cx: 0, cy: 1.8, r: 0.45, fill: '#fbfbfb' }),
      createLine({ name: 'Actor body', from: { x: 0, y: 1.35 }, to: { x: 0, y: -0.1 } }),
      createLine({ name: 'Actor arms', from: { x: -1, y: 0.8 }, to: { x: 1, y: 0.8 } }),
      createLine({ name: 'Actor leg left', from: { x: 0, y: -0.1 }, to: { x: -0.9, y: -1.6 } }),
      createLine({ name: 'Actor leg right', from: { x: 0, y: -0.1 }, to: { x: 0.9, y: -1.6 } }),
      createText({ name: 'Actor label', text: 'User', y: -2.2, fontSize: 0.34 })
    ],
    { searchTerms: ['actor', 'user', 'person', 'use case'] }
  ),
  createPreset(
    'folder',
    'interface',
    'document',
    'Folder',
    'Folder-style block for files, groups and collections.',
    [
      createRectangle({
        name: 'Folder body',
        x: -2.45,
        y: -1.5,
        width: 4.9,
        height: 3,
        fill: '#fbfbfb',
        cornerRadius: 0.14
      }),
      createRectangle({
        name: 'Folder tab',
        x: -2.25,
        y: 0.9,
        width: 1.4,
        height: 0.52,
        fill: '#f5f5f5',
        cornerRadius: 0.08
      }),
      createText({
        name: 'Folder label',
        text: 'Folder',
        x: -1.78,
        y: -0.95,
        textBox: true,
        boxWidth: 3.45,
        fontSize: 0.34,
        textAlign: 'left'
      })
    ],
    { searchTerms: ['folder', 'files', 'directory', 'collection'] }
  ),
  createPreset(
    'message',
    'interface',
    'callout',
    'Message',
    'Speech bubble for comments and chat flows.',
    [
      createRectangle({
        name: 'Message bubble',
        x: -2.2,
        y: -1.15,
        width: 4.4,
        height: 2.3,
        fill: '#f7f9ff',
        cornerRadius: 0.24
      }),
      createLine({
        name: 'Message tail a',
        from: { x: -1.15, y: -1.15 },
        to: { x: -1.95, y: -1.95 },
        strokeWidth: 0.06
      }),
      createLine({
        name: 'Message tail b',
        from: { x: -0.45, y: -1.15 },
        to: { x: -1.95, y: -1.95 },
        strokeWidth: 0.06
      }),
      createText({
        name: 'Message text',
        text: 'Message',
        x: -1.45,
        y: 0,
        textBox: true,
        boxWidth: 2.9,
        fontSize: 0.34,
        textAlign: 'left'
      })
    ],
    { searchTerms: ['message', 'chat', 'comment', 'bubble'] }
  ),
  createPreset(
    'kanban',
    'interface',
    'card',
    'Kanban',
    'Three-column board for workflows and task planning.',
    [
      createRectangle({
        name: 'Kanban frame',
        x: -3.45,
        y: -1.6,
        width: 6.9,
        height: 3.2,
        fill: '#fbfbfb',
        cornerRadius: 0.08
      }),
      createLine({
        name: 'Kanban divider 1',
        from: { x: -1.15, y: 1.6 },
        to: { x: -1.15, y: -1.6 },
        stroke: '#90959a',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Kanban divider 2',
        from: { x: 1.15, y: 1.6 },
        to: { x: 1.15, y: -1.6 },
        stroke: '#90959a',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Kanban header',
        from: { x: -3.45, y: 0.78 },
        to: { x: 3.45, y: 0.78 },
        stroke: '#d2d2d2',
        strokeWidth: 0.04
      }),
      createText({ name: 'Kanban todo', text: 'To do', x: -2.3, y: 1.18, fontSize: 0.24 }),
      createText({ name: 'Kanban doing', text: 'Doing', x: 0, y: 1.18, fontSize: 0.24 }),
      createText({ name: 'Kanban done', text: 'Done', x: 2.3, y: 1.18, fontSize: 0.24 })
    ],
    { searchTerms: ['kanban', 'board', 'tasks', 'workflow'] }
  ),
  createPreset(
    'funnel',
    'data',
    'funnel',
    'Funnel',
    'Simple funnel shape for conversion or filtering flows.',
    [
      createLine({ name: 'Funnel top', from: { x: -2.6, y: 1.5 }, to: { x: 2.6, y: 1.5 } }),
      createLine({ name: 'Funnel left', from: { x: -2.6, y: 1.5 }, to: { x: -0.8, y: -0.2 } }),
      createLine({ name: 'Funnel right', from: { x: 2.6, y: 1.5 }, to: { x: 0.8, y: -0.2 } }),
      createLine({ name: 'Funnel stem left', from: { x: -0.8, y: -0.2 }, to: { x: -0.45, y: -1.8 } }),
      createLine({ name: 'Funnel stem right', from: { x: 0.8, y: -0.2 }, to: { x: 0.45, y: -1.8 } }),
      createLine({ name: 'Funnel bottom', from: { x: -0.45, y: -1.8 }, to: { x: 0.45, y: -1.8 } })
    ],
    { searchTerms: ['funnel', 'conversion', 'filter', 'pipeline'] }
  ),
  createPreset(
    'network',
    'concepts',
    'hub',
    'Network',
    'Mini network map with interconnected nodes.',
    [
      createCircle({ name: 'Network center', cx: 0, cy: 0, r: 0.42, fill: '#dbe6ff', stroke: '#2f66f3' }),
      createCircle({ name: 'Network north-west', cx: -1.8, cy: 1.2, r: 0.3, fill: '#f5f5f5' }),
      createCircle({ name: 'Network north-east', cx: 1.8, cy: 1.2, r: 0.3, fill: '#f5f5f5' }),
      createCircle({ name: 'Network south-west', cx: -1.8, cy: -1.2, r: 0.3, fill: '#f5f5f5' }),
      createCircle({ name: 'Network south-east', cx: 1.8, cy: -1.2, r: 0.3, fill: '#f5f5f5' }),
      createLine({ name: 'Network link 1', from: { x: -1.38, y: 0.9 }, to: { x: -0.32, y: 0.18 } }),
      createLine({ name: 'Network link 2', from: { x: 1.38, y: 0.9 }, to: { x: 0.32, y: 0.18 } }),
      createLine({ name: 'Network link 3', from: { x: -1.38, y: -0.9 }, to: { x: -0.32, y: -0.18 } }),
      createLine({ name: 'Network link 4', from: { x: 1.38, y: -0.9 }, to: { x: 0.32, y: -0.18 } })
    ],
    { searchTerms: ['network', 'graph', 'topology', 'nodes'] }
  )
];

const createScene = (name: string, shapes: readonly CanvasShape[]): TikzScene => ({
  name,
  bounds: {
    width: 960,
    height: 640
  },
  shapes
});

const objectPresetShapes = (id: string): readonly CanvasShape[] => {
  const preset = objectPresets.find((candidate) => candidate.id === id);
  if (!preset) {
    throw new Error(`Object preset "${id}" not found.`);
  }

  return preset.shapes;
};

const clientServerDatabaseShape = (shape: CanvasShape): CanvasShape => {
  switch (shape.kind) {
    case 'rectangle':
      return { ...shape, id: crypto.randomUUID(), x: 4.4, y: -1.3 };
    case 'ellipse':
      return { ...shape, id: crypto.randomUUID(), cx: shape.cx + 6.5, cy: shape.cy };
    case 'text':
      return { ...shape, id: crypto.randomUUID(), x: 6.5, y: 0, text: 'Database' };
    default:
      return shape;
  }
};

const metricsBarChartShape = (shape: CanvasShape): CanvasShape => {
  switch (shape.kind) {
    case 'line':
      return {
        ...shape,
        id: crypto.randomUUID(),
        from: { x: shape.from.x - 4.5, y: shape.from.y - 0.6 },
        to: { x: shape.to.x - 4.5, y: shape.to.y - 0.6 }
      };
    case 'rectangle':
      return { ...shape, id: crypto.randomUUID(), x: shape.x - 4.5, y: shape.y - 0.6 };
    default:
      return shape;
  }
};

const metricsTimelineShape = (shape: CanvasShape): CanvasShape => {
  switch (shape.kind) {
    case 'line':
      return {
        ...shape,
        id: crypto.randomUUID(),
        from: { x: shape.from.x + 2.6, y: shape.from.y + 2.4 },
        to: { x: shape.to.x + 2.6, y: shape.to.y + 2.4 }
      };
    case 'circle':
      return { ...shape, id: crypto.randomUUID(), cx: shape.cx + 2.6, cy: shape.cy + 2.4 };
    case 'text':
      return { ...shape, id: crypto.randomUUID(), x: shape.x + 2.6, y: shape.y + 2.4 };
    default:
      return shape;
  }
};

const metricsCalloutShape = (shape: CanvasShape): CanvasShape => {
  switch (shape.kind) {
    case 'rectangle':
      return { ...shape, id: crypto.randomUUID(), x: 1.8, y: -3.1 };
    case 'line':
      return {
        ...shape,
        id: crypto.randomUUID(),
        from: { x: shape.from.x + 4.2, y: shape.from.y - 2.8 },
        to: { x: shape.to.x + 4.2, y: shape.to.y - 2.8 }
      };
    case 'circle':
      return { ...shape, id: crypto.randomUUID(), cx: shape.cx + 4.2, cy: shape.cy - 2.8 };
    case 'text':
      return { ...shape, id: crypto.randomUUID(), x: 2.3, y: -1.45, text: 'Growth note', boxWidth: 3.3 };
    default:
      return shape;
  }
};

export const scenePresets: readonly ScenePreset[] = [
  {
    id: 'blank',
    icon: 'blank',
    title: 'Blank board',
    description: 'Empty canvas for free-form composition.',
    scene: createScene('Blank board', [])
  },
  {
    id: 'flow-starter',
    icon: 'flow',
    title: 'Flow starter',
    description: 'Input, process, decision and outputs ready to edit.',
    scene: createScene('Flow starter', [
      ...objectPresets.find((preset) => preset.id === 'input-output')!.shapes,
      ...objectPresets
        .find((preset) => preset.id === 'box')!
        .shapes.map((shape) =>
          shape.kind === 'rectangle'
            ? {
                ...shape,
                id: crypto.randomUUID(),
                x: 2.3,
                y: -1.2,
                width: 3.2,
                height: 2.4,
                name: 'Process block',
                fill: '#ebebeb'
              }
            : shape
        ),
      createText({ name: 'Process label', x: 3.9, y: 0, text: 'Process' }),
      ...objectPresets
        .find((preset) => preset.id === 'decision')!
        .shapes.map((shape) =>
          shape.kind === 'text'
            ? { ...shape, id: crypto.randomUUID(), x: 8.1, y: 0, text: 'Check' }
            : shape.kind === 'line'
              ? {
                  ...shape,
                  id: crypto.randomUUID(),
                  from: { x: shape.from.x + 8.1, y: shape.from.y },
                  to: { x: shape.to.x + 8.1, y: shape.to.y }
                }
              : shape
        ),
      createLine({ name: 'Input to process', from: { x: 2.2, y: 0 }, to: { x: 2.3, y: 0 }, arrowEnd: true }),
      createLine({ name: 'Process to decision', from: { x: 5.5, y: 0 }, to: { x: 6.2, y: 0 }, arrowEnd: true })
    ])
  },
  {
    id: 'system-map',
    icon: 'server',
    title: 'System map',
    description: 'Client, API and database starter scene.',
    scene: createScene('System map', [
      ...objectPresets
        .find((preset) => preset.id === 'browser')!
        .shapes.map((shape) =>
          shape.kind === 'rectangle'
            ? { ...shape, id: crypto.randomUUID(), x: -7.4, y: -1.7, name: shape.name }
            : shape.kind === 'line'
              ? {
                  ...shape,
                  id: crypto.randomUUID(),
                  from: { x: shape.from.x - 4.8, y: shape.from.y },
                  to: { x: shape.to.x - 4.8, y: shape.to.y }
                }
              : shape.kind === 'circle'
                ? { ...shape, id: crypto.randomUUID(), cx: shape.cx - 4.8, cy: shape.cy }
                : shape
        ),
      createText({ name: 'Client label', x: -4.8, y: -2.5, text: 'Client' }),
      createRectangle({ name: 'API', x: -1.5, y: -1, width: 3, height: 2, fill: '#ececec' }),
      createText({ name: 'API label', text: 'API', x: 0, y: 0 }),
      ...objectPresetShapes('database').map(clientServerDatabaseShape),
      createLine({ name: 'Client to API', from: { x: -2.2, y: 0 }, to: { x: -1.5, y: 0 }, arrowEnd: true }),
      createLine({ name: 'API to database', from: { x: 1.5, y: 0 }, to: { x: 4.4, y: 0 }, arrowEnd: true })
    ])
  },
  {
    id: 'metrics-board',
    icon: 'bars',
    title: 'Metrics board',
    description: 'Dashboard-like scene mixing charts and callouts.',
    scene: createScene('Metrics board', [
      ...objectPresetShapes('bar-chart').map(metricsBarChartShape),
      ...objectPresetShapes('timeline').map(metricsTimelineShape),
      ...objectPresetShapes('callout').map(metricsCalloutShape)
    ])
  }
];

export const defaultScene = scenePresets[0].scene;
