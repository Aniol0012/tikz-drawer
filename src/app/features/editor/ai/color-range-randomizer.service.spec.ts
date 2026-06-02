import { ColorRangeRandomizerService } from './color-range-randomizer.service';

describe('ColorRangeRandomizerService', () => {
  let service: ColorRangeRandomizerService;

  beforeEach(() => {
    service = new ColorRangeRandomizerService();
  });

  it('generates valid hex colors from natural ranges', () => {
    expect(service.getRandomColor('red')).toMatch(/^#[a-f\d]{6}$/);
    expect(service.getRandomColor('pink')).toMatch(/^#[a-f\d]{6}$/);
  });

  it('generates related stroke and fill colors', () => {
    const pair = service.getRandomColorPair('green');

    expect(pair.stroke).toMatch(/^#[a-f\d]{6}$/);
    expect(pair.fill).toMatch(/^#[a-f\d]{6}$/);
    expect(pair.fill).not.toBe(pair.stroke);
  });

  it('generates similar colors around an input hex', () => {
    const color = service.getSimilarHexColor('#ce1d45');
    const pair = service.getRelatedColorPair('#ce1d45');

    expect(color).toMatch(/^#[a-f\d]{6}$/);
    expect(pair.stroke).toMatch(/^#[a-f\d]{6}$/);
    expect(pair.fill).toMatch(/^#[a-f\d]{6}$/);
  });
});
