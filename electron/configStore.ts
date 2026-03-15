import ElectronStore from 'electron-store'

export interface PlayHistoryEntry {
  id: string
  type: 'file' | 'youtube'
  name: string
  accessedAt: number
  nativePath?: string
  youtubeId?: string
  youtubeTitle?: string
}

export interface LoopBookmark {
  id: string
  name: string
  start: number
  end: number
  createdAt: number
  mediaName?: string
  mediaType?: string
  youtubeId?: string
  playbackRate?: number
  annotation?: string
}

export interface AppConfig {
  playHistory: PlayHistoryEntry[]
  mediaBookmarks: Record<string, LoopBookmark[]>
  sourceFolders: string[]
  // Zustand-persist full state blob (used as the storage adapter target)
  zustandState?: string
}

const defaults: AppConfig = {
  playHistory: [],
  mediaBookmarks: {},
  sourceFolders: [],
  zustandState: undefined,
}

export const configStore = new ElectronStore<AppConfig>({
  name: 'app-config',
  defaults,
})
