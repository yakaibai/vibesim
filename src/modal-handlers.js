import { state } from './state.js';
import { serializeDiagram, toYAML, sanitizeFilename } from './file-operations.js';

let statusEl = null;
let diagramNameInput = null;
let runtimeInput = null;
let simDt = null;
let autoRouteInput = null;
let variablesInput = null;
let variablesPreview = null;

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

export function handleSaveAsSubsystem() {
  const blocks = Array.from(state.blocks.values());
  const externalInputs = collectExternalPorts(blocks, "labelSource");
  const externalOutputs = collectExternalPorts(blocks, "labelSink");
  
  if (!externalInputs.length && !externalOutputs.length) {
    if (statusEl) {
      statusEl.textContent = "Cannot save as subsystem: No external ports found. Add labelSource (input) or labelSink (output) blocks and mark them as 'Is external port'.";
    }
    return;
  }
  
  const modal = document.getElementById("subsystemNameModal");
  const nameInput = document.getElementById("subsystemNameInput");
  
  if (!modal || !nameInput) {
    if (statusEl) statusEl.textContent = "Error: Subsystem name dialog not found";
    return;
  }
  
  nameInput.value = sanitizeFilename(state.diagramName);
  modal.classList.add("show");
  nameInput.focus();
  nameInput.select();
}

export function confirmSubsystemName() {
  const modal = document.getElementById("subsystemNameModal");
  const nameInput = document.getElementById("subsystemNameInput");
  
  if (!modal || !nameInput) return;
  
  const modelName = String(nameInput.value || "").trim();
  
  if (!modelName) {
    if (statusEl) statusEl.textContent = "Model name cannot be empty";
    return;
  }
  
  const defaultFileName = `${sanitizeFilename(modelName)}.mos`;
  
  if (window.electron) {
    const diagramData = serializeDiagram(state);
    diagramData.name = modelName;
    const yaml = toYAML(diagramData);
    window.electron.saveSubsystemAs(yaml, defaultFileName);
  } else {
    const diagramData = serializeDiagram(state);
    diagramData.name = modelName;
    const yaml = toYAML(diagramData);
    const blob = new Blob([yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  modal.classList.remove("show");
  
  if (statusEl) {
    statusEl.textContent = `Saved subsystem: ${modelName}`;
  }
}

export function showConfirmSaveModal(callback) {
  const modal = document.getElementById("confirmSaveModal");
  if (!modal) {
    callback(false);
    return;
  }
  
  const saveBtn = document.getElementById("saveConfirm");
  const dontSaveBtn = document.getElementById("dontSaveConfirm");
  const closeBtn = document.getElementById("closeConfirmSaveModal");
  
  const cleanup = () => {
    saveBtn.removeEventListener('click', onSave);
    dontSaveBtn.removeEventListener('click', onDontSave);
    closeBtn.removeEventListener('click', onClose);
    modal.removeEventListener('click', onBackdropClick);
  };
  
  const onSave = () => {
    cleanup();
    modal.classList.remove("show");
    callback(true);
  };
  
  const onDontSave = () => {
    cleanup();
    modal.classList.remove("show");
    callback(false);
  };
  
  const onClose = () => {
    cleanup();
    modal.classList.remove("show");
    callback(null);
  };
  
  const onBackdropClick = (e) => {
    if (e.target === modal) {
      onClose();
    }
  };
  
  saveBtn.addEventListener('click', onSave);
  dontSaveBtn.addEventListener('click', onDontSave);
  closeBtn.addEventListener('click', onClose);
  modal.addEventListener('click', onBackdropClick);
  
  modal.classList.add("show");
}

export function closeSubsystemNameModal() {
  const modal = document.getElementById("subsystemNameModal");
  if (modal) modal.classList.remove("show");
}

function collectExternalPorts(blocks, type) {
  const externalPorts = [];
  blocks.forEach((block) => {
    if (block.type === type && block.params?.isExternalPort) {
      externalPorts.push({
        blockId: block.id,
        portIndex: 0,
        label: block.params?.label || block.id,
      });
    }
  });
  return externalPorts;
}
