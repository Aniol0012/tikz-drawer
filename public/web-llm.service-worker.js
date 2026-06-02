import { ServiceWorkerMLCEngineHandler } from './web-llm/index.js';

const webLlmServiceWorkerHandler = new ServiceWorkerMLCEngineHandler();
globalThis.webLlmServiceWorkerHandler = webLlmServiceWorkerHandler;

globalThis.addEventListener('install', () => {
  globalThis.skipWaiting();
});

globalThis.addEventListener('activate', (event) => {
  event.waitUntil(globalThis.clients.claim());
});
