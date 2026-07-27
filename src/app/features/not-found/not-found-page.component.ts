import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DiagramArtworkComponent } from '../../shared/diagram-artwork/diagram-artwork.component';
import { GlobalThemeService } from '../../shared/theme/global-theme.service';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, DiagramArtworkComponent],
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-theme]': 'theme()'
  }
})
export class NotFoundPageComponent {
  private readonly router = inject(Router);
  private readonly globalTheme = inject(GlobalThemeService);

  readonly theme = this.globalTheme.theme;
  readonly requestedPath = this.router.url;
}
