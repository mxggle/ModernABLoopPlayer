import { useEffect } from 'react'
import { usePlayerStore } from '@/stores/playerStore'

export const useKeyboardShortcuts = () => {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    loopStart,
    loopEnd,
    isLooping,
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setLoopPoints,
    setIsLooping
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
          const end = loopEnd !== null ? loopEnd : duration
          if (currentTime < end) {
            setLoopPoints(currentTime, end)
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

        // Seek backward 5 seconds - Left arrow
        case 'ArrowLeft':
          e.preventDefault()
          if (e.shiftKey) {
            // Shift + Left = 1 second
            setCurrentTime(Math.max(0, currentTime - 1))
          } else {
            // Left = 5 seconds
            setCurrentTime(Math.max(0, currentTime - 5))
          }
          break

        // Seek forward 5 seconds - Right arrow
        case 'ArrowRight':
          e.preventDefault()
          if (e.shiftKey) {
            // Shift + Right = 1 second
            setCurrentTime(Math.min(duration, currentTime + 1))
          } else {
            // Right = 5 seconds
            setCurrentTime(Math.min(duration, currentTime + 5))
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
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setLoopPoints,
    setIsLooping
  ])
}
