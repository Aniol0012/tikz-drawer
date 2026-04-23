import { ChangeDetectionStrategy, Component, computed, input, OnInit, output, signal } from '@angular/core';
import { getIconPath } from '../../config/editor-icons';
import type { TableDimensions } from '../../models/table.models';
import { normalizeTableDimensions, tableSizeLabel } from '../../utils/table.utils';
import type { TableDialogCell } from './table-dialog.types';

@Component({
  selector: 'app-table-dialog',
  templateUrl: './table-dialog.component.html',
  styleUrl: './table-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableDialogComponent implements OnInit {
  readonly closeIconPath = getIconPath('closeBold');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly cancelLabel = input.required<string>();
  readonly rowsLabel = input.required<string>();
  readonly columnsLabel = input.required<string>();
  readonly quickPickerLabel = input.required<string>();
  readonly initialRows = input.required<number>();
  readonly initialColumns = input.required<number>();
  readonly maxPickerRows = input(6);
  readonly maxPickerColumns = input(10);

  readonly cancelDialog = output<void>();
  readonly confirm = output<TableDimensions>();

  readonly selectedRows = signal(1);
  readonly selectedColumns = signal(1);
  readonly hoveredRows = signal<number | null>(null);
  readonly hoveredColumns = signal<number | null>(null);
  readonly pickerRows = computed(() => Array.from({ length: this.maxPickerRows() }, (_, index) => index + 1));
  readonly pickerColumns = computed(() => Array.from({ length: this.maxPickerColumns() }, (_, index) => index + 1));
  readonly displayRows = computed(() => this.hoveredRows() ?? this.selectedRows());
  readonly displayColumns = computed(() => this.hoveredColumns() ?? this.selectedColumns());
  readonly sizeLabel = computed(() => tableSizeLabel(this.displayColumns(), this.displayRows()));

  ngOnInit(): void {
    const initialDimensions = normalizeTableDimensions({
      rows: this.initialRows(),
      columns: this.initialColumns()
    });

    this.selectedRows.set(initialDimensions.rows);
    this.selectedColumns.set(initialDimensions.columns);
    this.clearPreview();
  }

  trackByIndex(index: number): number {
    return index;
  }

  cell(row: number, column: number): TableDialogCell {
    return { row, column };
  }

  isCellActive(cell: TableDialogCell): boolean {
    return cell.row <= this.displayRows() && cell.column <= this.displayColumns();
  }

  previewSelection(cell: TableDialogCell): void {
    this.hoveredRows.set(cell.row);
    this.hoveredColumns.set(cell.column);
  }

  clearPreview(): void {
    this.hoveredRows.set(null);
    this.hoveredColumns.set(null);
  }

  selectDimensions(cell: TableDialogCell): void {
    this.selectedRows.set(cell.row);
    this.selectedColumns.set(cell.column);
    this.clearPreview();
  }

  updateRows(event: Event): void {
    this.selectedRows.set(
      normalizeTableDimensions({ rows: Number((event.target as HTMLInputElement).value), columns: 1 }).rows
    );
    this.clearPreview();
  }

  updateColumns(event: Event): void {
    this.selectedColumns.set(
      normalizeTableDimensions({ rows: 1, columns: Number((event.target as HTMLInputElement).value) }).columns
    );
    this.clearPreview();
  }

  submit(): void {
    this.confirm.emit(
      normalizeTableDimensions({
        rows: this.selectedRows(),
        columns: this.selectedColumns()
      })
    );
  }
}
