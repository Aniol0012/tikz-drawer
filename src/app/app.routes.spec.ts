import { routes } from './app.routes';

describe('application routes', () => {
  it('registers crawlable information pages without redirects', () => {
    expect(routes.map((route) => route.path)).toEqual(['', 'guide', 'examples', 'about', '**']);

    for (const path of ['guide', 'examples', 'about']) {
      const route = routes.find((entry) => entry.path === path);
      expect(route?.loadComponent).toBeTypeOf('function');
      expect(route?.redirectTo).toBeUndefined();
    }
  });

  it('uses one lightweight fullscreen page for every unknown URL', () => {
    const editorRoute = routes.find((route) => route.path === '');
    const wildcardRoute = routes.find((route) => route.path === '**');

    expect(wildcardRoute?.redirectTo).toBeUndefined();
    expect(wildcardRoute?.loadComponent).not.toBe(editorRoute?.loadComponent);
    expect(wildcardRoute?.canActivate).toBeUndefined();
    expect(wildcardRoute?.data?.['seo']?.robots).toBe('noindex, follow');
  });
});
