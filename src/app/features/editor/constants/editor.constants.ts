export const EDITOR_STORAGE_KEYS = {
  state: 'tikz-drawer.state',
  savedTemplates: 'tikz-drawer.saved-templates',
  pinnedTools: 'tikz-drawer.pinned-tools',
  language: 'tikz-drawer.language',
  codeTheme: 'tikz-drawer.code-theme',
  latexExportConfig: 'tikz-drawer.latex-export-config',
  sidebarSizes: 'tikz-drawer.sidebar-sizes',
  syncState: 'tikz-drawer.sync-state'
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

export const EDITOR_CANVAS_MIN_WIDTH = 420;
export const EDITOR_CANVAS_MIN_HEIGHT = 320;
export const EDITOR_VIEWPORT_FALLBACK_WIDTH = 1280;
export const EDITOR_MOBILE_BREAKPOINT_PX = 760;
export const EDITOR_SIDEBAR_OVERLAY_BREAKPOINT_PX = 1220;
export const EDITOR_LEFT_SIDEBAR_MIN_WIDTH = 240;
export const EDITOR_RIGHT_SIDEBAR_MIN_WIDTH = 280;
export const EDITOR_LEFT_SIDEBAR_MOBILE_MIN_HEIGHT = 140;
export const EDITOR_RIGHT_SIDEBAR_MOBILE_MIN_HEIGHT = 200;
export const EDITOR_RIGHT_SIDEBAR_DESKTOP_STACKED_MIN_HEIGHT = 260;
export const EDITOR_ZOOM_STEP = 4;
export const EDITOR_PNG_EXPORT_SCALE = 2;
export const EDITOR_PASTE_OFFSET_STEP = 0.8;
export const EDITOR_IMAGE_ASPECT_RATIO_EPSILON = 0.01;
export const EDITOR_IMAGE_INSERT_VIEWPORT_RATIO = 0.52;
export const EDITOR_IMAGE_INSERT_MIN_RENDERED_LONG_EDGE_PX = 280;
export const EDITOR_IMAGE_INSERT_MAX_RENDERED_LONG_EDGE_PX = 720;
export const EDITOR_LINE_ARROW_SCALE_MIN = 0.4;
export const EDITOR_LINE_ARROW_SCALE_MAX = 4.5;
export const EDITOR_LINE_ANCHOR_DECIMALS = 3;
export const EDITOR_POINTER_TAP_MAX_DISTANCE_PX = 6;
export const EDITOR_CONTEXT_MENU_SUPPRESSION_MS = 400;
export const EDITOR_WHEEL_LINE_HEIGHT_PX = 16;
export const EDITOR_WHEEL_PAGE_HEIGHT_FALLBACK = 800;
export const EDITOR_WHEEL_ZOOM_SENSITIVITY = 0.0015;
export const EDITOR_SCALE_MIN = 12;
export const EDITOR_SCALE_MAX = 120;
export const EDITOR_SCALE_DECIMAL_FACTOR = 10;
export const OPACITY_MIN = 0;
export const OPACITY_MAX = 1;
export const SLIDER_DECIMAL_PLACES = 2;
