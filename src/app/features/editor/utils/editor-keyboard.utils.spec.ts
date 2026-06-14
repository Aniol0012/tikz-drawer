import {
  arrowNavigationDeltaFromKeys,
  arrowNavigationDeltaFromKey,
  arrowNavigationKeyFromKey,
  isCopyShortcut,
  isCutShortcut,
  isDeleteShortcutKey,
  isEscapeShortcutKey,
  isFindShortcut,
  isOpenImportShortcut,
  isOpenSettingsShortcut,
  isPasteShortcut,
  isRedoShortcut,
  isSelectionModifierPressed,
  isSelectAllShortcut,
  isSpacebarKey,
  isUndoShortcut,
  isZoomInShortcutKey,
  isZoomOutShortcutKey,
  keyboardShortcutLabel,
  normalizeKeyboardShortcut,
  normalizedKeyboardShortcuts,
  pressedModifierFromKey,
  shortcutFromKeyboardEvent,
  toolIdFromShortcutEvent,
  toolIdFromShortcutKey
} from './editor-keyboard.utils';

type ShortcutEventLike = {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
};

type SelectionModifierEventLike = Pick<ShortcutEventLike, 'ctrlKey' | 'metaKey' | 'shiftKey'>;

const shortcutEvent = (patch: Partial<ShortcutEventLike>): ShortcutEventLike => ({
  key: '',
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
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

  it('detects find shortcut with ctrl/cmd', () => {
    expect(isFindShortcut(shortcutEvent({ key: 'f', ctrlKey: true }))).toBe(true);
    expect(isFindShortcut(shortcutEvent({ key: 'F', metaKey: true }))).toBe(true);
    expect(isFindShortcut(shortcutEvent({ key: 'f', ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(isFindShortcut(shortcutEvent({ key: 'f' }))).toBe(false);
  });

  it('normalizes and applies custom shortcuts', () => {
    const shortcuts = { figureSearch: normalizeKeyboardShortcut('Ctrl + K'), arrowTool: 'Shift+A' };

    expect(shortcuts.figureSearch).toBe('Mod+K');
    expect(isFindShortcut(shortcutEvent({ key: 'k', ctrlKey: true }), shortcuts)).toBe(true);
    expect(toolIdFromShortcutEvent(shortcutEvent({ key: 'A', shiftKey: true }), shortcuts)).toBe('arrow');
    expect(keyboardShortcutLabel('Mod+K')).toBe('Ctrl + K');
    expect(keyboardShortcutLabel('Mod+K', true)).toBe('⌘ K');
  });

  it('keeps explicitly unassigned shortcuts empty', () => {
    const shortcuts = normalizedKeyboardShortcuts({ figureSearch: '', selectTool: 'v' });

    expect(shortcuts.figureSearch).toBe('');
    expect(shortcuts.selectTool).toBe('V');
    expect(isFindShortcut(shortcutEvent({ key: 'f', ctrlKey: true }), shortcuts)).toBe(false);
  });

  it('opens settings with configured shortcut and the alternate settings chord', () => {
    expect(isOpenSettingsShortcut(shortcutEvent({ key: ',', ctrlKey: true }))).toBe(true);
    expect(isOpenSettingsShortcut(shortcutEvent({ key: 's', metaKey: true, altKey: true }))).toBe(true);
    expect(isOpenSettingsShortcut(shortcutEvent({ key: 's', metaKey: true }))).toBe(false);
  });

  it('opens import with the configured ctrl/cmd shortcut', () => {
    expect(isOpenImportShortcut(shortcutEvent({ key: 'i', ctrlKey: true }))).toBe(true);
    expect(isOpenImportShortcut(shortcutEvent({ key: 'i', metaKey: true }))).toBe(true);
    expect(isOpenImportShortcut(shortcutEvent({ key: 'k', ctrlKey: true }), { openImport: 'Mod+K' })).toBe(true);
    expect(isOpenImportShortcut(shortcutEvent({ key: 'i' }))).toBe(false);
  });

  it('captures shortcuts from keyboard events while waiting for a non-modifier key', () => {
    expect(shortcutFromKeyboardEvent(shortcutEvent({ key: 'Control', ctrlKey: true }), 'Mod+F')).toEqual({
      shortcut: 'Mod',
      complete: false
    });
    expect(shortcutFromKeyboardEvent(shortcutEvent({ key: 's', ctrlKey: true, altKey: true }), 'Mod+F')).toEqual({
      shortcut: 'Mod+Alt+S',
      complete: true
    });
    expect(shortcutFromKeyboardEvent(shortcutEvent({ key: ',', metaKey: true }), 'Mod+F')).toEqual({
      shortcut: 'Mod+,',
      complete: true
    });
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

  it('maps arrow navigation keys to world deltas', () => {
    expect(arrowNavigationKeyFromKey('ArrowLeft')).toBe('arrowleft');
    expect(arrowNavigationKeyFromKey('a')).toBeNull();
    expect(arrowNavigationDeltaFromKey('ArrowLeft', 0.25)).toEqual({ x: -0.25, y: 0 });
    expect(arrowNavigationDeltaFromKey('ArrowRight', 0.25)).toEqual({ x: 0.25, y: 0 });
    expect(arrowNavigationDeltaFromKey('ArrowUp', 0.25)).toEqual({ x: 0, y: 0.25 });
    expect(arrowNavigationDeltaFromKey('ArrowDown', 0.25)).toEqual({ x: 0, y: -0.25 });
    expect(arrowNavigationDeltaFromKey('a', 0.25)).toBeNull();
  });

  it('combines arrow navigation keys for diagonal movement', () => {
    const diagonal = arrowNavigationDeltaFromKeys(['arrowright', 'arrowup'], 1);
    expect(diagonal?.x).toBeCloseTo(Math.SQRT1_2);
    expect(diagonal?.y).toBeCloseTo(Math.SQRT1_2);
    expect(arrowNavigationDeltaFromKeys(['arrowleft', 'arrowright'], 1)).toBeNull();
  });

  it('detects selection modifiers consistently', () => {
    expect(isSelectionModifierPressed(selectionModifierEvent({ shiftKey: true }))).toBe(true);
    expect(isSelectionModifierPressed(selectionModifierEvent({ ctrlKey: true }))).toBe(true);
    expect(isSelectionModifierPressed(selectionModifierEvent({ metaKey: true }))).toBe(true);
    expect(isSelectionModifierPressed(selectionModifierEvent({}))).toBe(false);
  });
});
