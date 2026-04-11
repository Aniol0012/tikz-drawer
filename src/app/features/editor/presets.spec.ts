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

  it('uses the updated browser, phone, folder, message, kanban, sticky note and document compositions', () => {
    const browserPreset = objectPresets.find((preset) => preset.id === 'browser');
    const phonePreset = objectPresets.find((preset) => preset.id === 'phone');
    const folderPreset = objectPresets.find((preset) => preset.id === 'folder');
    const messagePreset = objectPresets.find((preset) => preset.id === 'message');
    const kanbanPreset = objectPresets.find((preset) => preset.id === 'kanban');
    const stickyNotePreset = objectPresets.find((preset) => preset.id === 'sticky-note');
    const documentPreset = objectPresets.find((preset) => preset.id === 'document');

    expect(browserPreset?.shapes.map((shape) => shape.kind)).toEqual([
      'rectangle',
      'line',
      'circle',
      'circle',
      'circle',
      'rectangle'
    ]);
    expect(phonePreset?.shapes.map((shape) => shape.kind)).toEqual(['rectangle', 'rectangle', 'rectangle', 'line']);
    expect(folderPreset?.shapes.map((shape) => shape.kind)).toEqual(['rectangle', 'rectangle', 'text']);
    expect(messagePreset?.shapes.map((shape) => shape.kind)).toEqual(['rectangle', 'line', 'line', 'text']);
    expect(kanbanPreset?.shapes.map((shape) => shape.kind)).toEqual([
      'rectangle',
      'line',
      'line',
      'text',
      'text',
      'text'
    ]);
    expect(stickyNotePreset?.shapes.map((shape) => shape.kind)).toEqual(['rectangle', 'line', 'line', 'line', 'text']);
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

    if (folderLabel?.kind === 'text') {
      expect(folderLabel.textBox).toBe(true);
      expect(folderLabel.y).toBeGreaterThan(-1.3);
    }

    const browserAddressBar = browserPreset?.shapes.find(
      (shape) => shape.kind === 'rectangle' && shape.name === 'Browser address bar'
    );
    expect(browserAddressBar?.kind).toBe('rectangle');
    if (browserAddressBar?.kind === 'rectangle') {
      expect(browserAddressBar.width).toBe(4);
      expect(browserAddressBar.x).toBe(-1.45);
    }

    expect(browserPreset?.preserveStyle).toBe(true);
    const browserDot = browserPreset?.shapes.find((shape) => shape.kind === 'circle' && shape.name === 'Browser dot 1');
    expect(browserDot?.kind).toBe('circle');
    if (browserDot?.kind === 'circle') {
      expect(browserDot.fill).toBe('#ff5f57');
      expect(browserDot.stroke).toBe('#d64b45');
    }

    const phoneNotch = phonePreset?.shapes.find((shape) => shape.kind === 'rectangle' && shape.name === 'Phone notch');
    expect(phoneNotch?.kind).toBeUndefined();

    const phoneIsland = phonePreset?.shapes.find(
      (shape) => shape.kind === 'rectangle' && shape.name === 'Phone island'
    );
    expect(phoneIsland?.kind).toBe('rectangle');

    const stickyNoteLabel = stickyNotePreset?.shapes.find(
      (shape) => shape.kind === 'text' && shape.name === 'Note label'
    );
    expect(stickyNoteLabel?.kind).toBe('text');
    if (stickyNoteLabel?.kind === 'text') {
      expect(stickyNoteLabel.textBox).toBe(true);
      expect(stickyNoteLabel.boxWidth).toBe(2.4);
      expect(stickyNoteLabel.x).toBe(-1.22);
      expect(stickyNoteLabel.fontSize).toBe(0.34);
    }

    const messageLabel = messagePreset?.shapes.find((shape) => shape.kind === 'text' && shape.name === 'Message text');
    expect(messageLabel?.kind).toBe('text');
    if (messageLabel?.kind === 'text') {
      expect(messageLabel.textBox).toBe(true);
      expect(messageLabel.boxWidth).toBe(2.9);
      expect(messageLabel.x).toBe(-1.45);
    }

    const documentFold = documentPreset?.shapes.find(
      (shape) => shape.kind === 'rectangle' && shape.name === 'Document fold'
    );
    expect(documentFold?.kind).toBe('rectangle');
  });
});
