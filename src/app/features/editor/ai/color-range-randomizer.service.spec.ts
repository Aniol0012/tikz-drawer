import { ColorRangeRandomizerService } from './color-range-randomizer.service';
import { REGEX } from '../../../shared/regex/regex.utils';

describe('ColorRangeRandomizerService', () => {
  let service: ColorRangeRandomizerService;

  beforeEach(() => {
    service = new ColorRangeRandomizerService();
  });

  it('generates valid hex colors from natural ranges', () => {
    expect(service.getRandomColor('red')).toMatch(REGEX.color.hex6Strict);
    expect(service.getRandomColor('pink')).toMatch(REGEX.color.hex6Strict);
  });

  it('generates related stroke and fill colors', () => {
    const pair = service.getRandomColorPair('green');

    expect(pair.stroke).toMatch(REGEX.color.hex6Strict);
    expect(pair.fill).toMatch(REGEX.color.hex6Strict);
    expect(pair.fill).not.toBe(pair.stroke);
  });

  it('generates similar colors around an input hex', () => {
    const color = service.getSimilarHexColor('#ce1d45');
    const pair = service.getRelatedColorPair('#ce1d45');

    expect(color).toMatch(REGEX.color.hex6Strict);
    expect(pair.stroke).toMatch(REGEX.color.hex6Strict);
    expect(pair.fill).toMatch(REGEX.color.hex6Strict);
  });
});
