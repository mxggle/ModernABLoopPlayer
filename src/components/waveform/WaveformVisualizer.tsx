import { useRef, useEffect, useState } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import * as Tone from "tone";
import { PlusIcon, MinusIcon, ArrowsPointingOutIcon } from "@heroicons/react/24/solid";

// Utility function to format time in mm:ss.ms format
const formatTime = (time: number): string => {
  if (isNaN(time)) return "00:00.0";
  
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const milliseconds = Math.floor((time % 1) * 10);
  
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${milliseconds}`;
};

export const WaveformVisualizer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const {
    currentFile,
    currentTime,
    duration,
    loopStart,
    loopEnd,
    waveformZoom,
    showWaveform,
    setCurrentTime,
    setLoopPoints,
    setWaveformZoom,
    setIsLooping,
  } = usePlayerStore();

  // Load audio file and analyze waveform
  useEffect(() => {
    if (
      !currentFile ||
      !currentFile.url ||
      !currentFile.type.includes("audio")
    ) {
      setWaveformData(null);
      return;
    }

    let buffer: Tone.ToneAudioBuffer | null = null;

    const loadAudio = async () => {
      try {
        // Load audio buffer
        buffer = new Tone.ToneAudioBuffer(currentFile.url, () => {
          // Get audio data
          const channelData = buffer?.getChannelData(0) || new Float32Array();

          // Downsample for performance
          const downsampledData = downsampleAudioData(channelData, 2000);
          setWaveformData(downsampledData);
        });
      } catch (error) {
        console.error("Error loading audio for waveform:", error);
      }
    };

    loadAudio();

    return () => {
      if (buffer) {
        buffer.dispose();
      }
    };
  }, [currentFile]);

  // Draw waveform
  useEffect(() => {
    if (!canvasRef.current || !waveformData || !showWaveform) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate visible portion based on zoom
    const visibleDuration = duration / waveformZoom;
    const startOffset = Math.max(
      0,
      Math.min(currentTime - visibleDuration / 2, duration - visibleDuration)
    );
    const endOffset = startOffset + visibleDuration;

    // Calculate start and end indices in the waveform data
    const startIndex = Math.floor(
      (startOffset / duration) * waveformData.length
    );
    const endIndex = Math.ceil((endOffset / duration) * waveformData.length);

    // Calculate loop region in pixels
    const canvasLoopStart =
      loopStart !== null
        ? ((loopStart - startOffset) / visibleDuration) * canvas.width
        : -1;
    const canvasLoopEnd =
      loopEnd !== null
        ? ((loopEnd - startOffset) / visibleDuration) * canvas.width
        : -1;

    // Draw loop region background
    if (
      loopStart !== null &&
      loopEnd !== null &&
      canvasLoopStart >= 0 &&
      canvasLoopEnd <= canvas.width
    ) {
      ctx.fillStyle = "rgba(139, 92, 246, 0.2)"; // Purple with opacity
      ctx.fillRect(
        canvasLoopStart,
        0,
        canvasLoopEnd - canvasLoopStart,
        canvas.height
      );
    }

    // Draw waveform
    ctx.beginPath();
    ctx.strokeStyle = "#8B5CF6"; // Purple
    ctx.lineWidth = 2 * window.devicePixelRatio;

    const sliceWidth = canvas.width / (endIndex - startIndex);
    const centerY = canvas.height / 2;
    const amplitudeScale = canvas.height * 0.4;

    for (let i = startIndex; i < endIndex; i++) {
      const x = (i - startIndex) * sliceWidth;
      const y = centerY + waveformData[i] * amplitudeScale;

      if (i === startIndex) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Draw playhead
    const playheadX =
      ((currentTime - startOffset) / visibleDuration) * canvas.width;
    if (playheadX >= 0 && playheadX <= canvas.width) {
      ctx.beginPath();
      ctx.strokeStyle = "#EF4444"; // Red
      ctx.lineWidth = 2 * window.devicePixelRatio;
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, canvas.height);
      ctx.stroke();
    }

    // Draw loop start and end markers
    if (
      loopStart !== null &&
      canvasLoopStart >= 0 &&
      canvasLoopStart <= canvas.width
    ) {
      drawMarker(ctx, canvasLoopStart, canvas.height, "A");
    }

    if (
      loopEnd !== null &&
      canvasLoopEnd >= 0 &&
      canvasLoopEnd <= canvas.width
    ) {
      drawMarker(ctx, canvasLoopEnd, canvas.height, "B");
    }
  }, [
    waveformData,
    currentTime,
    duration,
    loopStart,
    loopEnd,
    waveformZoom,
    showWaveform,
  ]);

  // Helper function to draw markers
  const drawMarker = (
    ctx: CanvasRenderingContext2D,
    x: number,
    height: number,
    label: string
  ) => {
    const markerHeight = height;
    const markerWidth = 20 * window.devicePixelRatio;

    // Draw marker line
    ctx.beginPath();
    ctx.strokeStyle = label === "A" ? "#10B981" : "#3B82F6"; // Green for A, Blue for B
    ctx.lineWidth = 2 * window.devicePixelRatio;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, markerHeight);
    ctx.stroke();

    // Draw label background
    ctx.fillStyle = label === "A" ? "#10B981" : "#3B82F6";
    ctx.fillRect(
      x - markerWidth / 2,
      0,
      markerWidth,
      20 * window.devicePixelRatio
    );

    // Draw label text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `${12 * window.devicePixelRatio}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, 10 * window.devicePixelRatio);
  };

  // Helper function to downsample audio data
  const downsampleAudioData = (
    data: Float32Array,
    targetLength: number
  ): Float32Array => {
    const result = new Float32Array(targetLength);
    const step = Math.floor(data.length / targetLength);

    for (let i = 0; i < targetLength; i++) {
      const start = i * step;
      const end = Math.min(start + step, data.length);
      let sum = 0;
      let count = 0;

      for (let j = start; j < end; j++) {
        sum += Math.abs(data[j]);
        count++;
      }

      result[i] = count > 0 ? sum / count : 0;
    }

    return result;
  };

  if (!showWaveform || !currentFile || !currentFile.type.includes("audio")) {
    return null;
  }

  // Convert canvas position to audio time
  const positionToTime = (x: number): number => {
    if (!canvasRef.current || !duration) return 0;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const canvasX = x - rect.left;
    const percentage = canvasX / rect.width;

    // Calculate time based on visible portion and zoom
    const visibleDuration = duration / waveformZoom;
    const startOffset = Math.max(
      0,
      Math.min(currentTime - visibleDuration / 2, duration - visibleDuration)
    );
    return startOffset + percentage * visibleDuration;
  };
  
  // Convert time to canvas position (percentage)
  const timeToPosition = (time: number): number => {
    if (!duration) return 0;
    
    // Calculate visible portion based on zoom
    const visibleDuration = duration / waveformZoom;
    const startOffset = Math.max(
      0,
      Math.min(currentTime - visibleDuration / 2, duration - visibleDuration)
    );
    
    // If the time is outside the visible range, clamp it
    if (time < startOffset) return 0;
    if (time > startOffset + visibleDuration) return 100;
    
    // Calculate the percentage position within the visible window
    return ((time - startOffset) / visibleDuration) * 100;
  };

  // Handle zoom controls
  const handleZoomIn = () => {
    // Increase zoom by 25% with a maximum of 20x
    setWaveformZoom(Math.min(waveformZoom * 1.25, 20));
  };

  const handleZoomOut = () => {
    // Decrease zoom by 20% with a minimum of 1x
    setWaveformZoom(Math.max(waveformZoom / 1.25, 1));
  };

  const handleResetZoom = () => {
    setWaveformZoom(1); // Reset to default zoom
  };
  
  // Handle mouse wheel for zooming
  const handleMouseWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent page scrolling
    
    // Get the mouse wheel delta
    const delta = e.deltaY;
    
    // Delta is negative when scrolling up (zoom in)
    // Delta is positive when scrolling down (zoom out)
    if (delta < 0) {
      // Zoom in - smoother increment for wheel
      setWaveformZoom(Math.min(waveformZoom * 1.1, 20));
    } else {
      // Zoom out - smoother decrement for wheel
      setWaveformZoom(Math.max(waveformZoom / 1.1, 1));
    }
  };
  
  // Handle mouse down for range selection
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    
    // Only start selection with left mouse button
    if (e.button !== 0) return;
    
    // Get the time at the click position
    const time = positionToTime(e.clientX);
    if (time >= 0 && time <= duration) {
      setIsDragging(true);
      setDragStart(time);
      setDragEnd(null);
    }
  };
  
  // Handle mouse move during range selection
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    
    // Calculate the time at current position
    const time = positionToTime(e.clientX);
    if (time >= 0 && time <= duration) {
      setHoverTime(time);
      
      // Update end position if dragging
      if (isDragging && dragStart !== null) {
        setDragEnd(time);
      }
    } else {
      setHoverTime(null);
    }
  };
  
  // Handle mouse up to finalize range selection
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || dragStart === null) return;
    
    const time = positionToTime(e.clientX);
    if (time >= 0 && time <= duration && Math.abs(time - dragStart) > 0.1) {
      // Only set loop points if the selection is significant (>100ms)
      const start = Math.min(dragStart, time);
      const end = Math.max(dragStart, time);
      setLoopPoints(start, end);
    }
    
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };
  
  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoverTime(null);
    
    // Cancel dragging if mouse leaves the component
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }
  };
  
  // Enable looping for the selected range
  const handleLoopSelection = () => {
    if (loopStart !== null && loopEnd !== null) {
      // Enable looping in the store
      setIsLooping(true);
      
      // Seek to the start of the loop
      setCurrentTime(loopStart);
      document.body.classList.add('user-seeking');
      setTimeout(() => {
        document.body.classList.remove('user-seeking');
      }, 100);
    }
  };
  
  // Handle waveform click for seeking (only when not dragging)
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || isDragging) return;
    
    // Only handle left clicks that aren't part of a drag operation
    if (e.button !== 0 || dragStart !== null) return;
    
    const time = positionToTime(e.clientX);
    if (time >= 0 && time <= duration) {
      setCurrentTime(time);
      document.body.classList.add('user-seeking');
      setTimeout(() => {
        document.body.classList.remove('user-seeking');
      }, 100);
    }
  };

  return (
    <div className="mt-2 backdrop-blur-sm rounded-lg overflow-hidden border border-purple-500/30 relative">
      {/* Zoom controls */}
      <div className="absolute top-1 right-1 z-10 flex items-center space-x-1 bg-gray-800/80 backdrop-blur-sm rounded px-1 py-0.5">
        <button 
          className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <PlusIcon className="h-3 w-3" />
        </button>
        <button 
          className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <MinusIcon className="h-3 w-3" />
        </button>
        <button 
          className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded"
          onClick={handleResetZoom}
          title="Reset Zoom"
        >
          <ArrowsPointingOutIcon className="h-3 w-3" />
        </button>
        <span className="text-xs text-white">{waveformZoom.toFixed(1)}x</span>
      </div>
      
      {/* Waveform visualization with drag selection */}
      <div 
        ref={containerRef}
        className="h-24 overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleWaveformClick}
        onWheel={handleMouseWheel}
      >
        <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />
        
        {/* Visual indicator for dragging selection */}
        {isDragging && dragStart !== null && dragEnd !== null && (
          <div 
            className="absolute bg-purple-500/30 border border-purple-500 pointer-events-none"
            style={{
              left: `${timeToPosition(Math.min(dragStart, dragEnd))}%`,
              width: `${timeToPosition(Math.max(dragStart, dragEnd)) - timeToPosition(Math.min(dragStart, dragEnd))}%`,
              top: 0,
              height: '100%',
              zIndex: 5
            }}
          />
        )}
        
        {/* Tooltip for current hover position */}
        {hoverTime !== null && (
          <div 
            className="absolute bg-gray-800/90 text-white text-xs px-2 py-1 rounded pointer-events-none z-10"
            style={{
              left: `${timeToPosition(hoverTime)}%`,
              top: '0px',
              transform: 'translateX(-50%)',
            }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>
      
      {/* Loop controls */}
      <div className="flex items-center justify-between p-1 bg-gray-900/50">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-white">Loop: </span>
          {loopStart !== null && loopEnd !== null ? (
            <div className="flex items-center space-x-1">
              <span className="text-xs text-white">{formatTime(loopStart)} - {formatTime(loopEnd)}</span>
              <button 
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-2 py-0.5 rounded"
                onClick={handleLoopSelection}
              >
                Loop Selection
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Drag on waveform to select loop region</span>
          )}
        </div>
        
        <span className="text-xs text-gray-400">
          Current zoom: {waveformZoom.toFixed(1)}x
        </span>
      </div>
    </div>
  );
};
