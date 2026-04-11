import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: async () =>
      (await import('./features/editor/components/editor-page/editor-page.component')).EditorPageComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
