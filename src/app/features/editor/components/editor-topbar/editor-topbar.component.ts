import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import type { LanguageCode } from '../../i18n/editor-page.i18n';
import type { ThemeMode } from '../../models/tikz.models';
import type { TopbarTool } from './editor-topbar.types';

@Component({
  selector: 'app-editor-topbar',
  templateUrl: './editor-topbar.component.html',
  styleUrl: './editor-topbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-theme]': 'theme()'
  }
})
export class EditorTopbarComponent {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly topbarActions = viewChild.required<ElementRef<HTMLDivElement>>('topbarActions');

  readonly appVersion = input.required<string>();
  readonly sceneName = input.required<string>();
  readonly theme = input.required<ThemeMode>();
  readonly language = input.required<LanguageCode>();
  readonly mobileLayout = input.required<boolean>();
  readonly overlayLibraryLayout = input.required<boolean>();
  readonly viewportWidth = input.required<number>();
  readonly fileMenuOpen = input.required<boolean>();
  readonly activeTool = input.required<string>();
  readonly defaultToolbarTools = input.required<readonly TopbarTool[]>();
  readonly pinnedToolbarTools = input.required<readonly TopbarTool[]>();
  readonly iconMap = input.required<Record<string, string>>();
  readonly translate = input.required<(key: string) => string>();

  readonly sceneNameChange = output<string>();
  readonly activeToolChange = output<string>();
  readonly languageChange = output<LanguageCode>();
  readonly themeToggle = output<void>();
  readonly newScene = output<void>();
  readonly copyShareLink = output<void>();
  readonly fileMenuToggle = output<void>();
  readonly fileMenuClose = output<void>();
  readonly mobileLibraryOpen = output<void>();
  readonly exportOpen = output<void>();

  readonly compactTopbarActions = signal(false);
  private readonly windowWidth = signal(typeof globalThis.innerWidth === 'number' ? globalThis.innerWidth : 1280);

  constructor() {
    effect(() => {
      this.viewportWidth();
      this.windowWidth();
      this.mobileLayout();
      this.fileMenuOpen();
      queueMicrotask(() => this.updateCompactTopbarActions());
    });

    afterNextRender(() => {
      const topbarActions = this.topbarActions().nativeElement;
      const win = this.document.defaultView;
      const updateWindowWidth = () => {
        this.windowWidth.set(win?.innerWidth ?? globalThis.innerWidth ?? 1280);
      };

      const resizeObserver = new ResizeObserver(() => this.updateCompactTopbarActions());
      resizeObserver.observe(topbarActions);
      updateWindowWidth();
      this.updateCompactTopbarActions();
      win?.addEventListener('resize', updateWindowWidth);

      this.destroyRef.onDestroy(() => {
        resizeObserver.disconnect();
        win?.removeEventListener('resize', updateWindowWidth);
      });
    });
  }

  t(key: string): string {
    return this.translate()(key);
  }

  icon(key: string): string {
    return this.iconMap()[key] ?? '';
  }

  onSceneNameInput(event: Event): void {
    this.sceneNameChange.emit((event.target as HTMLInputElement).value);
  }

  onLanguageChange(event: Event, closeMenu: boolean = false): void {
    this.languageChange.emit((event.target as HTMLSelectElement).value as LanguageCode);
    if (closeMenu) {
      this.fileMenuClose.emit();
    }
  }

  private updateCompactTopbarActions(): void {
    const topbarActions = this.topbarActions()?.nativeElement;
    if (!topbarActions) {
      return;
    }

    const compact =
      topbarActions.scrollWidth > topbarActions.clientWidth + 1 ||
      this.viewportWidth() <= 1180 ||
      this.windowWidth() <= 1320;
    this.compactTopbarActions.set(compact);
    if (!compact && this.fileMenuOpen()) {
      this.fileMenuClose.emit();
    }
  }
}
