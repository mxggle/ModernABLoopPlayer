import { useState, useEffect, useRef } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { toast } from "react-hot-toast";

// Define YouTube player interface
interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  getPlayerState: () => number;
  destroy: () => void;
}

interface YTEvent {
  target: YTPlayer;
  data?: number;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: {
            autoplay?: number;
            controls?: number;
            disablekb?: number;
            enablejsapi?: number;
            modestbranding?: number;
            rel?: number;
          };
          events?: {
            onReady?: (event: YTEvent) => void;
            onStateChange?: (event: YTEvent) => void;
            onError?: (event: YTEvent) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
}

export const YouTubePlayer = ({ videoId }: YouTubePlayerProps) => {
  const [player, setPlayer] = useState<YTPlayer | null>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const lastSeekTime = useRef<number>(0);

  const {
    isPlaying,
    volume,
    playbackRate,
    loopStart,
    loopEnd,
    isLooping,
    currentTime,
    setCurrentTime,
    setDuration,
    setIsPlaying,
  } = usePlayerStore();

  // Load YouTube API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";

      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setApiLoaded(true);
      };
    } else {
      setApiLoaded(true);
    }

    return () => {
      window.onYouTubeIframeAPIReady = () => {};
    };
  }, []);

  // Initialize YouTube player
  useEffect(() => {
    if (!apiLoaded || !playerRef.current || !videoId) return;

    const newPlayer = new window.YT.Player("youtube-player", {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        disablekb: 1,
        enablejsapi: 1,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: (event) => {
          setPlayer(event.target);
          setDuration(event.target.getDuration());
        },
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            // User may have used YouTube controls to seek
            const currentTime = event.target.getCurrentTime();
            setCurrentTime(currentTime);
            lastSeekTime.current = Date.now();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            // User may have paused to seek
            setIsSeeking(true);
            // Get the current time to update our UI
            const currentTime = event.target.getCurrentTime();
            setCurrentTime(currentTime);
          } else if (event.data === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            setCurrentTime(0);
          }
        },
        onError: () => {
          toast.error("Error loading YouTube video");
        },
      },
    });

    return () => {
      if (newPlayer) {
        newPlayer.destroy();
      }
    };
  }, [apiLoaded, videoId, setDuration, setIsPlaying, setCurrentTime]);

  // Handle play/pause
  useEffect(() => {
    if (!player) return;

    if (isPlaying) {
      player.playVideo();
      // Reset seeking state when playback resumes
      setIsSeeking(false);
    } else {
      player.pauseVideo();
    }
  }, [isPlaying, player]);

  // Handle volume changes
  useEffect(() => {
    if (!player) return;

    player.setVolume(volume * 100);
  }, [volume, player]);

  // Handle playback rate changes
  useEffect(() => {
    if (!player) return;

    player.setPlaybackRate(playbackRate);
  }, [playbackRate, player]);

  // Handle custom timeline slider changes
  // This effect responds to when the user drags the custom timeline slider
  const previousTimeRef = useRef(currentTime);
  useEffect(() => {
    if (!player) return;

    // Only seek if the time change is significant (user interaction, not just small updates)
    // and if we're not already seeking via YouTube controls
    const timeDifference = Math.abs(currentTime - previousTimeRef.current);
    if (timeDifference > 0.5 && !isSeeking) {
      // Mark that we're doing a seek and record the time
      setIsSeeking(true);
      lastSeekTime.current = Date.now();

      // Seek to the new time
      player.seekTo(currentTime, true);

      // After a short delay, reset the seeking state
      setTimeout(() => {
        setIsSeeking(false);
      }, 500);
    }

    previousTimeRef.current = currentTime;
  }, [currentTime, player, isSeeking]);

  // Handle A-B loop
  useEffect(() => {
    if (!player) return;

    const checkTime = () => {
      if (!player) return;

      const currentTime = player.getCurrentTime();
      setCurrentTime(currentTime);

      // Don't enforce loop boundaries if user is currently seeking
      // or has recently seeked (within the last 500ms)
      const timeSinceLastSeek = Date.now() - lastSeekTime.current;
      const seekingCooldown = 500; // ms

      // Handle A-B looping only if not in seeking cooldown
      if (
        isLooping &&
        !isSeeking &&
        timeSinceLastSeek > seekingCooldown &&
        loopStart !== null &&
        loopEnd !== null
      ) {
        // Add a small buffer to prevent edge case issues
        const buffer = 0.1;

        if (currentTime >= loopEnd - buffer) {
          // When we reach the end point, jump back to start
          player.seekTo(loopStart, true);
          console.log("YouTube Loop: Jumping back to start point", loopStart);
        } else if (currentTime < loopStart - buffer && currentTime > 0) {
          // If somehow we're before the start point (e.g., user dragged the slider)
          player.seekTo(loopStart, true);
          console.log("YouTube Loop: Jumping to start point", loopStart);
        }
      }
    };

    // Use interval for more precise checking
    const checkInterval = setInterval(checkTime, 50);

    return () => {
      clearInterval(checkInterval);
    };
  }, [player, isLooping, isSeeking, loopStart, loopEnd, setCurrentTime]);

  return (
    <div className="relative rounded-lg overflow-hidden w-full">
      {/* Use a container with padding-top to maintain aspect ratio */}
      <div
        style={{
          paddingTop: "56.25%", // 16:9 aspect ratio by default
          position: "relative",
          maxHeight: "calc(100vh - 180px)", // Adjust based on available space
          width: "100%",
          // Media queries handled via CSS custom properties that update with window.matchMedia in a useEffect
          // This makes the player more responsive on different devices
          ...(window.innerWidth < 640 ? { paddingTop: "60%" } : {}),
        }}
      >
        <div
          id="youtube-player"
          ref={playerRef}
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>
    </div>
  );
};
