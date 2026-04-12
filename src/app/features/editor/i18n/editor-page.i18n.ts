import en from './en.json';
import ca from './ca.json';
import es from './es.json';
import type { CanvasShape, PersistedEditorState, Point, PresetCategory } from '../models/tikz.models';

export type LanguageCode = 'en' | 'ca' | 'es';
export type TranslationDictionary = Record<string, string>;

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

export const translations: Record<LanguageCode, TranslationDictionary> = {
  en,
  ca,
  es
};

export const localizedShapeKinds: Record<LanguageCode, Record<CanvasShape['kind'], string>> = {
  en: { line: 'Line', rectangle: 'Rectangle', circle: 'Circle', ellipse: 'Ellipse', text: 'Text', image: 'Image' },
  ca: { line: 'Línia', rectangle: 'Rectangle', circle: 'Cercle', ellipse: 'El·lipse', text: 'Text', image: 'Imatge' },
  es: { line: 'Línea', rectangle: 'Rectángulo', circle: 'Círculo', ellipse: 'Elipse', text: 'Texto', image: 'Imagen' }
};

export const categoryOrder: readonly PresetCategory[] = [
  'essentials',
  'flow',
  'geometry',
  'data',
  'interface',
  'concepts'
];

export const categoryTranslationKey: Record<PresetCategory, string> = {
  essentials: 'categoryEssentials',
  flow: 'categoryFlow',
  geometry: 'categoryGeometry',
  data: 'categoryData',
  interface: 'categoryInterface',
  concepts: 'categoryConcepts'
};

export const detectLanguage = (): LanguageCode => {
  const browserLanguage = globalThis.navigator?.language?.toLowerCase() ?? 'en';
  if (browserLanguage.startsWith('ca')) {
    return 'ca';
  }
  if (browserLanguage.startsWith('es')) {
    return 'es';
  }
  return 'en';
};
