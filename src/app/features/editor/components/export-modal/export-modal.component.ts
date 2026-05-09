import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ThemeMode } from '../../models/tikz.models';
import { EditorTranslatePipe } from '../../i18n/editor-translate.pipe';
import type { ExportMode } from '../editor-page/editor-page.types';
import { CopyButtonComponent, type CopyButtonValueResolver } from '../../../../shared/copy-button/copy-button.component';

@Component({
  selector: 'app-export-modal',
  imports: [CopyButtonComponent, EditorTranslatePipe],
  templateUrl: './export-modal.component.html',
  styleUrl: './export-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-theme]': 'theme()'
  }
})
export class ExportModalComponent {
  readonly theme = input.required<ThemeMode>();
  readonly iconMap = input.required<Record<string, string>>();
  readonly exportMode = input.required<ExportMode>();
  readonly shareUrl = input.required<string>();
  readonly exportImports = input.required<string>();
  readonly exportCode = input.required<string>();
  readonly highlightedExportImports = input.required<string>();
  readonly highlightedExportCode = input.required<string>();
  readonly shareLinkCopyValue = input.required<CopyButtonValueResolver>();

  readonly closeDialog = output<void>();
  readonly exportModeChange = output<ExportMode>();
  readonly shareLinkCopied = output<string>();
  readonly copyError = output<unknown>();
  readonly downloadPng = output<void>();
  readonly downloadSvg = output<void>();
  readonly downloadProjectJson = output<void>();
  readonly openSettings = output<void>();
  readonly downloadTex = output<void>();

  icon(key: string): string {
    return this.iconMap()[key] ?? '';
  }
}
