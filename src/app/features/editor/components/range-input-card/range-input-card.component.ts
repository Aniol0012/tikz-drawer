import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

type NumericInputAttribute = number | string | null;

@Component({
  selector: 'app-range-input-card',
  templateUrl: './range-input-card.component.html',
  styleUrl: './range-input-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'field editor-range-input-card'
  }
})
export class RangeInputCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly rangeMin = input<NumericInputAttribute>(null);
  readonly rangeMax = input<NumericInputAttribute>(null);
  readonly rangeStep = input<number | string>(1);
  readonly numberMin = input<NumericInputAttribute>(null);
  readonly numberMax = input<NumericInputAttribute>(null);
  readonly numberStep = input<number | string | null>(null);
  readonly disabled = input(false);
  readonly valueInput = output<Event>();

  onInput(event: Event): void {
    this.valueInput.emit(event);
  }

  resolvedNumberMin(): NumericInputAttribute {
    return this.numberMin() ?? this.rangeMin();
  }

  resolvedNumberMax(): NumericInputAttribute {
    return this.numberMax() ?? this.rangeMax();
  }

  resolvedNumberStep(): number | string {
    return this.numberStep() ?? this.rangeStep();
  }
}
