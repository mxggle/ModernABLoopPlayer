import { useRef, useEffect } from 'react'
import { usePlayerStore } from '@/stores/playerStore'

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
      setCurrentTime(mediaElement.currentTime)
      
      // Handle A-B looping
      if (isLooping && loopStart !== null && loopEnd !== null) {
        if (mediaElement.currentTime >= loopEnd) {
          mediaElement.currentTime = loopStart
        } else if (mediaElement.currentTime < loopStart) {
          mediaElement.currentTime = loopStart
        }
      }
    }
    
    mediaElement.addEventListener('timeupdate', handleTimeUpdate)
    
    return () => {
      mediaElement.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [currentFile, isLooping, loopStart, loopEnd, setCurrentTime])

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
