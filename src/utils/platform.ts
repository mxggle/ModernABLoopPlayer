export const isElectron = (): boolean =>
  typeof window !== 'undefined' && !!window.electronAPI?.isElectron

export const getPlatform = (): string =>
  window.electronAPI?.platform ?? 'web'

const ensureLeadingSlash = (path: string): string =>
  path.startsWith('/') ? path : `/${path}`

const encodePathForUrl = (path: string): string =>
  ensureLeadingSlash(path)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

/**
 * Convert a native filesystem path to a URL suitable for <audio>/<video>.
 * In Electron, uses the custom local-media:// protocol which bypasses
 * cross-origin restrictions that block file:// URLs in dev mode.
 * In the browser, falls back to file:// URLs.
 */
export const nativePathToUrl = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, '/')
  const encodedPath = encodePathForUrl(normalized)
  if (isElectron()) {
    return `local-media://media${encodedPath}`
  }
  return `file://${encodedPath}`
}
