import { DEFAULT_AI_SETTINGS } from './ai-settings.service';
import type { AiProviderRequest } from './ai-provider-result.model';
import { FirebaseAiProvider } from './firebase-ai.provider';
import type * as FirebaseAiConfig from './firebase-ai.config';
import type * as AngularCore from '@angular/core';

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
    initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
    getApps: vi.fn(() => [] as { name: string }[]),
    getApp: vi.fn(() => ({ name: '[DEFAULT]' })),
    initializeAppCheck: vi.fn(() => ({ app: { name: '[DEFAULT]' } })),
    getToken: vi.fn(async () => ({ token: 'valid-app-check-token' })),
    config: { FIREBASE_APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY: 'public-site-key' },
    devMode: true
  };
});

vi.mock('firebase/app', () => ({
  initializeApp: firebaseMocks.initializeApp,
  getApps: firebaseMocks.getApps,
  getApp: firebaseMocks.getApp
}));

vi.mock('./firebase-ai.config', async (importOriginal) => ({
  ...(await importOriginal<typeof FirebaseAiConfig>()),
  get FIREBASE_APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY() {
    return firebaseMocks.config.FIREBASE_APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY;
  }
}));

vi.mock('@angular/core', async (importOriginal) => ({
  ...(await importOriginal<typeof AngularCore>()),
  isDevMode: () => firebaseMocks.devMode
}));

vi.mock('firebase/app-check', () => ({
  initializeAppCheck: firebaseMocks.initializeAppCheck,
  getToken: firebaseMocks.getToken,
  ReCaptchaEnterpriseProvider: class {
    constructor(readonly siteKey: string) {}
  }
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
    firebaseMocks.config.FIREBASE_APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY = 'public-site-key';
    firebaseMocks.devMode = true;
    vi.stubGlobal('FIREBASE_APPCHECK_DEBUG_TOKEN', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads and initializes the Firebase runtime only when generating', async () => {
    const provider = new FirebaseAiProvider();

    expect(firebaseMocks.initializeApp).not.toHaveBeenCalled();

    const result = await provider.generateText(request);

    expect(firebaseMocks.initializeApp).toHaveBeenCalledOnce();
    expect(firebaseMocks.initializeAppCheck).toHaveBeenCalledWith(expect.objectContaining({ name: '[DEFAULT]' }), {
      provider: expect.objectContaining({ siteKey: 'public-site-key' }),
      isTokenAutoRefreshEnabled: true
    });
    expect(firebaseMocks.initializeAppCheck.mock.invocationCallOrder[0]).toBeLessThan(firebaseMocks.getAI.mock.invocationCallOrder[0]);
    expect(firebaseMocks.getToken.mock.invocationCallOrder[0]).toBeLessThan(firebaseMocks.getAI.mock.invocationCallOrder[0]);
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
    expect(firebaseMocks.initializeAppCheck).toHaveBeenCalledOnce();
    expect(firebaseMocks.generateContent).toHaveBeenCalledTimes(2);
  });

  it('does not send a Gemini request without an App Check configuration', async () => {
    firebaseMocks.config.FIREBASE_APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY = ' ';

    await expect(new FirebaseAiProvider().generateText(request)).rejects.toThrow('Firebase App Check requires');

    expect(firebaseMocks.initializeApp).not.toHaveBeenCalled();
    expect(firebaseMocks.generateContent).not.toHaveBeenCalled();
  });

  it('blocks generation on token failure and allows a later retry', async () => {
    firebaseMocks.getToken.mockRejectedValueOnce(new Error('App Check verification failed'));
    const provider = new FirebaseAiProvider();

    await expect(provider.generateText(request)).rejects.toThrow('App Check verification failed');
    expect(firebaseMocks.getAI).not.toHaveBeenCalled();
    expect(firebaseMocks.generateContent).not.toHaveBeenCalled();

    await expect(provider.generateText(request)).resolves.toMatchObject({ providerType: 'remote' });
    expect(firebaseMocks.initializeAppCheck).toHaveBeenCalledOnce();
    expect(firebaseMocks.generateContent).toHaveBeenCalledOnce();
  });

  it('reuses an existing Firebase app when initialization is retried', async () => {
    firebaseMocks.getApps.mockReturnValueOnce([{ name: '[DEFAULT]' }]);

    await new FirebaseAiProvider().generateText(request);

    expect(firebaseMocks.initializeApp).not.toHaveBeenCalled();
    expect(firebaseMocks.getApp).toHaveBeenCalledOnce();
  });

  it('enables the debug provider before initialization on a local development build', async () => {
    vi.stubGlobal('location', { hostname: 'localhost' });
    firebaseMocks.initializeAppCheck.mockImplementationOnce(() => {
      expect(Reflect.get(globalThis, 'FIREBASE_APPCHECK_DEBUG_TOKEN')).toBe(true);
      return { app: { name: '[DEFAULT]' } };
    });

    await new FirebaseAiProvider().generateText(request);
  });

  it.each([
    { hostname: 'localhost', devMode: false },
    { hostname: 'tikzdrawer.com', devMode: true }
  ])('does not enable debug tokens on $hostname with devMode=$devMode', async ({ hostname, devMode }) => {
    vi.stubGlobal('location', { hostname });
    firebaseMocks.devMode = devMode;

    await new FirebaseAiProvider().generateText(request);

    expect(Reflect.get(globalThis, 'FIREBASE_APPCHECK_DEBUG_TOKEN')).toBeUndefined();
  });
});
