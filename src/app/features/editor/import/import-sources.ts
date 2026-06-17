import type { CanvasShape, LineShape, PersistedEditorState, TikzScene } from '../models/tikz.models';
import { DEFAULT_TEXT_BOX_WIDTH, DEFAULT_TEXT_FONT_SIZE } from '../constants/editor.constants';
import { parseTikz } from '../tikz/tikz.parser';
import { keyValueRegex, REGEX } from '../../../shared/regex/regex.utils';

export type ImportSourceKind = 'tikz' | 'tex' | 'project-json' | 'drawio' | 'svg' | 'mermaid' | 'dot' | 'csv' | 'image';

export interface ImportDialogResult {
  readonly scene: TikzScene;
  readonly importCode: string;
  readonly warnings: readonly string[];
  readonly clearScene?: boolean;
}

export interface ExtractedTikzDiagram {
  readonly title: string;
  readonly code: string;
}

interface ImportSourceDetectionContext {
  readonly source: string;
  readonly trimmedSource: string;
  readonly lines: readonly string[];
}

interface ImportSourceDetectionRule {
  readonly kind: ImportSourceKind;
  readonly matches: (context: ImportSourceDetectionContext) => boolean;
}

const extensionKindMap: Readonly<Record<string, ImportSourceKind>> = {
  csv: 'csv',
  drawio: 'drawio',
  jpeg: 'image',
  jpg: 'image',
  json: 'project-json',
  mermaid: 'mermaid',
  mmd: 'mermaid',
  png: 'image',
  svg: 'svg',
  tex: 'tex',
  tikz: 'tikz',
  tsv: 'csv',
  xml: 'drawio'
};

const hasPattern =
  (pattern: RegExp): ImportSourceDetectionRule['matches'] =>
  ({ trimmedSource }) =>
    pattern.test(trimmedSource);

const anyMatcher =
  (matchers: readonly ImportSourceDetectionRule['matches'][]): ImportSourceDetectionRule['matches'] =>
  (context) =>
    matchers.some((matcher) => matcher(context));

const hasAnyPattern = (patterns: readonly RegExp[]): ImportSourceDetectionRule['matches'] => anyMatcher(patterns.map((pattern) => hasPattern(pattern)));

const hasLinePattern =
  (pattern: RegExp): ImportSourceDetectionRule['matches'] =>
  ({ lines }) =>
    lines.some((line) => pattern.test(line));

const hasLinePatternPair =
  (firstPattern: RegExp, secondPattern: RegExp): ImportSourceDetectionRule['matches'] =>
  ({ lines }) =>
    lines.some((line) => firstPattern.test(line) && secondPattern.test(line));

const importSourceDetectionRules: readonly ImportSourceDetectionRule[] = [
  {
    kind: 'project-json',
    matches: ({ trimmedSource }) => isProjectJsonSource(trimmedSource)
  },
  {
    kind: 'svg',
    matches: hasPattern(REGEX.importSources.svgDocument)
  },
  {
    kind: 'drawio',
    matches: hasPattern(REGEX.importSources.drawioDocument)
  },
  {
    kind: 'tex',
    matches: hasAnyPattern([REGEX.importSources.latexDocumentClass, REGEX.importSources.latexDocumentBegin])
  },
  {
    kind: 'tikz',
    matches: hasAnyPattern([REGEX.tikzParser.tikzBeginCommand, REGEX.importModal.drawLikeCommand])
  },
  {
    kind: 'mermaid',
    matches: anyMatcher([hasPattern(REGEX.importSources.mermaidDirective), hasLinePattern(REGEX.importSources.mermaidEdgeLike)])
  },
  {
    kind: 'dot',
    matches: anyMatcher([
      hasPattern(REGEX.importSources.dotGraphDocument),
      hasLinePatternPair(REGEX.importSources.dotEdge, REGEX.importSources.dotStatementTerminator)
    ])
  },
  {
    kind: 'csv',
    matches: ({ source }) => hasTabularRows(source)
  }
];

const defaultSceneBounds = {
  width: 960,
  height: 640
};

const createId = (): string => crypto.randomUUID();

const defaultLine = (
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  name = 'Imported connector'
): LineShape => ({
  id: createId(),
  name,
  kind: 'line',
  stroke: '#0f172a',
  strokeOpacity: 1,
  strokeWidth: 0.08,
  from,
  to,
  anchors: [],
  lineMode: 'straight',
  strokeStyle: 'solid',
  arrowStart: false,
  arrowEnd: false,
  arrowType: 'latex',
  arrowColor: '#0f172a',
  arrowOpacity: 1,
  arrowOpen: false,
  arrowRound: false,
  arrowScale: 1,
  arrowLengthScale: 1,
  arrowWidthScale: 1,
  arrowBendMode: 'none'
});

const withLineArrowStyle = (line: LineShape, style: string): LineShape => ({
  ...line,
  arrowStart: hasDrawioArrow(style, 'startArrow'),
  arrowEnd: hasDrawioArrow(style, 'endArrow'),
  arrowType: drawioArrowType(style),
  stroke: styleValue(style, 'strokeColor', line.stroke),
  arrowColor: styleValue(style, 'strokeColor', line.arrowColor),
  strokeStyle: style.includes('dashed=1') ? 'dashed' : line.strokeStyle
});

const makeScene = (name: string, shapes: readonly CanvasShape[]): TikzScene => ({
  name,
  bounds: defaultSceneBounds,
  shapes
});

const normalizeColor = (value: string | null | undefined, fallback: string): string => {
  const raw = (value ?? '').trim();
  if (!raw || raw === 'transparent') {
    return fallback;
  }
  if (raw === 'none') {
    return 'none';
  }
  if (REGEX.color.hex3.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
  }
  return raw;
};

const numberAttr = (element: Element, name: string, fallback = 0): number => {
  const parsed = Number.parseFloat(element.getAttribute(name) ?? '');
  return Number.isFinite(parsed) ? parsed / 40 : fallback;
};

const textShape = (x: number, y: number, text: string, color = '#0f172a'): CanvasShape => ({
  id: createId(),
  name: 'Imported text',
  kind: 'text',
  stroke: 'none',
  strokeOpacity: 1,
  strokeWidth: 0,
  x,
  y,
  text,
  textBox: false,
  boxWidth: DEFAULT_TEXT_BOX_WIDTH,
  fontSize: DEFAULT_TEXT_FONT_SIZE,
  color,
  colorOpacity: 1,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'center',
  rotation: 0
});

export const extractTikzDiagrams = (source: string): readonly ExtractedTikzDiagram[] => {
  const diagrams: ExtractedTikzDiagram[] = [];
  const pattern = REGEX.importSources.tikzPictureEnvironment;
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(source);

  while (match) {
    diagrams.push({
      title: `tikzpicture ${diagrams.length + 1}`,
      code: match[0]
    });
    match = pattern.exec(source);
  }

  return diagrams;
};

export const detectImportSourceKind = (source: string, fileName = ''): ImportSourceKind | null => {
  const trimmed = source.trim();
  if (trimmed) {
    const context: ImportSourceDetectionContext = {
      source,
      trimmedSource: trimmed,
      lines: trimmed.split(REGEX.shared.lineBreak).map((line) => line.trim())
    };
    return importSourceDetectionRules.find((rule) => rule.matches(context))?.kind ?? extensionKind(fileName);
  }

  return extensionKind(fileName);
};

export const importTikzSource = (source: string, name = 'Imported TikZ scene'): ImportDialogResult => {
  const parsed = parseTikz(source);
  return {
    scene: { ...parsed.scene, name },
    importCode: source,
    warnings: parsed.warnings
  };
};

export const importTexSource = (source: string, selectedIndexes: readonly number[]): ImportDialogResult => {
  const diagrams = extractTikzDiagrams(source);
  const selectedDiagrams = (selectedIndexes.length ? selectedIndexes : diagrams.map((_, index) => index))
    .map((index) => diagrams[index])
    .filter((diagram): diagram is ExtractedTikzDiagram => Boolean(diagram));

  if (!selectedDiagrams.length) {
    return {
      scene: makeScene('Imported LaTeX document', []),
      importCode: source,
      warnings: ['No tikzpicture environments were found in the LaTeX document.']
    };
  }

  const warnings: string[] = [];
  const shapes: CanvasShape[] = [];
  const rawTikzLines: string[] = [];
  let offsetX = 0;
  for (const diagram of selectedDiagrams) {
    const parsed = parseTikz(diagram.code);
    warnings.push(...parsed.warnings.map((warning) => `${diagram.title}: ${warning}`));
    shapes.push(...parsed.scene.shapes.map((shape) => offsetShape(shape, offsetX, 0)));
    rawTikzLines.push(...(parsed.scene.rawTikzLines ?? []));
    offsetX += 8;
  }

  return {
    scene: { ...makeScene('Imported LaTeX document', shapes), rawTikzLines },
    importCode: selectedDiagrams.map((diagram) => diagram.code).join('\n\n'),
    warnings
  };
};

export const importProjectJson = (source: string, currentVersion: string): ImportDialogResult => {
  const parsed = JSON.parse(source) as Partial<PersistedEditorState> & {
    readonly version?: string;
    readonly projectVersion?: string;
    readonly state?: Partial<PersistedEditorState>;
  };
  const state = parsed.state ?? parsed;

  if (!state.scene?.shapes) {
    throw new Error('The JSON file is not a valid Tikz Drawer project.');
  }

  const version = parsed.version ?? parsed.projectVersion;
  const warnings =
    version && version !== currentVersion ? [`Project version ${version} differs from app version ${currentVersion}; loaded without migration.`] : [];

  return {
    scene: state.scene,
    importCode: typeof state.importCode === 'string' ? state.importCode : '',
    warnings
  };
};

export const importSvgSource = (source: string): ImportDialogResult => {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  const shapes: CanvasShape[] = [];
  const warnings: string[] = [];

  for (const element of Array.from(document.documentElement.querySelectorAll('line, rect, circle, ellipse, path, text'))) {
    const stroke = normalizeColor(element.getAttribute('stroke'), '#0f172a');
    const fill = normalizeColor(element.getAttribute('fill'), 'none');
    const strokeWidth = Math.max(numberAttr(element, 'stroke-width', 0.08), 0.02);

    switch (element.tagName.toLowerCase()) {
      case 'line':
        shapes.push({
          ...defaultLine({ x: numberAttr(element, 'x1'), y: numberAttr(element, 'y1') }, { x: numberAttr(element, 'x2'), y: numberAttr(element, 'y2') }),
          stroke,
          strokeWidth
        });
        break;
      case 'rect':
        shapes.push({
          id: createId(),
          name: 'Imported rectangle',
          kind: 'rectangle',
          stroke,
          strokeOpacity: 1,
          strokeWidth,
          x: numberAttr(element, 'x'),
          y: numberAttr(element, 'y'),
          width: numberAttr(element, 'width', 2),
          height: numberAttr(element, 'height', 1),
          fill,
          fillOpacity: 1,
          cornerRadius: Math.max(numberAttr(element, 'rx'), numberAttr(element, 'ry')),
          rotation: 0
        });
        break;
      case 'circle':
        shapes.push({
          id: createId(),
          name: 'Imported circle',
          kind: 'circle',
          stroke,
          strokeOpacity: 1,
          strokeWidth,
          cx: numberAttr(element, 'cx'),
          cy: numberAttr(element, 'cy'),
          r: numberAttr(element, 'r', 1),
          fill,
          fillOpacity: 1,
          rotation: 0
        });
        break;
      case 'ellipse':
        shapes.push({
          id: createId(),
          name: 'Imported ellipse',
          kind: 'ellipse',
          stroke,
          strokeOpacity: 1,
          strokeWidth,
          cx: numberAttr(element, 'cx'),
          cy: numberAttr(element, 'cy'),
          rx: numberAttr(element, 'rx', 1.4),
          ry: numberAttr(element, 'ry', 0.8),
          fill,
          fillOpacity: 1,
          rotation: 0
        });
        break;
      case 'path':
        shapes.push(...pathToLines(element.getAttribute('d') ?? '', stroke, strokeWidth, warnings));
        break;
      case 'text':
        shapes.push(
          textShape(
            numberAttr(element, 'x'),
            numberAttr(element, 'y'),
            element.textContent?.trim() ?? '',
            normalizeColor(element.getAttribute('fill'), '#0f172a')
          )
        );
        break;
    }
  }

  return { scene: makeScene('Imported SVG', shapes), importCode: source, warnings };
};

export const importDrawioSource = (source: string): ImportDialogResult => {
  const document = new DOMParser().parseFromString(source, 'text/xml');
  const cells = Array.from(document.querySelectorAll('mxCell'));
  const shapes: CanvasShape[] = [];
  const geometryById = new Map<string, { readonly x: number; readonly y: number; readonly width: number; readonly height: number }>();

  for (const cell of cells) {
    const geometry = cell.querySelector('mxGeometry');
    const id = cell.getAttribute('id');
    if (!geometry || !id) {
      continue;
    }
    const bounds = {
      x: numberAttr(geometry, 'x'),
      y: numberAttr(geometry, 'y'),
      width: numberAttr(geometry, 'width', 3),
      height: numberAttr(geometry, 'height', 1.6)
    };
    geometryById.set(id, bounds);
    if (cell.getAttribute('vertex') !== '1') {
      continue;
    }

    const style = cell.getAttribute('style') ?? '';
    const value = decodeHtml(cell.getAttribute('value') ?? '');
    const stroke = styleValue(style, 'strokeColor', '#0f172a');
    const fill = styleValue(style, 'fillColor', 'none');
    if (isDrawioArrowVertex(style)) {
      shapes.push(
        withLineArrowStyle(
          defaultLine({ x: bounds.x, y: bounds.y + bounds.height / 2 }, { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 }, 'Imported arrow'),
          style.includes('endArrow=') ? style : `${style};endArrow=classic`
        )
      );
    } else if (style.includes('ellipse')) {
      shapes.push({
        id: createId(),
        name: 'Imported ellipse',
        kind: 'ellipse',
        stroke,
        strokeOpacity: 1,
        strokeWidth: 0.08,
        cx: bounds.x + bounds.width / 2,
        cy: bounds.y + bounds.height / 2,
        rx: bounds.width / 2,
        ry: bounds.height / 2,
        fill,
        fillOpacity: 1,
        rotation: 0
      });
    } else {
      shapes.push({
        id: createId(),
        name: 'Imported rectangle',
        kind: 'rectangle',
        stroke,
        strokeOpacity: 1,
        strokeWidth: 0.08,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        fill,
        fillOpacity: 1,
        cornerRadius: style.includes('rounded=1') ? 0.15 : 0,
        rotation: 0
      });
    }
    if (value) {
      shapes.push(textShape(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, value));
    }
  }

  for (const cell of cells.filter((entry) => entry.getAttribute('edge') === '1')) {
    const style = cell.getAttribute('style') ?? '';
    const geometry = cell.querySelector('mxGeometry');
    const sourceBounds = geometryById.get(cell.getAttribute('source') ?? '');
    const targetBounds = geometryById.get(cell.getAttribute('target') ?? '');
    const points = geometry ? drawioEdgePoints(geometry) : [];
    const from = sourceBounds ? { x: sourceBounds.x + sourceBounds.width / 2, y: sourceBounds.y + sourceBounds.height / 2 } : (points[0] ?? null);
    const to = targetBounds ? { x: targetBounds.x + targetBounds.width / 2, y: targetBounds.y + targetBounds.height / 2 } : (points.at(-1) ?? null);

    if (!from || !to) {
      continue;
    }
    const anchors = points.slice(sourceBounds ? 0 : 1, targetBounds ? points.length : -1);
    shapes.push({ ...withLineArrowStyle(defaultLine(from, to), style), anchors });
  }

  return { scene: makeScene('Imported Draw.io diagram', shapes), importCode: source, warnings: [] };
};

export const importMermaidSource = (source: string): ImportDialogResult =>
  graphSourceToScene(source, REGEX.importSources.mermaidEdge, 'Imported Mermaid graph');

export const importDotSource = (source: string): ImportDialogResult => graphSourceToScene(source, REGEX.importSources.dotEdge, 'Imported DOT graph');

export const importCsvSource = (source: string, xColumn: string, yColumn: string, labelColumn: string, groupColumn: string): ImportDialogResult => {
  const rows = parseCsvRows(source);
  if (rows.length < 2) {
    return { scene: makeScene('Imported CSV coordinates', []), importCode: source, warnings: ['CSV import requires a header row and at least one data row.'] };
  }
  const headers = rows[0];
  const xIndex = columnIndex(headers, xColumn, ['x', 'X']);
  const yIndex = columnIndex(headers, yColumn, ['y', 'Y']);
  const labelIndex = columnIndex(headers, labelColumn, ['label', 'name']);
  const groupIndex = columnIndex(headers, groupColumn, ['group', 'series']);
  const warnings: string[] = [];
  const pointsByGroup = new Map<string, { readonly x: number; readonly y: number; readonly label: string }[]>();

  for (const row of rows.slice(1)) {
    const x = Number.parseFloat(row[xIndex] ?? '');
    const y = Number.parseFloat(row[yIndex] ?? '');
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      warnings.push(`Skipped CSV row with invalid coordinates: ${row.join(', ')}`);
      continue;
    }
    const group = groupIndex >= 0 ? (row[groupIndex] ?? 'default') : 'default';
    const point = { x, y, label: labelIndex >= 0 ? (row[labelIndex] ?? '') : '' };
    pointsByGroup.set(group, [...(pointsByGroup.get(group) ?? []), point]);
  }

  const shapes: CanvasShape[] = [];
  for (const points of pointsByGroup.values()) {
    points.forEach((point) => {
      shapes.push({
        id: createId(),
        name: 'Imported point',
        kind: 'circle',
        stroke: '#0f172a',
        strokeOpacity: 1,
        strokeWidth: 0.08,
        cx: point.x,
        cy: point.y,
        r: 0.08,
        fill: '#0f172a',
        fillOpacity: 1,
        rotation: 0
      });
      if (point.label) {
        shapes.push(textShape(point.x, point.y + 0.28, point.label));
      }
    });
    for (let index = 1; index < points.length; index += 1) {
      shapes.push(defaultLine(points[index - 1], points[index], 'Imported polyline'));
    }
  }

  return { scene: makeScene('Imported CSV coordinates', shapes), importCode: source, warnings };
};

export const importImageSource = (dataUrl: string, fileName: string): ImportDialogResult => ({
  scene: makeScene('Imported image', [
    {
      id: createId(),
      name: 'Imported image',
      kind: 'image',
      stroke: 'none',
      strokeOpacity: 1,
      strokeWidth: 0,
      x: -4,
      y: -3,
      width: 8,
      height: 6,
      aspectRatio: 4 / 3,
      src: dataUrl,
      latexSource: fileName,
      rotation: 0
    }
  ]),
  importCode: '',
  warnings: []
});

const offsetShape = (shape: CanvasShape, deltaX: number, deltaY: number): CanvasShape => {
  switch (shape.kind) {
    case 'line':
      return {
        ...shape,
        from: { x: shape.from.x + deltaX, y: shape.from.y + deltaY },
        to: { x: shape.to.x + deltaX, y: shape.to.y + deltaY },
        anchors: shape.anchors.map((anchor) => ({ x: anchor.x + deltaX, y: anchor.y + deltaY }))
      };
    case 'circle':
    case 'ellipse':
      return { ...shape, cx: shape.cx + deltaX, cy: shape.cy + deltaY };
    case 'rectangle':
    case 'triangle':
    case 'text':
    case 'image':
      return { ...shape, x: shape.x + deltaX, y: shape.y + deltaY };
  }
};

const pathToLines = (path: string, stroke: string, strokeWidth: number, warnings: string[]): readonly CanvasShape[] => {
  const numbers = Array.from(path.matchAll(REGEX.importSources.svgPathNumber)).map((match) => Number(match[0]) / 40);
  if (!REGEX.importSources.svgPathMoveOrLine.test(path) || numbers.length < 4) {
    warnings.push(`Unsupported SVG path preserved as warning: ${path}`);
    return [];
  }
  const points: { readonly x: number; readonly y: number }[] = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push({ x: numbers[index], y: numbers[index + 1] });
  }
  return points.slice(1).map((point, index) => ({ ...defaultLine(points[index], point), stroke, strokeWidth }));
};

const styleValue = (style: string, key: string, fallback: string): string => {
  const match = keyValueRegex(key).exec(style);
  return normalizeColor(match?.[1], fallback);
};

const hasDrawioArrow = (style: string, key: 'startArrow' | 'endArrow'): boolean => {
  const value = styleValue(style, key, '');
  return Boolean(value && value !== 'none');
};

const drawioArrowType = (style: string): LineShape['arrowType'] => {
  const arrow = `${styleValue(style, 'startArrow', '')};${styleValue(style, 'endArrow', '')}`.toLowerCase();
  if (arrow.includes('diamond')) {
    return 'diamond';
  }
  if (arrow.includes('oval')) {
    return 'circle';
  }
  if (arrow.includes('block') || arrow.includes('classic') || arrow.includes('open')) {
    return 'triangle';
  }
  return 'latex';
};

const isDrawioArrowVertex = (style: string): boolean => REGEX.importSources.drawioArrowShape.test(style) || REGEX.importSources.drawioArrowWidth.test(style);

const drawioEdgePoints = (geometry: Element): readonly { readonly x: number; readonly y: number }[] => {
  const points = Array.from(geometry.getElementsByTagName('*'))
    .filter((element) => element.localName.toLowerCase() === 'mxpoint' || element.tagName.toLowerCase() === 'mxpoint')
    .filter((point) => ['sourcePoint', 'targetPoint', ''].includes(point.getAttribute('as') ?? ''))
    .map((point) => ({ x: numberAttr(point, 'x'), y: numberAttr(point, 'y') }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  if (points.length >= 2) {
    return points;
  }

  const x = numberAttr(geometry, 'x', Number.NaN);
  const y = numberAttr(geometry, 'y', Number.NaN);
  const width = numberAttr(geometry, 'width', Number.NaN);
  const height = numberAttr(geometry, 'height', Number.NaN);
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(width) && Number.isFinite(height)
    ? [
        { x, y },
        { x: x + width, y: y + height }
      ]
    : [];
};

const decodeHtml = (value: string): string => {
  const element = document.createElement('textarea');
  element.innerHTML = value.replaceAll(REGEX.importSources.htmlBreak, '\n').replaceAll(REGEX.importSources.htmlTag, '');
  return element.value.trim();
};

const extensionKind = (fileName: string): ImportSourceKind | null => {
  const extension = fileName.trim().toLowerCase().match(REGEX.importSources.fileExtension)?.[1] ?? '';
  return extensionKindMap[extension] ?? null;
};

const isProjectJsonSource = (source: string): boolean => {
  if (!source.startsWith('{')) {
    return false;
  }

  try {
    const parsed = JSON.parse(source) as Partial<PersistedEditorState> & {
      readonly format?: string;
      readonly state?: Partial<PersistedEditorState>;
    };
    const state = parsed.state ?? parsed;
    return parsed.format === 'tikz-drawer-project' || Boolean(state.scene?.shapes);
  } catch {
    return false;
  }
};

const hasTabularRows = (source: string): boolean => {
  const rows = parseCsvRows(source);
  return rows.length >= 2 && rows[0].length >= 2 && rows.slice(1).some((row) => row.length === rows[0].length);
};

const graphSourceToScene = (source: string, edgePattern: RegExp, name: string): ImportDialogResult => {
  const labels = new Set<string>();
  const edges: { readonly from: string; readonly to: string; readonly directed: boolean }[] = [];
  for (const rawLine of source.split(REGEX.shared.lineBreak)) {
    const line = rawLine.trim().replace(REGEX.importSources.graphLinePunctuation, '');
    const match = edgePattern.exec(line);
    if (!match) {
      continue;
    }
    const from = normalizeGraphLabel(match[1]);
    const to = normalizeGraphLabel(match[3]);
    labels.add(from);
    labels.add(to);
    edges.push({ from, to, directed: match[2].includes('>') });
  }
  const nodePositions = new Map<string, { readonly x: number; readonly y: number }>();
  Array.from(labels).forEach((label, index) => {
    nodePositions.set(label, {
      x: (index % 4) * 3,
      y: Math.floor(index / 4) * 2
    });
  });
  const shapes: CanvasShape[] = [];
  for (const [label, position] of nodePositions.entries()) {
    shapes.push({
      id: createId(),
      name: 'Imported graph node',
      kind: 'rectangle',
      stroke: '#0f172a',
      strokeOpacity: 1,
      strokeWidth: 0.08,
      x: position.x - 0.9,
      y: position.y - 0.45,
      width: 1.8,
      height: 0.9,
      fill: '#ffffff',
      fillOpacity: 1,
      cornerRadius: 0.12,
      rotation: 0
    });
    shapes.push(textShape(position.x, position.y, label));
  }
  for (const edge of edges) {
    const from = nodePositions.get(edge.from);
    const to = nodePositions.get(edge.to);
    if (from && to) {
      shapes.push({ ...defaultLine(from, to), arrowEnd: edge.directed });
    }
  }
  return { scene: makeScene(name, shapes), importCode: source, warnings: edges.length ? [] : ['No graph edges were recognized.'] };
};

const normalizeGraphLabel = (value: string): string => value.replaceAll('[', '').replaceAll(']', '').replaceAll('"', '').replaceAll("'", '').trim();

const parseCsvRows = (source: string): readonly string[][] =>
  source
    .split(REGEX.shared.lineBreak)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(REGEX.importSources.csvCellSeparator).map((cell) => cell.trim()));

const columnIndex = (headers: readonly string[], preferred: string, fallbacks: readonly string[]): number => {
  const candidates = [preferred, ...fallbacks].filter(Boolean).map((candidate) => candidate.toLowerCase());
  return headers.findIndex((header) => candidates.includes(header.toLowerCase()));
};
