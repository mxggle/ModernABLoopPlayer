import { useRef, useEffect } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { toast } from 'react-hot-toast'

export const MediaPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const {
    currentFile,
    isPlaying,
    volume,
    playbackRate,
    loopStart,
    loopEnd,
    isLooping,
    setCurrentTime,
    setDuration,
    setIsPlaying,
  } = usePlayerStore()

  // Handle play/pause
  useEffect(() => {
    const mediaElement = currentFile?.type.includes('video') ? videoRef.current : audioRef.current
    if (!mediaElement) return
    
    if (isPlaying) {
      mediaElement.play().catch(err => {
        console.error('Error playing media:', err)
        setIsPlaying(false)
      })
    } else {
      mediaElement.pause()
    }
  }, [isPlaying, currentFile, setIsPlaying])

  // Handle volume changes
  useEffect(() => {
    const mediaElement = currentFile?.type.includes('video') ? videoRef.current : audioRef.current
    if (!mediaElement) return
    
    mediaElement.volume = volume
  }, [volume, currentFile])

  // Handle playback rate changes
  useEffect(() => {
    const mediaElement = currentFile?.type.includes('video') ? videoRef.current : audioRef.current
    if (!mediaElement) return
    
    mediaElement.playbackRate = playbackRate
  }, [playbackRate, currentFile])

  // Handle A-B loop
  useEffect(() => {
    const mediaElement = currentFile?.type.includes('video') ? videoRef.current : audioRef.current
    if (!mediaElement) return
    
    const handleTimeUpdate = () => {
      const currentTimeValue = mediaElement.currentTime
      setCurrentTime(currentTimeValue)
      
      // Handle A-B looping
      if (isLooping && loopStart !== null && loopEnd !== null) {
        // Add a small buffer to prevent edge case issues
        const buffer = 0.1
        
        if (currentTimeValue >= loopEnd - buffer) {
          // When we reach the end point, jump back to start
          mediaElement.currentTime = loopStart
          console.log('Loop: Jumping back to start point', loopStart)
        } else if (currentTimeValue < loopStart - buffer && currentTimeValue > 0) {
          // If somehow we're before the start point (e.g., user dragged the slider)
          mediaElement.currentTime = loopStart
          console.log('Loop: Jumping to start point', loopStart)
        }
      }
    }
    
    // Use more frequent checking for more precise looping
    const checkInterval = setInterval(handleTimeUpdate, 50)
    
    // Also keep the timeupdate event for standard time tracking
    mediaElement.addEventListener('timeupdate', handleTimeUpdate)
    
    return () => {
      clearInterval(checkInterval)
      mediaElement.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [currentFile, isLooping, loopStart, loopEnd, setCurrentTime])
  
  // Add a listener for seeking to handle manual seeking
  useEffect(() => {
    const mediaElement = currentFile?.type.includes('video') ? videoRef.current : audioRef.current
    if (!mediaElement) return
    
    const handleSeeking = () => {
      // When user manually seeks, check if we need to enforce loop boundaries
      if (isLooping && loopStart !== null && loopEnd !== null) {
        const currentTimeValue = mediaElement.currentTime
        
        if (currentTimeValue < loopStart) {
          mediaElement.currentTime = loopStart
          toast('Staying within loop bounds', { duration: 1000, icon: 'ℹ️' })
        } else if (currentTimeValue > loopEnd) {
          mediaElement.currentTime = loopStart
          toast('Returning to loop start', { duration: 1000, icon: 'ℹ️' })
        }
      }
    }
    
    mediaElement.addEventListener('seeking', handleSeeking)
    
    return () => {
      mediaElement.removeEventListener('seeking', handleSeeking)
    }
  }, [currentFile, isLooping, loopStart, loopEnd])

  // Handle media metadata loaded
  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    setDuration(e.currentTarget.duration)
  }

  // Handle media ended
  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  if (!currentFile) return null

  return (
    <div className="relative">
      {currentFile.type.includes('video') ? (
        <video
          ref={videoRef}
          src={currentFile.url}
          className="w-full rounded-lg shadow-lg"
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      ) : (
        <>
          <audio
            ref={audioRef}
            src={currentFile.url}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
          />
          <div className="w-full h-48 bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <p className="text-xl font-medium">
              {currentFile.name}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
