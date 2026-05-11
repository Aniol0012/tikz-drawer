import { Injectable } from '@angular/core';
import { LATEX_CODE_THEME_PREVIEW_SOURCE, type CodeHighlightTheme } from '../config/latex-export.config';
import { highlightLatex } from '../utils/editor-page.utils';

interface CodeHighlightThemePalette {
  readonly command: string;
  readonly option: string;
  readonly punctuation: string;
  readonly number: string;
  readonly color: string;
  readonly comment: string;
}

const CODE_HIGHLIGHT_THEME_PALETTES = {
  aurora: {
    command: '#5c7cfa',
    option: '#2f9e44',
    punctuation: '#6b7280',
    number: '#d97706',
    color: '#d6336c',
    comment: '#94a3b8'
  },
  sunset: {
    command: '#c2410c',
    option: '#0f766e',
    punctuation: '#7c6f64',
    number: '#b45309',
    color: '#be185d',
    comment: '#a8a29e'
  },
  midnight: {
    command: '#7dd3fc',
    option: '#86efac',
    punctuation: '#94a3b8',
    number: '#fbbf24',
    color: '#f9a8d4',
    comment: '#64748b'
  },
  forest: {
    command: '#2f855a',
    option: '#4c9a2a',
    punctuation: '#5f6b66',
    number: '#c05621',
    color: '#2b8a78',
    comment: '#7a8b85'
  },
  rose: {
    command: '#c2255c',
    option: '#2b8a3e',
    punctuation: '#8a7d85',
    number: '#d9480f',
    color: '#a61e4d',
    comment: '#9c8f97'
  },
  graphite: {
    command: '#4c6ef5',
    option: '#2b8a3e',
    punctuation: '#868e96',
    number: '#e67700',
    color: '#c2255c',
    comment: '#adb5bd'
  }
} satisfies Record<CodeHighlightTheme, CodeHighlightThemePalette>;

@Injectable({ providedIn: 'root' })
export class CodeHighlightThemeService {
  readonly previewSource = LATEX_CODE_THEME_PREVIEW_SOURCE;
  readonly highlightedPreviewSource = this.highlight(this.previewSource);

  highlight(source: string): string {
    return highlightLatex(source);
  }

  cssVariableStyle(theme: CodeHighlightTheme | string): string {
    const palette = this.palette(theme);
    return [
      `--code-command: ${palette.command}`,
      `--code-option: ${palette.option}`,
      `--code-punctuation: ${palette.punctuation}`,
      `--code-number: ${palette.number}`,
      `--code-color: ${palette.color}`,
      `--code-comment: ${palette.comment}`
    ].join('; ');
  }

  private palette(theme: CodeHighlightTheme | string): CodeHighlightThemePalette {
    return CODE_HIGHLIGHT_THEME_PALETTES[theme as CodeHighlightTheme] ?? CODE_HIGHLIGHT_THEME_PALETTES.aurora;
  }
}
