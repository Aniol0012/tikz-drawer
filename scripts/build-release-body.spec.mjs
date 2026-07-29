import { describe, expect, it } from 'vitest';
import { buildReleaseBody } from './build-release-body.mjs';

const releaseInput = {
  tag: 'v2.1.0',
  releaseUrl: 'https://github.com/Aniol0012/tikz-drawer/releases/tag/v2.1.0',
  repositoryUrl: 'https://github.com/Aniol0012/tikz-drawer',
  description: 'A focused release with a cleaner editing workflow.',
  releaseNotes: '## Features\n\n* Added a reliable release workflow.',
  previousTag: 'v2.0.0'
};

describe('buildReleaseBody', () => {
  it('builds the complete release body in the expected order', () => {
    expect(buildReleaseBody({ ...releaseInput, hasSnapshot: true })).toBe(
      [
        '**Version:** [v2.1.0](https://github.com/Aniol0012/tikz-drawer/releases/tag/v2.1.0)',
        'A focused release with a cleaner editing workflow.',
        '### Snapshot\n\n![Editor light](https://github.com/Aniol0012/tikz-drawer/releases/download/v2.1.0/editor-light.png)',
        '## Features\n\n* Added a reliable release workflow.',
        '**Full Changelog**: https://github.com/Aniol0012/tikz-drawer/compare/v2.0.0...v2.1.0'
      ].join('\n\n') + '\n'
    );
  });

  it('omits optional generated sections when their source is unavailable', () => {
    const body = buildReleaseBody({
      ...releaseInput,
      previousTag: '',
      hasSnapshot: false
    });

    expect(body).not.toContain('### Snapshot');
    expect(body).not.toContain('**Full Changelog**');
  });

  it('rejects an empty human-authored description or notes', () => {
    expect(() => buildReleaseBody({ ...releaseInput, description: ' ' })).toThrow('Release description is required.');
    expect(() => buildReleaseBody({ ...releaseInput, releaseNotes: '\n' })).toThrow('Release notes are required.');
  });
});
