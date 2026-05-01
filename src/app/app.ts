import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CustomTooltipComponent } from './shared/custom-tooltip/custom-tooltip.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CustomTooltipComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {}
