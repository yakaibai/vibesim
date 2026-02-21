import { state } from './state.js';
import { sanitizeFilename } from './file-operations.js';

let rendererRef = null;
let viewBox = { x: 0, y: 0, w: 800, h: 600 };
let zoomScale = 1;
let panStart = null;
let pendingPan = null;
let panRaf = null;
const WORLD = { w: 4000, h: 3000 };

export function setRendererRef(ref) {
  rendererRef = ref;
}

export function getViewBox() {
  return viewBox;
}

export function setViewBox(newViewBox) {
  viewBox = newViewBox;
}

export function getZoomScale() {
  return zoomScale;
}

export function setZoomScale(newScale) {
  zoomScale = newScale;
}

export function updateGrid(canvas, scale, viewbox) {
  if (!canvas) return;
  const gridPx = 10 * scale;
  const mod = (value, modValue) => ((value % modValue) + modValue) % modValue;
  const offsetX = -mod(viewbox.x * scale, gridPx);
  const offsetY = -mod(viewbox.y * scale, gridPx);
  canvas.style.setProperty("--grid-size", `${gridPx}px`);
  canvas.style.setProperty("--grid-offset-x", `${offsetX}px`);
  canvas.style.setProperty("--grid-offset-y", `${offsetY}px`);
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
