import { DOCUMENT } from '@angular/common';
import type { ElementRef } from '@angular/core';
import { afterNextRender, ChangeDetectionStrategy, Component, inject, input, output, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { resolveNotFoundTheme } from './not-found-theme.utils';

@Component({
  selector: 'app-not-found-overlay',
  imports: [RouterLink],
  templateUrl: './not-found-overlay.component.html',
  styleUrl: './not-found-overlay.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-theme]': 'theme'
  }
})
export class NotFoundOverlayComponent {
  private readonly document = inject(DOCUMENT);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly theme = resolveNotFoundTheme(this.document);
  readonly requestedPath = input.required<string>();
  readonly dismissed = output<void>();

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
