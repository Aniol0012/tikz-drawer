import { AiResponseParserService } from './ai-response-parser.service';

describe('AiResponseParserService', () => {
  it('repairs truncated scene patches with very long decimal numbers', () => {
    const parser = new AiResponseParserService();
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
    const parser = new AiResponseParserService();
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
});
