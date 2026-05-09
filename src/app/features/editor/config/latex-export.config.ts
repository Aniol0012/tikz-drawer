import type { LatexColorMode } from '../tikz/tikz.codegen';

export const LATEX_ALIGNMENTS = ['center', 'left', 'right'] as const;
export type LatexAlignment = (typeof LATEX_ALIGNMENTS)[number];

export const LATEX_FONT_SIZES = ['tiny', 'scriptsize', 'footnotesize', 'small', 'normalsize', 'large'] as const;
export type LatexFontSize = (typeof LATEX_FONT_SIZES)[number];

export const LATEX_COLOR_MODES = ['direct-rgb', 'define-colors'] as const satisfies readonly LatexColorMode[];
export type LatexExportTextKey = 'figurePlacement' | 'caption' | 'label';
export type LatexExportNumberKey = 'maxWidthPercent' | 'standaloneBorderMm';
export type LatexExportBooleanKey = 'wrapInFigure' | 'scaleToWidth' | 'includeFrame' | 'includeCaption' | 'includeLabel';

export interface LatexExportConfig {
  readonly colorMode: LatexColorMode;
  readonly wrapInFigure: boolean;
  readonly figurePlacement: string;
  readonly alignment: LatexAlignment;
  readonly scaleToWidth: boolean;
  readonly includeFrame: boolean;
  readonly maxWidthPercent: number;
  readonly standaloneBorderMm: number;
  readonly fontSize: LatexFontSize;
  readonly includeCaption: boolean;
  readonly caption: string;
  readonly includeLabel: boolean;
  readonly label: string;
}

export const DEFAULT_LATEX_EXPORT_CONFIG = {
  colorMode: 'direct-rgb',
  wrapInFigure: false,
  figurePlacement: 'H',
  alignment: 'center',
  scaleToWidth: true,
  includeFrame: false,
  maxWidthPercent: 100,
  standaloneBorderMm: 6,
  fontSize: 'footnotesize',
  includeCaption: true,
  caption: '',
  includeLabel: true,
  label: ''
} satisfies LatexExportConfig;

export const LATEX_FIGURE_PLACEMENT_OPTIONS = [
  { value: 'H', labelKey: 'latexPlacementH' },
  { value: 'h', labelKey: 'latexPlacementh' },
  { value: 'ht', labelKey: 'latexPlacementht' },
  { value: 'htbp', labelKey: 'latexPlacementhtbp' },
  { value: 'tbp', labelKey: 'latexPlacementtbp' }
] as const;

export const LATEX_ALIGNMENT_OPTIONS = [
  { value: 'left', labelKey: 'alignLeft' },
  { value: 'center', labelKey: 'alignCenter' },
  { value: 'right', labelKey: 'alignRight' }
] as const satisfies readonly { readonly value: LatexAlignment; readonly labelKey: string }[];

export const LATEX_FONT_SIZE_OPTIONS = LATEX_FONT_SIZES;

export const LATEX_COLOR_MODE_OPTIONS = [
  { value: 'direct-rgb', titleKey: 'latexColorDirect', descriptionKey: 'latexColorDirectDescription' },
  { value: 'define-colors', titleKey: 'latexColorDefined', descriptionKey: 'latexColorDefinedDescription' }
] as const satisfies readonly {
  readonly value: LatexColorMode;
  readonly titleKey: string;
  readonly descriptionKey: string;
}[];

export const LATEX_CODE_THEME_PREVIEW_SOURCE = '\\begin{tikzpicture}\n\\draw (0,0) -- (1.6,0.8);\n\\end{tikzpicture}';

export const CODE_HIGHLIGHT_THEMES = ['aurora', 'sunset', 'midnight', 'forest', 'rose', 'graphite'] as const;
export type CodeHighlightTheme = (typeof CODE_HIGHLIGHT_THEMES)[number];

export const CODE_HIGHLIGHT_THEME_OPTIONS = [
  { value: 'aurora', labelKey: 'codeThemeAurora' },
  { value: 'sunset', labelKey: 'codeThemeSunset' },
  { value: 'midnight', labelKey: 'codeThemeMidnight' },
  { value: 'forest', labelKey: 'codeThemeForest' },
  { value: 'rose', labelKey: 'codeThemeRose' },
  { value: 'graphite', labelKey: 'codeThemeGraphite' }
] as const;
