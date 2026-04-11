import { localizePresetCanvasShapes, objectPresets } from './presets';

const translate =
  (dictionary: Record<string, string>) =>
  (key: string, fallback: string): string =>
    dictionary[key] ?? fallback;

describe('presets', () => {
  it('localizes placeholder content for the image preset', () => {
    const imagePreset = objectPresets.find((preset) => preset.id === 'image');
    expect(imagePreset).toBeDefined();

    const localized = localizePresetCanvasShapes(
      structuredClone(imagePreset?.shapes ?? []),
      translate({
        'preset.image.title': 'Imatge'
      })
    );

    expect(localized).toHaveLength(1);
    expect(localized[0]?.kind).toBe('image');
    if (localized[0]?.kind !== 'image') {
      throw new Error('Expected the image preset to contain an image');
    }

    expect(decodeURIComponent(localized[0].src)).toContain('>Imatge<');
  });

  it('localizes kanban column labels', () => {
    const kanbanPreset = objectPresets.find((preset) => preset.id === 'kanban');
    expect(kanbanPreset).toBeDefined();

    const localized = localizePresetCanvasShapes(
      structuredClone(kanbanPreset?.shapes ?? []),
      translate({
        'presetText.kanban.todo': 'Pendiente',
        'presetText.kanban.doing': 'En curso',
        'presetText.kanban.done': 'Hecho'
      })
    );

    const texts = localized
      .filter((shape): shape is Extract<(typeof localized)[number], { kind: 'text' }> => shape.kind === 'text')
      .map((shape) => shape.text);

    expect(texts).toEqual(['Pendiente', 'En curso', 'Hecho']);
  });

  it('uses the updated browser, phone, folder, kanban and document compositions', () => {
    const browserPreset = objectPresets.find((preset) => preset.id === 'browser');
    const phonePreset = objectPresets.find((preset) => preset.id === 'phone');
    const folderPreset = objectPresets.find((preset) => preset.id === 'folder');
    const kanbanPreset = objectPresets.find((preset) => preset.id === 'kanban');
    const documentPreset = objectPresets.find((preset) => preset.id === 'document');

    expect(browserPreset?.shapes.map((shape) => shape.kind)).toEqual([
      'rectangle',
      'line',
      'circle',
      'circle',
      'circle',
      'rectangle',
      'line'
    ]);
    expect(phonePreset?.shapes.map((shape) => shape.kind)).toEqual([
      'rectangle',
      'rectangle',
      'rectangle',
      'circle',
      'line'
    ]);
    expect(folderPreset?.shapes.map((shape) => shape.kind)).toEqual(['rectangle', 'rectangle', 'text']);
    expect(kanbanPreset?.shapes.map((shape) => shape.kind)).toEqual([
      'rectangle',
      'line',
      'line',
      'text',
      'text',
      'text'
    ]);
    expect(documentPreset?.shapes.map((shape) => shape.kind)).toEqual([
      'rectangle',
      'rectangle',
      'line',
      'line',
      'line',
      'line',
      'line',
      'line',
      'line'
    ]);

    const folderLabel = folderPreset?.shapes.find((shape) => shape.kind === 'text');
    expect(folderLabel?.kind).toBe('text');
    if (folderLabel?.kind !== 'text') {
      throw new Error('Expected folder preset to include a text label');
    }

    expect(folderLabel.y).toBeLessThan(-2);

    const browserAddressBar = browserPreset?.shapes.find(
      (shape) => shape.kind === 'rectangle' && shape.name === 'Browser address bar'
    );
    expect(browserAddressBar?.kind).toBe('rectangle');

    const phoneNotch = phonePreset?.shapes.find((shape) => shape.kind === 'rectangle' && shape.name === 'Phone notch');
    expect(phoneNotch?.kind).toBe('rectangle');

    const documentFold = documentPreset?.shapes.find(
      (shape) => shape.kind === 'rectangle' && shape.name === 'Document fold'
    );
    expect(documentFold?.kind).toBe('rectangle');
  });
});
