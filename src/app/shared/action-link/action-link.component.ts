import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type ActionLinkTone = 'primary' | 'secondary';

@Component({
  selector: 'app-action-link',
  imports: [RouterLink],
  templateUrl: './action-link.component.html',
  styleUrl: './action-link.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActionLinkComponent {
  readonly label = input.required<string>();
  readonly route = input.required<string>();
  readonly iconPath = input.required<string>();
  readonly tone = input<ActionLinkTone>('secondary');
}
