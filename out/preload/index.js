"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
  openFile: () => electron.ipcRenderer.invoke("dialog:openFile"),
  openFolder: () => electron.ipcRenderer.invoke("dialog:openFolder"),
  listMediaFiles: (folderPath) => electron.ipcRenderer.invoke("fs:listMediaFiles", folderPath),
  listMediaTree: (folderPath) => electron.ipcRenderer.invoke("fs:listMediaTree", folderPath),
  configGet: (key) => electron.ipcRenderer.invoke("config:get", key),
  configSet: (key, value) => electron.ipcRenderer.invoke("config:set", key, value),
  configGetAll: () => electron.ipcRenderer.invoke("config:getAll")
});
