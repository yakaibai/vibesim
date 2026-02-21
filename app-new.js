import { state, markDirty, clearDirty, signalDiagramChanged } from './src/state.js';
import { toYAML, serializeDiagram, parseYAML, sanitizeFilename } from './src/file-operations.js';
import { showConfirmSaveModal, handleSaveAsSubsystem, setStatusEl, setDiagramNameInput, setRuntimeInput, setSimDt, setAutoRouteInput, setVariablesInput, setVariablesPreview } from './src/modal-handlers.js';
import { handleMenuAction, setFileOpenInput, setDeleteSelectionBtn, setHomeBtn, setZoomInBtn, setZoomOutBtn, performOpen, newDiagram } from './src/menu-handlers.js';
import { openSubsystemFromBlock, closeSubsystemView, loadDiagram, setSubsystemUpBtn, updateSubsystemNavUi } from './src/diagram-handlers.js';
import { setRendererRef, getViewBox, setViewBox, getZoomScale, setZoomScale, updateGrid, clearWorkspace } from './src/workspace-handlers.js';
import { createRenderer } from "./render.js";
import { blockLibrary, buildBlockTemplates } from "./blocks/index.js";
import { diagramToFRD } from "./control/diagram.js";
import { stabilityMargins } from "./control/margins.js";
import { parseVariables } from "./utils/expr.js";
import { createInspector } from "./blocks/inspector.js";
import { simulate, renderScope } from "./sim.js";

let svg = null;
let blockLayer = null;
let wireLayer = null;
let overlayLayer = null;
let renderer = null;
let rendererRef = { current: null };
let blockLibraryGroups = null;
let statusEl = null;
let diagramNameInput = null;
let runtimeInput = null;
let simDt = null;
let autoRouteInput = null;
let variablesInput = null;
let variablesPreview = null;
let subsystemUpBtn = null;
let marginLoopSelect = null;
let marginOutputText = null;
let fileOpenInput = null;
let fileSaveAsBtn = null;
let loadSubsystemInput = null;
let loadInput = null;
let deleteSelectionBtn = null;
let rotateSelectionBtn = null;
let homeBtn = null;
let zoomInBtn = null;
let zoomOutBtn = null;
let printBtn = null;
let renderInspector = () => {};
let inspectorBody = null;
const GRID_SIZE = 20;

let statusBarInfo = null;
let statusBarTime = null;
let statusBarZoom = null;
let statusBarBlocks = null;
let statusBarConnections = null;

const updateStatusBar = (info, time, zoom) => {
  if (statusBarInfo && info) statusBarInfo.textContent = info;
  if (statusBarTime && time !== undefined && time !== null) statusBarTime.textContent = `${time.toFixed(2)}s`;
  if (statusBarZoom && zoom !== undefined && zoom !== null) statusBarZoom.textContent = `${Math.round(zoom * 100)}%`;
  if (statusBarBlocks) statusBarBlocks.textContent = `${state.blocks.size} blocks`;
  if (statusBarConnections) statusBarConnections.textContent = `${state.connections.length} connections`;
};

const focusPropertiesPanel = () => {
  if (!window.matchMedia("(max-width: 900px)").matches) return;
  const carousel = document.querySelector(".panel-carousel");
  const inspector = document.getElementById("inspector");
  if (!carousel || !inspector) return;
  carousel.scrollTo({ left: inspector.offsetLeft, behavior: "smooth" });
};

let updateStabilityPanel = () => {};

function init() {
  svg = document.getElementById("svgCanvas");
  blockLayer = document.getElementById("blockLayer");
  wireLayer = document.getElementById("wireLayer");
  overlayLayer = document.getElementById("overlayLayer");
  blockLibraryGroups = document.getElementById("blockLibraryGroups");
  statusBarInfo = document.getElementById("statusBarInfo");
  statusBarTime = document.getElementById("statusBarTime");
  statusBarZoom = document.getElementById("statusBarZoom");
  statusBarBlocks = document.getElementById("statusBarBlocks");
  statusBarConnections = document.getElementById("statusBarConnections");
  subsystemUpBtn = document.getElementById("subsystemUp");
  marginLoopSelect = document.getElementById("marginLoopSelect");
  marginOutputText = document.getElementById("marginOutputText");
  fileOpenInput = document.getElementById("fileOpenInput");
  fileSaveAsBtn = document.getElementById("fileSaveAs");
  loadSubsystemInput = document.getElementById("loadSubsystemInput");
  loadInput = document.getElementById("loadInput");
  deleteSelectionBtn = document.getElementById("deleteSelection");
  rotateSelectionBtn = document.getElementById("rotateSelection");
  homeBtn = document.getElementById("home");
  zoomInBtn = document.getElementById("zoomIn");
  zoomOutBtn = document.getElementById("zoomOut");
  printBtn = document.getElementById("print");
  statusEl = document.getElementById("status");
  diagramNameInput = document.getElementById("diagramName");
  runtimeInput = document.getElementById("runtime");
  simDt = document.getElementById("simDt");
  autoRouteInput = document.getElementById("autoRoute");
  variablesInput = document.getElementById("variablesInput");
  variablesPreview = document.getElementById("variablesPreview");
  inspectorBody = document.getElementById("inspectorBody");
  
  setRendererRef(rendererRef);
  setSubsystemUpBtn(subsystemUpBtn);
  setDiagramNameInput(diagramNameInput);
  setRuntimeInput(runtimeInput);
  setSimDt(simDt);
  setAutoRouteInput(autoRouteInput);
  setVariablesInput(variablesInput);
  setVariablesPreview(variablesPreview);
  setStatusEl(statusEl);
  
  console.log('init() - svg:', svg);
  console.log('init() - blockLibraryGroups:', blockLibraryGroups);
  
  if (svg) {
    renderer = createRenderer({
      svg,
      blockLayer,
      wireLayer,
      overlayLayer,
      state,
      onSelectBlock: (blockId) => {
        renderInspector(blockId);
        focusPropertiesPanel();
        updateStabilityPanel();
      },
      onSelectConnection: (connectionId) => {
        renderInspector(connectionId);
        focusPropertiesPanel();
        updateStabilityPanel();
      },
      onOpenSubsystem: (block) => {
        openSubsystemFromBlock(block);
      },
      onConnectionError: (message) => {
        if (statusEl) statusEl.textContent = message;
      },
    });
    rendererRef.current = renderer;
    console.log('init() - renderer initialized');
  }
  
  renderInspector = createInspector({
    inspectorBody,
    rotateSelectionBtn,
    renderer: rendererRef,
    renderScope,
    signalDiagramChanged,
    onOpenSubsystem: (block) => openSubsystemFromBlock(block),
    getRuntimeSeconds: () => {
      const value = Number(runtimeInput?.value);
      return Number.isFinite(value) ? value : null;
    },
  }).renderInspector;
  
  if (inspectorBody) {
    inspectorBody.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.edit !== "expr") return;
    });
  }
  
  if (blockLibraryGroups) {
    console.log('init() - blockLibraryGroups.innerHTML before:', blockLibraryGroups.innerHTML);
  }
  
  updateSubsystemNavUi();
  updateStatusBar("Ready", 0, 1);
  
  window.addEventListener("updateStatusBar", () => {
    updateStatusBar();
  });
  
  if (subsystemUpBtn) {
    subsystemUpBtn.addEventListener("click", () => {
      closeSubsystemView();
    });
  }
  if (diagramNameInput) {
    diagramNameInput.value = state.diagramName;
    diagramNameInput.addEventListener("input", () => {
      state.diagramName = diagramNameInput.value.trim() || "vibesim";
    });
  }
  if (marginLoopSelect) {
    marginLoopSelect.addEventListener("change", () => {
      state.selectedLoopKey = marginLoopSelect.value || null;
      updateStabilityPanel();
    });
  }
  updateStabilityPanel();

  renderBlockLibrary();
  if (blockLibraryGroups) {
    blockLibraryGroups.addEventListener("click", () => {
      const button = event.target.closest(".tool");
      if (!button) return;
      const type = button.dataset.type;
      const subsystemKey = button.dataset.subsystemKey || "";
      const centerX = viewBox.x + viewBox.w / 2;
      const centerY = viewBox.y + viewBox.h / 2;
      const block = spawnBlock(type, centerX, centerY, subsystemKey);
      if (block) {
        state.routingDirty = true;
        renderer.updateConnections(true);
        signalDiagramChanged();
      }
    });
  }

  const variablesInput = document.getElementById("variablesInput");
  const applyVariablesBtn = document.getElementById("applyVariables");
  const variablesPreview = document.getElementById("variablesPreview");
  const updateVariables = () => {
    state.variablesText = variablesInput?.value || "";
    const parsed = parseVariables(state.variablesText);
    state.variables = parsed.vars;
    state.variablesDisplay = parsed.display;
    if (variablesPreview) {
      const entries = state.variablesDisplay.join("\n");
      variablesPreview.textContent = entries || "No variables defined.";
    }
    if (statusEl) statusEl.textContent = "Variables updated";
    signalDiagramChanged();
  };
  if (applyVariablesBtn) applyVariablesBtn.addEventListener("click", updateVariables);
  if (variablesInput) variablesInput.addEventListener("change", updateVariables);
  if (variablesInput) updateVariables();

  renderBlockLibrary();
  if (blockLibraryGroups) {
    blockLibraryGroups.addEventListener("click", (event) => {
      const button = event.target.closest(".tool");
      if (!button) return;
      const type = button.dataset.type;
      const subsystemKey = button.dataset.subsystemKey || "";
      const centerX = viewBox.x + viewBox.w / 2;
      const centerY = viewBox.y + viewBox.h / 2;
      const block = spawnBlock(type, centerX, centerY, subsystemKey);
      if (block) {
        state.routingDirty = true;
        renderer.updateConnections(true);
        signalDiagramChanged();
      }
    });
  }

  initViewBox();

  if (fileSaveAsBtn) {
      fileSaveAsBtn.addEventListener("click", () => {
        const yaml = toYAML(serializeDiagram(state));
        const blob = new Blob([yaml], { type: "text/yaml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${sanitizeFilename(state.diagramName)}.yaml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        if (statusEl) statusEl.textContent = "Saved diagram";
      });
    }

    const menuTrigger = document.querySelector(".menu-trigger");
    const menu = document.querySelector(".menu");
    
    if (menuTrigger && menu) {
      menuTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("active");
      });
      
      document.addEventListener("click", () => {
        menu.classList.remove("active");
      });
      
      menu.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }

  const menubarDropdownItems = document.querySelectorAll('.menubar-dropdown .menubar-item');
  menubarDropdownItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      if (action) {
        menubarDropdowns.forEach(dropdown => dropdown.style.display = 'none');
        handleMenuAction(action);
      }
    });
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
