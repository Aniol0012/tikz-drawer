import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const validationModule = await import('../src/app/features/editor/tikz/tikz.validation.fixtures.ts');
const buildLatexValidationDocument =
  validationModule.buildLatexValidationDocument ??
  (validationModule.default as { buildLatexValidationDocument?: unknown } | undefined)?.buildLatexValidationDocument;
const latexValidationFixtures =
  validationModule.latexValidationFixtures ??
  (validationModule.default as { latexValidationFixtures?: unknown } | undefined)?.latexValidationFixtures;

if (typeof buildLatexValidationDocument !== 'function' || !Array.isArray(latexValidationFixtures)) {
  throw new Error('Unable to load TikZ LaTeX validation exports from tikz.validation.fixtures.ts');
}

const outputDirectory = path.resolve('.artifacts', 'tikz-validation');
const outputPath = path.join(outputDirectory, 'output.tex');
const manifestPath = path.join(outputDirectory, 'fixtures.json');

const document = buildLatexValidationDocument();

if (!document.trim()) {
  throw new Error('Generated LaTeX validation document is empty.');
}

for (const requiredToken of ['\\documentclass[tikz]{standalone}', '\\begin{document}', '\\begin{tikzpicture}', '\\end{document}']) {
  if (!document.includes(requiredToken)) {
    throw new Error(`Generated LaTeX validation document is missing required token: ${requiredToken}`);
  }
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, document, 'utf8');
await writeFile(
  manifestPath,
  JSON.stringify(
    latexValidationFixtures.map((fixture) => ({
      id: fixture.id,
      title: fixture.title,
      shapeCount: fixture.scene.shapes.length
    })),
    null,
    2
  ),
  'utf8'
);

console.log(`Wrote ${outputPath}`);
console.log(`Included ${latexValidationFixtures.length} TikZ validation fixtures.`);
