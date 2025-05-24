import { useState, useEffect } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { formatTime } from "../../utils/formatTime";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Rewind,
  FastForward,
  Repeat,
  AlignStartHorizontal,
  AlignEndHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Slider } from "../ui/slider";
import { Button } from "../ui/button";

export const CombinedControls = () => {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    loopStart,
    loopEnd,
    isLooping,
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setPlaybackRate,
    setLoopPoints,
    setIsLooping,
  } = usePlayerStore();

  const [rangeValues, setRangeValues] = useState<[number, number]>([0, 100]);
  const [showABControls, setShowABControls] = useState(false);

  // Update range slider when loop points change
  useEffect(() => {
    if (duration === 0) return;

    const start = loopStart !== null ? loopStart : 0;
    const end = loopEnd !== null ? loopEnd : duration;

    setRangeValues([(start / duration) * 100, (end / duration) * 100]);
  }, [loopStart, loopEnd, duration]);

  // Toggle play/pause
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle timeline slider change
  const handleTimelineChange = (values: number[]) => {
    setCurrentTime(values[0]);
  };

  // Handle volume slider change
  const handleVolumeChange = (values: number[]) => {
    setVolume(values[0]);
  };

  // Seek backward 5 seconds
  const seekBackward = () => {
    const newTime = Math.max(0, currentTime - 5);
    setCurrentTime(newTime);
  };

  // Seek forward 5 seconds
  const seekForward = () => {
    const newTime = Math.min(duration, currentTime + 5);
    setCurrentTime(newTime);
  };

  // Toggle mute
  const toggleMute = () => {
    setVolume(volume > 0 ? 0 : 1);
  };

  // Decrease playback rate
  const decreasePlaybackRate = () => {
    const newRate = Math.max(0.25, playbackRate - 0.25);
    setPlaybackRate(newRate);
  };

  // Increase playback rate
  const increasePlaybackRate = () => {
    const newRate = Math.min(2, playbackRate + 0.25);
    setPlaybackRate(newRate);
  };

  // Handle range slider change for AB loop
  const handleRangeChange = (values: number[]) => {
    if (duration === 0) return;

    const [startPercent, endPercent] = values as [number, number];
    const start = (startPercent / 100) * duration;
    const end = (endPercent / 100) * duration;

    setRangeValues([startPercent, endPercent]);
    setLoopPoints(start, end);

    // Enable looping when points are set
    if (!isLooping) {
      setIsLooping(true);
    }
  };

  // Set loop start point at current time
  const setLoopStartAtCurrentTime = () => {
    const end = loopEnd !== null ? loopEnd : duration;
    if (currentTime < end) {
      setLoopPoints(currentTime, end);
      // Enable looping when points are set
      if (!isLooping) {
        setIsLooping(true);
      }
    }
  };

  // Set loop end point at current time
  const setLoopEndAtCurrentTime = () => {
    const start = loopStart !== null ? loopStart : 0;
    if (currentTime > start) {
      setLoopPoints(start, currentTime);
      // Enable looping when points are set
      if (!isLooping) {
        setIsLooping(true);
      }
    }
  };

  // Toggle looping
  const toggleLooping = () => {
    setIsLooping(!isLooping);
  };

  // Clear loop points
  const clearLoopPoints = () => {
    setLoopPoints(null, null);
    setIsLooping(false);
  };

  // Jump to loop start
  const jumpToLoopStart = () => {
    if (loopStart !== null) {
      setCurrentTime(loopStart);
    }
  };

  // Jump to loop end
  const jumpToLoopEnd = () => {
    if (loopEnd !== null) {
      setCurrentTime(loopEnd);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-10">
      <div className="max-w-6xl mx-auto px-3 py-1">
        {/* Timeline slider */}
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm">{formatTime(currentTime)}</span>
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleTimelineChange}
            className="relative flex-1 flex items-center select-none touch-none h-5"
          />
          <span className="text-sm">{formatTime(duration)}</span>
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label={volume > 0 ? "Mute" : "Unmute"}
            >
              {volume > 0 ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>

            <Slider
              value={[volume]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="relative flex items-center select-none touch-none w-24 h-5"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={seekBackward}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Seek backward 5 seconds"
            >
              <SkipBack size={20} />
            </button>

            <button
              onClick={togglePlayPause}
              className="p-3 bg-purple-600 rounded-full text-white hover:bg-purple-700"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <button
              onClick={seekForward}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Seek forward 5 seconds"
            >
              <SkipForward size={20} />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={decreasePlaybackRate}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Decrease playback rate"
            >
              <Rewind size={20} />
            </button>

            <span className="text-sm font-medium">
              {playbackRate.toFixed(2)}x
            </span>

            <button
              onClick={increasePlaybackRate}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Increase playback rate"
            >
              <FastForward size={20} />
            </button>

            <Button
              variant={isLooping ? "default" : "outline"}
              size="sm"
              onClick={toggleLooping}
              className="gap-1 ml-2"
              aria-label="Toggle looping"
            >
              <Repeat size={16} />
              <span className="hidden sm:inline">
                {isLooping ? "Looping" : "Loop Off"}
              </span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowABControls(!showABControls)}
              className="gap-1"
            >
              {showABControls ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronUp size={16} />
              )}
              <span className="hidden sm:inline">AB Controls</span>
            </Button>
          </div>
        </div>

        {/* AB Loop Controls (expandable) */}
        {showABControls && (
          <div className="pt-1 pb-1 border-t border-gray-200 dark:border-gray-700 mt-1">
            <div className="flex items-center gap-2 mb-1">
              <Button
                variant="outline"
                size="sm"
                onClick={setLoopStartAtCurrentTime}
                aria-label="Set loop start at current time"
              >
                <AlignStartHorizontal size={16} />
                <span className="ml-1 hidden sm:inline">Set A</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={setLoopEndAtCurrentTime}
                aria-label="Set loop end at current time"
              >
                <AlignEndHorizontal size={16} />
                <span className="ml-1 hidden sm:inline">Set B</span>
              </Button>
              <div className="flex-1">
                <Slider
                  value={rangeValues}
                  min={0}
                  max={100}
                  step={0.1}
                  onValueChange={handleRangeChange}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={jumpToLoopStart}
                  disabled={loopStart === null}
                >
                  <ChevronLeft size={16} />
                  <span className="ml-1">
                    A: {loopStart !== null ? formatTime(loopStart) : "--:--"}
                  </span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={jumpToLoopEnd}
                  disabled={loopEnd === null}
                >
                  <span className="mr-1">
                    B: {loopEnd !== null ? formatTime(loopEnd) : "--:--"}
                  </span>
                  <ChevronRight size={16} />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={clearLoopPoints}
                disabled={loopStart === null && loopEnd === null}
              >
                Clear Loop
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Missing imports that were added
const ChevronUp = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m18 15-6-6-6 6" />
  </svg>
);

const ChevronDown = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);
