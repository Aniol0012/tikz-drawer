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
  TextShape,
  TikzScene
} from '../src/app/features/editor/models/tikz.models.ts';
import * as presetsModule from '../src/app/features/editor/presets/presets.ts';
import * as tikzCodegenModule from '../src/app/features/editor/tikz/tikz.codegen.ts';
import * as editorPageUtilsModule from '../src/app/features/editor/utils/editor-page.utils.ts';
import type { TransformCanvasShapeOptions } from '../src/app/features/editor/utils/editor-page.utils.ts';

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

type DiagramShapeRole = 'frame' | 'highlight' | 'supporting' | 'note' | 'default';

type SceneComposer = (rng: SeededRandom, palette: Palette) => GeneratedScreenshotScene;

const DESKTOP_VIEWPORT = { width: 1600, height: 900 } as const;
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

type RuntimePresetExports = {
  readonly defaultPreferences?: EditorPreferences;
  readonly objectPresets?: readonly ObjectPreset[];
  readonly default?: {
    readonly defaultPreferences?: EditorPreferences;
    readonly objectPresets?: readonly ObjectPreset[];
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
  readonly transformCanvasShape?: (shape: CanvasShape, options: TransformCanvasShapeOptions) => CanvasShape;
  readonly default?: {
    readonly encodeSharePayload?: (payload: SharedScenePayload) => Promise<string>;
    readonly transformCanvasShape?: (shape: CanvasShape, options: TransformCanvasShapeOptions) => CanvasShape;
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
    runtimeModule[name] ?? runtimeModule.default?.[name] ?? (runtimeModule.default as Record<string, unknown> | undefined)?.default?.[name] ?? fallback;

  if (resolved === undefined) {
    throw new Error(`release-screenshots: "${name}" was not found in presets module.`);
  }

  return resolved as T;
}

function resolveTikzCodegenExport<T>(name: 'sceneToTikz'): T {
  const runtimeModule = tikzCodegenModule as RuntimeTikzCodegenExports;
  const resolved = runtimeModule[name] ?? runtimeModule.default?.[name] ?? (runtimeModule.default as Record<string, unknown> | undefined)?.default?.[name];

  if (resolved === undefined) {
    throw new Error(`release-screenshots: "${name}" was not found in tikz.codegen module.`);
  }

  return resolved as T;
}

function resolveEditorPageUtilsExport<T>(name: 'encodeSharePayload' | 'transformCanvasShape'): T {
  const runtimeModule = editorPageUtilsModule as RuntimeEditorPageUtilsExports;
  const resolved = runtimeModule[name] ?? runtimeModule.default?.[name] ?? (runtimeModule.default as Record<string, unknown> | undefined)?.default?.[name];

  if (resolved === undefined) {
    throw new Error(`release-screenshots: "${name}" was not found in editor-page.utils module.`);
  }

  return resolved as T;
}

const defaultPreferences = resolvePresetExport<EditorPreferences>('defaultPreferences', FALLBACK_DEFAULT_PREFERENCES);
const objectPresets = resolvePresetExport<readonly ObjectPreset[]>('objectPresets');
const sceneToTikz = resolveTikzCodegenExport<(scene: TikzScene) => string>('sceneToTikz');
const encodeSharePayload = resolveEditorPageUtilsExport<(payload: SharedScenePayload) => Promise<string>>('encodeSharePayload');
const transformCanvasShape = resolveEditorPageUtilsExport<(shape: CanvasShape, options: TransformCanvasShapeOptions) => CanvasShape>('transformCanvasShape');

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
    const item = items[this.int(0, items.length - 1)];
    if (item === undefined) {
      throw new Error('Random pick resolved outside the source array.');
    }
    return item;
  }

  shuffle<T>(items: readonly T[]): readonly T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = this.int(0, index);
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
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

  return (Date.now() ^ globalThis.crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0;
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
          mergeIdMap.set(shape.mergeId, value);
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
  let left = shape.x - width / 2;
  if (shape.textBox || shape.textAlign === 'left') {
    left = shape.x;
  } else if (shape.textAlign === 'right') {
    left = shape.x - width;
  }

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
      return {
        left: shape.cx - shape.r,
        right: shape.cx + shape.r,
        bottom: shape.cy - shape.r,
        top: shape.cy + shape.r
      };
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
    transformCanvasShape(shape, {
      deltaX: targetLeft - bounds.left,
      deltaY: targetBottom - bounds.bottom,
      scaleX: scale,
      scaleY: scale,
      originX: bounds.left,
      originY: bounds.bottom
    })
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

    const fallback = fallbackSequence[fallbackIndex % fallbackSequence.length] ?? '';
    fallbackIndex += 1;
    return { ...shape, text: fallback } satisfies TextShape;
  });
}

function includesAny(value: string, candidates: readonly string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}

function diagramShapeRole(name: string): DiagramShapeRole {
  const normalizedName = name.toLowerCase();

  if (includesAny(normalizedName, ['frame', 'lane', 'browser', 'table', 'kanban', 'swimlane'])) {
    return 'frame';
  }
  if (includesAny(normalizedName, ['header', 'active', 'current', 'primary', 'milestone', 'api', 'service'])) {
    return 'highlight';
  }
  if (includesAny(normalizedName, ['database', 'store', 'cache', 'worker', 'queue', 'bus'])) {
    return 'supporting';
  }
  if (includesAny(normalizedName, ['note', 'callout', 'sticky'])) {
    return 'note';
  }
  return 'default';
}

function rectangleFill(
  shape: RectangleShape,
  role: DiagramShapeRole,
  fills: {
    readonly primary: string;
    readonly secondary: string;
    readonly supporting: string;
    readonly note: string;
    readonly accent: string;
  }
): string {
  if (shape.fill === 'none') {
    return 'none';
  }

  switch (role) {
    case 'frame':
      return fills.primary;
    case 'highlight':
      return fills.accent;
    case 'supporting':
      return fills.supporting;
    case 'note':
      return fills.note;
    case 'default':
      return fills.secondary;
  }
}

function styleShapes(shapes: readonly CanvasShape[], palette: Palette): readonly CanvasShape[] {
  const primaryFill = palette.fills[0] ?? palette.accentSoft;
  const secondaryFill = palette.fills[1] ?? primaryFill;
  const supportingFill = palette.fills[2] ?? secondaryFill;
  const noteFill = palette.fills[3] ?? secondaryFill;
  const fills = {
    primary: primaryFill,
    secondary: secondaryFill,
    supporting: supportingFill,
    note: noteFill,
    accent: palette.accentSoft
  } as const;

  return shapes.map((shape) => {
    const normalizedName = shape.name.toLowerCase();
    const role = diagramShapeRole(normalizedName);

    switch (shape.kind) {
      case 'rectangle': {
        const fill = rectangleFill(shape, role, fills);
        return {
          ...shape,
          stroke: palette.stroke,
          strokeOpacity: 1,
          strokeWidth: Math.max(shape.strokeWidth, 0.08),
          fill,
          fillOpacity: shape.fill === 'none' ? 0 : 1,
          cornerRadius: Math.max(shape.cornerRadius, 0.14)
        } satisfies RectangleShape;
      }
      case 'circle':
        return {
          ...shape,
          stroke: palette.stroke,
          strokeOpacity: 1,
          strokeWidth: Math.max(shape.strokeWidth, 0.08),
          fill: role === 'highlight' ? palette.accentSoft : primaryFill,
          fillOpacity: 1
        } satisfies CircleShape;
      case 'ellipse':
        return {
          ...shape,
          stroke: palette.stroke,
          strokeOpacity: 1,
          strokeWidth: Math.max(shape.strokeWidth, 0.08),
          fill: role === 'supporting' ? supportingFill : primaryFill,
          fillOpacity: 1
        } satisfies EllipseShape;
      case 'line': {
        const stroke = shape.arrowStart || shape.arrowEnd ? palette.accent : palette.stroke;
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
          fontWeight: shape.fontWeight === 'normal' && /title|header|label/.test(normalizedName) ? 'bold' : shape.fontWeight
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
  palette: Palette,
  replacements: Readonly<Record<string, string>> = {},
  fallbackSequence: readonly string[] = []
): readonly CanvasShape[] {
  const cloned = cloneShapes(findObjectPreset(presetId).shapes);
  const withText = replaceTextByName(cloned, replacements, fallbackSequence);
  const fitted = fitShapesIntoBox(withText, box);
  return styleShapes(fitted, palette);
}

function createScene(name: string, shapes: readonly CanvasShape[]): TikzScene {
  return {
    name,
    bounds: { width: 960, height: 640 },
    shapes
  };
}

function architectureScene(_rng: SeededRandom, palette: Palette): GeneratedScreenshotScene {
  const shapes = buildModule('service-architecture', { x: -13.5, y: -5.8, width: 27, height: 11.6 }, palette);

  return {
    family: 'architecture',
    paletteName: palette.name,
    seed: 0,
    summary: 'UI, API, domain services, event bus, stores and worker',
    scene: createScene('Service architecture', shapes)
  };
}

function analyticsScene(_rng: SeededRandom, palette: Palette): GeneratedScreenshotScene {
  const shapes = buildModule('entity-relationship', { x: -13.5, y: -5.8, width: 27, height: 11.6 }, palette);

  return {
    family: 'analytics',
    paletteName: palette.name,
    seed: 0,
    summary: 'Customer, invoice, payment and invoice-line entities with cardinalities',
    scene: createScene('Commerce data model', shapes)
  };
}

function workflowScene(_rng: SeededRandom, palette: Palette): GeneratedScreenshotScene {
  const shapes = buildModule('sequence-diagram', { x: -13.5, y: -5.8, width: 27, height: 11.6 }, palette);

  return {
    family: 'workflow',
    paletteName: palette.name,
    seed: 0,
    summary: 'Client, API and worker request lifecycle',
    scene: createScene('Request lifecycle', shapes)
  };
}

function planningScene(_rng: SeededRandom, palette: Palette): GeneratedScreenshotScene {
  const shapes = buildModule('project-timeline', { x: -13.5, y: -5.8, width: 27, height: 11.6 }, palette);

  return {
    family: 'planning',
    paletteName: palette.name,
    seed: 0,
    summary: 'Planning, prototype, testing and release milestones',
    scene: createScene('Project delivery timeline', shapes)
  };
}

const SCENE_COMPOSERS: readonly SceneComposer[] = [architectureScene, analyticsScene, workflowScene, planningScene];

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

  console.log(`[capture:release] seed=${seed} family=${generated.family} palette=${generated.paletteName} summary="${generated.summary}"`);

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
  await Promise.all([rm(join(OUTPUT_DIR, 'editor-light.png'), { force: true }), rm(join(OUTPUT_DIR, 'editor-mobile-light.png'), { force: true })]);

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

try {
  await run();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
