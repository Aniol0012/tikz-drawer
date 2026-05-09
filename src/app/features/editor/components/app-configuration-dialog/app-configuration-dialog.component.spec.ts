import '@angular/compiler';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultPreferences } from '../../presets/presets';
import { EditorStore } from '../../state/editor.store';
import { EditorConfigurationService } from '../../state/editor-configuration.service';
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
    ['toggle-field.component.html', resolve(process.cwd(), 'src/app/shared/toggle-field')],
    ['toggle-field.component.css', resolve(process.cwd(), 'src/app/shared/toggle-field')],
    ['range-input-card.component.html', resolve(process.cwd(), 'src/app/features/editor/components/range-input-card')],
    ['range-input-card.component.css', resolve(process.cwd(), 'src/app/features/editor/components/range-input-card')]
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
    component.updatePreferenceText('defaultStroke', { target: { value: '#ff0000' } } as unknown as Event);

    expect(store.preferences()).toMatchObject({
      showGrid: false,
      snapStep: 2,
      defaultStroke: '#ff0000'
    });
  });

  it('centralizes LaTeX and code-theme configuration through the dialog', () => {
    component.updateLatexExportBoolean('wrapInFigure', true);
    component.setLatexAlignment('right');
    component.updateLatexExportNumber('maxWidthPercent', { target: { value: '120' } } as unknown as Event, 10, 100);
    component.applySuggestedCaptionAndLabel();
    component.setCodeHighlightTheme('forest');

    expect(configuration.latexExportConfig()).toMatchObject({
      wrapInFigure: true,
      alignment: 'right',
      maxWidthPercent: 100,
      caption: 'Suggested caption',
      label: 'fig:suggested'
    });
    expect(configuration.codeHighlightTheme()).toBe('forest');
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
    expect(component.settingsAreDefault()).toBe(true);
    expect(component.resetConfirmationOpen()).toBe(false);
  });

  it('closes on Escape without leaking editor shortcuts', () => {
    component.onDialogKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closeSpy).toHaveBeenCalledOnce();
  });
});
