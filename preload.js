// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    // Window controls
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),
    
    // File operations
    openFile: () => ipcRenderer.invoke('open-file'),
    saveFile: (content, filePath) => ipcRenderer.invoke('save-file', { content, filePath }),
    saveFileAs: (content, defaultName) => ipcRenderer.invoke('save-file-as', { content, defaultName }),
    
    // Event listeners
    onFileOpened: (callback) => ipcRenderer.on('file-opened', (event, data) => callback(data)),
    onFileSaveRequest: (callback) => ipcRenderer.on('file-save-request', (event, data) => callback(data)),
    onFileSaveAsRequest: (callback) => ipcRenderer.on('file-save-as-request', (event) => callback()),
    
    // Remove event listeners
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('file-opened');
      ipcRenderer.removeAllListeners('file-save-request');
      ipcRenderer.removeAllListeners('file-save-as-request');
    }
  }
);
