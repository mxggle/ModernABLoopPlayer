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
  Trash2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

// Constant toast ID to ensure only one bookmark notification is shown at a time
const BOOKMARK_TOAST_ID = "bookmark-action-toast";

// Stable empty arrays used in selectors to avoid creating
// a new [] on every render (prevents infinite re-render loops)
const EMPTY_BOOKMARKS: readonly any[] = Object.freeze([]);
const EMPTY_SEGMENTS: readonly any[] = Object.freeze([]);

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
  const wasPlayingRef = useRef(false); // Ref to track if media was playing before drag
  // Desktop: independent viewport scroll position (left edge of visible window in seconds)
  const [scrollOffset, setScrollOffset] = useState(0);
  // Desktop: Alt+drag to pan viewport
  const [isPanning, setIsPanning] = useState(false);
  const panStartScrollRef = useRef(0);

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
    mediaVolume,
    setMediaVolume,
    previousMediaVolume,
    setPreviousMediaVolume,
    isPlaying,
    muted,
    toggleMute,
  } = usePlayerStore();

  const { volume: shadowVolume, setVolume: setShadowVolume, muted: shadowMuted, setMuted: setShadowMuted, currentRecording } = useShadowingStore();

  // Use getCurrentMediaId to ensure consistency with how segments are saved
  const mediaId = usePlayerStore((state) => state.getCurrentMediaId());

  // Use a Zustand selector for shadowingSegments to ensure referential stability.
  // Without this, getSegments() returns a new [] on every render when there are
  // no segments, which triggers the useEffect -> setShadowingWaveforms -> re-render
  // loop infinitely.
  const shadowingSegments = useShadowingStore((state) => {
    if (!mediaId) return EMPTY_SEGMENTS as any[];
    return state.sessions[mediaId]?.segments || (EMPTY_SEGMENTS as any[]);
  });
  const [shadowingWaveforms, setShadowingWaveforms] = useState<{ start: number; data: Float32Array; duration: number }[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Initialize Shadowing Player
  useShadowingPlayer();

  // Load shadowing waveforms
  useEffect(() => {
    if (shadowingSegments.length === 0) {
      setShadowingWaveforms([]);
      return;
    }

    let active = true;
    const loadShadowing = async () => {
      const loaded = await Promise.all(
        shadowingSegments.map(async (seg, index) => {
          try {
            const file = await retrieveMediaFile(seg.storageId);
            if (!file) {
              console.warn(`[WaveformVisualizer] No file found for segment ${index}`);
              return null;
            }

            const arrayBuffer = await file.arrayBuffer();
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const fileOffset = seg.fileOffset || 0;
            const segmentDuration = seg.duration > 0 ? seg.duration : (audioBuffer.duration - fileOffset);

            const startSample = Math.floor(fileOffset * audioBuffer.sampleRate);
            const endSample = Math.min(
              Math.floor((fileOffset + segmentDuration) * audioBuffer.sampleRate),
              audioBuffer.length
            );

            let rawData = audioBuffer.getChannelData(0);
            if (fileOffset > 0 || endSample < rawData.length) {
              rawData = rawData.slice(startSample, endSample);
            }

            const data = downsampleAudioData(rawData, 1000);

            audioContext.close();

            return {
              start: seg.startTime,
              data,
              duration: segmentDuration
            };
          } catch (e) {
            console.error(`[WaveformVisualizer] Failed to load shadowing segment ${index}:`, e);
            return null;
          }
        })
      );

      if (active) {
        const validWaveforms = loaded.filter((s): s is NonNullable<typeof s> => s !== null);
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

  // YouTube notice dismissal state
  const [isYoutubeNoticeDismissed, setIsYoutubeNoticeDismissed] = useState(false);

  // Reset dismissal when youtube video changes
  useEffect(() => {
    if (currentYouTube?.id) {
      setIsYoutubeNoticeDismissed(false);
    }
  }, [currentYouTube?.id]); // Close overlap menu on Escape
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

    const hasMedia = currentFile?.url || currentYouTube?.id;
    if (
      !hasMedia ||
      (currentFile &&
        !currentFile.type.includes("audio") &&
        !currentFile.type.includes("video"))
    ) {
      console.log("❌ WaveformVisualizer: File/Media validation failed");
      setWaveformData(null);
      return;
    }

    let buffer: Tone.ToneAudioBuffer | null = null;

    const loadAudio = async () => {
      try {
        if (currentYouTube) {
          console.log("📺 Generating fake waveform for YouTube video");
          generateFakeWaveform();
        } else if (currentFile && currentFile.type.includes("video") && currentFile.url) {
          // For video files, extract audio using multiple methods
          console.log(
            "🎬 Loading video file for waveform:",
            currentFile.name,
            "Type:",
            currentFile.type
          );
          await loadVideoAudio(currentFile.url);
        } else if (currentFile && currentFile.url) {
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

    const generateFakeWaveform = () => {
      const samples = 2000;
      const fakeData = new Float32Array(samples);

      // Generate a stylized sine wave pattern
      // Looks vaguely audio-like but clearly artificial (not "too real" to avoid misleading)
      for (let i = 0; i < samples; i++) {
        // Main wave with varying frequency to look interesting
        const x = (i / samples) * 100;
        // Combine two sine waves: one fast, one slow, to create a "beating" pattern
        // Amplitude is kept relatively low (0.3) to be unobtrusive
        fakeData[i] = Math.sin(x) * Math.sin(x * 0.1) * 0.3;
      }
      setWaveformData(fakeData);
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

      // Method 3: Use the new fake waveform generator
      console.log("🎵 Using Method 3: Generating placeholder waveform");
      generateFakeWaveform();
      console.log("✅ Placeholder waveform generated for video file");
    };

    loadAudio();

    return () => {
      if (buffer) {
        buffer.dispose();
      }
    };
  }, [currentFile, currentYouTube]);

  // Force update counter for smooth animation
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);

  // Continuous animation loop when playing - ensures smooth waveform scrolling
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying || !showWaveform) {
      // Cancel any pending animation frame when not playing
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Animation loop: continuously trigger canvas redraws while playing
    const animate = () => {
      // Force re-render by incrementing counter
      setForceUpdateCounter((prev) => prev + 1);

      // Request next frame
      if (usePlayerStore.getState().isPlaying) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount or when playing stops
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, showWaveform]);


  // Draw waveform
  useEffect(() => {
    if (!canvasRef.current || !waveformData || !showWaveform) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    const dpr = typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1;
    if (!canvas.clientWidth || !canvas.clientHeight) return;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate visible portion based on zoom
    const visibleDuration = duration > 0 ? duration / waveformZoom : 1;

    let startOffset = 0;
    if (duration > 0) {
      if (isMobile) {
        // Mobile: always center playhead
        startOffset = currentTime - visibleDuration / 2;
      } else {
        // Desktop: independent viewport position
        startOffset = scrollOffset;
      }
    }

    const endOffset = startOffset + visibleDuration;

    // Calculate start and end indices in the waveform data
    let startIndex = 0;
    let endIndex = waveformData.length;

    if (duration > 0) {
      startIndex = Math.floor(
        (startOffset / duration) * waveformData.length
      );
      endIndex = Math.ceil((endOffset / duration) * waveformData.length);
    }

    // Clamp indices
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(waveformData.length, endIndex);

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

    const lanePaddingCss = isMobile ? 8 : 4; // Minimal top padding (ruler removed)
    const laneHeightCss = isMobile ? 24 : 16; // px height per lane (bolder on mobile)
    const laneGapCss = isMobile ? 4 : 3; // px spacing between lanes
    const toCanvasX = (t: number) =>
      ((t - startOffset) / visibleDuration) *
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
      const hitPadY = isMobile ? 12 : 2;
      const hitPadX = isMobile ? 4 : 1;
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

    // Draw temporary drag selection (while dragging)
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);

      // Don't draw if outside visible range completely
      if (!(end < startOffset || start > endOffset)) {
        const x1 = ((start - startOffset) / visibleDuration) * canvas.width;
        const x2 = ((end - startOffset) / visibleDuration) * canvas.width;
        const w = x2 - x1;

        if (w > 0) {
          ctx.fillStyle = "rgba(139, 92, 246, 0.4)"; // Stronger purple for active selection
          ctx.fillRect(x1, 0, w, canvas.height);
        }
      }
    }

    // Draw waveform as bars
    const hasShadowing = shadowingWaveforms.length > 0;
    const mainWaveformHeight = hasShadowing ? canvas.height / 2 : canvas.height;

    ctx.fillStyle = "#8B5CF6"; // Purple

    // Correct slice width calculation based on total valid data vs visible window
    // Do NOT rely on clamped indices for scale, or it stretches at the ends
    const totalSamples = waveformData.length || 1;
    const sampleDuration = duration > 0 ? duration / totalSamples : 1;
    const sliceWidth = (sampleDuration / visibleDuration) * canvas.width;

    // Center point for bars
    const mainCenterY = mainWaveformHeight / 2;
    const amplitudeScale = mainWaveformHeight * 2;

    // Calculate bar dimensions
    const gap = sliceWidth > 4 * dpr ? 1 * dpr : 0;
    const barWidth = Math.max(1 * dpr, sliceWidth - gap);

    for (let i = startIndex; i < endIndex; i++) {
      const timeAtSample = i * sampleDuration;
      const x = ((timeAtSample - startOffset) / visibleDuration) * canvas.width;

      const value = waveformData[i];

      // Ensure even silence has a tiny presence (1px)
      const height = Math.max(1 * dpr, value * amplitudeScale * 0.8);
      const y = mainCenterY - height / 2;

      ctx.fillRect(x, y, barWidth, height);
    }

    // Draw Shadowing Waveforms

    if (hasShadowing || currentRecording) {
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

        ctx.fillStyle = "#10B981"; // Emerald/Green for user audio

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

      // Draw Active Recording
      if (currentRecording && currentRecording.peaks && shadowHeight > 0) {
        ctx.fillStyle = "#EF4444"; // Red for recording
        const startTime = currentRecording.startTime;
        const peaks = currentRecording.peaks;

        // Each peak represents 50ms (0.05s)
        const peakDuration = 0.05;

        peaks.forEach((peak, i) => {
          const time = startTime + i * peakDuration;
          if (time < startOffset || time > endOffset) return;

          const x = ((time - startOffset) / visibleDuration) * canvas.width;
          // Width should cover 50ms gap
          const w = (peakDuration / visibleDuration) * canvas.width;

          const h = Math.max(2 * dpr, peak * shadowHeight * 3.0); // Higher gain for RMS
          const y = shadowCenterY - h / 2;

          ctx.fillRect(x, Math.max(shadowTop, y), Math.max(1 * dpr, w), Math.min(shadowHeight, h));
        });
      }
    }

    // Draw playhead
    const playheadX =
      ((currentTime - startOffset) / visibleDuration) * canvas.width;

    // On mobile, playhead should always be visible (centered)
    // On desktop, it might be out of view if we scroll away (though current logic keeps it in view mostly)
    if (isMobile || (playheadX >= 0 && playheadX <= canvas.width)) {
      // Draw playhead line
      ctx.beginPath();
      ctx.strokeStyle = "#EF4444"; // Red
      ctx.lineWidth = 2 * window.devicePixelRatio;
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, canvas.height);
      ctx.stroke();

      // Draw playhead handle at top (Video editing app style)
      const handleW = 6 * dpr;
      const handleH = 10 * dpr;
      const pointH = 4 * dpr;
      ctx.fillStyle = "#EF4444";
      ctx.beginPath();
      ctx.moveTo(playheadX - handleW, 0);
      ctx.lineTo(playheadX + handleW, 0);
      ctx.lineTo(playheadX + handleW, handleH);
      ctx.lineTo(playheadX, handleH + pointH);
      ctx.lineTo(playheadX - handleW, handleH);
      ctx.closePath();
      ctx.fill();

      // Simple white outline for handle
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1 * dpr;
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
    scrollOffset,
    showWaveform,
    bookmarks,
    selectedBookmarkId,
    shadowingWaveforms,
    currentRecording,
    isDragging,
    dragStart,
    dragEnd,
    isMobile,
    forceUpdateCounter,
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

      if (isMobile) {
        // Mobile: center of screen is currentTime
        const startOffset = currentTime - visibleDuration / 2;
        return startOffset + percentage * visibleDuration;
      }

      // Desktop: uses independent scrollOffset
      return scrollOffset + percentage * visibleDuration;
    },
    [duration, waveformZoom, currentTime, isMobile, scrollOffset]
  );

  // Convert time to canvas position (percentage) - wrapped in useCallback
  const timeToPosition = useCallback(
    (time: number): number => {
      if (!duration) return 0;

      // Calculate visible portion based on zoom
      const visibleDuration = duration / waveformZoom;

      let startOffset: number;
      if (isMobile) {
        startOffset = currentTime - visibleDuration / 2;
      } else {
        startOffset = scrollOffset;
      }

      // If the time is outside the visible range, clamp it
      if (time < startOffset) return -10; // returns off-screen
      if (time > startOffset + visibleDuration) return 110;

      // Calculate the percentage position within the visible window
      return ((time - startOffset) / visibleDuration) * 100;
    },
    [duration, waveformZoom, currentTime, isMobile, scrollOffset]
  );

  // Touch event handlers for mobile devices
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault(); // Prevent default touch behavior

      if (e.touches.length === 1) {
        // Single touch - handle as a potential drag (scrub) or tap
        const touch = e.touches[0];

        setIsDragging(true);
        setTouchStartTime(currentTime); // We use this to calculate delta
        dragStartXRef.current = touch.clientX;

        // Pause playback while scrubbing to prevent fighting updates
        // Store previous state to restore later
        const startWasPlaying = usePlayerStore.getState().isPlaying;
        wasPlayingRef.current = startWasPlaying;

        if (startWasPlaying) {
          setIsPlaying(false);
        }

        // Add seeking class to prevent other components from interfering
        document.body.classList.add("user-seeking");

        // For mobile, we don't start a selection drag immediately like desktop
        // We assume scrubbing first
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
      currentTime,
      waveformZoom,
      setIsDragging,
      setTouchStartTime,
      setPinchStartDistance,
      setPinchStartZoom,
    ]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault(); // Prevent default touch behavior (and let React handle it)

      if (e.touches.length === 1 && isDragging && dragStartXRef.current !== null) {
        // Single touch movement - Scrub/Pan the waveform
        const touch = e.touches[0];
        const deltaX = touch.clientX - dragStartXRef.current;

        if (!canvasRef.current) return;
        const width = canvasRef.current.clientWidth;
        const visibleDuration = duration / waveformZoom;

        // Calculate time delta: moving finger LEFT (negative delta) should move time RIGHT (forward)
        // Wait, standard mobile behavior: drag LEFT -> move to future (waveform moves left)
        // So dragging left (negative px) -> add time.
        const deltaTime = -(deltaX / width) * visibleDuration;

        // Update current time locally for smooth scrubbing
        // We use setTouchStartTime as the base to avoid accumulation errors
        const newTime = Math.max(0, Math.min(duration, (touchStartTime || 0) + deltaTime));
        setCurrentTime(newTime);

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
        const newZoom = Math.min(Math.max(pinchStartZoom * ratio, 1), 50); // Improved max zoom

        setWaveformZoom(newZoom);
      }
    },
    [
      isDragging,
      duration,
      waveformZoom,
      pinchStartDistance,
      pinchStartZoom,
      setWaveformZoom,
      touchStartTime,
      setCurrentTime
    ]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault();

      // Detect tap (short touch with minimal movement) for seek-to-position
      if (e.changedTouches.length === 1 && dragStartXRef.current !== null) {
        const touch = e.changedTouches[0];
        const pixelDist = Math.abs(touch.clientX - dragStartXRef.current);
        if (pixelDist < 5) {
          // Treat as a tap: seek to the tapped position
          const time = positionToTime(touch.clientX);
          if (time >= 0 && time <= duration) {
            // Check if tap is within a bookmark lane
            const rect = containerRef.current?.getBoundingClientRect();
            const xCss = rect ? touch.clientX - rect.left : 0;
            const yCss = rect ? touch.clientY - rect.top : 0;
            const laneHit = laneRectsRef.current.find(
              (r) => xCss >= r.x1 && xCss <= r.x2 && yCss >= r.y1 && yCss <= r.y2
            );
            if (laneHit) {
              const bm = bookmarks?.find((b) => b.id === laneHit.id);
              if (bm) {
                loadBookmark(bm.id);
                setCurrentTime(bm.start);
                setIsPlaying(true);
              }
            } else {
              // Seek to tapped position
              setCurrentTime(time);
              // If loop is active and tap is outside loop, disable looping
              if (isLooping && loopStart !== null && loopEnd !== null) {
                if (time < loopStart || time > loopEnd) {
                  setIsLooping(false);
                }
              }
            }
          }
        }
      }

      // Reset pinch zoom state
      setPinchStartDistance(null);

      // Reset drag state
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      setTouchStartTime(null);
      setHoverTime(null);
      dragStartXRef.current = null;

      // Remove seeking class
      document.body.classList.remove("user-seeking");

      // Restore playback state if it was playing
      if (wasPlayingRef.current) {
        setIsPlaying(true);
        wasPlayingRef.current = false;
      }
    },
    [
      setIsPlaying,
      setIsDragging,
      setDragStart,
      setDragEnd,
      setTouchStartTime,
      setHoverTime,
      setPinchStartDistance,
      positionToTime,
      duration,
      bookmarks,
      loadBookmark,
      setCurrentTime,
      isLooping,
      loopStart,
      loopEnd,
      setIsLooping,
    ]
  );

  const hasMedia = currentFile?.url || currentYouTube?.id;
  if (!showWaveform || !hasMedia) {
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

  // Desktop auto-follow: keep playhead visible during playback
  useEffect(() => {
    if (isMobile || !isPlaying || !duration) return;
    const visibleDuration = duration / waveformZoom;
    const playheadPos = (currentTime - scrollOffset) / visibleDuration; // 0..1 within viewport

    // When playhead exits 5%..85% band, re-center viewport
    if (playheadPos > 0.85 || playheadPos < 0.05) {
      setScrollOffset(Math.max(0, Math.min(duration - visibleDuration, currentTime - visibleDuration * 0.15)));
    }
  }, [isMobile, isPlaying, currentTime, duration, waveformZoom, scrollOffset]);

  // Ensure wheel/touch listeners are non-passive so preventDefault works on all browsers
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      ev.stopPropagation();

      const state = usePlayerStore.getState();
      const dur = state.duration;
      const zoom = state.waveformZoom;

      if (ev.ctrlKey || ev.metaKey) {
        // Ctrl/Cmd + scroll = zoom
        const delta = ev.deltaY;
        const nextZoom = delta < 0
          ? Math.min(zoom * 1.15, 50)
          : Math.max(zoom / 1.15, 1);
        setWaveformZoom(nextZoom);

        // Re-center viewport around the zoom point
        if (dur > 0) {
          const visibleBefore = dur / zoom;
          const visibleAfter = dur / nextZoom;
          const rect = el.getBoundingClientRect();
          const mousePercent = (ev.clientX - rect.left) / rect.width;
          const mouseTime = scrollOffset + mousePercent * visibleBefore;
          setScrollOffset(Math.max(0, Math.min(dur - visibleAfter, mouseTime - mousePercent * visibleAfter)));
        }
      } else {
        // Plain scroll = horizontal pan
        if (dur > 0) {
          const visibleDuration = dur / zoom;
          const panAmount = (ev.deltaY / el.clientWidth) * visibleDuration * 2;
          setScrollOffset((prev: number) => Math.max(0, Math.min(dur - visibleDuration, prev + panAmount)));
        }
      }
    };

    const onTouchMove = (ev: TouchEvent) => {
      // When interacting inside the waveform, prevent the page from scrolling
      if (ev.touches.length >= 1) {
        ev.preventDefault();
        // Do NOT stop propagation here - let it bubble to React's onTouchMove
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel as EventListener);
      el.removeEventListener("touchmove", onTouchMove as EventListener);
    };
  }, [setWaveformZoom, scrollOffset]);


  // Handle mouse down for range selection, bookmark resizing, or Alt+pan
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (overlapMenu) setOverlapMenu(null);
    if (!canvasRef.current) return;

    // Only handle left mouse button
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

    // Alt + drag = pan viewport
    if (e.altKey) {
      setIsPanning(true);
      dragStartXRef.current = e.clientX;
      panStartScrollRef.current = scrollOffset;
      return;
    }

    // Normal drag = range selection for loop points
    const time = positionToTime(e.clientX);
    if (time >= 0 && time <= duration) {
      setIsDragging(true);
      setDragStart(time);
      setDragEnd(null);
      dragStartXRef.current = e.clientX;
    }
  };

  // Handle mouse move during range selection, resizing, or panning
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;

    const rect = containerRef.current?.getBoundingClientRect();
    const xCss = rect ? e.clientX - rect.left : 0;
    const yCss = rect ? e.clientY - rect.top : 0;
    const HANDLE_WIDTH = 8;

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

    // Handle Alt+drag viewport panning
    if (isPanning && dragStartXRef.current !== null) {
      const width = canvasRef.current.clientWidth;
      const visibleDuration = duration / waveformZoom;
      const deltaX = e.clientX - dragStartXRef.current;
      const deltaTime = -(deltaX / width) * visibleDuration;
      setScrollOffset(Math.max(0, Math.min(duration - visibleDuration, panStartScrollRef.current + deltaTime)));
      if (containerRef.current) containerRef.current.style.cursor = "grabbing";
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

      // Update end position if range-dragging (not resizing)
      if (isDragging && dragStart !== null) {
        setDragEnd(time);
      }
    } else {
      setHoverTime(null);
    }
  };

  // Handle mouse up to finalize range selection or panning
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (resizingBookmark) {
      setResizingBookmark(null);
      // Keep resizingRef true slightly longer to prevent click handling
      setTimeout(() => resizingRef.current = false, 50);
      return;
    }

    // Finalize Alt+drag pan
    if (isPanning) {
      setIsPanning(false);
      dragStartXRef.current = null;
      return;
    }

    if (!isDragging || dragStart === null) return;

    const time = positionToTime(e.clientX);
    // Use pixel distance for threshold to avoid false positives
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

    // Cancel dragging/panning if mouse leaves the component
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      dragStartXRef.current = null;
    }
    if (isPanning) {
      setIsPanning(false);
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
    if (!canvasRef.current || isDragging || resizingRef.current || isPanning) return;

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

      // Seek to the clicked time
      setCurrentTime(time);

      // Desktop: auto-adjust viewport if click target is outside current view
      if (!isMobile) {
        const visibleDuration = duration / waveformZoom;
        const relPos = (time - scrollOffset) / visibleDuration;
        if (relPos < 0 || relPos > 1) {
          // Target is outside visible range — center viewport on it
          setScrollOffset(Math.max(0, Math.min(duration - visibleDuration, time - visibleDuration / 2)));
        }
      }

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
    <>
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
          className={`${isMobile ? "h-56" : "h-40 sm:h-48 lg:h-56"
            } overflow-hidden relative touch-none select-none`}
          style={{ touchAction: "none" }}
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

          <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />

          {/* Media Volume Control - overlaid on top-left of media waveform lane */}
          {showWaveform && (
            <div
              className={`absolute left-2 z-10 group/vol flex items-center bg-black/60 backdrop-blur-md border border-white/20 rounded-full h-8 pointer-events-auto transition-all duration-200 -translate-y-1/2 ${shadowingWaveforms.length > 0 ? "top-[25%]" : "top-1/2"} ${isMobile ? "opacity-100" : ""}`}
              onMouseDown={stopPropagation}
              onClick={stopPropagation}
              onTouchStart={stopPropagation}
              onPointerDown={stopPropagation}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (mediaVolume === 0) {
                    if (previousMediaVolume !== undefined && previousMediaVolume > 0) {
                      setMediaVolume(previousMediaVolume);
                    } else {
                      setMediaVolume(1);
                    }
                  } else {
                    setPreviousMediaVolume(mediaVolume);
                    setMediaVolume(0);
                  }
                }}
                className="h-full px-2.5 text-white/70 hover:text-white transition-colors"
                title="Media Volume"
              >
                {(mediaVolume === 0 || muted) ? <VolumeX size={isMobile ? 16 : 14} /> : <Volume2 size={isMobile ? 16 : 14} />}
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${isMobile ? "max-w-[120px]" : "max-w-0 group-hover/vol:max-w-[100px]"}`}>
                <div className={`${isMobile ? "w-[100px]" : "w-24"} pr-4`}>
                  <Slider
                    value={[muted ? 0 : mediaVolume]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={(v) => {
                      setMediaVolume(v[0]);
                      if (v[0] > 0 && muted) {
                        toggleMute();
                      }
                    }}
                    className="cursor-pointer"
                    thumbClassName="!h-3.5 !w-3.5 !border-0 !bg-white !shadow-[0_0_6px_rgba(255,255,255,0.6)]"
                    trackClassName="!h-1 !bg-white/20"
                    rangeClassName="!bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* REC Volume Control - overlaid on left of shadowing waveform lane (bottom half) */}
          {showWaveform && shadowingWaveforms.length > 0 && (
            <div
              className={`absolute left-2 top-[75%] -translate-y-1/2 z-10 group/svol flex items-center bg-black/60 backdrop-blur-md border border-white/20 rounded-full h-8 pointer-events-auto transition-all duration-200 ${isMobile ? "opacity-100" : ""}`}
              onMouseDown={stopPropagation}
              onClick={stopPropagation}
              onTouchStart={stopPropagation}
              onPointerDown={stopPropagation}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (shadowMuted) {
                    const previousVolume = useShadowingStore.getState().previousShadowVolume;
                    if (previousVolume !== undefined && previousVolume > 0) {
                      setShadowVolume(previousVolume);
                    } else {
                      setShadowVolume(1);
                    }
                    setShadowMuted(false);
                  } else {
                    useShadowingStore.getState().setPreviousShadowVolume(shadowVolume);
                    setShadowVolume(0);
                    setShadowMuted(true);
                  }
                }}
                className="h-full px-2.5 text-white/70 hover:text-white transition-colors"
                title="Recording Volume"
              >
                {(shadowMuted || shadowVolume === 0 || muted) ? <VolumeX size={isMobile ? 16 : 14} /> : <Volume2 size={isMobile ? 16 : 14} />}
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${isMobile ? "max-w-[120px]" : "max-w-0 group-hover/svol:max-w-[100px]"}`}>
                <div className={`${isMobile ? "w-[100px]" : "w-24"} pr-4`}>
                  <Slider
                    value={[(shadowMuted || muted) ? 0 : shadowVolume]}
                    min={0}
                    max={1}
                    step={0.1}
                    onValueChange={(v) => {
                      setShadowVolume(v[0]);
                      if (v[0] > 0) {
                        if (shadowMuted) setShadowMuted(false);
                        if (muted) toggleMute();
                      }
                    }}
                    className="cursor-pointer"
                    thumbClassName="!h-3.5 !w-3.5 !border-0 !bg-white !shadow-[0_0_6px_rgba(255,255,255,0.6)]"
                    trackClassName="!h-1 !bg-white/20"
                    rangeClassName="!bg-white"
                  />
                </div>
              </div>
            </div>
          )}

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

          {/* YouTube Waveform Notice */}
          {currentYouTube && !isYoutubeNoticeDismissed && (
            <div className="absolute top-2 right-2 z-20 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded border border-white/10 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="text-white/80 text-xs font-medium">
                {t("waveform.youtubePlaceholder")}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsYoutubeNoticeDismissed(true);
                }}
                className="p-0.5 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            </div>
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
              onTouchStart={stopPropagation}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Playhead time code - Video editing app style, moved to bottom */}
          <div
            className={`absolute bottom-0 mb-1 bg-red-600 text-white font-mono font-bold px-2 py-0.5 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.4)] pointer-events-none z-[25] ${isMobile ? "text-[11px]" : "text-[10px]"
              } border border-red-500/20`}
            style={{
              left: `${timeToPosition(currentTime)}%`,
              transform: "translateX(-50%)",
            }}
          >
            {formatTime(currentTime)}
            {/* Tip pointer at bottom pointing UP */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-red-600"></div>
          </div>

          {/* Delete Recording Button - Grid layout: Top Right of bottom (shadowing) lane */}
          {shadowingWaveforms.length > 0 && (
            <div
              className="absolute right-2 z-30 top-[calc(50%+8px)] transition-all duration-200"
              onMouseDown={stopPropagation}
              onClick={stopPropagation}
            >
              {!isConfirmingDelete ? (
                <button
                  className="bg-gray-900/30 text-white/40 border border-white/5 hover:bg-red-900/40 hover:text-red-200 hover:border-red-500/30 p-1.5 rounded-md backdrop-blur-md transition-all shadow-sm"
                  onClick={() => setIsConfirmingDelete(true)}
                  title="Delete All Recordings"
                >
                  <Trash2 size={14} />
                </button>
              ) : (
                <div className="flex items-center bg-red-600 text-white rounded-md shadow-lg border border-red-500 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-700 transition-colors border-r border-red-500"
                    onClick={async () => {
                      if (mediaId) {
                        await useShadowingStore.getState().deleteAllSegments(mediaId);
                        toast.success("Recordings deleted");
                      }
                      setIsConfirmingDelete(false);
                    }}
                  >
                    <Trash2 size={13} />
                    <span className="text-xs font-bold leading-none">Delete</span>
                  </button>
                  <button
                    className="p-1.5 hover:bg-red-700 transition-colors flex items-center justify-center"
                    onClick={() => setIsConfirmingDelete(false)}
                    title="Cancel"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer bar: Loop controls + Volume controls */}
        <div
          className={`flex ${isMobile ? "flex-col" : "items-center justify-between"
            } p-1 bg-gray-900/50`}
          onMouseDown={stopPropagation}
          onClick={stopPropagation}
          onTouchStart={stopPropagation}
        >
          {/* Left side: Loop info */}
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


      </div>

      {/* Toolbar Float - moved outside and below the waveform box */}
      <div className="flex justify-center mt-2 px-1 relative z-10">
        <div
          className={`flex items-center gap-1 bg-gray-900/60 backdrop-blur rounded-full ring-1 ring-white/10 shadow-md px-1.5 py-1`}
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
      </div>
    </>
  );
};
