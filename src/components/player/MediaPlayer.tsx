import { useRef, useEffect, useState, useCallback } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { toast } from "react-hot-toast";
import { Play, Pause } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

interface MediaPlayerProps {
  hiddenMode?: boolean;
}

export const MediaPlayer = ({ hiddenMode = false }: MediaPlayerProps) => {
  // Get showWaveform state to adjust player height
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localPlayState, setLocalPlayState] = useState(false);

  const isDelayingRef = useRef(false);
  // Track pending play intent so we can start playback once the element is ready
  const pendingPlayRef = useRef(false);
  const lastReportedTimeRef = useRef(0);
  const resolvingInfiniteDurationRef = useRef(false);

  const {
    currentFile,
    isPlaying,
    currentTime,
    volume: masterVolume,
    mediaVolume,
    muted: masterMuted,
    playbackRate,
    loopStart,
    loopEnd,
    isLooping,
    showWaveform,
    setCurrentTime,
    setDuration,
    setIsPlaying,
  } = usePlayerStore(
    useShallow((state) => ({
      currentFile: state.currentFile,
      isPlaying: state.isPlaying,
      currentTime: state.currentTime,
      volume: state.volume,
      mediaVolume: state.mediaVolume,
      muted: state.muted,
      playbackRate: state.playbackRate,
      loopStart: state.loopStart,
      loopEnd: state.loopEnd,
      isLooping: state.isLooping,
      showWaveform: state.showWaveform,
      setCurrentTime: state.setCurrentTime,
      setDuration: state.setDuration,
      setIsPlaying: state.setIsPlaying,
    }))
  );

  // Keep local state in sync with global state
  useEffect(() => {
    setLocalPlayState(isPlaying);
  }, [isPlaying]);

  // Helper to safely play a media element
  const safePlay = useCallback(
    (mediaElement: HTMLMediaElement) => {
      // readyState >= 2 (HAVE_CURRENT_DATA) means enough data to play
      if (mediaElement.readyState >= 2) {
        mediaElement.play().catch((err) => {
          console.error("Error playing media:", err);
          toast.error(
            "Error playing media. The file may be corrupted or not supported."
          );
          setIsPlaying(false);
        });
      } else {
        // Not ready yet – mark as pending and wait for canplay
        pendingPlayRef.current = true;
      }
    },
    [setIsPlaying]
  );

  // Reset pending play when the media source changes
  useEffect(() => {
    pendingPlayRef.current = false;
    resolvingInfiniteDurationRef.current = false;
  }, [currentFile?.url]);

  // Listen for canplay to know when the element is ready
  useEffect(() => {
    const mediaElement = currentFile?.type.includes("video")
      ? videoRef.current
      : audioRef.current;
    if (!mediaElement) return;

    const handleCanPlay = () => {
      // If a play was requested while we were loading, start now
      if (pendingPlayRef.current) {
        pendingPlayRef.current = false;
        mediaElement.play().catch((err) => {
          console.error("Error playing media after canplay:", err);
          setIsPlaying(false);
        });
      }
    };

    mediaElement.addEventListener("canplay", handleCanPlay);
    // If it's already ready (cached / fast load), handle pending play immediately
    if (mediaElement.readyState >= 2) {
      handleCanPlay();
    }
    return () => {
      mediaElement.removeEventListener("canplay", handleCanPlay);
    };
  }, [currentFile, setIsPlaying]);

  // Pause playback when the component unmounts only if media has been cleared.
  // During navigation (settings → player), currentFile stays set so we preserve playback.
  useEffect(() => {
    return () => {
      const { isPlaying: stillPlaying, currentFile: fileAtUnmount } =
        usePlayerStore.getState();
      if (stillPlaying && !fileAtUnmount) {
        usePlayerStore.getState().setIsPlaying(false);
      }
    };
  }, []);

  // Handle play/pause
  useEffect(() => {
    const mediaElement = currentFile?.type.includes("video")
      ? videoRef.current
      : audioRef.current;
    if (!mediaElement) return;

    if (isPlaying) {
      if (isDelayingRef.current) return; // Don't interfere if delaying
      safePlay(mediaElement);
    } else {
      pendingPlayRef.current = false;
      mediaElement.pause();
    }
  }, [isPlaying, currentFile, setIsPlaying, safePlay]);

  // Keep the global playback state aligned with actual media element state.
  // This is required for features like shadowing recording that react to store playback.
  useEffect(() => {
    const mediaElement = currentFile?.type.includes("video")
      ? videoRef.current
      : audioRef.current;
    if (!mediaElement) return;

    const handlePlay = () => {
      if (!usePlayerStore.getState().isPlaying) {
        setIsPlaying(true);
      }
    };

    const handlePause = () => {
      if (isDelayingRef.current || mediaElement.ended) return;
      if (usePlayerStore.getState().isPlaying) {
        setIsPlaying(false);
      }
    };

    mediaElement.addEventListener("play", handlePlay);
    mediaElement.addEventListener("pause", handlePause);

    return () => {
      mediaElement.removeEventListener("play", handlePlay);
      mediaElement.removeEventListener("pause", handlePause);
    };
  }, [currentFile, setIsPlaying]);

  // Handle volume changes
  useEffect(() => {
    const mediaElement = currentFile?.type.includes("video")
      ? videoRef.current
      : audioRef.current;
    if (!mediaElement) return;

    // Calculate effective volume
    const effectiveVolume = masterMuted ? 0 : (masterVolume * mediaVolume);
    mediaElement.volume = effectiveVolume;
  }, [masterVolume, mediaVolume, masterMuted, currentFile]);

  // Handle playback rate changes
  useEffect(() => {
    const mediaElement = currentFile?.type.includes("video")
      ? videoRef.current
      : audioRef.current;
    if (!mediaElement) return;

    mediaElement.playbackRate = playbackRate;
  }, [playbackRate, currentFile]);

  // Handle manual seeking when UI slider is moved
  useEffect(() => {
    if (!currentFile) return;

    const mediaElement = currentFile.type.includes("video")
      ? videoRef.current
      : audioRef.current;
    if (!mediaElement) return;

    // Add listener for manual seeking from UI controls
    const handleUserSeeking = () => {
      if (document.body.classList.contains("user-seeking")) {
        // Cancel any active delay
        isDelayingRef.current = false;

        // Update the media element's time to the current value from the store
        const storeTime = usePlayerStore.getState().currentTime;
        mediaElement.currentTime = storeTime;

        // For mobile devices, ensure play state is maintained
        if (isPlaying && mediaElement.paused) {
          mediaElement.play().catch((error) => {
            console.error("Error playing after seek:", error);
          });
        }
      }
    };

    // Create a direct subscription to time changes for more responsive mobile seeking
    const unsubscribe = usePlayerStore.subscribe((state) => {
      const newTime = state.currentTime;
      if (document.body.classList.contains("user-seeking")) {
        if (Math.abs(mediaElement.currentTime - newTime) > 0.5) {
          mediaElement.currentTime = newTime;
        }
      }
    });

    // Listen for manual seek class changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          handleUserSeeking();
        }
      });
    });

    observer.observe(document.body, { attributes: true });

    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, [currentFile, isPlaying]);

  // Handle A-B loop
  useEffect(() => {
    const mediaElement = currentFile?.type.includes("video")
      ? videoRef.current
      : audioRef.current;
    if (!mediaElement) return;

    const handleTimeUpdate = () => {
      const currentTimeValue = mediaElement.currentTime;
      if (Math.abs(currentTimeValue - lastReportedTimeRef.current) >= 0.05) {
        lastReportedTimeRef.current = currentTimeValue;
        setCurrentTime(currentTimeValue);
      }

      // Handle A-B looping
      if (isLooping && loopStart !== null && loopEnd !== null) {
        const startBuffer = 0.02; // 20ms buffer for start boundary only

        // Only jump back when we actually exceed the end time
        // Use a small tolerance to account for timing precision
        if (currentTimeValue >= loopEnd + 0.005) {
          if (isDelayingRef.current) return;

          const state = usePlayerStore.getState();
          const {
            autoAdvanceBookmarks, selectedBookmarkId, getCurrentMediaBookmarks, loadBookmark,
            maxLoops, loopCount, setLoopCount, setIsLooping, loopDelay
          } = state;

          // Increment loop counter
          const nextCount = (loopCount || 0) + 1;
          setLoopCount(nextCount);

          // Check if we reached max loops
          const isDone = maxLoops > 0 && nextCount >= maxLoops;

          if (isDone) {
            // If auto-advance enabled, move to next bookmark
            if (autoAdvanceBookmarks && selectedBookmarkId) {
              const list = (getCurrentMediaBookmarks?.() || []).slice().sort((a, b) => a.start - b.start);
              const idx = list.findIndex((b) => b.id === selectedBookmarkId);
              if (list.length > 0) {
                const next = list[(idx + 1 + list.length) % list.length];
                if (next) {
                  loadBookmark?.(next.id);
                  mediaElement.currentTime = next.start;
                  return;
                }
              }
            }
            // Otherwise just stop looping and continue playing linear
            setIsLooping(false);
            return;
          }

          // Continue looping (infinite or not yet reached max)
          // Handle delay if set
          if (loopDelay > 0) {
            isDelayingRef.current = true;
            mediaElement.pause();

            setTimeout(() => {
              // Valid check: ensuring we are still meant to loop
              const currentState = usePlayerStore.getState();
              if (currentState.isLooping && currentState.loopStart !== null) {
                mediaElement.currentTime = currentState.loopStart;
                mediaElement.play().catch(e => console.error("Play after gap failed", e));
              }
              isDelayingRef.current = false;
            }, loopDelay * 1000);
            return;
          }

          mediaElement.currentTime = loopStart;
          // keep looping current A-B by default
        } else if (
          currentTimeValue < loopStart - startBuffer &&
          currentTimeValue > 0
        ) {
          // If somehow we're before the start point (e.g., user dragged the slider)
          // Don't jump if delaying or seeking
          if (!isDelayingRef.current && !document.body.classList.contains("user-seeking")) {
            mediaElement.currentTime = loopStart;
            console.log("Loop: Jumping to start point", loopStart);
          }
        }
      }
    };

    // Also keep the timeupdate event for standard time tracking
    mediaElement.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      mediaElement.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [currentFile, isLooping, loopStart, loopEnd, setCurrentTime]);

  // Add a listener for seeking to handle manual seeking
  useEffect(() => {
    const mediaElement = currentFile?.type.includes("video")
      ? videoRef.current
      : audioRef.current;
    if (!mediaElement) return;

    // Create a variable to track the last time we showed a toast
    const handleSeeking = () => {
      // When user manually seeks, check if we need to enforce loop boundaries
      if (isLooping && loopStart !== null && loopEnd !== null) {
        const currentTimeValue = mediaElement.currentTime;

        if (currentTimeValue < loopStart) {
          mediaElement.currentTime = loopStart;
        } else if (currentTimeValue > loopEnd) {
          mediaElement.currentTime = loopStart;
        }
      }
    };

    mediaElement.addEventListener("seeking", handleSeeking);

    return () => {
      mediaElement.removeEventListener("seeking", handleSeeking);
    };
  }, [currentFile, isLooping, loopStart, loopEnd]);

  // Handle seeking from the store (for rewind/fast forward buttons)
  useEffect(() => {
    const mediaElement = currentFile?.type.includes("video")
      ? videoRef.current
      : audioRef.current;
    if (!mediaElement) return;

    // Only update if the difference is significant (to avoid feedback loops)
    // and if we're not already seeking through the media element itself
    if (
      !mediaElement.seeking &&
      Math.abs(mediaElement.currentTime - currentTime) > 0.5
    ) {
      mediaElement.currentTime = currentTime;
    }
  }, [currentFile, currentTime]);

  // Handle media metadata loaded
  const commitDuration = useCallback(
    (mediaElement: HTMLMediaElement) => {
      const nextDuration = mediaElement.duration;
      if (Number.isFinite(nextDuration) && nextDuration >= 0) {
        resolvingInfiniteDurationRef.current = false;
        setDuration(nextDuration);
        return true;
      }

      setDuration(0);
      return false;
    },
    [setDuration]
  );

  const resolveInfiniteDuration = useCallback(
    (mediaElement: HTMLMediaElement) => {
      if (
        resolvingInfiniteDurationRef.current ||
        Number.isFinite(mediaElement.duration) ||
        mediaElement.readyState === 0
      ) {
        return;
      }

      resolvingInfiniteDurationRef.current = true;
      const originalTime = mediaElement.currentTime;

      const finalize = () => {
        mediaElement.currentTime = originalTime;
        commitDuration(mediaElement);
      };

      const handleTimeUpdate = () => {
        mediaElement.removeEventListener("timeupdate", handleTimeUpdate);
        finalize();
      };

      mediaElement.addEventListener("timeupdate", handleTimeUpdate, {
        once: true,
      });

      try {
        mediaElement.currentTime = Number.MAX_SAFE_INTEGER;
      } catch (error) {
        console.warn("Failed to resolve media duration from metadata:", error);
        resolvingInfiniteDurationRef.current = false;
      }
    },
    [commitDuration]
  );

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    console.log("Media metadata loaded:", {
      duration: e.currentTarget.duration,
      src: e.currentTarget.src,
      readyState: e.currentTarget.readyState,
    });
    if (!commitDuration(e.currentTarget)) {
      resolveInfiniteDuration(e.currentTarget);
    }
  };

  const handleDurationChange = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    commitDuration(e.currentTarget);
  };

  // Handle media ended
  const handleEnded = () => {
    console.log("Media playback ended");
    const state = usePlayerStore.getState();

    // If looping is enabled but no A-B region is set (or the region covers
    // the whole track), restart from the beginning instead of stopping.
    if (state.isLooping) {
      const mediaElement = currentFile?.type.includes("video")
        ? videoRef.current
        : audioRef.current;
      if (mediaElement) {
        const restartTime = state.loopStart ?? 0;
        mediaElement.currentTime = restartTime;
        setCurrentTime(restartTime);
        mediaElement.play().catch((err: Error) => {
          console.error("Error restarting looped playback:", err);
        });
        return;
      }
    }

    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Handle media loading errors
  const handleError = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    console.error("Media loading error:", e.currentTarget.error);
    toast.error(
      "Failed to load media. The file may be corrupted or not supported."
    );
  };

  if (!currentFile) return null;

  // If in hidden mode, only render the media elements without UI
  if (hiddenMode) {
    return (
      <div className="sr-only" aria-hidden="true">
        {currentFile.type.includes("video") ? (
          <video
            ref={videoRef}
            src={currentFile.url}
            onLoadedMetadata={handleLoadedMetadata}
            onDurationChange={handleDurationChange}
            onEnded={handleEnded}
            onError={handleError}
            controls
            preload="metadata"
          />
        ) : (
          <audio
            ref={audioRef}
            src={currentFile.url}
            onLoadedMetadata={handleLoadedMetadata}
            onDurationChange={handleDurationChange}
            onEnded={handleEnded}
            onError={handleError}
          />
        )}
      </div>
    );
  }

  // Normal visible mode
  return (
    <div className="relative">
      {currentFile.type.includes("video") ? (
        <video
          ref={videoRef}
          src={currentFile.url}
          className="w-full h-auto max-h-[calc(100vh-220px)] sm:max-h-[calc(100vh-200px)] rounded-lg shadow-lg"
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleDurationChange}
          onEnded={handleEnded}
          onError={handleError}
          controls
          preload="metadata"
        />
      ) : (
        <>
          <audio
            ref={audioRef}
            src={currentFile.url}
            onLoadedMetadata={handleLoadedMetadata}
            onDurationChange={handleDurationChange}
            onEnded={handleEnded}
            onError={handleError}
          />
          <div
            className="w-full rounded-lg flex items-center justify-center relative"
            style={{
              // Compact but not cramped: keep a sensible minimum using clamp
              height: showWaveform
                ? "clamp(240px, calc(100vh - 420px), 300px)"
                : "clamp(220px, calc(100vh - 300px), 280px)",
              maxHeight: "300px",
              transition: "height 0.3s ease-in-out", // Smooth transition
            }}
          >
            {/* Improved background with subtler gradient */}
            <div
              className="absolute inset-0 bg-cover bg-center z-0"
              style={{
                backgroundImage: 'url("/audio-background.svg")',
                backgroundSize: "cover",
                opacity: 0.8,
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-gray-900/60 z-10"></div>

            {/* Enhanced Audio file info with quick controls */}
            <div className="z-20 text-center p-4 sm:p-6 md:p-8 bg-white/15 backdrop-blur-md rounded-xl shadow-lg border border-white/20 max-w-md w-full mx-3 sm:mx-0">
              <div className="flex flex-col sm:flex-row items-center justify-center mb-3 sm:mb-6 gap-3 sm:gap-0">
                <div
                  className="w-20 h-20 sm:w-24 md:w-28 sm:h-24 md:h-28 rounded-full bg-purple-600 flex items-center justify-center shadow-xl sm:mr-6"
                  onClick={() => {
                    setIsPlaying(!isPlaying);
                    setLocalPlayState(!localPlayState);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {localPlayState ? (
                    <Pause className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white" />
                  ) : (
                    <Play className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white ml-1 sm:ml-2" />
                  )}
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2 truncate max-w-full sm:max-w-[200px]">
                    {currentFile.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/90 font-medium">
                    Audio Track
                  </p>
                  <div className="mt-1 sm:mt-2 text-white/70 text-xs hidden sm:block">
                    Click the circle to play/pause
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
