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
  ListMusic,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    // Playlist / queue state
    playbackQueue,
    playbackIndex,
    isQueueActive,
    mediaHistory,
    startPlaybackQueue,
    stopPlaybackQueue,
    playbackMode,
    setPlaybackMode,
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

          {/* Playlist popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                title="Show playlist"
                className="ml-2"
              >
                <ListMusic size={16} className="mr-1" /> Playlist
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">
                  Playlist {playbackQueue.length > 0 ? `(${playbackQueue.length})` : ""}
                </div>
                {playbackQueue.length > 0 && (
                  <div className="flex items-center gap-2">
                    {isQueueActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                        Playing
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => stopPlaybackQueue()}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-500">Mode:</span>
                <div role="group" className="inline-flex rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                  <Button
                    size="sm"
                    variant={playbackMode === 'order' ? 'default' : 'ghost'}
                    className="h-7 px-2 text-xs rounded-none"
                    onClick={() => setPlaybackMode('order')}
                  >
                    Order
                  </Button>
                  <div className="w-px bg-gray-200 dark:bg-gray-700" />
                  <Button
                    size="sm"
                    variant={playbackMode === 'shuffle' ? 'default' : 'ghost'}
                    className="h-7 px-2 text-xs rounded-none"
                    onClick={() => setPlaybackMode('shuffle')}
                  >
                    Shuffle
                  </Button>
                  <div className="w-px bg-gray-200 dark:bg-gray-700" />
                  <Button
                    size="sm"
                    variant={playbackMode === 'repeat-all' ? 'default' : 'ghost'}
                    className="h-7 px-2 text-xs rounded-none"
                    onClick={() => setPlaybackMode('repeat-all')}
                  >
                    Repeat All
                  </Button>
                  <div className="w-px bg-gray-200 dark:bg-gray-700" />
                  <Button
                    size="sm"
                    variant={playbackMode === 'repeat-one' ? 'default' : 'ghost'}
                    className="h-7 px-2 text-xs rounded-none"
                    onClick={() => setPlaybackMode('repeat-one')}
                  >
                    Repeat One
                  </Button>
                </div>
              </div>

              {playbackQueue.length === 0 ? (
                <div className="text-sm text-gray-500">No items in the playlist.</div>
              ) : (
                <ul className="max-h-64 overflow-y-auto space-y-1">
                  {playbackQueue.map((id, idx) => {
                    const item = mediaHistory.find((h) => h.id === id);
                    const title = item?.name || `Item ${idx + 1}`;
                    const isCurrent = idx === playbackIndex;
                    return (
                      <li key={`${id}-${idx}`}>
                        <button
                          className={cn(
                            "w-full text-left px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800",
                            isCurrent ? "bg-gray-100 dark:bg-gray-800 font-medium" : ""
                          )}
                          onClick={() => startPlaybackQueue(playbackQueue, id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs w-6 text-gray-500">{idx + 1}.</span>
                            <span className="truncate flex-1">{title}</span>
                            {isCurrent && (
                              <span className="text-xs text-primary">Now Playing</span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};
