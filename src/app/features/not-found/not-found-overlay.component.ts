import type { ElementRef } from '@angular/core';
import { afterNextRender, ChangeDetectionStrategy, Component, inject, input, output, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlobalThemeService } from '../../shared/theme/global-theme.service';

@Component({
  selector: 'app-not-found-overlay',
  imports: [RouterLink],
  templateUrl: './not-found-overlay.component.html',
  styleUrl: './not-found-overlay.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-theme]': 'theme()'
  }
})
export class NotFoundOverlayComponent {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly globalTheme = inject(GlobalThemeService);

  readonly theme = this.globalTheme.theme;
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
