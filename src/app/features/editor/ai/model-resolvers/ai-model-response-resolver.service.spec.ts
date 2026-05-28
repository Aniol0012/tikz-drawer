import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { EditorLanguageService } from '../../i18n/editor-language.service';
import type { AiSceneContext } from '../ai-scene-context.model';
import type { AiResponse } from '../ai-message.model';
import type { AiProviderTextResult } from '../ai-provider-result.model';
import { AiModelResponseResolverService } from './ai-model-response-resolver.service';

describe('AiModelResponseResolverService', () => {
  let resolver: AiModelResponseResolverService;
  let language: EditorLanguageService;

  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AiModelResponseResolverService]
    });
    resolver = TestBed.inject(AiModelResponseResolverService);
    language = TestBed.inject(EditorLanguageService);
    language.setLanguage('es');
  });

  it('answers graph capability questions instead of accepting leaked rectangle patches', () => {
    const response = resolver.resolve('Puc usar grafs?', emptyScene(), rectanglePatchResponse(), webLlmResult());

    expect(response.type).toBe('message');
    expect(response.patch).toBeUndefined();
    expect(response.message).toContain('Puedes añadir grafos');
    expect(response.message).toContain('Ctrl + F');
    expect(response.message).not.toContain('El usuario');
  });

  it('answers graph capability questions before calling a model', () => {
    const response = resolver.resolvePreflight('Puc crear un graf?', emptyScene());

    expect(response?.type).toBe('message');
    expect(response?.patch).toBeUndefined();
    expect(response?.message).toContain('Puedes añadir grafos');
    expect(response?.message).toContain('Ctrl + F');
  });

  it('answers square capability questions before calling a model', () => {
    const response = resolver.resolvePreflight('Com afegeixo un quadrat?', emptyScene());

    expect(response?.type).toBe('message');
    expect(response?.patch).toBeUndefined();
    expect(response?.message).toContain('Puedes añadir figuras');
  });

  it('creates a simple square before calling a model', () => {
    const response = resolver.resolvePreflight('Afegeix un quadrat', emptyScene());

    expect(response?.type).toBe('scenePatch');
    expect(response?.patch?.create).toHaveLength(1);
    expect(response?.patch?.create[0]).toMatchObject({ kind: 'rectangle', width: 1.2, height: 1.2 });
  });

  it('creates vague Catalan figures before calling a model', () => {
    const response = resolver.resolvePreflight('crea algunes figures', emptyScene());

    expect(response?.type).toBe('scenePatch');
    expect(response?.patch?.create).toHaveLength(3);
    expect(new Set(response?.patch?.create.map((shape) => shape.kind)).size).toBeGreaterThan(1);
  });

  it('creates a pair of vague things before calling a model', () => {
    const response = resolver.resolvePreflight('Crea un parell de coses', emptyScene());

    expect(response?.type).toBe('scenePatch');
    expect(response?.patch?.create).toHaveLength(2);
  });

  it('accepts WebLLM proposals for vague figure suggestions', () => {
    const response = resolver.resolve(
      'Proposa alguna figura',
      emptyScene(),
      {
        type: 'scenePatch',
        message: 'He preparado un triángulo.',
        patch: {
          create: [{ kind: 'triangle', name: 'Triangulo', x: -4.98, y: -4.98, width: 8.24, height: 6.59, rotation: 0 }],
          update: [],
          remove: []
        },
        parseStatus: 'json'
      },
      webLlmResult()
    );

    expect(response.type).toBe('scenePatch');
    expect(response.patch?.create).toHaveLength(1);
    expect(response.message).not.toContain('No he podido');
  });

  it('creates a simple editable diagram before calling a model', () => {
    const response = resolver.resolvePreflight('Crea un diagrama editable sencillo a partir de esta escena.', emptyScene());

    expect(response?.type).toBe('scenePatch');
    expect(response?.patch?.create).toHaveLength(5);
    expect(response?.patch?.create.filter((shape) => shape.kind === 'rectangle')).toHaveLength(3);
    const lines = response?.patch?.create.filter((shape) => shape.kind === 'line') ?? [];
    expect(lines).toHaveLength(2);
    expect(lines.every((line) => !!line.fromAttachment && !!line.toAttachment && line.lineMode === 'curved' && line.arrowType === 'stealth')).toBe(true);
  });

  it('orders the current scene before calling a model', () => {
    const response = resolver.resolvePreflight('Ordena y mejora la escena actual manteniendo sus elementos principales.', sceneWithManyShapes());

    expect(response?.type).toBe('scenePatch');
    expect(response?.patch?.update.length).toBeGreaterThan(0);
    expect(response?.patch?.create).toHaveLength(0);
  });

  it('adds labels before calling a model', () => {
    const response = resolver.resolvePreflight('Añade etiquetas útiles y breves a los elementos principales de la escena.', sceneWithRectangle());

    expect(response?.type).toBe('scenePatch');
    expect(response?.patch?.create).toHaveLength(1);
    expect(response?.patch?.create[0]).toMatchObject({ kind: 'text' });
  });

  it('explains the scene before calling a model', () => {
    const response = resolver.resolvePreflight('Explica la escena actual de forma clara y breve.', sceneWithRectangle());

    expect(response?.type).toBe('message');
    expect(response?.message).toContain('La escena tiene');
  });

  it('simplifies large scenes before calling a model', () => {
    const response = resolver.resolvePreflight('Simplifica la escena actual manteniendo la idea principal.', sceneWithManyShapes());

    expect(response?.type).toBe('scenePatch');
    expect(response?.patch?.remove.length).toBeGreaterThan(0);
  });

  it('turns a rectangle stroke-width edit into an update patch instead of creating rectangles', () => {
    const response = resolver.resolve('Canvia el grossor d algun quadrat', sceneWithRectangle(), rectanglePatchResponse(), webLlmResult());

    expect(response.type).toBe('scenePatch');
    expect(response.patch?.create).toHaveLength(0);
    expect(response.patch?.update).toEqual([{ id: 'rect-1', changes: { strokeWidth: 0.12 } }]);
  });

  it('resolves rectangle stroke-width edits before calling a model', () => {
    const response = resolver.resolvePreflight('Canvia el grossor d algun quadrat', sceneWithRectangle());

    expect(response?.type).toBe('scenePatch');
    expect(response?.patch?.create).toHaveLength(0);
    expect(response?.patch?.update).toEqual([{ id: 'rect-1', changes: { strokeWidth: 0.12 } }]);
  });

  it('does not invent a rectangle when an edit target is missing', () => {
    const response = resolver.resolve('Canvia el grossor d algun quadrat', emptyScene(), rectanglePatchResponse(), webLlmResult());

    expect(response.type).toBe('message');
    expect(response.patch).toBeUndefined();
    expect(response.message).toContain('No he encontrado');
  });

  it('does not call a model when a local edit target is missing', () => {
    const response = resolver.resolvePreflight('Canvia el grossor d algun quadrat', emptyScene());

    expect(response?.type).toBe('message');
    expect(response?.patch).toBeUndefined();
    expect(response?.message).toContain('No he encontrado');
  });

  it('resolves triangle color edits before calling a model', () => {
    const response = resolver.resolvePreflight("Canvia el color del d'algun dels meus triangles", sceneWithTriangle());

    expect(response?.type).toBe('scenePatch');
    expect(response?.patch?.create).toHaveLength(0);
    expect(response?.patch?.update).toEqual([{ id: 'tri-1', changes: { stroke: '#7c3aed', fill: '#ede9fe' } }]);
  });

  it('asks for a selection when a color edit has no target', () => {
    const response = resolver.resolvePreflight('Canvia el color', emptyScene());

    expect(response?.type).toBe('message');
    expect(response?.patch).toBeUndefined();
    expect(response?.message).toContain('selección');
  });

  it('changes selected shape colors before calling a model for vague color edits', () => {
    const response = resolver.resolvePreflight('Canvia el color', sceneWithRectangle());

    expect(response?.type).toBe('scenePatch');
    expect(response?.patch?.update).toEqual([{ id: 'rect-1', changes: { stroke: '#7c3aed', fill: '#ede9fe' } }]);
  });

  it('does not call a model when a triangle color edit target is missing', () => {
    const response = resolver.resolvePreflight("Canvia el color del d'algun dels meus triangles", emptyScene());

    expect(response?.type).toBe('message');
    expect(response?.patch).toBeUndefined();
    expect(response?.message).toContain('triángulo editable');
  });

  it('does not retry capability answers remotely', () => {
    const response = messageResponse('No he podido preparar una respuesta clara.', 'compact-prompt-echo');
    const retry = resolver.shouldRetryWithCloud('Puc usar grafs?', emptyScene(), response, webLlmResult(), true);

    expect(retry).toBe(false);
  });

  it('still allows cloud retry for non-answerable prompt echoes', () => {
    const response = messageResponse('No he podido preparar una respuesta clara.', 'compact-prompt-echo');
    const retry = resolver.shouldRetryWithCloud('Ordena aquesta escena de manera elegant', emptyScene(), response, webLlmResult(), true);

    expect(retry).toBe(true);
  });
});

function messageResponse(message: string, parseStatus: AiResponse['parseStatus'] = 'text-fallback'): AiResponse {
  return {
    type: 'message',
    message,
    parseStatus
  };
}

function rectanglePatchResponse(): AiResponse {
  return {
    type: 'scenePatch',
    message: 'He preparado dos rectángulos.',
    patch: {
      create: [
        { kind: 'rectangle', name: 'Bloque 1', x: -2.2, y: -0.5, width: 2, height: 1, stroke: '#1d4ed8', fill: '#dbeafe', strokeWidth: 0.04 },
        { kind: 'rectangle', name: 'Bloque 2', x: 0.4, y: -0.5, width: 2, height: 1, stroke: '#16a34a', fill: '#dcfce7', strokeWidth: 0.04 }
      ],
      update: [],
      remove: []
    },
    parseStatus: 'json'
  };
}

function webLlmResult(): AiProviderTextResult {
  return {
    mode: 'local',
    providerType: 'webllm',
    modelName: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    text: ''
  };
}

function emptyScene(): AiSceneContext {
  return {
    sceneName: 'Lienzo en blanco',
    selectedElementIds: [],
    elements: [],
    capabilities: ['message', 'scenePatch', 'tikzCode'],
    supportedElementKinds: ['rectangle', 'circle', 'ellipse', 'line', 'text', 'triangle']
  };
}

function sceneWithRectangle(): AiSceneContext {
  return {
    ...emptyScene(),
    selectedElementIds: ['rect-1'],
    elements: [
      {
        id: 'rect-1',
        name: 'Quadrat',
        kind: 'rectangle',
        locked: false,
        geometry: { x: 0, y: 0, width: 1, height: 1 },
        style: { stroke: '#111111', strokeWidth: 0.08, fill: '#ffffff' }
      }
    ]
  };
}

function sceneWithTriangle(): AiSceneContext {
  return {
    ...emptyScene(),
    selectedElementIds: ['tri-1'],
    elements: [
      {
        id: 'tri-1',
        name: 'Triangle',
        kind: 'triangle',
        locked: false,
        geometry: { x: 0, y: 0, width: 1, height: 1 },
        style: { stroke: '#111111', strokeWidth: 0.08, fill: '#ffffff' }
      }
    ]
  };
}

function sceneWithManyShapes(): AiSceneContext {
  return {
    ...emptyScene(),
    elements: Array.from({ length: 7 }, (_, index) => ({
      id: `rect-${index + 1}`,
      name: `Rect ${index + 1}`,
      kind: 'rectangle' as const,
      locked: false,
      geometry: { x: index, y: 0, width: 1, height: 1 },
      style: { stroke: '#111111', strokeWidth: 0.08, fill: '#ffffff' }
    }))
  };
}
