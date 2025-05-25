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
    muted,
    playbackRate,
    loopStart,
    loopEnd,
    isLooping,
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setMuted,
    setPlaybackRate,
    setLoopPoints,
    setIsLooping,
    seekForward: storeSeekForward,
    seekBackward: storeSeekBackward,
  } = usePlayerStore();

  const [rangeValues, setRangeValues] = useState<[number, number]>([0, 100]);
  const [showABControls, setShowABControls] = useState(true);

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

  // Handle timeline slider change with improved seeking capability
  const handleTimelineChange = (values: number[]) => {
    // Update the time in the store, which will be picked up by the media player
    setCurrentTime(values[0]);

    // We apply a direct class to show this was a manual user action
    // This helps distinguish manual seeking from normal playback updates
    document.body.classList.add("user-seeking");

    // Remove the class after a short delay
    setTimeout(() => {
      document.body.classList.remove("user-seeking");
    }, 100);
  };

  // Seek forward 5 seconds
  const seekForward = () => {
    storeSeekForward(5);
  };

  // Seek backward 5 seconds
  const seekBackward = () => {
    storeSeekBackward(5);
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

  // Toggle mute
  const toggleMute = () => {
    setMuted(!muted);
  };

  // Handle volume slider change
  const handleVolumeChange = (values: number[]) => {
    setVolume(values[0]);
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
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-1 sm:py-2">
        {/* Timeline slider - improved design and visibility */}
        <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
          <span className="text-xs sm:text-sm font-medium min-w-[45px] text-right">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleTimelineChange}
            className="relative flex-1 flex items-center select-none touch-none h-6"
          />
          <span className="text-xs sm:text-sm font-medium min-w-[45px]">
            {formatTime(duration)}
          </span>
        </div>

        {/* Main controls - improved layout and grouping */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleMute}
              className="p-1 sm:p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label={volume > 0 ? "Mute" : "Unmute"}
            >
              {volume > 0 ? (
                <Volume2 size={16} className="sm:w-[18px] sm:h-[18px]" />
              ) : (
                <VolumeX size={16} className="sm:w-[18px] sm:h-[18px]" />
              )}
            </button>

            <Slider
              value={[volume]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="relative flex items-center select-none touch-none w-20 sm:w-28 h-5"
            />
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={seekBackward}
              className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label="Seek backward 5 seconds"
            >
              <SkipBack size={18} className="sm:w-[20px] sm:h-[20px]" />
            </button>

            <button
              onClick={togglePlayPause}
              className="p-2 sm:p-3 bg-purple-600 rounded-full text-white hover:bg-purple-700 shadow-md transition-all duration-150 active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={20} className="sm:w-[24px] sm:h-[24px]" />
              ) : (
                <Play
                  size={20}
                  className="ml-0.5 sm:ml-1 sm:w-[24px] sm:h-[24px]"
                />
              )}
            </button>

            <button
              onClick={seekForward}
              className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label="Seek forward 5 seconds"
            >
              <SkipForward size={18} className="sm:w-[20px] sm:h-[20px]" />
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 sm:space-x-2 mr-1 border-r border-gray-200 dark:border-gray-700 pr-2 sm:pr-3">
              <button
                onClick={decreasePlaybackRate}
                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                aria-label="Decrease playback rate"
              >
                <Rewind size={14} className="sm:w-[16px] sm:h-[16px]" />
              </button>

              <span className="text-xs sm:text-sm font-medium min-w-[36px] sm:min-w-[42px] text-center">
                {playbackRate.toFixed(2)}x
              </span>

              <button
                onClick={increasePlaybackRate}
                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                aria-label="Increase playback rate"
              >
                <FastForward size={14} className="sm:w-[16px] sm:h-[16px]" />
              </button>
            </div>

            <Button
              variant={isLooping ? "default" : "outline"}
              size="sm"
              onClick={toggleLooping}
              className="gap-1 py-1 px-3 h-8 text-xs font-medium"
              aria-label="Toggle looping"
            >
              <Repeat size={13} className="sm:w-[14px] sm:h-[14px]" />
              <span className="hidden sm:inline">
                {isLooping ? "Loop On" : "Loop"}
              </span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowABControls(!showABControls)}
              className="gap-1 py-1 px-3 h-8 text-xs font-medium"
            >
              {showABControls ? (
                <ChevronDown size={13} className="sm:w-[14px] sm:h-[14px]" />
              ) : (
                <ChevronUp size={13} className="sm:w-[14px] sm:h-[14px]" />
              )}
              <span className="hidden sm:inline">AB Loop</span>
            </Button>
          </div>
        </div>

        {/* AB Loop Controls (expandable) - improved layout and controls */}
        {showABControls && (
          <div className="pt-2 sm:pt-3 pb-1 sm:pb-2 border-t border-gray-200 dark:border-gray-700 mt-1 sm:mt-2">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
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
              <Button
                variant="outline"
                size="sm"
                onClick={setLoopStartAtCurrentTime}
                aria-label="Set loop start at current time"
                className="py-1 px-3 h-8 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30"
              >
                <AlignStartHorizontal
                  size={14}
                  className="sm:w-[16px] sm:h-[16px]"
                />
                <span className="ml-1 text-xs font-medium">A</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={setLoopEndAtCurrentTime}
                aria-label="Set loop end at current time"
                className="py-1 px-3 h-8 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30"
              >
                <AlignEndHorizontal
                  size={14}
                  className="sm:w-[16px] sm:h-[16px]"
                />
                <span className="ml-1 text-xs font-medium">B</span>
              </Button>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={jumpToLoopStart}
                  disabled={loopStart === null}
                  className="py-1 px-3 h-8 font-medium disabled:opacity-50"
                >
                  <ChevronLeft size={14} className="sm:w-[16px] sm:h-[16px]" />
                  <span className="ml-1">
                    A: {loopStart !== null ? formatTime(loopStart) : "--:--"}
                  </span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={jumpToLoopEnd}
                  disabled={loopEnd === null}
                  className="py-1 px-3 h-8 font-medium disabled:opacity-50"
                >
                  <span className="mr-1">
                    B: {loopEnd !== null ? formatTime(loopEnd) : "--:--"}
                  </span>
                  <ChevronRight size={14} className="sm:w-[16px] sm:h-[16px]" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={clearLoopPoints}
                disabled={loopStart === null && loopEnd === null}
                className="py-1 px-2 sm:px-3 h-7 sm:h-8 text-xs font-medium text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:hover:bg-transparent"
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
const ChevronUp = ({
  size,
  className,
}: {
  size: number;
  className?: string;
}) => (
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
    className={className}
  >
    <path d="m18 15-6-6-6 6" />
  </svg>
);

const ChevronDown = ({
  size,
  className,
}: {
  size: number;
  className?: string;
}) => (
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
    className={className}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);
