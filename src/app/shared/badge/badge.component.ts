import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type BadgeTone = 'brand' | 'gray' | 'danger' | 'success' | 'warning' | 'dev';
export type BadgeSize = 'sm' | 'md';

@Component({
  selector: 'app-badge',
  imports: [NgTemplateOutlet],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.app-badge-host--button]': 'interactive()'
  }
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('gray');
  readonly size = input<BadgeSize>('md');
  readonly iconPath = input('');
  readonly ariaLabel = input('');
  readonly title = input('');
  readonly interactive = input(false);
  readonly disabled = input(false);

  readonly badgeClick = output<MouseEvent>();

  readonly classes = computed(() => ['badge', `badge--${this.tone()}`, `badge--${this.size()}`, this.interactive() ? 'badge--interactive' : ''].join(' '));

  onClick(event: MouseEvent): void {
    if (this.disabled()) {
      return;
    }

    this.badgeClick.emit(event);
  }
}
