import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlobalThemeService } from '../../../../shared/theme/global-theme.service';
import { ThemeToggleButtonComponent } from '../../../../shared/theme-toggle-button/theme-toggle-button.component';
import type { SitePageKey } from '../../site-page-content';

@Component({
  selector: 'app-site-navigation',
  imports: [RouterLink, ThemeToggleButtonComponent],
  templateUrl: './site-navigation.component.html',
  styleUrl: './site-navigation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteNavigationComponent {
  private readonly globalTheme = inject(GlobalThemeService);

  readonly activePage = input.required<SitePageKey>();
  readonly theme = this.globalTheme.theme;

  toggleTheme(): void {
    this.globalTheme.toggle();
  }
}
