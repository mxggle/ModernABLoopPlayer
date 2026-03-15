import { useState, useEffect, useRef } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { useTranslation } from "react-i18next";
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
  RotateCcw,
} from "lucide-react";
import { Slider } from "../ui/slider";
import { Button } from "../ui/button";

export const CombinedControls = () => {
  const { t } = useTranslation();
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
    seekStepSeconds,
    seekSmallStepSeconds,
    setSeekStepSeconds,
    setSeekSmallStepSeconds,
    maxLoops,
    setMaxLoops,
    loopDelay,
    setLoopDelay,
    isSidebarOpen,
    sidebarWidth,
  } = usePlayerStore();

  const [rangeValues, setRangeValues] = useState<[number, number]>([0, 100]);
  const [showABControls, setShowABControls] = useState(false);
  const [showStepDropdown, setShowStepDropdown] = useState(false);
  const stepDropdownRef = useRef<HTMLDivElement>(null);
  const [showLoopDropdown, setShowLoopDropdown] = useState(false);
  const loopDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (stepDropdownRef.current && !stepDropdownRef.current.contains(e.target as Node)) {
        setShowStepDropdown(false);
      }
      if (loopDropdownRef.current && !loopDropdownRef.current.contains(e.target as Node)) {
        setShowLoopDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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


  // Find the button rendering part and replace it


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

  // Seek forward by configured step
  const seekForward = () => {
    storeSeekForward(seekStepSeconds);
  };

  // Seek backward by configured step
  const seekBackward = () => {
    storeSeekBackward(seekStepSeconds);
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
    if (muted) {
      // Unmute: restore previous volume
      const previousVolume = usePlayerStore.getState().previousVolume;
      if (previousVolume !== undefined && previousVolume > 0) {
        setVolume(previousVolume);
      } else {
        setVolume(1);
      }
      setMuted(false);
    } else {
      // Mute: store current volume and set to 0
      usePlayerStore.getState().setPreviousVolume(volume);
      setVolume(0);
      setMuted(true);
    }
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

  // Set loop start (A) at current time.
  // Rules:
  // - If a loop exists and current time is AFTER B, clear B and set only A (fresh loop start).
  // - If current time is BEFORE B, set A and keep existing B.
  // - Do not auto-create a default B.
  const setLoopStartAtCurrentTime = () => {
    if (duration === 0) return;
    if (loopEnd !== null && currentTime >= loopEnd) {
      // Start fresh: A=current, clear B, and stop looping until B is set
      setLoopPoints(currentTime, null);
      setIsLooping(false);
    } else {
      // Just move A; keep B as-is (may be null)
      setLoopPoints(currentTime, loopEnd);
      if (loopEnd !== null) {
        // Valid A-B range remains; keep looping state
        if (!isLooping) setIsLooping(true);
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
    <div 
      className="fixed bottom-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-[50] transition-[left] duration-300 ease-in-out"
      style={{ left: isSidebarOpen ? sidebarWidth : 0 }}
    >
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
              aria-label={volume > 0 ? t("player.mute") : t("player.unmute")}
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
              onClick={() => {
                setCurrentTime(0);
                if (!isPlaying) setIsPlaying(true);
              }}
              className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label={t("player.playFromStart", { defaultValue: "Play from start" })}
              title={t("player.playFromStart", { defaultValue: "Play from start" })}
            >
              <RotateCcw size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>

            <button
              onClick={seekBackward}
              className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label={t("player.seekBackwardSeconds", { seconds: seekStepSeconds })}
            >
              <SkipBack size={18} className="sm:w-[20px] sm:h-[20px]" />
            </button>

            <button
              onClick={togglePlayPause}
              className="p-2 sm:p-3 bg-purple-600 rounded-full text-white hover:bg-purple-700 shadow-md transition-all duration-150 active:scale-95"
              aria-label={isPlaying ? t("player.pause") : t("player.play")}
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
              aria-label={t("player.seekForwardSeconds", { seconds: seekStepSeconds })}
            >
              <SkipForward size={18} className="sm:w-[20px] sm:h-[20px]" />
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 sm:space-x-2 mr-1 border-r border-gray-200 dark:border-gray-700 pr-2 sm:pr-3">
              <button
                onClick={decreasePlaybackRate}
                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                aria-label={t("player.decreaseSpeed")}
              >
                <Rewind size={14} className="sm:w-[16px] sm:h-[16px]" />
              </button>

              <span className="text-xs sm:text-sm font-medium min-w-[36px] sm:min-w-[42px] text-center">
                {playbackRate.toFixed(2)}x
              </span>

              <button
                onClick={increasePlaybackRate}
                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                aria-label={t("player.increaseSpeed")}
              >
                <FastForward size={14} className="sm:w-[16px] sm:h-[16px]" />
              </button>
            </div>

            {/* Loop button + dropdown */}
            <div className="relative flex items-stretch rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm" ref={loopDropdownRef}>
              <Button
                variant={isLooping ? "default" : "ghost"}
                size="sm"
                onClick={toggleLooping}
                className="gap-1 py-1 px-3 h-8 text-xs font-medium whitespace-nowrap rounded-none border-0"
                aria-label={t("player.toggleLooping")}
              >
                <Repeat size={13} className="sm:w-[14px] sm:h-[14px]" />
                <span className="hidden sm:inline">{t("player.loop")}</span>
              </Button>
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" aria-hidden />
              <button
                onClick={() => setShowLoopDropdown(!showLoopDropdown)}
                className="px-1.5 h-8 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                aria-label="Loop settings"
              >
                <ChevronDown size={12} />
              </button>
              {showLoopDropdown && (
                <div className="absolute left-0 bottom-full mb-1 z-[60] w-44 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{t("loop.repeats")}</label>
                    <select
                      value={maxLoops}
                      onChange={(e) => setMaxLoops(Number(e.target.value))}
                      className="h-7 rounded border border-gray-200 dark:border-gray-600 bg-transparent px-1 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700"
                    >
                      <option value={0}>∞</option>
                      <option value={1}>1×</option>
                      <option value={2}>2×</option>
                      <option value={3}>3×</option>
                      <option value={5}>5×</option>
                      <option value={10}>10×</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{t("loop.gap")}</label>
                    <select
                      value={loopDelay}
                      onChange={(e) => setLoopDelay(Number(e.target.value))}
                      className="h-7 rounded border border-gray-200 dark:border-gray-600 bg-transparent px-1 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700"
                    >
                      <option value={0}>0s</option>
                      <option value={0.5}>0.5s</option>
                      <option value={1}>1s</option>
                      <option value={2}>2s</option>
                      <option value={3}>3s</option>
                      <option value={5}>5s</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Step settings dropdown */}
            <div className="relative" ref={stepDropdownRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStepDropdown(!showStepDropdown)}
                className="gap-1 py-1 px-3 h-8 text-xs font-medium whitespace-nowrap"
                title={t("settings.seekStep")}
              >
                {seekStepSeconds}s
              </Button>
              {showStepDropdown && (
                <div className="absolute right-0 bottom-full mb-1 z-[60] w-48 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{t("settingsPage.seekStep")}</label>
                    <input
                      type="number"
                      min={0.1}
                      max={120}
                      step={0.1}
                      value={seekStepSeconds}
                      onChange={(e) => setSeekStepSeconds(parseFloat(e.target.value) || 0)}
                      className="w-16 h-7 rounded border border-gray-200 dark:border-gray-600 bg-transparent px-2 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{t("settingsPage.smallStep")}</label>
                    <input
                      type="number"
                      min={0.05}
                      max={10}
                      step={0.05}
                      value={seekSmallStepSeconds}
                      onChange={(e) => setSeekSmallStepSeconds(parseFloat(e.target.value) || 0)}
                      className="w-16 h-7 rounded border border-gray-200 dark:border-gray-600 bg-transparent px-2 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700"
                    />
                  </div>
                </div>
              )}
            </div>



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
                aria-label={t("loop.setStart")}
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
                aria-label={t("loop.setEnd")}
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
                {t("loop.clearLoopPoints")}
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
