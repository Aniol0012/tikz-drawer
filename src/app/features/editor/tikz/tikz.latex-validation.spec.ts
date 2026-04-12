import { buildLatexValidationDocument, latexValidationFixtures } from './tikz.validation.fixtures';

describe('tikz latex validation fixtures', () => {
  it('builds a non-empty standalone document from representative fixtures', () => {
    const document = buildLatexValidationDocument();

    expect(latexValidationFixtures.length).toBeGreaterThan(0);
    expect(document.trim().length).toBeGreaterThan(0);
    expect(document).toContain('\\documentclass[tikz]{standalone}');
    expect(document).toContain('\\begin{document}');
    expect(document).toContain('\\begin{tikzpicture}');
    expect(document).toContain('\\end{document}');

    for (const fixture of latexValidationFixtures) {
      expect(document).toContain(`% Fixture: ${fixture.id} (${fixture.title})`);
    }
  });
});
