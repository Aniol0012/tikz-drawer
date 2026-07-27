import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('EditorPageComponent template', () => {
  const readTemplate = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/features/editor/components/editor-page/editor-page.component.html'), 'utf8');
  const readComponent = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/features/editor/components/editor-page/editor-page.component.ts'), 'utf8');

  it('keeps the inspector toggle and assistant entry available while auto-collapsed', async () => {
    const template = await readTemplate();

    expect(template).toContain('class="sidebar-resizer-toggle sidebar-resizer-toggle--right"');
    expect(template).toContain('(click)="openAssistant(); $event.stopPropagation()"');
    expect(template).not.toContain('is-inspector-hidden');
  });

  it('shows a tooltip-free LaTeX warning inside the input for the example placeholder', async () => {
    const template = await readTemplate();

    expect(template).toContain('class="image-path-input"');
    expect(template).toContain('@if (isDefaultLatexImagePath(shape))');
    expect(template).toContain('class="image-path-input__warning"');
    expect(template).not.toContain('[attr.data-tooltip]="\'latexImagePathWarning\' | translate"');
    expect(template).not.toContain('class="image-path-warning');
  });

  it('opens the assistant sidebar on every editor entry before auto-collapse settings apply', async () => {
    const component = await readComponent();

    expect(component).toContain("readonly inspectorTab = signal<InspectorTab>('assistant');");
    expect(component).toContain('readonly rightSidebarCollapsed = signal(this.initialSidebarCollapsed.right);');
    expect(component).toContain("if (this.inspectorTab() === 'assistant')");
  });

  it('keeps scene presets hidden from the library sidebar', async () => {
    const template = await readTemplate();
    const component = await readComponent();

    expect(template).not.toContain("'scenePresets' | translate");
    expect(component).toContain("private readonly librarySectionIds = new Set<string>(['savedTemplates', ...categoryOrder]);");
  });

  it('keeps a mobile overlay close action in the library panel', async () => {
    const template = await readTemplate();

    expect(template).toContain('class="icon-button library-close-button"');
    expect(template).toContain('(click)="closeMobileLibraryPanel()"');
  });

  it('groups context actions, keeps delete destructive, and exposes an accessible transform submenu', async () => {
    const template = await readTemplate();
    const component = await readComponent();

    expect(template).toContain('class="context-menu__section"');
    expect(template).toContain('[class.context-menu__section--danger]');
    expect(template).toContain('data-tooltip-disabled');
    expect(template).toContain('aria-haspopup="menu"');
    expect(template).toContain('[attr.aria-expanded]="contextTransformMenuOpen()"');
    expect(template).toContain('data-context-transform-item');
    expect(template).toContain('(mouseenter)="openContextTransformMenu()"');
    expect(template).toContain('(mouseenter)="closeContextTransformMenu()"');
    expect(template).toContain('[style.top.px]="contextSubmenuTop()"');
    expect(template).toContain('[class.context-menu--keyboard-navigation]="contextMenuKeyboardNavigation()"');
    expect(template).toContain('<app-editor-transform-actions');
    expect(template).toContain('class="selection-transform-actions"');
    expect(component).toContain("id: 'danger'");
    expect(component).toContain('runContextTransformAction(action: ContextTransformAction)');
    expect(component).toContain('onContextMenuKeydown(event: KeyboardEvent)');
    expect(component).toContain('openContextTransformMenu(focusFirstItem = false)');
    expect(component).toContain('triggerBounds.top - panelBounds.top');
    expect(component).toContain('keepContextTransformMenuInViewport()');
    expect(component).toContain('submenuBounds.bottom > view.innerHeight - padding');
    expect(component).toContain('handleWindowWheel(event: WheelEvent)');
    expect(component).toContain('EDITOR_CONTEXT_MENU_SCROLL_DISMISS_THRESHOLD_PX');
    expect(component).toContain('this.focusContextMenuItem(\'[role="menuitem"]:not(:disabled)\')');
  });

  it('keeps direct double-click text insertion wired on shapes', async () => {
    const template = await readTemplate();
    const component = await readComponent();

    expect(template).toContain('(dblclick)="onShapeDoubleClick($event, shape)"');
    expect(component).toContain('onCanvasDoubleClickCapture(event: MouseEvent)');
    expect(component).toContain('const shape = this.sceneShapeAtEvent(event);');
    expect(component).toContain("if (shape.kind !== 'text')");
    expect(component).toContain('this.isRepeatedSelectedShapeTap(shape.id)');
    expect(component).toContain('this.store.selectShape(shape.id);');
    expect(component).toContain('this.insertCenteredTextForSelectedShape(shape)');
  });

  it('keeps theme changes direct without overlay transitions', async () => {
    const template = await readTemplate();
    const component = await readComponent();

    expect(template).not.toContain('themeBubbleTransition');
    expect(template).not.toContain('theme-bubble-transition');
    expect(component).not.toContain('transitionThemeWithBubble');
    expect(component).not.toContain('themeBubbleTransition');
    expect(component).toContain('this.store.setTheme(nextTheme);');
    expect(component).not.toContain('startViewTransition');
  });

  it('opens export with the configured preferred LaTeX mode', async () => {
    const component = await readComponent();

    expect(component).toContain('openExportModal(mode: ExportMode = this.latexExportConfig().preferredExportMode)');
    expect(component).toContain('this.exportMode.set(mode);');
  });
});
