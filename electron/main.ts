import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { join, extname, sep } from 'path'
import fs from 'fs'
import { configStore } from './configStore'

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
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
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

/**
 * Read source folders from the Zustand persisted state blob.
 * Falls back to the legacy top-level configStore key for older installs.
 */
function getSourceFolders(): string[] {
  const raw = configStore.get('abloop-player-storage')
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      const folders = parsed?.state?.sourceFolders
      if (Array.isArray(folders)) return folders as string[]
    } catch {
      // fall through to legacy key
    }
  }
  return configStore.get('sourceFolders')
}

/**
 * Verify that targetPath is within one of the user-approved source folders.
 * Throws if not approved. Uses realpath to resolve symlinks before comparing.
 * Path comparison is case-insensitive to support Windows (NTFS).
 */
async function assertPathInSourceFolders(targetPath: string): Promise<void> {
  const sourceFolders = getSourceFolders()
  if (sourceFolders.length === 0) {
    throw new Error('No source folders configured')
  }
  let realTarget: string
  try {
    realTarget = await fs.promises.realpath(targetPath)
  } catch {
    throw new Error(`Cannot resolve path: ${targetPath}`)
  }
  const isApproved = await Promise.all(
    sourceFolders.map(async (folder) => {
      try {
        const realFolder = await fs.promises.realpath(folder)
        const t = realTarget.toLowerCase()
        const f = realFolder.toLowerCase()
        return t === f || t.startsWith(f + sep.toLowerCase())
      } catch {
        return false
      }
    }),
  )
  if (!isApproved.some(Boolean)) {
    throw new Error('Path is outside approved source folders')
  }
}

// IPC: list media files in a folder (non-recursive)
ipcMain.handle('fs:listMediaFiles', async (_event, folderPath: string) => {
  await assertPathInSourceFolders(folderPath)
  const entries = await fs.promises.readdir(folderPath, { withFileTypes: true })
  return entries
    .filter(
      (e) => e.isFile() && MEDIA_EXTENSIONS.has(extname(e.name).toLowerCase()),
    )
    .map((e) => ({ name: e.name, path: join(folderPath, e.name) }))
})

export interface FolderTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FolderTreeNode[]
}

async function buildMediaTree(
  dirPath: string,
  depth: number,
  visited: Set<string>,
): Promise<FolderTreeNode[]> {
  if (depth <= 0) return []
  let realPath: string
  try {
    realPath = await fs.promises.realpath(dirPath)
  } catch {
    return []
  }
  if (visited.has(realPath)) return []
  visited.add(realPath)

  let entries: fs.Dirent[]
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
  } catch {
    return []
  }

  const nodes: FolderTreeNode[] = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      const children = await buildMediaTree(fullPath, depth - 1, visited)
      // Only include directories that contain media (directly or transitively)
      if (children.length > 0) {
        nodes.push({ name: entry.name, path: fullPath, type: 'directory', children })
      }
    } else if (
      entry.isFile() &&
      MEDIA_EXTENSIONS.has(extname(entry.name).toLowerCase())
    ) {
      nodes.push({ name: entry.name, path: fullPath, type: 'file' })
    }
  }
  return nodes
}

// IPC: list media files as a recursive tree
ipcMain.handle('fs:listMediaTree', async (_event, folderPath: string) => {
  await assertPathInSourceFolders(folderPath)
  return buildMediaTree(folderPath, 10, new Set())
})

// IPC: config store
ipcMain.handle('config:get', (_event, key: string) => {
  return configStore.get(key as any)
})

ipcMain.handle('config:set', (_event, key: string, value: unknown) => {
  configStore.set(key as any, value as any)
})

ipcMain.handle('config:getAll', () => {
  return configStore.store
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
