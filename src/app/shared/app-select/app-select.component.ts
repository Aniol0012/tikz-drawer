import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, computed, input, output, signal } from '@angular/core';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';

export interface AppSelectOption {
  readonly value: string;
  readonly label: string;
  readonly longLabel?: string;
  readonly flagSrc?: string;
  readonly iconPath?: string;
  readonly iconFilled?: boolean;
  readonly statusTone?: 'ready' | 'loading' | 'unavailable' | 'available';
  readonly statusLabel?: string;
  readonly disabled?: boolean;
  readonly danger?: boolean;
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
  readonly selectedStatusColor = computed(() => this.statusColor(this.selectedOption()?.statusTone));

  readonly valueChange = output<string>();

  onSelectionChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }

  statusLabel(option: AppSelectOption): string {
    return option.statusLabel ?? option.longLabel ?? option.label;
  }

  setOpen(open: boolean): void {
    this.isOpen.set(open);
  }

  statusColor(tone: AppSelectOption['statusTone'] | undefined): string | null {
    switch (tone) {
      case 'ready':
        return '#12a150';
      case 'loading':
        return '#f59e0b';
      case 'unavailable':
        return '#dc2626';
      case 'available':
        return '#2563eb';
      default:
        return null;
    }
  }
}
