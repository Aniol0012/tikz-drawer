import { describe, expect, it } from 'vitest';
import { importDrawioSource, importProjectJson } from './import-sources';
import type { PersistedEditorState } from '../models/tikz.models';
import { defaultPreferences } from '../presets/presets';

describe('import sources', () => {
  it('imports draw.io connectors defined with explicit points', () => {
    const result = importDrawioSource(`
      <mxfile>
        <diagram>
          <mxGraphModel>
            <root>
              <mxCell id="0" />
              <mxCell id="1" parent="0" />
              <mxCell id="edge-1" edge="1" parent="1" style="endArrow=classic;strokeColor=#ff0000;">
                <mxGeometry relative="1" as="geometry">
                  <mxPoint x="40" y="80" as="sourcePoint" />
                  <mxPoint x="160" y="120" as="targetPoint" />
                </mxGeometry>
              </mxCell>
            </root>
          </mxGraphModel>
        </diagram>
      </mxfile>
    `);

    const line = result.scene.shapes.find((shape) => shape.kind === 'line');
    expect(line).toMatchObject({
      kind: 'line',
      from: { x: 1, y: 2 },
      to: { x: 4, y: 3 },
      arrowEnd: true,
      stroke: '#ff0000'
    });
  });

  it('imports draw.io arrow vertices as editable lines', () => {
    const result = importDrawioSource(`
      <mxfile>
        <diagram>
          <mxGraphModel>
            <root>
              <mxCell id="0" />
              <mxCell id="1" parent="0" />
              <mxCell id="arrow-1" vertex="1" parent="1" style="shape=singleArrow;strokeColor=#111111;fillColor=#eeeeee;">
                <mxGeometry x="80" y="40" width="160" height="40" as="geometry" />
              </mxCell>
            </root>
          </mxGraphModel>
        </diagram>
      </mxfile>
    `);

    expect(result.scene.shapes).toContainEqual(
      expect.objectContaining({
        kind: 'line',
        from: { x: 2, y: 1.5 },
        to: { x: 6, y: 1.5 },
        arrowEnd: true
      })
    );
  });

  it('imports project JSON without dropping embedded image data', () => {
    const state: PersistedEditorState = {
      preferences: defaultPreferences,
      importCode: '',
      scene: {
        name: 'Image scene',
        bounds: { width: 960, height: 640 },
        shapes: [
          {
            id: 'image-1',
            name: 'Embedded image',
            kind: 'image',
            stroke: 'none',
            strokeOpacity: 1,
            strokeWidth: 0,
            x: 0,
            y: 0,
            width: 4,
            height: 3,
            aspectRatio: 4 / 3,
            src: 'data:image/png;base64,abc123',
            latexSource: 'embedded.png',
            rotation: 0
          }
        ]
      }
    };

    const result = importProjectJson(JSON.stringify({ format: 'tikz-drawer-project', version: '1.0.0', state }), '1.0.0');

    expect(result.scene.shapes[0]).toMatchObject({
      kind: 'image',
      src: 'data:image/png;base64,abc123'
    });
  });
});
