import type { EditorPreferences, PersistedEditorState, TikzScene } from '../models/tikz.models';

export interface ProjectJsonExport {
  readonly format: 'tikz-drawer-project';
  readonly version: string;
  readonly exportedAt: string;
  readonly state: PersistedEditorState;
}

export const buildProjectJsonExport = (
  scene: TikzScene,
  preferences: EditorPreferences,
  importCode: string,
  version: string,
  exportedAt = new Date().toISOString()
): ProjectJsonExport => ({
  format: 'tikz-drawer-project',
  version,
  exportedAt,
  state: {
    scene,
    preferences,
    importCode
  }
});
