/**
 * Format seconds into a time string (MM:SS or HH:MM:SS)
 */
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return '--:--'
  
  seconds = Math.floor(seconds)
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
