import { sceneToStandaloneDocument, sceneToTikzBundle } from './tikz.codegen';
import { parseTikz } from './tikz.parser';
import type { ImageShape, LineShape, RectangleShape, TextShape, TikzScene, TriangleShape } from '../models/tikz.models';

const baseLine: LineShape = {
  id: 'line-1',
  name: 'Arrow line',
  kind: 'line',
  stroke: '#112233',
  strokeOpacity: 0.9,
  strokeWidth: 0.2,
  from: { x: 0, y: 0 },
  to: { x: 3, y: 1 },
  anchors: [],
  lineMode: 'straight',
  arrowStart: false,
  arrowEnd: true,
  arrowType: 'triangle',
  arrowColor: '#112233',
  arrowOpacity: 0.8,
  arrowOpen: false,
  arrowRound: false,
  arrowScale: 1.5,
  arrowLengthScale: 1.5,
  arrowWidthScale: 0.75,
  arrowBendMode: 'bend'
};

const textWithInlineMath: TextShape = {
  id: 'text-1',
  name: 'Equation text',
  kind: 'text',
  stroke: '#000000',
  strokeOpacity: 1,
  strokeWidth: 0,
  x: 1,
  y: 2,
  text: String.raw`Hola\times i \int\gamma\delta\exists`,
  textBox: false,
  boxWidth: 4,
  fontSize: 1,
  color: '#161616',
  colorOpacity: 1,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'center',
  rotation: 0
};

const rectangleWithInnerText: RectangleShape = {
  id: 'rect-1',
  name: 'Container',
  kind: 'rectangle',
  stroke: '#1f1f1f',
  strokeOpacity: 1,
  strokeWidth: 0.08,
  x: -14.857,
  y: 4.007,
  width: 19.698,
  height: 5.094,
  fill: '#f1f1f1',
  fillOpacity: 1,
  cornerRadius: 0.297
};

const translucentImage: ImageShape = {
  id: 'image-1',
  name: 'Illustration',
  kind: 'image',
  x: 1,
  y: 2,
  width: 3,
  height: 1.5,
  aspectRatio: 2,
  src: 'data:image/png;base64,abc',
  latexSource: 'images/example.png',
  stroke: '#1f1f1f',
  strokeOpacity: 0.4,
  strokeWidth: 0.05
};

const balancedTriangle: TriangleShape = {
  id: 'triangle-1',
  name: 'Triangle',
  kind: 'triangle',
  stroke: '#1f1f1f',
  strokeOpacity: 1,
  strokeWidth: 0.08,
  x: -2.6,
  y: -1.6,
  width: 5.2,
  height: 3.8,
  fill: '#f1f1f1',
  fillOpacity: 1,
  cornerRadius: 0.32,
  apexOffset: 0.5,
  rotation: 0
};

describe('sceneToTikzBundle', () => {
  it('exports arrow metadata including custom tip length and width', () => {
    const scene: TikzScene = {
      name: 'Arrow scene',
      bounds: { width: 960, height: 640 },
      shapes: [baseLine]
    };

    const bundle = sceneToTikzBundle(scene);

    expect(bundle.imports).toContain(String.raw`\usetikzlibrary{arrows.meta}`);
    expect(bundle.imports).toContain(String.raw`\usetikzlibrary{bending}`);
    expect(bundle.code).toContain('-{Triangle[');
    expect(bundle.code).toContain('color={rgb,255:red,17;green,34;blue,51}');
    expect(bundle.code).toContain('scale=1.5');
    expect(bundle.code).toContain('length=12pt');
    expect(bundle.code).toContain('width=4.5pt');
    expect(bundle.code).toContain('bend');
    expect(bundle.code).not.toContain('Triangle[draw=');
  });

  it('defines colors once when using define-colors mode', () => {
    const scene: TikzScene = {
      name: 'Color scene',
      bounds: { width: 960, height: 640 },
      shapes: [baseLine]
    };

    const document = sceneToStandaloneDocument(scene, { colorMode: 'define-colors' });
    const colorDefinitionPattern = /\\definecolor\{tikzdrawercolor1\}\{HTML\}\{112233\}/g;
    let colorDefinitionCount = 0;
    while (colorDefinitionPattern.exec(document)) {
      colorDefinitionCount += 1;
    }

    expect(document).toContain(String.raw`\definecolor{tikzdrawercolor1}{HTML}{112233}`);
    expect(document).toContain('draw=tikzdrawercolor1');
    expect(colorDefinitionCount).toBe(1);
  });

  it('wraps inline math commands inside text nodes so exported LaTeX stays valid', () => {
    const scene: TikzScene = {
      name: 'Text scene',
      bounds: { width: 960, height: 640 },
      shapes: [textWithInlineMath]
    };

    const bundle = sceneToTikzBundle(scene);

    expect(bundle.code).toContain(String.raw`Hola\ensuremath{\times}`);
    expect(bundle.code).toContain(
      String.raw`\ensuremath{\int}\ensuremath{\gamma}\ensuremath{\delta}\ensuremath{\exists}`
    );
  });

  it('exports rectangle coordinates using the bottom edge as the stored y origin', () => {
    const scene: TikzScene = {
      name: 'Rectangle scene',
      bounds: { width: 960, height: 640 },
      shapes: [rectangleWithInnerText, textWithInlineMath]
    };

    const bundle = sceneToTikzBundle(scene);

    expect(bundle.code).toContain('(-14.857, 9.101) rectangle (4.841, 4.007);');
    expect(bundle.code).toContain(String.raw`\node[`);
    expect(bundle.code).toContain('at (1, 2)');
  });

  it('round-trips rectangle and text positions without vertical drift', () => {
    const scene: TikzScene = {
      name: 'Roundtrip scene',
      bounds: { width: 960, height: 640 },
      shapes: [rectangleWithInnerText, { ...textWithInlineMath, x: -4.536, y: 7.404, text: 'Text' }]
    };

    const exported = sceneToTikzBundle(scene).code;
    const parsed = parseTikz(exported);
    const rectangle = parsed.scene.shapes.find((shape) => shape.kind === 'rectangle');
    const text = parsed.scene.shapes.find((shape) => shape.kind === 'text');

    expect(parsed.warnings).toHaveLength(0);
    expect(rectangle?.kind).toBe('rectangle');
    expect(text?.kind).toBe('text');

    if (rectangle?.kind !== 'rectangle' || text?.kind !== 'text') {
      throw new Error('Expected a rectangle and a text shape after roundtrip');
    }

    expect(rectangle.x).toBeCloseTo(-14.857);
    expect(rectangle.y).toBeCloseTo(4.007);
    expect(rectangle.width).toBeCloseTo(19.698);
    expect(rectangle.height).toBeCloseTo(5.094);
    expect(text.x).toBeCloseTo(-4.536);
    expect(text.y).toBeCloseTo(7.404);
    expect(text.text).toBe('Text');
  });

  it('exports image opacity when strokeOpacity is below 1', () => {
    const scene: TikzScene = {
      name: 'Image scene',
      bounds: { width: 960, height: 640 },
      shapes: [translucentImage]
    };

    const bundle = sceneToTikzBundle(scene);

    expect(bundle.code).toContain(String.raw`\node[inner sep=0pt, opacity=0.4]`);
    expect(bundle.code).toContain(String.raw`\includegraphics[width=3cm,height=1.5cm]{images/example.png}`);
  });

  it('exports and re-imports triangle shapes as independent figures', () => {
    const scene: TikzScene = {
      name: 'Triangle scene',
      bounds: { width: 960, height: 640 },
      shapes: [balancedTriangle]
    };

    const bundle = sceneToTikzBundle(scene);
    const parsed = parseTikz(bundle.code);
    const triangle = parsed.scene.shapes.find((shape) => shape.kind === 'triangle');

    expect(bundle.code).toContain('rounded corners=0.32cm');
    expect(bundle.code).toContain('-- cycle;');
    expect(triangle?.kind).toBe('triangle');

    if (triangle?.kind !== 'triangle') {
      throw new Error('Expected a triangle shape after roundtrip');
    }

    expect(triangle.x).toBeCloseTo(balancedTriangle.x);
    expect(triangle.y).toBeCloseTo(balancedTriangle.y);
    expect(triangle.width).toBeCloseTo(balancedTriangle.width);
    expect(triangle.height).toBeCloseTo(balancedTriangle.height);
    expect(triangle.cornerRadius).toBeCloseTo(balancedTriangle.cornerRadius);
    expect(triangle.apexOffset).toBeCloseTo(balancedTriangle.apexOffset);
  });
});
