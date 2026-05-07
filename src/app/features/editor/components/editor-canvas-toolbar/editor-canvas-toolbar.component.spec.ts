import '@angular/compiler';
import { Component, signal } from '@angular/core';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_EDITOR_SCALE, EDITOR_SCALE_MAX, EDITOR_SCALE_MIN, EDITOR_ZOOM_STEP } from '../../constants/editor.constants';
import { EditorCanvasToolbarComponent } from './editor-canvas-toolbar.component';

@Component({
  standalone: true,
  imports: [EditorCanvasToolbarComponent],
  template: `
    <app-editor-canvas-toolbar
      [canUndo]="canUndo()"
      [canRedo]="canRedo()"
      [viewportCentered]="viewportCentered()"
      [scale]="scale()"
      (undoRequested)="undoSpy()"
      (redoRequested)="redoSpy()"
      (centerRequested)="centerSpy()"
      (scaleRequested)="scaleSpy($event)" />
  `
})
class EditorCanvasToolbarHostComponent {
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  readonly viewportCentered = signal(true);
  readonly scale = signal(DEFAULT_EDITOR_SCALE);

  readonly undoSpy = vi.fn();
  readonly redoSpy = vi.fn();
  readonly centerSpy = vi.fn();
  readonly scaleSpy = vi.fn();
}

describe('EditorCanvasToolbarComponent', () => {
  let fixture: ComponentFixture<EditorCanvasToolbarHostComponent>;
  let host: EditorCanvasToolbarHostComponent;
  let component: EditorCanvasToolbarComponent;
  const componentDir = dirname(fileURLToPath(import.meta.url));

  beforeAll(async () => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    await resolveComponentResources((url) => readFile(resolve(componentDir, url), 'utf8'));
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  const renderToolbar = async (
    inputs: Partial<{
      canUndo: boolean;
      canRedo: boolean;
      viewportCentered: boolean;
      scale: number;
    }> = {}
  ): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [EditorCanvasToolbarHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EditorCanvasToolbarHostComponent);
    host = fixture.componentInstance;
    host.canUndo.set(inputs.canUndo ?? false);
    host.canRedo.set(inputs.canRedo ?? false);
    host.viewportCentered.set(inputs.viewportCentered ?? true);
    host.scale.set(inputs.scale ?? DEFAULT_EDITOR_SCALE);
    fixture.detectChanges();
    component = fixture.debugElement.children[0].componentInstance;
  };

  const button = (label: string): HTMLButtonElement => fixture.nativeElement.querySelector(`button[aria-label="${label}"]`);

  it('uses app tooltip targets for disabled actions without native titles', async () => {
    await renderToolbar();

    const centerTooltipTarget = button('Center view').closest('.canvas-tooltip-target') as HTMLElement;

    expect(centerTooltipTarget.getAttribute('data-tooltip')).toBe('Center view');
    expect(centerTooltipTarget.getAttribute('title')).toBeNull();
    expect(button('Center view').getAttribute('title')).toBeNull();
    expect(button('Center view').disabled).toBe(true);
    expect(centerTooltipTarget.classList.contains('is-disabled')).toBe(true);
  });

  it('emits toolbar action requests from enabled buttons', async () => {
    await renderToolbar({ canUndo: true, canRedo: true, viewportCentered: false });

    button('Undo').click();
    button('Redo').click();
    button('Center view').click();

    expect(host.undoSpy).toHaveBeenCalledOnce();
    expect(host.redoSpy).toHaveBeenCalledOnce();
    expect(host.centerSpy).toHaveBeenCalledOnce();
  });

  it('owns zoom constants and exposes them on the range input', async () => {
    await renderToolbar();

    const range = fixture.nativeElement.querySelector('input[type="range"]') as HTMLInputElement;

    expect(range.min).toBe(String(EDITOR_SCALE_MIN));
    expect(range.max).toBe(String(EDITOR_SCALE_MAX));
    expect(range.step).toBe(String(EDITOR_ZOOM_STEP));
  });

  it('opens a compact preset menu with common zoom levels', async () => {
    await renderToolbar();

    fixture.nativeElement.querySelector('.zoom-chip').click();
    fixture.detectChanges();

    const items = [...fixture.nativeElement.querySelectorAll('.zoom-preset-menu__item')].map((item) => item.textContent.trim());
    expect(component.zoomMenuOpen()).toBe(true);
    expect(items).toEqual(['50%', '100%', '150%', '200%', '300%']);
  });

  it('emits requested scale for preset and range changes', async () => {
    await renderToolbar();

    component.setZoomPercent(200);
    component.setScaleFromInput({ target: { value: '36' } } as unknown as Event);

    expect(host.scaleSpy).toHaveBeenNthCalledWith(1, DEFAULT_EDITOR_SCALE * 2);
    expect(host.scaleSpy).toHaveBeenNthCalledWith(2, 36);
    expect(component.zoomMenuOpen()).toBe(false);
  });

  it('emits relative zoom changes using the internal zoom step', async () => {
    await renderToolbar({ scale: DEFAULT_EDITOR_SCALE });

    component.zoomOut();
    component.zoomIn();

    expect(host.scaleSpy).toHaveBeenNthCalledWith(1, DEFAULT_EDITOR_SCALE - EDITOR_ZOOM_STEP);
    expect(host.scaleSpy).toHaveBeenNthCalledWith(2, DEFAULT_EDITOR_SCALE + EDITOR_ZOOM_STEP);
  });
});
