import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionLinkComponent } from '../../shared/action-link/action-link.component';
import { DiagramArtworkComponent } from '../../shared/diagram-artwork/diagram-artwork.component';
import { GlobalThemeService } from '../../shared/theme/global-theme.service';
import { iconPaths } from '../editor/config/editor-icons';
import { SiteCodePreviewComponent } from './components/site-code-preview/site-code-preview.component';
import { SiteNavigationComponent } from './components/site-navigation/site-navigation.component';
import { SiteVisualCardComponent } from './components/site-visual-card/site-visual-card.component';
import { resolveSitePage } from './site-page-content';

@Component({
  selector: 'app-site-information-page',
  imports: [ActionLinkComponent, DiagramArtworkComponent, SiteCodePreviewComponent, SiteNavigationComponent, SiteVisualCardComponent],
  templateUrl: './site-information-page.component.html',
  styleUrl: './site-information-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-theme]': 'theme()'
  }
})
export class SiteInformationPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly globalTheme = inject(GlobalThemeService);

  readonly theme = this.globalTheme.theme;
  readonly page = resolveSitePage(this.route.snapshot.data['page']);
  readonly editorIconPath = iconPaths.pencil;
  readonly guideIconPath = iconPaths.note;
  readonly examplesIconPath = iconPaths.library;
  readonly githubIconPath = iconPaths.github;
  readonly externalIconPath = iconPaths.open;
  readonly latexIconPath = iconPaths.latex;
  readonly linkIconPath = iconPaths.link;
  readonly secondaryActionIconPath = this.page.secondaryRoute === '/guide' ? this.guideIconPath : this.examplesIconPath;
}
