import { ServiceWorkerMLCEngineHandler } from './web-llm/index.js';

let handler = null;

self.addEventListener('message', () => {
  handler ||= new ServiceWorkerMLCEngineHandler();
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  handler ||= new ServiceWorkerMLCEngineHandler();
  event.waitUntil(self.clients.claim());
});
