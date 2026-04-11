import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface PresetListItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

@Component({
  selector: 'app-preset-list',
  templateUrl: './preset-list.component.html',
  styleUrl: './preset-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PresetListComponent {
  readonly items = input.required<readonly PresetListItem[]>();
  readonly selected = output<string>();

  select(itemId: string): void {
    this.selected.emit(itemId);
  }
}
