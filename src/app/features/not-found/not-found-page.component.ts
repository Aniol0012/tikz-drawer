import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { resolveNotFoundTheme } from './not-found-theme.utils';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-theme]': 'theme'
  }
})
export class NotFoundPageComponent {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  readonly theme = resolveNotFoundTheme(this.document);
  readonly requestedPath = this.router.url;
}
