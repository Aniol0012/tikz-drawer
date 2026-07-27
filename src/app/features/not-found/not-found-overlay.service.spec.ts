import { NotFoundOverlayService } from './not-found-overlay.service';

describe('NotFoundOverlayService', () => {
  it('uses the fullscreen page for a direct unknown URL', () => {
    const service = new NotFoundOverlayService();

    expect(service.openOverActivePage('/missing.pdf')).toBe(false);
    expect(service.requestedPath()).toBeNull();
  });

  it('preserves the current page and opens the dialog after a valid route has rendered', () => {
    const service = new NotFoundOverlayService();
    service.markPageActive();

    expect(service.openOverActivePage('/missing.pdf')).toBe(true);
    expect(service.requestedPath()).toBe('/missing.pdf');

    service.close();
    expect(service.requestedPath()).toBeNull();
  });
});
