import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-scene-icon',
  standalone: true,
  templateUrl: './scene-icon.component.html',
  styleUrl: './scene-icon.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SceneIconComponent {}
