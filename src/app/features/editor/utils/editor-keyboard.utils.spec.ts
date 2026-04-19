import {
  isCopyShortcut,
  isCutShortcut,
  isDeleteShortcutKey,
  isEscapeShortcutKey,
  isPasteShortcut,
  isRedoShortcut,
  isSelectionModifierPressed,
  isSelectAllShortcut,
  isSpacebarKey,
  isUndoShortcut,
  isZoomInShortcutKey,
  isZoomOutShortcutKey,
  pressedModifierFromKey,
  toolIdFromShortcutKey
} from './editor-keyboard.utils';

type ShortcutEventLike = {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
};

type SelectionModifierEventLike = Pick<ShortcutEventLike, 'ctrlKey' | 'metaKey' | 'shiftKey'>;

const shortcutEvent = (patch: Partial<ShortcutEventLike>): ShortcutEventLike => ({
  key: '',
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...patch
});

const selectionModifierEvent = (patch: Partial<SelectionModifierEventLike>): SelectionModifierEventLike => ({
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...patch
});

describe('editor-keyboard utils', () => {
  it('detects pressed modifier keys', () => {
    expect(pressedModifierFromKey(' ')).toBe('space');
    expect(pressedModifierFromKey('Shift')).toBe('shift');
    expect(pressedModifierFromKey('Control')).toBe('control');
    expect(pressedModifierFromKey('Meta')).toBe('meta');
    expect(pressedModifierFromKey('Alt')).toBe('alt');
    expect(pressedModifierFromKey('x')).toBeNull();
  });

  it('detects select all and clipboard shortcuts with ctrl/cmd', () => {
    expect(isSelectAllShortcut(shortcutEvent({ key: 'a', ctrlKey: true }))).toBe(true);
    expect(isCopyShortcut(shortcutEvent({ key: 'c', metaKey: true }))).toBe(true);
    expect(isCutShortcut(shortcutEvent({ key: 'x', ctrlKey: true }))).toBe(true);
    expect(isPasteShortcut(shortcutEvent({ key: 'v', metaKey: true }))).toBe(true);
  });

  it('detects undo and redo shortcuts', () => {
    expect(isUndoShortcut(shortcutEvent({ key: 'z', ctrlKey: true }))).toBe(true);
    expect(isUndoShortcut(shortcutEvent({ key: 'z', ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(isRedoShortcut(shortcutEvent({ key: 'z', ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(isRedoShortcut(shortcutEvent({ key: 'y', metaKey: true }))).toBe(true);
  });

  it('maps tool shortcuts consistently', () => {
    expect(toolIdFromShortcutKey('v')).toBe('select');
    expect(toolIdFromShortcutKey('P')).toBe('pencil');
    expect(toolIdFromShortcutKey('i')).toBe('image');
    expect(toolIdFromShortcutKey('q')).toBeNull();
  });

  it('detects utility shortcut keys', () => {
    expect(isDeleteShortcutKey('Delete')).toBe(true);
    expect(isDeleteShortcutKey('Backspace')).toBe(true);
    expect(isEscapeShortcutKey('Escape')).toBe(true);
    expect(isZoomInShortcutKey('=')).toBe(true);
    expect(isZoomInShortcutKey('+')).toBe(true);
    expect(isZoomOutShortcutKey('-')).toBe(true);
    expect(isSpacebarKey(' ')).toBe(true);
    expect(isSpacebarKey('x')).toBe(false);
  });

  it('detects selection modifiers consistently', () => {
    expect(isSelectionModifierPressed(selectionModifierEvent({ shiftKey: true }))).toBe(true);
    expect(isSelectionModifierPressed(selectionModifierEvent({ ctrlKey: true }))).toBe(true);
    expect(isSelectionModifierPressed(selectionModifierEvent({ metaKey: true }))).toBe(true);
    expect(isSelectionModifierPressed(selectionModifierEvent({}))).toBe(false);
  });
});
