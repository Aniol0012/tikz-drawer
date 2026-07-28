const EDITOR_STATE_STORAGE_KEY = 'tikz-drawer.state';
export const APP_THEME_VALUES = ['light', 'dark'] as const;
export type AppTheme = (typeof APP_THEME_VALUES)[number];

interface StoredThemeState {
  readonly preferences?: {
    readonly theme?: unknown;
  };
}

export const isAppTheme = (value: unknown): value is AppTheme => typeof value === 'string' && APP_THEME_VALUES.includes(value as AppTheme);

const readStoredTheme = (): AppTheme | null => {
  try {
    const rawState = globalThis.localStorage?.getItem(EDITOR_STATE_STORAGE_KEY);
    if (!rawState) {
      return null;
    }

    const state = JSON.parse(rawState) as StoredThemeState;
    const theme = state.preferences?.theme;
    return isAppTheme(theme) ? theme : null;
  } catch {
    return null;
  }
};

export const persistAppTheme = (theme: AppTheme): void => {
  try {
    const rawState = globalThis.localStorage?.getItem(EDITOR_STATE_STORAGE_KEY);
    const state = rawState ? (JSON.parse(rawState) as StoredThemeState & Record<string, unknown>) : {};
    globalThis.localStorage?.setItem(
      EDITOR_STATE_STORAGE_KEY,
      JSON.stringify({
        ...state,
        preferences: {
          ...(state.preferences ?? {}),
          theme
        }
      })
    );
  } catch {
    // Storage is optional; the in-memory theme still applies.
  }
};

export const resolveAppTheme = (document: Document): AppTheme => {
  const activeTheme = document.querySelector<HTMLElement>('[data-theme="light"], [data-theme="dark"]')?.dataset['theme'];
  if (isAppTheme(activeTheme)) {
    return activeTheme;
  }

  return readStoredTheme() ?? (globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
};
