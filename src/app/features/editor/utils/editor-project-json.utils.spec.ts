import { describe, expect, it } from 'vitest';
import { defaultPreferences } from '../presets/presets';
import { buildProjectJsonExport } from './editor-project-json.utils';
import type { TikzScene } from '../models/tikz.models';

describe('editor project JSON utilities', () => {
  it('builds a native project payload that keeps embedded image sources', () => {
    const scene: TikzScene = {
      name: 'Image project',
      bounds: { width: 960, height: 640 },
      shapes: [
        {
          id: 'image-1',
          name: 'Reference',
          kind: 'image',
          stroke: 'none',
          strokeOpacity: 1,
          strokeWidth: 0,
          x: 1,
          y: 2,
          width: 4,
          height: 3,
          aspectRatio: 4 / 3,
          src: 'data:image/png;base64,abc123',
          latexSource: 'reference.png',
          rotation: 0
        }
      ]
    };

    const payload = buildProjectJsonExport(scene, defaultPreferences, String.raw`\draw (0,0) -- (1,1);`, '9.9.9', '2026-05-08T12:00:00.000Z');

    expect(payload).toMatchObject({
      format: 'tikz-drawer-project',
      version: '9.9.9',
      exportedAt: '2026-05-08T12:00:00.000Z',
      state: {
        importCode: String.raw`\draw (0,0) -- (1,1);`,
        scene: {
          name: 'Image project',
          shapes: [
            {
              kind: 'image',
              src: 'data:image/png;base64,abc123'
            }
          ]
        }
      }
    });
  });
});
