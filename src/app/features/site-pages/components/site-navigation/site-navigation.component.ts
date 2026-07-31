import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlobalThemeService } from '../../../../shared/theme/global-theme.service';
import { ThemeToggleButtonComponent } from '../../../../shared/theme-toggle-button/theme-toggle-button.component';
import { LanguageSelectorComponent } from '../../../../shared/language-selector/language-selector.component';
import { iconPaths } from '../../../editor/config/editor-icons';
import { EditorTranslatePipe } from '../../../editor/i18n/editor-translate.pipe';
import type { SitePageKey } from '../../site-page-content';

@Component({
  selector: 'app-site-navigation',
  imports: [EditorTranslatePipe, LanguageSelectorComponent, RouterLink, ThemeToggleButtonComponent],
  templateUrl: './site-navigation.component.html',
  styleUrl: './site-navigation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteNavigationComponent {
  private readonly globalTheme = inject(GlobalThemeService);

  readonly activePage = input.required<SitePageKey>();
  readonly theme = this.globalTheme.theme;
  readonly chevronIconPath = iconPaths.chevronDown;

  toggleTheme(): void {
    this.globalTheme.toggle();
  }
}
