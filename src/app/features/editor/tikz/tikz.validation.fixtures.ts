import { scenePresets } from '../presets/presets';
import { sceneToTikzBundle } from './tikz.codegen';
import type { TikzScene } from '../models/tikz.models';

export interface LatexValidationFixture {
  readonly id: string;
  readonly title: string;
  readonly scene: TikzScene;
}

export const latexValidationFixtures: readonly LatexValidationFixture[] = scenePresets
  .filter((preset) => preset.scene.shapes.length > 0 && preset.scene.shapes.every((shape) => shape.kind !== 'image'))
  .map((preset) => ({
    id: preset.id,
    title: preset.title,
    scene: preset.scene
  }));

const uniqueImports = (lines: readonly string[]): readonly string[] => Array.from(new Set(lines.filter(Boolean)));

export const buildLatexValidationDocument = (
  fixtures: readonly LatexValidationFixture[] = latexValidationFixtures
): string => {
  const bundles = fixtures.map((fixture) => ({
    ...fixture,
    bundle: sceneToTikzBundle(fixture.scene)
  }));
  const imports = uniqueImports(bundles.flatMap(({ bundle }) => bundle.imports.split('\n').filter(Boolean)));
  const body = bundles
    .map(({ id, title, bundle }) => [`% Fixture: ${id} (${title})`, '\\par\\noindent', bundle.code].join('\n'))
    .join('\n\n\\bigskip\n\n');

  return [
    '\\documentclass[tikz]{standalone}',
    ...imports,
    '\\begin{document}',
    body,
    '\\end{document}',
    ''
  ].join('\n');
};
