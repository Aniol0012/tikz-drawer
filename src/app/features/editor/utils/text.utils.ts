import {
  TEXT_BOUNDING_LINE_HEIGHT_FACTOR,
  TEXT_MIN_EXPORT_WIDTH_FACTOR,
  TEXT_MIN_HEIGHT_FACTOR,
  TEXT_RENDER_LINE_HEIGHT_FACTOR,
  TEXT_WRAP_CHAR_WIDTH_FACTOR,
  TEXT_WRAP_MIN_CHARACTERS,
  TEXT_WRAP_MIN_CHAR_WIDTH
} from '../constants/editor.constants';
import type { TextShape } from '../models/tikz.models';

const DISPLAY_TEXT_REPLACEMENTS = [
  ['\\alpha', 'α'],
  ['\\beta', 'β'],
  ['\\gamma', 'γ'],
  ['\\delta', 'δ'],
  ['\\epsilon', 'ε'],
  ['\\theta', 'θ'],
  ['\\lambda', 'λ'],
  ['\\mu', 'μ'],
  ['\\pi', 'π'],
  ['\\sigma', 'σ'],
  ['\\phi', 'φ'],
  ['\\omega', 'ω'],
  ['\\leftarrow', '←'],
  ['\\rightarrow', '→'],
  ['\\uparrow', '↑'],
  ['\\downarrow', '↓'],
  ['\\leftrightarrow', '↔'],
  ['\\Rightarrow', '⇒'],
  ['\\Leftarrow', '⇐'],
  ['\\Leftrightarrow', '⇔'],
  ['\\times', '×'],
  ['\\div', '÷'],
  ['\\pm', '±'],
  ['\\infty', '∞'],
  ['\\sum', '∑'],
  ['\\prod', '∏'],
  ['\\int', '∫'],
  ['\\partial', '∂'],
  ['\\forall', '∀'],
  ['\\exists', '∃'],
  ['\\in', '∈'],
  ['\\notin', '∉'],
  ['\\cup', '∪'],
  ['\\cap', '∩']
] as const;

export const textLines = (value: string): readonly string[] => value.split('\n').map((line) => line || ' ');

export const renderDisplayText = (value: string): string =>
  DISPLAY_TEXT_REPLACEMENTS.reduce((current, [source, replacement]) => current.replaceAll(source, replacement), value);

export const displayTextLines = (value: string): readonly string[] =>
  textLines(value).map((line) => renderDisplayText(line));

export const wrapTextLine = (line: string, maxChars: number): readonly string[] => {
  if (line.length <= maxChars) {
    return [line || ' '];
  }

  const words = line.split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [line.slice(0, maxChars), ...wrapTextLine(line.slice(maxChars), maxChars)];
  }

  const rows: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
    } else {
      rows.push(current);
      current = word;
    }
  }

  if (current) {
    rows.push(current);
  }

  return rows;
};

export const textBoxMaxCharacters = (shape: TextShape): number =>
  Math.max(
    Math.floor(shape.boxWidth / Math.max(shape.fontSize * TEXT_WRAP_CHAR_WIDTH_FACTOR, TEXT_WRAP_MIN_CHAR_WIDTH)),
    TEXT_WRAP_MIN_CHARACTERS
  );

export const displayTextLinesForShape = (shape: TextShape): readonly string[] => {
  const sourceLines = displayTextLines(shape.text);
  if (!shape.textBox) {
    return sourceLines;
  }

  return sourceLines.flatMap((line) => wrapTextLine(line, textBoxMaxCharacters(shape)));
};

export const textLeftForWidth = (shape: TextShape, anchorX: number, width: number): number => {
  if (shape.textBox || shape.textAlign === 'left') {
    return anchorX;
  }

  if (shape.textAlign === 'right') {
    return anchorX - width;
  }

  return anchorX - width / 2;
};

export const estimateTextWidth = (
  shape: TextShape,
  scale = 1,
  minimumWidthFactor = TEXT_MIN_EXPORT_WIDTH_FACTOR,
  lines: readonly string[] = displayTextLinesForShape(shape)
): number => {
  if (shape.textBox) {
    return Math.max(shape.boxWidth * scale, shape.fontSize * scale);
  }

  return Math.max(
    ...lines.map((line) =>
      Math.max(
        line.length * shape.fontSize * TEXT_WRAP_CHAR_WIDTH_FACTOR * scale,
        shape.fontSize * minimumWidthFactor * scale
      )
    )
  );
};

export const estimateTextHeight = (
  shape: TextShape,
  lineCount: number,
  scale = 1,
  lineHeightFactor = TEXT_BOUNDING_LINE_HEIGHT_FACTOR,
  minimumHeight = shape.fontSize * scale * TEXT_MIN_HEIGHT_FACTOR
): number => Math.max(lineCount * shape.fontSize * lineHeightFactor * scale, minimumHeight);

export const defaultTextHeight = (shape: TextShape, lineCount: number, scale = 1): number =>
  estimateTextHeight(shape, lineCount, scale, TEXT_RENDER_LINE_HEIGHT_FACTOR);
