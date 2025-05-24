import { useState, useEffect, useRef } from 'react'
import { usePlayerStore } from '@/stores/playerStore'
import { formatTime } from '@/utils/formatTime'
import { 
  RepeatIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Tooltip, 
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/utils/cn'

export const LoopControls = () => {
  const [startInput, setStartInput] = useState('')
  const [endInput, setEndInput] = useState('')
  const [bpmInput, setBpmInput] = useState('')
  const [sliderValue, setSliderValue] = useState<[number, number]>([0, 0])
  const [isDragging, setIsDragging] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)
  
  const {
    currentTime,
    duration,
    loopStart,
    loopEnd,
    isLooping,
    bpm,
    quantizeLoop,
    toggleLooping,
    setLoopPoints,
    moveLoopWindow,
    extendLoopStart,
    extendLoopEnd,
    scaleLoop,
    setBpm,
    setQuantizeLoop,
    quantizeCurrentLoop,
  } = usePlayerStore()

  // Update sliders when loop points change
  useEffect(() => {
    if (loopStart !== null && loopEnd !== null && !isDragging) {
      setSliderValue([loopStart, loopEnd])
      setStartInput(formatTime(loopStart))
      setEndInput(formatTime(loopEnd))
    }
  }, [loopStart, loopEnd, isDragging])

  // Set initial BPM input
  useEffect(() => {
    if (bpm !== null) {
      setBpmInput(bpm.toString())
    } else {
      setBpmInput('')
    }
  }, [bpm])

  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    if (value.length !== 2) return
    
    setSliderValue([value[0], value[1]])
    setIsDragging(true)
    
    // Update inputs while dragging
    setStartInput(formatTime(value[0]))
    setEndInput(formatTime(value[1]))
  }

  // Handle slider commit
  const handleSliderCommit = () => {
    setIsDragging(false)
    setLoopPoints(sliderValue[0], sliderValue[1])
  }

  // Parse time input in format MM:SS.ms
  const parseTimeInput = (input: string): number | null => {
    // Handle empty input
    if (!input.trim()) return null
    
    // Try different formats
    
    // MM:SS.ms
    const mmssmsRegex = /^(\d+):(\d+)\.(\d+)$/
    const mmssRegex = /^(\d+):(\d+)$/
    const secondsRegex = /^(\d+)\.?(\d*)$/
    
    let minutes = 0
    let seconds = 0
    let milliseconds = 0
    
    if (mmssmsRegex.test(input)) {
      const match = input.match(mmssmsRegex)
      if (match) {
        minutes = parseInt(match[1], 10)
        seconds = parseInt(match[2], 10)
        milliseconds = parseInt(match[3], 10) / Math.pow(10, match[3].length)
      }
    } else if (mmssRegex.test(input)) {
      const match = input.match(mmssRegex)
      if (match) {
        minutes = parseInt(match[1], 10)
        seconds = parseInt(match[2], 10)
      }
    } else if (secondsRegex.test(input)) {
      const match = input.match(secondsRegex)
      if (match) {
        seconds = parseInt(match[1], 10)
        if (match[2]) {
          milliseconds = parseInt(match[2], 10) / Math.pow(10, match[2].length)
        }
      }
    } else {
      return null
    }
    
    return minutes * 60 + seconds + milliseconds
  }

  // Handle start time input
  const handleStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartInput(e.target.value)
  }

  // Handle end time input
  const handleEndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndInput(e.target.value)
  }

  // Handle BPM input change
  const handleBpmInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpmInput(e.target.value)
  }

  // Handle start time input blur
  const handleStartInputBlur = () => {
    const parsedStart = parseTimeInput(startInput)
    
    if (parsedStart !== null && loopEnd !== null) {
      if (parsedStart < loopEnd && parsedStart >= 0 && parsedStart <= duration) {
        setLoopPoints(parsedStart, loopEnd)
      } else {
        // Reset to current value
        setStartInput(formatTime(loopStart || 0))
      }
    } else {
      // Reset to current value
      setStartInput(formatTime(loopStart || 0))
    }
  }

  // Handle end time input blur
  const handleEndInputBlur = () => {
    const parsedEnd = parseTimeInput(endInput)
    
    if (parsedEnd !== null && loopStart !== null) {
      if (parsedEnd > loopStart && parsedEnd <= duration) {
        setLoopPoints(loopStart, parsedEnd)
      } else {
        // Reset to current value
        setEndInput(formatTime(loopEnd || duration))
      }
    } else {
      // Reset to current value
      setEndInput(formatTime(loopEnd || duration))
    }
  }

  // Handle BPM input blur
  const handleBpmInputBlur = () => {
    const parsedBpm = parseInt(bpmInput, 10)
    
    if (!isNaN(parsedBpm) && parsedBpm > 0 && parsedBpm <= 300) {
      setBpm(parsedBpm)
    } else {
      // Reset to current value or clear
      setBpmInput(bpm !== null ? bpm.toString() : '')
    }
  }

  // Handle input key press
  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, onBlur: () => void) => {
    if (e.key === 'Enter') {
      onBlur()
    }
  }

  // Set current time as loop start
  const setCurrentAsLoopStart = () => {
    if (loopEnd === null || currentTime < loopEnd) {
      setLoopPoints(currentTime, loopEnd !== null ? loopEnd : duration)
    }
  }

  // Set current time as loop end
  const setCurrentAsLoopEnd = () => {
    if (loopStart === null || currentTime > loopStart) {
      setLoopPoints(loopStart !== null ? loopStart : 0, currentTime)
    }
  }

  // Handle quantize checkbox change
  const handleQuantizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantizeLoop(e.target.checked)
    
    if (e.target.checked && bpm !== null && loopStart !== null && loopEnd !== null) {
      quantizeCurrentLoop()
    }
  }

  // Calculate progress bar highlight
  const progressPercent = (currentTime / duration) * 100
  const startPercent = ((loopStart || 0) / duration) * 100
  const endPercent = ((loopEnd || duration) / duration) * 100
  
  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">A-B Loop</h3>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isLooping ? "default" : "outline"}
                size="sm"
                onClick={toggleLooping}
                className={cn(
                  isLooping && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                <RepeatIcon className="mr-2 h-4 w-4" />
                {isLooping ? "Looping" : "Loop"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isLooping ? "Disable A-B loop" : "Enable A-B loop"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Loop position indicator */}
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
        {/* Current position marker */}
        <div 
          className="absolute top-0 h-full bg-blue-500 opacity-30"
          style={{ 
            left: `${startPercent}%`, 
            width: `${endPercent - startPercent}%` 
          }}
        />
        
        {/* Current time indicator */}
        <div 
          className="absolute top-0 h-full w-1 bg-blue-600"
          style={{ left: `${progressPercent}%` }}
        />
      </div>
      
      {/* Slider for loop window */}
      <div className="py-2">
        <Slider
          value={sliderValue}
          min={0}
          max={duration || 100}
          step={0.01}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderCommit}
          className="my-4"
        />
      </div>
      
      {/* Time inputs and controls */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="loop-start">Loop Start</Label>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={setCurrentAsLoopStart}
              title="Set current time as loop start"
            >
              <span className="sr-only">Set current time as loop start</span>
              ↓
            </Button>
            <Input
              id="loop-start"
              value={startInput}
              onChange={handleStartInputChange}
              onBlur={handleStartInputBlur}
              onKeyPress={(e) => handleInputKeyPress(e, handleStartInputBlur)}
              className="w-full"
              placeholder="00:00.000"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="loop-end">Loop End</Label>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={setCurrentAsLoopEnd}
              title="Set current time as loop end"
            >
              <span className="sr-only">Set current time as loop end</span>
              ↓
            </Button>
            <Input
              id="loop-end"
              value={endInput}
              onChange={handleEndInputChange}
              onBlur={handleEndInputBlur}
              onKeyPress={(e) => handleInputKeyPress(e, handleEndInputBlur)}
              className="w-full"
              placeholder="00:00.000"
            />
          </div>
        </div>
      </div>
      
      {/* Loop adjustment controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        {/* Window movement */}
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => moveLoopWindow(-1)}
            title="Move loop window left"
            disabled={loopStart === null || loopEnd === null}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => moveLoopWindow(1)}
            title="Move loop window right"
            disabled={loopStart === null || loopEnd === null}
          >
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Loop size adjustment */}
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scaleLoop(0.5)}
            title="Halve loop length"
            disabled={loopStart === null || loopEnd === null}
          >
            <span className="text-xs">×½</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scaleLoop(2)}
            title="Double loop length"
            disabled={loopStart === null || loopEnd === null}
          >
            <span className="text-xs">×2</span>
          </Button>
        </div>
        
        {/* BPM and quantization */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={quantizeLoop ? "border-primary" : ""}
              disabled={loopStart === null || loopEnd === null}
            >
              BPM: {bpm || '—'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Loop Quantization</h4>
                <p className="text-sm text-muted-foreground">
                  Set BPM to quantize loop length to match musical beats.
                </p>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="bpm-input">BPM</Label>
                <Input
                  id="bpm-input"
                  value={bpmInput}
                  onChange={handleBpmInputChange}
                  onBlur={handleBpmInputBlur}
                  onKeyPress={(e) => handleInputKeyPress(e, handleBpmInputBlur)}
                  className="col-span-2"
                  placeholder="e.g. 120"
                  type="number"
                  min="1"
                  max="300"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="quantize-checkbox"
                  checked={quantizeLoop}
                  onChange={handleQuantizeChange}
                  className="rounded border-gray-300"
                  disabled={bpm === null}
                />
                <Label htmlFor="quantize-checkbox">
                  Auto-quantize loop to beats
                </Label>
              </div>
              <Button 
                variant="default" 
                onClick={quantizeCurrentLoop}
                disabled={bpm === null || loopStart === null || loopEnd === null}
              >
                Quantize Now
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
