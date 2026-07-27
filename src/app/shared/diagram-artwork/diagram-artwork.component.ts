import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';

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

@Component({
  selector: 'app-diagram-artwork',
  templateUrl: './diagram-artwork.component.html',
  styleUrl: './diagram-artwork.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.diagram-artwork--interactive]': 'interactive()',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerleave)': 'resetTilt()'
  }
})
export class DiagramArtworkComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly kind = input.required<DiagramArtworkKind>();
  readonly label = input.required<string>();
  readonly interactive = input(false);

  onPointerMove(event: PointerEvent): void {
    if (!this.interactive()) {
      return;
    }

    const rect = this.host.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    this.host.nativeElement.style.setProperty('--artwork-rotate-x', `${(-y * 7).toFixed(2)}deg`);
    this.host.nativeElement.style.setProperty('--artwork-rotate-y', `${(x * 9).toFixed(2)}deg`);
  }

  resetTilt(): void {
    this.host.nativeElement.style.removeProperty('--artwork-rotate-x');
    this.host.nativeElement.style.removeProperty('--artwork-rotate-y');
  }
}
