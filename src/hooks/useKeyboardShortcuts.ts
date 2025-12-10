import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayerStore } from '@/stores/playerStore'
import { toast } from 'react-hot-toast'

export const useKeyboardShortcuts = () => {
  const { t } = useTranslation()
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    loopStart,
    loopEnd,
    isLooping,
    playbackRate,
    currentFile,
    currentYouTube,
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setLoopPoints,
    setIsLooping,
    addBookmark: storeAddBookmark,
    deleteBookmark,
    getCurrentMediaBookmarks,
    seekStepSeconds,
    seekSmallStepSeconds,
    toggleLooping,
  } = usePlayerStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      switch (e.key) {
        // Play/Pause - Spacebar
        case ' ':
          e.preventDefault()
          setIsPlaying(!isPlaying)
          break

        // Set A point - A key
        case 'a':
        case 'A': {
          e.preventDefault()
          if (duration === 0) break
          if (loopEnd !== null && currentTime >= loopEnd) {
            // After B: start a new loop by setting A and clearing B
            setLoopPoints(currentTime, null)
            setIsLooping(false)
          } else {
            // Before B (or B not set): move A only, keep B
            setLoopPoints(currentTime, loopEnd)
            if (loopEnd !== null && !isLooping) setIsLooping(true)
          }
          break
        }

        // Set B point - B key
        case 'b':
        case 'B': {
          e.preventDefault()
          const start = loopStart !== null ? loopStart : 0
          if (currentTime > start) {
            setLoopPoints(start, currentTime)
          }
          break
        }

        // Toggle loop - L key
        case 'l':
        case 'L':
          e.preventDefault()
          e.preventDefault()
          toggleLooping()
          break

        // Clear loop points - C key
        case 'c':
        case 'C':
          e.preventDefault()
          setLoopPoints(null, null)
          setIsLooping(false)
          break

        // Seek backward - Left arrow
        case 'ArrowLeft':
          e.preventDefault()
          if (e.shiftKey) {
            // Shift + Left = small step
            setCurrentTime(Math.max(0, currentTime - seekSmallStepSeconds))
          } else {
            // Left = configured step
            setCurrentTime(Math.max(0, currentTime - seekStepSeconds))
          }
          break

        // Seek forward - Right arrow
        case 'ArrowRight':
          e.preventDefault()
          if (e.shiftKey) {
            // Shift + Right = small step
            setCurrentTime(Math.min(duration, currentTime + seekSmallStepSeconds))
          } else {
            // Right = configured step
            setCurrentTime(Math.min(duration, currentTime + seekStepSeconds))
          }
          break

        // Volume up - Up arrow
        case 'ArrowUp':
          e.preventDefault()
          setVolume(Math.min(1, volume + 0.05))
          break

        // Volume down - Down arrow
        case 'ArrowDown':
          e.preventDefault()
          setVolume(Math.max(0, volume - 0.05))
          break

        // Jump to percentage of track - 0-9 keys
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9': {
          e.preventDefault()
          const percent = parseInt(e.key) * 10
          setCurrentTime((percent / 100) * duration)
          break
        }

        // Quick add/remove bookmark - M key
        case 'm':
        case 'M': {
          e.preventDefault()
          if (duration === 0) {
            toast.error(t('bookmarks.loadMediaFirst'))
            return
          }

          // Require explicit loop points
          if (loopStart === null || loopEnd === null) {
            toast.error(t('bookmarks.setValidRange'))
            return
          }

          if (loopEnd <= loopStart) {
            toast.error(t('bookmarks.setValidRange'))
            return
          }

          // Check for existing bookmark to toggle (remove)
          const bookmarks = getCurrentMediaBookmarks()
          const TOL = 0.05
          const existingBookmark = bookmarks.find(
            (b) => Math.abs(b.start - loopStart) < TOL && Math.abs(b.end - loopEnd) < TOL
          )

          if (existingBookmark) {
            deleteBookmark(existingBookmark.id)
            toast.success(t('bookmarks.bookmarkRemoved'))
          } else {
            const count = bookmarks.length + 1
            const name = t('bookmarks.defaultClipName', { count })

            const added = storeAddBookmark({
              name,
              start: loopStart,
              end: loopEnd,
              playbackRate,
              mediaName: currentFile?.name,
              mediaType: currentFile?.type,
              youtubeId: currentYouTube?.id,
              annotation: ''
            })
            if (added) {
              toast.success(t('bookmarks.bookmarkAdded'))
            }
          }
          break
        }

        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    isPlaying,
    currentTime,
    duration,
    volume,
    loopStart,
    loopEnd,
    isLooping,
    playbackRate,
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setLoopPoints,
    setIsLooping,
    currentFile,
    currentYouTube,
    storeAddBookmark,
    getCurrentMediaBookmarks
  ])
}
