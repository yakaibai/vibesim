export * from './geometry.js';
export * from './svg-elements.js';

// Constants
export const FORCE_FULL_ROUTE_TIME_LIMIT_MS = 4000;
export const DEBUG_WIRE_CHECKS = false;
export const SELECTION_PAD = 10;
export const HOP_RADIUS = 4;
export const WIRE_CORNER_HANDLE_RADIUS = 6;
export const USERFUNC_MIN_WIDTH = 80;
export const USERFUNC_FIXED_HEIGHT = 80;
export const USERFUNC_PADDING_X = 12;
export const USERFUNC_PADDING_Y = 16;
export const USERFUNC_SETTLE_RETRIES = 4;
export const USERFUNC_SETTLE_DELAY_MS = 60;
export const TF_MIN_WIDTH = 80;
export const DTF_MIN_WIDTH = 80;
export const DIRTY_ROUTE_SCORE_WORSE_MARGIN = 8;
export const DIRTY_ROUTE_SCORE_WORSE_RATIO = 1.2;
export const HOP_SIZE = 5;
export const HOP_SNAP = 2;
export const MAX_HOP_SEGMENTS = 100;
export const WIRE_NEAR_GAP = 8;
export const MIN_HOP_LENGTH = 10;
export const ROUTE_WORKER_TIMEOUT = 5000;
export const HANDLE_RADIUS = 4;
export const CORNER_SNAP = 1;
export const WIRES_OVERLAP_GAP = 1;
export const BLOCK_MARGIN = 5;
export const SPLIT_GAP = 10;
export const SPLIT_SPACING = 3;
export const MIN_BEND_LENGTH = 5;
export const LABEL_WIRE_GAP = 8;
export const LABEL_PAD = 5;
export const MIN_LABEL_DISTANCE = 20;
export const INITIAL_VIEWBOX_SIZE = 1000;
export const INITIAL_ZOOM = 1;
export const MAX_ZOOM = 5;
export const MIN_ZOOM = 0.1;
export const GRID_SIZE = 20;
export const WIREFRAME_STROKE_WIDTH = 1;
export const WIREFRAME_DASH_ARRAY = '4,4';
export const SELECTION_STROKE_WIDTH = 1;
export const SELECTION_DASH_ARRAY = '4,4';
export const HIGHLIGHT_STROKE_WIDTH = 2;
export const HIGHLIGHT_COLOR = '#0078d4';
export const ERROR_COLOR = '#ff0000';
export const WARNING_COLOR = '#ff8c00';
export const INFO_COLOR = '#00bfff';
export const SUCCESS_COLOR = '#00ff00';
export const DEFAULT_BLOCK_WIDTH = 80;
export const DEFAULT_BLOCK_HEIGHT = 40;
export const MIN_BLOCK_WIDTH = 40;
export const MIN_BLOCK_HEIGHT = 20;
export const PORT_RADIUS = 4;
export const PORT_SPACING = 10;
export const PORT_MARGIN = 5;
export const WIRE_WIDTH = 1.5;
export const WIRE_SELECTED_WIDTH = 2.5;
export const WIRE_HOVER_WIDTH = 2;
export const WIRE_COLOR = '#000000';
export const WIRE_SELECTED_COLOR = '#0078d4';
export const WIRE_HOVER_COLOR = '#00bfff';
export const GRID_COLOR = '#cccccc';
export const GRID_MAJOR_COLOR = '#999999';
export const GRID_MAJOR_SIZE = 100;
export const BACKGROUND_COLOR = '#ffffff';
export const CANVAS_BACKGROUND_COLOR = '#f8f8f8';
export const STATUS_BAR_HEIGHT = 24;
export const STATUS_BAR_COLOR = '#f0f0f0';
export const STATUS_BAR_TEXT_COLOR = '#333333';
export const MODAL_BACKGROUND_COLOR = 'rgba(0, 0, 0, 0.5)';
export const MODAL_CONTENT_COLOR = '#ffffff';
export const MODAL_BORDER_COLOR = '#cccccc';
export const MODAL_SHADOW = '0 4px 12px rgba(0, 0, 0, 0.15)';
export const TOOLTIP_BACKGROUND_COLOR = '#ffffff';
export const TOOLTIP_BORDER_COLOR = '#cccccc';
export const TOOLTIP_TEXT_COLOR = '#333333';
export const TOOLTIP_SHADOW = '0 2px 8px rgba(0, 0, 0, 0.1)';
export const CONTEXT_MENU_BACKGROUND_COLOR = '#ffffff';
export const CONTEXT_MENU_BORDER_COLOR = '#cccccc';
export const CONTEXT_MENU_TEXT_COLOR = '#333333';
export const CONTEXT_MENU_SHADOW = '0 2px 8px rgba(0, 0, 0, 0.1)';
export const SCROLLBAR_WIDTH = 12;
export const SCROLLBAR_TRACK_COLOR = '#f0f0f0';
export const SCROLLBAR_THUMB_COLOR = '#cccccc';
export const SCROLLBAR_THUMB_HOVER_COLOR = '#999999';
export const ZOOM_CONTROLS_WIDTH = 32;
export const ZOOM_CONTROLS_HEIGHT = 128;
export const ZOOM_CONTROLS_BACKGROUND_COLOR = '#ffffff';
export const ZOOM_CONTROLS_BORDER_COLOR = '#cccccc';
export const ZOOM_CONTROLS_SHADOW = '0 2px 8px rgba(0, 0, 0, 0.1)';
export const DEBUG_PANEL_WIDTH = 300;
export const DEBUG_PANEL_HEIGHT = 400;
export const DEBUG_PANEL_BACKGROUND_COLOR = '#ffffff';
export const DEBUG_PANEL_BORDER_COLOR = '#cccccc';
export const DEBUG_PANEL_TEXT_COLOR = '#333333';
export const DEBUG_PANEL_SHADOW = '0 2px 8px rgba(0, 0, 0, 0.1)';

// Renderer factory
export function createRenderer(options = {}) {
  const {
    svg,
    blockLayer,
    wireLayer,
    overlayLayer,
    gridSize = GRID_SIZE,
    blockMargin = BLOCK_MARGIN,
    portRadius = PORT_RADIUS
  } = options;

  return {
    svg,
    blockLayer,
    wireLayer,
    overlayLayer,
    gridSize,
    blockMargin,
    portRadius,
    // Render methods will be added here
  };
}
