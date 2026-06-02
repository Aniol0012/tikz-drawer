import { Injectable } from '@angular/core';

export const AI_COLOR_RANGES = ['red', 'orange', 'yellow', 'green', 'teal', 'cyan', 'blue', 'purple', 'pink', 'rose', 'gray'] as const;

export type AiColorRange = (typeof AI_COLOR_RANGES)[number];
export type ColorRangeInput = AiColorRange | `#${string}`;
export type HexColor = `#${string}`;

export interface RandomColorOptions {
  readonly saturation?: readonly [number, number];
  readonly lightness?: readonly [number, number];
  readonly hueJitter?: number;
  readonly saturationJitter?: number;
  readonly lightnessJitter?: number;
}

export interface RandomColorPair {
  readonly stroke: HexColor;
  readonly fill: HexColor;
}

interface HueRange {
  readonly from: number;
  readonly to: number;
}

interface HslColor {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

interface RgbColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

const FULL_HUE_RANGE: HueRange = { from: 0, to: 360 };
const HUE_DEGREES = 360;
const HUE_SECTOR_SIZE = 60;
const RGB_CHANNEL_MAX = 255;
const PERCENT_MAX = 100;

const DEFAULT_SIMILAR_JITTER = {
  hue: 8,
  saturation: 10,
  lightness: 9
} as const;

const HEX_STROKE_JITTER = {
  hueJitter: 7,
  saturationJitter: 8,
  lightnessJitter: 7
} as const;

const RELATED_STROKE_LIMITS = {
  minSaturation: 30,
  maxSaturation: 92,
  minLightness: 24,
  maxLightness: 58
} as const;

const NATURAL_COLOR_RANGES: Record<AiColorRange, readonly HueRange[]> = {
  red: [
    { from: 348, to: HUE_DEGREES },
    { from: 0, to: 12 }
  ],
  orange: [{ from: 20, to: 36 }],
  yellow: [{ from: 44, to: 58 }],
  green: [{ from: 105, to: 145 }],
  teal: [{ from: 160, to: 178 }],
  cyan: [{ from: 186, to: 205 }],
  blue: [{ from: 215, to: 244 }],
  purple: [{ from: 264, to: 288 }],
  pink: [{ from: 318, to: 336 }],
  rose: [{ from: 338, to: 350 }],
  gray: [FULL_HUE_RANGE]
};

const VARIED_COLOR_RANGES: readonly AiColorRange[] = ['red', 'orange', 'yellow', 'green', 'teal', 'cyan', 'blue', 'purple', 'pink', 'rose'];
const DEFAULT_PALETTE_RANGES: readonly AiColorRange[] = ['blue', 'green', 'orange', 'purple', 'red', 'cyan', 'teal', 'rose'];
const DEFAULT_SATURATION_RANGE = [56, 88] as const;
const DEFAULT_LIGHTNESS_RANGE = [34, 54] as const;
const GRAY_SATURATION_RANGE = [4, 16] as const;
const GRAY_LIGHTNESS_RANGE = [28, 58] as const;
const STROKE_SATURATION_RANGE = [58, 86] as const;
const STROKE_LIGHTNESS_RANGE = [34, 48] as const;
const GRAY_STROKE_SATURATION_RANGE = [4, 14] as const;
const GRAY_STROKE_LIGHTNESS_RANGE = [30, 48] as const;

@Injectable({ providedIn: 'root' })
export class ColorRangeRandomizerService {
  getRandomColor(input: ColorRangeInput = this.randomNaturalRange(), options: RandomColorOptions = {}): HexColor {
    const similarHex = this.normalizeHex(input);
    if (similarHex) {
      return this.getSimilarHexColor(similarHex, options);
    }

    return this.hslToHex(this.randomHslInRange(this.rangeOrRandom(input), options));
  }

  getSimilarHexColor(hex: string, options: RandomColorOptions = {}): HexColor {
    const parsed = this.hexToHsl(hex);
    if (!parsed) {
      return this.getRandomColor(this.randomNaturalRange(), options);
    }

    return this.hslToHex(this.jitterHsl(parsed, options));
  }

  getRandomColorPair(input?: ColorRangeInput): RandomColorPair {
    const strokeHsl = this.randomStrokeHsl(input);
    return this.colorPairFromStroke(strokeHsl, {
      saturationShift: [12, 28],
      lightnessShift: [36, 48],
      fillSaturationLimits: [24, 88],
      fillLightnessLimits: [70, 94]
    });
  }

  getRelatedColorPair(hex: string): RandomColorPair {
    const parsed = this.hexToHsl(hex);
    if (!parsed) {
      return this.getRandomColorPair();
    }

    const strokeHsl = {
      h: this.wrapHue(parsed.h + this.randomSymmetric(7)),
      s: this.clamp(Math.max(parsed.s, 52) + this.randomSymmetric(8), RELATED_STROKE_LIMITS.minSaturation, RELATED_STROKE_LIMITS.maxSaturation),
      l: this.clamp(Math.min(parsed.l, 52) + this.randomSymmetric(7), RELATED_STROKE_LIMITS.minLightness, RELATED_STROKE_LIMITS.maxLightness)
    };

    return this.colorPairFromStroke(strokeHsl, {
      saturationShift: [14, 30],
      lightnessShift: [34, 48],
      fillSaturationLimits: [22, 86],
      fillLightnessLimits: [70, 94]
    });
  }

  getRandomPalette(size = 8, preferred?: RandomColorPair, range?: ColorRangeInput | null): readonly RandomColorPair[] {
    const generated = range ? this.paletteFromRange(size, range) : this.paletteFromDefaultRanges(size);
    return preferred ? [preferred, ...generated] : generated;
  }

  private randomStrokeHsl(input: ColorRangeInput | undefined): HslColor {
    const hex = input ? this.normalizeHex(input) : null;
    if (hex) {
      return this.hexToHsl(this.getSimilarHexColor(hex, HEX_STROKE_JITTER)) ?? this.randomHslInRange(this.randomNaturalRange());
    }

    const range = input ? this.rangeOrRandom(input) : this.randomNaturalRange();
    return this.randomHslInRange(range, {
      saturation: this.strokeSaturationRange(range),
      lightness: this.strokeLightnessRange(range)
    });
  }

  private randomHslInRange(range: AiColorRange, options: RandomColorOptions = {}): HslColor {
    const hueRange = this.pickOne(NATURAL_COLOR_RANGES[range]);
    const saturation = options.saturation ?? this.defaultSaturationRange(range);
    const lightness = options.lightness ?? this.defaultLightnessRange(range);
    return {
      h: this.randomBetween(hueRange.from, hueRange.to),
      s: this.randomBetween(saturation[0], saturation[1]),
      l: this.randomBetween(lightness[0], lightness[1])
    };
  }

  private jitterHsl(color: HslColor, options: RandomColorOptions): HslColor {
    const hueJitter = options.hueJitter ?? DEFAULT_SIMILAR_JITTER.hue;
    const saturationJitter = options.saturationJitter ?? DEFAULT_SIMILAR_JITTER.saturation;
    const lightnessJitter = options.lightnessJitter ?? DEFAULT_SIMILAR_JITTER.lightness;
    return {
      h: this.wrapHue(color.h + this.randomSymmetric(hueJitter)),
      s: this.clamp(color.s + this.randomSymmetric(saturationJitter), 12, 96),
      l: this.clamp(color.l + this.randomSymmetric(lightnessJitter), 18, 86)
    };
  }

  private colorPairFromStroke(
    strokeHsl: HslColor,
    options: {
      readonly saturationShift: readonly [number, number];
      readonly lightnessShift: readonly [number, number];
      readonly fillSaturationLimits: readonly [number, number];
      readonly fillLightnessLimits: readonly [number, number];
    }
  ): RandomColorPair {
    const fillHsl = {
      h: this.wrapHue(strokeHsl.h + this.randomSymmetric(4)),
      s: this.clamp(
        strokeHsl.s - this.randomBetween(options.saturationShift[0], options.saturationShift[1]),
        options.fillSaturationLimits[0],
        options.fillSaturationLimits[1]
      ),
      l: this.clamp(
        strokeHsl.l + this.randomBetween(options.lightnessShift[0], options.lightnessShift[1]),
        options.fillLightnessLimits[0],
        options.fillLightnessLimits[1]
      )
    };

    return {
      stroke: this.hslToHex(strokeHsl),
      fill: this.hslToHex(fillHsl)
    };
  }

  private paletteFromRange(size: number, range: ColorRangeInput): readonly RandomColorPair[] {
    return Array.from({ length: Math.max(1, size) }, () => this.getRandomColorPair(range));
  }

  private paletteFromDefaultRanges(size: number): readonly RandomColorPair[] {
    const rotated = this.rotatedDefaultRanges();
    return Array.from({ length: Math.max(1, size) }, (_entry, index) => this.getRandomColorPair(rotated[index % rotated.length]));
  }

  private rotatedDefaultRanges(): readonly AiColorRange[] {
    const start = Math.floor(Math.random() * DEFAULT_PALETTE_RANGES.length);
    return [...DEFAULT_PALETTE_RANGES.slice(start), ...DEFAULT_PALETTE_RANGES.slice(0, start)];
  }

  private rangeOrRandom(value: string): AiColorRange {
    return this.isNaturalRange(value) ? value : this.randomNaturalRange();
  }

  private randomNaturalRange(): AiColorRange {
    return this.pickOne(VARIED_COLOR_RANGES);
  }

  private isNaturalRange(value: string): value is AiColorRange {
    return Object.hasOwn(NATURAL_COLOR_RANGES, value);
  }

  private defaultSaturationRange(range: AiColorRange): readonly [number, number] {
    return range === 'gray' ? GRAY_SATURATION_RANGE : DEFAULT_SATURATION_RANGE;
  }

  private defaultLightnessRange(range: AiColorRange): readonly [number, number] {
    return range === 'gray' ? GRAY_LIGHTNESS_RANGE : DEFAULT_LIGHTNESS_RANGE;
  }

  private strokeSaturationRange(range: AiColorRange): readonly [number, number] {
    return range === 'gray' ? GRAY_STROKE_SATURATION_RANGE : STROKE_SATURATION_RANGE;
  }

  private strokeLightnessRange(range: AiColorRange): readonly [number, number] {
    return range === 'gray' ? GRAY_STROKE_LIGHTNESS_RANGE : STROKE_LIGHTNESS_RANGE;
  }

  private normalizeHex(value: string): HexColor | null {
    const trimmed = value.trim();
    const shortMatch = /^#([a-f\d])([a-f\d])([a-f\d])$/i.exec(trimmed);
    if (shortMatch?.[1] && shortMatch[2] && shortMatch[3]) {
      return `#${shortMatch[1]}${shortMatch[1]}${shortMatch[2]}${shortMatch[2]}${shortMatch[3]}${shortMatch[3]}`.toLowerCase() as HexColor;
    }

    return /^#[a-f\d]{6}$/i.test(trimmed) ? (trimmed.toLowerCase() as HexColor) : null;
  }

  private hexToHsl(hex: string): HslColor | null {
    const rgb = this.hexToRgb(hex);
    return rgb ? this.rgbToHsl(rgb) : null;
  }

  private hexToRgb(hex: string): RgbColor | null {
    const normalized = this.normalizeHex(hex);
    if (!normalized) {
      return null;
    }

    const value = Number.parseInt(normalized.slice(1), 16);
    return {
      red: ((value >> 16) & RGB_CHANNEL_MAX) / RGB_CHANNEL_MAX,
      green: ((value >> 8) & RGB_CHANNEL_MAX) / RGB_CHANNEL_MAX,
      blue: (value & RGB_CHANNEL_MAX) / RGB_CHANNEL_MAX
    };
  }

  private rgbToHsl(color: RgbColor): HslColor {
    const max = Math.max(color.red, color.green, color.blue);
    const min = Math.min(color.red, color.green, color.blue);
    const lightness = (max + min) / 2;
    const delta = max - min;
    if (delta === 0) {
      return { h: 0, s: 0, l: lightness * PERCENT_MAX };
    }

    return {
      h: this.wrapHue(this.rgbHue(color, max, delta)),
      s: (delta / (1 - Math.abs(2 * lightness - 1))) * PERCENT_MAX,
      l: lightness * PERCENT_MAX
    };
  }

  private rgbHue(color: RgbColor, max: number, delta: number): number {
    if (max === color.red) {
      return HUE_SECTOR_SIZE * (((color.green - color.blue) / delta) % 6);
    }

    if (max === color.green) {
      return HUE_SECTOR_SIZE * ((color.blue - color.red) / delta + 2);
    }

    return HUE_SECTOR_SIZE * ((color.red - color.green) / delta + 4);
  }

  private hslToHex(color: HslColor): HexColor {
    const saturation = this.clamp(color.s, 0, PERCENT_MAX) / PERCENT_MAX;
    const lightness = this.clamp(color.l, 0, PERCENT_MAX) / PERCENT_MAX;
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const huePrime = this.wrapHue(color.h) / HUE_SECTOR_SIZE;
    const second = chroma * (1 - Math.abs((huePrime % 2) - 1));
    const match = lightness - chroma / 2;
    return this.rgbChannelsToHex(this.huePrimeToRgb(huePrime, chroma, second), match);
  }

  private huePrimeToRgb(huePrime: number, chroma: number, second: number): readonly [number, number, number] {
    if (huePrime < 1) {
      return [chroma, second, 0];
    }
    if (huePrime < 2) {
      return [second, chroma, 0];
    }
    if (huePrime < 3) {
      return [0, chroma, second];
    }
    if (huePrime < 4) {
      return [0, second, chroma];
    }
    if (huePrime < 5) {
      return [second, 0, chroma];
    }
    return [chroma, 0, second];
  }

  private rgbChannelsToHex(channels: readonly [number, number, number], match: number): HexColor {
    return `#${channels.map((channel) => this.channelToHex(channel + match)).join('')}` as HexColor;
  }

  private channelToHex(channel: number): string {
    return Math.round(channel * RGB_CHANNEL_MAX)
      .toString(16)
      .padStart(2, '0');
  }

  private pickOne<T>(values: readonly T[]): T {
    const fallback = values[0];
    if (fallback === undefined) {
      throw new Error('Color range cannot be empty.');
    }

    return values[Math.floor(Math.random() * values.length)] ?? fallback;
  }

  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private randomSymmetric(amount: number): number {
    return this.randomBetween(-amount, amount);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private wrapHue(value: number): number {
    return ((value % HUE_DEGREES) + HUE_DEGREES) % HUE_DEGREES;
  }
}
