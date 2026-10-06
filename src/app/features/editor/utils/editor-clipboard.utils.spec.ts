import { readEditorSystemClipboard, resolveEditorClipboardPaste } from './editor-clipboard.utils';

describe('editor clipboard', () => {
  const image = new File(['new-image'], 'new.png', { type: 'image/png' });
  const marker = 'tikz-drawer:clipboard:current-copy';

  it('pastes a newly copied external image instead of an older internal image or selection', () => {
    expect(resolveEditorClipboardPaste({ imageFile: image, marker: '' }, marker, true)).toEqual({ source: 'image', file: image });
    expect(resolveEditorClipboardPaste({ imageFile: image, marker: 'tikz-drawer:clipboard:old-copy' }, marker, true)).toEqual({ source: 'image', file: image });
  });

  it('keeps the full internal image properties when pasting the current editor copy', () => {
    expect(resolveEditorClipboardPaste({ imageFile: image, marker }, marker, true)).toEqual({ source: 'internal' });
  });

  it('supports repeated internal pastes and cut selections without a system image', () => {
    expect(resolveEditorClipboardPaste({ imageFile: null, marker }, marker, true)).toEqual({ source: 'internal' });
  });

  it('falls back to internal copies when clipboard access is unavailable or denied', async () => {
    expect(await readEditorSystemClipboard(undefined)).toBeNull();
    const clipboard = { read: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')) };
    expect(await readEditorSystemClipboard(clipboard)).toBeNull();
    expect(resolveEditorClipboardPaste(null, marker, true)).toEqual({ source: 'internal' });
    expect(resolveEditorClipboardPaste(null, '', false)).toEqual({ source: 'none' });
  });

  it('imports an editor image from another session when no internal selection is available', () => {
    expect(resolveEditorClipboardPaste({ imageFile: image, marker }, marker, false)).toEqual({ source: 'image', file: image });
  });

  it('reads image data and editor provenance from the same system clipboard item', async () => {
    const textBlob = new Blob([marker], { type: 'text/plain' });
    Object.defineProperty(textBlob, 'text', { value: async () => marker });
    const clipboard = {
      read: vi.fn(async () => [
        {
          types: ['image/png', 'text/plain'],
          getType: async (type: string) => (type === 'text/plain' ? textBlob : image)
        } as ClipboardItem
      ])
    };

    const result = await readEditorSystemClipboard(clipboard);

    expect(clipboard.read).toHaveBeenCalledOnce();
    expect(result?.marker).toBe(marker);
    expect(result?.imageFile).toMatchObject({ name: 'clipboard-image.png', type: 'image/png', size: image.size });
    expect(resolveEditorClipboardPaste(result, marker, true)).toEqual({ source: 'internal' });
  });
});
