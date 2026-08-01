import type { AfterViewInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { DiagramArtworkWebglRenderer } from './diagram-artwork-webgl.renderer';
import { boundedArtworkPointerPosition, updatedArtworkRotation } from './diagram-artwork-rotation.utils';

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
type EnhancedArtworkKind = Extract<DiagramArtworkKind, 'gallery' | 'lost' | 'spatial'>;

interface ArtworkDragState {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

const INITIAL_ROTATION: Readonly<{ x: number; y: number }> = { x: -0.08, y: 0.12 };
const POINTER_HIGHLIGHT_RADIUS_PX = 38;

@Component({
  selector: 'app-diagram-artwork',
  templateUrl: './diagram-artwork.component.html',
  styleUrl: './diagram-artwork.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.diagram-artwork--interactive]': 'interactive()',
    '[class.diagram-artwork--lost]': "kind() === 'lost'",
    '[class.diagram-artwork--pending]': 'enhancedKind() !== null && !renderResolved()',
    '[class.diagram-artwork--webgl]': 'webglActive()',
    '[class.diagram-artwork--pointer-active]': 'pointerActive()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerEnd($event)',
    '(pointercancel)': 'onPointerEnd($event)',
    '(lostpointercapture)': 'onPointerCaptureLost($event)'
  }
})
export class DiagramArtworkComponent implements AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly webglCanvas = viewChild<ElementRef<HTMLCanvasElement>>('webglCanvas');
  private renderer: DiagramArtworkWebglRenderer | null = null;
  private visibilityObserver: IntersectionObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private dragState: ArtworkDragState | null = null;
  private rotation = { ...INITIAL_ROTATION };

  readonly kind = input.required<DiagramArtworkKind>();
  readonly label = input.required<string>();
  readonly interactive = input(false);
  readonly enhancedKind = computed<EnhancedArtworkKind | null>(() => {
    const kind = this.kind();
    return kind === 'spatial' || kind === 'gallery' || kind === 'lost' ? kind : null;
  });
  readonly renderResolved = signal(false);
  readonly webglActive = signal(false);
  readonly pointerActive = signal(false);

  ngAfterViewInit(): void {
    const canvas = this.webglCanvas()?.nativeElement;
    const enhancedKind = this.enhancedKind();
    const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (!canvas || !enhancedKind || reducedMotion) {
      this.renderResolved.set(true);
      return;
    }

    const createRenderer = (): DiagramArtworkWebglRenderer | null => {
      const renderer = DiagramArtworkWebglRenderer.create(canvas, this.host.nativeElement, enhancedKind);
      renderer?.setRotation(this.rotation.x, this.rotation.y);
      return renderer;
    };
    this.renderer = createRenderer();
    if (!this.renderer) {
      this.renderResolved.set(true);
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
    this.renderResolved.set(true);
    this.renderer.start();

    this.destroyRef.onDestroy(() => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      this.visibilityObserver?.disconnect();
      this.themeObserver?.disconnect();
      this.renderer?.destroy();
      this.renderer = null;
    });
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.interactive() || this.dragState || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    event.preventDefault();
    this.dragState = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    this.pointerActive.set(true);
    try {
      this.host.nativeElement.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can be unavailable for synthetic or interrupted pointer streams.
    }
    this.updatePointerHighlight(event);
  }

  onPointerMove(event: PointerEvent): void {
    const dragState = this.dragState;
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - dragState.x;
    const deltaY = event.clientY - dragState.y;
    this.rotation = updatedArtworkRotation(this.rotation, deltaX, deltaY);
    this.dragState = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    this.applyRotation();
    this.updatePointerHighlight(event);
  }

  onPointerEnd(event: PointerEvent): void {
    if (event.pointerId !== this.dragState?.pointerId) {
      return;
    }

    event.preventDefault();
    this.dragState = null;
    this.pointerActive.set(false);
    if (this.host.nativeElement.hasPointerCapture(event.pointerId)) {
      this.host.nativeElement.releasePointerCapture(event.pointerId);
    }
  }

  onPointerCaptureLost(event: PointerEvent): void {
    if (event.pointerId === this.dragState?.pointerId) {
      this.dragState = null;
      this.pointerActive.set(false);
    }
  }

  private applyRotation(): void {
    const radiansToDegrees = 180 / Math.PI;
    this.host.nativeElement.style.setProperty('--artwork-rotate-x', `${(this.rotation.x * radiansToDegrees).toFixed(2)}deg`);
    this.host.nativeElement.style.setProperty('--artwork-rotate-y', `${(this.rotation.y * radiansToDegrees).toFixed(2)}deg`);
    this.renderer?.setRotation(this.rotation.x, this.rotation.y);
  }

  private updatePointerHighlight(event: PointerEvent): void {
    const viewport = this.host.nativeElement.ownerDocument.documentElement;
    const position = boundedArtworkPointerPosition(event.clientX, event.clientY, viewport.clientWidth, viewport.clientHeight, POINTER_HIGHLIGHT_RADIUS_PX);
    this.host.nativeElement.style.setProperty('--artwork-pointer-x', `${position.xPercent.toFixed(1)}%`);
    this.host.nativeElement.style.setProperty('--artwork-pointer-y', `${position.yPercent.toFixed(1)}%`);
  }
}
