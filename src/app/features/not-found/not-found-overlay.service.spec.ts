import { NotFoundOverlayService } from './not-found-overlay.service';

describe('NotFoundOverlayService', () => {
  it('uses the full-page fallback before any valid route has rendered', () => {
    const service = new NotFoundOverlayService();

    expect(service.openOverActivePage('/missing.pdf')).toBe(false);
    expect(service.requestedPath()).toBeNull();
  });

  it('opens over the current page after a valid route has rendered', () => {
    const service = new NotFoundOverlayService();
    service.markPageActive();

    expect(service.openOverActivePage('/missing.pdf')).toBe(true);
    expect(service.requestedPath()).toBe('/missing.pdf');

    service.close();
    expect(service.requestedPath()).toBeNull();
  });
});
