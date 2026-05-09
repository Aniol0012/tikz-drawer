import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, computed, input, output, signal } from '@angular/core';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';

export interface AppSelectOption {
  readonly value: string;
  readonly label: string;
  readonly longLabel?: string;
  readonly flagSrc?: string;
  readonly disabled?: boolean;
}

@Component({
  selector: 'app-select',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './app-select.component.html',
  styleUrl: './app-select.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSelectComponent {
  readonly value = input.required<string>();
  readonly options = input.required<readonly AppSelectOption[]>();
  readonly ariaLabel = input<string | null>(null);
  readonly hoist = input(true);
  readonly isOpen = signal(false);
  readonly selectedOption = computed(() => this.options().find((option) => option.value === this.value()) ?? null);

  readonly valueChange = output<string>();

  onSelectionChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }

  setOpen(open: boolean): void {
    this.isOpen.set(open);
  }
}
