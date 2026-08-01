import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ActionLinkComponent } from '../../shared/action-link/action-link.component';
import { DiagramArtworkComponent } from '../../shared/diagram-artwork/diagram-artwork.component';
import { GlobalThemeService } from '../../shared/theme/global-theme.service';
import { iconPaths } from '../editor/config/editor-icons';
import { EditorTranslatePipe } from '../editor/i18n/editor-translate.pipe';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, ActionLinkComponent, DiagramArtworkComponent, EditorTranslatePipe],
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
  readonly editorIconPath = iconPaths.pencil;
  readonly guideIconPath = iconPaths.note;
}
