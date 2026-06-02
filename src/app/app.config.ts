import type { ApplicationConfig } from '@angular/core';
import { ENVIRONMENT_INITIALIZER, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
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
