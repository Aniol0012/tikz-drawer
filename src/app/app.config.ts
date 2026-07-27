import type { ApplicationConfig } from '@angular/core';
import { ENVIRONMENT_INITIALIZER, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withViewTransitions({ skipInitialTransition: true })),
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
          void import('./features/editor/ai/web-llm-local-ai.provider').then(({ preloadWebLlmLocalAi }) => preloadWebLlmLocalAi());
        }
      }
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
