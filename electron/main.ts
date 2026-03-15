import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { join, extname } from 'path'
import fs from 'fs'

const isDev = process.env.NODE_ENV === 'development'

const MEDIA_EXTENSIONS = new Set([
  '.mp3', '.mp4', '.wav', '.flac', '.ogg', '.m4a', '.aac',
  '.webm', '.mkv', '.avi', '.mov', '.m4v', '.opus', '.wma',
])

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev,
    },
  })

  // Open external links in the default browser, not in Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC: open a single audio/video file via native OS dialog
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      {
        name: 'Audio / Video',
        extensions: Array.from(MEDIA_EXTENSIONS).map((e) => e.slice(1)),
      },
    ],
  })
  return canceled ? null : filePaths[0]
})

// IPC: open a folder via native OS dialog
ipcMain.handle('dialog:openFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })
  return canceled ? null : filePaths[0]
})

// IPC: list media files in a folder (non-recursive)
ipcMain.handle('fs:listMediaFiles', async (_event, folderPath: string) => {
  const entries = await fs.promises.readdir(folderPath, { withFileTypes: true })
  return entries
    .filter(
      (e) => e.isFile() && MEDIA_EXTENSIONS.has(extname(e.name).toLowerCase()),
    )
    .map((e) => ({ name: e.name, path: join(folderPath, e.name) }))
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
