import { state, markDirty, clearDirty, signalDiagramChanged, setCurrentFilePath, getCurrentFilePath, setFitToDiagram, setUpdateStabilityPanel } from './src/state.js';
import { toYAML, serializeDiagram, parseYAML, sanitizeFilename } from './src/file-operations.js';
import { showConfirmSaveModal, handleSaveAsSubsystem, setStatusEl, setDiagramNameInput, setRuntimeInput, setSimDt, setAutoRouteInput, setVariablesInput, setVariablesPreview } from './src/modal-handlers.js';
import { handleMenuAction, setFileOpenInput, setDeleteSelectionBtn, setHomeBtn as setHomeBtnMenu, setZoomInBtn as setZoomInBtnMenu, setZoomOutBtn as setZoomOutBtnMenu, performOpen, newDiagram } from './src/menu-handlers.js';
import { openSubsystemFromBlock, closeSubsystemView, loadDiagram, setSubsystemUpBtn, updateSubsystemNavUi, setRendererRef as setRendererRefDiagram } from "./src/diagram-handlers.js";
import { setRendererRef, getViewBox, setViewBox, getZoomScale, setZoomScale, updateGrid, clearWorkspace, initViewBox, setSvg, setUpdateStatusBar } from './src/workspace-handlers.js';
import { createRenderer } from "./render.js";
import { blockLibrary, buildBlockTemplates } from "./blocks/index.js";
import { diagramToFRD } from "./control/diagram.js";
import { stabilityMargins } from "./control/margins.js";
import { parseVariables } from "./utils/expr.js";
import { createInspector } from "./blocks/inspector.js";
import { simulate, renderScope } from "./sim.js";
import { setupGlobalErrorHandlers, createErrorLogButton, showErrorLogInConsole, getLatestErrors } from "./browser-error-logger.js";
import { renderBlockLibrary, setBlockLibraryGroups, setBlockLibrary, setGridSize, setRendererRef as setRendererRefLibrary, setStatusEl as setStatusElLibrary } from "./src/block-library-handlers.js";
import { initSidebarUI, initZoomButtons, setStatusElRef, setHomeBtnRef, setZoomInBtnRef, setZoomOutBtnRef, initWindowControls, initModals } from "./src/ui-handlers.js";
import { initEventListeners, setRendererRef as setRendererRefEvent, setStatusEl as setStatusElEvent, setRuntimeInput as setRuntimeInputEvent, setInspectorBody, setRotateSelectionBtn, setMarginLoopSelect, setMarginOutputText, setRenderInspector as setRenderInspectorEvent } from "./src/event-handlers.js";

setupGlobalErrorHandlers();
createErrorLogButton();

const themes = [
  { id: "signal-slate", name: "Signal Slate" },
  { id: "analog-sand", name: "Analog Sand" },
  { id: "control-grid", name: "Control Grid" },
  { id: "orbit-ice", name: "Orbit Ice" },
  { id: "lab-white", name: "Lab White" },
  { id: "circuit-mint", name: "Circuit Mint" },
  { id: "radar-tan", name: "Radar Tan" },
  { id: "blueprint-lite", name: "Blueprint Lite" },
  { id: "quartz-steel", name: "Quartz Steel" },
  { id: "night-shift", name: "Night Shift" },
  { id: "terminal-ink", name: "Terminal Ink" },
  { id: "violet-burn", name: "Violet Burn" },
  { id: "noir-cyan", name: "Noir Cyan" },
];

const applyTheme = (themeId) => {
  const chosen = themes.find((theme) => theme.id === themeId) || themes[0];
  document.body.dataset.theme = chosen.id;
};

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

const getViewportSize = () => {
  const canvas = document.getElementById("canvas");
  if (!canvas) return { w: 800, h: 600 };
  const rect = canvas.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
};

const fitToDiagram = () => {
  if (state.blocks.size === 0) {
    initViewBox();
    return;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  state.blocks.forEach((block) => {
    minX = Math.min(minX, block.x);
    minY = Math.min(minY, block.y);
    maxX = Math.max(maxX, block.x + block.width);
    maxY = Math.max(maxY, block.y + block.height);
  });
  const pad = 60;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const boundsW = Math.max(1, maxX - minX);
  const boundsH = Math.max(1, maxY - minY);
  const { w, h } = getViewportSize();
  const scale = Math.max(0.1, Math.min(3, Math.min(w / boundsW, h / boundsH)));
  setZoomScale(scale);
  const center = { x: minX + boundsW / 2, y: minY + boundsH / 2 };
  const newW = w / scale;
  const newH = h / scale;
  setViewBox({ x: center.x - newW / 2, y: center.y - newH / 2, w: newW, h: newH });
};

export function init() {
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
  subsystemUpBtn = document.getElementById("subsystemUpBtn");
  marginLoopSelect = document.getElementById("marginLoopSelect");
  marginOutputText = document.getElementById("marginOutputText");
  fileOpenInput = document.getElementById("fileOpenInput");
  fileSaveAsBtn = document.getElementById("fileSaveAs");
  loadSubsystemInput = document.getElementById("loadSubsystemInput");
  loadInput = document.getElementById("loadInput");
  deleteSelectionBtn = document.getElementById("deleteSelection");
  rotateSelectionBtn = document.getElementById("rotateSelection");
  homeBtn = document.getElementById("homeBtn");
  zoomInBtn = document.getElementById("zoomInBtn");
  zoomOutBtn = document.getElementById("zoomOutBtn");
  printBtn = document.getElementById("print");
  statusEl = document.getElementById("status");
  diagramNameInput = document.getElementById("diagramName");
  runtimeInput = document.getElementById("runtimeInput");
  simDt = document.getElementById("simDt");
  autoRouteInput = document.getElementById("autoRoute");
  variablesInput = document.getElementById("variablesInput");
  variablesPreview = document.getElementById("variablesPreview");
  inspectorBody = document.getElementById("inspectorBody");
  
  setRendererRef(rendererRef);
  setRendererRefDiagram(rendererRef);
  setRendererRefLibrary(rendererRef);
  setSubsystemUpBtn(subsystemUpBtn);
  setDiagramNameInput(diagramNameInput);
  setRuntimeInput(runtimeInput);
  setSimDt(simDt);
  setAutoRouteInput(autoRouteInput);
  setVariablesInput(variablesInput);
  setVariablesPreview(variablesPreview);
  setStatusEl(statusEl);
  setStatusElLibrary(statusEl);
  setBlockLibraryGroups(blockLibraryGroups);
  setBlockLibrary(blockLibrary);
  setGridSize(GRID_SIZE);
  setSvg(svg);
  setUpdateStatusBar(updateStatusBar);
  setStatusElRef(statusEl);
  setHomeBtnRef(homeBtn);
  setZoomInBtnRef(zoomInBtn);
  setZoomOutBtnRef(zoomOutBtn);
  
  setHomeBtnMenu(homeBtn);
  setZoomInBtnMenu(zoomInBtn);
  setZoomOutBtnMenu(zoomOutBtn);
  
  setRendererRefEvent(rendererRef);
  setStatusElEvent(statusEl);
  setRuntimeInputEvent(runtimeInput);
  setInspectorBody(inspectorBody);
  setRotateSelectionBtn(rotateSelectionBtn);
  setMarginLoopSelect(marginLoopSelect);
  setMarginOutputText(marginOutputText);
  
  setRenderInspectorEvent(renderInspector);
  
  setFitToDiagram(fitToDiagram);
  setUpdateStabilityPanel(updateStabilityPanel);
  
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
  
  setRenderInspectorEvent(renderInspector);
  
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

  applyTheme(themes[0].id);
  window.addEventListener("diagramChanged", updateStabilityPanel);

  const applyVariablesBtn = document.getElementById("applyVariables");
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

  initViewBox();

  const isElectron = typeof window !== 'undefined' && window.electron;

  if (isElectron) {
    window.electron.onFileOpened(({ filePath, content, fileName }) => {
      try {
        const data = parseYAML(content);
        loadDiagram(data);
        setCurrentFilePath(filePath);
        if (statusEl) statusEl.textContent = `Loaded: ${fileName}`;
      } catch (error) {
        if (statusEl) statusEl.textContent = `Load error: ${error?.message || error}`;
      }
    });

    window.electron.onFileSaveRequest(async ({ filePath }) => {
      const yaml = toYAML(serializeDiagram(state));
      if (filePath) {
        const result = await window.electron.saveFile(yaml, filePath);
        if (result.success === true) {
          setCurrentFilePath(result.filePath);
          if (statusEl) statusEl.textContent = `Saved: ${filePath}`;
        } else {
          if (statusEl) statusEl.textContent = `Save error: ${result.error}`;
        }
      }
    });

    window.electron.onCheckBeforeClose(async () => {
      if (state.dirty) {
        const shouldSave = await showConfirmSaveModal();
        if (shouldSave === 'cancel') {
          window.electron.cancelClose();
        } else if (shouldSave === 'save') {
          const yaml = toYAML(serializeDiagram(state));
          const filePath = getCurrentFilePath();
          if (filePath) {
            const result = await window.electron.saveFile(yaml, filePath);
            if (result.success === true) {
              clearDirty();
              window.electron.canClose();
            } else {
              window.electron.cancelClose();
            }
          } else {
            const defaultName = sanitizeFilename(state.diagramName || "vibesim") + ".yaml";
            const result = await window.electron.saveFileAs(yaml, defaultName);
            if (result.success === true) {
              setCurrentFilePath(result.filePath);
              clearDirty();
              window.electron.canClose();
            } else {
              window.electron.cancelClose();
            }
          }
        } else {
          clearDirty();
          window.electron.canClose();
        }
      } else {
        window.electron.canClose();
      }
    });
  } else {
    if (fileOpenInput) {
      fileOpenInput.addEventListener("change", () => {
        const file = fileOpenInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const text = String(reader.result || "");
            const data = parseYAML(text);
            loadDiagram(data);
            setCurrentFilePath(file.name);
            if (statusEl) statusEl.textContent = `Loaded: ${file.name}`;
          } catch (error) {
            if (statusEl) statusEl.textContent = `Load error: ${error?.message || error}`;
          }
        };
        reader.readAsText(file);
        fileOpenInput.value = "";
      });
    }
  }

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
  
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      showErrorLogInConsole();
      const logs = getLatestErrors(1);
      if (logs.length > 0) {
        const entry = logs[0];
        const errorText = `${entry.error}\n${entry.filename ? `File: ${entry.filename}:${entry.lineno}:${entry.colno}` : ''}`;
        navigator.clipboard.writeText(errorText).then(() => {
          if (statusEl) statusEl.textContent = 'Latest error copied to clipboard!';
          setTimeout(() => {
            if (statusEl) statusEl.textContent = '';
          }, 3000);
        }).catch(err => {
          console.error('Failed to copy:', err);
        });
      } else {
        if (statusEl) statusEl.textContent = 'No errors logged';
        setTimeout(() => {
          if (statusEl) statusEl.textContent = '';
        }, 3000);
      }
    }
  });
  
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
  
  initEventListeners();
}

function initVSCodeUI() {
  init();
  initSidebarUI();
  initZoomButtons();
  initWindowControls();
  initModals();
}

document.addEventListener('DOMContentLoaded', initVSCodeUI);
