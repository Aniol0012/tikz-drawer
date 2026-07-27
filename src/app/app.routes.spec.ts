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

  it('renders an explicit not-found page for unknown URLs', () => {
    const wildcardRoute = routes.find((route) => route.path === '**');

    expect(wildcardRoute?.redirectTo).toBeUndefined();
    expect(wildcardRoute?.loadComponent).toBeTypeOf('function');
    expect(wildcardRoute?.canActivate).toHaveLength(1);
    expect(wildcardRoute?.data?.['seo']?.robots).toBe('noindex, follow');
  });
});
