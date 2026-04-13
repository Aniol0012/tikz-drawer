import { createServer } from 'node:http';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';
import type { SharedScenePayload } from '../src/app/features/editor/i18n/editor-page.i18n.ts';
import type {
  CanvasShape,
  CircleShape,
  EditorPreferences,
  EllipseShape,
  LineShape,
  ObjectPreset,
  Point,
  RectangleShape,
  ScenePreset,
  TextShape,
  TikzScene
} from '../src/app/features/editor/models/tikz.models.ts';
import * as presetsModule from '../src/app/features/editor/presets/presets.ts';
import * as tikzCodegenModule from '../src/app/features/editor/tikz/tikz.codegen.ts';
import * as editorPageUtilsModule from '../src/app/features/editor/utils/editor-page.utils.ts';

const DIST_DIR = normalize(join(process.cwd(), 'dist', 'tikz-drawer', 'browser'));
const OUTPUT_DIR = normalize(join(process.cwd(), 'screenshots'));
const HOST = '127.0.0.1';

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

interface WorldBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

interface LayoutBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface CaptureViewport {
  readonly width: number;
  readonly height: number;
}

interface GeneratedScreenshotScene {
  readonly family: string;
  readonly paletteName: string;
  readonly seed: number;
  readonly summary: string;
  readonly scene: TikzScene;
}

interface Palette {
  readonly name: string;
  readonly stroke: string;
  readonly text: string;
  readonly fills: readonly string[];
  readonly softFills: readonly string[];
  readonly accent: string;
  readonly accentSoft: string;
}

type SceneComposer = (rng: SeededRandom, palette: Palette) => GeneratedScreenshotScene;

const DESKTOP_VIEWPORT = { width: 1600, height: 900 } as const;
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

type RuntimePresetExports = {
  readonly defaultPreferences?: EditorPreferences;
  readonly objectPresets?: readonly ObjectPreset[];
  readonly scenePresets?: readonly ScenePreset[];
  readonly default?: {
    readonly defaultPreferences?: EditorPreferences;
    readonly objectPresets?: readonly ObjectPreset[];
    readonly scenePresets?: readonly ScenePreset[];
  };
};

type RuntimeTikzCodegenExports = {
  readonly sceneToTikz?: (scene: TikzScene) => string;
  readonly default?: {
    readonly sceneToTikz?: (scene: TikzScene) => string;
  };
};

type RuntimeEditorPageUtilsExports = {
  readonly encodeSharePayload?: (payload: SharedScenePayload) => Promise<string>;
  readonly transformCanvasShape?: (
    shape: CanvasShape,
    deltaX: number,
    deltaY: number,
    scaleX: number,
    scaleY: number,
    originX: number,
    originY: number,
    id?: string
  ) => CanvasShape;
  readonly default?: {
    readonly encodeSharePayload?: (payload: SharedScenePayload) => Promise<string>;
    readonly transformCanvasShape?: (
      shape: CanvasShape,
      deltaX: number,
      deltaY: number,
      scaleX: number,
      scaleY: number,
      originX: number,
      originY: number,
      id?: string
    ) => CanvasShape;
  };
};

const FALLBACK_DEFAULT_PREFERENCES: EditorPreferences = {
  theme: 'light',
  snapToGrid: true,
  showGrid: true,
  showAxes: true,
  scale: 24,
  snapStep: 0.25,
  defaultStroke: '#1f1f1f',
  defaultFill: '#f1f1f1',
  defaultStrokeWidth: 0.28,
  defaultArrowScale: 1.35
};

function resolvePresetExport<T>(name: 'defaultPreferences' | 'objectPresets' | 'scenePresets', fallback?: T): T {
  const runtimeModule = presetsModule as RuntimePresetExports;
  const resolved =
    runtimeModule[name] ??
    runtimeModule.default?.[name] ??
    (runtimeModule.default as Record<string, unknown> | undefined)?.default?.[name] ??
    fallback;

  if (resolved === undefined) {
    throw new Error(`release-screenshots: "${name}" was not found in presets module.`);
  }

  return resolved as T;
}

function resolveTikzCodegenExport<T>(name: 'sceneToTikz'): T {
  const runtimeModule = tikzCodegenModule as RuntimeTikzCodegenExports;
  const resolved =
    runtimeModule[name] ??
    runtimeModule.default?.[name] ??
    (runtimeModule.default as Record<string, unknown> | undefined)?.default?.[name];

  if (resolved === undefined) {
    throw new Error(`release-screenshots: "${name}" was not found in tikz.codegen module.`);
  }

  return resolved as T;
}

function resolveEditorPageUtilsExport<T>(name: 'encodeSharePayload' | 'transformCanvasShape'): T {
  const runtimeModule = editorPageUtilsModule as RuntimeEditorPageUtilsExports;
  const resolved =
    runtimeModule[name] ??
    runtimeModule.default?.[name] ??
    (runtimeModule.default as Record<string, unknown> | undefined)?.default?.[name];

  if (resolved === undefined) {
    throw new Error(`release-screenshots: "${name}" was not found in editor-page.utils module.`);
  }

  return resolved as T;
}

const defaultPreferences = resolvePresetExport<EditorPreferences>('defaultPreferences', FALLBACK_DEFAULT_PREFERENCES);
const objectPresets = resolvePresetExport<readonly ObjectPreset[]>('objectPresets');
const scenePresets = resolvePresetExport<readonly ScenePreset[]>('scenePresets');
const sceneToTikz = resolveTikzCodegenExport<(scene: TikzScene) => string>('sceneToTikz');
const encodeSharePayload = resolveEditorPageUtilsExport<(payload: SharedScenePayload) => Promise<string>>('encodeSharePayload');
const transformCanvasShape = resolveEditorPageUtilsExport<
  (
    shape: CanvasShape,
    deltaX: number,
    deltaY: number,
    scaleX: number,
    scaleY: number,
    originX: number,
    originY: number,
    id?: string
  ) => CanvasShape
>('transformCanvasShape');

const PALETTES: readonly Palette[] = [
  {
    name: 'coastal',
    stroke: '#213547',
    text: '#14212b',
    fills: ['#eef6ff', '#e0ecff', '#edf7f1', '#fff0e3'],
    softFills: ['#d6e7ff', '#d9f0e4', '#ffe2c8'],
    accent: '#2f6fb3',
    accentSoft: '#c9dfff'
  },
  {
    name: 'citrus',
    stroke: '#2a2f24',
    text: '#1a1f16',
    fills: ['#f4f8e8', '#fff4db', '#eaf6ef', '#f3ecff'],
    softFills: ['#e1efb5', '#ffe0a8', '#cfead8'],
    accent: '#c46d1a',
    accentSoft: '#ffd9a8'
  },
  {
    name: 'studio',
    stroke: '#2f2a36',
    text: '#1f1726',
    fills: ['#f3edff', '#e8f0ff', '#ffeef3', '#eef8f2'],
    softFills: ['#ddd0ff', '#cadfff', '#ffd4e2'],
    accent: '#7a57c8',
    accentSoft: '#d9c9ff'
  },
  {
    name: 'terracotta',
    stroke: '#3a2d28',
    text: '#241b18',
    fills: ['#fff1eb', '#f8efe8', '#eef5ea', '#eef6fb'],
    softFills: ['#ffd6c7', '#d9e9c8', '#d8e8f6'],
    accent: '#be5f3f',
    accentSoft: '#ffd9ce'
  }
];

class SeededRandom {
  constructor(private state: number) {}

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let result = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  }

  float(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  signed(maxMagnitude: number): number {
    return this.float(-maxMagnitude, maxMagnitude);
  }

  pick<T>(items: readonly T[]): T {
    if (!items.length) {
      throw new Error('Cannot pick from an empty array.');
    }
    return items[this.int(0, items.length - 1)]!;
  }

  shuffle<T>(items: readonly T[]): readonly T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = this.int(0, index);
      [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
    }
    return copy;
  }

  pickMany<T>(items: readonly T[], count: number): readonly T[] {
    return this.shuffle(items).slice(0, Math.max(0, Math.min(count, items.length)));
  }
}

function getContentType(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function resolveAssetPath(urlPath: string): string {
  const cleanPath = urlPath.split('?')[0].split('#')[0];
  const requestPath = cleanPath === '/' ? '/index.html' : cleanPath;
  return normalize(join(DIST_DIR, requestPath));
}

function resolveScreenshotSeed(): number {
  const rawSeed = process.env.SCREENSHOT_SEED?.trim();
  if (rawSeed) {
    const parsed = Number.parseInt(rawSeed, 10);
    if (Number.isFinite(parsed)) {
      return parsed >>> 0;
    }
    throw new Error(`Invalid SCREENSHOT_SEED value: "${rawSeed}"`);
  }

  return (Date.now() ^ globalThis.crypto.getRandomValues(new Uint32Array(1))[0]!) >>> 0;
}

function findScenePreset(id: string): ScenePreset {
  const preset = scenePresets.find((candidate) => candidate.id === id);
  if (!preset) {
    throw new Error(`Scene preset "${id}" not found.`);
  }
  return preset;
}

function findObjectPreset(id: string): ObjectPreset {
  const preset = objectPresets.find((candidate) => candidate.id === id);
  if (!preset) {
    throw new Error(`Object preset "${id}" not found.`);
  }
  return preset;
}

function cloneShapes(shapes: readonly CanvasShape[]): readonly CanvasShape[] {
  const mergeIdMap = new Map<string, string>();
  const tableIdMap = new Map<string, string>();

  return shapes.map((shape) => {
    const nextMergeId = shape.mergeId
      ? (mergeIdMap.get(shape.mergeId) ??
        (() => {
          const value = crypto.randomUUID();
          mergeIdMap.set(shape.mergeId!, value);
          return value;
        })())
      : undefined;

    const nextTable = shape.table
      ? {
          ...shape.table,
          id:
            tableIdMap.get(shape.table.id) ??
            (() => {
              const value = crypto.randomUUID();
              tableIdMap.set(shape.table!.id, value);
              return value;
            })()
        }
      : undefined;

    return {
      ...shape,
      id: crypto.randomUUID(),
      ...(nextMergeId ? { mergeId: nextMergeId } : {}),
      ...(nextTable ? { table: nextTable } : {})
    } satisfies CanvasShape;
  });
}

function textBounds(shape: TextShape): WorldBounds {
  const lines = shape.text.split('\n').map((line) => line || ' ');
  const width = shape.textBox
    ? Math.max(shape.boxWidth, shape.fontSize)
    : Math.max(...lines.map((line) => Math.max(line.length * shape.fontSize * 0.48, shape.fontSize * 0.7)));
  const height = Math.max(lines.length * shape.fontSize * 0.9, shape.fontSize * 0.72);
  const left =
    shape.textBox || shape.textAlign === 'left' ? shape.x : shape.textAlign === 'right' ? shape.x - width : shape.x - width / 2;

  return {
    left,
    right: left + width,
    bottom: shape.y - height / 2,
    top: shape.y + height / 2
  };
}

function shapeBounds(shape: CanvasShape): WorldBounds | null {
  switch (shape.kind) {
    case 'rectangle':
      return { left: shape.x, right: shape.x + shape.width, bottom: shape.y, top: shape.y + shape.height };
    case 'circle':
      return { left: shape.cx - shape.r, right: shape.cx + shape.r, bottom: shape.cy - shape.r, top: shape.cy + shape.r };
    case 'ellipse':
      return {
        left: shape.cx - shape.rx,
        right: shape.cx + shape.rx,
        bottom: shape.cy - shape.ry,
        top: shape.cy + shape.ry
      };
    case 'line': {
      const points = [shape.from, ...shape.anchors, shape.to];
      return {
        left: Math.min(...points.map((point) => point.x)),
        right: Math.max(...points.map((point) => point.x)),
        bottom: Math.min(...points.map((point) => point.y)),
        top: Math.max(...points.map((point) => point.y))
      };
    }
    case 'text':
      return textBounds(shape);
    case 'image':
      return { left: shape.x, right: shape.x + shape.width, bottom: shape.y, top: shape.y + shape.height };
  }
}

function mergeBounds(current: WorldBounds | null, next: WorldBounds | null): WorldBounds | null {
  if (!next) {
    return current;
  }
  if (!current) {
    return next;
  }
  return {
    left: Math.min(current.left, next.left),
    right: Math.max(current.right, next.right),
    bottom: Math.min(current.bottom, next.bottom),
    top: Math.max(current.top, next.top)
  };
}

function computeBounds(shapes: readonly CanvasShape[]): WorldBounds | null {
  return shapes.reduce<WorldBounds | null>((bounds, shape) => mergeBounds(bounds, shapeBounds(shape)), null);
}

function jitterBox(box: LayoutBox, rng: SeededRandom, offset = 0.35, scaleJitter = 0.08): LayoutBox {
  const widthScale = 1 + rng.signed(scaleJitter);
  const heightScale = 1 + rng.signed(scaleJitter);
  return {
    x: box.x + rng.signed(offset),
    y: box.y + rng.signed(offset),
    width: Math.max(box.width * widthScale, 2.8),
    height: Math.max(box.height * heightScale, 2.2)
  };
}

function fitShapesIntoBox(shapes: readonly CanvasShape[], box: LayoutBox): readonly CanvasShape[] {
  const bounds = computeBounds(shapes);
  if (!bounds) {
    return [];
  }

  const width = Math.max(bounds.right - bounds.left, 0.4);
  const height = Math.max(bounds.top - bounds.bottom, 0.4);
  const scale = Math.min(box.width / width, box.height / height);
  const targetLeft = box.x + (box.width - width * scale) / 2;
  const targetBottom = box.y + (box.height - height * scale) / 2;

  return shapes.map((shape) =>
    transformCanvasShape(shape, targetLeft - bounds.left, targetBottom - bounds.bottom, scale, scale, bounds.left, bounds.bottom)
  );
}

function replaceTextByName(
  shapes: readonly CanvasShape[],
  replacements: Readonly<Record<string, string>>,
  fallbackSequence: readonly string[] = []
): readonly CanvasShape[] {
  let fallbackIndex = 0;

  return shapes.map((shape) => {
    if (shape.kind !== 'text') {
      return shape;
    }

    const nextText = replacements[shape.name] ?? replacements[shape.text];
    if (nextText) {
      return { ...shape, text: nextText } satisfies TextShape;
    }

    if (!fallbackSequence.length) {
      return shape;
    }

    const fallback = fallbackSequence[fallbackIndex % fallbackSequence.length]!;
    fallbackIndex += 1;
    return { ...shape, text: fallback } satisfies TextShape;
  });
}

function styleShapes(shapes: readonly CanvasShape[], palette: Palette, rng: SeededRandom): readonly CanvasShape[] {
  return shapes.map((shape, index) => {
    const fill = palette.fills[index % palette.fills.length]!;
    const softFill = palette.softFills[index % palette.softFills.length]!;

    switch (shape.kind) {
      case 'rectangle': {
        const isHighlight = /note|callout|sticky|card|kanban|browser|folder|table/i.test(shape.name);
        return {
          ...shape,
          stroke: palette.stroke,
          strokeOpacity: 1,
          strokeWidth: Math.max(shape.strokeWidth, 0.08),
          fill: isHighlight ? softFill : fill,
          fillOpacity: 1,
          cornerRadius: Math.max(shape.cornerRadius, 0.14)
        } satisfies RectangleShape;
      }
      case 'circle':
        return {
          ...shape,
          stroke: palette.stroke,
          strokeOpacity: 1,
          strokeWidth: Math.max(shape.strokeWidth, 0.08),
          fill: index % 2 === 0 ? palette.accentSoft : softFill,
          fillOpacity: 1
        } satisfies CircleShape;
      case 'ellipse':
        return {
          ...shape,
          stroke: palette.stroke,
          strokeOpacity: 1,
          strokeWidth: Math.max(shape.strokeWidth, 0.08),
          fill: index % 2 === 0 ? palette.accentSoft : softFill,
          fillOpacity: 1
        } satisfies EllipseShape;
      case 'line': {
        const stroke = shape.arrowStart || shape.arrowEnd || rng.bool(0.28) ? palette.accent : palette.stroke;
        return {
          ...shape,
          stroke,
          strokeOpacity: 1,
          strokeWidth: Math.max(shape.strokeWidth, 0.08),
          arrowColor: stroke,
          arrowOpacity: 1
        } satisfies LineShape;
      }
      case 'text':
        return {
          ...shape,
          color: palette.text,
          colorOpacity: 1,
          fontWeight:
            shape.fontWeight === 'normal' && (shape.text.length <= 18 || /label|title|todo|doing|done|stage/i.test(shape.name))
              ? 'bold'
              : shape.fontWeight
        } satisfies TextShape;
      case 'image':
        return {
          ...shape,
          stroke: palette.stroke,
          strokeOpacity: 1,
          strokeWidth: Math.max(shape.strokeWidth, 0.08)
        };
    }
  });
}

function buildModule(
  presetId: string,
  box: LayoutBox,
  rng: SeededRandom,
  palette: Palette,
  replacements: Readonly<Record<string, string>> = {},
  fallbackSequence: readonly string[] = []
): readonly CanvasShape[] {
  const cloned = cloneShapes(findObjectPreset(presetId).shapes);
  const withText = replaceTextByName(cloned, replacements, fallbackSequence);
  const fitted = fitShapesIntoBox(withText, jitterBox(box, rng));
  return styleShapes(fitted, palette, rng);
}

function buildSceneModule(
  presetId: string,
  box: LayoutBox,
  rng: SeededRandom,
  palette: Palette,
  replacements: Readonly<Record<string, string>> = {},
  fallbackSequence: readonly string[] = []
): readonly CanvasShape[] {
  const cloned = cloneShapes(findScenePreset(presetId).scene.shapes);
  const withText = replaceTextByName(cloned, replacements, fallbackSequence);
  const fitted = fitShapesIntoBox(withText, jitterBox(box, rng, 0.25, 0.05));
  return styleShapes(fitted, palette, rng);
}

function createScene(name: string, shapes: readonly CanvasShape[]): TikzScene {
  return {
    name,
    bounds: { width: 960, height: 640 },
    shapes
  };
}

function architectureScene(rng: SeededRandom, palette: Palette): GeneratedScreenshotScene {
  const client = rng.pick(['Client app', 'Dashboard', 'Mobile app', 'Control room']);
  const api = rng.pick(['Workflow API', 'Gateway', 'Sync service', 'Diagram engine']);
  const database = rng.pick(['Warehouse', 'Metrics DB', 'Snapshot store', 'Figure cache']);
  const extras = rng.pickMany(
    [
      {
        id: 'pipeline',
        box: { x: -14.2, y: 3.1, width: 7.3, height: 3.0 },
        labels: ['Ingest', 'Shape', 'Export']
      },
      {
        id: 'cloud',
        box: { x: 9.2, y: 3.1, width: 5.4, height: 3.1 },
        labels: ['Preview sync']
      },
      {
        id: 'folder',
        box: { x: 9.4, y: -1.3, width: 5.2, height: 3.0 },
        labels: ['Assets']
      },
      {
        id: 'message',
        box: { x: -14.0, y: -4.6, width: 6.2, height: 2.8 },
        labels: ['Event bus']
      },
      {
        id: 'callout',
        box: { x: 2.9, y: -5.0, width: 5.6, height: 3.0 },
        labels: ['Reusable diagram presets']
      },
      {
        id: 'hub',
        box: { x: -14.3, y: -0.8, width: 5.8, height: 4.0 },
        labels: ['Routing']
      }
    ],
    4
  );

  const shapes = [
    ...buildSceneModule(
      'system-map',
      { x: -8.4, y: -3.5, width: 16.8, height: 8.1 },
      rng,
      palette,
      {
        'Client label': client,
        'API label': api,
        'Database label': database
      }
    ),
    ...extras.flatMap((extra) => buildModule(extra.id, extra.box, rng, palette, {}, extra.labels))
  ];

  return {
    family: 'architecture',
    paletteName: palette.name,
    seed: 0,
    summary: `${client} -> ${api} -> ${database}`,
    scene: createScene(`${client} delivery map`, shapes)
  };
}

function analyticsScene(rng: SeededRandom, palette: Palette): GeneratedScreenshotScene {
  const extras = rng.pickMany(
    [
      {
        id: 'table',
        box: { x: 8.4, y: 1.8, width: 6.8, height: 4.4 },
        labels: []
      },
      {
        id: 'network',
        box: { x: 9.0, y: -4.8, width: 5.6, height: 3.5 },
        labels: []
      },
      {
        id: 'funnel',
        box: { x: -14.2, y: 2.0, width: 5.4, height: 4.0 },
        labels: []
      },
      {
        id: 'sticky-note',
        box: { x: -14.3, y: -4.8, width: 5.6, height: 3.2 },
        labels: ['Variance is shrinking']
      },
      {
        id: 'message',
        box: { x: 1.7, y: -5.0, width: 6.3, height: 2.8 },
        labels: ['Daily sync']
      },
      {
        id: 'cloud',
        box: { x: -14.2, y: -0.7, width: 5.8, height: 3.2 },
        labels: ['Auto refresh']
      }
    ],
    4
  );

  const shapes = [
    ...buildSceneModule(
      'metrics-board',
      { x: -8.6, y: -3.9, width: 16.5, height: 8.5 },
      rng,
      palette,
      {},
      ['Growth', 'Activation', 'Retention', 'Kickoff', 'Review', 'Launch', 'Keep exports tidy']
    ),
    ...extras.flatMap((extra) => buildModule(extra.id, extra.box, rng, palette, {}, extra.labels))
  ];

  return {
    family: 'analytics',
    paletteName: palette.name,
    seed: 0,
    summary: 'metrics-board + supporting modules',
    scene: createScene('Analytics workspace', shapes)
  };
}

function workflowScene(rng: SeededRandom, palette: Palette): GeneratedScreenshotScene {
  const endpointPreset = rng.bool() ? 'browser' : 'phone';
  const endpointLabel = endpointPreset === 'browser' ? 'Preview' : 'Mobile QA';
  const extras = rng.pickMany(
    [
      {
        id: 'pipeline',
        box: { x: 8.8, y: 2.6, width: 6.1, height: 3.4 },
        labels: ['Parse', 'Arrange', 'Export']
      },
      {
        id: endpointPreset,
        box: { x: -14.3, y: 1.8, width: 5.6, height: 4.1 },
        labels: [endpointLabel]
      },
      {
        id: 'cloud',
        box: { x: -14.0, y: -4.8, width: 5.8, height: 3.4 },
        labels: ['Shared snapshots']
      },
      {
        id: 'sticky-note',
        box: { x: 9.0, y: -4.7, width: 5.3, height: 3.2 },
        labels: ['Try another layout']
      },
      {
        id: 'hub',
        box: { x: 3.6, y: -5.0, width: 4.8, height: 3.0 },
        labels: ['Routing']
      },
      {
        id: 'actor',
        box: { x: -14.2, y: -0.8, width: 4.8, height: 3.8 },
        labels: ['Reviewer']
      }
    ],
    4
  );

  const shapes = [
    ...buildSceneModule(
      'flow-starter',
      { x: -8.8, y: -3.6, width: 17.2, height: 8.2 },
      rng,
      palette,
      {},
      ['Capture', 'Normalize', 'Review', 'Publish']
    ),
    ...extras.flatMap((extra) => buildModule(extra.id, extra.box, rng, palette, {}, extra.labels))
  ];

  return {
    family: 'workflow',
    paletteName: palette.name,
    seed: 0,
    summary: `flow-starter + ${endpointPreset}`,
    scene: createScene('Workflow builder', shapes)
  };
}

function planningScene(rng: SeededRandom, palette: Palette): GeneratedScreenshotScene {
  const topBanner = buildModule(
    'message',
    { x: -14.1, y: 6.0, width: 7.8, height: 2.1 },
    rng,
    palette,
    {},
    [rng.pick(['Release planning', 'Diagram sprint', 'Editorial sync'])]
  );

  const shapes = [
    ...topBanner,
    ...buildModule(
      'kanban',
      { x: -14.2, y: -0.2, width: 18.6, height: 6.6 },
      rng,
      palette,
      {},
      [rng.pick(['Ideas', 'Backlog']), rng.pick(['Doing', 'In progress']), rng.pick(['Done', 'Ready'])]
    ),
    ...buildModule(
      'timeline',
      { x: -14.1, y: -5.9, width: 11.8, height: 4.4 },
      rng,
      palette,
      {},
      ['Kickoff', 'Review', 'Publish']
    ),
    ...buildModule('table', { x: 5.0, y: -5.8, width: 9.1, height: 4.4 }, rng, palette),
    ...buildModule('swimlane', { x: 5.2, y: 1.0, width: 9.0, height: 5.2 }, rng, palette, {}, ['Owner']),
    ...buildModule(
      'sticky-note',
      { x: 8.9, y: -0.8, width: 5.0, height: 3.0 },
      rng,
      palette,
      {},
      [rng.pick(['Presets stay editable', 'TikZ export is one click', 'Same board, many views'])]
    )
  ];

  return {
    family: 'planning',
    paletteName: palette.name,
    seed: 0,
    summary: 'kanban + timeline + swimlane',
    scene: createScene('Planning board', shapes)
  };
}

const SCENE_COMPOSERS: readonly SceneComposer[] = [
  architectureScene,
  analyticsScene,
  workflowScene,
  planningScene
];

function generateScreenshotScene(seed: number): GeneratedScreenshotScene {
  const rng = new SeededRandom(seed);
  const palette = rng.pick(PALETTES);
  const composer = rng.pick(SCENE_COMPOSERS);
  const generated = composer(rng, palette);
  return {
    ...generated,
    paletteName: palette.name,
    seed
  };
}

function sceneCenter(scene: TikzScene): Point {
  const bounds = computeBounds(scene.shapes);
  if (!bounds) {
    return { x: 0, y: 0 };
  }
  return {
    x: (bounds.left + bounds.right) / 2,
    y: (bounds.top + bounds.bottom) / 2
  };
}

function preferredScale(scene: TikzScene, viewport: CaptureViewport): number {
  const bounds = computeBounds(scene.shapes);
  if (!bounds) {
    return defaultPreferences.scale;
  }

  const width = Math.max(bounds.right - bounds.left, 8);
  const height = Math.max(bounds.top - bounds.bottom, 6);
  const widthScale = viewport.width / (width * 1.18);
  const heightScale = viewport.height / (height * 1.26);
  return Math.max(8, Math.min(28, Math.min(widthScale, heightScale)));
}

function createPreferences(scale: number): EditorPreferences {
  return {
    ...defaultPreferences,
    scale,
    showAxes: false
  };
}

function createScenePayload(scene: TikzScene, viewport: CaptureViewport): SharedScenePayload {
  const center = sceneCenter(scene);
  return {
    scene,
    preferences: createPreferences(preferredScale(scene, viewport)),
    importCode: sceneToTikz(scene),
    viewportCenter: center
  };
}

async function createSceneUrl(baseUrl: string, payload: SharedScenePayload): Promise<string> {
  const sharePayload = await encodeSharePayload(payload);
  const url = new URL(baseUrl);
  url.searchParams.set('share', sharePayload);
  return url.toString();
}

async function captureScreenshot(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  baseUrl: string,
  payload: SharedScenePayload,
  viewport: CaptureViewport,
  outputPath: string,
  options: {
    readonly isMobile?: boolean;
    readonly deviceScaleFactor?: number;
    readonly hasTouch?: boolean;
  } = {}
): Promise<void> {
  const context = await browser.newContext({
    colorScheme: 'light',
    viewport,
    isMobile: options.isMobile ?? false,
    hasTouch: options.hasTouch ?? false,
    deviceScaleFactor: options.deviceScaleFactor ?? 1
  });

  try {
    const page = await context.newPage();
    await page.goto(await createSceneUrl(baseUrl, payload), { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    await page.screenshot({ path: outputPath, fullPage: true });
  } finally {
    await context.close();
  }
}

async function run(): Promise<void> {
  if (!existsSync(join(DIST_DIR, 'index.html'))) {
    throw new Error(`Build output not found at ${DIST_DIR}. Run "pnpm build" first.`);
  }

  const seed = resolveScreenshotSeed();
  const generated = generateScreenshotScene(seed);
  const desktopPayload = createScenePayload(generated.scene, DESKTOP_VIEWPORT);
  const mobilePayload = createScenePayload(generated.scene, MOBILE_VIEWPORT);

  console.log(
    `[capture:release] seed=${seed} family=${generated.family} palette=${generated.paletteName} summary="${generated.summary}"`
  );

  const server = createServer(async (req, res) => {
    try {
      const path = resolveAssetPath(req.url ?? '/');
      if (!path.startsWith(DIST_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      const content = await readFile(path);
      res.writeHead(200, { 'Content-Type': getContentType(path) });
      res.end(content);
    } catch {
      try {
        const fallback = await readFile(join(DIST_DIR, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fallback);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
      }
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, HOST, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Unable to resolve local server port.');
  }

  const baseUrl = `http://${HOST}:${address.port}`;
  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    rm(join(OUTPUT_DIR, 'editor-light.png'), { force: true }),
    rm(join(OUTPUT_DIR, 'editor-mobile-light.png'), { force: true })
  ]);

  const browser = await chromium.launch({ headless: true });

  try {
    await captureScreenshot(browser, baseUrl, desktopPayload, DESKTOP_VIEWPORT, join(OUTPUT_DIR, 'editor-light.png'));
    await captureScreenshot(browser, baseUrl, mobilePayload, MOBILE_VIEWPORT, join(OUTPUT_DIR, 'editor-mobile-light.png'), {
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    });
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
