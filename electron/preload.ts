import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  showInFileManager: (targetPath: string) =>
    ipcRenderer.invoke('shell:showInFileManager', targetPath),
  listMediaFiles: (folderPath: string) =>
    ipcRenderer.invoke('fs:listMediaFiles', folderPath),
  listMediaTree: (folderPath: string) =>
    ipcRenderer.invoke('fs:listMediaTree', folderPath),
  configGet: (key: string) => ipcRenderer.invoke('config:get', key),
  configSet: (key: string, value: unknown) =>
    ipcRenderer.invoke('config:set', key, value),
  configGetAll: () => ipcRenderer.invoke('config:getAll'),
})
