import { ServiceWorkerMLCEngineHandler } from './web-llm/index.js';

new ServiceWorkerMLCEngineHandler();

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
