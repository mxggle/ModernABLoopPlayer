interface ElectronMediaFile {
  name: string
  path: string
}

interface ElectronAPI {
  isElectron: boolean
  platform: string
  openFile: () => Promise<string | null>
  openFolder: () => Promise<string | null>
  listMediaFiles: (folderPath: string) => Promise<ElectronMediaFile[]>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
