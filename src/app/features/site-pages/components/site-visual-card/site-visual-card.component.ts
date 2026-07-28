import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DiagramArtworkComponent } from '../../../../shared/diagram-artwork/diagram-artwork.component';
import type { SitePageCard } from '../../site-page-content';

@Component({
  selector: 'app-site-visual-card',
  imports: [DiagramArtworkComponent],
  templateUrl: './site-visual-card.component.html',
  styleUrl: './site-visual-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteVisualCardComponent {
  readonly card = input.required<SitePageCard>();
  readonly compact = input(false);
}
