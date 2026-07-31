import { inject, Injectable } from '@angular/core';
import type { ErrorHandler } from '@angular/core';
import { EditorDevModeService } from '../../features/editor/state/editor-dev-mode.service';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly devMode = inject(EditorDevModeService);

  handleError(error: unknown): void {
    if (!this.devMode.enabled()) {
      return;
    }

    console.error('[TikZ Drawer]', error);
  }
}
