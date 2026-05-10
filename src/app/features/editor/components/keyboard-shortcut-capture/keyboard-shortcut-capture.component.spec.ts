import '@angular/compiler';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardShortcutCaptureComponent } from './keyboard-shortcut-capture.component';

describe('KeyboardShortcutCaptureComponent', () => {
  let fixture: ComponentFixture<KeyboardShortcutCaptureComponent>;
  let component: KeyboardShortcutCaptureComponent;
  const componentDir = dirname(fileURLToPath(import.meta.url));

  beforeAll(async () => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    await resolveComponentResources((url) => readFile(resolve(componentDir, basename(url)), 'utf8'));
  });

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [KeyboardShortcutCaptureComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(KeyboardShortcutCaptureComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', 'Mod+F');
    fixture.componentRef.setInput('label', 'Search shapes');
    fixture.componentRef.setInput('instruction', 'Press shortcut');
    fixture.detectChanges();
  });

  it('waits for a non-modifier key before allowing apply', () => {
    const valueChangeSpy = vi.fn();
    component.valueChange.subscribe(valueChangeSpy);

    component.beginCapture();
    component.onCaptureKeydown(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }));

    expect(component.pendingLabel()).toBe('Ctrl');
    expect(component.canApply()).toBe(false);

    component.onCaptureKeydown(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

    expect(valueChangeSpy).toHaveBeenCalledWith('Mod+K');
    expect(component.isCapturing()).toBe(false);
  });

  it('emits the normalized shortcut as soon as a complete chord is pressed', () => {
    const valueChangeSpy = vi.fn();
    component.valueChange.subscribe(valueChangeSpy);

    component.beginCapture();
    component.onCaptureKeydown(new KeyboardEvent('keydown', { key: ',', metaKey: true }));

    expect(valueChangeSpy).toHaveBeenCalledWith('Mod+,');
    expect(component.isCapturing()).toBe(false);
  });

  it('cancels capture on Escape without emitting', () => {
    const valueChangeSpy = vi.fn();
    component.valueChange.subscribe(valueChangeSpy);

    component.beginCapture();
    component.onCaptureKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(valueChangeSpy).not.toHaveBeenCalled();
    expect(component.isCapturing()).toBe(false);
  });

  it('keeps the overlay mounted until outside click closes only the capture layer', () => {
    component.beginCapture();
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.shortcut-capture-overlay') as HTMLElement | null;
    expect(overlay).not.toBeNull();

    overlay?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
    expect(component.isCapturing()).toBe(true);

    overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(component.isCapturing()).toBe(false);
  });

  it('asks for a decision when the shortcut is already assigned elsewhere', () => {
    const valueChangeSpy = vi.fn();
    const reassignSpy = vi.fn();
    component.valueChange.subscribe(valueChangeSpy);
    component.reassignShortcut.subscribe(reassignSpy);
    fixture.componentRef.setInput('actionId', 'figureSearch');
    fixture.componentRef.setInput('assignedShortcuts', [
      { id: 'figureSearch', label: 'Search shapes', shortcut: 'Mod+F' },
      { id: 'selectTool', label: 'Select tool', shortcut: 'Mod+K' }
    ]);

    component.beginCapture();
    component.onCaptureKeydown(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

    expect(valueChangeSpy).not.toHaveBeenCalled();
    expect(component.conflict()?.id).toBe('selectTool');
    expect(component.isCapturing()).toBe(true);

    component.replaceConflictingShortcut();

    expect(reassignSpy).toHaveBeenCalledWith({ shortcut: 'Mod+K', conflictingActionId: 'selectTool' });
    expect(component.isCapturing()).toBe(false);
  });

  it('keeps the previous shortcut on conflict and waits for another key', () => {
    fixture.componentRef.setInput('actionId', 'figureSearch');
    fixture.componentRef.setInput('assignedShortcuts', [
      { id: 'figureSearch', label: 'Search shapes', shortcut: 'Mod+F' },
      { id: 'selectTool', label: 'Select tool', shortcut: 'Mod+K' }
    ]);

    component.beginCapture();
    component.onCaptureKeydown(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    component.keepConflictingShortcut();

    expect(component.conflict()).toBeNull();
    expect(component.pendingShortcut()).toBeNull();
    expect(component.isCapturing()).toBe(true);
  });
});
