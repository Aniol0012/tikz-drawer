import '@angular/compiler';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_EDITOR_SCALE, EDITOR_SCALE_MAX, EDITOR_SCALE_MIN } from '../../constants/editor.constants';
import { defaultPreferences } from '../../presets/presets';
import { EditorStore } from '../../state/editor.store';
import { EDITOR_CONTEXT_MENU_ACTIONS, EditorConfigurationService } from '../../state/editor-configuration.service';
import { DEFAULT_KEYBOARD_SHORTCUTS } from '../../utils/editor-keyboard.utils';
import { AppConfigurationDialogComponent, type ApplicationConfigurationTab } from './app-configuration-dialog.component';

describe('AppConfigurationDialogComponent', () => {
  let fixture: ComponentFixture<AppConfigurationDialogComponent>;
  let component: AppConfigurationDialogComponent;
  let store: EditorStore;
  let configuration: EditorConfigurationService;
  let closeSpy: ReturnType<typeof vi.fn>;
  const componentDir = dirname(fileURLToPath(import.meta.url));
  const resourceDirs = new Map([
    ['app-configuration-dialog.component.html', componentDir],
    ['app-configuration-dialog.component.css', componentDir],
    ['app-select.component.html', resolve(process.cwd(), 'src/app/shared/app-select')],
    ['app-select.component.css', resolve(process.cwd(), 'src/app/shared/app-select')],
    ['badge.component.html', resolve(process.cwd(), 'src/app/shared/badge')],
    ['badge.component.css', resolve(process.cwd(), 'src/app/shared/badge')],
    ['toggle-field.component.html', resolve(process.cwd(), 'src/app/shared/toggle-field')],
    ['toggle-field.component.css', resolve(process.cwd(), 'src/app/shared/toggle-field')],
    ['range-input-card.component.html', resolve(process.cwd(), 'src/app/features/editor/components/range-input-card')],
    ['range-input-card.component.css', resolve(process.cwd(), 'src/app/features/editor/components/range-input-card')],
    ['keyboard-shortcut-capture.component.html', resolve(process.cwd(), 'src/app/features/editor/components/keyboard-shortcut-capture')],
    ['keyboard-shortcut-capture.component.css', resolve(process.cwd(), 'src/app/features/editor/components/keyboard-shortcut-capture')],
    ['color-picker.component.html', resolve(process.cwd(), 'src/app/features/editor/components/color-picker')],
    ['color-picker.component.css', resolve(process.cwd(), 'src/app/features/editor/components/color-picker')],
    ['ai-sparkles-icon.component.html', resolve(process.cwd(), 'src/app/features/editor/components/ai-sparkles-icon')],
    ['ai-sparkles-icon.component.css', resolve(process.cwd(), 'src/app/features/editor/components/ai-sparkles-icon')],
    ['scene-icon.component.html', resolve(process.cwd(), 'src/app/features/editor/components/scene-icon')],
    ['scene-icon.component.css', resolve(process.cwd(), 'src/app/features/editor/components/scene-icon')]
  ]);

  beforeAll(async () => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    await resolveComponentResources((url) => {
      const resourceDir = resourceDirs.get(basename(url));
      return readFile(resolve(resourceDir ?? componentDir, basename(url)), 'utf8');
    });
  });

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AppConfigurationDialogComponent],
      providers: [EditorStore, EditorConfigurationService]
    }).compileComponents();

    fixture = TestBed.createComponent(AppConfigurationDialogComponent);
    component = fixture.componentInstance;
    closeSpy = vi.fn();
    component.closeDialog.subscribe(closeSpy);
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('initialTab', 'general' satisfies ApplicationConfigurationTab);
    fixture.componentRef.setInput('suggestedCaption', 'Suggested caption');
    fixture.componentRef.setInput('suggestedLabel', 'fig:suggested');
    fixture.detectChanges();
    store = TestBed.inject(EditorStore);
    configuration = TestBed.inject(EditorConfigurationService);
  });

  it('opens on the requested tab and supports roving keyboard navigation', () => {
    component.initialTab = 'scene';
    component.open = true;

    expect(component.activeTab()).toBe('scene');

    component.onTabKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }), 'scene');

    expect(component.activeTab()).toBe('latex');
  });

  it('centralizes scene preference updates through the dialog', () => {
    component.updatePreferenceBoolean('showGrid', false);
    component.updatePreferenceNumber('snapStep', { target: { value: '4' } } as unknown as Event, 0.05, 2);
    component.updatePreferenceNumber('gridStep', { target: { value: '9' } } as unknown as Event, 0.25, 4);
    component.updatePreferenceNumber('objectSnapTolerance', { target: { value: '99' } } as unknown as Event, 2, 32);
    component.updatePreferenceText('defaultStroke', { target: { value: '#ff0000' } } as unknown as Event);

    expect(store.preferences()).toMatchObject({
      showGrid: false,
      snapStep: 2,
      gridStep: 4,
      objectSnapTolerance: 32,
      defaultStroke: '#ff0000'
    });
  });

  it('configures complete text defaults and mirrors alignment in the preview', () => {
    component.setDefaultTextWeight('bold');
    component.setDefaultTextStyle('italic');
    component.setDefaultTextDecoration('underline');
    component.setDefaultTextAlign('right');

    expect(store.preferences()).toMatchObject({
      defaultTextWeight: 'bold',
      defaultTextStyle: 'italic',
      defaultTextDecoration: 'underline',
      defaultTextAlign: 'right'
    });
    expect(component.previewTextAnchor()).toBe('end');
    expect(component.previewTextX()).toBe(188);
  });

  it('uses grid spacing and zoom together in the live preview', () => {
    store.patchPreferences({ scale: DEFAULT_EDITOR_SCALE, gridStep: 2, objectSnapTolerance: 24 });

    expect(component.previewGridSize()).toBe(28);
    expect(component.previewSnapGuideInset()).toBe(18);
  });

  it('keeps object snap guide settings nested under object snapping in the scene template', async () => {
    const template = await readFile(resolve(componentDir, 'app-configuration-dialog.component.html'), 'utf8');
    const objectSnapIndex = template.indexOf('[label]="\'snapToObjects\' | translate"');
    const guideSnapConditionIndex = template.indexOf('@if (preferences().snapToObjects)');
    const guideSnapIndex = template.indexOf('[label]="\'showObjectSnapGuides\' | translate"');

    expect(objectSnapIndex).toBeGreaterThan(-1);
    expect(guideSnapConditionIndex).toBeGreaterThan(objectSnapIndex);
    expect(guideSnapIndex).toBeGreaterThan(guideSnapConditionIndex);
  });

  it('exposes configuration import and export actions in the navigation', async () => {
    const template = await readFile(resolve(componentDir, 'app-configuration-dialog.component.html'), 'utf8');

    expect(template).toContain('#configurationImportInput');
    expect(template).toContain('(change)="importConfiguration($event)"');
    expect(template).toContain('(click)="triggerConfigurationImport(configurationDropdown)"');
    expect(template).toContain('(click)="exportConfiguration(configurationDropdown)"');
    expect(template).toContain('configurationImportError()');
  });

  it('accepts only explicit image directory paths while allowing spaces', () => {
    component.updateDefaultImagePath({ target: { value: '/project/image assets/' } } as unknown as Event);

    expect(store.preferences().defaultImagePath).toBe('/project/image assets');
    expect(component.defaultImagePathInvalid()).toBe(false);

    component.updateDefaultImagePath({ target: { value: 'https://example.com/images' } } as unknown as Event);

    expect(store.preferences().defaultImagePath).toBe('/project/image assets');
    expect(component.defaultImagePathInvalid()).toBe(true);
  });

  it('uses the editor zoom range and clamps through the same scale constants', () => {
    component.updateZoomPercent({ target: { value: '999' } } as unknown as Event);

    expect(store.preferences().scale).toBe(EDITOR_SCALE_MAX);
    expect(component.maxZoomPercent).toBe(Math.round((EDITOR_SCALE_MAX / DEFAULT_EDITOR_SCALE) * 100));

    component.updateZoomPercent({ target: { value: '1' } } as unknown as Event);

    expect(store.preferences().scale).toBe(EDITOR_SCALE_MIN);
    expect(component.minZoomPercent).toBe(Math.round((EDITOR_SCALE_MIN / DEFAULT_EDITOR_SCALE) * 100));
  });

  it('shows the full configured zoom only while the zoom control is being edited', () => {
    store.patchPreferences({ scale: DEFAULT_EDITOR_SCALE * 2 });

    expect(component.previewViewBox()).toBe('0 0 300 220');

    component.previewZoomEditing.set(true);
    const editingViewBox = component.previewViewBox().split(' ').map(Number);

    expect(editingViewBox[2]).toBeCloseTo(150);
    expect(editingViewBox[3]).toBeCloseTo(110);

    component.previewZoomEditing.set(false);

    expect(component.previewViewBox()).toBe('0 0 300 220');
  });

  it('reuses the shared arrow tip descriptors for the configuration dropdown', () => {
    const options = component.arrowTipSelectOptions();

    expect(options.map((option) => option.value)).toContain('straight-barb');
    expect(options.every((option) => option.iconPath)).toBe(true);
    expect(options.find((option) => option.value === 'triangle')?.iconFilled).toBe(true);
  });

  it('adds line-style icons to the default line style dropdown', () => {
    const options = component.lineStrokeStyleSelectOptions();

    expect(options.map((option) => option.value)).toEqual(['solid', 'dashed', 'dotted', 'dash-dotted', 'loosely-dashed']);
    expect(options.every((option) => option.iconPath)).toBe(true);
  });

  it('updates general configuration and editable keyboard shortcuts', () => {
    component.updateGeneralBoolean('showHelpTooltips', false);
    component.updateGeneralBoolean('whiteCanvasInDarkMode', true);
    component.updateGeneralBoolean('showInspectorOnlyWithSelection', true);
    component.updateGeneralBoolean('showMinimap', false);
    component.updateGeneralBoolean('confirmSceneReplacement', false);

    expect(configuration.generalConfig().showHelpTooltips).toBe(false);
    expect(configuration.generalConfig().whiteCanvasInDarkMode).toBe(true);
    expect(configuration.generalConfig().showInspectorOnlyWithSelection).toBe(true);
    expect(configuration.generalConfig().showMinimap).toBe(false);
    expect(configuration.generalConfig().confirmSceneReplacement).toBe(false);
    expect(component.settingsAreDefault()).toBe(false);

    component.openShortcutSettings();
    component.updateShortcut('figureSearch', 'Mod+K');
    component.saveShortcutSettings();

    expect(configuration.generalConfig().keyboardShortcuts.figureSearch).toBe('Mod+K');

    component.openShortcutSettings();
    component.updateShortcut('selectTool', 'Mod+K', 'figureSearch');
    component.saveShortcutSettings();

    expect(configuration.generalConfig().keyboardShortcuts.selectTool).toBe('Mod+K');
    expect(configuration.generalConfig().keyboardShortcuts.figureSearch).toBe('');

    component.openShortcutSettings();
    expect(component.shortcutsAreDefault()).toBe(false);

    component.requestResetShortcutsToDefaults();

    expect(component.shortcutResetConfirmationOpen()).toBe(true);

    component.confirmResetShortcutsToDefaults();
    component.saveShortcutSettings();

    expect(configuration.generalConfig().keyboardShortcuts.figureSearch).toBe(DEFAULT_KEYBOARD_SHORTCUTS.figureSearch);
    expect(component.shortcutsAreDefault()).toBe(true);
  });

  it('configures visible context-menu actions through a staged dialog', () => {
    component.openContextMenuSettings();
    component.updateContextMenuAction('cut', false);
    component.updateContextMenuAction('saveTemplate', false);
    component.moveContextMenuActionByKeyboard('copy', new KeyboardEvent('keydown', { key: 'ArrowDown' }));

    expect(configuration.generalConfig().contextMenuActions.cut).toBe(true);

    component.saveContextMenuSettings();

    expect(configuration.generalConfig().contextMenuActions.cut).toBe(false);
    expect(configuration.generalConfig().contextMenuActions.saveTemplate).toBe(false);
    expect(configuration.generalConfig().contextMenuOrder.slice(0, 2)).toEqual(['cut', 'copy']);
    expect(component.settingsAreDefault()).toBe(false);

    component.openContextMenuSettings();
    component.resetContextMenuActions();
    component.saveContextMenuSettings();

    expect(Object.values(configuration.generalConfig().contextMenuActions).every(Boolean)).toBe(true);
    expect(configuration.generalConfig().contextMenuOrder).toEqual(EDITOR_CONTEXT_MENU_ACTIONS);
  });

  it('previews context-menu reordering while dragging over a row', () => {
    component.openContextMenuSettings();
    expect(component.contextMenuActionColumnSize()).toBe(6);
    component.draggedContextMenuAction.set('copy');
    const target = document.createElement('div');
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    component.previewContextMenuActionMove('paste', {
      preventDefault: vi.fn(),
      currentTarget: target,
      clientY: 75,
      dataTransfer: null
    } as unknown as DragEvent);

    expect(component.editableContextMenuOrder().slice(0, 3)).toEqual(['cut', 'paste', 'copy']);
    expect(component.contextMenuDropTarget()).toBe('paste');
    expect(component.contextMenuDropPlacement()).toBe('after');
  });

  it('shows the white canvas option only while dark mode is selected', () => {
    expect(component.t('whiteCanvasInDarkMode')).toBe('Use white canvas');
    expect(component.showWhiteCanvasInDarkModeOption()).toBe(false);

    store.patchPreferences({ theme: 'dark' });

    expect(component.showWhiteCanvasInDarkModeOption()).toBe(true);
  });

  it('centralizes LaTeX and code-theme configuration through the dialog', () => {
    component.updateLatexExportBoolean('wrapInFigure', true);
    component.setPreferredLatexExportMode('standalone');
    component.setLatexAlignment('right');
    component.updateLatexExportNumber('maxWidthPercent', { target: { value: '120' } } as unknown as Event, 10, 100);
    component.applySuggestedCaptionAndLabel();
    component.setCodeHighlightTheme('forest');

    expect(configuration.latexExportConfig()).toMatchObject({
      preferredExportMode: 'standalone',
      wrapInFigure: true,
      alignment: 'right',
      maxWidthPercent: 100,
      caption: 'Suggested caption',
      label: 'fig:suggested'
    });
    expect(configuration.codeHighlightTheme()).toBe('forest');
  });

  it('imports a shared configuration payload with normalization', () => {
    const importer = component as unknown as {
      applyImportedConfiguration(payload: unknown): void;
    };

    importer.applyImportedConfiguration({
      preferences: {
        theme: 'dark',
        snapStep: 999,
        defaultStroke: '#123456'
      },
      latexExportConfig: {
        preferredExportMode: 'standalone',
        maxWidthPercent: 5
      },
      generalConfig: {
        showHelpTooltips: false,
        showMinimap: false
      },
      codeHighlightTheme: 'forest',
      language: 'ca',
      aiSettings: {
        temperature: 2,
        maxTokens: 100
      }
    });

    expect(store.preferences()).toMatchObject({
      theme: 'dark',
      snapStep: 999,
      defaultStroke: '#123456'
    });
    expect(configuration.latexExportConfig()).toMatchObject({
      preferredExportMode: 'standalone',
      maxWidthPercent: 10
    });
    expect(configuration.generalConfig()).toMatchObject({
      showHelpTooltips: false,
      showMinimap: false
    });
    expect(configuration.codeHighlightTheme()).toBe('forest');
    expect(component.language()).toBe('ca');
    expect(component.aiSettings()).toMatchObject({
      temperature: 1.2,
      maxTokens: 250
    });
    expect(component.configurationImportError()).toBe('');
  });

  it('asks before resetting editor, scene and LaTeX settings to defaults', () => {
    component.updatePreferenceBoolean('showAxes', false);
    component.updateLatexExportBoolean('wrapInFigure', true);
    component.setCodeHighlightTheme('midnight');

    component.requestResetToDefaults();

    expect(component.resetConfirmationOpen()).toBe(true);

    component.confirmResetToDefaults();

    expect(store.preferences()).toEqual(defaultPreferences);
    expect(configuration.latexExportConfig().wrapInFigure).toBe(false);
    expect(configuration.codeHighlightTheme()).toBe('aurora');
    expect(configuration.generalConfig().showHelpTooltips).toBe(true);
    expect(configuration.generalConfig().whiteCanvasInDarkMode).toBe(false);
    expect(configuration.generalConfig().showInspectorOnlyWithSelection).toBe(false);
    expect(configuration.generalConfig().showMinimap).toBe(true);
    expect(configuration.generalConfig().confirmSceneReplacement).toBe(true);
    expect(Object.values(configuration.generalConfig().contextMenuActions).every(Boolean)).toBe(true);
    expect(component.settingsAreDefault()).toBe(true);
    expect(component.resetConfirmationOpen()).toBe(false);
  });

  it('closes on Escape without leaking editor shortcuts', () => {
    component.onDialogKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closeSpy).toHaveBeenCalledOnce();
  });

  it('opens the about dialog separately from the configuration tabs and closes it on Escape', () => {
    component.openAboutDialog();

    expect(component.aboutDialogOpen()).toBe(true);
    expect(component.activeTab()).toBe('general');

    component.onDialogKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(component.aboutDialogOpen()).toBe(false);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('closes only the topmost settings layer on Escape', () => {
    component.openShortcutSettings();
    component.updateShortcut('figureSearch', 'Mod+K');
    component.requestResetShortcutsToDefaults();

    component.onDialogKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(component.shortcutResetConfirmationOpen()).toBe(false);
    expect(component.shortcutsDialogOpen()).toBe(true);
    expect(closeSpy).not.toHaveBeenCalled();

    component.onDialogKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(component.shortcutsDialogOpen()).toBe(false);
    expect(closeSpy).not.toHaveBeenCalled();
  });
});
