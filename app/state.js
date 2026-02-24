export const state = {
  blocks: new Map(),
  connections: [],
  pendingPort: null,
  nextId: 1,
  selectedId: null,
  selectedConnection: null,
  selectedIds: new Set(),
  selectedConnections: new Set(),
  suppressNextCanvasClick: false,
  deleteMode: false,
  isPinching: false,
  isPanning: false,
  routingDirty: false,
  routingScheduled: false,
  fastRouting: false,
  deferRouting: false,
  deferRoutingIds: new Set(),
  dirtyBlocks: new Set(),
  dirtyConnections: new Set(),
  variables: {},
  variablesText: "",
  variablesDisplay: [],
  diagramName: "vibesim",
  selectedLoopKey: null,
  sampleTime: 0.01,
  autoRoute: true,
  loadingDiagram: false,
  loadedSubsystems: new Map(),
  subsystemStack: [],
  routeEpoch: 0,
  spawnIndex: 0,
  simSession: null,
  pauseRequested: false,
  dirty: false,
  pendingAction: null,
};

let fitToDiagram = () => {};
let updateStabilityPanel = () => {};
let updateViewBox = () => {};
let updateViewBoxWithAnchor = () => {};
let currentFilePath = null;

export function markDirty() {
  state.dirty = true;
}

export function clearDirty() {
  state.dirty = false;
}

export const signalDiagramChanged = () => {
  markDirty();
  window.dispatchEvent(new Event("diagramChanged"));
};

export const deepClone = (value) => JSON.parse(JSON.stringify(value));

export function setFitToDiagram(fn) {
  fitToDiagram = fn;
}

export function setUpdateStabilityPanel(fn) {
  updateStabilityPanel = fn;
}

export function setUpdateViewBox(fn) {
  updateViewBox = fn;
}

export function setUpdateViewBoxWithAnchor(fn) {
  updateViewBoxWithAnchor = fn;
}

export function setCurrentFilePath(path) {
  currentFilePath = path;
}

export function getCurrentFilePath() {
  return currentFilePath;
}

export function getFitToDiagram() {
  return fitToDiagram;
}

export function getUpdateStabilityPanel() {
  return updateStabilityPanel;
}

export function getUpdateViewBox() {
  return updateViewBox;
}

export function getUpdateViewBoxWithAnchor() {
  return updateViewBoxWithAnchor;
}
