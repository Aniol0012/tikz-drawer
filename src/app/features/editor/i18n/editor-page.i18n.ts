import en from './en.json';
import ca from './ca.json';
import es from './es.json';
import type { CanvasShape, PersistedEditorState, Point, PresetCategory } from '../models/tikz.models';

export type TranslationDictionary = Record<string, string>;

type LocalizedShapeKindDictionary = Record<CanvasShape['kind'], string>;

interface LanguageDefinition {
  readonly code: string;
  readonly label: string;
  readonly longLabel: string;
  readonly longLabelKey: string;
  readonly flagSrc: string;
  readonly browserPrefixes: readonly string[];
  readonly translations: TranslationDictionary;
  readonly shapeKinds: LocalizedShapeKindDictionary;
}

export const languages = [
  {
    code: 'en',
    label: 'En',
    longLabel: 'English',
    longLabelKey: 'languageName.en',
    flagSrc: 'flags-optimized/GB.webp',
    browserPrefixes: ['en'],
    translations: en,
    shapeKinds: {
      line: 'Line',
      rectangle: 'Rectangle',
      triangle: 'Triangle',
      circle: 'Circle',
      ellipse: 'Ellipse',
      text: 'Text',
      image: 'Image'
    }
  },
  {
    code: 'ca',
    label: 'Ca',
    longLabel: 'Català',
    longLabelKey: 'languageName.ca',
    flagSrc: 'flags-optimized/EU-CA.webp',
    browserPrefixes: ['ca'],
    translations: ca,
    shapeKinds: {
      line: 'Línia',
      rectangle: 'Rectangle',
      triangle: 'Triangle',
      circle: 'Cercle',
      ellipse: 'El·lipse',
      text: 'Text',
      image: 'Imatge'
    }
  },
  {
    code: 'es',
    label: 'Es',
    longLabel: 'Español',
    longLabelKey: 'languageName.es',
    flagSrc: 'flags-optimized/ES.webp',
    browserPrefixes: ['es'],
    translations: es,
    shapeKinds: {
      line: 'Línea',
      rectangle: 'Rectángulo',
      triangle: 'Triángulo',
      circle: 'Círculo',
      ellipse: 'Elipse',
      text: 'Texto',
      image: 'Imagen'
    }
  }
] as const satisfies readonly LanguageDefinition[];

export type LanguageCode = (typeof languages)[number]['code'];
export type Language = LanguageDefinition & { readonly code: LanguageCode };

export const languageCodes = languages.map((language) => language.code) as readonly LanguageCode[];

export interface LanguageOption {
  readonly value: LanguageCode;
  readonly label: string;
  readonly longLabel: string;
  readonly flagSrc: string;
}

export const languageByCode = languages.reduce(
  (accumulator, language) => ({
    ...accumulator,
    [language.code]: language
  }),
  {} as Record<LanguageCode, Language>
);

export const isLanguageCode = (value: unknown): value is LanguageCode => typeof value === 'string' && languageCodes.includes(value as LanguageCode);

export interface SharedScenePayload extends PersistedEditorState {
  readonly viewportCenter: Point;
  readonly latexExportConfig?: {
    readonly colorMode?: 'direct-rgb' | 'define-colors';
    readonly wrapInFigure?: boolean;
    readonly figurePlacement?: string;
    readonly alignment?: 'center' | 'left' | 'right';
    readonly scaleToWidth?: boolean;
    readonly includeFrame?: boolean;
    readonly maxWidthPercent?: number;
    readonly standaloneBorderMm?: number;
    readonly fontSize?: 'tiny' | 'scriptsize' | 'footnotesize' | 'small' | 'normalsize' | 'large';
    readonly includeCaption?: boolean;
    readonly caption?: string;
    readonly includeLabel?: boolean;
    readonly label?: string;
  };
}

export const categoryOrder: readonly PresetCategory[] = ['essentials', 'flow', 'geometry', 'graphs', 'data', 'interface', 'concepts'];

export const categoryTranslationKey: Record<PresetCategory, string> = {
  essentials: 'categoryEssentials',
  flow: 'categoryFlow',
  geometry: 'categoryGeometry',
  graphs: 'categoryGraphs',
  data: 'categoryData',
  interface: 'categoryInterface',
  concepts: 'categoryConcepts'
};

export const fallbackLanguageCode: LanguageCode = 'en';

export const detectLanguage = (): LanguageCode => {
  const browserLanguage: string = globalThis.navigator?.language?.toLowerCase() ?? 'en';
  return languages.find((language) => language.browserPrefixes.some((prefix) => browserLanguage.startsWith(prefix)))?.code ?? fallbackLanguageCode;
};

export const restoreLanguage = (raw: string | null | undefined, detectLanguageFallback: () => LanguageCode = detectLanguage): LanguageCode =>
  isLanguageCode(raw) ? raw : detectLanguageFallback();

export const translate = (language: LanguageCode, key: string): string => languageByCode[language].translations[key] ?? key;

export const translateOrFallback = (language: LanguageCode, key: string, fallback: string): string => languageByCode[language].translations[key] ?? fallback;

export const getLanguageOptions = (language: LanguageCode): readonly LanguageOption[] =>
  languages.map(({ code, label, flagSrc, longLabel, longLabelKey }) => ({
    value: code,
    label,
    flagSrc,
    longLabel: translateOrFallback(language, longLabelKey, longLabel)
  }));

export const localizedShapeKind = (language: LanguageCode, kind: CanvasShape['kind']): string => languageByCode[language].shapeKinds[kind];
