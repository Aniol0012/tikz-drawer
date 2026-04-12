import { createServer } from 'node:http';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';
import { defaultPreferences, scenePresets } from '../src/app/features/editor/presets/presets';
import { sceneToTikz } from '../src/app/features/editor/tikz/tikz.codegen';
import { encodeSharePayload } from '../src/app/features/editor/utils/editor-page.utils';

const DIST_DIR = normalize(join(process.cwd(), 'dist', 'tikz-drawer', 'browser'));
const OUTPUT_DIR = normalize(join(process.cwd(), 'screenshots'));
const HOST = '127.0.0.1';
const RELEASE_SCENE_PRESET_ID = 'metrics-board';

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

function getContentType(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function resolveAssetPath(urlPath: string): string {
  const cleanPath = urlPath.split('?')[0].split('#')[0];
  const requestPath = cleanPath === '/' ? '/index.html' : cleanPath;
  return normalize(join(DIST_DIR, requestPath));
}

async function createExampleSceneUrl(baseUrl: string): Promise<string> {
  const preset = scenePresets.find((entry) => entry.id === RELEASE_SCENE_PRESET_ID) ?? scenePresets[1] ?? scenePresets[0];
  const payload = {
    scene: preset.scene,
    preferences: defaultPreferences,
    importCode: sceneToTikz(preset.scene),
    viewportCenter: { x: 0, y: 0 }
  };

  const sharePayload = await encodeSharePayload(payload);
  const url = new URL(baseUrl);
  url.searchParams.set('share', sharePayload);
  return url.toString();
}

async function run(): Promise<void> {
  if (!existsSync(join(DIST_DIR, 'index.html'))) {
    throw new Error(`Build output not found at ${DIST_DIR}. Run \"pnpm build\" first.`);
  }

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
  const exampleSceneUrl = await createExampleSceneUrl(baseUrl);
  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    rm(join(OUTPUT_DIR, 'editor-dark.png'), { force: true }),
    rm(join(OUTPUT_DIR, 'editor-mobile-dark.png'), { force: true })
  ]);
  const browser = await chromium.launch({ headless: true });

  try {
    const lightContext = await browser.newContext({ colorScheme: 'light', viewport: { width: 1600, height: 900 } });
    const lightPage = await lightContext.newPage();
    await lightPage.goto(exampleSceneUrl, { waitUntil: 'networkidle' });
    await lightPage.screenshot({ path: join(OUTPUT_DIR, 'editor-light.png'), fullPage: true });
    await lightContext.close();

    const mobileContext = await browser.newContext({
      colorScheme: 'light',
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(exampleSceneUrl, { waitUntil: 'networkidle' });
    await mobilePage.screenshot({ path: join(OUTPUT_DIR, 'editor-mobile-light.png'), fullPage: true });
    await mobileContext.close();
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


