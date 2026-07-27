import { inject } from '@angular/core';
import type { CanActivateFn, Routes } from '@angular/router';
import { NotFoundOverlayService } from './features/not-found/not-found-overlay.service';

export interface SeoRouteData {
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string | null;
  readonly robots: string;
}

export const preserveActivePageForUnknownRoute: CanActivateFn = (_route, state) => {
  const overlay = inject(NotFoundOverlayService);
  return overlay.openOverActivePage(state.url) ? false : true;
};

export const routes: Routes = [
  {
    path: '',
    loadComponent: async () => (await import('./features/editor/components/editor-page/editor-page.component')).EditorPageComponent,
    data: {
      seo: {
        title: 'TikZ Drawer — Free Online Visual TikZ Editor',
        description:
          'Create LaTeX TikZ diagrams visually with a free online editor. Draw shapes, graphs and labels, then export clean TikZ code—no installation required.',
        canonicalPath: '/',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
      } satisfies SeoRouteData
    }
  },
  {
    path: 'guide',
    loadComponent: async () => (await import('./features/site-pages/site-information-page.component')).SiteInformationPageComponent,
    data: {
      page: 'guide',
      seo: {
        title: 'How to Draw TikZ Diagrams Online | TikZ Drawer',
        description:
          'Learn how to draw TikZ diagrams visually, edit shapes and graphs, and export clean LaTeX TikZ code with the free TikZ Drawer online editor.',
        canonicalPath: '/guide/',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1'
      } satisfies SeoRouteData
    }
  },
  {
    path: 'examples',
    loadComponent: async () => (await import('./features/site-pages/site-information-page.component')).SiteInformationPageComponent,
    data: {
      page: 'examples',
      seo: {
        title: 'TikZ Drawing Examples for LaTeX | TikZ Drawer',
        description:
          'Explore TikZ drawing examples for LaTeX, including flowcharts, graphs, geometry and system diagrams, then create and export your own online.',
        canonicalPath: '/examples/',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1'
      } satisfies SeoRouteData
    }
  },
  {
    path: 'about',
    loadComponent: async () => (await import('./features/site-pages/site-information-page.component')).SiteInformationPageComponent,
    data: {
      page: 'about',
      seo: {
        title: 'About TikZ Drawer | Open-Source Visual TikZ Editor',
        description:
          'Learn about TikZ Drawer, a free open-source visual editor created by Aniol0012 for drawing diagrams and exporting LaTeX TikZ code online.',
        canonicalPath: '/about/',
        robots: 'index, follow, max-image-preview:large, max-snippet:-1'
      } satisfies SeoRouteData
    }
  },
  {
    path: '**',
    canActivate: [preserveActivePageForUnknownRoute],
    loadComponent: async () => (await import('./features/not-found/not-found-page.component')).NotFoundPageComponent,
    data: {
      seo: {
        title: 'Page Not Found | TikZ Drawer',
        description: 'The requested page could not be found. Return to the TikZ Drawer editor or browse the drawing guide and examples.',
        canonicalPath: null,
        robots: 'noindex, follow'
      } satisfies SeoRouteData
    }
  }
];
