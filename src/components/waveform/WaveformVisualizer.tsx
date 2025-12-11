import React, { useRef, useEffect, useState, useCallback } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import * as Tone from "tone";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useShadowingStore } from "../../stores/shadowingStore";
import { retrieveMediaFile } from "../../utils/mediaStorage";
import { useShadowingPlayer } from "../../hooks/useShadowingPlayer";
import {
  AlignStartHorizontal,
  AlignEndHorizontal,
  Bookmark,
  X,
  Repeat,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

// Constant toast ID to ensure only one bookmark notification is shown at a time
const BOOKMARK_TOAST_ID = "bookmark-action-toast";

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


export const WaveformVisualizer = () => {
  const { t } = useTranslation();
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
  const dragStartXRef = useRef<number | null>(null);
  const [resizingBookmark, setResizingBookmark] = useState<{ id: string; edge: "start" | "end" } | null>(null);
  const resizingRef = useRef(false); // Ref to track resizing status avoiding closure staleness

  // Detect if device is mobile
  const isMobile = useMediaQuery("(max-width: 768px)");

  const {
    currentFile,
    currentYouTube,
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
    updateBookmark,
    volume,
    setVolume,
    muted,
    setMuted,
  } = usePlayerStore();

  const { getSegments, volume: shadowVolume, setVolume: setShadowVolume, muted: shadowMuted, setMuted: setShadowMuted } = useShadowingStore();

  // Use getCurrentMediaId to ensure consistency with how segments are saved
  const mediaId = usePlayerStore((state) => state.getCurrentMediaId());
  console.log("📊 [WaveformVisualizer] Current media ID:", mediaId);

  const shadowingSegments = mediaId ? getSegments(mediaId) : [];
  const [shadowingWaveforms, setShadowingWaveforms] = useState<{ start: number; data: Float32Array; duration: number }[]>([]);

  // Initialize Shadowing Player
  useShadowingPlayer();

  // Load shadowing waveforms
  useEffect(() => {
    console.log("📊 [WaveformVisualizer] Shadowing segments changed:", { count: shadowingSegments.length, segments: shadowingSegments });

    if (shadowingSegments.length === 0) {
      console.log("📊 [WaveformVisualizer] No shadowing segments, clearing waveforms");
      setShadowingWaveforms([]);
      return;
    }

    let active = true;
    const loadShadowing = async () => {
      console.log("📊 [WaveformVisualizer] Loading shadowing waveforms for", shadowingSegments.length, "segments");

      const loaded = await Promise.all(
        shadowingSegments.map(async (seg, index) => {
          try {
            console.log(`📊 [WaveformVisualizer] Loading segment ${index}:`, { storageId: seg.storageId, startTime: seg.startTime });

            const file = await retrieveMediaFile(seg.storageId);
            if (!file) {
              console.warn(`📊 [WaveformVisualizer] No file found for segment ${index}`);
              return null;
            }

            console.log(`📊 [WaveformVisualizer] Retrieved file for segment ${index}:`, { name: file.name, size: file.size });

            const arrayBuffer = await file.arrayBuffer();
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const data = downsampleAudioData(audioBuffer.getChannelData(0), 1000); // Lower resolution for shadowing is fine

            console.log(`📊 [WaveformVisualizer] Decoded and downsampled segment ${index}:`, { duration: audioBuffer.duration, dataPoints: data.length });

            return {
              start: seg.startTime,
              data,
              duration: audioBuffer.duration
            };
          } catch (e) {
            console.error(`📊 [WaveformVisualizer] Failed to load shadowing segment ${index}:`, e);
            return null;
          }
        })
      );

      if (active) {
        const validWaveforms = loaded.filter((s): s is NonNullable<typeof s> => s !== null);
        console.log("📊 [WaveformVisualizer] Loaded shadowing waveforms:", { total: shadowingSegments.length, valid: validWaveforms.length });
        setShadowingWaveforms(validWaveforms);
      }
    };

    loadShadowing();
    return () => { active = false; };
  }, [shadowingSegments]);

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
    console.log("🔍 WaveformVisualizer useEffect triggered:", {
      currentFile: currentFile?.name,
      type: currentFile?.type,
      url: currentFile?.url ? "present" : "missing",
      showWaveform,
    });

    if (
      !currentFile ||
      !currentFile.url ||
      (!currentFile.type.includes("audio") &&
        !currentFile.type.includes("video"))
    ) {
      console.log("❌ WaveformVisualizer: File validation failed");
      setWaveformData(null);
      return;
    }

    let buffer: Tone.ToneAudioBuffer | null = null;

    const loadAudio = async () => {
      try {
        if (currentFile.type.includes("video")) {
          // For video files, extract audio using multiple methods
          console.log(
            "🎬 Loading video file for waveform:",
            currentFile.name,
            "Type:",
            currentFile.type
          );
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
      console.log("🎬 Starting video audio extraction for:", videoUrl);

      try {
        // Method 1: Try using fetch + decodeAudioData (works for some video formats)
        console.log("🎵 Trying Method 1: Direct audio decoding...");
        const response = await fetch(videoUrl);
        const arrayBuffer = await response.arrayBuffer();

        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(
          arrayBuffer.slice(0)
        );

        console.log(
          "✅ Method 1 succeeded! Audio buffer created:",
          audioBuffer
        );
        const channelData = audioBuffer.getChannelData(0);
        const downsampledData = downsampleAudioData(channelData, 2000);
        setWaveformData(downsampledData);
        audioContext.close();
        return;
      } catch (error) {
        console.log("❌ Method 1 failed:", (error as Error).message);
      }

      try {
        // Method 2: Use video element with Web Audio API
        console.log("🎵 Trying Method 2: Video element extraction...");

        const video = document.createElement("video");
        video.src = videoUrl;
        video.muted = true;
        video.volume = 0;

        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          video.oncanplaythrough = () => {
            console.log("📹 Video ready for playback");
            resolve(true);
          };
          video.onerror = (e) => {
            console.log("❌ Video loading error:", e);
            reject(e);
          };
          video.load();
        });

        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();

        // Resume audio context if suspended
        if (audioContext.state === "suspended") {
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

        console.log("🎬 Video playing, extracting audio data...");

        // Extract frequency data to create waveform
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const waveformSamples: number[] = [];

        // Collect samples for 3 seconds or until video ends
        const maxSamples = 2000;
        const sampleInterval = 50; // ms

        for (
          let i = 0;
          i < maxSamples && video.currentTime < video.duration;
          i++
        ) {
          analyser.getByteFrequencyData(dataArray);

          // Convert frequency data to waveform-like data
          let sum = 0;
          for (let j = 0; j < bufferLength; j++) {
            sum += dataArray[j];
          }
          const average = sum / bufferLength / 255; // Normalize to 0-1
          waveformSamples.push((average - 0.5) * 2); // Convert to -1 to 1 range

          await new Promise((resolve) => setTimeout(resolve, sampleInterval));
        }

        video.pause();
        source.disconnect();
        audioContext.close();

        if (waveformSamples.length > 0) {
          console.log(
            "✅ Method 2 succeeded! Extracted",
            waveformSamples.length,
            "samples"
          );
          const channelData = new Float32Array(waveformSamples);
          const downsampledData = downsampleAudioData(channelData, 2000);
          setWaveformData(downsampledData);
          return;
        }
      } catch (error) {
        console.log("❌ Method 2 failed:", (error as Error).message);
      }

      // Method 3: Generate placeholder waveform
      console.log("🎵 Using Method 3: Generating placeholder waveform");
      const placeholderData = new Float32Array(2000);
      for (let i = 0; i < placeholderData.length; i++) {
        // Create a more interesting placeholder pattern
        const t = i / 2000;
        placeholderData[i] =
          Math.sin(t * Math.PI * 20) * Math.exp(-t * 2) * 0.3;
      }
      setWaveformData(placeholderData);
      console.log("✅ Placeholder waveform generated for video file");
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
    // const topYCanvas = lanePaddingCss * dpr; // Unused variable
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

      // Draw resize handles
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      const handleW = 4 * dpr;
      // Left handle
      ctx.fillRect(x1c, yCanvas, handleW, hCanvas);
      // Right handle
      ctx.fillRect(Math.max(x1c, x2c - handleW), yCanvas, handleW, hCanvas);
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

    // Draw waveform as bars
    const hasShadowing = shadowingWaveforms.length > 0;
    const mainWaveformHeight = hasShadowing ? canvas.height / 2 : canvas.height;

    ctx.fillStyle = "#8B5CF6"; // Purple
    const sliceWidth = canvas.width / (endIndex - startIndex);
    const mainCenterY = mainWaveformHeight / 2;
    const amplitudeScale = mainWaveformHeight * 2; // Scale up a bit since we have less height

    // Calculate bar dimensions
    // We want a small gap between bars if there's enough space

    const gap = sliceWidth > 4 * dpr ? 1 * dpr : 0;
    const barWidth = Math.max(1 * dpr, sliceWidth - gap);

    for (let i = startIndex; i < endIndex; i++) {
      const x = (i - startIndex) * sliceWidth;
      const value = waveformData[i];

      // Calculate bar height based on amplitude
      // Ensure even silence has a tiny presence (1px) or full silence
      const height = Math.max(1 * dpr, value * amplitudeScale * 0.8); // 0.8 to leave some padding
      const y = mainCenterY - height / 2;

      ctx.fillRect(x, y, barWidth, height);
    }

    // Draw Shadowing Waveforms
    if (hasShadowing) {
      const shadowTop = mainWaveformHeight;
      const shadowHeight = canvas.height - mainWaveformHeight;
      const shadowCenterY = shadowTop + shadowHeight / 2;

      // Draw separator
      ctx.beginPath();
      ctx.strokeStyle = "rgba(139, 92, 246, 0.3)";
      ctx.lineWidth = 1 * dpr;
      ctx.moveTo(0, shadowTop);
      ctx.lineTo(canvas.width, shadowTop);
      ctx.stroke();

      shadowingWaveforms.forEach(seg => {
        // Calculate overlap with visible range
        const segEnd = seg.start + seg.duration;
        if (segEnd < startOffset || seg.start > endOffset) return;

        // Map segment data to canvas
        // This is tricky because segment data is downsampled to specific length (1000)
        // We need to map time -> segment index

        ctx.fillStyle = "#10B981"; // Emerald/Green for user audio

        // Or iterate segment data points and map to X? 
        // Mapping segment data points to X is easier if resolution is enough.

        const sampleDuration = seg.duration / seg.data.length;

        for (let i = 0; i < seg.data.length; i++) {
          const time = seg.start + i * sampleDuration;
          if (time < startOffset || time > endOffset) continue;

          const val = seg.data[i];
          const x = ((time - startOffset) / visibleDuration) * canvas.width;
          const barW = (sampleDuration / visibleDuration) * canvas.width;
          // Ensure min width
          const finalBarW = Math.max(1 * dpr, barW);

          const h = Math.max(1 * dpr, val * shadowHeight * 1.5); // increased gain
          const y = shadowCenterY - h / 2;

          ctx.fillRect(x, y, finalBarW, h);
        }
      });
    }

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
    shadowingWaveforms, // Added dependency
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
          toast.success(t("bookmarks.bookmarkAdded"), { id: BOOKMARK_TOAST_ID });
        }
      } else if (nearbyBookmarks.length === 1) {
        // One bookmark nearby - remove it
        deleteBookmark(nearbyBookmarks[0].id);
        toast.success(t("bookmarks.bookmarkRemoved"), { id: BOOKMARK_TOAST_ID });
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
            name: bookmark.name || t("bookmarks.clipFallback"),
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
      t,
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

  if (
    !showWaveform ||
    !currentFile ||
    (!currentFile.type.includes("audio") && !currentFile.type.includes("video"))
  ) {
    return null;
  }

  // Handle zoom controls - commented out unused function
  // const handleZoomIn = () => {
  //   // Increase zoom by 25% with a maximum of 20x
  //   setWaveformZoom(Math.min(waveformZoom * 1.25, 20));
  // };

  // const handleZoomIn = () => {
  //   setZoomLevel((prev) => Math.min(prev * 1.5, 10));
  // };

  // const handleZoomOut = () => {
  //   setZoomLevel((prev) => Math.max(prev / 1.5, 0.1));
  // };

  // const handleResetZoom = () => {
  //   setZoomLevel(1);
  // };

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


  // Handle mouse down for range selection or bookmark resizing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (overlapMenu) setOverlapMenu(null);
    if (!canvasRef.current) return;

    // Only start selection with left mouse button
    if (e.button !== 0) return;

    // Check for bookmark resize handles
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && laneRectsRef.current.length > 0) {
      const xCss = e.clientX - rect.left;
      const yCss = e.clientY - rect.top;
      const HANDLE_WIDTH = 8;

      for (const lane of laneRectsRef.current) {
        if (yCss >= lane.y1 && yCss <= lane.y2) {
          // Check start handle
          if (Math.abs(xCss - lane.x1) <= HANDLE_WIDTH) {
            setResizingBookmark({ id: lane.id, edge: "start" });
            resizingRef.current = true;
            return;
          }
          // Check end handle
          if (Math.abs(xCss - lane.x2) <= HANDLE_WIDTH) {
            setResizingBookmark({ id: lane.id, edge: "end" });
            resizingRef.current = true;
            return;
          }
        }
      }
    }

    // Get the time at the click position
    const time = positionToTime(e.clientX);
    if (time >= 0 && time <= duration) {
      setIsDragging(true);
      setDragStart(time);
      setDragEnd(null);
      dragStartXRef.current = e.clientX;
    }
  };

  // Handle mouse move during range selection or resizing
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;

    const rect = containerRef.current?.getBoundingClientRect();
    const xCss = rect ? e.clientX - rect.left : 0;
    const yCss = rect ? e.clientY - rect.top : 0;
    const HANDLE_WIDTH = 8;
    // Removed unused cursor variable declaration

    // Handle resizing
    if (resizingBookmark) {
      const time = positionToTime(e.clientX);
      if (time >= 0 && time <= duration) {
        const bm = bookmarks?.find((b) => b.id === resizingBookmark.id);
        if (bm) {
          if (resizingBookmark.edge === "start") {
            const newStart = Math.min(time, bm.end - 0.1);
            if (newStart >= 0) updateBookmark(bm.id, { start: newStart });
          } else {
            const newEnd = Math.max(time, bm.start + 0.1);
            if (newEnd <= duration) updateBookmark(bm.id, { end: newEnd });
          }
        }
      }
      return;
    }

    // Update cursor for hover effects
    let onHandle = false;
    if (rect && !isDragging) {
      for (const lane of laneRectsRef.current) {
        if (yCss >= lane.y1 && yCss <= lane.y2) {
          if (Math.abs(xCss - lane.x1) <= HANDLE_WIDTH || Math.abs(xCss - lane.x2) <= HANDLE_WIDTH) {
            onHandle = true;
            break;
          }
        }
      }
    }
    if (containerRef.current) containerRef.current.style.cursor = onHandle ? "ew-resize" : (isDragging ? "crosshair" : "default");

    // Calculate the time at current position
    const time = positionToTime(e.clientX);
    if (time >= 0 && time <= duration) {
      setHoverTime(time);

      // Update end position if Loop dragging (not resizing)
      if (isDragging && dragStart !== null) {
        setDragEnd(time);
      }
    } else {
      setHoverTime(null);
    }
  };

  // Handle mouse up to finalize range selection
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (resizingBookmark) {
      setResizingBookmark(null);
      // Keep resizingRef true slightly longer to prevent click handling
      setTimeout(() => resizingRef.current = false, 50);
      return;
    }

    if (!isDragging || dragStart === null) return;

    const time = positionToTime(e.clientX);
    // Use pixel distance for threshold to avoid false positives from moving waveform while playing
    const pixelDist = dragStartXRef.current !== null ? Math.abs(e.clientX - dragStartXRef.current) : 0;

    // Only set loop points if the drag distance > 5px AND time diff > 0.1s
    if (time >= 0 && time <= duration && pixelDist > 5 && Math.abs(time - dragStart) > 0.1) {
      const start = Math.min(dragStart, time);
      const end = Math.max(dragStart, time);
      setLoopPoints(start, end);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    dragStartXRef.current = null;
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoverTime(null);
    setResizingBookmark(null);
    resizingRef.current = false;

    // Cancel dragging if mouse leaves the component
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      dragStartXRef.current = null;
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
    if (!canvasRef.current || isDragging || resizingRef.current) return;

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



      // If loop is active and user clicks outside the loop range, disable looping
      if (isLooping && loopStart !== null && loopEnd !== null) {
        if (time < loopStart || time > loopEnd) {
          setIsLooping(false);
        }
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
        className={`${isMobile ? "h-40" : "h-40 sm:h-48 lg:h-56"
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
              className={`${isLooping
                ? "bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white"
                : "text-white hover:bg-white/10 active:bg-white/20"
                } inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 ${isMobile ? "h-9 w-9" : "h-8 w-8"
                }`}
              onClick={() => setIsLooping(!isLooping)}
              title={isLooping ? t("loop.disableLoop") : t("loop.enableLoop")}
              aria-label={t("player.toggleLooping")}
            >
              <Repeat size={isMobile ? 16 : 14} />
            </button>
            <button
              className={`${autoAdvanceBookmarks
                ? "bg-purple-600 text-white"
                : "text-white hover:bg-white/10 active:bg-white/20"
                } inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 ${isMobile ? "h-9 w-9" : "h-8 w-8"
                }`}
              onClick={() => setAutoAdvanceBookmarks(!autoAdvanceBookmarks)}
              title={
                autoAdvanceBookmarks
                  ? t("player.autoAdvanceOn")
                  : t("player.autoAdvanceOff")
              }
              aria-label={t("player.toggleAutoAdvance")}
            >
              <ChevronsRight size={isMobile ? 16 : 14} />
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 ${isMobile ? "h-9 w-9" : "h-8 w-8"
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
              title={t("loop.setStart")}
              aria-label={t("loop.setStart")}
            >
              <AlignStartHorizontal size={isMobile ? 16 : 14} />
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 ${isMobile ? "h-9 w-9" : "h-8 w-8"
                }`}
              onClick={() => {
                if (duration === 0) return;
                const start = loopStart !== null ? loopStart : 0;
                if (currentTime > start) {
                  setLoopPoints(start, currentTime);
                  setIsLooping(true);
                }
              }}
              title={t("loop.setEnd")}
              aria-label={t("loop.setEnd")}
            >
              <AlignEndHorizontal size={isMobile ? 16 : 14} />
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 ${isMobile ? "h-9 w-9" : "h-8 w-8"
                }`}
              onClick={() => {
                setLoopPoints(null, null);
                setIsLooping(false);
              }}
              title={t("loop.clearLoopPoints")}
              aria-label={t("loop.clearLoopPoints")}
            >
              <X size={isMobile ? 16 : 14} />
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 ${isMobile ? "h-9 w-9" : "h-8 w-8"
                }`}
              onClick={() => goToBookmark("prev")}
              title={t("player.previousBookmark")}
              aria-label={t("player.previousBookmark")}
              disabled={(bookmarks?.length || 0) === 0}
            >
              <ChevronLeft size={isMobile ? 16 : 14} />
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 ${isMobile ? "h-9 w-9" : "h-8 w-8"
                }`}
              onClick={() => goToBookmark("next")}
              title={t("player.nextBookmark")}
              aria-label={t("player.nextBookmark")}
              disabled={(bookmarks?.length || 0) === 0}
            >
              <ChevronRight size={isMobile ? 16 : 14} />
            </button>

            <button
              className={`inline-flex items-center justify-center rounded-full text-white focus:outline-none focus:ring-2 focus:ring-purple-400 ${isMobile ? "h-9 w-9" : "h-8 w-8"
                } ${selectedBookmarkId
                  ? "bg-purple-700 hover:bg-red-500/80 active:bg-red-500/90" // Active/Delete mode
                  : loopStart !== null && loopEnd !== null
                    ? "bg-purple-600/50 hover:bg-purple-700 active:bg-purple-800" // Add mode
                    : "bg-purple-600/40 cursor-not-allowed" // Disabled
                }`}
              onClick={() => {
                if (selectedBookmarkId) {
                  // Delete mode
                  deleteBookmark(selectedBookmarkId);
                  toast.success(t("bookmarks.bookmarkRemoved"), { id: BOOKMARK_TOAST_ID });
                } else if (loopStart !== null && loopEnd !== null) {
                  // Check if a bookmark already exists for this range
                  const TOL = 0.05; // 50ms tolerance (same as in playerStore)
                  const existingBookmarks = usePlayerStore.getState().getCurrentMediaBookmarks();
                  const existingBookmark = existingBookmarks.find(
                    (b) => Math.abs(b.start - loopStart) < TOL && Math.abs(b.end - loopEnd) < TOL
                  );

                  if (existingBookmark) {
                    // If a bookmark already exists for this exact range, remove it (toggle behavior)
                    deleteBookmark(existingBookmark.id);
                    toast.success(t("bookmarks.bookmarkRemoved"), { id: BOOKMARK_TOAST_ID });
                  } else {
                    // Add mode - create new bookmark
                    const added = storeAddBookmark({
                      name: `Clip ${usePlayerStore.getState().getCurrentMediaBookmarks()
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
                    if (added) toast.success(t("bookmarks.bookmarkAdded"), { id: BOOKMARK_TOAST_ID });
                  }
                }
              }}
              disabled={!selectedBookmarkId && !(loopStart !== null && loopEnd !== null)}
              title={selectedBookmarkId ? t("bookmarks.removeBookmarkTooltip") : t("bookmarks.addBookmarkTooltip")}
              aria-label={selectedBookmarkId ? t("bookmarks.removeBookmarkTooltip") : t("bookmarks.addBookmarkTooltip")}
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
              width: `${timeToPosition(Math.max(dragStart, dragEnd)) -
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
            className={`absolute bg-gray-800/90 text-white ${isMobile ? "text-sm px-3 py-1.5" : "text-xs px-2 py-1"
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
        className={`flex ${isMobile ? "flex-col" : "items-center justify-between"
          } p-1 bg-gray-900/50`}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
        onTouchStart={stopPropagation}
      >
        {/* Mobile bookmark controls moved to PlaybackControls component */}
        <div
          className={`flex items-center ${isMobile ? "mb-1 justify-between w-full" : "space-x-2"
            }`}
        >
          <span
            className={
              isMobile ? "text-sm text-white font-medium" : "text-xs text-white"
            }
          >
            {t("waveform.loopLabel")}{" "}
          </span>
          {loopStart !== null && loopEnd !== null ? (
            <div
              className={`flex items-center ${isMobile ? "space-x-2 flex-1 justify-end" : "space-x-1"
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
                className={`bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded ${isMobile ? "text-sm px-3 py-1 ml-2" : "text-xs px-2 py-0.5"
                  }`}
                onClick={handleLoopSelection}
                title={
                  activeBookmark
                    ? activeBookmark.name
                    : t("waveform.loopSelection")
                }
              >
                <span className="inline-block max-w-[50vw] sm:max-w-[220px] truncate align-middle">
                  {activeBookmark
                    ? activeBookmark.name
                    : t("waveform.loopSelection")}
                </span>
              </button>
              <button
                className={`bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded ${isMobile ? "text-sm px-2 py-1 ml-1" : "text-xs px-1.5 py-0.5 ml-1"
                  }`}
                onClick={() => {
                  setLoopPoints(null, null);
                  setIsLooping(false);
                }}
                title={t("loop.clearLoopPoints")}
                aria-label={t("loop.clearLoopPoints")}
              >
                <X size={isMobile ? 16 : 12} />
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
                ? t("waveform.touchSelectHint")
                : t("waveform.desktopSelectHint")}
            </span>
          )}
        </div>
      </div>

      {/* Track Controls Overlay */}
      {showWaveform && (
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-2">
          {/* Media Track Control */}
          <div className="bg-black/50 backdrop-blur-sm rounded p-1 flex items-center gap-1 group transition-all hover:bg-black/70">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (muted) {
                  // Unmute: restore previous volume from store
                  const previousVolume = usePlayerStore.getState().previousVolume;
                  if (previousVolume !== undefined && previousVolume > 0) {
                    setVolume(previousVolume);
                  } else {
                    setVolume(1); // Default to 100% if no previous volume
                  }
                  setMuted(false);
                } else {
                  // Mute: store current volume and set to 0
                  usePlayerStore.getState().setPreviousVolume(volume);
                  setVolume(0);
                  setMuted(true);
                }
              }}
              className="p-1 hover:bg-white/10 rounded text-white/90"
            >
              {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </button>
            <div className="w-16 px-1">
              <Slider
                value={[volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={(v) => setVolume(v[0])}
                className="h-3 cursor-pointer [&>span:first-of-type]:bg-black/40 [&>span:first-of-type>span]:bg-white"
              />
            </div>
            <span className="text-[10px] text-white/70 px-1 font-mono">MEDIA</span>
          </div>

          {/* Shadowing Track Control */}
          {shadowingWaveforms.length > 0 && (
            <div className="bg-black/50 backdrop-blur-sm rounded p-1 flex items-center gap-1 group transition-all hover:bg-black/70" style={{ marginTop: canvasRef.current ? (canvasRef.current.clientHeight / 2) - 40 : 100 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (shadowMuted) {
                    // Unmute: restore previous volume
                    const previousVolume = useShadowingStore.getState().previousShadowVolume;
                    if (previousVolume !== undefined && previousVolume > 0) {
                      setShadowVolume(previousVolume);
                    } else {
                      setShadowVolume(1);
                    }
                    setShadowMuted(false);
                  } else {
                    // Mute: store current volume and set to 0
                    useShadowingStore.getState().setPreviousShadowVolume(shadowVolume);
                    setShadowVolume(0);
                    setShadowMuted(true);
                  }
                }}
                className="p-1 hover:bg-white/10 rounded text-white/90"
              >
                {shadowMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>
              <div className="w-16 px-1">
                <Slider
                  value={[shadowVolume]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={(v) => setShadowVolume(v[0])}
                  className="h-3 cursor-pointer [&>span:first-of-type]:bg-black/40 [&>span:first-of-type>span]:bg-white"
                />
              </div>
              <span className="text-[10px] text-white/70 px-1 font-mono">REC</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
