import React, { useRef, useEffect, useState, useCallback } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import * as Tone from "tone";
import {
  PlusIcon,
  MinusIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/solid";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  AlignStartHorizontal,
  AlignEndHorizontal,
  Bookmark,
  X,
  Repeat,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { toast } from "react-hot-toast";

// Stable empty array used in selectors to avoid creating
// a new [] on every render (prevents getSnapshot warnings)
const EMPTY_BOOKMARKS: readonly any[] = Object.freeze([]);

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

// Safe formatter for zoom value display
const formatZoom = (z: unknown): string => {
  const n = typeof z === "number" && isFinite(z) ? z : 1;
  return n.toFixed(1);
};

export const WaveformVisualizer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Track clickable bookmark lane rects (CSS pixel units)
  const laneRectsRef = useRef<
    { id: string; x1: number; x2: number; y1: number; y2: number }[]
  >([]);
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [lastTapPosition, setLastTapPosition] = useState<number | null>(null);
  const [pinchStartDistance, setPinchStartDistance] = useState<number | null>(
    null
  );
  const [pinchStartZoom, setPinchStartZoom] = useState<number>(1);
  // Context menu for overlapping bookmarks selection
  const [overlapMenu, setOverlapMenu] = useState<{
    x: number;
    y: number;
    items: { id: string; name: string; start: number; end: number }[];
  } | null>(null);

  // Detect if device is mobile
  const isMobile = useMediaQuery("(max-width: 768px)");

  const {
    currentFile,
    currentTime,
    duration,
    loopStart,
    loopEnd,
    isLooping,
    playbackRate,
    waveformZoom,
    showWaveform,
    setCurrentTime,
    setLoopPoints,
    setWaveformZoom,
    setIsLooping,
    addBookmark: storeAddBookmark,
    selectedBookmarkId,
    loadBookmark,
    setIsPlaying,
    deleteBookmark,
    autoAdvanceBookmarks,
    setAutoAdvanceBookmarks,
  } = usePlayerStore();

  // Subscribe to bookmarks for current media so changes re-render this component
  const bookmarks = usePlayerStore((state) => {
    const mediaId = state.getCurrentMediaId();
    // Return the actual array from state if it exists; otherwise return
    // a module-stable empty array so the selector snapshot is referentially stable.
    return mediaId && state.mediaBookmarks[mediaId]
      ? state.mediaBookmarks[mediaId]
      : (EMPTY_BOOKMARKS as any[]);
  });

  // Resolve the currently active/selected bookmark for display
  const activeBookmark =
    bookmarks?.find((b) => b.id === selectedBookmarkId) || null;

  // Ensure zoom stays a finite number (guards against accidental non-number assignments)
  useEffect(() => {
    if (typeof waveformZoom !== "number" || !isFinite(waveformZoom)) {
      setWaveformZoom(1);
    }
  }, [waveformZoom, setWaveformZoom]);

  // Close overlap menu on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverlapMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Load audio/video file and analyze waveform
  useEffect(() => {
    console.log('🔍 WaveformVisualizer useEffect triggered:', {
      currentFile: currentFile?.name,
      type: currentFile?.type,
      url: currentFile?.url ? 'present' : 'missing',
      showWaveform
    });
    
    if (
      !currentFile ||
      !currentFile.url ||
      (!currentFile.type.includes("audio") && !currentFile.type.includes("video"))
    ) {
      console.log('❌ WaveformVisualizer: File validation failed');
      setWaveformData(null);
      return;
    }

    let buffer: Tone.ToneAudioBuffer | null = null;

    const loadAudio = async () => {
      try {
        if (currentFile.type.includes("video")) {
          // For video files, extract audio using multiple methods
          console.log('🎬 Loading video file for waveform:', currentFile.name, 'Type:', currentFile.type);
          await loadVideoAudio(currentFile.url);
        } else {
          // For audio files, use Tone.js as before
          buffer = new Tone.ToneAudioBuffer(currentFile.url, () => {
            // Get audio data
            const channelData = buffer?.getChannelData(0) || new Float32Array();

            // Downsample for performance
            const downsampledData = downsampleAudioData(channelData, 2000);
            setWaveformData(downsampledData);
          });
        }
      } catch (error) {
        console.error("Error loading audio for waveform:", error);
      }
    };

    const loadVideoAudio = async (videoUrl: string) => {
      console.log('🎬 Starting video audio extraction for:', videoUrl);
      
      try {
        // Method 1: Try using fetch + decodeAudioData (works for some video formats)
        console.log('🎵 Trying Method 1: Direct audio decoding...');
        const response = await fetch(videoUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        
        console.log('✅ Method 1 succeeded! Audio buffer created:', audioBuffer);
        const channelData = audioBuffer.getChannelData(0);
        const downsampledData = downsampleAudioData(channelData, 2000);
        setWaveformData(downsampledData);
        audioContext.close();
        return;
        
      } catch (error) {
        console.log('❌ Method 1 failed:', (error as Error).message);
      }
      
      try {
        // Method 2: Use video element with Web Audio API
        console.log('🎵 Trying Method 2: Video element extraction...');
        
        const video = document.createElement('video');
        video.src = videoUrl;
        video.muted = true;
        video.volume = 0;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          video.oncanplaythrough = () => {
            console.log('📹 Video ready for playback');
            resolve(true);
          };
          video.onerror = (e) => {
            console.log('❌ Video loading error:', e);
            reject(e);
          };
          video.load();
        });
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        const source = audioContext.createMediaElementSource(video);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        
        source.connect(analyser);
        // Don't connect to destination to avoid audio output
        
        // Start video playback
        video.currentTime = 0;
        await video.play();
        
        console.log('🎬 Video playing, extracting audio data...');
        
        // Extract frequency data to create waveform
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const waveformSamples: number[] = [];
        
        // Collect samples for 3 seconds or until video ends
        const maxSamples = 2000;
        const sampleInterval = 50; // ms
        
        for (let i = 0; i < maxSamples && video.currentTime < video.duration; i++) {
          analyser.getByteFrequencyData(dataArray);
          
          // Convert frequency data to waveform-like data
          let sum = 0;
          for (let j = 0; j < bufferLength; j++) {
            sum += dataArray[j];
          }
          const average = (sum / bufferLength) / 255; // Normalize to 0-1
          waveformSamples.push((average - 0.5) * 2); // Convert to -1 to 1 range
          
          await new Promise(resolve => setTimeout(resolve, sampleInterval));
        }
        
        video.pause();
        source.disconnect();
        audioContext.close();
        
        if (waveformSamples.length > 0) {
          console.log('✅ Method 2 succeeded! Extracted', waveformSamples.length, 'samples');
          const channelData = new Float32Array(waveformSamples);
          const downsampledData = downsampleAudioData(channelData, 2000);
          setWaveformData(downsampledData);
          return;
        }
        
      } catch (error) {
        console.log('❌ Method 2 failed:', (error as Error).message);
      }
      
      // Method 3: Generate placeholder waveform
      console.log('🎵 Using Method 3: Generating placeholder waveform');
      const placeholderData = new Float32Array(2000);
      for (let i = 0; i < placeholderData.length; i++) {
        // Create a more interesting placeholder pattern
        const t = i / 2000;
        placeholderData[i] = Math.sin(t * Math.PI * 20) * Math.exp(-t * 2) * 0.3;
      }
      setWaveformData(placeholderData);
      console.log('✅ Placeholder waveform generated for video file');
    }

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
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;

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

    // Draw bookmark regions using vertical lanes at the top
    laneRectsRef.current = [];
    const visibleBookmarks = (Array.isArray(bookmarks) ? bookmarks : []).filter(
      (bm) => !(bm.end < startOffset || bm.start > endOffset)
    );
    // Greedy lane assignment by time to avoid overlaps in the same lane
    const lanes: { lastEnd: number }[] = [];
    const assigned: { id: string; start: number; end: number; lane: number }[] =
      [];
    // Sort by start time then by duration ascending so shorter clips get first choice
    visibleBookmarks
      .slice()
      .sort((a, b) => a.start - b.start || a.end - a.start - (b.end - b.start))
      .forEach((bm) => {
        let placed = false;
        for (let i = 0; i < lanes.length; i++) {
          if (bm.start >= lanes[i].lastEnd) {
            lanes[i].lastEnd = bm.end;
            assigned.push({ id: bm.id, start: bm.start, end: bm.end, lane: i });
            placed = true;
            break;
          }
        }
        if (!placed) {
          lanes.push({ lastEnd: bm.end });
          assigned.push({
            id: bm.id,
            start: bm.start,
            end: bm.end,
            lane: lanes.length - 1,
          });
        }
      });

    const lanePaddingCss = isMobile ? 8 : 6; // px from top
    const laneHeightCss = isMobile ? 20 : 16; // px height per lane (bolder on mobile)
    const laneGapCss = isMobile ? 4 : 3; // px spacing between lanes
    const toCanvasX = (t: number) =>
      ((Math.max(t, startOffset) - startOffset) / visibleDuration) *
      canvas.width;
    const topYCanvas = lanePaddingCss * dpr;
    assigned.forEach(({ id, start, end, lane }) => {
      const x1c = toCanvasX(start);
      const x2c =
        ((Math.min(end, endOffset) - startOffset) / visibleDuration) *
        canvas.width;
      const width = Math.max(1, x2c - x1c);
      const yCss = lanePaddingCss + lane * (laneHeightCss + laneGapCss);
      const yCanvas = yCss * dpr;
      const hCanvas = laneHeightCss * dpr;
      const isActive = id === selectedBookmarkId;
      // Fill lane block (bolder opacity)
      ctx.fillStyle = isActive
        ? "rgba(139,92,246,0.95)"
        : "rgba(139,92,246,0.65)";
      ctx.fillRect(x1c, yCanvas, width, hCanvas);
      // Outline
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2 * dpr;
      ctx.strokeRect(
        x1c + 0.5 * dpr,
        yCanvas + 0.5 * dpr,
        Math.max(0, width - dpr),
        Math.max(0, hCanvas - dpr)
      );
      // Save clickable rect in CSS pixels with a small hit padding for touch
      const hitPadY = isMobile ? 4 : 2;
      const hitPadX = isMobile ? 2 : 1;
      laneRectsRef.current.push({
        id,
        x1: x1c / dpr - hitPadX,
        x2: x2c / dpr + hitPadX,
        y1: Math.max(0, yCss - hitPadY),
        y2: yCss + laneHeightCss + hitPadY,
      });
    });

    // Dim the active bookmark across full height for context
    const active = (Array.isArray(bookmarks) ? bookmarks : []).find(
      (b) => b.id === selectedBookmarkId
    );
    if (active && !(active.end < startOffset || active.start > endOffset)) {
      const x1 = toCanvasX(active.start);
      const x2 =
        ((Math.min(active.end, endOffset) - startOffset) / visibleDuration) *
        canvas.width;
      const w = Math.max(1, x2 - x1);
      ctx.fillStyle = "rgba(139,92,246,0.15)";
      ctx.fillRect(x1, 0, w, canvas.height);
    }

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
    bookmarks,
    selectedBookmarkId,
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

  // Convert canvas position to audio time - wrapped in useCallback to stabilize references
  const positionToTime = useCallback(
    (x: number): number => {
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
    },
    [duration, waveformZoom, currentTime]
  );

  // Convert time to canvas position (percentage) - wrapped in useCallback
  const timeToPosition = useCallback(
    (time: number): number => {
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
    },
    [duration, waveformZoom, currentTime]
  );

  // Touch event handlers for mobile devices
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault(); // Prevent default touch behavior

      if (e.touches.length === 1) {
        // Single touch - handle as a potential drag or tap
        const touch = e.touches[0];
        const time = positionToTime(touch.clientX);

        if (time >= 0 && time <= duration) {
          setIsDragging(true);
          setDragStart(time);
          setDragEnd(null);
          setTouchStartTime(time);
        }
      } else if (e.touches.length === 2) {
        // Two finger touch - handle as pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        // Calculate distance between touches
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );

        setPinchStartDistance(distance);
        setPinchStartZoom(waveformZoom);
        setIsDragging(false); // Cancel any drag operation
      }
    },
    [
      duration,
      positionToTime,
      waveformZoom,
      setIsDragging,
      setDragStart,
      setDragEnd,
      setTouchStartTime,
      setPinchStartDistance,
      setPinchStartZoom,
    ]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault(); // Prevent default touch behavior

      if (e.touches.length === 1 && isDragging && dragStart !== null) {
        // Single touch movement - update drag end
        const touch = e.touches[0];
        const time = positionToTime(touch.clientX);

        if (time >= 0 && time <= duration) {
          setDragEnd(time);
          setHoverTime(time);
        }
      } else if (e.touches.length === 2 && pinchStartDistance !== null) {
        // Two finger movement - handle pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        // Calculate new distance between touches
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );

        // Calculate zoom ratio
        const ratio = distance / pinchStartDistance;
        const newZoom = Math.min(Math.max(pinchStartZoom * ratio, 1), 20);

        setWaveformZoom(newZoom);
      }
    },
    [
      isDragging,
      dragStart,
      duration,
      positionToTime,
      pinchStartDistance,
      pinchStartZoom,
      setDragEnd,
      setHoverTime,
      setWaveformZoom,
    ]
  );

  // Handle double-tap bookmark creation/removal
  const handleDoubleTapBookmark = useCallback(
    (tapTime: number) => {
      if (!bookmarks) return;

      const BOOKMARK_TOLERANCE = 1.0; // 1 second tolerance for finding nearby bookmarks

      // Find bookmarks near the tap position
      const nearbyBookmarks = bookmarks.filter(
        (bookmark) => Math.abs(bookmark.start - tapTime) <= BOOKMARK_TOLERANCE
      );

      if (nearbyBookmarks.length === 0) {
        // No nearby bookmarks - create a new one
        const newBookmark = {
          name: `Bookmark ${bookmarks.length + 1}`,
          start: tapTime,
          end: Math.min(tapTime + 5, duration), // 5-second default duration
          playbackRate,
          mediaName: currentFile?.name,
          mediaType: currentFile?.type,
          youtubeId: undefined,
          annotation: "",
        };

        const added = storeAddBookmark(newBookmark);
        if (added) {
          toast.success("Bookmark added");
        }
      } else if (nearbyBookmarks.length === 1) {
        // One bookmark nearby - remove it
        deleteBookmark(nearbyBookmarks[0].id);
        toast.success("Bookmark removed");
      } else {
        // Multiple overlapping bookmarks - show selection menu
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const tapPosition = timeToPosition(tapTime);
        const x = (tapPosition / 100) * rect.width;

        setOverlapMenu({
          x: x + rect.left,
          y: rect.top + rect.height / 2,
          items: nearbyBookmarks.map((bookmark) => ({
            id: bookmark.id,
            name: bookmark.name || "Bookmark",
            start: bookmark.start,
            end: bookmark.end,
          })),
        });
      }
    },
    [
      bookmarks,
      duration,
      playbackRate,
      currentFile,
      storeAddBookmark,
      deleteBookmark,
      timeToPosition,
      setOverlapMenu,
    ]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault(); // Prevent default touch behavior

      // Reset pinch zoom state
      setPinchStartDistance(null);

      const currentTime = Date.now();
      const TAP_THRESHOLD = 0.2; // Maximum movement for a tap (in seconds)
      const DOUBLE_TAP_DELAY = 300; // Maximum time between taps for double-tap (ms)

      // Handle drag completion
      if (isDragging && dragStart !== null && dragEnd !== null) {
        if (Math.abs(dragStart - dragEnd) > TAP_THRESHOLD) {
          // Set loop points if selection is significant
          const start = Math.min(dragStart, dragEnd);
          const end = Math.max(dragStart, dragEnd);
          setLoopPoints(start, end);
        } else if (
          touchStartTime !== null &&
          Math.abs(dragStart - touchStartTime) < TAP_THRESHOLD
        ) {
          // This was a tap - check for double-tap
          const timeSinceLastTap = currentTime - lastTapTime;
          const positionDiff =
            lastTapPosition !== null
              ? Math.abs(dragStart - lastTapPosition)
              : Infinity;

          if (
            timeSinceLastTap < DOUBLE_TAP_DELAY &&
            positionDiff < TAP_THRESHOLD
          ) {
            // Double-tap detected - handle bookmark creation/removal
            handleDoubleTapBookmark(dragStart);
            // Reset double-tap state
            setLastTapTime(0);
            setLastTapPosition(null);
          } else {
            // Single tap - seek to position and prepare for potential double-tap
            setCurrentTime(dragStart);
            document.body.classList.add("user-seeking");
            setTimeout(() => {
              document.body.classList.remove("user-seeking");
            }, 100);

            // Store tap info for potential double-tap
            setLastTapTime(currentTime);
            setLastTapPosition(dragStart);
          }
        }
      }

      // Reset drag state
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      setTouchStartTime(null);
      setHoverTime(null);
    },
    [
      isDragging,
      dragStart,
      dragEnd,
      touchStartTime,
      setLoopPoints,
      setCurrentTime,
      setPinchStartDistance,
      setIsDragging,
      setDragStart,
      setDragEnd,
      setTouchStartTime,
      setHoverTime,
      lastTapTime,
      lastTapPosition,
      handleDoubleTapBookmark,
    ]
  );

  if (!showWaveform || !currentFile || (!currentFile.type.includes("audio") && !currentFile.type.includes("video"))) {
    return null;
  }

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
    // Stop default scroll/zoom behaviors and stop bubbling
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY;
    const currentZoom = waveformZoom;
    const nextZoom =
      delta < 0
        ? Math.min(currentZoom * 1.1, 20)
        : Math.max(currentZoom / 1.1, 1);
    setWaveformZoom(nextZoom);
  };

  // Ensure wheel/touch listeners are non-passive so preventDefault works on all browsers
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const delta = ev.deltaY;
      const currentZoom = usePlayerStore.getState().waveformZoom;
      const nextZoom =
        delta < 0
          ? Math.min(currentZoom * 1.1, 20)
          : Math.max(currentZoom / 1.1, 1);
      setWaveformZoom(nextZoom);
    };

    const onTouchMove = (ev: TouchEvent) => {
      // When interacting inside the waveform, prevent the page from scrolling
      if (ev.touches.length >= 1) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel as EventListener);
      el.removeEventListener("touchmove", onTouchMove as EventListener);
    };
  }, [setWaveformZoom]);

  // Handle mouse down for range selection
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (overlapMenu) setOverlapMenu(null);
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
    if (overlapMenu) setOverlapMenu(null);
  };

  // Navigate between bookmarks (previous/next)
  const goToBookmark = (direction: "prev" | "next") => {
    const list = (bookmarks || []).slice().sort((a, b) => a.start - b.start);
    if (list.length === 0) return;

    // Find current index: selected id preferred; otherwise nearest to current time
    let idx = selectedBookmarkId
      ? list.findIndex((b) => b.id === selectedBookmarkId)
      : -1;
    if (idx === -1) {
      // nearest next
      idx = list.findIndex((b) => b.start > currentTime);
      if (idx === -1) idx = list.length - 1; // fallback to last
    }

    const nextIdx =
      direction === "next"
        ? (idx + 1) % list.length
        : (idx - 1 + list.length) % list.length;
    const target = list[nextIdx];
    if (!target) return;
    loadBookmark(target.id);
    setCurrentTime(target.start);
    setIsPlaying(true);
  };

  // Enable looping for the selected range
  const handleLoopSelection = () => {
    if (loopStart !== null && loopEnd !== null) {
      // Enable looping in the store
      setIsLooping(true);

      // Seek to the start of the loop
      setCurrentTime(loopStart);
      document.body.classList.add("user-seeking");
      setTimeout(() => {
        document.body.classList.remove("user-seeking");
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
      // First: check if click is within a stacked lane rect (precise selection)
      const rect = containerRef.current?.getBoundingClientRect();
      const xCss = rect ? e.clientX - rect.left : 0;
      const yCss = rect ? e.clientY - rect.top : 0;
      const laneHit = laneRectsRef.current.find(
        (r) => xCss >= r.x1 && xCss <= r.x2 && yCss >= r.y1 && yCss <= r.y2
      );
      if (laneHit) {
        const bm = bookmarks?.find((b) => b.id === laneHit.id);
        if (bm) {
          loadBookmark(bm.id);
          setCurrentTime(bm.start);
          setIsPlaying(true);
          document.body.classList.add("user-seeking");
          setTimeout(() => document.body.classList.remove("user-seeking"), 100);
          return;
        }
      }

      // Otherwise: fall back to region test under cursor
      const overlapped = Array.isArray(bookmarks)
        ? bookmarks.filter((bm) => bm.start <= time && time <= bm.end)
        : [];

      if (overlapped.length === 1) {
        const clickedBookmark = overlapped[0];
        loadBookmark(clickedBookmark.id);
        setCurrentTime(clickedBookmark.start);
        setIsPlaying(true);
        document.body.classList.add("user-seeking");
        setTimeout(() => {
          document.body.classList.remove("user-seeking");
        }, 100);
        return;
      } else if (overlapped.length > 1 && containerRef.current) {
        // Multiple overlaps: show a small picker near the click position
        const rect = containerRef.current.getBoundingClientRect();
        // Sort by shortest duration first (more specific clips first)
        const items = overlapped
          .slice()
          .sort((a, b) => a.end - a.start - (b.end - b.start))
          .map((b) => ({ id: b.id, name: b.name, start: b.start, end: b.end }));
        setOverlapMenu({
          x: e.clientX - rect.left,
          y: Math.max(8, e.clientY - rect.top),
          items,
        });
        return;
      }

      // Otherwise, just seek to the clicked time
      setCurrentTime(time);
      document.body.classList.add("user-seeking");
      setTimeout(() => {
        document.body.classList.remove("user-seeking");
      }, 100);
    }
  };

  // Utility to prevent click-through on overlay controls inside the canvas
  const stopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const handleSelectBookmark = (id: string) => {
    const bm = bookmarks?.find((b) => b.id === id);
    if (!bm) return;
    loadBookmark(id);
    setCurrentTime(bm.start);
    setIsPlaying(true);
    setOverlapMenu(null);
    document.body.classList.add("user-seeking");
    setTimeout(() => {
      document.body.classList.remove("user-seeking");
    }, 100);
  };

  return (
    <div className="mt-2 backdrop-blur-sm rounded-lg overflow-hidden border border-purple-500/30 relative">
      {/* Zoom controls - moved to top-left; hidden on mobile (use pinch) */}
      {/* {!isMobile && (
        <div className={`absolute top-1 left-1 z-10 flex items-center gap-1 bg-gray-900/60 backdrop-blur rounded-full ring-1 ring-white/10 shadow-md px-1.5 py-1`}>
          <button
            className={`inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 h-8 w-8`}
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
          <button
            className={`inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 h-8 w-8`}
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <MinusIcon className="h-3.5 w-3.5" />
          </button>
          <button
            className={`inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 h-8 w-8`}
            onClick={handleResetZoom}
            title="Reset Zoom"
          >
            <ArrowsPointingOutIcon className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs text-white/90 px-1">{formatZoom(waveformZoom)}x</span>
        </div>
      )} */}

      {/* Quick loop actions were moved inside the canvas container to avoid overlapping the footer */}

      {/* Waveform visualization with drag selection and touch support */}
      <div
        ref={containerRef}
        className={`${
          isMobile ? "h-40" : "h-40 sm:h-48 lg:h-56"
        } overflow-hidden relative overscroll-contain touch-none select-none`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleWaveformClick}
        onWheel={handleMouseWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* In-canvas quick loop actions - desktop only to avoid overlap on mobile */}
        {!isMobile && (
          <div
            className={`absolute bottom-2 right-2 z-10 flex items-center gap-1 bg-gray-900/60 backdrop-blur rounded-full ring-1 ring-white/10 shadow-md px-1.5 py-1`}
            onMouseDown={stopPropagation}
            onClick={stopPropagation}
            onTouchStart={stopPropagation}
            onWheel={
              stopPropagation as unknown as React.WheelEventHandler<HTMLDivElement>
            }
            onPointerDown={stopPropagation}
          >
            <button
              className={`${
                isLooping
                  ? "bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white"
                  : "text-white hover:bg-white/10 active:bg-white/20"
              } inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                isMobile ? "h-9 w-9" : "h-8 w-8"
              }`}
              onClick={() => setIsLooping(!isLooping)}
              title={isLooping ? "Disable loop" : "Enable loop"}
              aria-label="Toggle loop"
            >
              <Repeat size={isMobile ? 16 : 14} />
            </button>
            <button
              className={`${
                autoAdvanceBookmarks
                  ? "bg-purple-600 text-white"
                  : "text-white hover:bg-white/10 active:bg-white/20"
              } inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                isMobile ? "h-9 w-9" : "h-8 w-8"
              }`}
              onClick={() => setAutoAdvanceBookmarks(!autoAdvanceBookmarks)}
              title={
                autoAdvanceBookmarks
                  ? "Auto-advance between bookmarks: On"
                  : "Auto-advance between bookmarks: Off"
              }
              aria-label="Toggle auto-advance"
            >
              <ChevronsRight size={isMobile ? 16 : 14} />
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                isMobile ? "h-9 w-9" : "h-8 w-8"
              }`}
              onClick={() => {
                if (duration === 0) return;
                if (loopEnd !== null && currentTime >= loopEnd) {
                  setLoopPoints(currentTime, null);
                  setIsLooping(false);
                } else {
                  setLoopPoints(currentTime, loopEnd);
                  if (loopEnd !== null) setIsLooping(true);
                }
              }}
              title="Set A at current time"
              aria-label="Set A"
            >
              <AlignStartHorizontal size={isMobile ? 16 : 14} />
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                isMobile ? "h-9 w-9" : "h-8 w-8"
              }`}
              onClick={() => {
                if (duration === 0) return;
                const start = loopStart !== null ? loopStart : 0;
                if (currentTime > start) {
                  setLoopPoints(start, currentTime);
                  setIsLooping(true);
                }
              }}
              title="Set B at current time"
              aria-label="Set B"
            >
              <AlignEndHorizontal size={isMobile ? 16 : 14} />
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                isMobile ? "h-9 w-9" : "h-8 w-8"
              }`}
              onClick={() => {
                setLoopPoints(null, null);
                setIsLooping(false);
              }}
              title="Clear loop"
              aria-label="Clear loop"
            >
              <X size={isMobile ? 16 : 14} />
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                isMobile ? "h-9 w-9" : "h-8 w-8"
              }`}
              onClick={() => goToBookmark("prev")}
              title="Previous bookmark"
              aria-label="Previous bookmark"
              disabled={(bookmarks?.length || 0) === 0}
            >
              <ChevronLeft size={isMobile ? 16 : 14} />
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                isMobile ? "h-9 w-9" : "h-8 w-8"
              }`}
              onClick={() => goToBookmark("next")}
              title="Next bookmark"
              aria-label="Next bookmark"
              disabled={(bookmarks?.length || 0) === 0}
            >
              <ChevronRight size={isMobile ? 16 : 14} />
            </button>

            <button
              disabled={!selectedBookmarkId}
              className={`inline-flex items-center justify-center rounded-full text-white focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                isMobile ? "h-9 w-9" : "h-8 w-8"
              } ${
                selectedBookmarkId
                  ? "hover:bg-red-500/20 active:bg-red-500/30"
                  : "opacity-40 cursor-not-allowed"
              }`}
              onClick={() => {
                if (!selectedBookmarkId) return;
                deleteBookmark(selectedBookmarkId);
                toast.success("Bookmark deleted");
              }}
              title="Delete current bookmark"
              aria-label="Delete current bookmark"
            >
              <Trash2 size={isMobile ? 16 : 14} />
            </button>
            <button
              disabled={!(loopStart !== null && loopEnd !== null)}
              className={`inline-flex items-center justify-center rounded-full text-white focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                isMobile ? "h-9 w-9" : "h-8 w-8"
              } ${
                loopStart !== null && loopEnd !== null
                  ? "bg-purple-600 hover:bg-purple-700 active:bg-purple-800"
                  : "bg-purple-600/40 cursor-not-allowed"
              }`}
              onClick={() => {
                if (loopStart === null || loopEnd === null) return;
                const added = storeAddBookmark({
                  name: `Clip ${
                    usePlayerStore.getState().getCurrentMediaBookmarks()
                      .length + 1
                  }`,
                  start: loopStart,
                  end: loopEnd,
                  playbackRate,
                  mediaName: currentFile?.name,
                  mediaType: currentFile?.type,
                  youtubeId: undefined,
                  annotation: "",
                });
                if (added) toast.success("Bookmark added");
              }}
              title="Add bookmark from loop"
              aria-label="Add bookmark"
            >
              <Bookmark size={isMobile ? 16 : 14} />
            </button>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />

        {/* Overlapping bookmarks picker */}
        {overlapMenu && (
          <div
            className={
              isMobile
                ? "absolute z-20 bg-gray-900/90 text-white rounded-lg shadow-lg ring-1 ring-white/10 backdrop-blur"
                : "absolute z-20 bg-gray-900/90 text-white text-xs rounded-lg shadow-lg ring-1 ring-white/10 backdrop-blur min-w-[160px]"
            }
            style={
              isMobile
                ? { left: 8, right: 8, top: 8 }
                : {
                    left: overlapMenu.x,
                    top: Math.min(
                      overlapMenu.y,
                      (containerRef.current?.clientHeight || 0) - 8
                    ),
                  }
            }
            onMouseDown={stopPropagation}
            onClick={stopPropagation}
            onTouchStart={stopPropagation}
          >
            {overlapMenu.items.map((item) => (
              <button
                key={item.id}
                className={
                  isMobile
                    ? "w-full text-left px-4 py-3 text-sm hover:bg-white/10 focus:bg-white/10 focus:outline-none"
                    : "w-full text-left px-3 py-2 hover:bg-white/10 focus:bg-white/10 focus:outline-none"
                }
                onClick={() => handleSelectBookmark(item.id)}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={isMobile ? "truncate" : "truncate max-w-[120px]"}
                  >
                    {item.name || "Clip"}
                  </span>
                  <span
                    className={
                      isMobile
                        ? "ml-2 text-xs text-white/70"
                        : "ml-2 text-[11px] text-white/70"
                    }
                  >
                    {formatTime(item.start)}–{formatTime(item.end)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Visual indicator for dragging selection */}
        {isDragging && dragStart !== null && dragEnd !== null && (
          <div
            className="absolute bg-purple-500/30 border border-purple-500 pointer-events-none"
            style={{
              left: `${timeToPosition(Math.min(dragStart, dragEnd))}%`,
              width: `${
                timeToPosition(Math.max(dragStart, dragEnd)) -
                timeToPosition(Math.min(dragStart, dragEnd))
              }%`,
              top: 0,
              height: "100%",
              zIndex: 5,
            }}
          />
        )}

        {/* Tooltip for current hover/touch position */}
        {hoverTime !== null && (
          <div
            className={`absolute bg-gray-800/90 text-white ${
              isMobile ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1"
            } rounded pointer-events-none z-10`}
            style={{
              left: `${timeToPosition(hoverTime)}%`,
              top: isMobile ? "10px" : "0px",
              transform: "translateX(-50%)",
            }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Loop controls - responsive design for mobile */}
      <div
        className={`flex ${
          isMobile ? "flex-col" : "items-center justify-between"
        } p-1 bg-gray-900/50`}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
        onTouchStart={stopPropagation}
      >
        {isMobile && (
          <div className="mb-2">
            {/* Simplified mobile controls - only bookmark management */}
            <div className="flex items-center justify-center gap-3">
              <button
                disabled={!selectedBookmarkId}
                className={`inline-flex items-center justify-center rounded-full text-white focus:outline-none focus:ring-2 focus:ring-purple-400 h-10 w-10 ${
                  selectedBookmarkId
                    ? "hover:bg-red-500/20 active:bg-red-500/30"
                    : "opacity-40 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (!selectedBookmarkId) return;
                  deleteBookmark(selectedBookmarkId);
                  toast.success("Bookmark deleted");
                }}
                title="Delete current bookmark"
                aria-label="Delete current bookmark"
              >
                <Trash2 size={18} />
              </button>
              <button
                disabled={!(loopStart !== null && loopEnd !== null)}
                className={`inline-flex items-center justify-center rounded-full text-white focus:outline-none focus:ring-2 focus:ring-purple-400 h-10 w-10 ${
                  loopStart !== null && loopEnd !== null
                    ? "bg-purple-600 hover:bg-purple-700 active:bg-purple-800"
                    : "bg-purple-600/40 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (loopStart === null || loopEnd === null) return;
                  const added = storeAddBookmark({
                    name: `Clip ${
                      usePlayerStore.getState().getCurrentMediaBookmarks()
                        .length + 1
                    }`,
                    start: loopStart,
                    end: loopEnd,
                    playbackRate,
                    mediaName: currentFile?.name,
                    mediaType: currentFile?.type,
                    youtubeId: undefined,
                    annotation: "",
                  });
                  if (added) toast.success("Bookmark added");
                }}
                title="Add bookmark from loop"
                aria-label="Add bookmark"
              >
                <Bookmark size={18} />
              </button>
            </div>
          </div>
        )}
        <div
          className={`flex items-center ${
            isMobile ? "mb-1 justify-between w-full" : "space-x-2"
          }`}
        >
          <span
            className={
              isMobile ? "text-sm text-white font-medium" : "text-xs text-white"
            }
          >
            Loop:{" "}
          </span>
          {loopStart !== null && loopEnd !== null ? (
            <div
              className={`flex items-center ${
                isMobile ? "space-x-2 flex-1 justify-end" : "space-x-1"
              }`}
            >
              <span
                className={
                  isMobile ? "text-sm text-white" : "text-xs text-white"
                }
              >
                {formatTime(loopStart)} - {formatTime(loopEnd)}
              </span>
              <button
                className={`bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded ${
                  isMobile ? "text-sm px-3 py-1 ml-2" : "text-xs px-2 py-0.5"
                }`}
                onClick={handleLoopSelection}
                title={activeBookmark ? activeBookmark.name : "Loop Selection"}
              >
                <span className="inline-block max-w-[50vw] sm:max-w-[220px] truncate align-middle">
                  {activeBookmark ? activeBookmark.name : "Loop Selection"}
                </span>
              </button>
            </div>
          ) : (
            <span
              className={
                isMobile
                  ? "text-sm text-gray-400 flex-1 text-right"
                  : "text-xs text-gray-400"
              }
            >
              {isMobile
                ? "Tap and drag to select loop"
                : "Drag on waveform to select loop region"}
            </span>
          )}
        </div>

        <span
          className={
            isMobile
              ? "text-sm text-gray-400 w-full text-right"
              : "text-xs text-gray-400"
          }
        >
          Current zoom: {formatZoom(waveformZoom)}x
          {isMobile && " (pinch to zoom)"}
        </span>
      </div>
    </div>
  );
};
