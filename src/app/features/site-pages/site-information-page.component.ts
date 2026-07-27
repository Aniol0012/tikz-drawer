import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DiagramArtworkComponent } from '../../shared/diagram-artwork/diagram-artwork.component';
import { GlobalThemeService } from '../../shared/theme/global-theme.service';
import { SiteNavigationComponent } from './components/site-navigation/site-navigation.component';
import { SiteVisualCardComponent } from './components/site-visual-card/site-visual-card.component';
import { resolveSitePage } from './site-page-content';

@Component({
  selector: 'app-site-information-page',
  imports: [RouterLink, DiagramArtworkComponent, SiteNavigationComponent, SiteVisualCardComponent],
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
}
