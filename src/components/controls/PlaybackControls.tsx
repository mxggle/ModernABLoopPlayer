import { usePlayerStore } from '../../stores/playerStore'
import { formatTime } from '../../utils/formatTime'
import { Slider } from '@radix-ui/react-slider'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Rewind,
  FastForward
} from 'lucide-react'

export const PlaybackControls = () => {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setPlaybackRate
  } = usePlayerStore()

  // Toggle play/pause
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  // Handle timeline slider change
  const handleTimelineChange = (values: number[]) => {
    setCurrentTime(values[0])
  }

  // Handle volume slider change
  const handleVolumeChange = (values: number[]) => {
    setVolume(values[0])
  }

  // Seek backward 5 seconds
  const seekBackward = () => {
    const newTime = Math.max(0, currentTime - 5)
    setCurrentTime(newTime)
  }

  // Seek forward 5 seconds
  const seekForward = () => {
    const newTime = Math.min(duration, currentTime + 5)
    setCurrentTime(newTime)
  }

  // Toggle mute
  const toggleMute = () => {
    setVolume(volume > 0 ? 0 : 1)
  }

  // Decrease playback rate
  const decreasePlaybackRate = () => {
    const newRate = Math.max(0.25, playbackRate - 0.25)
    setPlaybackRate(newRate)
  }

  // Increase playback rate
  const increasePlaybackRate = () => {
    const newRate = Math.min(2, playbackRate + 0.25)
    setPlaybackRate(newRate)
  }

  return (
    <div className="space-y-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {/* Timeline slider */}
      <div className="flex items-center space-x-2">
        <span className="text-sm">{formatTime(currentTime)}</span>
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 100}
          step={0.1}
          onValueChange={handleTimelineChange}
          className="relative flex-1 flex items-center select-none touch-none h-5"
        />
        <span className="text-sm">{formatTime(duration)}</span>
      </div>
      
      {/* Main controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label={volume > 0 ? "Mute" : "Unmute"}
          >
            {volume > 0 ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          
          <Slider
            value={[volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="relative flex items-center select-none touch-none w-24 h-5"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={seekBackward}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Seek backward 5 seconds"
          >
            <SkipBack size={20} />
          </button>
          
          <button
            onClick={togglePlayPause}
            className="p-3 bg-purple-600 rounded-full text-white hover:bg-purple-700"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          
          <button
            onClick={seekForward}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Seek forward 5 seconds"
          >
            <SkipForward size={20} />
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={decreasePlaybackRate}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Decrease playback rate"
          >
            <Rewind size={20} />
          </button>
          
          <span className="text-sm font-medium">{playbackRate.toFixed(2)}x</span>
          
          <button
            onClick={increasePlaybackRate}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Increase playback rate"
          >
            <FastForward size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
