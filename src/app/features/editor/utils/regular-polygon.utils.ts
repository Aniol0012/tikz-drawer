import { DEFAULT_ARROW_SCALE, DEFAULT_LINE_COLOR, DEFAULT_LINE_STROKE_WIDTH } from '../constants/editor.constants';
import {
  DEFAULT_REGULAR_POLYGON_GEOMETRY,
  REGULAR_POLYGON_MAX_SIDES,
  REGULAR_POLYGON_MIN_SIDES,
  type BuildRegularPolygonShapesOptions,
  type RegularPolygonDimensions,
  type RegularPolygonShape
} from '../models/regular-polygon.models';
import type { Point } from '../models/tikz.models';

const DEFAULT_REGULAR_POLYGON_CENTER: Point = { x: 0, y: 0 };

export const normalizeRegularPolygonDimensions = (dimensions: RegularPolygonDimensions): RegularPolygonDimensions => {
  const roundedSides = Number.isFinite(dimensions.sides)
    ? Math.round(dimensions.sides)
    : DEFAULT_REGULAR_POLYGON_GEOMETRY.sides;
  return {
    sides: Math.min(REGULAR_POLYGON_MAX_SIDES, Math.max(REGULAR_POLYGON_MIN_SIDES, roundedSides))
  };
};

export const regularPolygonPoints = (
  sides: number,
  radius: number,
  center: Point = DEFAULT_REGULAR_POLYGON_CENTER
): readonly Point[] => {
  const dimensions = normalizeRegularPolygonDimensions({ sides });
  const startAngle = Math.PI / 2;
  const angleStep = (Math.PI * 2) / dimensions.sides;

  return Array.from({ length: dimensions.sides }, (_, index) => {
    const angle = startAngle + angleStep * index;
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius
    };
  });
};

export const buildRegularPolygonShapes = (
  options: BuildRegularPolygonShapesOptions = DEFAULT_REGULAR_POLYGON_GEOMETRY
): readonly RegularPolygonShape[] => {
  const dimensions = normalizeRegularPolygonDimensions(options);
  const points = regularPolygonPoints(dimensions.sides, options.radius, {
    x: options.cx,
    y: options.cy
  });
  const firstPoint = points[0];

  if (!firstPoint) {
    return [];
  }

  return [
    {
      id: crypto.randomUUID(),
      name: options.name ?? 'Regular polygon',
      kind: 'line',
      stroke: DEFAULT_LINE_COLOR,
      strokeOpacity: 1,
      strokeWidth: DEFAULT_LINE_STROKE_WIDTH,
      from: firstPoint,
      to: firstPoint,
      anchors: points.slice(1),
      lineMode: 'straight',
      arrowStart: false,
      arrowEnd: false,
      arrowType: 'triangle',
      arrowColor: DEFAULT_LINE_COLOR,
      arrowOpacity: 1,
      arrowOpen: false,
      arrowRound: false,
      arrowScale: DEFAULT_ARROW_SCALE,
      arrowLengthScale: 1,
      arrowWidthScale: 1,
      arrowBendMode: 'none',
      mergeId: options.mergeId
    }
  ];
};
