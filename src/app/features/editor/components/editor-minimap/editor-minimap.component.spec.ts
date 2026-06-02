import '@angular/compiler';
import { Component, signal, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_EDITOR_SCALE } from '../../constants/editor.constants';
import { ARROW_TIP_OPTIONS } from '../../config/arrow-tip.config';
import type { LineShape } from '../../models/tikz.models';
import { arrowMarkerGeometry } from '../../utils/editor-arrow.utils';
import { EditorMinimapComponent } from './editor-minimap.component';

@Component({
  standalone: true,
  imports: [EditorMinimapComponent],
  template: `
    <app-editor-minimap
      [shapes]="shapes()"
      [visibleBounds]="visibleBounds()"
      [canvasWidth]="canvasWidth()"
      [canvasHeight]="canvasHeight()"
      [scale]="scale()"
      [defaultScale]="defaultScale()"
      [mobileLayout]="mobileLayout()"
      [overlayLayout]="overlayLayout()"
      (viewportCenterChange)="viewportCenterChangeSpy($event)" />
  `
})
class EditorMinimapHostComponent {
  readonly shapes = signal<readonly LineShape[]>([baseLine()]);
  readonly visibleBounds = signal({ left: 2, right: 4, bottom: -1, top: 1 });
  readonly canvasWidth = signal(1200);
  readonly canvasHeight = signal(800);
  readonly scale = signal(DEFAULT_EDITOR_SCALE * 2);
  readonly defaultScale = signal(DEFAULT_EDITOR_SCALE);
  readonly mobileLayout = signal(false);
  readonly overlayLayout = signal(false);

  readonly viewportCenterChangeSpy = vi.fn();
}

const baseLine = (patch: Partial<LineShape> = {}): LineShape => ({
  id: patch.id ?? 'line-1',
  name: 'Line',
  kind: 'line',
  stroke: '#111111',
  strokeOpacity: 1,
  strokeWidth: 0.28,
  from: { x: 0, y: 0 },
  to: { x: 10, y: 0 },
  anchors: [],
  lineMode: 'straight',
  strokeStyle: 'solid',
  arrowStart: false,
  arrowEnd: true,
  arrowType: 'triangle',
  arrowColor: '#111111',
  arrowOpacity: 1,
  arrowOpen: false,
  arrowRound: false,
  arrowScale: 1,
  arrowLengthScale: 1,
  arrowWidthScale: 1,
  arrowBendMode: 'none',
  ...patch
});

const configureFixture = (fixture: ComponentFixture<EditorMinimapHostComponent>, shapes: readonly LineShape[] = [baseLine()]): EditorMinimapHostComponent => {
  const host = fixture.componentInstance;
  host.shapes.set(shapes);
  fixture.detectChanges();
  return host;
};

describe('EditorMinimapComponent', () => {
  const componentDir = dirname(fileURLToPath(import.meta.url));

  beforeAll(async () => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    await resolveComponentResources((url) => readFile(resolve(componentDir, url), 'utf8'));
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('computes and renders the minimap inside the component', async () => {
    await TestBed.configureTestingModule({
      imports: [EditorMinimapHostComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(EditorMinimapHostComponent);
    configureFixture(fixture);
    const minimap = fixture.debugElement.children[0].componentInstance as EditorMinimapComponent;

    expect(minimap.visible()).toBe(true);
    expect(fixture.nativeElement.querySelector('.minimap__svg')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.minimap__viewport')).not.toBeNull();
  });

  it('renders each arrow tip using its marker geometry instead of one generic triangle', async () => {
    await TestBed.configureTestingModule({
      imports: [EditorMinimapHostComponent]
    }).compileComponents();

    const shapes = ARROW_TIP_OPTIONS.map((option, index) =>
      baseLine({
        id: `line-${option.id}`,
        from: { x: 0, y: index * 2 },
        to: { x: 10, y: index * 2 },
        arrowType: option.id as ArrowTipKind,
        arrowOpen: false
      })
    );
    const fixture = TestBed.createComponent(EditorMinimapHostComponent);
    configureFixture(fixture, shapes);

    const arrowPaths = Array.from(fixture.nativeElement.querySelectorAll<SVGPathElement>('path[transform]'));
    expect(arrowPaths).toHaveLength(ARROW_TIP_OPTIONS.length);
    expect(new Set(arrowPaths.map((path) => path.getAttribute('d'))).size).toBeGreaterThan(8);
    for (const [index, option] of ARROW_TIP_OPTIONS.entries()) {
      expect(arrowPaths[index].getAttribute('d')).toBe(arrowMarkerGeometry(shapes[index]).path);
      if (option.id === 'circle') {
        expect(arrowPaths[index].getAttribute('d')).toContain('A');
      }
      if (option.id === 'hooks') {
        expect(arrowPaths[index].getAttribute('d')).toContain('C');
      }
    }
  });

  it('emits viewport center changes while panning', async () => {
    await TestBed.configureTestingModule({
      imports: [EditorMinimapHostComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(EditorMinimapHostComponent);
    const host = configureFixture(fixture);
    const minimap = fixture.debugElement.children[0].componentInstance as EditorMinimapComponent;

    const svg = fixture.nativeElement.querySelector('.minimap__svg') as SVGSVGElement;
    svg.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 144,
        height: 96,
        right: 144,
        bottom: 96,
        x: 0,
        y: 0,
        toJSON: () => undefined
      }) as DOMRect;
    const overview = minimap.overview();
    if (!overview) {
      throw new Error('Expected a minimap overview');
    }
    minimap.startMinimapPan(
      {
        clientX: 72,
        clientY: 48,
        pointerId: 7,
        currentTarget: svg,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as unknown as PointerEvent,
      overview
    );

    expect(host.viewportCenterChangeSpy).toHaveBeenCalledTimes(1);
    expect(host.viewportCenterChangeSpy.mock.calls[0]?.[0]).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number)
    });
  });
});
