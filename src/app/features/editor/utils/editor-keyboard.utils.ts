export type ModifierKey = 'space' | 'shift' | 'control' | 'meta' | 'alt';
export type ArrowNavigationDelta = { readonly x: number; readonly y: number };
export type KeyboardShortcutAction =
  | 'selectAll'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'undo'
  | 'redo'
  | 'figureSearch'
  | 'openSettings'
  | 'delete'
  | 'zoomIn'
  | 'zoomOut'
  | 'selectTool'
  | 'pencilTool'
  | 'labelTool'
  | 'boxTool'
  | 'circleTool'
  | 'segmentTool'
  | 'arrowTool'
  | 'noteTool'
  | 'ellipseTool'
  | 'imageTool';
export type KeyboardShortcutConfig = Readonly<Record<KeyboardShortcutAction, string>>;
export type KeyboardShortcutCapture = {
  readonly shortcut: string;
  readonly complete: boolean;
};

type KeyboardShortcutEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey'> & Partial<Pick<KeyboardEvent, 'altKey'>>;
type SelectionModifierEvent = Pick<MouseEvent, 'shiftKey' | 'ctrlKey' | 'metaKey'>;

const TOOL_ID_BY_SHORTCUT_ACTION = {
  selectTool: 'select',
  pencilTool: 'pencil',
  labelTool: 'label',
  boxTool: 'box',
  circleTool: 'circle',
  segmentTool: 'segment',
  arrowTool: 'arrow',
  noteTool: 'note',
  ellipseTool: 'ellipse',
  imageTool: 'image'
} as const satisfies Partial<Record<KeyboardShortcutAction, string>>;

const TOOL_ACTIONS = Object.keys(TOOL_ID_BY_SHORTCUT_ACTION) as readonly (keyof typeof TOOL_ID_BY_SHORTCUT_ACTION)[];

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcutConfig = {
  selectAll: 'Mod+A',
  copy: 'Mod+C',
  cut: 'Mod+X',
  paste: 'Mod+V',
  undo: 'Mod+Z',
  redo: 'Mod+Y',
  figureSearch: 'Mod+F',
  openSettings: 'Mod+,',
  delete: 'Delete',
  zoomIn: '+',
  zoomOut: '-',
  selectTool: 'V',
  pencilTool: 'P',
  labelTool: 'T',
  boxTool: 'R',
  circleTool: 'C',
  segmentTool: 'L',
  arrowTool: 'A',
  noteTool: 'N',
  ellipseTool: 'E',
  imageTool: 'I'
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

const isPrimaryModifierPressed = (event: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey'>): boolean => event.ctrlKey || event.metaKey;

const shortcutConfigWithDefaults = (shortcuts: Partial<KeyboardShortcutConfig> | null | undefined): KeyboardShortcutConfig => ({
  ...DEFAULT_KEYBOARD_SHORTCUTS,
  ...(shortcuts ?? {})
});

const normalizedShortcutParts = (shortcut: string): readonly string[] => {
  const trimmedShortcut = shortcut.trim();
  if (trimmedShortcut === '+' || trimmedShortcut === '=') {
    return [trimmedShortcut];
  }

  return trimmedShortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
};

export const normalizeKeyboardShortcut = (shortcut: string, fallback = ''): string => {
  const trimmedShortcut = shortcut.trim();
  if (trimmedShortcut === '+' || trimmedShortcut === '=') {
    return trimmedShortcut;
  }

  const parts = shortcut
    .replace(/⌘|command|cmd/gi, 'Mod')
    .replace(/control|ctrl/gi, 'Mod')
    .replace(/option/gi, 'Alt')
    .replace(/\s*\+\s*/g, '+')
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return fallback;
  }

  const modifiers = new Set<string>();
  let key = '';
  for (const part of parts) {
    const normalizedPart = normalizeKeyboardKey(part);
    if (normalizedPart === 'mod' || normalizedPart === 'meta') {
      modifiers.add('Mod');
    } else if (normalizedPart === 'shift') {
      modifiers.add('Shift');
    } else if (normalizedPart === 'alt') {
      modifiers.add('Alt');
    } else {
      key =
        normalizedPart === 'delete' || normalizedPart === 'backspace' || normalizedPart === 'enter'
          ? normalizedPart[0].toUpperCase() + normalizedPart.slice(1)
          : part.length === 1 && /[a-z]/i.test(part)
            ? part.toUpperCase()
            : part;
    }
  }

  if (!key) {
    return fallback;
  }

  return [...modifiers, key].join('+');
};

export const keyboardShortcutLabel = (shortcut: string, macPlatform = false): string =>
  normalizedShortcutParts(shortcut)
    .map((part) => {
      const normalizedPart = normalizeKeyboardKey(part);
      if (normalizedPart === 'mod') {
        return macPlatform ? '⌘' : 'Ctrl';
      }
      if (normalizedPart === 'shift') {
        return macPlatform ? '⇧' : 'Shift';
      }
      if (normalizedPart === 'alt') {
        return macPlatform ? '⌥' : 'Alt';
      }
      return part;
    })
    .join(macPlatform ? ' ' : ' + ');

export const keyboardShortcutForAction = (shortcuts: Partial<KeyboardShortcutConfig> | null | undefined, action: KeyboardShortcutAction): string =>
  shortcutConfigWithDefaults(shortcuts)[action];

export const normalizedKeyboardShortcuts = (
  shortcuts: Partial<KeyboardShortcutConfig> | null | undefined = DEFAULT_KEYBOARD_SHORTCUTS
): KeyboardShortcutConfig => {
  const withDefaults = shortcutConfigWithDefaults(shortcuts);
  return Object.fromEntries(
    (Object.keys(DEFAULT_KEYBOARD_SHORTCUTS) as KeyboardShortcutAction[]).map((action) => {
      const shortcut = withDefaults[action];
      return [action, typeof shortcut === 'string' && shortcut.trim() === '' ? '' : normalizeKeyboardShortcut(shortcut, DEFAULT_KEYBOARD_SHORTCUTS[action])];
    })
  ) as KeyboardShortcutConfig;
};

export const isKeyboardShortcut = (event: KeyboardShortcutEvent, shortcut: string): boolean => {
  const normalizedShortcut = normalizeKeyboardShortcut(shortcut);
  if (!normalizedShortcut) {
    return false;
  }

  const parts = new Set(normalizedShortcutParts(normalizedShortcut).map((part) => normalizeKeyboardKey(part)));
  const key = [...parts].find((part) => part !== 'mod' && part !== 'shift' && part !== 'alt');
  const eventKey = normalizeKeyboardKey(event.key);
  if (!key || (eventKey !== key && !(key === '+' && event.key === '=') && !(key === 'space' && event.key === ' '))) {
    return false;
  }

  const shiftMatches = parts.has('shift') ? event.shiftKey : !event.shiftKey || (key === '+' && event.key === '+');
  return parts.has('mod') === isPrimaryModifierPressed(event) && shiftMatches && parts.has('alt') === !!event.altKey;
};

export const isSelectionModifierPressed = (event: SelectionModifierEvent): boolean => event.shiftKey || event.ctrlKey || event.metaKey;

export const isSelectAllShortcut = (event: KeyboardShortcutEvent, shortcuts?: Partial<KeyboardShortcutConfig> | null | undefined): boolean =>
  isKeyboardShortcut(event, keyboardShortcutForAction(shortcuts, 'selectAll'));

export const isRedoShortcut = (event: KeyboardShortcutEvent, shortcuts?: Partial<KeyboardShortcutConfig> | null | undefined): boolean =>
  isKeyboardShortcut(event, keyboardShortcutForAction(shortcuts, 'redo')) || (!shortcuts && isKeyboardShortcut(event, 'Mod+Shift+Z'));

export const isUndoShortcut = (event: KeyboardShortcutEvent, shortcuts?: Partial<KeyboardShortcutConfig> | null | undefined): boolean =>
  isKeyboardShortcut(event, keyboardShortcutForAction(shortcuts, 'undo'));

export const isCopyShortcut = (event: KeyboardShortcutEvent, shortcuts?: Partial<KeyboardShortcutConfig> | null | undefined): boolean =>
  isKeyboardShortcut(event, keyboardShortcutForAction(shortcuts, 'copy'));

export const isCutShortcut = (event: KeyboardShortcutEvent, shortcuts?: Partial<KeyboardShortcutConfig> | null | undefined): boolean =>
  isKeyboardShortcut(event, keyboardShortcutForAction(shortcuts, 'cut'));

export const isPasteShortcut = (event: KeyboardShortcutEvent, shortcuts?: Partial<KeyboardShortcutConfig> | null | undefined): boolean =>
  isKeyboardShortcut(event, keyboardShortcutForAction(shortcuts, 'paste'));

export const isFigureSearchShortcut = (event: KeyboardShortcutEvent, shortcuts?: Partial<KeyboardShortcutConfig> | null | undefined): boolean =>
  isFindShortcut(event, shortcuts);

export const isFindShortcut = (event: KeyboardShortcutEvent, shortcuts?: Partial<KeyboardShortcutConfig> | null | undefined): boolean =>
  isKeyboardShortcut(event, keyboardShortcutForAction(shortcuts, 'figureSearch'));

export const isOpenSettingsShortcut = (event: KeyboardShortcutEvent, shortcuts?: Partial<KeyboardShortcutConfig> | null | undefined): boolean =>
  isKeyboardShortcut(event, keyboardShortcutForAction(shortcuts, 'openSettings')) || isKeyboardShortcut(event, 'Mod+Alt+S');

export const toolIdFromShortcutEvent = (event: KeyboardShortcutEvent, shortcuts?: Partial<KeyboardShortcutConfig> | null | undefined): string | null => {
  for (const action of TOOL_ACTIONS) {
    if (isKeyboardShortcut(event, keyboardShortcutForAction(shortcuts, action))) {
      return TOOL_ID_BY_SHORTCUT_ACTION[action];
    }
  }
  return null;
};

export const toolIdFromShortcutKey = (key: string): string | null => toolIdFromShortcutEvent({ key, ctrlKey: false, metaKey: false, shiftKey: false });

export const isDeleteShortcut = (event: KeyboardShortcutEvent, shortcuts?: Partial<KeyboardShortcutConfig> | null | undefined): boolean =>
  isKeyboardShortcut(event, keyboardShortcutForAction(shortcuts, 'delete')) ||
  (keyboardShortcutForAction(shortcuts, 'delete') === DEFAULT_KEYBOARD_SHORTCUTS.delete && normalizeKeyboardKey(event.key) === 'backspace');

export const isDeleteShortcutKey = (key: string): boolean => {
  const normalized = normalizeKeyboardKey(key);
  return normalized === 'delete' || normalized === 'backspace';
};

export const isEscapeShortcutKey = (key: string): boolean => normalizeKeyboardKey(key) === 'escape';

export const arrowNavigationKeyFromKey = (key: string): string | null => {
  const normalized = normalizeKeyboardKey(key);
  return arrowNavigationDeltaFromKey(normalized, 1) ? normalized : null;
};

export const arrowNavigationDeltaFromKey = (key: string, step: number): ArrowNavigationDelta | null => {
  switch (normalizeKeyboardKey(key)) {
    case 'arrowleft':
      return { x: -step, y: 0 };
    case 'arrowright':
      return { x: step, y: 0 };
    case 'arrowup':
      return { x: 0, y: step };
    case 'arrowdown':
      return { x: 0, y: -step };
    default:
      return null;
  }
};

export const arrowNavigationDeltaFromKeys = (keys: Iterable<string>, step: number): ArrowNavigationDelta | null => {
  let x = 0;
  let y = 0;

  for (const key of keys) {
    const delta = arrowNavigationDeltaFromKey(key, 1);
    if (delta) {
      x += delta.x;
      y += delta.y;
    }
  }

  const length = Math.hypot(x, y);
  if (length === 0) {
    return null;
  }

  return {
    x: (x / length) * step,
    y: (y / length) * step
  };
};

export const isZoomInShortcut = (event: KeyboardShortcutEvent, shortcuts?: Partial<KeyboardShortcutConfig> | null | undefined): boolean =>
  isKeyboardShortcut(event, keyboardShortcutForAction(shortcuts, 'zoomIn'));

export const isZoomInShortcutKey = (key: string): boolean => isZoomInShortcut({ key, ctrlKey: false, metaKey: false, shiftKey: false });

export const isZoomOutShortcut = (event: KeyboardShortcutEvent, shortcuts?: Partial<KeyboardShortcutConfig> | null | undefined): boolean =>
  isKeyboardShortcut(event, keyboardShortcutForAction(shortcuts, 'zoomOut'));

export const isZoomOutShortcutKey = (key: string): boolean => isZoomOutShortcut({ key, ctrlKey: false, metaKey: false, shiftKey: false });

export const shortcutFromKeyboardEvent = (event: KeyboardShortcutEvent, fallback = ''): KeyboardShortcutCapture => {
  const key = normalizeKeyboardKey(event.key);
  if (key === 'escape') {
    return { shortcut: fallback, complete: false };
  }

  const modifiers: string[] = [];
  if (isPrimaryModifierPressed(event)) {
    modifiers.push('Mod');
  }
  if (event.altKey) {
    modifiers.push('Alt');
  }
  if (event.shiftKey && key !== 'shift') {
    modifiers.push('Shift');
  }

  if (key === 'control' || key === 'meta' || key === 'alt' || key === 'shift') {
    return { shortcut: modifiers.join('+') || fallback, complete: false };
  }

  const printableKey =
    key === ' '
      ? 'Space'
      : key === 'delete' || key === 'backspace' || key === 'enter'
        ? key[0].toUpperCase() + key.slice(1)
        : event.key.length === 1 && /[a-z]/i.test(event.key)
          ? event.key.toUpperCase()
          : event.key;
  return {
    shortcut: normalizeKeyboardShortcut([...modifiers, printableKey].join('+'), fallback),
    complete: true
  };
};
