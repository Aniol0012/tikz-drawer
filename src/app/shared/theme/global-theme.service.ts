import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';
import { isAppTheme, persistAppTheme, resolveAppTheme, type AppTheme } from './app-theme.utils';

@Injectable({ providedIn: 'root' })
export class GlobalThemeService {
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<AppTheme>(resolveAppTheme(this.document));

  constructor() {
    effect(() => {
      this.document.documentElement.dataset['theme'] = this.theme();
    });
  }

  set(theme: string): void {
    if (!isAppTheme(theme)) {
      return;
    }

    this.theme.set(theme);
    persistAppTheme(theme);
  }

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }
}
