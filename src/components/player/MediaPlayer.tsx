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
    
    // Create a variable to track the last time we showed a toast
    let lastToastTime = 0
    const toastCooldown = 2000 // 2 seconds cooldown between toasts
    
    const handleSeeking = () => {
      // When user manually seeks, check if we need to enforce loop boundaries
      if (isLooping && loopStart !== null && loopEnd !== null) {
        const currentTimeValue = mediaElement.currentTime
        const now = Date.now()
        
        if (currentTimeValue < loopStart) {
          mediaElement.currentTime = loopStart
          
          // Only show toast if enough time has passed since the last one
          if (now - lastToastTime > toastCooldown) {
            toast('Staying within loop bounds', { duration: 1000, icon: 'ℹ️', id: 'loop-bounds-toast' })
            lastToastTime = now
          }
        } else if (currentTimeValue > loopEnd) {
          mediaElement.currentTime = loopStart
          
          // Only show toast if enough time has passed since the last one
          if (now - lastToastTime > toastCooldown) {
            toast('Returning to loop start', { duration: 1000, icon: 'ℹ️', id: 'loop-start-toast' })
            lastToastTime = now
          }
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
          <div 
            className="w-full rounded-lg flex items-center justify-center overflow-hidden relative"
            style={{ height: 'calc(100vh - 280px)', maxHeight: '600px' }}
          >
            {/* Background image with gradient overlay */}
            <div 
              className="absolute inset-0 bg-cover bg-center z-0" 
              style={{ 
                backgroundImage: 'url("/audio-background.svg")', 
                backgroundSize: 'cover'
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/30 to-gray-900/70 z-10"></div>
            
            {/* Audio file info */}
            <div className="z-20 text-center p-6 bg-white/10 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-purple-600 flex items-center justify-center shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <p className="text-xl font-medium text-white mb-2">
                {currentFile.name}
              </p>
              <p className="text-sm text-white/80">
                Audio File
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
