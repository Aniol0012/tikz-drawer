import { describe, expect, it } from 'vitest';
import { detectImportSourceKind, importDrawioSource, importMermaidSource, importProjectJson } from './import-sources';
import type { PersistedEditorState } from '../models/tikz.models';
import { defaultPreferences } from '../presets/presets';

describe('import sources', () => {
  it('detects Mermaid from graph code even without a Mermaid file extension', () => {
    expect(
      detectImportSourceKind(`
        flowchart TD
          Start --> Stop
      `)
    ).toBe('mermaid');
  });

  it('detects TikZ before generic graph syntax when LaTeX drawing commands are present', () => {
    expect(
      detectImportSourceKind(`
        \\begin{tikzpicture}
          \\draw (0,0) -- (1,1);
        \\end{tikzpicture}
      `)
    ).toBe('tikz');
  });

  it('uses file extension as a fallback when content is empty or ambiguous', () => {
    expect(detectImportSourceKind('', 'diagram.mmd')).toBe('mermaid');
    expect(detectImportSourceKind('Node A', 'figure.tex')).toBe('tex');
  });

  it('imports Mermaid flowchart fan-out as separate anchored edges and nodes', () => {
    const result = importMermaidSource(`
      ---
      title: Simple Approach to Cause and Effect Diagrams (Flowchart)
      ---
      flowchart TD
        a[Cause A]
        b[Cause B]
        c[Cause C]
        d[Cause D]
        e[Cause E]
        problem --> a & b
        a --> c
        b --> d & e
    `);

    const labels = result.scene.shapes.filter((shape) => shape.kind === 'text').map((shape) => shape.text);
    const lines = result.scene.shapes.filter((shape) => shape.kind === 'line');

    expect(result.importCode).toBe('');
    expect(result.preserveImportCode).toBe(true);
    expect(labels).toEqual(expect.arrayContaining(['problem', 'Cause A', 'Cause B', 'Cause C', 'Cause D', 'Cause E']));
    expect(labels).not.toContain('a & b');
    expect(labels).not.toContain('d & e');
    expect(lines).toHaveLength(5);
    expect(lines.every((line) => line.fromAttachment && line.toAttachment)).toBe(true);
  });

  it('imports Mermaid mindmaps as a hierarchy with anchored branches', () => {
    const result = importMermaidSource(`
      ---
      title: Simple Approach to Cause and Effect Diagrams (Flowchart)
      ---
      mindmap
      root((Problem))
        Cause A
          Cause C
        Cause B
          Cause D
          Cause E
    `);

    const texts = result.scene.shapes.filter((shape) => shape.kind === 'text');
    const labels = texts.map((shape) => shape.text);
    const lines = result.scene.shapes.filter((shape) => shape.kind === 'line');
    const causeC = texts.find((shape) => shape.text === 'Cause C');
    const causeD = texts.find((shape) => shape.text === 'Cause D');

    expect(labels).toEqual(expect.arrayContaining(['Problem', 'Cause A', 'Cause B', 'Cause C', 'Cause D', 'Cause E']));
    expect(lines).toHaveLength(5);
    expect(lines.every((line) => line.arrowEnd === false && line.fromAttachment && line.toAttachment)).toBe(true);
    expect(texts.every((shape) => shape.textBox && shape.textAlign === 'center')).toBe(true);
    expect(Math.abs((causeD?.x ?? 0) - (causeC?.x ?? 0))).toBeGreaterThan(2);
  });

  it('imports draw.io connectors between vertices with arrow and intermediate anchors', () => {
    const result = importDrawioSource(`
      <mxfile>
        <diagram>
          <mxGraphModel>
            <root>
              <mxCell id="0" />
              <mxCell id="1" parent="0" />
              <mxCell id="source" vertex="1" parent="1" style="rounded=1;whiteSpace=wrap;html=1;">
                <mxGeometry x="40" y="80" width="120" height="60" as="geometry" />
              </mxCell>
              <mxCell id="target" vertex="1" parent="1" style="ellipse;whiteSpace=wrap;html=1;">
                <mxGeometry x="320" y="80" width="120" height="60" as="geometry" />
              </mxCell>
              <mxCell id="edge-1" edge="1" parent="1" source="source" target="target" style="endArrow=block;dashed=1;strokeColor=#00aa88;">
                <mxGeometry relative="1" as="geometry">
                  <Array as="points">
                    <mxPoint x="220" y="80" />
                  </Array>
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
      from: { x: 2.5, y: 2.75 },
      to: { x: 9.5, y: 2.75 },
      arrowEnd: true,
      arrowType: 'triangle',
      strokeStyle: 'dashed',
      stroke: '#00aa88'
    });
  });

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

  it('warns when the project JSON version differs from the running app version', () => {
    const state: PersistedEditorState = {
      preferences: defaultPreferences,
      importCode: '',
      scene: {
        name: 'Blank',
        bounds: { width: 960, height: 640 },
        shapes: []
      }
    };

    const result = importProjectJson(JSON.stringify({ version: '1.0.0', state }), '2.0.0');

    expect(result.warnings).toEqual(['Project version 1.0.0 differs from app version 2.0.0; loaded without migration.']);
  });

  it('rejects JSON files that do not contain a project scene', () => {
    expect(() => importProjectJson(JSON.stringify({ hello: 'world' }), '1.0.0')).toThrow('The JSON file is not a valid Tikz Drawer project.');
  });
});
