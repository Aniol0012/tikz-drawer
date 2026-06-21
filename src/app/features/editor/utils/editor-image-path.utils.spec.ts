import { imagePathForFile, isValidImageDirectoryPath, normalizeImageDirectoryPath } from './editor-image-path.utils';

describe('editor image paths', () => {
  it('accepts relative, Unix and Windows directory paths, including spaces', () => {
    expect(isValidImageDirectoryPath('images')).toBe(true);
    expect(isValidImageDirectoryPath('/project/image assets')).toBe(true);
    expect(isValidImageDirectoryPath('./images')).toBe(true);
    expect(isValidImageDirectoryPath('../shared images')).toBe(true);
    expect(isValidImageDirectoryPath(String.raw`C:\project\image assets`)).toBe(true);
  });

  it('rejects arbitrary text, URLs and invalid path characters', () => {
    expect(isValidImageDirectoryPath('https://example.com/images')).toBe(false);
    expect(isValidImageDirectoryPath('data:image/png;base64,abc')).toBe(false);
    expect(isValidImageDirectoryPath('/images/*.png')).toBe(false);
  });

  it('normalizes trailing separators and joins image filenames', () => {
    expect(normalizeImageDirectoryPath('/project/images/')).toBe('/project/images');
    expect(normalizeImageDirectoryPath('https://example.com/images')).toBe('images');
    expect(imagePathForFile('images', 'example.png')).toBe('images/example.png');
    expect(imagePathForFile('/project/images/', 'diagram.png')).toBe('/project/images/diagram.png');
    expect(imagePathForFile(String.raw`C:\project\images`, 'diagram.png')).toBe(String.raw`C:\project\images\diagram.png`);
  });
});
