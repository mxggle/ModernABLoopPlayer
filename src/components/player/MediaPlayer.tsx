import { useRef, useEffect, useState } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { toast } from "react-hot-toast";
import { Play, Pause } from "lucide-react";

export const MediaPlayer = () => {
  // Get showWaveform state to adjust player height
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localPlayState, setLocalPlayState] = useState(false);

  const {
    currentFile,
    isPlaying,
    volume,
    playbackRate,
    loopStart,
    loopEnd,
    isLooping,
    showWaveform,
    setCurrentTime,
    setDuration,
    setIsPlaying,
  } = usePlayerStore();

  // Keep local state in sync with global state
  useEffect(() => {
    setLocalPlayState(isPlaying);
  }, [isPlaying]);

  // Handle play/pause
  useEffect(() => {
    const mediaElement = currentFile?.type.includes("video")
      ? videoRef.current
      : audioRef.current;
    if (!mediaElement) return;

    if (isPlaying) {
      mediaElement.play().catch((err) => {
        console.error("Error playing media:", err);
        setIsPlaying(false);
      });
    } else {
      mediaElement.pause();
    }
  }, [isPlaying, currentFile, setIsPlaying]);

  // Handle volume changes
  useEffect(() => {
    const mediaElement = currentFile?.type.includes("video")
      ? videoRef.current
      : audioRef.current;
    if (!mediaElement) return;

    mediaElement.volume = volume;
  }, [volume, currentFile]);

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
        // Update the media element's time to the current value from the store
        const storeTime = usePlayerStore.getState().currentTime;
        mediaElement.currentTime = storeTime;
      }
    };

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
    };
  }, [currentFile]);

  // Handle A-B loop
  useEffect(() => {
    const mediaElement = currentFile?.type.includes("video")
      ? videoRef.current
      : audioRef.current;
    if (!mediaElement) return;

    const handleTimeUpdate = () => {
      const currentTimeValue = mediaElement.currentTime;
      setCurrentTime(currentTimeValue);

      // Handle A-B looping
      if (isLooping && loopStart !== null && loopEnd !== null) {
        // Add a small buffer to prevent edge case issues
        const buffer = 0.1;

        if (currentTimeValue >= loopEnd - buffer) {
          // When we reach the end point, jump back to start
          mediaElement.currentTime = loopStart;
          console.log("Loop: Jumping back to start point", loopStart);
        } else if (
          currentTimeValue < loopStart - buffer &&
          currentTimeValue > 0
        ) {
          // If somehow we're before the start point (e.g., user dragged the slider)
          mediaElement.currentTime = loopStart;
          console.log("Loop: Jumping to start point", loopStart);
        }
      }
    };

    // Use more frequent checking for more precise looping
    const checkInterval = setInterval(handleTimeUpdate, 50);

    // Also keep the timeupdate event for standard time tracking
    mediaElement.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      clearInterval(checkInterval);
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
    let lastToastTime = 0;
    const toastCooldown = 2000; // 2 seconds cooldown between toasts

    const handleSeeking = () => {
      // When user manually seeks, check if we need to enforce loop boundaries
      if (isLooping && loopStart !== null && loopEnd !== null) {
        const currentTimeValue = mediaElement.currentTime;
        const now = Date.now();

        if (currentTimeValue < loopStart) {
          mediaElement.currentTime = loopStart;

          // Only show toast if enough time has passed since the last one
          if (now - lastToastTime > toastCooldown) {
            toast("Staying within loop bounds", {
              duration: 1000,
              icon: "ℹ️",
              id: "loop-bounds-toast",
            });
            lastToastTime = now;
          }
        } else if (currentTimeValue > loopEnd) {
          mediaElement.currentTime = loopStart;

          // Only show toast if enough time has passed since the last one
          if (now - lastToastTime > toastCooldown) {
            toast("Returning to loop start", {
              duration: 1000,
              icon: "ℹ️",
              id: "loop-start-toast",
            });
            lastToastTime = now;
          }
        }
      }
    };

    mediaElement.addEventListener("seeking", handleSeeking);

    return () => {
      mediaElement.removeEventListener("seeking", handleSeeking);
    };
  }, [currentFile, isLooping, loopStart, loopEnd]);

  // Handle media metadata loaded
  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    setDuration(e.currentTarget.duration);
  };

  // Handle media ended
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  if (!currentFile) return null;

  return (
    <div className="relative">
      {currentFile.type.includes("video") ? (
        <video
          ref={videoRef}
          src={currentFile.url}
          className="w-full h-auto max-h-[calc(100vh-220px)] sm:max-h-[calc(100vh-200px)] rounded-lg shadow-lg"
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      ) : (
        <>
          <audio
            ref={audioRef}
            src={currentFile.url}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
          />
          <div
            className="w-full rounded-lg flex items-center justify-center overflow-hidden relative"
            style={{
              height: showWaveform
                ? "calc(100vh - 400px)"
                : "min(calc(100vh - 250px), 300px)", // Responsive height
              maxHeight: "350px",
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
