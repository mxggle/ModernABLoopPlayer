import { useState, useEffect } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { formatTime } from '../../utils/formatTime'
import { 
  SkipBack, 
  SkipForward, 
  Repeat, 
  AlignStartHorizontal, 
  AlignEndHorizontal
} from 'lucide-react'
import { Slider } from '../ui/slider'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

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
    
    // Enable looping when points are set
    if (!isLooping) {
      setIsLooping(true)
    }
  }

  // Set loop start point at current time
  const setLoopStartAtCurrentTime = () => {
    const end = loopEnd !== null ? loopEnd : duration
    if (currentTime < end) {
      setLoopPoints(currentTime, end)
      // Enable looping when points are set
      if (!isLooping) {
        setIsLooping(true)
      }
    }
  }

  // Set loop end point at current time
  const setLoopEndAtCurrentTime = () => {
    const start = loopStart !== null ? loopStart : 0
    if (currentTime > start) {
      setLoopPoints(start, currentTime)
      // Enable looping when points are set
      if (!isLooping) {
        setIsLooping(true)
      }
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
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">A-B Loop Controls</h3>
        <Button 
          variant={isLooping ? "default" : "outline"}
          size="sm"
          onClick={toggleLooping}
          className="gap-1"
          aria-label="Toggle looping"
        >
          <Repeat size={16} />
          <span>{isLooping ? 'Looping' : 'Loop Off'}</span>
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="outline"
          size="sm"
          onClick={setLoopStartAtCurrentTime}
          aria-label="Set loop start at current time"
        >
          <AlignStartHorizontal size={16} />
        </Button>
        
        <div className="flex-1">
          <Slider
            defaultValue={rangeValues}
            value={rangeValues}
            max={100}
            step={0.1}
            onValueChange={handleRangeChange}
            className="w-full"
          />
        </div>
        
        <Button 
          variant="outline"
          size="sm"
          onClick={setLoopEndAtCurrentTime}
          aria-label="Set loop end at current time"
        >
          <AlignEndHorizontal size={16} />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">A:</span>
          <Input
            value={loopStart !== null ? formatTime(loopStart) : "--:--"}
            readOnly
            className="w-20 text-center"
          />
          <Button 
            variant="outline"
            size="icon"
            onClick={jumpToLoopStart}
            aria-label="Jump to loop start"
            disabled={loopStart === null}
          >
            <SkipBack size={16} />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">B:</span>
          <Input
            value={loopEnd !== null ? formatTime(loopEnd) : "--:--"}
            readOnly
            className="w-20 text-center"
          />
          <Button 
            variant="outline"
            size="icon"
            onClick={jumpToLoopEnd}
            aria-label="Jump to loop end"
            disabled={loopEnd === null}
          >
            <SkipForward size={16} />
          </Button>
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
