import { useState, useEffect } from 'react'
import { Slider } from '@radix-ui/react-slider'
import { Toggle } from '@radix-ui/react-toggle'
import { usePlayerStore } from '../../stores/playerStore'
import { formatTime } from '../../utils/formatTime'
import { 
  SkipBack, 
  SkipForward, 
  Repeat, 
  AlignStartHorizontal, 
  AlignEndHorizontal
} from 'lucide-react'

export const ABLoopControls = () => {
  const {
    currentTime,
    duration,
    loopStart,
    loopEnd,
    isLooping,
    setLoopPoints,
    setIsLooping,
    setCurrentTime
  } = usePlayerStore()

  const [rangeValues, setRangeValues] = useState<[number, number]>([0, 100])

  // Update range slider when loop points change
  useEffect(() => {
    if (duration === 0) return
    
    const start = loopStart !== null ? loopStart : 0
    const end = loopEnd !== null ? loopEnd : duration
    
    setRangeValues([
      (start / duration) * 100,
      (end / duration) * 100
    ])
  }, [loopStart, loopEnd, duration])

  // Handle range slider change
  const handleRangeChange = (values: number[]) => {
    if (duration === 0) return
    
    const [startPercent, endPercent] = values as [number, number]
    const start = (startPercent / 100) * duration
    const end = (endPercent / 100) * duration
    
    setRangeValues([startPercent, endPercent])
    setLoopPoints(start, end)
  }

  // Set loop start point at current time
  const setLoopStartAtCurrentTime = () => {
    const end = loopEnd !== null ? loopEnd : duration
    if (currentTime < end) {
      setLoopPoints(currentTime, end)
    }
  }

  // Set loop end point at current time
  const setLoopEndAtCurrentTime = () => {
    const start = loopStart !== null ? loopStart : 0
    if (currentTime > start) {
      setLoopPoints(start, currentTime)
    }
  }

  // Toggle looping
  const toggleLooping = () => {
    setIsLooping(!isLooping)
  }

  // Halve the loop duration
  const halveLoopDuration = () => {
    if (loopStart === null || loopEnd === null) return
    
    const loopDuration = loopEnd - loopStart
    const newDuration = loopDuration / 2
    const newEnd = loopStart + newDuration
    
    if (newEnd <= duration) {
      setLoopPoints(loopStart, newEnd)
    }
  }

  // Double the loop duration
  const doubleLoopDuration = () => {
    if (loopStart === null || loopEnd === null) return
    
    const loopDuration = loopEnd - loopStart
    const newDuration = loopDuration * 2
    const newEnd = loopStart + newDuration
    
    if (newEnd <= duration) {
      setLoopPoints(loopStart, newEnd)
    } else {
      setLoopPoints(loopStart, duration)
    }
  }

  // Move loop window left
  const moveLoopLeft = () => {
    if (loopStart === null || loopEnd === null) return
    
    const loopDuration = loopEnd - loopStart
    const newStart = Math.max(0, loopStart - loopDuration / 2)
    const newEnd = newStart + loopDuration
    
    setLoopPoints(newStart, newEnd)
  }

  // Move loop window right
  const moveLoopRight = () => {
    if (loopStart === null || loopEnd === null) return
    
    const loopDuration = loopEnd - loopStart
    const newEnd = Math.min(duration, loopEnd + loopDuration / 2)
    const newStart = newEnd - loopDuration
    
    setLoopPoints(newStart, newEnd)
  }

  // Clear loop points
  const clearLoopPoints = () => {
    setLoopPoints(null, null)
    setIsLooping(false)
  }

  // Jump to loop start
  const jumpToLoopStart = () => {
    if (loopStart !== null) {
      setCurrentTime(loopStart)
    }
  }

  // Jump to loop end
  const jumpToLoopEnd = () => {
    if (loopEnd !== null) {
      setCurrentTime(loopEnd)
    }
  }

  return (
    <div className="space-y-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">A-B Loop Controls</h3>
        <Toggle 
          pressed={isLooping} 
          onPressedChange={toggleLooping}
          className={`p-2 rounded-md ${isLooping 
            ? 'bg-purple-500 text-white' 
            : 'bg-gray-200 dark:bg-gray-700'}`}
          aria-label="Toggle looping"
        >
          <Repeat size={18} />
        </Toggle>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={setLoopStartAtCurrentTime}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          aria-label="Set loop start at current time"
        >
          <AlignStartHorizontal size={18} />
        </button>
        
        <div className="flex-1">
          <Slider
            value={rangeValues}
            min={0}
            max={100}
            step={0.1}
            onValueChange={handleRangeChange}
            className="relative flex items-center select-none touch-none w-full h-5"
          />
        </div>
        
        <button 
          onClick={setLoopEndAtCurrentTime}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          aria-label="Set loop end at current time"
        >
          <AlignEndHorizontal size={18} />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">A:</span>
          <input
            type="text"
            value={loopStart !== null ? formatTime(loopStart) : "--:--"}
            readOnly
            className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm w-16"
          />
          <button 
            onClick={jumpToLoopStart}
            className="p-1 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            aria-label="Jump to loop start"
          >
            <SkipBack size={16} />
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">B:</span>
          <input
            type="text"
            value={loopEnd !== null ? formatTime(loopEnd) : "--:--"}
            readOnly
            className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm w-16"
          />
          <button 
            onClick={jumpToLoopEnd}
            className="p-1 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            aria-label="Jump to loop end"
          >
            <SkipForward size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex justify-between">
        <div className="flex space-x-1">
          <button 
            onClick={moveLoopLeft}
            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            aria-label="Move loop left"
          >
            «
          </button>
          <button 
            onClick={halveLoopDuration}
            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            aria-label="Halve loop duration"
          >
            ×½
          </button>
          <button 
            onClick={doubleLoopDuration}
            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            aria-label="Double loop duration"
          >
            ×2
          </button>
          <button 
            onClick={moveLoopRight}
            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            aria-label="Move loop right"
          >
            »
          </button>
        </div>
        
        <button 
          onClick={clearLoopPoints}
          className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          aria-label="Clear loop points"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
