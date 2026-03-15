import type { StateStorage } from 'zustand/middleware'

/**
 * Custom Zustand StateStorage that delegates to Electron's config IPC.
 * Falls back to localStorage when not running in Electron.
 */
export const electronStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const value = await window.electronAPI.configGet(name)
      return typeof value === 'string' ? value : null
    }
    return localStorage.getItem(name)
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.configSet(name, value)
      return
    }
    localStorage.setItem(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.configSet(name, null)
      return
    }
    localStorage.removeItem(name)
  },
}
