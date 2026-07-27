import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { AppTheme } from '../theme/app-theme.utils';

const MOON_ICON_PATH = 'M14.35 4.85A7.45 7.45 0 1 0 19.15 16 5.5 5.5 0 1 1 14.35 4.85Z';

@Component({
  selector: 'app-theme-toggle-button',
  templateUrl: './theme-toggle-button.component.html',
  styleUrl: './theme-toggle-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeToggleButtonComponent {
  readonly theme = input.required<AppTheme>();
  readonly label = input('Toggle theme');
  readonly themeToggle = output<void>();
  readonly moonIconPath = MOON_ICON_PATH;
}
