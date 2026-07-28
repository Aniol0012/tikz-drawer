import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { EDITOR_STORAGE_KEYS } from '../../../editor/constants/editor.constants';
import { CodeHighlightThemeService } from '../../../editor/state/code-highlight-theme.service';
import { EditorLocalStorageService } from '../../../editor/state/editor-local-storage.service';
import type { SitePageCodeSample } from '../../site-page-content';

@Component({
  selector: 'app-site-code-preview',
  templateUrl: './site-code-preview.component.html',
  styleUrl: './site-code-preview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteCodePreviewComponent {
  private readonly highlighter = inject(CodeHighlightThemeService);
  private readonly storage = inject(EditorLocalStorageService);

  readonly sample = input.required<SitePageCodeSample>();
  readonly highlightedCode = computed(() => this.highlighter.highlight(this.sample().value));
  readonly highlightThemeStyle = this.highlighter.cssVariableStyle(this.storage.getString(EDITOR_STORAGE_KEYS.codeTheme) ?? 'aurora');
}
