import { Injector, runInInjectionContext, signal } from '@angular/core';
import type { ErrorHandler } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorDevModeService } from '../../features/editor/state/editor-dev-mode.service';
import { AppErrorHandler } from './app-error-handler';

describe('AppErrorHandler', () => {
  const devModeEnabled = signal(false);
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    devModeEnabled.set(false);
    const injector = Injector.create({
      providers: [
        {
          provide: EditorDevModeService,
          useValue: { enabled: devModeEnabled }
        }
      ]
    });
    errorHandler = runInInjectionContext(injector, () => new AppErrorHandler());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps application errors out of the production console', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    errorHandler.handleError(new Error('route chunk unavailable'));

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('logs application errors when the internal dev mode is enabled', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('route chunk unavailable');
    devModeEnabled.set(true);

    errorHandler.handleError(error);

    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith('[TikZ Drawer]', error);
  });
});
