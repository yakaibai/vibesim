import { state } from './state.js';
import { toYAML, serializeDiagram, parseYAML, sanitizeFilename } from './file-operations.js';
import { showConfirmSaveModal, handleSaveAsSubsystem } from './modal-handlers.js';
import { handleMenuAction, setFileOpenInput, setDeleteSelectionBtn, performOpen, newDiagram } from './menu-handlers.js';
import { loadDiagram } from './diagram-handlers.js';
import { getViewBox, setViewBox, getZoomScale, setZoomScale, setUpdateStatusBar, getUpdateStatusBar, getSvg } from './workspace-handlers.js';
import { simulate, renderScope } from "../sim.js";
import { diagramToFRD } from "../control/diagram.js";
import { stabilityMargins } from "../control/margins.js";
import { generateCode } from "../codegen/index.js";
import { collectExternalPorts } from "../utils/subsystem-ports.js";
import { renderBlockLibrary } from "./block-library-handlers.js";

const deepClone = (value) => JSON.parse(JSON.stringify(value));

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

let rendererRef = null;
let statusEl = null;
let runtimeInput = null;
let simDt = null;
let autoRouteInput = null;
let variablesInput = null;
let variablesPreview = null;
let inspectorBody = null;
let rotateSelectionBtn = null;
let marginLoopSelect = null;
let marginOutputText = null;
let diagramNameInput = null;
let subsystemUpBtn = null;
let GRID_SIZE = 20;

const WORLD = { w: 4000, h: 3000 };

export function setRendererRef(ref) {
  rendererRef = ref;
}

export function setStatusEl(el) {
  statusEl = el;
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

export function setInspectorBody(el) {
  inspectorBody = el;
}

export function setRotateSelectionBtn(el) {
  rotateSelectionBtn = el;
}

export function setMarginLoopSelect(el) {
  marginLoopSelect = el;
}

export function setMarginOutputText(el) {
  marginOutputText = el;
}

export function setDiagramNameInput(el) {
  diagramNameInput = el;
}

export function setSubsystemUpBtn(el) {
  subsystemUpBtn = el;
}

export function setSvg(el) {
  svg = el;
}

export function setGridSize(size) {
  GRID_SIZE = size;
}

let renderInspector = () => {};
let updateStatusBar = () => {};

export function setRenderInspector(fn) {
  renderInspector = fn;
}

export function getViewportSize() {
  const canvas = document.getElementById("canvas");
  if (!canvas) return { w: 800, h: 600 };
  const rect = canvas.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
}

export function initEventListeners() {
  console.log('initEventListeners() - 开始执行');
  
  updateStatusBar = getUpdateStatusBar();
  const svg = getSvg();
  
  const runButtons = document.querySelectorAll('[data-action="run"]');
  const resetButtons = document.querySelectorAll('[data-action="reset"]');
  const codegenBtn = document.getElementById('codegenBtn');
  const codegenLang = document.getElementById('codegenLang');
  const codegenIncludeMain = document.getElementById('codegenIncludeMain');
  const debugLog = document.getElementById('debugLog');
  const errorBox = document.getElementById('errorBox');
  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  const loadInput = document.getElementById('loadInput');
  const loadSubsystemBtn = document.getElementById('loadSubsystemBtn');
  const loadSubsystemInput = document.getElementById('loadSubsystemInput');
  
  let runInProgress = false;
  
  const setRunButtonsMode = (running) => {
    const label = running ? "Pause" : "Run";
    const aria = running ? "Pause" : "Run";
    const title = running ? "Pause" : "Run";
    const iconPath = running ? "M7 5h4v14H7zM13 5h4v14h-4z" : "M7 5l12 7-12 7z";
    const targets = runButtons.length ? Array.from(runButtons) : [];
    targets.forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      button.setAttribute("aria-label", aria);
      button.setAttribute("title", title);
      if (button.classList.contains("sim-run")) {
        button.textContent = label;
      }
      const path = button.querySelector("svg path");
      if (path) path.setAttribute("d", iconPath);
    });
  };
  
  const handleRun = async () => {
    if (runInProgress) {
      state.pauseRequested = true;
      if (statusEl) statusEl.textContent = "Pausing...";
      return;
    }
    runInProgress = true;
    state.pauseRequested = false;
    setRunButtonsMode(true);
    try {
      const result = await simulate({
        state,
        runtimeInput,
        statusEl,
        downloadFile: (filename, content) => {
          const blob = new Blob([content], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        },
        session: state.simSession || null,
        control: {
          get pauseRequested() {
            return state.pauseRequested === true;
          },
        },
        onStatusUpdate: (status, time) => {
          updateStatusBar(status, time);
        },
      });
      if (result?.status === "paused") {
        state.simSession = result.session || null;
      } else {
        state.simSession = null;
      }
    } finally {
      runInProgress = false;
      state.pauseRequested = false;
      setRunButtonsMode(false);
    }
  };
  
  const waitForRunToStop = async () => {
    while (runInProgress) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  };
  
  const handleReset = async () => {
    if (runInProgress) {
      state.pauseRequested = true;
      if (statusEl) statusEl.textContent = "Pausing...";
      await waitForRunToStop();
    }
    state.simSession = null;
    state.pauseRequested = false;
    clearSimulationOutputs();
    if (statusEl) statusEl.textContent = "Reset";
    const selected = state.selectedId ? state.blocks.get(state.selectedId) : null;
    if (selected && (selected.type === "scope" || selected.type === "xyScope")) {
      renderInspector(selected);
    }
  };
  
  const clearSimulationOutputs = () => {
    const hasIncoming = (blockId, inputIndex) =>
      state.connections.some(
        (conn) => conn.to === blockId && Number(conn.toIndex ?? 0) === Number(inputIndex)
      );
    state.blocks.forEach((block) => {
      if (block.type === "scope") {
        const connected = Array.from({ length: block.inputs }, (_, idx) => hasIncoming(block.id, idx));
        const series = Array.from({ length: block.inputs }, () => []);
        block.scopeData = { time: [], series, connected };
        renderScope(block);
      } else if (block.type === "xyScope") {
        const connected = [hasIncoming(block.id, 0), hasIncoming(block.id, 1)];
        block.xyScopeData = { series: { x: [], y: [] }, connected };
        renderScope(block);
      } else if (block.type === "fileSink" && block.params) {
        block.params.lastCsv = "";
      }
    });
  };
  
  const refreshSelectedScopeInspector = () => {
    const selected = state.selectedId ? state.blocks.get(state.selectedId) : null;
    if (!selected || (selected.type !== "scope" && selected.type !== "xyScope")) return;
    renderScope(selected);
    renderInspector(selected);
  };
  
  if (simDt) {
    const updateSimDt = () => {
      const value = Number(simDt.value);
      state.sampleTime = Number.isFinite(value) && value > 0 ? value : 0.01;
      refreshSelectedScopeInspector();
    };
    updateSimDt();
    simDt.addEventListener("input", updateSimDt);
    simDt.addEventListener("change", updateSimDt);
  }
  
  if (runtimeInput) {
    const updateRuntimeInspector = () => {
      refreshSelectedScopeInspector();
    };
    runtimeInput.addEventListener("input", updateRuntimeInspector);
    runtimeInput.addEventListener("change", updateRuntimeInspector);
  }
  
  if (autoRouteInput) {
    autoRouteInput.checked = state.autoRoute !== false;
    const updateAutoRoute = () => {
      state.autoRoute = autoRouteInput.checked;
      if (state.autoRoute) {
        state.fastRouting = false;
        state.routingDirty = true;
        rendererRef.current?.forceFullRoute(500);
      } else {
        rendererRef.current?.updateConnections(true);
      }
    };
    autoRouteInput.addEventListener("change", updateAutoRoute);
  }
  
  if (runButtons.length) {
    runButtons.forEach((button) => button.addEventListener("click", handleRun));
  }
  
  if (resetButtons.length) {
    resetButtons.forEach((button) => button.addEventListener("click", handleReset));
  }
  
  if (codegenBtn) {
    codegenBtn.addEventListener("click", () => {
      const lang = codegenLang?.value || "c";
      const includeMain = codegenIncludeMain ? codegenIncludeMain.checked : true;
      const diagram = {
        blocks: Array.from(state.blocks.values()),
        connections: state.connections.slice(),
        variables: state.variables || {},
      };
      if (debugLog) {
        debugLog.textContent = [
          "[codegen] start",
          `lang=${lang}`,
          `includeMain=${includeMain}`,
          `sampleTime=${simDt?.value ?? 0.01}`,
          `blocks=${diagram.blocks.length} connections=${diagram.connections.length}`,
        ].join("\n");
      }
      try {
        const content = generateCode({
          lang,
          sampleTime: simDt?.value ?? 0.01,
          includeMain,
          diagram,
        });
        const baseName = sanitizeFilename(state.diagramName);
        const ext = lang === "python" ? "py" : lang === "tikz" ? "tex" : "c";
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${baseName}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        if (debugLog) debugLog.textContent += `\n[codegen] ok size=${content.length}`;
      } catch (error) {
        const message = error?.message || error;
        if (debugLog) debugLog.textContent += `\n[codegen] error: ${message}`;
        if (statusEl) statusEl.textContent = `Codegen error: ${message}`;
      }
    });
  }
  
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
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
  
  if (loadBtn && loadInput) {
    loadBtn.addEventListener("click", () => loadInput.click());
    loadInput.addEventListener("change", () => {
      const file = loadInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result || "");
          const data = parseYAML(text);
          loadDiagram(data);
          if (statusEl) statusEl.textContent = "Loaded diagram";
        } catch (error) {
          if (statusEl) statusEl.textContent = `Load error: ${error?.message || error}`;
        }
      };
      reader.readAsText(file);
      loadInput.value = "";
    });
  }
  
  if (loadSubsystemBtn && loadSubsystemInput) {
    loadSubsystemBtn.addEventListener("click", () => loadSubsystemInput.click());
    loadSubsystemInput.addEventListener("change", () => {
      const file = loadSubsystemInput.files?.[0];
      if (!file) return;
      
      const fileName = file.name;
      
      if (!fileName.toLowerCase().endsWith('.mos')) {
        if (statusEl) statusEl.textContent = `Invalid file type: ${fileName}. Only .mos files are supported for subsystems.`;
        loadSubsystemInput.value = "";
        return;
      }
      
      const fileKey = fileName.replace(/\.mos$/i, "").toLowerCase();
      
      if (state.loadedSubsystems.has(fileKey)) {
        if (statusEl) statusEl.textContent = `Subsystem already loaded: ${fileName}`;
        loadSubsystemInput.value = "";
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result || "");
          const data = parseYAML(text);
          const baseName = fileName.replace(/\.mos$/i, "") || "Subsystem";
          const spec = buildSubsystemSpec(data, baseName);
          const key = sanitizeFilename(spec.name).toLowerCase() || fileKey;
          
          state.loadedSubsystems.set(key, spec);
          renderBlockLibrary();
          if (statusEl) statusEl.textContent = `Loaded subsystem: ${spec.name}`;
        } catch (error) {
          if (statusEl) statusEl.textContent = `Subsystem load error: ${error?.message || error}`;
        }
      };
      reader.readAsText(file);
      loadSubsystemInput.value = "";
    });
  }
  
  const isElectron = typeof window !== 'undefined' && window.electron;
  
  if (isElectron) {
    window.electron.onFileOpened(({ filePath, content, fileName }) => {
      try {
        const data = parseYAML(content);
        loadDiagram(data);
        if (statusEl) statusEl.textContent = `Loaded: ${fileName}`;
      } catch (error) {
        if (statusEl) statusEl.textContent = `Load error: ${error?.message || error}`;
      }
    });
  }
  
  const handleDeleteSelection = () => {
    if (state.selectedId) {
      rendererRef.current?.deleteBlock(state.selectedId);
      rendererRef.current?.selectBlock(null);
      renderInspector(null);
      if (statusEl) statusEl.textContent = "Block deleted";
    } else if (state.selectedConnection) {
      rendererRef.current?.deleteConnection(state.selectedConnection);
      rendererRef.current?.selectConnection(null);
      renderInspector(null);
      if (statusEl) statusEl.textContent = "Wire deleted";
    }
  };
  
  const moveSelectedBlocks = (dx, dy) => {
    const selectedIds = state.selectedIds && state.selectedIds.size > 0 ? state.selectedIds : null;
    const ids = selectedIds && selectedIds.has(state.selectedId)
      ? Array.from(selectedIds)
      : state.selectedId
        ? [state.selectedId]
        : [];
    if (!ids.length) return false;
    ids.forEach((id) => {
      const block = state.blocks.get(id);
      if (!block) return;
      block.x = Math.max(0, block.x + dx);
      block.y = Math.max(0, block.y + dy);
      rendererRef.current?.updateBlockTransform(block);
    });
    if (state.dirtyBlocks) ids.forEach((id) => state.dirtyBlocks.add(id));
    state.fastRouting = false;
    state.routingDirty = true;
    rendererRef.current?.updateConnections(true);
    rendererRef.current?.updateSelectionBox();
    return true;
  };
  
  window.addEventListener("keydown", (event) => {
    const target = event.target;
    const isEditable =
      target &&
      (target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    if (isEditable) return;

    if (event.key === "Delete") {
      handleDeleteSelection();
      event.preventDefault();
      return;
    }

    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = -GRID_SIZE;
    if (event.key === "ArrowRight") dx = GRID_SIZE;
    if (event.key === "ArrowUp") dy = -GRID_SIZE;
    if (event.key === "ArrowDown") dy = GRID_SIZE;
    if (!dx && !dy) return;
    if (moveSelectedBlocks(dx, dy)) {
      event.preventDefault();
    }
  });
  
  if (rotateSelectionBtn) {
    rotateSelectionBtn.addEventListener("click", () => {
      if (!state.selectedId) return;
      const block = state.blocks.get(state.selectedId);
      if (!block) return;
      block.rotation = ((block.rotation || 0) + 90) % 360;
      rendererRef.current?.updateBlockTransform(block);
      state.routingDirty = true;
      if (state.dirtyBlocks) state.dirtyBlocks.add(block.id);
      state.fastRouting = false;
      rendererRef.current?.updateConnections(true);
    });
  }
  
  const printBtn = document.getElementById("printBtn");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }
  
  if (svg) {
    console.log('initEventListeners() - Setting up SVG events');
    
    svg.addEventListener("wheel", (event) => {
      event.preventDefault();
      const baseViewBox = { ...getViewBox() };
      const delta = Math.sign(event.deltaY);
      const factor = delta > 0 ? 0.9 : 1.1;
      const newZoomScale = Math.max(0.1, Math.min(3, getZoomScale() * factor));
      setZoomScale(newZoomScale);
      const anchor = rendererRef.current?.clientToSvg(event.clientX, event.clientY);
      updateViewBoxWithAnchor(newZoomScale, anchor, baseViewBox);
      updateStatusBar(null, null, newZoomScale);
    }, { passive: false });
    
    svg.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.button !== 1) return;
      if (event.target.closest(".drag-handle") || event.target.closest(".port")) return;
      if (event.ctrlKey && event.target === svg) {
        rendererRef.current?.startMarqueeSelection(event);
        return;
      }
      if (event.target !== svg && event.button === 0) return;
      event.preventDefault();
      const panStart = {
        clientX: event.clientX,
        clientY: event.clientY,
        viewBox: { ...getViewBox() },
      };
      svg.setPointerCapture(event.pointerId);
      state.isPanning = true;
      svg.classList.add('panning');
      
      const handlePointerMove = (event) => {
        if (!state.isPanning) return;
        event.preventDefault();
        const dxClient = panStart.clientX - event.clientX;
        const dyClient = panStart.clientY - event.clientY;
        const currentViewBox = getViewBox();
        const currentZoomScale = getZoomScale();
        const scaleX = currentViewBox.w / (svg.clientWidth || 1);
        const scaleY = currentViewBox.h / (svg.clientHeight || 1);
        const dx = dxClient * scaleX;
        const dy = dyClient * scaleY;
        const newViewBox = {
          x: panStart.viewBox.x + dx,
          y: panStart.viewBox.y + dy,
          w: panStart.viewBox.w,
          h: panStart.viewBox.h,
        };
        setViewBox(newViewBox);
        const canvas = document.getElementById("canvas");
        updateGrid(canvas, currentZoomScale, newViewBox);
      };
      
      const handlePointerUp = () => {
        state.isPanning = false;
        svg.classList.remove('panning');
        svg.releasePointerCapture(event.pointerId);
        svg.removeEventListener("pointermove", handlePointerMove);
        svg.removeEventListener("pointerup", handlePointerUp);
        svg.removeEventListener("pointercancel", handlePointerUp);
        if (state.routingDirty) {
          rendererRef.current?.updateConnections(true);
        }
      };
      
      svg.addEventListener("pointermove", handlePointerMove);
      svg.addEventListener("pointerup", handlePointerUp);
      svg.addEventListener("pointercancel", handlePointerUp);
    }, { passive: false });
    
    svg.addEventListener("click", (event) => {
      if (state.suppressNextCanvasClick) {
        state.suppressNextCanvasClick = false;
        return;
      }
      rendererRef.current?.clearPending();
      rendererRef.current?.selectBlock(null);
      rendererRef.current?.selectConnection(null);
    });
    
    svg.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });
    
    svg.addEventListener("drop", (event) => {
      event.preventDefault();
      const data = event.dataTransfer.getData("text/plain");
      if (!data) return;
      
      let draggedBlockType, draggedSubsystemKey;
      try {
        const parsed = JSON.parse(data);
        draggedBlockType = parsed.type;
        draggedSubsystemKey = parsed.subsystemKey || "";
      } catch (e) {
        console.error('drop - failed to parse data:', e);
        return;
      }
      
      const svgPoint = rendererRef.current?.clientToSvg(event.clientX, event.clientY);
      if (!svgPoint) return;
      
      const template = window.blockTemplates?.[draggedBlockType];
      const blockWidth = template?.width || 80;
      const blockHeight = template?.height || 80;
      const blockX = svgPoint.x - blockWidth / 2;
      const blockY = svgPoint.y - blockHeight / 2;
      
      try {
        const options = {};
        if (draggedBlockType === "subsystem" && draggedSubsystemKey) {
          const spec = state.loadedSubsystems.get(draggedSubsystemKey);
          if (!spec) throw new Error("Subsystem spec not found");
          options.params = {
            name: spec.name,
            externalInputs: deepClone(spec.externalInputs),
            externalOutputs: deepClone(spec.externalOutputs),
            subsystem: deepClone(spec),
          };
        }
        
        const block = rendererRef.current?.createBlock(draggedBlockType, blockX, blockY, options);
        if (block) {
          state.routingDirty = true;
          if (state.dirtyBlocks) state.dirtyBlocks.add(block.id);
          rendererRef.current?.updateConnections(true);
          if (statusEl) statusEl.textContent = `Added ${draggedBlockType}`;
        }
      } catch (error) {
        console.error('drop - error:', error);
        if (statusEl) statusEl.textContent = `Error adding ${draggedBlockType}`;
      }
    });
  }
  
  window.addEventListener("resize", () => {
    const canvas = document.getElementById("canvas");
    if (canvas && svg) {
      const currentViewBox = getViewBox();
      const currentZoomScale = getZoomScale();
      const { w, h } = getViewportSize();
      const center = { x: currentViewBox.x + currentViewBox.w / 2, y: currentViewBox.y + currentViewBox.h / 2 };
      const newW = w / currentZoomScale;
      const newH = h / currentZoomScale;
      const newViewBox = { x: center.x - newW / 2, y: center.y - newH / 2, w: newW, h: newH };
      setViewBox(newViewBox);
      updateGrid(canvas, currentZoomScale, newViewBox);
      rendererRef.current?.updateConnections(true);
    }
  });
  
  const canvasEl = document.getElementById("canvas");
  if (canvasEl && "ResizeObserver" in window) {
    let resizeRaf = 0;
    let lastSize = { w: 0, h: 0 };
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const rect = entry?.contentRect;
      const w = rect?.width || canvasEl.clientWidth || 0;
      const h = rect?.height || canvasEl.clientHeight || 0;
      if (!w || !h) return;
      if (Math.abs(w - lastSize.w) < 0.5 && Math.abs(h - lastSize.h) < 0.5) return;
      lastSize = { w, h };
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        if (!svg) return;
        const currentViewBox = getViewBox();
        const currentZoomScale = getZoomScale();
        const { w, h } = getViewportSize();
        const center = { x: currentViewBox.x + currentViewBox.w / 2, y: currentViewBox.y + currentViewBox.h / 2 };
        const newW = w / currentZoomScale;
        const newH = h / currentZoomScale;
        const newViewBox = { x: center.x - newW / 2, y: center.y - newH / 2, w: newW, h: newH };
        setViewBox(newViewBox);
        updateGrid(canvasEl, currentZoomScale, newViewBox);
        rendererRef.current?.updateConnections(true);
      });
    });
    ro.observe(canvasEl);
  }
  
  const collapseLibraryOnMobile = () => {
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    document.querySelectorAll(".toolbox details").forEach((group) => {
      group.open = false;
    });
  };
  collapseLibraryOnMobile();
  
  console.log('initEventListeners() - 完成');
}

function updateViewBoxWithAnchor(scale, anchor, baseViewBox = null) {
  const svg = getSvg();
  if (!svg) return;
  
  const currentViewBox = getViewBox();
  const actualBaseViewBox = baseViewBox || currentViewBox;
  
  const { w, h } = getViewportSize();
  const newW = w / scale;
  const newH = h / scale;
  const relX = (anchor.x - actualBaseViewBox.x) / actualBaseViewBox.w;
  const relY = (anchor.y - actualBaseViewBox.y) / actualBaseViewBox.h;
  const newViewBox = {
    x: anchor.x - relX * newW,
    y: anchor.y - relY * newH,
    w: newW,
    h: newH,
  };
  setViewBox(newViewBox);
  const canvas = document.getElementById("canvas");
  updateGrid(canvas, scale, newViewBox);
}

function updateGrid(canvas, scale, viewBox) {
  if (!canvas) return;
  const pattern = canvas.querySelector('pattern');
  if (pattern) {
    const size = Math.max(5, Math.round(20 / scale));
    pattern.setAttribute('width', String(size));
    pattern.setAttribute('height', String(size));
  }
}

function listLoopCandidates() {
  return [];
}
