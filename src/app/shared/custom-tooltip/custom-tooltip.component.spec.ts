import '@angular/compiler';
import { Component } from '@angular/core';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CustomTooltipComponent } from './custom-tooltip.component';

@Component({
  standalone: true,
  imports: [CustomTooltipComponent],
  template: `
    <div data-tooltip-disabled>
      <button type="button" data-tooltip="Selection (V)" data-tooltip-enabled aria-label="Selection (V)">Tool</button>
    </div>
    <app-custom-tooltip />
  `
})
class CustomTooltipHostComponent {}

describe('CustomTooltipComponent', () => {
  let fixture: ComponentFixture<CustomTooltipHostComponent>;
  const componentDir = dirname(fileURLToPath(import.meta.url));

  beforeAll(async () => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    await resolveComponentResources((url) => readFile(resolve(componentDir, url), 'utf8'));
  });

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [CustomTooltipHostComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(CustomTooltipHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('shows forced app tooltips for canvas tool targets even when parent tooltips are disabled', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    button.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    vi.advanceTimersByTime(500);
    fixture.detectChanges();

    const tooltip = fixture.nativeElement.querySelector('.custom-tooltip') as HTMLElement | null;
    expect(button.getAttribute('title')).toBeNull();
    expect(tooltip?.textContent?.trim()).toBe('Selection (V)');
  });
});
