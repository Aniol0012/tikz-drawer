export const EDITOR_STORAGE_KEYS = {
  state: 'tikz-drawer.state',
  savedTemplates: 'tikz-drawer.saved-templates',
  pinnedTools: 'tikz-drawer.pinned-tools',
  language: 'tikz-drawer.language',
  codeTheme: 'tikz-drawer.code-theme',
  latexExportConfig: 'tikz-drawer.latex-export-config'
} as const;

export const EDITOR_HISTORY_LIMIT = 80;
export const EDITOR_THEME_TOGGLE_COOLDOWN_MS = 180;
export const DEFAULT_EDITOR_SCALE = 24;
export const DEFAULT_ARROW_TIP_LENGTH = 8;
export const DEFAULT_ARROW_TIP_WIDTH = 6;

export const DEFAULT_LINE_COLOR = '#1f1f1f';
export const DEFAULT_LINE_STROKE_WIDTH = 0.18;
export const DEFAULT_SHAPE_STROKE_WIDTH = 0.08;
export const DEFAULT_FILL_COLOR = '#f1f1f1';
export const DEFAULT_TEXT_COLOR = '#161616';
export const DEFAULT_TEXT_FONT_SIZE = 0.42;
export const DEFAULT_TEXT_BOX_WIDTH = 4;
export const DEFAULT_ARROW_SCALE = 1.35;
export const DEFAULT_RECTANGLE_WIDTH = 4;
export const DEFAULT_RECTANGLE_HEIGHT = 2.4;
export const DEFAULT_RECTANGLE_Y = 1.5;
export const DEFAULT_RECTANGLE_CORNER_RADIUS = 0.14;
export const DEFAULT_CIRCLE_RADIUS = 1.4;
export const DEFAULT_ELLIPSE_RX = 2;
export const DEFAULT_ELLIPSE_RY = 1.1;

export const DEFAULT_TABLE_AXIS = 1;
export const DEFAULT_TABLE_FILL_COLOR = '#fafafa';
export const DEFAULT_TABLE_DIVIDER_COLOR = '#767676';
export const DEFAULT_TABLE_DIVIDER_STROKE_WIDTH = 0.05;

export const MIN_SCALE_FACTOR = 0.01;
export const MIN_SHAPE_DIMENSION = 0.2;
export const MIN_IMAGE_DIMENSION = 0.4;
export const MIN_CIRCLE_RADIUS = 0.1;
export const MIN_ELLIPSE_RADIUS = 0.1;
export const MIN_TEXT_FONT_SIZE = 0.2;
export const MIN_TEXT_SCALE_FACTOR = 0.7;
export const MIN_TEXT_BOX_WIDTH = 1.2;
export const MIN_TEXT_RESIZE_WIDTH = 0.4;
export const MIN_TEXT_RESIZE_HEIGHT = 0.24;

export const TEXT_WRAP_CHAR_WIDTH_FACTOR = 0.48;
export const TEXT_WRAP_MIN_CHAR_WIDTH = 0.12;
export const TEXT_WRAP_MIN_CHARACTERS = 4;
export const TEXT_RENDER_LINE_HEIGHT_FACTOR = 0.88;
export const TEXT_BOUNDING_LINE_HEIGHT_FACTOR = 0.9;
export const TEXT_MIN_HEIGHT_FACTOR = 0.72;
export const TEXT_MIN_EXPORT_WIDTH_FACTOR = 0.7;
export const TEXT_TSPAN_LINE_STEP_FACTOR = 1.14;
export const TEXT_DOUBLE_TAP_WINDOW_MS = 320;

export const SHAPE_STROKE_SCALE_FACTOR = 0.05;
export const MIN_RENDER_STROKE_WIDTH = 1;

export const MINIMAP_MIN_RADIUS = 0.9;
export const MINIMAP_MIN_TEXT_HEIGHT = 1.2;
export const MINIMAP_MIN_IMAGE_DIMENSION = 1.4;

export const FREEHAND_POINT_MIN_DISTANCE = 0.18;
export const MIN_POINTER_DRAG_DELTA = 0.12;
