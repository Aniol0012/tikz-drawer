import { ServiceWorkerMLCEngineHandler } from './web-llm/index.js';

const webLlmServiceWorkerHandler = new ServiceWorkerMLCEngineHandler();
self.webLlmServiceWorkerHandler = webLlmServiceWorkerHandler;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
