import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EditorStore } from './editor.store';
import type { CanvasShape, TikzScene } from '../models/tikz.models';
import { DEFAULT_ARROW_TIP_KIND } from '../config/arrow-tip.config';

const importedScene = (name: string): TikzScene => ({
  name,
  bounds: { width: 960, height: 640 },
  shapes: [
    {
      id: `${name}-line`,
      name: 'Imported line',
      kind: 'line',
      stroke: '#0f172a',
      strokeOpacity: 1,
      strokeWidth: 0.08,
      from: { x: 0, y: 0 },
      to: { x: 1, y: 1 },
      anchors: [],
      lineMode: 'straight',
      strokeStyle: 'solid',
      arrowStart: false,
      arrowEnd: true,
      arrowType: 'latex',
      arrowColor: '#0f172a',
      arrowOpacity: 1,
      arrowOpen: false,
      arrowRound: false,
      arrowScale: 1,
      arrowLengthScale: 1,
      arrowWidthScale: 1,
      arrowBendMode: 'none'
    }
  ]
});

const blankScene = (): TikzScene => ({
  name: 'blank',
  bounds: { width: 960, height: 640 },
  shapes: []
});

const rectangleShape = (name: string): CanvasShape => ({
  id: crypto.randomUUID(),
  name,
  kind: 'rectangle',
  stroke: '#111111',
  strokeOpacity: 1,
  strokeWidth: 0.08,
  x: 0,
  y: 0,
  width: 2,
  height: 1,
  fill: '#ffffff',
  fillOpacity: 1,
  rotation: 0
});

describe('EditorStore import application', () => {
  let store: EditorStore;

  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [EditorStore]
    });
    store = TestBed.inject(EditorStore);
  });

  it('appends imported scenes by default', () => {
    const initialCount = store.scene().shapes.length;

    store.applyImportedScene(importedScene('first'), String.raw`\draw (0,0) -- (1,1);`, []);

    expect(store.scene().shapes).toHaveLength(initialCount + 1);
    expect(store.scene().shapes.at(-1)).toMatchObject({ kind: 'line', arrowEnd: true });
    expect(store.importCode()).toBe(String.raw`\draw (0,0) -- (1,1);`);
  });

  it('replaces the current scene when requested by the import dialog', () => {
    store.applyImportedScene(importedScene('replacement'), '', ['warning'], true);

    expect(store.scene()).toMatchObject({
      name: 'replacement',
      shapes: [{ kind: 'line', arrowEnd: true }]
    });
    expect(store.parserWarnings()).toEqual(['warning']);
  });

  it('can preserve an intentionally empty import code for non-LaTeX imports', () => {
    store.applyImportedScene(importedScene('mermaid'), '', [], false, true);

    expect(store.importCode()).toBe('');
  });

  it('falls back to the first arrow tip when a stored preference is empty', () => {
    store.patchPreferences({ defaultArrowType: '' as never });

    expect(store.preferences().defaultArrowType).toBe(DEFAULT_ARROW_TIP_KIND);
  });

  it('uses numbered names for inserted preset copies and duplicates', () => {
    store.applyScene(blankScene());

    const [firstRectangle] = store.addPreset('box');
    const [secondRectangle] = store.addPreset('box');
    store.setSelectedShapes([firstRectangle?.id ?? '']);
    store.duplicateSelected();

    expect(firstRectangle?.name).toBe('Rectangle (1)');
    expect(secondRectangle?.name).toBe('Rectangle (2)');
    expect(store.selectedShapes()[0]?.name).toBe('Rectangle (3)');
  });

  it('normalizes old copy suffixes before numbering duplicates', () => {
    const legacyShape = rectangleShape('Rectangle copy copy');
    store.applyScene({ ...blankScene(), shapes: [legacyShape] });
    store.setSelectedShapes([legacyShape.id]);

    store.duplicateSelected();

    expect(store.selectedShapes()[0]?.name).toBe('Rectangle (1)');
  });
});
