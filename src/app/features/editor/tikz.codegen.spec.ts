import { sceneToStandaloneDocument, sceneToTikzBundle } from './tikz.codegen';
import type { LineShape, TextShape, TikzScene } from './tikz.models';

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
  text: 'Hola\\times i \\int\\gamma\\delta\\exists',
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

describe('sceneToTikzBundle', () => {
  it('exports arrow metadata including custom tip length and width', () => {
    const scene: TikzScene = {
      name: 'Arrow scene',
      bounds: { width: 960, height: 640 },
      shapes: [baseLine]
    };

    const bundle = sceneToTikzBundle(scene);

    expect(bundle.imports).toContain('\\usetikzlibrary{arrows.meta}');
    expect(bundle.imports).toContain('\\usetikzlibrary{bending}');
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

    expect(document).toContain('\\definecolor{tikzdrawercolor1}{HTML}{112233}');
    expect(document).toContain('draw=tikzdrawercolor1');
    expect(document.match(/\\definecolor\{tikzdrawercolor1\}\{HTML\}\{112233\}/g)).toHaveLength(1);
  });

  it('wraps inline math commands inside text nodes so exported LaTeX stays valid', () => {
    const scene: TikzScene = {
      name: 'Text scene',
      bounds: { width: 960, height: 640 },
      shapes: [textWithInlineMath]
    };

    const bundle = sceneToTikzBundle(scene);

    expect(bundle.code).toContain('Hola\\ensuremath{\\times}');
    expect(bundle.code).toContain(
      '\\ensuremath{\\int}\\ensuremath{\\gamma}\\ensuremath{\\delta}\\ensuremath{\\exists}'
    );
  });
});
