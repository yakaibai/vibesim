import { state, markDirty, clearDirty, signalDiagramChanged, getFitToDiagram } from './state.js';
import { serializeDiagram, parseYAML, sanitizeFilename } from './file-operations.js';
import { captureRoutePointsSnapshot, applyRoutePointsSnapshot } from "../utils/route-points.js";
import { collectExternalPorts } from "../utils/subsystem-ports.js";
import { parseVariables } from "../utils/expr.js";

let statusEl = null;
let diagramNameInput = null;
let runtimeInput = null;
let simDt = null;
let autoRouteInput = null;
let variablesInput = null;
let variablesPreview = null;
let rendererRef = null;

export function setStatusEl(el) {
  statusEl = el;
}

export function setDiagramNameInput(el) {
  diagramNameInput = el;
}

export function setRuntimeInput(el) {
  runtimeInput = el;
}

export function setSimDt(el) {
  simDt = el;
}

export function setAutoRouteInput(el) {
  autoRouteInput = el;
}

export function setVariablesInput(el) {
  variablesInput = el;
}

export function setVariablesPreview(el) {
  variablesPreview = el;
}

export function setRendererRef(ref) {
  rendererRef = ref;
}

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const connectionKey = (conn) =>
  `${conn.from}:${Number(conn.fromIndex ?? 0)}->${conn.to}:${Number(conn.toIndex ?? 0)}`;

const captureUiState = () => {
  const routePoints = captureRoutePointsSnapshot(state.connections, connectionKey);
  const scopeState = {};
  state.blocks.forEach((block) => {
    if (block.type === "scope" && block.scopeData) {
      scopeState[block.id] = { kind: "scope", data: deepClone(block.scopeData) };
    } else if (block.type === "xyScope" && block.xyScopeData) {
      scopeState[block.id] = { kind: "xyScope", data: deepClone(block.xyScopeData) };
    }
  });
  return { routePoints, scopeState };
};

const buildSubsystemSpec = (data, fallbackName = "Subsystem") => {
  const blocks = Array.isArray(data?.blocks) ? deepClone(data.blocks) : [];
  const connections = Array.isArray(data?.connections) ? deepClone(data.connections) : [];
  if (!blocks.length) throw new Error("Subsystem YAML has no blocks");
  const name = String(data?.name || fallbackName).trim() || fallbackName;
  const externalInputs = collectExternalPorts(blocks, "labelSource");
  const externalOutputs = collectExternalPorts(blocks, "labelSink");
  if (!externalInputs.length && !externalOutputs.length) {
    throw new Error("No external ports found. Mark label blocks with 'Is external port'");
  }
  return {
    name,
    blocks,
    connections,
    externalInputs,
    externalOutputs,
  };
};

export function openSubsystemFromBlock(block) {
  if (!block || block.type !== "subsystem") return;
  const spec = block.params?.subsystem;
  if (!spec || !Array.isArray(spec.blocks) || !Array.isArray(spec.connections)) {
    if (statusEl) statusEl.textContent = "Subsystem is missing internal diagram data.";
    return;
  }
  const snapshot = serializeDiagram(state);
  const parentUiState = captureUiState();
  state.subsystemStack.push({
    parentDiagram: snapshot,
    parentUiState,
    hostBlockId: block.id,
  });
  updateSubsystemNavUi();
  loadDiagram(
    {
      name: String(spec.name || block.params?.name || "Subsystem"),
      blocks: deepClone(spec.blocks),
      connections: deepClone(spec.connections),
      variables: snapshot.variables || "",
      sampleTime: Number(snapshot.sampleTime) || state.sampleTime || 0.01,
      runtime: Number(snapshot.runtime) || Number(runtimeInput?.value) || 1,
    },
    { preserveSubsystemStack: true }
  );
  if (rendererRef?.current) {
    rendererRef.current.selectBlock(null);
  }
  if (statusEl) statusEl.textContent = `Opened subsystem: ${block.params?.name || "Subsystem"}`;
}

export function closeSubsystemView() {
  if (!state.subsystemStack.length) return;
  const innerSnapshot = serializeDiagram(state);
  const entry = state.subsystemStack.pop();
  loadDiagram(entry.parentDiagram, {
    preserveSubsystemStack: true,
    restoreUiState: deepClone(entry.parentUiState || null),
  });
  const host = state.blocks.get(entry.hostBlockId);
  if (host && host.type === "subsystem") {
    let spec;
    try {
      spec = buildSubsystemSpec(innerSnapshot, host.params?.name || "Subsystem");
    } catch (error) {
      spec = {
        name: String(host.params?.name || innerSnapshot.name || "Subsystem"),
        blocks: deepClone(innerSnapshot.blocks || []),
        connections: deepClone(innerSnapshot.connections || []),
        externalInputs: [],
        externalOutputs: [],
      };
    }
    host.params.subsystem = spec;
    host.params.name = spec.name;
    markDirty();
    if (rendererRef?.current) {
      rendererRef.current.updateBlockLabel(host);
    }
  }
  updateSubsystemNavUi();
  if (statusEl) statusEl.textContent = "Closed subsystem view";
}

export function loadDiagram(data, options = {}) {
  state.simSession = null;
  state.pauseRequested = false;
  state.routeEpoch = (Number(state.routeEpoch) || 0) + 1;
  const preserveSubsystemStack = Boolean(options?.preserveSubsystemStack);
  const restoreUiState = options?.restoreUiState && typeof options.restoreUiState === "object"
    ? options.restoreUiState
    : null;
  if (!data || typeof data !== "object") throw new Error("Invalid diagram file");
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  const connections = Array.isArray(data.connections) ? data.connections : [];
  state.diagramName = typeof data.name === "string" && data.name.trim() ? data.name.trim() : "vibesim";
  if (diagramNameInput) diagramNameInput.value = state.diagramName;
  if (runtimeInput && Number.isFinite(Number(data.runtime))) {
    runtimeInput.value = String(Number(data.runtime));
  }
  if (simDt && Number.isFinite(Number(data.sampleTime))) {
    simDt.value = String(Number(data.sampleTime));
    const value = Number(simDt.value);
    state.sampleTime = Number.isFinite(value) && value > 0 ? value : 0.01;
  }
  state.autoRoute = data.autoRoute !== false;
  if (autoRouteInput) autoRouteInput.checked = state.autoRoute;
  state.variablesText = typeof data.variables === "string" ? data.variables : "";
  if (variablesInput) variablesInput.value = state.variablesText;
  const parsed = parseVariables(state.variablesText);
  state.variables = parsed.vars;
  state.variablesDisplay = parsed.display;
  if (variablesPreview) {
    const entries = state.variablesDisplay.join("\n");
    variablesPreview.textContent = entries || "No variables defined.";
  }
  if (!preserveSubsystemStack) {
    state.subsystemStack = [];
    updateSubsystemNavUi();
  }
  if (rendererRef?.current) {
    rendererRef.current.clearWorkspace();
  }
  state.spawnIndex = 0;
  state.loadingDiagram = true;
  state.routingDirty = false;
  state.dirtyBlocks.clear();
  state.dirtyConnections.clear();

  const pointQueuesByKey = new Map();
  let hasConnectionsWithoutPoints = false;
  const enqueuePoints = (key, points) => {
    if (!Array.isArray(points) || points.length < 2) return;
    const queue = pointQueuesByKey.get(key) || [];
    queue.push(points);
    pointQueuesByKey.set(key, queue);
  };
  const parsePoints = (rawPoints) => {
    let pointsValue = rawPoints;
    if (typeof pointsValue === "string") {
      const trimmed = pointsValue.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          pointsValue = JSON.parse(trimmed);
        } catch {
          pointsValue = rawPoints;
        }
      }
    }
    if (!Array.isArray(pointsValue)) return [];
    const parsed = pointsValue
      .map((pt) => {
        if (Array.isArray(pt) && pt.length >= 2) {
          return { x: Number(pt[0]), y: Number(pt[1]) };
        }
        return { x: Number(pt?.x), y: Number(pt?.y) };
      })
      .filter((pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y));
    return parsed.length >= 2 ? parsed : [];
  };
  if (Array.isArray(data.routing)) {
    data.routing.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const key = `${entry.from}:${Number(entry.fromIndex ?? 0)}->${entry.to}:${Number(entry.toIndex ?? 0)}`;
      const points = parsePoints(entry.points);
      if (points.length >= 2) enqueuePoints(key, points);
    });
  }
  connections.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const key = `${entry.from}:${Number(entry.fromIndex ?? 0)}->${entry.to}:${Number(entry.toIndex ?? 0)}`;
    const points = parsePoints(entry.points);
    if (points.length >= 2) enqueuePoints(key, points);
    else hasConnectionsWithoutPoints = true;
  });
  const takePointsForKey = (key) => {
    const queue = pointQueuesByKey.get(key);
    if (!queue || !queue.length) return null;
    const points = queue.shift();
    if (!queue.length) pointQueuesByKey.delete(key);
    return points;
  };

  let loadedPointCount = 0;

  state.blocks.clear();
  state.connections = [];
  
  blocks.forEach((blockData) => {
    if (!blockData || !blockData.type) return;
    rendererRef.current?.createBlock(blockData.type, Number(blockData.x) || 0, Number(blockData.y) || 0, {
      id: blockData.id,
      rotation: Number(blockData.rotation) || 0,
      params: blockData.params || {},
    });
    const created = state.blocks.get(blockData.id);
    if (created && rendererRef.current?.updateBlockLabel) {
      rendererRef.current.updateBlockLabel(created);
    }
  });

  connections.forEach((connData) => {
    if (!connData) return;
    if (!state.blocks.has(connData.from) || !state.blocks.has(connData.to)) return;
    const beforeLen = state.connections.length;
    const createdConn = rendererRef.current?.createConnection(connData.from, connData.to, connData.toIndex ?? 0, connData.fromIndex ?? 0);
    if (!createdConn) {
      const createdError = typeof rendererRef.current?.getLastConnectionError === "function"
        ? rendererRef.current.getLastConnectionError()
        : null;
      if (createdError?.reason === "input_occupied") {
        throw new Error(
          `Invalid diagram: multiple outputs connected to ${connData.to}.in${Number(connData.toIndex ?? 0)}.`
        );
      }
      if (createdError?.reason === "duplicate") return;
      throw new Error(createdError?.message || "Invalid connection in loaded diagram.");
    }
    if (state.connections.length <= beforeLen) return;
    const created = state.connections[state.connections.length - 1];
    const key = connectionKey(created);
    const points = takePointsForKey(key);
    if (Array.isArray(points) && points.length >= 2) {
      created.points = points.map((pt) => ({ x: pt.x, y: pt.y }));
      loadedPointCount += 1;
    }
  });

  state.loadingDiagram = false;
  state.routingDirty = true;
  
  const fitToDiagram = getFitToDiagram();
  if (typeof fitToDiagram === "function") {
    fitToDiagram();
  }
  
  if (loadedPointCount > 0) {
    state.fastRouting = false;
    state.routingDirty = false;
    if (state.dirtyBlocks) state.dirtyBlocks.clear();
    if (state.dirtyConnections) state.dirtyConnections.clear();
    if (rendererRef?.current?.renderCurrentWirePaths) {
      rendererRef.current.renderCurrentWirePaths(true);
    }
    const shouldAutoRoute = state.autoRoute || hasConnectionsWithoutPoints;
    if (shouldAutoRoute) {
      requestAnimationFrame(() => {
        if (rendererRef?.current?.renderCurrentWirePaths) {
          rendererRef.current.renderCurrentWirePaths(true);
        }
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (rendererRef?.current?.forceFullRoute) {
              rendererRef.current.forceFullRoute(10000);
            }
          }, 0);
        });
      });
    }
  } else if (state.autoRoute) {
    state.fastRouting = true;
    state.routingDirty = true;
    state.dirtyConnections = new Set(state.connections);
    if (rendererRef?.current?.updateConnections) {
      rendererRef.current.updateConnections(true);
    }
    requestAnimationFrame(() => {
      setTimeout(() => {
        state.fastRouting = false;
        if (rendererRef?.current?.forceFullRoute) {
          rendererRef.current.forceFullRoute(10000);
        }
      }, 0);
    });
  } else if (rendererRef?.current?.updateConnections) {
    rendererRef.current.updateConnections(true);
  }
  
  signalDiagramChanged();
  if (statusEl) statusEl.textContent = `Loaded diagram: ${state.diagramName}`;
}

let subsystemUpBtn = null;

export function setSubsystemUpBtn(el) {
  subsystemUpBtn = el;
}

export function updateSubsystemNavUi() {
  if (!subsystemUpBtn) return;
  const isRoot = state.subsystemStack.length === 0;
  subsystemUpBtn.hidden = isRoot;
  subsystemUpBtn.setAttribute("aria-hidden", String(isRoot));
  document.body.classList.toggle("is-root-diagram", isRoot);
}
