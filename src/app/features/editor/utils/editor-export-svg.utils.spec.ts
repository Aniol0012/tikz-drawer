import type { CanvasShape, LineShape, Point, TextShape } from '../models/tikz.models';
import { buildCanvasExportDocument, escapeXml, type SvgExportHelpers } from './editor-export-svg.utils';
import type { SelectionBounds } from './editor-page.utils';

const computeBounds = (shapes: readonly CanvasShape[]): SelectionBounds | null => {
  if (!shapes.length) {
    return null;
  }

  return {
    left: 0,
    right: 4,
    bottom: 0,
    top: 2
  };
};

const helpers: SvgExportHelpers = {
  computeBounds,
  buildLinePath: (shape: LineShape, mapPoint: (point: Point) => Point) => {
    const from = mapPoint(shape.from);
    const to = mapPoint(shape.to);
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  },
  displayTextLinesForShape: (shape: TextShape) => shape.text.split('\n'),
  textRenderXAt: (shape, projectX) => projectX(shape.x),
  textAnchor: () => 'middle',
  arrowMarkerId: (shape, side) => `${shape.id}-${side}`,
  arrowMarkerViewBox: () => '0 0 10 10',
  arrowMarkerWidth: () => 10,
  arrowMarkerHeight: () => 10,
  arrowMarkerRefX: () => 8,
  arrowMarkerRefY: () => 3,
  arrowMarkerPath: () => 'M0,0 L0,6 L8,3 z',
  arrowMarkerFill: () => '#111111',
  arrowMarkerStrokeLineJoin: () => 'round',
  arrowMarkerStrokeLineCap: () => 'round'
};

describe('editor-export-svg utils', () => {
  it('builds an empty document when no shapes are present', () => {
    const document = buildCanvasExportDocument({
      selectedShapes: [],
      sceneShapes: [],
      theme: 'light',
      helpers
    });

    expect(document.width).toBe(960);
    expect(document.height).toBe(720);
    expect(document.markup).toContain('<svg');
  });

  it('exports shapes and escapes XML-sensitive content', () => {
    const textShape: Extract<CanvasShape, { kind: 'text' }> = {
      id: 'text-1',
      name: 'Text',
      kind: 'text',
      x: 1,
      y: 1,
      text: '<A&B>',
      textBox: false,
      boxWidth: 2,
      fontSize: 0.4,
      color: '#111111',
      colorOpacity: 1,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'center',
      rotation: 0,
      stroke: 'none',
      strokeOpacity: 1,
      strokeWidth: 0
    };

    const document = buildCanvasExportDocument({
      selectedShapes: [textShape],
      sceneShapes: [textShape],
      theme: 'dark',
      helpers
    });

    expect(document.width).toBeGreaterThan(0);
    expect(document.markup).toContain('&lt;A&amp;B&gt;');
    expect(document.markup).toContain('fill="#161616"');
  });

  it('applies image opacity using strokeOpacity', () => {
    const imageShape: Extract<CanvasShape, { kind: 'image' }> = {
      id: 'img-1',
      name: 'Image',
      kind: 'image',
      x: 0.5,
      y: 0.25,
      width: 2,
      height: 1,
      aspectRatio: 2,
      src: 'data:image/png;base64,abc',
      latexSource: 'images/example.png',
      stroke: '#111111',
      strokeOpacity: 0.35,
      strokeWidth: 0.06
    };

    const document = buildCanvasExportDocument({
      selectedShapes: [imageShape],
      sceneShapes: [imageShape],
      theme: 'light',
      helpers
    });

    expect(document.markup).toContain('<image');
    expect(document.markup).toContain('opacity="0.35"');
  });

  it('escapes XML values safely', () => {
    expect(escapeXml(`5 < 6 & "ok"`)).toBe('5 &lt; 6 &amp; &quot;ok&quot;');
  });
});
