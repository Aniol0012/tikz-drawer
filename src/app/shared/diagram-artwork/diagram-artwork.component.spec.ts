import '@angular/compiler';
import { Component, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DiagramArtworkComponent } from './diagram-artwork.component';

@Component({
  imports: [DiagramArtworkComponent],
  template: `<app-diagram-artwork kind="source" label="Interactive artwork" [interactive]="true" />`
})
class DiagramArtworkHostComponent {}

describe('DiagramArtworkComponent', () => {
  const componentDir = dirname(fileURLToPath(import.meta.url));

  beforeAll(async () => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    await resolveComponentResources((url) => readFile(resolve(componentDir, url), 'utf8'));
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DiagramArtworkHostComponent] }).compileComponents();
  });

  it('rotates vertically with the pointer while preserving horizontal drag direction', () => {
    const fixture = TestBed.createComponent(DiagramArtworkHostComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector('app-diagram-artwork') as HTMLElement;
    host.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 100, clientY: 100, pointerId: 1 }));
    host.dispatchEvent(new PointerEvent('pointermove', { clientX: 110, clientY: 110, pointerId: 1 }));

    expect(host.style.getPropertyValue('--artwork-rotate-x')).toBe('0.00deg');
    expect(host.style.getPropertyValue('--artwork-rotate-y')).toBe('11.46deg');
  });
});
