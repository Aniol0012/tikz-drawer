import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { SharedScenePayload } from '../../i18n/editor-page.i18n';
import { EditorTranslatePipe } from '../../i18n/editor-translate.pipe';
import type { ImportDialogResult } from '../../import/import-sources';

type ImportReplacementRequest =
  | {
      readonly kind: 'import';
      readonly result: ImportDialogResult;
    }
  | {
      readonly kind: 'share';
      readonly state: SharedScenePayload;
    };

@Component({
  selector: 'app-import-replace-dialog',
  imports: [EditorTranslatePipe],
  templateUrl: './import-replace-dialog.component.html',
  styleUrl: './import-replace-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportReplaceDialogComponent {
  readonly iconMap = input.required<Record<string, string>>();

  readonly downloadBackup = output<void>();
  readonly importAccepted = output<ImportDialogResult>();
  readonly importCancelled = output<void>();
  readonly shareAccepted = output<SharedScenePayload>();
  readonly shareCancelled = output<void>();

  readonly request = signal<ImportReplacementRequest | null>(null);
  readonly sourceLabelKey = computed(() => (this.request()?.kind === 'share' ? 'importReplaceDialogSharedSource' : 'importReplaceDialogImportSource'));

  requestImportReplacement(result: ImportDialogResult): void {
    this.request.set({ kind: 'import', result });
  }

  requestSharedReplacement(state: SharedScenePayload): void {
    this.request.set({ kind: 'share', state });
  }

  isOpen(): boolean {
    return this.request() !== null;
  }

  close(): void {
    const request = this.request();
    this.request.set(null);

    if (request?.kind === 'import') {
      this.importCancelled.emit();
      return;
    }

    if (request?.kind === 'share') {
      this.shareCancelled.emit();
    }
  }

  confirm(): void {
    const request = this.request();
    if (!request) {
      return;
    }

    this.request.set(null);
    if (request.kind === 'import') {
      this.importAccepted.emit(request.result);
      return;
    }

    this.shareAccepted.emit(request.state);
  }
}
