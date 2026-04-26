import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import type { ObjectPreset } from '../../models/tikz.models';

@Component({
  selector: 'app-figure-search-overlay',
  templateUrl: './figure-search-overlay.component.html',
  styleUrl: './figure-search-overlay.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FigureSearchOverlayComponent {
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly presets = input.required<readonly ObjectPreset[]>();
  readonly iconMap = input.required<Record<string, string>>();
  readonly titleForPreset = input.required<(preset: ObjectPreset) => string>();
  readonly descriptionForPreset = input.required<(preset: ObjectPreset) => string>();
  readonly placeholder = input.required<string>();
  readonly noResultsLabel = input.required<string>();
  readonly shortcutLabel = input.required<string>();
  readonly selectLabel = input.required<string>();

  readonly closeSearch = output<void>();
  readonly selectPreset = output<string>();

  readonly query = signal('');
  readonly activeIndex = signal(0);
  readonly filteredPresets = computed(() => {
    const query = this.query().trim().toLowerCase();
    const sourcePresets = this.presets();
    if (!query) {
      return sourcePresets.slice(0, 8);
    }

    return sourcePresets
      .filter((preset) => {
        const haystack = [
          this.titleForPreset()(preset),
          this.descriptionForPreset()(preset),
          preset.title,
          preset.description,
          ...(preset.searchTerms ?? [])
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 8);
  });

  constructor() {
    afterNextRender(() => {
      const input = this.searchInput()?.nativeElement;
      input?.focus({ preventScroll: true });
      input?.select();
    });
  }

  updateQuery(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
  }

  iconPath(key: string): string {
    return this.iconMap()[key] ?? this.iconMap()['rectangle'] ?? '';
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSearch.emit();
      return;
    }

    const presets = this.filteredPresets();
    if (!presets.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((index) => (index + 1) % presets.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((index) => (index - 1 + presets.length) % presets.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.choosePreset(presets[this.activeIndex()] ?? presets[0]);
    }
  }

  onBackdropKeydown(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }

    event.preventDefault();
    this.closeSearch.emit();
  }

  choosePreset(preset: ObjectPreset): void {
    this.selectPreset.emit(preset.id);
  }

  trackByPresetId(_index: number, preset: ObjectPreset): string {
    return preset.id;
  }
}
