export interface EditorSystemClipboard {
  readonly imageFile: File | null;
  readonly marker: string;
}

export type EditorClipboardPaste = { readonly source: 'internal' } | { readonly source: 'image'; readonly file: File } | { readonly source: 'none' };

export const resolveEditorClipboardPaste = (
  clipboard: EditorSystemClipboard | null,
  internalMarker: string,
  hasInternalShapes: boolean
): EditorClipboardPaste => {
  if (hasInternalShapes && internalMarker && clipboard?.marker === internalMarker) {
    return { source: 'internal' };
  }
  if (clipboard?.imageFile) {
    return { source: 'image', file: clipboard.imageFile };
  }
  return { source: hasInternalShapes ? 'internal' : 'none' };
};

export const readEditorSystemClipboard = async (clipboard: Pick<Clipboard, 'read'> | undefined): Promise<EditorSystemClipboard | null> => {
  if (!clipboard?.read) {
    return null;
  }
  try {
    const items = await clipboard.read();
    let marker = '';
    let imageFile: File | null = null;
    for (const item of items) {
      if (item.types.includes('text/plain')) {
        marker = await (await item.getType('text/plain')).text();
      }
      const imageType = item.types.find((type) => type.startsWith('image/'));
      if (imageType && !imageFile) {
        const blob = await item.getType(imageType);
        const extension = imageType.split('/')[1] || 'png';
        imageFile = new File([blob], `clipboard-image.${extension}`, { type: imageType });
      }
    }
    return { imageFile, marker };
  } catch {
    return null;
  }
};
