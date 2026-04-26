import { ChangeDetectionStrategy, Component, computed, input, OnInit, output, signal } from '@angular/core';
import { getIconPath } from '../../config/editor-icons';
import {
  DEFAULT_REGULAR_POLYGON_DIMENSIONS,
  REGULAR_POLYGON_MAX_SIDES,
  REGULAR_POLYGON_MIN_SIDES,
  type RegularPolygonDimensions
} from '../../models/regular-polygon.models';
import { normalizeRegularPolygonDimensions, regularPolygonPoints } from '../../utils/regular-polygon.utils';

@Component({
  selector: 'app-regular-polygon-dialog',
  templateUrl: './regular-polygon-dialog.component.html',
  styleUrl: './regular-polygon-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegularPolygonDialogComponent implements OnInit {
  readonly closeIconPath = getIconPath('closeBold');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly cancelLabel = input.required<string>();
  readonly sidesLabel = input.required<string>();
  readonly quickPickerLabel = input.required<string>();
  readonly figureName = input.required<(sides: number) => string>();
  readonly initialSides = input(DEFAULT_REGULAR_POLYGON_DIMENSIONS.sides);
  readonly minSides = input(REGULAR_POLYGON_MIN_SIDES);
  readonly maxSides = input(REGULAR_POLYGON_MAX_SIDES);
  readonly quickPickSides = input<readonly number[]>([3, 4, 5, 6, 7, 8, 9, 10, 12]);

  readonly cancelDialog = output<void>();
  readonly confirm = output<RegularPolygonDimensions>();

  readonly selectedSides = signal(DEFAULT_REGULAR_POLYGON_DIMENSIONS.sides);
  readonly currentName = computed(() => this.figureName()(this.selectedSides()));
  readonly previewPath = computed(() => this.buildPreviewPath(this.selectedSides()));

  ngOnInit(): void {
    this.selectedSides.set(this.normalizeSides(this.initialSides()));
  }

  trackByValue(_index: number, value: number): number {
    return value;
  }

  selectSides(sides: number): void {
    this.selectedSides.set(this.normalizeSides(sides));
  }

  updateSides(event: Event): void {
    this.selectSides(Number((event.target as HTMLInputElement).value));
  }

  submit(): void {
    this.confirm.emit({ sides: this.selectedSides() });
  }

  private normalizeSides(sides: number): number {
    return normalizeRegularPolygonDimensions({
      sides: Math.min(this.maxSides(), Math.max(this.minSides(), sides))
    }).sides;
  }

  private buildPreviewPath(sides: number): string {
    const points = regularPolygonPoints(sides, 46, { x: 64, y: 64 }).map((point) => ({
      x: Number.parseFloat(point.x.toFixed(3)),
      y: Number.parseFloat((128 - point.y).toFixed(3))
    }));
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ') + ' Z';
  }
}
