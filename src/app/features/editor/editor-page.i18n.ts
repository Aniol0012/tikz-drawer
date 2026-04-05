import en from './i18n/en.json';
import ca from './i18n/ca.json';
import es from './i18n/es.json';
import type { CanvasShape, PersistedEditorState, Point, PresetCategory } from './tikz.models';

export type LanguageCode = 'en' | 'ca' | 'es';
export type TranslationDictionary = Record<string, string>;

export interface SharedScenePayload extends PersistedEditorState {
  readonly viewportCenter: Point;
}

export const translations: Record<LanguageCode, TranslationDictionary> = {
  en,
  ca,
  es
};

export const localizedShapeKinds: Record<LanguageCode, Record<CanvasShape['kind'], string>> = {
  en: { line: 'Line', rectangle: 'Rectangle', circle: 'Circle', ellipse: 'Ellipse', text: 'Text' },
  ca: { line: 'Línia', rectangle: 'Rectangle', circle: 'Cercle', ellipse: 'El·lipse', text: 'Text' },
  es: { line: 'Línea', rectangle: 'Rectángulo', circle: 'Círculo', ellipse: 'Elipse', text: 'Texto' }
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
  if (browserLanguage.startsWith('ca')) return 'ca';
  if (browserLanguage.startsWith('es')) return 'es';
  return 'en';
};
