import { app, BrowserWindow, shell, ipcMain, dialog, protocol } from 'electron'
import { join, extname, sep, normalize } from 'path'
import { Readable } from 'stream'
import fs from 'fs'
import { configStore } from './configStore'

const isDev = process.env.NODE_ENV === 'development'
const transientApprovedFiles = new Set<string>()
const transientApprovedFolders = new Set<string>()

// Register custom protocol for serving local media files.
// Must be called before app.whenReady() so the scheme is available.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
])

const MEDIA_EXTENSIONS = new Set([
  '.mp3', '.mp4', '.wav', '.flac', '.ogg', '.m4a', '.aac',
  '.webm', '.mkv', '.avi', '.mov', '.m4v', '.opus', '.wma',
])

const MIME_TYPES: Record<string, string> = {
  '.aac': 'audio/aac',
  '.avi': 'video/x-msvideo',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.m4v': 'video/x-m4v',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/opus',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.wma': 'audio/x-ms-wma',
}

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
  if (canceled || filePaths.length === 0) return null

  const approvedPath = normalize(filePaths[0])
  transientApprovedFiles.add(approvedPath)
  transientApprovedFolders.add(normalize(join(approvedPath, '..')))
  return filePaths[0]
})

// IPC: open a folder via native OS dialog
ipcMain.handle('dialog:openFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })
  if (canceled || filePaths.length === 0) return null

  transientApprovedFolders.add(normalize(filePaths[0]))
  return filePaths[0]
})

ipcMain.handle('shell:showInFileManager', async (_event, targetPath: string) => {
  try {
    const normalizedPath = normalize(targetPath)
    const stats = await fs.promises.stat(normalizedPath)

    if (stats.isDirectory()) {
      const result = await shell.openPath(normalizedPath)
      return result === ''
    }

    shell.showItemInFolder(normalizedPath)
    return true
  } catch (error) {
    console.error('Failed to show path in file manager:', targetPath, error)
    return false
  }
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

function getHistoryNativePaths(): string[] {
  const raw = configStore.get('abloop-player-storage')
  if (typeof raw !== 'string') {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    const history = parsed?.state?.mediaHistory
    if (!Array.isArray(history)) {
      return []
    }

    return history
      .map((item) => (typeof item?.nativePath === 'string' ? item.nativePath : null))
      .filter((path): path is string => !!path)
  } catch {
    return []
  }
}

function isPathWithin(basePath: string, targetPath: string): boolean {
  const base = normalize(basePath).toLowerCase()
  const target = normalize(targetPath).toLowerCase()
  return target === base || target.startsWith(base + sep.toLowerCase())
}

async function tryRealpath(targetPath: string): Promise<string | null> {
  try {
    return normalize(await fs.promises.realpath(targetPath))
  } catch {
    return null
  }
}

async function isPathWithinApprovedFolder(
  folderPath: string,
  normalizedTargetPath: string,
  resolvedTargetPath: string | null,
): Promise<boolean> {
  const normalizedFolderPath = normalize(folderPath)
  if (!isPathWithin(normalizedFolderPath, normalizedTargetPath)) {
    return false
  }

  const resolvedFolderPath = await tryRealpath(folderPath)
  if (!resolvedFolderPath || !resolvedTargetPath) {
    return true
  }

  return isPathWithin(resolvedFolderPath, resolvedTargetPath)
}

function decodeRequestPath(pathname: string): string {
  const decodedPath = decodeURIComponent(pathname)

  if (process.platform === 'win32') {
    if (/^\/[A-Za-z]:\//.test(decodedPath)) {
      return decodedPath.slice(1)
    }
    if (decodedPath.startsWith('//')) {
      return decodedPath
    }
  }

  return decodedPath
}

function getMediaMimeType(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

function parseRangeHeader(
  rangeHeader: string,
  fileSize: number,
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim())
  if (!match) {
    return null
  }

  const [, startRaw, endRaw] = match

  if (!startRaw && !endRaw) {
    return null
  }

  if (!startRaw) {
    const suffixLength = Number(endRaw)
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null
    }
    const start = Math.max(0, fileSize - suffixLength)
    return { start, end: fileSize - 1 }
  }

  const start = Number(startRaw)
  const end = endRaw ? Number(endRaw) : fileSize - 1

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    start >= fileSize
  ) {
    return null
  }

  return {
    start,
    end: Math.min(end, fileSize - 1),
  }
}

/**
 * Verify that targetPath is within one of the user-approved source folders.
 * Uses normalized path checks first, then realpath-based checks when both sides
 * resolve successfully so symlink/junction escapes are still blocked. Falls
 * back to normalized comparisons when realpath is unavailable on network
 * volumes (e.g. SMB mounts).
 * Path comparison is case-insensitive to support Windows (NTFS).
 */
async function assertPathInSourceFolders(targetPath: string): Promise<void> {
  const sourceFolders = getSourceFolders()
  const historyNativePaths = getHistoryNativePaths()
  const normalizedTarget = normalize(targetPath)
  const resolvedTarget = await tryRealpath(targetPath)
  const hasConfiguredFolderAccess = (
    await Promise.all(
      sourceFolders.map((folder) =>
        isPathWithinApprovedFolder(folder, normalizedTarget, resolvedTarget),
      ),
    )
  ).some(Boolean)
  const resolvedHistoryPaths = await Promise.all(
    historyNativePaths.map((path) => tryRealpath(path)),
  )
  const hasHistoryAccess = historyNativePaths.some((path, index) => {
    const normalizedHistoryPath = normalize(path)
    if (normalizedTarget === normalizedHistoryPath) {
      return true
    }

    if (!resolvedTarget) {
      return false
    }

    const resolvedHistoryPath = resolvedHistoryPaths[index]
    if (!resolvedHistoryPath) {
      return false
    }

    return resolvedTarget === resolvedHistoryPath
  })
  const hasTransientFolderAccess = (
    await Promise.all(
      Array.from(transientApprovedFolders).map((folder) =>
        isPathWithinApprovedFolder(folder, normalizedTarget, resolvedTarget),
      ),
    )
  ).some(Boolean)
  const hasTransientAccess =
    transientApprovedFiles.has(normalizedTarget) || hasTransientFolderAccess
  const hasConfiguredAccess = hasConfiguredFolderAccess || hasHistoryAccess
  const isApproved = hasConfiguredAccess || hasTransientAccess
  if (!isApproved) {
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
  // Resolve symlinks for cycle detection; fall back to normalized path on failure
  // (realpath can fail on network volumes due to Electron's asar fs patches)
  let realPath: string
  try {
    realPath = await fs.promises.realpath(dirPath)
  } catch {
    realPath = normalize(dirPath)
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
  // Serve local media files through the local-media:// protocol.
  // URL format: local-media://media/ENCODED_PATH
  protocol.handle('local-media', async (request) => {
    const url = new URL(request.url)
    const filePath = decodeRequestPath(url.pathname)
    // Security: only serve files within approved source folders
    await assertPathInSourceFolders(filePath)

    const stats = await fs.promises.stat(filePath)
    if (!stats.isFile()) {
      return new Response('Not found', { status: 404 })
    }

    const headers = new Headers({
      'Accept-Ranges': 'bytes',
      'Content-Type': getMediaMimeType(filePath),
      'Cache-Control': 'no-store',
    })

    if (request.method === 'HEAD') {
      headers.set('Content-Length', String(stats.size))
      return new Response(null, { status: 200, headers })
    }

    const rangeHeader = request.headers.get('range')
    if (rangeHeader) {
      const range = parseRangeHeader(rangeHeader, stats.size)
      if (!range) {
        headers.set('Content-Range', `bytes */${stats.size}`)
        return new Response(null, { status: 416, headers })
      }

      const { start, end } = range
      headers.set('Content-Length', String(end - start + 1))
      headers.set('Content-Range', `bytes ${start}-${end}/${stats.size}`)

      const stream = fs.createReadStream(filePath, { start, end })
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers,
      })
    }

    headers.set('Content-Length', String(stats.size))
    const stream = fs.createReadStream(filePath)
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers,
    })
  })

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
