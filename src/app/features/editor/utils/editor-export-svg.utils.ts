import {
  MIN_RENDER_STROKE_WIDTH,
  SHAPE_STROKE_SCALE_FACTOR,
  TEXT_TSPAN_LINE_STEP_FACTOR
} from '../constants/editor.constants';
import type { ArrowEndpoint, SvgTextAnchor, ExportSvgDocument } from '../components/editor-page/editor-page.types';
import type { CanvasShape, LineShape, Point, TextShape, ThemeMode } from '../models/tikz.models';
import type { SelectionBounds } from './editor-page.utils';

const XML_NAMESPACE = 'http://www.w3.org/2000/svg';
const XML_LINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
const DEFAULT_EMPTY_EXPORT_WIDTH = 960;
const DEFAULT_EMPTY_EXPORT_HEIGHT = 720;
const MIN_EXPORT_SCENE_DIMENSION = 1;
const EXPORT_SCALE_MIN = 42;
const EXPORT_SCALE_MAX = 120;
const EXPORT_SCALE_BASE = 1600;
const EXPORT_PADDING_MIN = 28;
const EXPORT_PADDING_SCALE_FACTOR = 0.9;
const MIN_EXPORT_WIDTH = 320;
const MIN_EXPORT_HEIGHT = 240;
const DARK_BACKGROUND = '#161616';
const LIGHT_BACKGROUND = '#ffffff';
const EXPORT_TEXT_FONT_FAMILY = 'Geist, Arial, sans-serif';

export interface SvgExportHelpers {
  readonly computeBounds: (shapes: readonly CanvasShape[]) => SelectionBounds | null;
  readonly buildLinePath: (shape: LineShape, mapPoint: (point: Point) => Point) => string;
  readonly displayTextLinesForShape: (shape: TextShape) => readonly string[];
  readonly textRenderXAt: (shape: TextShape, projectX: (value: number) => number, scale: number) => number;
  readonly textAnchor: (align: TextShape['textAlign']) => SvgTextAnchor;
  readonly arrowMarkerId: (shape: LineShape, side: ArrowEndpoint) => string;
  readonly arrowMarkerViewBox: (shape: LineShape) => string;
  readonly arrowMarkerWidth: (shape: LineShape) => number;
  readonly arrowMarkerHeight: (shape: LineShape) => number;
  readonly arrowMarkerRefX: (shape: LineShape, side: ArrowEndpoint) => number;
  readonly arrowMarkerRefY: (shape: LineShape) => number;
  readonly arrowMarkerPath: (shape: LineShape) => string;
  readonly arrowMarkerFill: (shape: LineShape) => string;
  readonly arrowMarkerStrokeLineJoin: (shape: LineShape) => 'round' | 'miter';
  readonly arrowMarkerStrokeLineCap: (shape: LineShape) => 'round' | 'butt';
}

export interface BuildSvgExportOptions {
  readonly selectedShapes: readonly CanvasShape[];
  readonly sceneShapes: readonly CanvasShape[];
  readonly theme: ThemeMode;
  readonly helpers: SvgExportHelpers;
}

export const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildEmptyCanvasExportDocument = (background: string): ExportSvgDocument => ({
  width: DEFAULT_EMPTY_EXPORT_WIDTH,
  height: DEFAULT_EMPTY_EXPORT_HEIGHT,
  markup: [
    `<svg xmlns="${XML_NAMESPACE}" xmlns:xlink="${XML_LINK_NAMESPACE}" width="${DEFAULT_EMPTY_EXPORT_WIDTH}" height="${DEFAULT_EMPTY_EXPORT_HEIGHT}" viewBox="0 0 ${DEFAULT_EMPTY_EXPORT_WIDTH} ${DEFAULT_EMPTY_EXPORT_HEIGHT}">`,
    `<rect x="0" y="0" width="${DEFAULT_EMPTY_EXPORT_WIDTH}" height="${DEFAULT_EMPTY_EXPORT_HEIGHT}" fill="${background}" />`,
    '</svg>'
  ].join('')
});

export const buildCanvasExportDocument = ({
  selectedShapes,
  sceneShapes,
  theme,
  helpers
}: BuildSvgExportOptions): ExportSvgDocument => {
  const shapes = selectedShapes.length ? selectedShapes : sceneShapes;
  const bounds = helpers.computeBounds(shapes);
  const background = theme === 'dark' ? DARK_BACKGROUND : LIGHT_BACKGROUND;

  if (!bounds || !shapes.length) {
    return buildEmptyCanvasExportDocument(background);
  }

  const sceneWidth = Math.max(bounds.right - bounds.left, MIN_EXPORT_SCENE_DIMENSION);
  const sceneHeight = Math.max(bounds.top - bounds.bottom, MIN_EXPORT_SCENE_DIMENSION);
  const longestSide = Math.max(sceneWidth, sceneHeight, MIN_EXPORT_SCENE_DIMENSION);
  const scale = Math.min(EXPORT_SCALE_MAX, Math.max(EXPORT_SCALE_MIN, EXPORT_SCALE_BASE / longestSide));
  const padding = Math.max(EXPORT_PADDING_MIN, scale * EXPORT_PADDING_SCALE_FACTOR);
  const width = Math.max(Math.ceil(sceneWidth * scale + padding * 2), MIN_EXPORT_WIDTH);
  const height = Math.max(Math.ceil(sceneHeight * scale + padding * 2), MIN_EXPORT_HEIGHT);
  const projectX = (value: number): number => (value - bounds.left) * scale + padding;
  const projectY = (value: number): number => (bounds.top - value) * scale + padding;

  const defs = shapes
    .filter((shape): shape is LineShape => shape.kind === 'line' && (shape.arrowStart || shape.arrowEnd))
    .map(
      (shape) => `
          <marker id="${escapeXml(helpers.arrowMarkerId(shape, 'end'))}" viewBox="${helpers.arrowMarkerViewBox(shape)}" markerWidth="${helpers.arrowMarkerWidth(shape)}" markerHeight="${helpers.arrowMarkerHeight(shape)}" refX="${helpers.arrowMarkerRefX(shape, 'end')}" refY="${helpers.arrowMarkerRefY(shape)}" orient="auto" overflow="visible" markerUnits="strokeWidth">
            <path d="${escapeXml(helpers.arrowMarkerPath(shape))}" fill="${escapeXml(helpers.arrowMarkerFill(shape))}" stroke="${escapeXml(shape.arrowColor)}" stroke-opacity="${shape.arrowOpacity}" fill-opacity="${shape.arrowOpacity}" stroke-linejoin="${helpers.arrowMarkerStrokeLineJoin(shape)}" stroke-linecap="${helpers.arrowMarkerStrokeLineCap(shape)}" />
          </marker>
          <marker id="${escapeXml(helpers.arrowMarkerId(shape, 'start'))}" viewBox="${helpers.arrowMarkerViewBox(shape)}" markerWidth="${helpers.arrowMarkerWidth(shape)}" markerHeight="${helpers.arrowMarkerHeight(shape)}" refX="${helpers.arrowMarkerRefX(shape, 'start')}" refY="${helpers.arrowMarkerRefY(shape)}" orient="auto-start-reverse" overflow="visible" markerUnits="strokeWidth">
            <path d="${escapeXml(helpers.arrowMarkerPath(shape))}" fill="${escapeXml(helpers.arrowMarkerFill(shape))}" stroke="${escapeXml(shape.arrowColor)}" stroke-opacity="${shape.arrowOpacity}" fill-opacity="${shape.arrowOpacity}" stroke-linejoin="${helpers.arrowMarkerStrokeLineJoin(shape)}" stroke-linecap="${helpers.arrowMarkerStrokeLineCap(shape)}" />
          </marker>`
    )
    .join('');

  const body = shapes
    .map((shape) => {
      switch (shape.kind) {
        case 'line': {
          const markerStart = shape.arrowStart
            ? ` marker-start="url(#${escapeXml(helpers.arrowMarkerId(shape, 'start'))})"`
            : '';
          const markerEnd = shape.arrowEnd
            ? ` marker-end="url(#${escapeXml(helpers.arrowMarkerId(shape, 'end'))})"`
            : '';
          return `<path d="${escapeXml(
            helpers.buildLinePath(shape, (point) => ({ x: projectX(point.x), y: projectY(point.y) }))
          )}" fill="none" stroke="${escapeXml(shape.stroke)}" stroke-opacity="${shape.strokeOpacity}" stroke-width="${Math.max(shape.strokeWidth * scale * SHAPE_STROKE_SCALE_FACTOR, MIN_RENDER_STROKE_WIDTH)}" stroke-linecap="round" stroke-linejoin="round"${markerStart}${markerEnd} />`;
        }
        case 'rectangle': {
          const rotate = shape.rotation
            ? ` transform="rotate(${shape.rotation} ${projectX(shape.x + shape.width / 2)} ${projectY(shape.y + shape.height / 2)})"`
            : '';
          return `<rect x="${projectX(shape.x)}" y="${projectY(shape.y + shape.height)}" width="${shape.width * scale}" height="${shape.height * scale}" rx="${shape.cornerRadius * scale}" fill="${escapeXml(shape.fill)}" fill-opacity="${shape.fillOpacity}" stroke="${escapeXml(shape.stroke)}" stroke-opacity="${shape.strokeOpacity}" stroke-width="${Math.max(shape.strokeWidth * scale * SHAPE_STROKE_SCALE_FACTOR, MIN_RENDER_STROKE_WIDTH)}"${rotate} />`;
        }
        case 'triangle': {
          const apexX = shape.x + shape.width * shape.apexOffset;
          const apexY = shape.y + shape.height;
          const path = `M ${projectX(apexX)} ${projectY(apexY)} L ${projectX(shape.x)} ${projectY(shape.y)} L ${projectX(shape.x + shape.width)} ${projectY(shape.y)} Z`;
          const rotate = shape.rotation
            ? ` transform="rotate(${shape.rotation} ${projectX(shape.x + shape.width / 2)} ${projectY(shape.y + shape.height / 2)})"`
            : '';
          return `<path d="${escapeXml(path)}" fill="${escapeXml(shape.fill)}" fill-opacity="${shape.fillOpacity}" stroke="${escapeXml(shape.stroke)}" stroke-opacity="${shape.strokeOpacity}" stroke-width="${Math.max(shape.strokeWidth * scale * SHAPE_STROKE_SCALE_FACTOR, MIN_RENDER_STROKE_WIDTH)}"${rotate} />`;
        }
        case 'circle': {
          const rotate = shape.rotation
            ? ` transform="rotate(${shape.rotation} ${projectX(shape.cx)} ${projectY(shape.cy)})"`
            : '';
          return `<circle cx="${projectX(shape.cx)}" cy="${projectY(shape.cy)}" r="${shape.r * scale}" fill="${escapeXml(shape.fill)}" fill-opacity="${shape.fillOpacity}" stroke="${escapeXml(shape.stroke)}" stroke-opacity="${shape.strokeOpacity}" stroke-width="${Math.max(shape.strokeWidth * scale * SHAPE_STROKE_SCALE_FACTOR, MIN_RENDER_STROKE_WIDTH)}"${rotate} />`;
        }
        case 'ellipse': {
          const rotate = shape.rotation
            ? ` transform="rotate(${shape.rotation} ${projectX(shape.cx)} ${projectY(shape.cy)})"`
            : '';
          return `<ellipse cx="${projectX(shape.cx)}" cy="${projectY(shape.cy)}" rx="${shape.rx * scale}" ry="${shape.ry * scale}" fill="${escapeXml(shape.fill)}" fill-opacity="${shape.fillOpacity}" stroke="${escapeXml(shape.stroke)}" stroke-opacity="${shape.strokeOpacity}" stroke-width="${Math.max(shape.strokeWidth * scale * SHAPE_STROKE_SCALE_FACTOR, MIN_RENDER_STROKE_WIDTH)}"${rotate} />`;
        }
        case 'text': {
          const renderX = helpers.textRenderXAt(shape, projectX, scale);
          const anchor = helpers.textAnchor(shape.textAlign);
          const rotate = shape.rotation
            ? ` transform="rotate(${shape.rotation} ${projectX(shape.x)} ${projectY(shape.y)})"`
            : '';
          const lines = helpers
            .displayTextLinesForShape(shape)
            .map(
              (line, index) =>
                `<tspan x="${renderX}" dy="${index === 0 ? 0 : shape.fontSize * scale * TEXT_TSPAN_LINE_STEP_FACTOR}">${escapeXml(line)}</tspan>`
            )
            .join('');
          return `<text x="${renderX}" y="${projectY(shape.y)}" font-size="${shape.fontSize * scale}" font-weight="${shape.fontWeight}" font-style="${shape.fontStyle}" text-decoration="${shape.textDecoration}" text-anchor="${anchor}" fill="${escapeXml(shape.color)}" fill-opacity="${shape.colorOpacity}" font-family="${EXPORT_TEXT_FONT_FAMILY}" xml:space="preserve"${rotate}>${lines}</text>`;
        }
        case 'image': {
          const rotate = shape.rotation
            ? ` transform="rotate(${shape.rotation} ${projectX(shape.x + shape.width / 2)} ${projectY(shape.y + shape.height / 2)})"`
            : '';
          return `<image x="${projectX(shape.x)}" y="${projectY(shape.y + shape.height)}" width="${shape.width * scale}" height="${shape.height * scale}" opacity="${shape.strokeOpacity}" href="${escapeXml(shape.src)}" preserveAspectRatio="xMidYMid meet"${rotate} />`;
        }
      }
    })
    .join('');

  const defsMarkup = defs ? `<defs>${defs}</defs>` : '';
  return {
    width,
    height,
    markup: [
      `<svg xmlns="${XML_NAMESPACE}" xmlns:xlink="${XML_LINK_NAMESPACE}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<rect x="0" y="0" width="${width}" height="${height}" fill="${background}" />`,
      defsMarkup,
      body,
      '</svg>'
    ].join('')
  };
};
