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
  const playerRef = useRef<HTMLDivElement>(null);

  const {
    isPlaying,
    volume,
    playbackRate,
    loopStart,
    loopEnd,
    isLooping,
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
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
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

  // Handle A-B loop
  useEffect(() => {
    if (!player) return;

    const checkTime = () => {
      if (!player) return;

      const currentTime = player.getCurrentTime();
      setCurrentTime(currentTime);

      // Handle A-B looping
      if (isLooping && loopStart !== null && loopEnd !== null) {
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
  }, [player, isLooping, loopStart, loopEnd, setCurrentTime]);

  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{ height: "calc(100vh - 280px)", maxHeight: "600px" }}
    >
      <div id="youtube-player" ref={playerRef} className="w-full h-full" />
    </div>
  );
};
