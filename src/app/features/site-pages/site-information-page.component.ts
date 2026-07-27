import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { resolveSitePage } from './site-page-content';

@Component({
  selector: 'app-site-information-page',
  imports: [RouterLink],
  templateUrl: './site-information-page.component.html',
  styleUrl: './site-information-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-theme': 'light'
  }
})
export class SiteInformationPageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly page = resolveSitePage(this.route.snapshot.data['page']);
}
