import { EDITOR_STORAGE_KEYS } from '../constants/editor.constants';

export function aiDebugLoggingEnabled(flag?: boolean): boolean {
  return devModeEnabled() && (flag ?? storedAiDebugLoggingEnabled());
}

function devModeEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(EDITOR_STORAGE_KEYS.devMode) === 'true';
  } catch {
    return false;
  }
}

function storedAiDebugLoggingEnabled(): boolean {
  try {
    const raw = globalThis.localStorage?.getItem(EDITOR_STORAGE_KEYS.aiSettings);
    if (!raw) {
      return false;
    }

    const parsed = JSON.parse(raw) as { readonly debugLogs?: unknown };
    return parsed.debugLogs === true;
  } catch {
    return false;
  }
}
