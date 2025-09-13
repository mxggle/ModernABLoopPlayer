import { usePlayerStore } from "@/stores/playerStore";
import { formatTime } from "@/utils/formatTime";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Minus,
  Plus,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { cn } from "@/utils/cn";

export const PlayerControls = () => {
  const timelineRef = useRef<HTMLDivElement>(null);

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    playbackRate,
    togglePlay,
    setCurrentTime,
    setVolume,
    setPlaybackRate,
    toggleMute,
    seekStepSeconds,
  } = usePlayerStore();

  // Handle timeline click
  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickPosition = (event.clientX - rect.left) / rect.width;
    const newTime = clickPosition * duration;

    setCurrentTime(Math.max(0, Math.min(duration, newTime)));
  };

  // Timeline slider handlers are not currently used but kept for future implementation

  // Handle volume slider change
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  // Seek backward by configured step
  const seekBackward = () => {
    const newTime = Math.max(0, currentTime - seekStepSeconds);
    setCurrentTime(newTime);
  };

  // Seek forward by configured step
  const seekForward = () => {
    const newTime = Math.min(duration, currentTime + seekStepSeconds);
    setCurrentTime(newTime);
  };

  // Playback rate presets
  const playbackRates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  // Find next lower playback rate
  const decreasePlaybackRate = () => {
    const currentIndex = playbackRates.findIndex(
      (rate) => rate >= playbackRate
    );
    const newIndex = Math.max(0, currentIndex - 1);
    setPlaybackRate(playbackRates[newIndex]);
  };

  // Find next higher playback rate
  const increasePlaybackRate = () => {
    const currentIndex =
      playbackRates.findIndex((rate) => rate > playbackRate) - 1;
    const newIndex = Math.min(playbackRates.length - 1, currentIndex + 1);
    setPlaybackRate(playbackRates[newIndex]);
  };

  // Calculate timeline progress
  const timelineProgress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Timeline */}
      <div className="space-y-1">
        <div
          ref={timelineRef}
          className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer overflow-hidden"
          onClick={handleTimelineClick}
        >
          <div
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-100 ease-in-out"
            style={{ width: `${timelineProgress}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main controls */}
      <div className="grid grid-cols-3 items-center">
        {/* Volume control */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted || volume === 0 ? (
              <VolumeX size={18} />
            ) : (
              <Volume2 size={18} />
            )}
          </Button>

          <Slider
            value={[muted ? 0 : volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-24"
          />
        </div>

        {/* Play/pause and skip controls */}
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={seekBackward}
            aria-label={`Seek backward ${seekStepSeconds} seconds`}
          >
            <SkipBack size={18} />
          </Button>

          <Button
            variant="default"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full",
              isPlaying
                ? "bg-primary hover:bg-primary/90"
                : "bg-primary hover:bg-primary/90"
            )}
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={seekForward}
            aria-label={`Seek forward ${seekStepSeconds} seconds`}
          >
            <SkipForward size={18} />
          </Button>
        </div>

        {/* Playback speed controls */}
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={decreasePlaybackRate}
            aria-label="Decrease playback rate"
            disabled={playbackRate <= playbackRates[0]}
          >
            <Minus size={16} />
          </Button>

          <span className="text-sm font-medium w-14 text-center">
            {playbackRate.toFixed(2)}x
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={increasePlaybackRate}
            aria-label="Increase playback rate"
            disabled={playbackRate >= playbackRates[playbackRates.length - 1]}
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};
