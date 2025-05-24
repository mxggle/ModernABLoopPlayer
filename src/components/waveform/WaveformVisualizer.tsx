import { useRef, useEffect, useState } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import * as Tone from 'tone'

export const WaveformVisualizer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null)
  
  const {
    currentFile,
    currentTime,
    duration,
    loopStart,
    loopEnd,
    waveformZoom,
    showWaveform
  } = usePlayerStore()

  // Load audio file and analyze waveform
  useEffect(() => {
    if (!currentFile || !currentFile.url || !currentFile.type.includes('audio')) {
      setWaveformData(null)
      return
    }

    let buffer: Tone.ToneAudioBuffer | null = null
    
    const loadAudio = async () => {
      try {
        // Load audio buffer
        buffer = new Tone.ToneAudioBuffer(currentFile.url, () => {
          // Get audio data
          const channelData = buffer?.getChannelData(0) || new Float32Array()
          
          // Downsample for performance
          const downsampledData = downsampleAudioData(channelData, 2000)
          setWaveformData(downsampledData)
        })
      } catch (error) {
        console.error('Error loading audio for waveform:', error)
      }
    }

    loadAudio()

    return () => {
      if (buffer) {
        buffer.dispose()
      }
    }
  }, [currentFile])

  // Draw waveform
  useEffect(() => {
    if (!canvasRef.current || !waveformData || !showWaveform) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.clientWidth * window.devicePixelRatio
    canvas.height = canvas.clientHeight * window.devicePixelRatio
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Calculate visible portion based on zoom
    const visibleDuration = duration / waveformZoom
    const startOffset = Math.max(0, Math.min(currentTime - visibleDuration / 2, duration - visibleDuration))
    const endOffset = startOffset + visibleDuration
    
    // Calculate start and end indices in the waveform data
    const startIndex = Math.floor((startOffset / duration) * waveformData.length)
    const endIndex = Math.ceil((endOffset / duration) * waveformData.length)
    
    // Calculate loop region in pixels
    const canvasLoopStart = loopStart !== null 
      ? ((loopStart - startOffset) / visibleDuration) * canvas.width 
      : -1
    const canvasLoopEnd = loopEnd !== null 
      ? ((loopEnd - startOffset) / visibleDuration) * canvas.width 
      : -1
    
    // Draw loop region background
    if (loopStart !== null && loopEnd !== null && canvasLoopStart >= 0 && canvasLoopEnd <= canvas.width) {
      ctx.fillStyle = 'rgba(139, 92, 246, 0.2)' // Purple with opacity
      ctx.fillRect(canvasLoopStart, 0, canvasLoopEnd - canvasLoopStart, canvas.height)
    }
    
    // Draw waveform
    ctx.beginPath()
    ctx.strokeStyle = '#8B5CF6' // Purple
    ctx.lineWidth = 2 * window.devicePixelRatio
    
    const sliceWidth = canvas.width / (endIndex - startIndex)
    const centerY = canvas.height / 2
    const amplitudeScale = canvas.height * 0.4
    
    for (let i = startIndex; i < endIndex; i++) {
      const x = (i - startIndex) * sliceWidth
      const y = centerY + waveformData[i] * amplitudeScale
      
      if (i === startIndex) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    
    ctx.stroke()
    
    // Draw playhead
    const playheadX = ((currentTime - startOffset) / visibleDuration) * canvas.width
    if (playheadX >= 0 && playheadX <= canvas.width) {
      ctx.beginPath()
      ctx.strokeStyle = '#EF4444' // Red
      ctx.lineWidth = 2 * window.devicePixelRatio
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, canvas.height)
      ctx.stroke()
    }
    
    // Draw loop start and end markers
    if (loopStart !== null && canvasLoopStart >= 0 && canvasLoopStart <= canvas.width) {
      drawMarker(ctx, canvasLoopStart, canvas.height, 'A')
    }
    
    if (loopEnd !== null && canvasLoopEnd >= 0 && canvasLoopEnd <= canvas.width) {
      drawMarker(ctx, canvasLoopEnd, canvas.height, 'B')
    }
    
  }, [waveformData, currentTime, duration, loopStart, loopEnd, waveformZoom, showWaveform])

  // Helper function to draw markers
  const drawMarker = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    height: number, 
    label: string
  ) => {
    const markerHeight = height
    const markerWidth = 20 * window.devicePixelRatio
    
    // Draw marker line
    ctx.beginPath()
    ctx.strokeStyle = label === 'A' ? '#10B981' : '#3B82F6' // Green for A, Blue for B
    ctx.lineWidth = 2 * window.devicePixelRatio
    ctx.moveTo(x, 0)
    ctx.lineTo(x, markerHeight)
    ctx.stroke()
    
    // Draw label background
    ctx.fillStyle = label === 'A' ? '#10B981' : '#3B82F6'
    ctx.fillRect(x - markerWidth / 2, 0, markerWidth, 20 * window.devicePixelRatio)
    
    // Draw label text
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `${12 * window.devicePixelRatio}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x, 10 * window.devicePixelRatio)
  }

  // Helper function to downsample audio data
  const downsampleAudioData = (data: Float32Array, targetLength: number): Float32Array => {
    const result = new Float32Array(targetLength)
    const step = Math.floor(data.length / targetLength)
    
    for (let i = 0; i < targetLength; i++) {
      const start = i * step
      const end = Math.min(start + step, data.length)
      let sum = 0
      let count = 0
      
      for (let j = start; j < end; j++) {
        sum += Math.abs(data[j])
        count++
      }
      
      result[i] = count > 0 ? sum / count : 0
    }
    
    return result
  }

  if (!showWaveform || !currentFile || !currentFile.type.includes('audio')) {
    return null
  }

  return (
    <div className="mt-4 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
      />
    </div>
  )
}
