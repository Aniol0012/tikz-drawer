import { DEFAULT_AI_SETTINGS } from './ai-settings.service';
import type { AiProviderRequest } from './ai-provider-result.model';
import { FirebaseAiProvider } from './firebase-ai.provider';

const firebaseMocks = vi.hoisted(() => {
  const generateContent = vi.fn(async () => ({
    response: {
      text: () => '{"type":"message","message":"Ready"}'
    }
  }));

  return {
    generateContent,
    getAI: vi.fn(() => ({})),
    getGenerativeModel: vi.fn(() => ({ generateContent })),
    initializeApp: vi.fn(() => ({ name: '[DEFAULT]' }))
  };
});

vi.mock('firebase/app', () => ({
  initializeApp: firebaseMocks.initializeApp
}));

vi.mock('firebase/ai', () => ({
  getAI: firebaseMocks.getAI,
  getGenerativeModel: firebaseMocks.getGenerativeModel,
  GoogleAIBackend: class {},
  Schema: {
    array: (options: unknown) => options,
    boolean: () => ({}),
    enumString: (options: unknown) => options,
    number: () => ({}),
    object: (options: unknown) => options,
    string: () => ({})
  }
}));

describe('FirebaseAiProvider', () => {
  const request: AiProviderRequest = {
    instruction: 'Draw a rectangle',
    contextJson: '{}',
    systemInstruction: 'Return JSON',
    options: DEFAULT_AI_SETTINGS
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and initializes the Firebase runtime only when generating', async () => {
    const provider = new FirebaseAiProvider();

    expect(firebaseMocks.initializeApp).not.toHaveBeenCalled();

    const result = await provider.generateText(request);

    expect(firebaseMocks.initializeApp).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      mode: 'cloud',
      providerType: 'remote',
      text: '{"type":"message","message":"Ready"}'
    });
  });

  it('shares the Firebase initialization across concurrent generations', async () => {
    const provider = new FirebaseAiProvider();

    await Promise.all([provider.generateText(request), provider.generateText(request)]);

    expect(firebaseMocks.initializeApp).toHaveBeenCalledOnce();
    expect(firebaseMocks.generateContent).toHaveBeenCalledTimes(2);
  });
});
