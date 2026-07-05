import {
  TEXT_BOUNDING_LINE_HEIGHT_FACTOR,
  TEXT_MIN_EXPORT_WIDTH_FACTOR,
  TEXT_MIN_HEIGHT_FACTOR,
  TEXT_RENDER_LINE_HEIGHT_FACTOR,
  TEXT_TSPAN_LINE_STEP_FACTOR,
  TEXT_WRAP_CHAR_WIDTH_FACTOR,
  TEXT_WRAP_MIN_CHARACTERS,
  TEXT_WRAP_MIN_CHAR_WIDTH
} from '../constants/editor.constants';
import type { TextShape } from '../models/tikz.models';
import { REGEX } from '../../../shared/regex/regex.utils';

const DISPLAY_TEXT_REPLACEMENTS = [
  [String.raw`\alpha`, 'α'],
  [String.raw`\beta`, 'β'],
  [String.raw`\gamma`, 'γ'],
  [String.raw`\delta`, 'δ'],
  [String.raw`\epsilon`, 'ε'],
  [String.raw`\theta`, 'θ'],
  [String.raw`\lambda`, 'λ'],
  [String.raw`\mu`, 'μ'],
  [String.raw`\pi`, 'π'],
  [String.raw`\sigma`, 'σ'],
  [String.raw`\phi`, 'φ'],
  [String.raw`\omega`, 'ω'],
  [String.raw`\leftarrow`, '←'],
  [String.raw`\rightarrow`, '→'],
  [String.raw`\uparrow`, '↑'],
  [String.raw`\downarrow`, '↓'],
  [String.raw`\leftrightarrow`, '↔'],
  [String.raw`\Rightarrow`, '⇒'],
  [String.raw`\Leftarrow`, '⇐'],
  [String.raw`\Leftrightarrow`, '⇔'],
  [String.raw`\times`, '×'],
  [String.raw`\div`, '÷'],
  [String.raw`\pm`, '±'],
  [String.raw`\infty`, '∞'],
  [String.raw`\sum`, '∑'],
  [String.raw`\prod`, '∏'],
  [String.raw`\int`, '∫'],
  [String.raw`\partial`, '∂'],
  [String.raw`\forall`, '∀'],
  [String.raw`\exists`, '∃'],
  [String.raw`\in`, '∈'],
  [String.raw`\notin`, '∉'],
  [String.raw`\cup`, '∪'],
  [String.raw`\cap`, '∩']
] as const;

export interface TextMetrics {
  readonly lines: readonly string[];
  readonly width: number;
  readonly height: number;
  readonly topOffset: number;
  readonly bottomOffset: number;
}

export const textLines = (value: string): readonly string[] => value.split(REGEX.shared.lineBreak).map((line) => line || ' ');

export const renderDisplayText = (value: string): string =>
  DISPLAY_TEXT_REPLACEMENTS.reduce((current, [source, replacement]) => current.replaceAll(source, replacement), value);

export const displayTextLines = (value: string): readonly string[] => textLines(value).map((line) => renderDisplayText(line));

export const wrapTextLine = (line: string, maxChars: number): readonly string[] => {
  if (line.length <= maxChars) {
    return [line || ' '];
  }

  const words = line.split(REGEX.text.whitespace).filter(Boolean);
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
  Math.max(Math.floor(shape.boxWidth / Math.max(shape.fontSize * TEXT_WRAP_CHAR_WIDTH_FACTOR, TEXT_WRAP_MIN_CHAR_WIDTH)), TEXT_WRAP_MIN_CHARACTERS);

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
    ...lines.map((line) => Math.max(line.length * shape.fontSize * TEXT_WRAP_CHAR_WIDTH_FACTOR * scale, shape.fontSize * minimumWidthFactor * scale))
  );
};

export const estimateTextHeight = (
  shape: TextShape,
  lineCount: number,
  scale = 1,
  lineHeightFactor = TEXT_BOUNDING_LINE_HEIGHT_FACTOR,
  minimumHeight = shape.fontSize * scale * TEXT_MIN_HEIGHT_FACTOR
): number => Math.max(lineCount * shape.fontSize * lineHeightFactor * scale, minimumHeight);

export const estimateTextVerticalBounds = (shape: TextShape, lineCount: number, scale = 1): { readonly topOffset: number; readonly bottomOffset: number } => {
  const fontSize = shape.fontSize * scale;
  const safeLineCount = Math.max(lineCount, 1);
  const ascent = fontSize * 0.58;
  const descent = fontSize * 0.26;
  const lastBaselineOffset = (safeLineCount - 1) * fontSize * TEXT_TSPAN_LINE_STEP_FACTOR;
  return {
    topOffset: ascent,
    bottomOffset: -lastBaselineOffset - descent
  };
};

export const defaultTextHeight = (shape: TextShape, lineCount: number, scale = 1): number =>
  estimateTextHeight(shape, lineCount, scale, TEXT_RENDER_LINE_HEIGHT_FACTOR);

export const measureTextShape = (
  shape: TextShape,
  scale = 1,
  minimumWidthFactor = TEXT_MIN_EXPORT_WIDTH_FACTOR,
  lines: readonly string[] = displayTextLinesForShape(shape)
): TextMetrics => {
  const verticalBounds = estimateTextVerticalBounds(shape, lines.length, scale);
  return {
    lines,
    width: estimateTextWidth(shape, scale, minimumWidthFactor, lines),
    height: verticalBounds.topOffset - verticalBounds.bottomOffset,
    topOffset: verticalBounds.topOffset,
    bottomOffset: verticalBounds.bottomOffset
  };
};
