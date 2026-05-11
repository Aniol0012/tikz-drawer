import type { LineStrokeStyle } from '../models/tikz.models';

export interface LineStrokeStyleOptionDescriptor {
  readonly id: LineStrokeStyle;
  readonly labelKey: string;
  readonly iconPath: string;
}

const LINE_STROKE_STYLE_IDS = ['solid', 'dashed', 'dotted', 'dash-dotted', 'loosely-dashed'] as const satisfies readonly LineStrokeStyle[];

const lineStrokeStyleLabelKey = (style: LineStrokeStyle): string => {
  switch (style) {
    case 'solid':
      return 'lineStrokeStyleSolid';
    case 'dashed':
      return 'lineStrokeStyleDashed';
    case 'dotted':
      return 'lineStrokeStyleDotted';
    case 'dash-dotted':
      return 'lineStrokeStyleDashDotted';
    case 'loosely-dashed':
      return 'lineStrokeStyleLooselyDashed';
  }
};

const lineStrokeStyleIconPath = (style: LineStrokeStyle): string => {
  switch (style) {
    case 'solid':
      return 'M4 12h16';
    case 'dashed':
      return 'M4 12h4M10 12h4M16 12h4';
    case 'dotted':
      return 'M5 12h.01M9.5 12h.01M14 12h.01M18.5 12h.01';
    case 'dash-dotted':
      return 'M4 12h6M12.5 12h.01M15 12h5';
    case 'loosely-dashed':
      return 'M4 12h7M15 12h5';
  }
};

export const LINE_STROKE_STYLE_OPTIONS: readonly LineStrokeStyleOptionDescriptor[] = LINE_STROKE_STYLE_IDS.map((id) => ({
  id,
  labelKey: lineStrokeStyleLabelKey(id),
  iconPath: lineStrokeStyleIconPath(id)
}));
