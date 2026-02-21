import { state, clearDirty, getCurrentFilePath, setCurrentFilePath } from './state.js';
import { toYAML, serializeDiagram, sanitizeFilename } from './file-operations.js';
import { showConfirmSaveModal, handleSaveAsSubsystem } from './modal-handlers.js';

let statusEl = null;
let currentFilePath = null;
let fileOpenInput = null;
let deleteSelectionBtn = null;
let homeBtn = null;
let zoomInBtn = null;
let zoomOutBtn = null;

export function setStatusEl(el) {
  statusEl = el;
}

export function setFileOpenInput(el) {
  fileOpenInput = el;
}

export function setDeleteSelectionBtn(el) {
  deleteSelectionBtn = el;
}

export function setHomeBtn(el) {
  homeBtn = el;
}

export function setZoomInBtn(el) {
  zoomInBtn = el;
}

export function setZoomOutBtn(el) {
  zoomOutBtn = el;
}

export function performOpen() {
  if (window.electron) {
    window.electron.openFile().then(result => {
      if (result.success === true) {
        try {
          const data = parseYAML(result.content);
          loadDiagram(data);
          setCurrentFilePath(result.fileName);
          clearDirty();
          if (statusEl) statusEl.textContent = `Loaded: ${result.fileName}`;
        } catch (error) {
          if (statusEl) statusEl.textContent = `Load error: ${error?.message || error}`;
        }
      }
    }).catch(error => {
      if (statusEl) statusEl.textContent = `Open error: ${error?.message || error}`;
    });
  } else {
    fileOpenInput.click();
  }
}

export function newDiagram() {
  state.simSession = null;
  state.pauseRequested = false;
  state.routeEpoch = (Number(state.routeEpoch) || 0) + 1;
  state.diagramName = "vibesim";
  if (diagramNameInput) diagramNameInput.value = state.diagramName;
  if (runtimeInput) runtimeInput.value = "10";
  if (simDt) {
    simDt.value = "0.01";
    state.sampleTime = 0.01;
  }
  state.autoRoute = true;
  if (autoRouteInput) autoRouteInput.checked = state.autoRoute;
  state.variablesText = "";
  const variablesInput = document.getElementById("variablesInput");
  const variablesPreview = document.getElementById("variablesPreview");
  if (variablesInput) variablesInput.value = state.variablesText;
  state.variables = {};
  state.variablesDisplay = [];
  if (variablesPreview) {
    variablesPreview.textContent = "No variables defined.";
  }
  state.subsystemStack = [];
  updateSubsystemNavUi();
  renderer.clearWorkspace();
  state.spawnIndex = 0;
  state.loadingDiagram = false;
  state.routingDirty = false;
  state.dirtyBlocks.clear();
  state.dirtyConnections.clear();
  state.selectedId = null;
  state.selectedConnection = null;
  state.selectedIds.clear();
  state.selectedConnections.clear();
  setCurrentFilePath(null);
  if (statusEl) statusEl.textContent = "New diagram created";
}

export function handleMenuAction(action) {
  switch (action) {
    case 'new':
      if (state.dirty) {
        showConfirmSaveModal((shouldSave) => {
          if (shouldSave === true) {
            const yaml = toYAML(serializeDiagram(state));
            if (window.electron) {
              const path = getCurrentFilePath();
              if (path) {
                window.electron.saveFile(yaml, path).then(result => {
                  if (result.success) {
                    clearDirty();
                    newDiagram();
                  }
                });
              } else {
                window.electron.saveFileAs(yaml, `${sanitizeFilename(state.diagramName)}.yaml`).then(result => {
                  if (result.success && !result.canceled) {
                    clearDirty();
                    newDiagram();
                  } else if (!result.canceled) {
                    newDiagram();
                  }
                });
              }
            } else {
              const blob = new Blob([yaml], { type: "text/yaml" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = getCurrentFilePath() || `${sanitizeFilename(state.diagramName)}.yaml`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              clearDirty();
              newDiagram();
            }
          } else if (shouldSave === false) {
            newDiagram();
          }
        });
      } else {
        newDiagram();
      }
      break;
    case 'open':
      if (state.dirty) {
        showConfirmSaveModal((shouldSave) => {
          if (shouldSave === true) {
            const yaml = toYAML(serializeDiagram(state));
            if (window.electron) {
              const path = getCurrentFilePath();
              if (path) {
                window.electron.saveFile(yaml, path).then(result => {
                  if (result.success) {
                    clearDirty();
                    performOpen();
                  }
                });
              } else {
                window.electron.saveFileAs(yaml, `${sanitizeFilename(state.diagramName)}.yaml`).then(result => {
                  if (result.success && !result.canceled) {
                    clearDirty();
                    performOpen();
                  } else if (!result.canceled) {
                    performOpen();
                  }
                });
              }
            } else {
              const blob = new Blob([yaml], { type: "text/yaml" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = getCurrentFilePath() || `${sanitizeFilename(state.diagramName)}.yaml`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              clearDirty();
              performOpen();
            }
          } else if (shouldSave === false) {
            performOpen();
          }
        });
      } else {
        performOpen();
      }
      break;
    case 'save':
      const yaml = toYAML(serializeDiagram(state));
      if (window.electron) {
        const path = getCurrentFilePath();
        if (path) {
          window.electron.saveFile(yaml, path).then(result => {
            if (result.success) {
              clearDirty();
              if (statusEl) statusEl.textContent = `Saved: ${path}`;
            } else {
              if (statusEl) statusEl.textContent = `Save error: ${result.error}`;
            }
          });
        } else {
          window.electron.saveFileAs(yaml, `${sanitizeFilename(state.diagramName)}.yaml`).then(result => {
            if (result.success && !result.canceled) {
              clearDirty();
              if (statusEl) statusEl.textContent = `Saved: ${result.filePath}`;
            }
          });
        }
      } else {
        const blob = new Blob([yaml], { type: "text/yaml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = getCurrentFilePath() || `${sanitizeFilename(state.diagramName)}.yaml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        clearDirty();
      }
      break;
    case 'saveAs':
      if (window.electron) {
        const yaml = toYAML(serializeDiagram(state));
        window.electron.saveFileAs(yaml, `${sanitizeFilename(state.diagramName)}.yaml`).then(result => {
          if (result.success && !result.canceled) {
            clearDirty();
          }
        });
      } else {
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
        clearDirty();
      }
      break;
    case 'saveAsSubsystem':
      handleSaveAsSubsystem();
      break;
    case 'exit':
      if (window.electron) {
        if (state.dirty) {
          showConfirmSaveModal((shouldSave) => {
            if (shouldSave === true) {
              const yaml = toYAML(serializeDiagram(state));
              const path = getCurrentFilePath();
              if (path) {
                window.electron.saveFile(yaml, path).then(result => {
                  if (result.success) {
                    clearDirty();
                    window.electron.closeWindow();
                  }
                });
              } else {
                window.electron.saveFileAs(yaml, `${sanitizeFilename(state.diagramName)}.yaml`).then(result => {
                  if (result.success && !result.canceled) {
                    clearDirty();
                    window.electron.closeWindow();
                  } else if (!result.canceled) {
                    window.electron.closeWindow();
                  }
                });
              }
            } else if (shouldSave === false) {
              window.electron.closeWindow();
            }
          });
        } else {
          window.electron.closeWindow();
        }
      }
      break;
    case 'undo':
      if (deleteSelectionBtn) {
        break;
      }
      break;
    case 'redo':
      break;
    case 'delete':
      if (deleteSelectionBtn) deleteSelectionBtn.click();
      break;
    case 'resetView':
      if (homeBtn) homeBtn.click();
      break;
    case 'zoomIn':
      if (zoomInBtn) zoomInBtn.click();
      break;
    case 'zoomOut':
      if (zoomOutBtn) zoomOutBtn.click();
      break;
    case 'theme-dark':
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      break;
    case 'theme-light':
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      break;
    case 'theme-monokai':
      document.documentElement.setAttribute('data-theme', 'monokai');
      localStorage.setItem('theme', 'monokai');
      break;
    case 'theme-dracula':
      document.documentElement.setAttribute('data-theme', 'dracula');
      localStorage.setItem('theme', 'dracula');
      break;
    case 'about':
      const aboutModal = document.getElementById('aboutModal');
      if (aboutModal) {
        aboutModal.classList.add('show');
      }
      break;
  }
}
