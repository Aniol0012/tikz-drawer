import { inject } from '@angular/core';
import type { CanActivateFn, Routes } from '@angular/router';
import { NotFoundOverlayService } from './features/not-found/not-found-overlay.service';
import { EDITOR_SEO, NOT_FOUND_SEO, SITE_PAGE_SEO } from './features/site-pages/site-page-seo';

const loadEditorPage = async () => (await import('./features/editor/components/editor-page/editor-page.component')).EditorPageComponent;

export const preserveActivePageForUnknownRoute: CanActivateFn = (_route, state) => {
  const overlay = inject(NotFoundOverlayService);
  return !overlay.openOverActivePage(state.url);
};

export const routes: Routes = [
  {
    path: '',
    loadComponent: loadEditorPage,
    data: {
      seo: EDITOR_SEO
    }
  },
  {
    path: 'guide',
    loadComponent: async () => (await import('./features/site-pages/site-information-page.component')).SiteInformationPageComponent,
    data: {
      page: 'guide',
      seo: SITE_PAGE_SEO.guide
    }
  },
  {
    path: 'examples',
    loadComponent: async () => (await import('./features/site-pages/site-information-page.component')).SiteInformationPageComponent,
    data: {
      page: 'examples',
      seo: SITE_PAGE_SEO.examples
    }
  },
  {
    path: 'about',
    loadComponent: async () => (await import('./features/site-pages/site-information-page.component')).SiteInformationPageComponent,
    data: {
      page: 'about',
      seo: SITE_PAGE_SEO.about
    }
  },
  {
    path: '**',
    canActivate: [preserveActivePageForUnknownRoute],
    loadComponent: async () => (await import('./features/not-found/not-found-page.component')).NotFoundPageComponent,
    data: {
      seo: NOT_FOUND_SEO
    }
  }
];
