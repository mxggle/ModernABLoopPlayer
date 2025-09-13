import { useEffect } from 'react'
import { usePlayerStore } from '@/stores/playerStore'
import { toast } from 'react-hot-toast'

export const useKeyboardShortcuts = () => {
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
    getCurrentMediaBookmarks,
    seekStepSeconds,
    seekSmallStepSeconds,
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
          setIsLooping(!isLooping)
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

        // Quick add bookmark - M key
        case 'm':
        case 'M': {
          e.preventDefault()
          if (duration === 0) return

          const start = loopStart !== null ? loopStart : Math.max(0, currentTime - 2)
          const end = loopEnd !== null ? loopEnd : Math.min(duration, currentTime + 2)
          if (end <= start) return

          const count = getCurrentMediaBookmarks().length + 1
          const name = `Clip ${count}`

          const added = storeAddBookmark({
            name,
            start,
            end,
            playbackRate,
            mediaName: currentFile?.name,
            mediaType: currentFile?.type,
            youtubeId: currentYouTube?.id,
            annotation: ''
          })
          if (added) {
            toast.success('Bookmark added')
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
