import type { ThemeMode } from '../editor/models/tikz.models';
import { isAppTheme } from '../editor/state/app-theme.service';

const EDITOR_STATE_STORAGE_KEY = 'tikz-drawer.state';

interface StoredThemeState {
  readonly preferences?: {
    readonly theme?: unknown;
  };
}

const storedTheme = (): ThemeMode | null => {
  try {
    const rawState = globalThis.localStorage?.getItem(EDITOR_STATE_STORAGE_KEY);
    if (!rawState) {
      return null;
    }

    const state = JSON.parse(rawState) as StoredThemeState;
    const theme = state.preferences?.theme;
    return typeof theme === 'string' && isAppTheme(theme) ? theme : null;
  } catch {
    return null;
  }
};

export const resolveNotFoundTheme = (document: Document): ThemeMode => {
  const activeTheme = document.querySelector<HTMLElement>('[data-theme="light"], [data-theme="dark"]')?.dataset['theme'];
  if (activeTheme && isAppTheme(activeTheme)) {
    return activeTheme;
  }

  return storedTheme() ?? (globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
};
