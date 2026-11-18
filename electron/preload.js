const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script exposing secure desktop bridge to the renderer.
 * Provides V8 engine info, native printing, dialogs, and platform metrics.
 */
contextBridge.exposeInMainWorld('jinnworxDesktop', {
  isDesktop: true,
  platform: process.platform,
  v8Version: process.versions.v8,
  nodeVersion: process.versions.node,
  electronVersion: process.versions.electron,
  chromeVersion: process.versions.chrome,
  
  // V8 Heap & Engine Metrics
  getV8Metrics: () => ipcRenderer.invoke('get-v8-info'),

  // Cache & Session Management
  clearCache: () => ipcRenderer.invoke('clear-cache'),

  // Native Desktop Printing
  printToPDF: (options) => ipcRenderer.invoke('print-to-pdf', options),
  printSilent: () => ipcRenderer.invoke('print-silent'),

  // Desktop Dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),

  // External Links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Desktop Notifications
  notify: (title, body) => ipcRenderer.invoke('show-notification', { title, body })
});
