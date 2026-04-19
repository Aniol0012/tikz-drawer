import type { ToolId } from '../components/editor-page/editor-page.types';

export type ModifierKey = 'space' | 'shift' | 'control' | 'meta' | 'alt';

type KeyboardShortcutEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey'>;
type SelectionModifierEvent = Pick<MouseEvent, 'shiftKey' | 'ctrlKey' | 'metaKey'>;

const TOOL_ID_BY_SHORTCUT_KEY: Readonly<Record<PropertyKey, ToolId>> = {
  v: 'select',
  p: 'pencil',
  t: 'label',
  r: 'box',
  c: 'circle',
  l: 'segment',
  a: 'arrow',
  n: 'note',
  e: 'ellipse',
  i: 'image'
};

export const normalizeKeyboardKey = (key: string): string => key.toLowerCase();

export const isSpacebarKey = (key: string): boolean => key === ' ' || normalizeKeyboardKey(key) === 'spacebar';

export const pressedModifierFromKey = (key: string): ModifierKey | null => {
  if (isSpacebarKey(key)) {
    return 'space';
  }

  switch (normalizeKeyboardKey(key)) {
    case 'shift':
      return 'shift';
    case 'control':
      return 'control';
    case 'meta':
      return 'meta';
    case 'alt':
      return 'alt';
    default:
      return null;
  }
};

const isPrimaryModifierPressed = (event: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey'>): boolean =>
  event.ctrlKey || event.metaKey;

export const isSelectionModifierPressed = (event: SelectionModifierEvent): boolean =>
  event.shiftKey || event.ctrlKey || event.metaKey;

export const isSelectAllShortcut = (event: KeyboardShortcutEvent): boolean =>
  isPrimaryModifierPressed(event) && normalizeKeyboardKey(event.key) === 'a';

export const isRedoShortcut = (event: KeyboardShortcutEvent): boolean => {
  const key = normalizeKeyboardKey(event.key);
  return isPrimaryModifierPressed(event) && ((key === 'z' && event.shiftKey) || key === 'y');
};

export const isUndoShortcut = (event: KeyboardShortcutEvent): boolean =>
  isPrimaryModifierPressed(event) && normalizeKeyboardKey(event.key) === 'z' && !event.shiftKey;

export const isCopyShortcut = (event: KeyboardShortcutEvent): boolean =>
  isPrimaryModifierPressed(event) && normalizeKeyboardKey(event.key) === 'c';

export const isCutShortcut = (event: KeyboardShortcutEvent): boolean =>
  isPrimaryModifierPressed(event) && normalizeKeyboardKey(event.key) === 'x';

export const isPasteShortcut = (event: KeyboardShortcutEvent): boolean =>
  isPrimaryModifierPressed(event) && normalizeKeyboardKey(event.key) === 'v';

export const toolIdFromShortcutKey = (key: string): ToolId | null =>
  TOOL_ID_BY_SHORTCUT_KEY[normalizeKeyboardKey(key)] ?? null;

export const isDeleteShortcutKey = (key: string): boolean => {
  const normalized = normalizeKeyboardKey(key);
  return normalized === 'delete' || normalized === 'backspace';
};

export const isEscapeShortcutKey = (key: string): boolean => normalizeKeyboardKey(key) === 'escape';

export const isZoomInShortcutKey = (key: string): boolean => key === '=' || key === '+';

export const isZoomOutShortcutKey = (key: string): boolean => key === '-';
