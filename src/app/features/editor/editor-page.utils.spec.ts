import type { SharedScenePayload } from './editor-page.i18n';
import {
  decodeSharePayload,
  encodeSharePayload,
  formatValue,
  highlightLatex,
  resizeGroupedShapes,
  transformCanvasShape,
  translateShapeBy
} from './editor-page.utils';
import { sceneToTikz } from './tikz.codegen';
import type { CanvasShape, EditorPreferences, LineShape } from './tikz.models';
import { afterEach, vi } from 'vitest';

const preferences: EditorPreferences = {
  theme: 'light',
  snapToGrid: true,
  showGrid: true,
  showAxes: true,
  scale: 100,
  snapStep: 0.25,
  defaultStroke: '#111111',
  defaultFill: '#f5f5f5',
  defaultStrokeWidth: 0.28,
  defaultArrowScale: 1.35
};

const lineShape: LineShape = {
  id: 'line-1',
  name: 'Line',
  kind: 'line',
  stroke: '#111111',
  strokeOpacity: 1,
  strokeWidth: 0.28,
  from: { x: 0, y: 0 },
  to: { x: 2, y: 1 },
  anchors: [{ x: 1, y: 0.5 }],
  lineMode: 'straight',
  arrowStart: false,
  arrowEnd: true,
  arrowType: 'latex',
  arrowColor: '#111111',
  arrowOpacity: 1,
  arrowOpen: false,
  arrowRound: false,
  arrowScale: 1.35,
  arrowLengthScale: 1,
  arrowWidthScale: 1,
  arrowBendMode: 'none'
};

const groupedShapes: readonly CanvasShape[] = [
  {
    id: 'rect-1',
    name: 'Left box',
    kind: 'rectangle',
    stroke: '#111111',
    strokeOpacity: 1,
    strokeWidth: 0.28,
    mergeId: 'group-1',
    x: 0,
    y: 0,
    width: 2,
    height: 2,
    fill: '#f5f5f5',
    fillOpacity: 1,
    cornerRadius: 0
  },
  {
    id: 'rect-2',
    name: 'Right box',
    kind: 'rectangle',
    stroke: '#111111',
    strokeOpacity: 1,
    strokeWidth: 0.28,
    mergeId: 'group-1',
    x: 3,
    y: 1,
    width: 2,
    height: 3,
    fill: '#f5f5f5',
    fillOpacity: 1,
    cornerRadius: 0
  }
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('editor-page utils', () => {
  it('translates line points and anchors consistently', () => {
    const translated = translateShapeBy(lineShape, 3, -2);

    expect(translated.kind).toBe('line');
    if (translated.kind !== 'line') {
      throw new Error('Expected a line shape');
    }

    expect(translated.from).toEqual({ x: 3, y: -2 });
    expect(translated.to).toEqual({ x: 5, y: -1 });
    expect(translated.anchors).toEqual([{ x: 4, y: -1.5 }]);
  });

  it('transforms shapes while preserving the requested id', () => {
    const transformed = transformCanvasShape(groupedShapes[0], 1, -1, 2, 2, 0, 0, 'scaled-1');

    expect(transformed.kind).toBe('rectangle');
    if (transformed.kind !== 'rectangle') {
      throw new Error('Expected a rectangle shape');
    }

    expect(transformed.id).toBe('scaled-1');
    expect(transformed.x).toBeCloseTo(1);
    expect(transformed.y).toBeCloseTo(-1);
    expect(transformed.width).toBeCloseTo(4);
    expect(transformed.height).toBeCloseTo(4);
  });

  it('resizes grouped selections proportionally', () => {
    const resizedShapes = resizeGroupedShapes(groupedShapes, { left: 0, right: 5, bottom: 0, top: 4 }, 'se', {
      x: 10,
      y: -4
    });

    expect(resizedShapes).toHaveLength(2);

    const [firstShape, secondShape] = resizedShapes;
    expect(firstShape.kind).toBe('rectangle');
    expect(secondShape.kind).toBe('rectangle');

    if (firstShape.kind !== 'rectangle' || secondShape.kind !== 'rectangle') {
      throw new Error('Expected grouped rectangles to remain rectangles after resize');
    }

    expect(firstShape.x).toBeCloseTo(0);
    expect(firstShape.y).toBeCloseTo(-4);
    expect(firstShape.width).toBeCloseTo(4);
    expect(firstShape.height).toBeCloseTo(4);

    expect(secondShape.x).toBeCloseTo(6);
    expect(secondShape.y).toBeCloseTo(-2);
    expect(secondShape.width).toBeCloseTo(4);
    expect(secondShape.height).toBeCloseTo(6);
  });

  it('formats numbers and highlights latex safely', () => {
    expect(formatValue(3)).toBe('3');
    expect(formatValue(3.456)).toBe('3.46');

    const highlighted = highlightLatex('\\draw[red] (1, 2); % <note>');
    expect(highlighted).toContain('<span class="tok-command">\\draw</span>');
    expect(highlighted).toContain('<span class="tok-number">1</span>');
    expect(highlighted).toContain('<span class="tok-comment">% &lt;note&gt;</span>');
  });

  it('encodes and decodes shared payloads through the base64 fallback', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    vi.stubGlobal('DecompressionStream', undefined);

    const payload: SharedScenePayload = {
      scene: {
        name: 'Shared',
        bounds: { width: 960, height: 640 },
        shapes: [
          lineShape,
          {
            id: 'img-1',
            name: 'Image',
            kind: 'image',
            stroke: '#111111',
            strokeOpacity: 1,
            strokeWidth: 0.1,
            x: 1,
            y: 1,
            width: 2,
            height: 1,
            aspectRatio: 2,
            src: 'data:image/png;base64,abc',
            latexSource: 'example-image'
          }
        ]
      },
      preferences,
      importCode: '',
      viewportCenter: { x: 0, y: 0 }
    };

    const encoded = await encodeSharePayload(payload);
    const decoded = await decodeSharePayload(encoded);

    expect(encoded.startsWith('b:')).toBe(true);
    expect(decoded).not.toBeNull();
    expect(decoded?.scene.shapes).toHaveLength(1);
    expect(decoded?.scene.shapes[0]?.kind).toBe('line');
    expect(decoded?.importCode).toBe(sceneToTikz(decoded!.scene));
  });
});
