import '@angular/compiler';
import { signal } from '@angular/core';
import { EditorPageComponent } from './editor-page.component';
import type { ClipboardShapeSet } from './editor-page.types';
import { objectPresets } from '../../presets/presets';

describe('EditorPageComponent clipboard interactions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const editorHarness = (): EditorPageComponent => {
    const editor = Object.create(EditorPageComponent.prototype) as EditorPageComponent;
    Object.assign(editor, {
      clipboardShapes: signal<ClipboardShapeSet | null>(null),
      clipboardMarker: '',
      clipboardWritePromise: null,
      selectedShapes: () => structuredClone(objectPresets.find((preset) => preset.id === 'image')?.shapes ?? []),
      runAsync: (task: Promise<void>) => task.catch(() => undefined),
      viewportCenter: () => ({ x: 0, y: 0 }),
      snapScenePoint: (point: { x: number; y: number }) => point,
      imageSourceToPngBlob: async () => new Blob(['image'], { type: 'image/png' })
    });
    return editor;
  };

  it('waits for a pending image copy before reading the clipboard through the paste menu', async () => {
    let finishCopy!: () => void;
    const copying = new Promise<void>((resolve) => {
      finishCopy = resolve;
    });
    const clipboard = {
      write: vi.fn((_items: ClipboardItem[]) => copying),
      read: vi.fn(async () => [])
    };
    vi.stubGlobal('navigator', { clipboard });
    vi.stubGlobal(
      'ClipboardItem',
      class {
        constructor(readonly data: Record<string, Blob | Promise<Blob>>) {}
      }
    );
    const editor = editorHarness();
    const pasteInternal = vi.fn(() => true);
    Object.assign(editor, { pasteInternalClipboard: pasteInternal });

    editor.copySelected();
    const paste = editor.pasteClipboard();
    expect(clipboard.read).not.toHaveBeenCalled();
    finishCopy();
    await paste;

    expect(clipboard.write).toHaveBeenCalledOnce();
    expect(clipboard.read).toHaveBeenCalledOnce();
    expect(pasteInternal).toHaveBeenCalledOnce();
    const formats = clipboard.write.mock.calls[0]?.[0] as unknown as { data: Record<string, Blob | Promise<Blob>> }[];
    expect(Object.keys(formats[0].data)).toEqual(['image/png', 'text/plain']);
  });

  it('inserts an external paste event image despite a stale internal selection', async () => {
    vi.stubGlobal('navigator', {});
    const editor = editorHarness();
    const file = new File(['new'], 'new.png', { type: 'image/png' });
    const insertImage = vi.fn(async () => undefined);
    const pasteInternal = vi.fn(() => true);
    Object.assign(editor, {
      clipboardMarker: 'old-copy',
      clipboardShapes: signal({ shapes: editor.selectedShapes(), pasteCount: 0 }),
      insertImageFileAtPoint: insertImage,
      pasteInternalClipboard: pasteInternal
    });
    const event = {
      target: document.body,
      clipboardData: { items: [], files: [file], getData: () => '' },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    } as unknown as ClipboardEvent;

    editor.handleWindowPaste(event);
    await vi.waitFor(() => expect(insertImage).toHaveBeenCalledWith(file, { x: 0, y: 0 }));

    expect(pasteInternal).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });
});
