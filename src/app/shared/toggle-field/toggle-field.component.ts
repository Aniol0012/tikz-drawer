import { AfterViewInit, ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-toggle-field',
  templateUrl: './toggle-field.component.html',
  styleUrl: './toggle-field.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'toggle-field',
    '[class.toggle-field--disabled]': 'disabled()',
    '[class.toggle-field--ready]': 'ready()'
  }
})
export class ToggleFieldComponent implements AfterViewInit {
  readonly checked = input.required<boolean>();
  readonly label = input.required<string>();
  readonly disabled = input(false);
  readonly ready = signal(false);

  readonly checkedChange = output<boolean>();

  ngAfterViewInit(): void {
    const scheduleReady =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (callback: FrameRequestCallback): number => {
            globalThis.setTimeout(() => callback(Date.now()), 0);
            return 0;
          };

    scheduleReady(() => this.ready.set(true));
  }

  onChange(event: Event): void {
    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }

  onEnterKeydown(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.disabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    target.click();
  }
}
