import { Injectable } from '@angular/core';
import type { AppSelectOption } from '../../../shared/app-select/app-select.component';
import type { ThemeMode } from '../models/tikz.models';

export const APP_THEMES = ['light', 'dark'] as const satisfies readonly ThemeMode[];

export const isAppTheme = (value: string): value is ThemeMode => APP_THEMES.includes(value as ThemeMode);

export const normalizeAppTheme = (value: string | null | undefined, fallback: ThemeMode = 'light'): ThemeMode =>
  value && isAppTheme(value) ? value : fallback;

@Injectable({ providedIn: 'root' })
export class AppThemeService {
  readonly themes = APP_THEMES;

  options(translate: (key: string) => string): readonly AppSelectOption[] {
    return this.themes.map((theme) => ({
      value: theme,
      label: translate(theme)
    }));
  }

  normalize(value: string | null | undefined, fallback: ThemeMode = 'light'): ThemeMode {
    return normalizeAppTheme(value, fallback);
  }

  nextTheme(theme: ThemeMode): ThemeMode {
    return theme === 'dark' ? 'light' : 'dark';
  }
}
