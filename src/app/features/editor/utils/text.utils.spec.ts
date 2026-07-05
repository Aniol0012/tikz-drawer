import type { TextShape } from '../models/tikz.models';
import { displayTextLinesForShape, textBoxMaxCharacters, wrapTextLine } from './text.utils';

const textShape = {
  id: 'text-1',
  name: 'Text',
  kind: 'text',
  stroke: 'none',
  strokeOpacity: 1,
  strokeWidth: 0,
  x: 0,
  y: 0,
  text: 'sadasdasdsadasdasd',
  textBox: true,
  boxWidth: 1.5,
  fontSize: 0.4,
  color: '#111111',
  colorOpacity: 1,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'left',
  rotation: 0
} satisfies TextShape;

describe('text utils', () => {
  it('hard-wraps long words so textbox text stays inside its width', () => {
    const maxChars = textBoxMaxCharacters(textShape);
    const lines = displayTextLinesForShape(textShape);

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.length <= maxChars)).toBe(true);
    expect(lines.join('')).toBe(textShape.text);
  });

  it('keeps wrapping ordinary phrases by words when possible', () => {
    expect(wrapTextLine('Alpha Beta longer line', 6)).toEqual(['Alpha', 'Beta', 'longer', 'line']);
  });
});
