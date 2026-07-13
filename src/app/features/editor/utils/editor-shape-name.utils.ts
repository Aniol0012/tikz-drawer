import { REGEX } from '../../../shared/regex/regex.utils';

export const copyNameBase = (name: string): string => {
  let baseName = name.trim() || 'Shape';
  let previousName = '';
  while (baseName !== previousName) {
    previousName = baseName;
    baseName = baseName.replace(REGEX.editor.numberedCopySuffix, '').replace(REGEX.editor.legacyCopySuffix, '').trim();
  }
  return baseName || 'Shape';
};

export const nextNumberedCopyName = (name: string, unavailableNames: ReadonlySet<string>): string => {
  const baseName = copyNameBase(name);
  let copyIndex = 1;
  let candidate = `${baseName} (${copyIndex})`;
  while (unavailableNames.has(candidate)) {
    copyIndex += 1;
    candidate = `${baseName} (${copyIndex})`;
  }
  return candidate;
};

export const reserveNextNumberedCopyName = (name: string, unavailableNames: Set<string>): string => {
  const copyName = nextNumberedCopyName(name, unavailableNames);
  unavailableNames.add(copyName);
  return copyName;
};
