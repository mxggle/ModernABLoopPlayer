export const isElectron = (): boolean =>
  typeof window !== 'undefined' && !!window.electronAPI?.isElectron

export const getPlatform = (): string =>
  window.electronAPI?.platform ?? 'web'

/**
 * Convert a native filesystem path to a file:// URL suitable for <audio>/<video>.
 * Handles both Unix (/path/to/file) and Windows (C:\path\to\file) paths.
 */
export const nativePathToUrl = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`
}
