import { createServer } from 'node:http';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const DIST_DIR = normalize(join(process.cwd(), 'dist', 'tikz-drawer', 'browser'));
const OUTPUT_DIR = normalize(join(process.cwd(), 'screenshots'));
const HOST = '127.0.0.1';

type ExampleScenePayload = {
  readonly scene: {
    readonly name: string;
    readonly bounds: { readonly width: number; readonly height: number };
    readonly shapes: readonly unknown[];
  };
  readonly preferences: {
    readonly theme: 'light';
    readonly snapToGrid: boolean;
    readonly showGrid: boolean;
    readonly showAxes: boolean;
    readonly scale: number;
    readonly snapStep: number;
    readonly defaultStroke: string;
    readonly defaultFill: string;
    readonly defaultStrokeWidth: number;
    readonly defaultArrowScale: number;
  };
  readonly importCode: string;
  readonly viewportCenter: { readonly x: number; readonly y: number };
};

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

function encodeBase64Json(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
}

function createExampleScenePayload(): ExampleScenePayload {
  return {
    scene: {
      name: 'Release snapshot',
      bounds: { width: 960, height: 640 },
      shapes: [
        {
          id: 'client-box',
          name: 'Client',
          kind: 'rectangle',
          stroke: '#1f1f1f',
          strokeOpacity: 1,
          strokeWidth: 0.08,
          x: -7.4,
          y: -1.6,
          width: 4,
          height: 2.2,
          fill: '#edf4ff',
          fillOpacity: 1,
          cornerRadius: 0.14
        },
        {
          id: 'client-label',
          name: 'Client label',
          kind: 'text',
          stroke: 'none',
          strokeOpacity: 1,
          strokeWidth: 0,
          x: -5.4,
          y: -0.4,
          text: 'Client',
          textBox: false,
          boxWidth: 4,
          fontSize: 0.42,
          color: '#161616',
          colorOpacity: 1,
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'center',
          rotation: 0
        },
        {
          id: 'api-box',
          name: 'API',
          kind: 'rectangle',
          stroke: '#1f1f1f',
          strokeOpacity: 1,
          strokeWidth: 0.08,
          x: -1.5,
          y: -1.6,
          width: 4,
          height: 2.2,
          fill: '#ececec',
          fillOpacity: 1,
          cornerRadius: 0.14
        },
        {
          id: 'api-label',
          name: 'API label',
          kind: 'text',
          stroke: 'none',
          strokeOpacity: 1,
          strokeWidth: 0,
          x: 0.5,
          y: -0.4,
          text: 'API',
          textBox: false,
          boxWidth: 4,
          fontSize: 0.42,
          color: '#161616',
          colorOpacity: 1,
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'center',
          rotation: 0
        },
        {
          id: 'db-box',
          name: 'Database',
          kind: 'circle',
          stroke: '#1f1f1f',
          strokeOpacity: 1,
          strokeWidth: 0.08,
          cx: 6.5,
          cy: -0.5,
          r: 1.4,
          fill: '#f5f5f5',
          fillOpacity: 1
        },
        {
          id: 'db-label',
          name: 'Database label',
          kind: 'text',
          stroke: 'none',
          strokeOpacity: 1,
          strokeWidth: 0,
          x: 6.5,
          y: -0.4,
          text: 'Database',
          textBox: false,
          boxWidth: 4,
          fontSize: 0.42,
          color: '#161616',
          colorOpacity: 1,
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'center',
          rotation: 0
        },
        {
          id: 'client-to-api',
          name: 'Client to API',
          kind: 'line',
          stroke: '#1f1f1f',
          strokeOpacity: 1,
          strokeWidth: 0.18,
          from: { x: -3.4, y: -0.5 },
          to: { x: -1.5, y: -0.5 },
          anchors: [],
          lineMode: 'straight',
          arrowStart: false,
          arrowEnd: true,
          arrowType: 'triangle',
          arrowColor: '#1f1f1f',
          arrowOpacity: 1,
          arrowOpen: false,
          arrowRound: false,
          arrowScale: 1.35,
          arrowLengthScale: 1,
          arrowWidthScale: 1,
          arrowBendMode: 'none'
        },
        {
          id: 'api-to-db',
          name: 'API to database',
          kind: 'line',
          stroke: '#1f1f1f',
          strokeOpacity: 1,
          strokeWidth: 0.18,
          from: { x: 2.5, y: -0.5 },
          to: { x: 5.1, y: -0.5 },
          anchors: [],
          lineMode: 'straight',
          arrowStart: false,
          arrowEnd: true,
          arrowType: 'triangle',
          arrowColor: '#1f1f1f',
          arrowOpacity: 1,
          arrowOpen: false,
          arrowRound: false,
          arrowScale: 1.35,
          arrowLengthScale: 1,
          arrowWidthScale: 1,
          arrowBendMode: 'none'
        }
      ]
    },
    preferences: {
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
    },
    importCode: '% release snapshot scene',
    viewportCenter: { x: 0, y: 0 }
  };
}

function createExampleSceneUrl(baseUrl: string): string {
  const payload = createExampleScenePayload();
  const sharePayload = encodeBase64Json(payload);
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
  const exampleSceneUrl = createExampleSceneUrl(baseUrl);
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


