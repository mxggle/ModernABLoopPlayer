import { ipcMain, dialog, app, BrowserWindow, shell } from "electron";
import { extname, join } from "path";
import fs from "fs";
import ElectronStore from "electron-store";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const defaults = {
  playHistory: [],
  mediaBookmarks: {},
  sourceFolders: [],
  zustandState: void 0
};
const configStore = new ElectronStore({
  name: "app-config",
  defaults
});
const isDev = process.env.NODE_ENV === "development";
const MEDIA_EXTENSIONS = /* @__PURE__ */ new Set([
  ".mp3",
  ".mp4",
  ".wav",
  ".flac",
  ".ogg",
  ".m4a",
  ".aac",
  ".webm",
  ".mkv",
  ".avi",
  ".mov",
  ".m4v",
  ".opus",
  ".wma"
]);
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}
ipcMain.handle("dialog:openFile", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      {
        name: "Audio / Video",
        extensions: Array.from(MEDIA_EXTENSIONS).map((e) => e.slice(1))
      }
    ]
  });
  return canceled ? null : filePaths[0];
});
ipcMain.handle("dialog:openFolder", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  });
  return canceled ? null : filePaths[0];
});
ipcMain.handle("fs:listMediaFiles", async (_event, folderPath) => {
  const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
  return entries.filter(
    (e) => e.isFile() && MEDIA_EXTENSIONS.has(extname(e.name).toLowerCase())
  ).map((e) => ({ name: e.name, path: join(folderPath, e.name) }));
});
async function buildMediaTree(dirPath, depth, visited) {
  if (depth <= 0) return [];
  let realPath;
  try {
    realPath = await fs.promises.realpath(dirPath);
  } catch {
    return [];
  }
  if (visited.has(realPath)) return [];
  visited.add(realPath);
  let entries;
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
  const nodes = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const children = await buildMediaTree(fullPath, depth - 1, visited);
      if (children.length > 0) {
        nodes.push({ name: entry.name, path: fullPath, type: "directory", children });
      }
    } else if (entry.isFile() && MEDIA_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      nodes.push({ name: entry.name, path: fullPath, type: "file" });
    }
  }
  return nodes;
}
ipcMain.handle("fs:listMediaTree", async (_event, folderPath) => {
  return buildMediaTree(folderPath, 10, /* @__PURE__ */ new Set());
});
ipcMain.handle("config:get", (_event, key) => {
  return configStore.get(key);
});
ipcMain.handle("config:set", (_event, key, value) => {
  configStore.set(key, value);
});
ipcMain.handle("config:getAll", () => {
  return configStore.store;
});
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
