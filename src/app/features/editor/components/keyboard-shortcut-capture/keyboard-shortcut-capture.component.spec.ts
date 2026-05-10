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
    component.beginCapture();
    component.onCaptureKeydown(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }));

    expect(component.pendingLabel()).toBe('Ctrl');
    expect(component.canApply()).toBe(false);

    component.onCaptureKeydown(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

    expect(component.pendingLabel()).toBe('Ctrl + K');
    expect(component.canApply()).toBe(true);
  });

  it('emits the normalized shortcut only when applied', () => {
    const valueChangeSpy = vi.fn();
    component.valueChange.subscribe(valueChangeSpy);

    component.beginCapture();
    component.onCaptureKeydown(new KeyboardEvent('keydown', { key: ',', metaKey: true }));
    component.applyCapture();

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
});
