import { state } from './state.js';
import { sanitizeFilename } from './file-operations.js';
import { getGridSize } from './grid-manager.js';

let rendererRef = null;
let viewBox = { x: 0, y: 0, w: 0, h: 0 };
let zoomScale = 1;
let panStart = null;
let pendingPan = null;
let panRaf = null;
let svg = null;
let updateStatusBar = null;
const WORLD = { w: 4000, h: 3000 };

export function setRendererRef(ref) {
  rendererRef = ref;
}

export function setSvg(el) {
  svg = el;
}

export function getSvg() {
  return svg;
}

export function setUpdateStatusBar(fn) {
  updateStatusBar = fn;
}

export function getUpdateStatusBar() {
  return updateStatusBar;
}

export function getViewBox() {
  return viewBox;
}

export function setViewBox(newViewBox) {
  viewBox = newViewBox;
  if (svg) {
    svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
    const canvas = document.getElementById("canvas");
    updateGrid(canvas, zoomScale, viewBox);
  }
}

export function getZoomScale() {
  return zoomScale;
}

export function setZoomScale(newScale) {
  zoomScale = newScale;
}

export function updateGrid(canvas, scale, viewbox) {
  if (!canvas) return;
  const userGridSize = getGridSize();
  const gridPx = userGridSize * scale;
  const mod = (value, modValue) => ((value % modValue) + modValue) % modValue;
  const offsetX = -mod(viewbox.x * scale, gridPx);
  const offsetY = -mod(viewbox.y * scale, gridPx);
  canvas.style.setProperty("--grid-size", `${gridPx}px`);
  canvas.style.setProperty("--grid-offset-x", `${offsetX}px`);
  canvas.style.setProperty("--grid-offset-y", `${offsetY}px`);
}

export function initViewBox() {
  const { w, h } = getViewportSize();
  if (viewBox.w === 0 || viewBox.h === 0) {
    zoomScale = 1.5;
    const vbW = w / zoomScale;
    const vbH = h / zoomScale;
    viewBox = {
      x: (WORLD.w - vbW) / 2,
      y: (WORLD.h - vbH) / 2,
      w: vbW,
      h: vbH,
    };
    if (svg) {
      svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
      svg.dataset.worldWidth = String(WORLD.w);
      svg.dataset.worldHeight = String(WORLD.h);
    }
    const canvas = document.getElementById("canvas");
    updateGrid(canvas, zoomScale, viewBox);
    if (updateStatusBar) updateStatusBar(null, null, zoomScale);
    return;
  }
  const center = { x: viewBox.x + viewBox.w / 2, y: viewBox.y + viewBox.h / 2 };
  viewBox = { x: center.x - (w / zoomScale) / 2, y: center.y - (h / zoomScale) / 2, w: w / zoomScale, h: h / zoomScale };
  if (svg) {
    svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  }
  const canvas = document.getElementById("canvas");
  updateGrid(canvas, zoomScale, viewBox);
  if (updateStatusBar) updateStatusBar(null, null, zoomScale);
}

export function getViewportSize() {
  const canvas = document.getElementById("canvas");
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width && rect.height) {
      return { w: rect.width, h: rect.height };
    }
  }
  return { w: svg?.clientWidth || 1, h: svg?.clientHeight || 1 };
}

export function clearWorkspace() {
  state.simSession = null;
  state.pauseRequested = false;
  if (rendererRef?.current) {
    rendererRef.current.clearWorkspace();
  }
  state.spawnIndex = 0;
  if (typeof updateStatusBar === "function") {
    updateStatusBar("Idle", 0, 1);
  }
  const inspectorBody = document.getElementById("inspectorBody");
  if (inspectorBody) {
    inspectorBody.textContent = "Select a block or wire.";
  }
}

export function sanitizeParamsForSave(params) {
  if (!params || typeof params !== "object") return params || {};
  const cleaned = { ...params };
  if (cleaned._visible && typeof cleaned._visible === "object") {
    const visible = {};
    Object.entries(cleaned._visible).forEach(([key, value]) => {
      if (key === "{}") return;
      if (!value) return;
      visible[key] = value;
    });
    cleaned._visible = visible;
  }
  return cleaned;
}
