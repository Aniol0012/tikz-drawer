import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();

globalThis.onmessage = (message: MessageEvent) => {
  handler.onmessage(message);
};
