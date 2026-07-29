import type { AfterViewInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { DiagramArtworkWebglRenderer } from './diagram-artwork-webgl.renderer';

export const DIAGRAM_ARTWORK_KINDS = [
  'spatial',
  'canvas',
  'import',
  'ai',
  'edit',
  'gallery',
  'flowchart',
  'graph',
  'architecture',
  'geometry',
  'network',
  'annotation',
  'source',
  'latex',
  'overleaf',
  'compile',
  'iterate',
  'share',
  'json',
  'image-export',
  'lost'
] as const;

export type DiagramArtworkKind = (typeof DIAGRAM_ARTWORK_KINDS)[number];
type EnhancedArtworkKind = Extract<DiagramArtworkKind, 'gallery' | 'spatial'>;

@Component({
  selector: 'app-diagram-artwork',
  templateUrl: './diagram-artwork.component.html',
  styleUrl: './diagram-artwork.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.diagram-artwork--interactive]': 'interactive()',
    '[class.diagram-artwork--lost]': "kind() === 'lost'",
    '[class.diagram-artwork--webgl]': 'webglActive()',
    '[class.diagram-artwork--pointer-active]': 'pointerActive()',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerleave)': 'resetTilt()'
  }
})
export class DiagramArtworkComponent implements AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly webglCanvas = viewChild<ElementRef<HTMLCanvasElement>>('webglCanvas');
  private renderer: DiagramArtworkWebglRenderer | null = null;
  private visibilityObserver: IntersectionObserver | null = null;
  private themeObserver: MutationObserver | null = null;

  readonly kind = input.required<DiagramArtworkKind>();
  readonly label = input.required<string>();
  readonly interactive = input(false);
  readonly enhancedKind = computed<EnhancedArtworkKind | null>(() => {
    const kind = this.kind();
    return kind === 'spatial' || kind === 'gallery' ? kind : null;
  });
  readonly webglActive = signal(false);
  readonly pointerActive = signal(false);

  ngAfterViewInit(): void {
    const canvas = this.webglCanvas()?.nativeElement;
    const enhancedKind = this.enhancedKind();
    const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (!canvas || !enhancedKind || reducedMotion) {
      return;
    }

    const createRenderer = (): DiagramArtworkWebglRenderer | null => DiagramArtworkWebglRenderer.create(canvas, this.host.nativeElement, enhancedKind);
    this.renderer = createRenderer();
    if (!this.renderer) {
      return;
    }

    const handleContextLost = (event: Event): void => {
      event.preventDefault();
      this.webglActive.set(false);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    this.visibilityObserver = new IntersectionObserver(([entry]) => this.renderer?.setVisible(entry?.isIntersecting ?? false), { rootMargin: '100px' });
    this.visibilityObserver.observe(this.host.nativeElement);
    this.themeObserver = new MutationObserver(() => {
      this.renderer?.destroy();
      this.renderer = createRenderer();
      this.webglActive.set(this.renderer !== null);
      this.renderer?.start();
    });
    this.themeObserver.observe(document.documentElement, { attributeFilter: ['data-theme'] });
    this.webglActive.set(true);
    this.renderer.start();

    this.destroyRef.onDestroy(() => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      this.visibilityObserver?.disconnect();
      this.themeObserver?.disconnect();
      this.renderer?.destroy();
      this.renderer = null;
    });
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.interactive()) {
      return;
    }

    const rect = this.host.nativeElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    this.pointerActive.set(true);
    this.host.nativeElement.style.setProperty('--artwork-rotate-x', `${(-y * 11).toFixed(2)}deg`);
    this.host.nativeElement.style.setProperty('--artwork-rotate-y', `${(x * 14).toFixed(2)}deg`);
    this.host.nativeElement.style.setProperty('--artwork-pointer-x', `${((x + 1) * 50).toFixed(1)}%`);
    this.host.nativeElement.style.setProperty('--artwork-pointer-y', `${((y + 1) * 50).toFixed(1)}%`);
    this.renderer?.setPointer(x, y);
  }

  resetTilt(): void {
    this.pointerActive.set(false);
    this.host.nativeElement.style.removeProperty('--artwork-rotate-x');
    this.host.nativeElement.style.removeProperty('--artwork-rotate-y');
    this.renderer?.resetPointer();
  }
}
