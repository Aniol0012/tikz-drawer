import { REGEX } from '../../../shared/regex/regex.utils';

const hasInvalidPathCharacters = (path: string): boolean =>
  [...path].some((character, index) => {
    const code = character.charCodeAt(0);
    return code < 32 || '<>"|?*'.includes(character) || (character === ':' && index !== 1);
  });

export const isValidImageDirectoryPath = (value: string): boolean => {
  const path = value.trim();
  return (
    path.length > 0 &&
    !hasInvalidPathCharacters(path) &&
    (REGEX.imagePath.unixPrefix.test(path) || REGEX.imagePath.windowsPrefix.test(path) || REGEX.imagePath.relative.test(path))
  );
};

export const normalizeImageDirectoryPath = (value: string, fallback = 'images'): string => {
  const path = value.trim();
  if (!isValidImageDirectoryPath(path)) {
    return fallback;
  }
  return path.replace(REGEX.imagePath.trailingSeparators, '');
};

export const imagePathForFile = (directory: string, fileName: string): string => {
  const normalizedDirectory = normalizeImageDirectoryPath(directory);
  const normalizedFileName = fileName.replace(REGEX.imagePath.leadingSeparators, '');
  const separator = normalizedDirectory.includes('\\') && !normalizedDirectory.includes('/') ? '\\' : '/';
  return `${normalizedDirectory}${separator}${normalizedFileName}`;
};
