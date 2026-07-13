import { describe, expect, it } from 'vitest';
import { copyNameBase, reserveNextNumberedCopyName } from './editor-shape-name.utils';

describe('editor shape naming utilities', () => {
  it('normalizes numbered and legacy copy suffixes', () => {
    expect(copyNameBase('Rectangle (2)')).toBe('Rectangle');
    expect(copyNameBase('Rectangle copy copy')).toBe('Rectangle');
    expect(copyNameBase('Rectangle copy (3)')).toBe('Rectangle');
  });

  it('reserves the next available numbered copy name', () => {
    const unavailableNames = new Set(['Rectangle', 'Rectangle (1)', 'Rectangle (2)']);

    expect(reserveNextNumberedCopyName('Rectangle copy', unavailableNames)).toBe('Rectangle (3)');
    expect(reserveNextNumberedCopyName('Rectangle copy', unavailableNames)).toBe('Rectangle (4)');
  });
});
