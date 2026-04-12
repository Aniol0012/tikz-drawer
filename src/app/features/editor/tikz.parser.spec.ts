import { parseTikz } from './tikz.parser';

describe('parseTikz', () => {
  it('parses arrow metadata including length and width scales', () => {
    const result = parseTikz(
      '\\begin{tikzpicture}\n\\draw[-{Triangle[draw=#334455, fill=#334455, scale=1.5, length=12pt, width=4.5pt, bend]}] (0, 0) -- (2, 1);\n\\end{tikzpicture}'
    );

    expect(result.warnings).toHaveLength(0);
    expect(result.scene.shapes).toHaveLength(1);

    const shape = result.scene.shapes[0];
    expect(shape.kind).toBe('line');

    if (shape.kind !== 'line') {
      throw new Error('Expected a line shape');
    }

    expect(shape.arrowEnd).toBe(true);
    expect(shape.arrowStart).toBe(false);
    expect(shape.arrowType).toBe('triangle');
    expect(shape.arrowColor).toBe('#334455');
    expect(shape.arrowScale).toBe(1.5);
    expect(shape.arrowLengthScale).toBe(1.5);
    expect(shape.arrowWidthScale).toBe(0.75);
    expect(shape.arrowBendMode).toBe('bend');
  });

  it('reports unsupported lines as warnings', () => {
    const result = parseTikz('\\begin{tikzpicture}\n\\foo{bar}\n\\end{tikzpicture}');

    expect(result.scene.shapes).toHaveLength(0);
    expect(result.warnings).toEqual(['Unsupported line skipped: \\foo{bar}']);
  });

  it('stores rectangle y as the lower edge when importing TikZ rectangles', () => {
    const result = parseTikz(
      '\\begin{tikzpicture}\n\\draw[fill=#f1f1f1] (-14.857, 9.101) rectangle (4.841, 4.007);\n\\node[anchor=center] at (-4.536, 7.404) {Text};\n\\end{tikzpicture}'
    );

    expect(result.warnings).toHaveLength(0);
    expect(result.scene.shapes).toHaveLength(2);

    const rectangle = result.scene.shapes[0];
    expect(rectangle.kind).toBe('rectangle');

    if (rectangle.kind !== 'rectangle') {
      throw new Error('Expected a rectangle shape');
    }

    expect(rectangle.x).toBeCloseTo(-14.857);
    expect(rectangle.y).toBeCloseTo(4.007);
    expect(rectangle.width).toBeCloseTo(19.698);
    expect(rectangle.height).toBeCloseTo(5.094);
  });
});
