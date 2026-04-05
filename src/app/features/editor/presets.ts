import type {
  CanvasShape,
  CircleShape,
  EditorPreferences,
  EllipseShape,
  LineShape,
  ObjectPreset,
  RectangleShape,
  ScenePreset,
  TextShape,
  TikzScene
} from './tikz.models';

const createLine = (overrides: Partial<LineShape> = {}): LineShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Line',
  kind: 'line',
  stroke: overrides.stroke ?? '#2563eb',
  strokeWidth: overrides.strokeWidth ?? 0.08,
  from: overrides.from ?? { x: -2, y: 0 },
  to: overrides.to ?? { x: 2, y: 0 },
  arrowStart: overrides.arrowStart ?? false,
  arrowEnd: overrides.arrowEnd ?? false
});

const createRectangle = (overrides: Partial<RectangleShape> = {}): RectangleShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Rectangle',
  kind: 'rectangle',
  stroke: overrides.stroke ?? '#0f172a',
  strokeWidth: overrides.strokeWidth ?? 0.08,
  x: overrides.x ?? -2,
  y: overrides.y ?? 1.5,
  width: overrides.width ?? 4,
  height: overrides.height ?? 2.4,
  fill: overrides.fill ?? '#dbeafe',
  cornerRadius: overrides.cornerRadius ?? 0.12
});

const createCircle = (overrides: Partial<CircleShape> = {}): CircleShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Circle',
  kind: 'circle',
  stroke: overrides.stroke ?? '#0f172a',
  strokeWidth: overrides.strokeWidth ?? 0.08,
  cx: overrides.cx ?? 0,
  cy: overrides.cy ?? 0,
  r: overrides.r ?? 1.4,
  fill: overrides.fill ?? '#dcfce7'
});

const createEllipse = (overrides: Partial<EllipseShape> = {}): EllipseShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Ellipse',
  kind: 'ellipse',
  stroke: overrides.stroke ?? '#7c3aed',
  strokeWidth: overrides.strokeWidth ?? 0.08,
  cx: overrides.cx ?? 0,
  cy: overrides.cy ?? 0,
  rx: overrides.rx ?? 2,
  ry: overrides.ry ?? 1.1,
  fill: overrides.fill ?? '#ede9fe'
});

const createText = (overrides: Partial<TextShape> = {}): TextShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Label',
  kind: 'text',
  stroke: overrides.stroke ?? 'none',
  strokeWidth: overrides.strokeWidth ?? 0,
  x: overrides.x ?? 0,
  y: overrides.y ?? 0,
  text: overrides.text ?? 'label',
  fontSize: overrides.fontSize ?? 0.42,
  color: overrides.color ?? '#0f172a'
});

export const defaultPreferences: EditorPreferences = {
  theme: 'dark',
  snapToGrid: true,
  showGrid: true,
  showAxes: true,
  scale: 42
};

export const objectPresets: readonly ObjectPreset[] = [
  {
    id: 'segment',
    title: 'Segment',
    description: 'A simple segment to sketch geometry fast.',
    shape: createLine({
      name: 'Segment',
      stroke: '#2563eb'
    })
  },
  {
    id: 'arrow',
    title: 'Arrow',
    description: 'Useful for vectors, flows, and diagram direction.',
    shape: createLine({
      name: 'Arrow',
      stroke: '#dc2626',
      arrowEnd: true
    })
  },
  {
    id: 'box',
    title: 'Box',
    description: 'A rounded rectangle for blocks or annotations.',
    shape: createRectangle({
      name: 'Box',
      fill: '#fef3c7'
    })
  },
  {
    id: 'circle',
    title: 'Circle',
    description: 'A circle for nodes, disks, or highlights.',
    shape: createCircle()
  },
  {
    id: 'ellipse',
    title: 'Ellipse',
    description: 'A softer shape for state diagrams and callouts.',
    shape: createEllipse()
  },
  {
    id: 'label',
    title: 'Label',
    description: 'Plain text positioned directly on the canvas.',
    shape: createText()
  }
];

const createScene = (name: string, shapes: readonly CanvasShape[]): TikzScene => ({
  name,
  bounds: {
    width: 960,
    height: 640
  },
  shapes
});

export const scenePresets: readonly ScenePreset[] = [
  {
    id: 'blank',
    title: 'Blank board',
    description: 'Start with an empty scene and build the figure piece by piece.',
    scene: createScene('Blank board', [])
  },
  {
    id: 'triangle-diagram',
    title: 'Triangle diagram',
    description: 'A quick geometry starter with labels on each vertex.',
    scene: createScene('Triangle diagram', [
      createLine({ name: 'AB', from: { x: -3, y: -2 }, to: { x: 0, y: 3 } }),
      createLine({ name: 'BC', from: { x: 0, y: 3 }, to: { x: 3.2, y: -1.8 } }),
      createLine({ name: 'CA', from: { x: 3.2, y: -1.8 }, to: { x: -3, y: -2 } }),
      createText({ name: 'A', x: -3.3, y: -2.3, text: 'A' }),
      createText({ name: 'B', x: 0, y: 3.45, text: 'B' }),
      createText({ name: 'C', x: 3.45, y: -2.15, text: 'C' })
    ])
  },
  {
    id: 'flow-starter',
    title: 'Flow starter',
    description: 'A tiny flowchart skeleton with two blocks and a decision.',
    scene: createScene('Flow starter', [
      createRectangle({ name: 'Input', x: -5.6, y: 2.1, width: 3.2, height: 1.7, fill: '#dbeafe' }),
      createText({ name: 'Input label', x: -4, y: 2.95, text: 'Input' }),
      createRectangle({ name: 'Process', x: -1.2, y: 2.1, width: 3.4, height: 1.7, fill: '#e2e8f0' }),
      createText({ name: 'Process label', x: 0.5, y: 2.95, text: 'Process' }),
      createEllipse({ name: 'Decision', cx: 5, cy: 2.95, rx: 1.9, ry: 1.1, fill: '#fee2e2' }),
      createText({ name: 'Decision label', x: 5, y: 2.95, text: 'Check' }),
      createLine({ name: 'Input to process', from: { x: -2.4, y: 2.95 }, to: { x: -1.2, y: 2.95 }, arrowEnd: true }),
      createLine({ name: 'Process to decision', from: { x: 2.2, y: 2.95 }, to: { x: 3.1, y: 2.95 }, arrowEnd: true })
    ])
  },
  {
    id: 'plot-callout',
    title: 'Plot callout',
    description: 'A simple chart-like composition with a callout label.',
    scene: createScene('Plot callout', [
      createLine({ name: 'XAxis', from: { x: -6, y: -3 }, to: { x: 6, y: -3 }, arrowEnd: true, stroke: '#0f172a' }),
      createLine({
        name: 'YAxis',
        from: { x: -5.5, y: -3.8 },
        to: { x: -5.5, y: 3.6 },
        arrowEnd: true,
        stroke: '#0f172a'
      }),
      createLine({ name: 'Trend 1', from: { x: -4.5, y: -1.8 }, to: { x: -2.1, y: -0.3 }, stroke: '#2563eb' }),
      createLine({ name: 'Trend 2', from: { x: -2.1, y: -0.3 }, to: { x: 0.5, y: 1.1 }, stroke: '#2563eb' }),
      createLine({ name: 'Trend 3', from: { x: 0.5, y: 1.1 }, to: { x: 4.2, y: 2.2 }, stroke: '#2563eb' }),
      createCircle({ name: 'Highlight', cx: 0.5, cy: 1.1, r: 0.22, fill: '#2563eb', stroke: '#2563eb' }),
      createRectangle({ name: 'Callout', x: 1.6, y: 1.7, width: 3.1, height: 1.4, fill: '#f8fafc' }),
      createText({ name: 'Callout text', x: 3.15, y: 2.45, text: 'Peak point' }),
      createLine({ name: 'Callout leader', from: { x: 1.6, y: 1.95 }, to: { x: 0.7, y: 1.2 }, stroke: '#475569' })
    ])
  }
];

export const defaultScene = scenePresets[1].scene;
