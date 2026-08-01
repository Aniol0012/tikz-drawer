import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SitePageCard } from '../../site-page-content';
import { GuideStepMarkComponent } from '../guide-step-mark/guide-step-mark.component';

@Component({
  selector: 'app-site-visual-card',
  imports: [GuideStepMarkComponent, NgOptimizedImage],
  templateUrl: './site-visual-card.component.html',
  styleUrl: './site-visual-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteVisualCardComponent {
  readonly card = input.required<SitePageCard>();
  readonly compact = input(false);
  readonly priority = input(false);
}
