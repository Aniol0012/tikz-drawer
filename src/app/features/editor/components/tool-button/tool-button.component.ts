import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-tool-button',
  templateUrl: './tool-button.component.html',
  styleUrl: './tool-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolButtonComponent {
  readonly label = input.required<string>();
  readonly iconPath = input.required<string>();
  readonly active = input(false);
  readonly subtle = input(false);
  readonly pressed = output<void>();

  onPress(): void {
    this.pressed.emit();
  }
}
