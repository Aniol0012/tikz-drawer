import type {
  CanvasShape,
  CircleShape,
  EditorPreferences,
  EllipseShape,
  LineShape,
  ObjectPreset,
  PresetCategory,
  RectangleShape,
  ScenePreset,
  TextShape,
  TikzScene
} from './tikz.models';

const createLine = (overrides: Partial<LineShape> = {}): LineShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Line',
  kind: 'line',
  stroke: overrides.stroke ?? '#1f1f1f',
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
  stroke: overrides.stroke ?? '#1f1f1f',
  strokeWidth: overrides.strokeWidth ?? 0.08,
  x: overrides.x ?? -2,
  y: overrides.y ?? 1.5,
  width: overrides.width ?? 4,
  height: overrides.height ?? 2.4,
  fill: overrides.fill ?? '#f1f1f1',
  cornerRadius: overrides.cornerRadius ?? 0.14
});

const createCircle = (overrides: Partial<CircleShape> = {}): CircleShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Circle',
  kind: 'circle',
  stroke: overrides.stroke ?? '#1f1f1f',
  strokeWidth: overrides.strokeWidth ?? 0.08,
  cx: overrides.cx ?? 0,
  cy: overrides.cy ?? 0,
  r: overrides.r ?? 1.4,
  fill: overrides.fill ?? '#f5f5f5'
});

const createEllipse = (overrides: Partial<EllipseShape> = {}): EllipseShape => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Ellipse',
  kind: 'ellipse',
  stroke: overrides.stroke ?? '#1f1f1f',
  strokeWidth: overrides.strokeWidth ?? 0.08,
  cx: overrides.cx ?? 0,
  cy: overrides.cy ?? 0,
  rx: overrides.rx ?? 2,
  ry: overrides.ry ?? 1.1,
  fill: overrides.fill ?? '#f5f5f5'
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
  color: overrides.color ?? '#161616'
});

const createPreset = (
  id: string,
  category: PresetCategory,
  icon: string,
  title: string,
  description: string,
  shapes: readonly CanvasShape[],
  options: { readonly quickAccess?: boolean; readonly searchTerms?: readonly string[] } = {}
): ObjectPreset => ({
  id,
  category,
  icon,
  title,
  description,
  shapes,
  quickAccess: options.quickAccess,
  searchTerms: options.searchTerms
});

export const defaultPreferences: EditorPreferences = {
  theme: 'light',
  snapToGrid: true,
  showGrid: true,
  showAxes: true,
  scale: 24,
  snapStep: 0.25,
  defaultStroke: '#1f1f1f',
  defaultFill: '#f1f1f1',
  defaultStrokeWidth: 0.08
};

export const objectPresets: readonly ObjectPreset[] = [
  createPreset(
    'segment',
    'essentials',
    'segment',
    'Line',
    'Straight segment for geometry and diagrams.',
    [createLine({ name: 'Line' })],
    { quickAccess: true, searchTerms: ['line', 'segment', 'edge'] }
  ),
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
  createPreset(
    'circle',
    'essentials',
    'circle',
    'Circle',
    'Circle for highlights and nodes.',
    [createCircle({ name: 'Circle' })],
    { quickAccess: true, searchTerms: ['circle', 'node', 'round'] }
  ),
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
    'node',
    'essentials',
    'node',
    'Node',
    'Compact connection point.',
    [createCircle({ name: 'Node', r: 0.24, fill: '#1f1f1f', stroke: '#1f1f1f' })],
    { quickAccess: true, searchTerms: ['node', 'point', 'dot'] }
  ),
  createPreset(
    'label',
    'essentials',
    'text',
    'Text',
    'Simple text label positioned on the canvas.',
    [createText({ name: 'Text', text: 'Text' })],
    { quickAccess: true, searchTerms: ['label', 'text', 'annotation'] }
  ),
  createPreset(
    'card',
    'interface',
    'card',
    'Card',
    'Wide rounded card for interface sketches.',
    [createRectangle({ name: 'Card', width: 4.8, height: 2.8, cornerRadius: 0.28, fill: '#f7f7f7' })],
    { searchTerms: ['card', 'panel', 'ui'] }
  ),
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
    [
      createEllipse({ name: 'Terminator', rx: 2.3, ry: 1.1, fill: '#f0f0f0' }),
      createText({ name: 'Terminator label', text: 'Start' })
    ],
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
      createRectangle({ name: 'Document frame', width: 4.2, height: 2.8, fill: '#fafafa' }),
      createLine({
        name: 'Document line 1',
        from: { x: -1.5, y: 0.8 },
        to: { x: 1.4, y: 0.8 },
        stroke: '#8a918b',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Document line 2',
        from: { x: -1.5, y: 0.25 },
        to: { x: 1.4, y: 0.25 },
        stroke: '#8a918b',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Document line 3',
        from: { x: -1.5, y: -0.3 },
        to: { x: 1, y: -0.3 },
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
    [
      createLine({ name: 'Triangle A-B', from: { x: -2.4, y: -1.6 }, to: { x: 0, y: 2.2 } }),
      createLine({ name: 'Triangle B-C', from: { x: 0, y: 2.2 }, to: { x: 2.6, y: -1.2 } }),
      createLine({ name: 'Triangle C-A', from: { x: 2.6, y: -1.2 }, to: { x: -2.4, y: -1.6 } })
    ],
    { searchTerms: ['triangle', 'geometry', 'polygon'] }
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
  createPreset(
    'browser',
    'interface',
    'browser',
    'Browser Window',
    'Quick browser frame for UI sketches.',
    [
      createRectangle({ name: 'Browser frame', width: 5.2, height: 3.4, cornerRadius: 0.24, fill: '#fbfbfb' }),
      createLine({
        name: 'Browser divider',
        from: { x: -2.6, y: 1.1 },
        to: { x: 2.6, y: 1.1 },
        stroke: '#9ea39e',
        strokeWidth: 0.05
      }),
      createCircle({ name: 'Browser dot 1', cx: -2.1, cy: 1.55, r: 0.12, fill: '#d9a16f', stroke: '#d9a16f' }),
      createCircle({ name: 'Browser dot 2', cx: -1.7, cy: 1.55, r: 0.12, fill: '#d7c28d', stroke: '#d7c28d' }),
      createCircle({ name: 'Browser dot 3', cx: -1.3, cy: 1.55, r: 0.12, fill: '#2f66f3', stroke: '#2f66f3' })
    ],
    { searchTerms: ['browser', 'window', 'web', 'ui'] }
  ),
  createPreset(
    'phone',
    'interface',
    'phone',
    'Phone Screen',
    'Mobile device frame.',
    [
      createRectangle({ name: 'Phone body', width: 2.6, height: 5, cornerRadius: 0.4, fill: '#fbfbfb' }),
      createRectangle({
        name: 'Phone screen',
        x: -1.05,
        y: -1.85,
        width: 2.1,
        height: 3.95,
        cornerRadius: 0.18,
        fill: '#f3f3f3'
      }),
      createCircle({ name: 'Phone camera', cx: 0, cy: 2.1, r: 0.08, fill: '#8b8f89', stroke: '#8b8f89' })
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
    'Annotation card with a leader line.',
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
      createText({ name: 'Callout text', x: 1.8, y: 1.35, text: 'Annotation', fontSize: 0.36 })
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
      createCircle({ name: 'Cloud left', cx: -1.3, cy: -0.15, r: 1.15, fill: '#f4f4f4' }),
      createCircle({ name: 'Cloud center', cx: 0, cy: 0.45, r: 1.4, fill: '#f4f4f4' }),
      createCircle({ name: 'Cloud right', cx: 1.4, cy: -0.1, r: 1.1, fill: '#f4f4f4' }),
      createEllipse({ name: 'Cloud base', cx: 0, cy: -0.65, rx: 2.4, ry: 0.95, fill: '#f4f4f4' }),
      createText({ name: 'Cloud label', text: 'Cloud', y: -0.1 })
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
    'node',
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
  createPreset(
    'table',
    'data',
    'card',
    'Table',
    'Simple table block for data layouts and comparisons.',
    [
      createRectangle({ name: 'Table frame', width: 5.2, height: 3.2, fill: '#fafafa', cornerRadius: 0.08 }),
      createLine({
        name: 'Table row 1',
        from: { x: -2.6, y: 0.6 },
        to: { x: 2.6, y: 0.6 },
        stroke: '#767676',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Table row 2',
        from: { x: -2.6, y: -0.2 },
        to: { x: 2.6, y: -0.2 },
        stroke: '#767676',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Table row 3',
        from: { x: -2.6, y: -1 },
        to: { x: 2.6, y: -1 },
        stroke: '#767676',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Table col 1',
        from: { x: -0.9, y: 1.6 },
        to: { x: -0.9, y: -1.6 },
        stroke: '#767676',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Table col 2',
        from: { x: 0.9, y: 1.6 },
        to: { x: 0.9, y: -1.6 },
        stroke: '#767676',
        strokeWidth: 0.05
      })
    ],
    { searchTerms: ['table', 'grid', 'matrix', 'data'] }
  ),
  createPreset(
    'note',
    'interface',
    'document',
    'Note',
    'Sticky note style block for quick annotations.',
    [
      createRectangle({ name: 'Note body', width: 3.4, height: 3.1, fill: '#fafafa', cornerRadius: 0.12 }),
      createLine({
        name: 'Note fold a',
        from: { x: 1, y: 1.55 },
        to: { x: 1.7, y: 0.9 },
        stroke: '#8b8b8b',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Note fold b',
        from: { x: 1.7, y: 0.9 },
        to: { x: 1.7, y: 1.55 },
        stroke: '#8b8b8b',
        strokeWidth: 0.05
      }),
      createLine({
        name: 'Note fold c',
        from: { x: 1, y: 1.55 },
        to: { x: 1.7, y: 1.55 },
        stroke: '#8b8b8b',
        strokeWidth: 0.05
      }),
      createText({ name: 'Note label', text: 'Note', y: 0 })
    ],
    { searchTerms: ['note', 'sticky', 'annotation'] }
  ),
  createPreset(
    'swimlane',
    'flow',
    'pipeline',
    'Swimlane',
    'Horizontal flow lane with grouped stages.',
    [
      createRectangle({ name: 'Swimlane frame', width: 7.6, height: 3.4, fill: '#fbfbfb', cornerRadius: 0.08 }),
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
      createLine({
        name: 'Swimlane divider 3',
        from: { x: 3.75, y: 1.7 },
        to: { x: 3.75, y: -1.7 },
        stroke: '#7e7e7e',
        strokeWidth: 0.05
      }),
      createText({ name: 'Swimlane title', text: 'Flow', x: -3.1, y: 0, fontSize: 0.36 })
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
      createRectangle({ name: 'Folder body', width: 4.8, height: 2.7, fill: '#faf7e8', cornerRadius: 0.12 }),
      createRectangle({ name: 'Folder tab', x: -1.8, y: 1.55, width: 1.6, height: 0.55, fill: '#f3e5a3', cornerRadius: 0.08 }),
      createText({ name: 'Folder label', text: 'Folder', y: 0.05 })
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
      createRectangle({ name: 'Message bubble', width: 4.4, height: 2.2, fill: '#f7f9ff', cornerRadius: 0.24 }),
      createLine({ name: 'Message tail a', from: { x: -1.1, y: -1.1 }, to: { x: -1.8, y: -1.8 }, strokeWidth: 0.06 }),
      createLine({ name: 'Message tail b', from: { x: -0.4, y: -1.1 }, to: { x: -1.8, y: -1.8 }, strokeWidth: 0.06 }),
      createText({ name: 'Message text', text: 'Message', y: 0.05 })
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
      createRectangle({ name: 'Kanban frame', width: 7.2, height: 3.8, fill: '#fbfbfb', cornerRadius: 0.14 }),
      createLine({ name: 'Kanban divider 1', from: { x: -1.2, y: 1.9 }, to: { x: -1.2, y: -1.9 }, stroke: '#90959a', strokeWidth: 0.05 }),
      createLine({ name: 'Kanban divider 2', from: { x: 1.2, y: 1.9 }, to: { x: 1.2, y: -1.9 }, stroke: '#90959a', strokeWidth: 0.05 }),
      createText({ name: 'Kanban todo', text: 'To do', x: -2.4, y: 1.2, fontSize: 0.3 }),
      createText({ name: 'Kanban doing', text: 'Doing', x: 0, y: 1.2, fontSize: 0.3 }),
      createText({ name: 'Kanban done', text: 'Done', x: 2.4, y: 1.2, fontSize: 0.3 })
    ],
    { searchTerms: ['kanban', 'board', 'tasks', 'workflow'] }
  ),
  createPreset(
    'funnel',
    'data',
    'triangle',
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
      ...objectPresets
        .find((preset) => preset.id === 'database')!
        .shapes.map((shape) =>
          shape.kind === 'rectangle'
            ? { ...shape, id: crypto.randomUUID(), x: 4.4, y: -1.3 }
            : shape.kind === 'ellipse'
              ? { ...shape, id: crypto.randomUUID(), cx: shape.cx + 6.5, cy: shape.cy }
              : shape.kind === 'text'
                ? { ...shape, id: crypto.randomUUID(), x: 6.5, y: 0, text: 'Database' }
                : shape
        ),
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
      ...objectPresets
        .find((preset) => preset.id === 'bar-chart')!
        .shapes.map((shape) =>
          shape.kind === 'line'
            ? {
                ...shape,
                id: crypto.randomUUID(),
                from: { x: shape.from.x - 4.5, y: shape.from.y - 0.6 },
                to: { x: shape.to.x - 4.5, y: shape.to.y - 0.6 }
              }
            : shape.kind === 'rectangle'
              ? { ...shape, id: crypto.randomUUID(), x: shape.x - 4.5, y: shape.y - 0.6 }
              : shape
        ),
      ...objectPresets
        .find((preset) => preset.id === 'timeline')!
        .shapes.map((shape) =>
          shape.kind === 'line'
            ? {
                ...shape,
                id: crypto.randomUUID(),
                from: { x: shape.from.x + 2.6, y: shape.from.y + 2.4 },
                to: { x: shape.to.x + 2.6, y: shape.to.y + 2.4 }
              }
            : shape.kind === 'circle'
              ? { ...shape, id: crypto.randomUUID(), cx: shape.cx + 2.6, cy: shape.cy + 2.4 }
              : shape.kind === 'text'
                ? { ...shape, id: crypto.randomUUID(), x: shape.x + 2.6, y: shape.y + 2.4 }
                : shape
        ),
      ...objectPresets
        .find((preset) => preset.id === 'callout')!
        .shapes.map((shape) =>
          shape.kind === 'rectangle'
            ? { ...shape, id: crypto.randomUUID(), x: 1.8, y: -3.1 }
            : shape.kind === 'line'
              ? {
                  ...shape,
                  id: crypto.randomUUID(),
                  from: { x: shape.from.x + 4.2, y: shape.from.y - 2.8 },
                  to: { x: shape.to.x + 4.2, y: shape.to.y - 2.8 }
                }
              : shape.kind === 'circle'
                ? { ...shape, id: crypto.randomUUID(), cx: shape.cx + 4.2, cy: shape.cy - 2.8 }
                : shape.kind === 'text'
                  ? { ...shape, id: crypto.randomUUID(), x: shape.x + 4.2, y: shape.y - 2.8, text: 'Growth note' }
                  : shape
        )
    ])
  }
];

export const defaultScene = scenePresets[0].scene;
