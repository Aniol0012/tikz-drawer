import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotFoundOverlayService {
  private hasActivePage = false;

  readonly requestedPath = signal<string | null>(null);

  markPageActive(): void {
    this.hasActivePage = true;
  }

  openOverActivePage(path: string): boolean {
    if (!this.hasActivePage) {
      return false;
    }

    this.requestedPath.set(path);
    return true;
  }

  close(): void {
    this.requestedPath.set(null);
  }
}
