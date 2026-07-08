import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { REGEX } from '../../../../shared/regex/regex.utils';

interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

interface HsvColor {
  readonly h: number;
  readonly s: number;
  readonly v: number;
}

type RgbChannel = keyof RgbColor;

const COMMON_COLORS = [
  '#111827',
  '#374151',
  '#6B7280',
  '#FFFFFF',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#EC4899',
  '#F43F5E',
  '#F3F4F6'
] as const;

const FALLBACK_COLOR = '#1F1F1F';

@Component({
  selector: 'app-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:pointerdown)': 'closeFromDocument($event)',
    '(document:pointerup)': 'endDrag()',
    '(document:keydown.escape)': 'close()'
  }
})
export class ColorPickerComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly value = input.required<string>();
  readonly opacity = input(1);
  readonly label = input('Color');
  readonly opacityLabel = input('Opacity');
  readonly randomLabel = input('Random color');
  readonly fallback = input(FALLBACK_COLOR);

  readonly valueChange = output<string>();
  readonly opacityChange = output<number>();

  readonly isOpen = signal(false);
  readonly activeDrag = signal<'area' | null>(null);
  readonly commonColors = COMMON_COLORS;
  readonly rgbChannels: readonly RgbChannel[] = ['r', 'g', 'b'];
  readonly Math = Math;

  readonly normalizedColor = computed(() => normalizeHexColor(this.value(), this.fallback()));
  readonly clampedOpacity = computed(() => clampUnit(this.opacity()));
  readonly rgb = computed(() => hexToRgb(this.normalizedColor()));
  readonly hsv = computed(() => rgbToHsv(this.rgb()));
  readonly hexInputValue = computed(() => this.normalizedColor().toUpperCase());
  readonly previewBackground = computed(() => withOpacity(this.normalizedColor(), this.clampedOpacity()));
  readonly hueGradient = 'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)';
  readonly colorAreaBackground = computed(() => `linear-gradient(0deg, #000, transparent), linear-gradient(90deg, #fff, hsl(${this.hsv().h} 100% 50%))`);

  toggleOpen(): void {
    this.isOpen.update((isOpen) => !isOpen);
  }

  close(): void {
    this.isOpen.set(false);
    this.activeDrag.set(null);
  }

  closeFromDocument(event: PointerEvent): void {
    if (!this.isOpen() || this.host.nativeElement.contains(event.target as Node | null)) {
      return;
    }
    this.close();
  }

  pickCommonColor(color: string): void {
    this.emitColor(color);
  }

  pickRandomColor(): void {
    this.emitColor(
      rgbToHex({
        r: randomChannel(),
        g: randomChannel(),
        b: randomChannel()
      })
    );
  }

  updateHue(event: Event): void {
    const hue = Number((event.target as HTMLInputElement).value);
    this.emitHsv({ ...this.hsv(), h: clamp(hue, 0, 360) });
  }

  updateOpacity(event: Event): void {
    this.opacityChange.emit(clampUnit(Number((event.target as HTMLInputElement).value)));
  }

  updateHex(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    const normalized = normalizeHexInput(value);
    if (normalized) {
      this.emitColor(normalized);
    }
  }

  updateRgb(channel: RgbChannel, event: Event): void {
    const value = clamp(Math.round(Number((event.target as HTMLInputElement).value)), 0, 255);
    this.emitColor(rgbToHex({ ...this.rgb(), [channel]: value }));
  }

  beginAreaDrag(event: PointerEvent): void {
    this.activeDrag.set('area');
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.updateAreaFromPointer(event);
  }

  dragArea(event: PointerEvent): void {
    if (this.activeDrag() === 'area') {
      this.updateAreaFromPointer(event);
    }
  }

  endDrag(): void {
    this.activeDrag.set(null);
  }

  adjustAreaFromKeyboard(event: KeyboardEvent): void {
    const keyMap: Record<string, readonly [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, 1],
      ArrowDown: [0, -1]
    };
    const delta = keyMap[event.key];
    if (!delta) {
      return;
    }

    event.preventDefault();
    let step = 0.03;
    if (event.shiftKey) {
      step = 0.1;
    }
    const hsv = this.hsv();
    this.emitHsv({
      ...hsv,
      s: clampUnit(hsv.s + delta[0] * step),
      v: clampUnit(hsv.v + delta[1] * step)
    });
  }

  ariaColorLabel(color: string): string {
    return `${this.label()} ${color}`;
  }

  private updateAreaFromPointer(event: PointerEvent): void {
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    this.emitHsv({ ...this.hsv(), s: x, v: 1 - y });
  }

  private emitHsv(color: HsvColor): void {
    this.emitColor(rgbToHex(hsvToRgb(color)));
  }

  private emitColor(color: string): void {
    this.valueChange.emit(normalizeHexColor(color, this.fallback()));
  }
}

function normalizeHexColor(value: string, fallback: string): string {
  return normalizeHexInput(value) ?? normalizeHexInput(fallback) ?? FALLBACK_COLOR;
}

function normalizeHexInput(value: string): string | null {
  const trimmed = value.trim();
  if (REGEX.color.hex3.test(trimmed)) {
    return trimmed.replace(REGEX.color.hex3Capture, '#$1$1$2$2$3$3').toUpperCase();
  }
  const match = REGEX.color.optionalHashHex6.exec(trimmed);
  if (!match) {
    return null;
  }
  return `#${match[1].toUpperCase()}`;
}

function hexToRgb(hex: string): RgbColor {
  const value = hex.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHex(color: RgbColor): string {
  const channels = [color.r, color.g, color.b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'));
  return `#${channels.join('')}`.toUpperCase();
}

function rgbToHsv(color: RgbColor): HsvColor {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }

  return {
    h: positiveHue(h),
    s: saturation(max, delta),
    v: max
  };
}

function positiveHue(hue: number): number {
  if (hue < 0) {
    return hue + 360;
  }
  return hue;
}

function saturation(max: number, delta: number): number {
  if (max === 0) {
    return 0;
  }
  return delta / max;
}

function hsvToRgb(color: HsvColor): RgbColor {
  const h = ((color.h % 360) + 360) % 360;
  const c = color.v * color.s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = color.v - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

function withOpacity(hex: string, opacity: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r} ${g} ${b} / ${Math.round(opacity * 100)}%)`;
}

function randomChannel(): number {
  return Math.floor(Math.random() * 256);
}

function clampUnit(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}
