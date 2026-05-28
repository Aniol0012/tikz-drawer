import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { AiResponseParserService } from './ai-response-parser.service';
import { AI_PROMPT_ECHO_SENTINEL } from './ai-prompt-echo-sentinel';

describe('AiResponseParserService', () => {
  let parser: AiResponseParserService;

  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AiResponseParserService]
    });
    parser = TestBed.inject(AiResponseParserService);
  });

  it('repairs truncated scene patches with very long decimal numbers', () => {
    const response = parser.parse(`{
      "type": "scenePatch",
      "message": "He añadido un rectángulo azul al lienzo.",
      "patch": {
        "create": [
          {
            "kind": "rectangle",
            "name": "RectanguloAzul",
            "x": -1,
            "y": -0.5000000000000001110223024625156540423631668090820312500000000000000000000000000000000000`);

    expect(response.type).toBe('scenePatch');
    expect(response.patch?.create).toHaveLength(1);
    expect(response.patch?.create[0]).toMatchObject({
      kind: 'rectangle',
      name: 'RectanguloAzul',
      x: -1,
      y: -0.5
    });
  });

  it('treats responses with patch changes as scene patches even when type is missing', () => {
    const response = parser.parse(`{
      "message": "He preparado un rectángulo azul.",
      "patch": {
        "create": [
          {
            "kind": "rectangle",
            "name": "RectanguloAzul",
            "x": -1,
            "y": -0.5,
            "width": 2,
            "height": 1,
            "stroke": "#1d4ed8",
            "fill": "#dbeafe"
          }
        ]
      }
    }`);

    expect(response.type).toBe('scenePatch');
    expect(response.patch?.create).toHaveLength(1);
  });

  it('recovers plain text responses when the local model ignores the JSON format', () => {
    const response = parser.parse('Hola! En què et puc ajudar amb el diagrama?');

    expect(response.type).toBe('message');
    expect(response.message).toBe('Hola! En què et puc ajudar amb el diagrama?');
    expect(response.parseStatus).toBe('text-fallback');
  });

  it('recovers message text from common alternative JSON keys', () => {
    const response = parser.parse('{"answer":"Puc ajudar-te a crear una figura."}');

    expect(response.type).toBe('message');
    expect(response.message).toBe('Puc ajudar-te a crear una figura.');
    expect(response.parseStatus).toBe('json');
  });

  it('recovers top-level patch arrays without a patch wrapper', () => {
    const response = parser.parse(`{
      "message": "He preparat un cercle.",
      "create": [
        {
          "kind": "circle",
          "name": "Cercle",
          "cx": 0,
          "cy": 0,
          "r": 1
        }
      ]
    }`);

    expect(response.type).toBe('scenePatch');
    expect(response.patch?.create).toHaveLength(1);
    expect(response.patch?.create[0]).toMatchObject({ kind: 'circle', name: 'Cercle' });
  });

  it('converts a raw top-level shape with nested geometry and style into a scene patch', () => {
    const response = parser.parse(`{
      "kind": "ellipse",
      "geometry": {
        "cx": -1.2,
        "cy": 0.4,
        "rx": 1.4,
        "ry": 0.7
      },
      "style": {
        "strokeWidth": 0.06,
        "stroke": "#0a84ff",
        "fill": "#dbeafe"
      }
    }`);

    expect(response.type).toBe('scenePatch');
    expect(response.patch?.create).toHaveLength(1);
    expect(response.patch?.create[0]).toMatchObject({
      kind: 'ellipse',
      cx: -1.2,
      cy: 0.4,
      rx: 1.4,
      ry: 0.7,
      strokeWidth: 0.06,
      stroke: '#0a84ff',
      fill: '#dbeafe'
    });
  });

  it('marks empty JSON so dev logs can identify unhelpful local-model output', () => {
    const response = parser.parse('{}');

    expect(response.type).toBe('message');
    expect(response.parseStatus).toBe('empty-json');
  });

  it('marks copied placeholder JSON as unusable instead of showing ellipses', () => {
    const response = parser.parse('{"type":"message","message":"..."}');

    expect(response.type).toBe('message');
    expect(response.message).not.toBe('...');
    expect(response.parseStatus).toBe('placeholder-json');
  });

  it('marks prompt echoes when WebLLM copies the compact prompt payload', () => {
    const response = parser.parse(`{
      "instruction": "Hola",
      "now": { "iso": "2026-05-17T08:00:00.000Z" },
      "scene": { "name": "TikZ figure", "elements": [] }
    }`);

    expect(response.type).toBe('message');
    expect(response.parseStatus).toBe('prompt-echo');
  });

  it('marks plain compact prompt echoes without exposing the prompt payload', () => {
    const response = parser.parse(`Puc afegir grafs?
FECHA: iso=2026-05-23T07:52:13.378Z,locale=es-ES,timeZone=Europe/Madrid
ESCENA: Lienzo en blanco
SELECCION: ninguna
ELEMENTOS EXISTENTES:
- id=1; name=Ellipse; kind=ellipse
RESPUESTA: devuelve solo un objeto JSON valido.`);

    expect(response.type).toBe('message');
    expect(response.message).not.toContain('FECHA:');
    expect(response.parseStatus).toBe('compact-prompt-echo');
  });

  it('marks WebLLM selection and element dumps as prompt echoes', () => {
    const response = parser.parse(`SELECCION: no
ELEMENTOS:
- id=7e553043-9f80-4222-9ab6-6c82facdb5a0; kind=ellipse; name=Ellipse; geometry=cx=12.21,cy=7.21,rx=1.4,ry=0.85,rotation=0; style`);

    expect(response.type).toBe('message');
    expect(response.message).not.toContain('ELEMENTOS:');
    expect(response.parseStatus).toBe('compact-prompt-echo');
  });

  it('marks sentinel-tagged compact prompts as prompt echoes', () => {
    const response = parser.parse(`${AI_PROMPT_ECHO_SENTINEL}
TAREA: crea un cercle
SELECCION: ninguna
ELEMENTOS:
- ninguna`);

    expect(response.type).toBe('message');
    expect(response.message).not.toContain(AI_PROMPT_ECHO_SENTINEL);
    expect(response.parseStatus).toBe('compact-prompt-echo');
  });

  it('marks hallucinated WebLLM element dumps as prompt echoes without exposing technical ids', () => {
    const response = parser.parse(`SIN MANILLA:
- id=3a63da59-4925-4f02-ab19-006fbd90a243; kind=rectangle; name=Rectángulo; geometry=x=-23.1,y=-11.98,width=17.39,height=17.39,rotation=0; style=strokeWidth=0.06,stroke=#2ba81c,fill=#eedcc
- id=7e553043-9f80-4222-9ab6-6c82facdb5a0; kind=ellipse; name=Ellipse; geometry=cx=12.21,cy=7.21,rx=1.4,ry=0.85,rotation=0; style=strokeWidth=0.06,stroke=#1f2937,fill=#f1f5f9`);

    expect(response.type).toBe('message');
    expect(response.message).not.toContain('id=3a63da59');
    expect(response.message).not.toContain('kind=rectangle');
    expect(response.parseStatus).toBe('compact-prompt-echo');
  });

  it('marks copied local system notes as prompt echoes', () => {
    const response = parser.parse(`SIN MARKS Y TEXTOS
Para que el usuario puede escribir una frase real, es que se debe escribir una frase real.
Es que no puede modificar el color del rectangulo.`);

    expect(response.type).toBe('message');
    expect(response.message).not.toContain('SIN MARKS');
    expect(response.parseStatus).toBe('compact-prompt-echo');
  });

  it('marks system prompt echoes without trying to parse example JSON from them', () => {
    const response = parser.parse(`Eres el asistente de Tikz Drawer.
Devuelve solo JSON valido, sin markdown.
Formato: {"type":"message","message":"..."}`);

    expect(response.type).toBe('message');
    expect(response.parseStatus).toBe('compact-prompt-echo');
  });
});
