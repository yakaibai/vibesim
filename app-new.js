import { state, markDirty, clearDirty, signalDiagramChanged } from './src/state.js';
import { toYAML, serializeDiagram, parseYAML, sanitizeFilename } from './src/file-operations.js';
import { showConfirmSaveModal, handleSaveAsSubsystem, setStatusEl, setDiagramNameInput, setRuntimeInput, setSimDt, setAutoRouteInput, setVariablesInput, setVariablesPreview } from './src/modal-handlers.js';
import { handleMenuAction, setStatusEl, setFileOpenInput, setDeleteSelectionBtn, setHomeBtn, setZoomInBtn, setZoomOutBtn, performOpen, newDiagram } from './src/menu-handlers.js';
import { createRenderer } from "./render.js";
import { blockLibrary, buildBlockTemplates } from "./blocks/index.js";
import { diagramToFRD, stabilityMargins } from "./control/margins.js";
import { parseVariables } from "./utils/expr.js";

let svg = null;
let blockLayer = null;
let wireLayer = null;
let overlayLayer = null;
let renderer = null;
let rendererRef = { current: null };
let viewBox = { x: 0, y: 0, w: 800, h: 600 };
let zoomScale = 1;
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
const GRID_SIZE = 20;

function init() {
  svg = document.getElementById("svgCanvas");
  blockLibraryGroups = document.getElementById("blockLibraryGroups");
  
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
