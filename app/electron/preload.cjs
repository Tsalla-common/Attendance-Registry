// Exposes a minimal, explicit API to the renderer. contextIsolation keeps the
// renderer sandboxed from Node; only these named functions cross the bridge.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  pickExcelPath: () => ipcRenderer.invoke('pick-excel-path'),
});
