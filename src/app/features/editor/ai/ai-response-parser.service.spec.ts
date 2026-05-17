import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { AiResponseParserService } from './ai-response-parser.service';

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

  it('marks empty JSON so dev logs can identify unhelpful local-model output', () => {
    const response = parser.parse('{}');

    expect(response.type).toBe('message');
    expect(response.parseStatus).toBe('empty-json');
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
});
