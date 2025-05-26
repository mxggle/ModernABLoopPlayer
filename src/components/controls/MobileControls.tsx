import { useState } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { formatTime } from "../../utils/formatTime";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  AlignStartHorizontal,
  AlignEndHorizontal,
  X,
  Bookmark,
} from "lucide-react";
import { Button } from "../ui/button";

export const MobileControls = () => {
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
    getCurrentMediaBookmarks,
  } = usePlayerStore();

  const [showABControls, setShowABControls] = useState(false);
  const [showSpeedControls, setShowSpeedControls] = useState(false);
  const [showVolumeDrawer, setShowVolumeDrawer] = useState(false);

  // Get current media bookmarks for the bookmark button
  const bookmarks = getCurrentMediaBookmarks();

  // Toggle play/pause
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle timeline slider change with improved seeking capability
  const handleTimelineChange = (value: number) => {
    // Update the time in the store, which will be picked up by the media player
    setCurrentTime(value);

    // We apply a direct class to show this was a manual user action
    // This helps distinguish manual seeking from normal playback updates
    document.body.classList.add("user-seeking");

    // Remove the class after a short delay
    setTimeout(() => {
      document.body.classList.remove("user-seeking");
    }, 200); // Slightly longer timeout for mobile
  };

  // Handle volume slider change
  const handleVolumeChange = (value: number) => {
    setVolume(value);
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

  // Change playback rate
  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedControls(false);
  };

  // Toggle bookmark drawer
  const toggleBookmarkDrawer = () => {
    const bookmarkToggle = document.getElementById("bookmarkDrawerToggle");
    bookmarkToggle?.click();
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
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-10 pb-safe">
      <div className="px-3 pt-2 pb-3">
        {/* Timeline */}
        <div className="flex items-center mb-4">
          <span className="text-xs font-medium min-w-[45px] text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            value={currentTime}
            min={0}
            max={duration || 100}
            step={0.1}
            onChange={(e) => handleTimelineChange(parseFloat(e.target.value))}
            onTouchStart={() => document.body.classList.add("user-seeking")}
            onTouchEnd={() => {
              // Short delay before removing class to ensure the seeking event is processed
              setTimeout(
                () => document.body.classList.remove("user-seeking"),
                100
              );
            }}
            className="mx-2 flex-1 h-12 appearance-none bg-gradient-to-r from-purple-200 to-purple-500 rounded-full focus:outline-none"
            style={{
              // Improve touch area for mobile users
              WebkitAppearance: "none",
              background: `linear-gradient(to right, #9333ea ${
                (currentTime / (duration || 100)) * 100
              }%, #e2e8f0 ${(currentTime / (duration || 100)) * 100}%)`,
              // Enhanced touch targeting
              touchAction: "none",
            }}
          />
          <span className="text-xs font-medium min-w-[45px]">
            {formatTime(duration)}
          </span>
        </div>

        {/* Main controls - mobile optimized */}
        <div className="flex justify-between items-center">
          {/* Left controls */}
          <div className="flex items-center">
            <button
              onClick={toggleMute}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label={volume > 0 ? "Mute" : "Unmute"}
            >
              {volume > 0 ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </button>
          </div>

          {/* Center controls - play/pause and seek */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={seekBackward}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Seek backward 5 seconds"
            >
              <SkipBack size={22} />
            </button>

            <button
              onClick={togglePlayPause}
              className="p-4 bg-purple-600 rounded-full text-white hover:bg-purple-700 shadow-md"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={28} />
              ) : (
                <Play size={28} className="ml-1" />
              )}
            </button>

            <button
              onClick={seekForward}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Seek forward 5 seconds"
            >
              <SkipForward size={22} />
            </button>
          </div>

          {/* Right controls */}
          <div className="flex items-center">
            <button
              onClick={toggleBookmarkDrawer}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 relative mr-2"
              aria-label="Open bookmarks"
            >
              <Bookmark size={22} />
              {bookmarks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {bookmarks.length > 9 ? "9+" : bookmarks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowABControls(!showABControls)}
              className={`p-3 rounded-full ${
                isLooping
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              aria-label="AB Loop controls"
            >
              <Repeat size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* AB Loop Panel */}
      {showABControls && (
        <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold">AB Loop Controls</h3>
            <button
              onClick={() => setShowABControls(false)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X size={18} />
            </button>
          </div>

          {/* A-B Control Buttons */}
          <div className="flex justify-between mb-4">
            <Button
              variant="outline"
              size="lg"
              onClick={setLoopStartAtCurrentTime}
              className="flex-1 mr-2 h-12 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
            >
              <AlignStartHorizontal size={18} className="mr-1" />
              <span className="font-medium">Set A Point</span>
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={setLoopEndAtCurrentTime}
              className="flex-1 ml-2 h-12 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
            >
              <span className="font-medium">Set B Point</span>
              <AlignEndHorizontal size={18} className="ml-1" />
            </Button>
          </div>

          {/* A-B Navigation and Status */}
          <div className="flex justify-between mb-4">
            <Button
              variant="outline"
              size="default"
              onClick={jumpToLoopStart}
              disabled={loopStart === null}
              className="flex-1 mr-2"
            >
              <span>
                A: {loopStart !== null ? formatTime(loopStart) : "--:--"}
              </span>
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={jumpToLoopEnd}
              disabled={loopEnd === null}
              className="flex-1 ml-2"
            >
              <span>B: {loopEnd !== null ? formatTime(loopEnd) : "--:--"}</span>
            </Button>
          </div>

          {/* Loop Controls */}
          <div className="flex justify-between">
            <Button
              variant={isLooping ? "default" : "outline"}
              size="default"
              onClick={toggleLooping}
              className="flex-1 mr-2 h-12"
            >
              <Repeat size={18} className="mr-1" />
              <span>{isLooping ? "Loop On" : "Loop Off"}</span>
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={clearLoopPoints}
              disabled={loopStart === null && loopEnd === null}
              className="flex-1 ml-2 h-12 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900"
            >
              <span>Clear Loop</span>
            </Button>
          </div>
        </div>
      )}

      {/* Volume Controls Panel */}
      {showVolumeDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowVolumeDrawer(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 max-h-[80vh] bg-white dark:bg-gray-800 rounded-t-xl shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 w-12 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto my-2" />

            <div className="px-4 py-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Volume</h2>
              <button
                onClick={() => setShowVolumeDrawer(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 flex flex-col items-center">
              <div className="flex items-center justify-center mb-4">
                <button
                  onClick={toggleMute}
                  className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-4"
                >
                  {volume > 0 ? <Volume2 size={24} /> : <VolumeX size={24} />}
                </button>
                <span className="text-lg font-medium">
                  {Math.round(volume * 100)}%
                </span>
              </div>

              <input
                type="range"
                value={volume}
                min={0}
                max={1}
                step={0.01}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-12 appearance-none bg-gradient-to-r from-purple-200 to-purple-500 rounded-full"
                style={{
                  WebkitAppearance: "none",
                  background: `linear-gradient(to right, #9333ea ${
                    volume * 100
                  }%, #e2e8f0 ${volume * 100}%)`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Playback Speed Panel */}
      {showSpeedControls && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowSpeedControls(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 max-h-[80vh] bg-white dark:bg-gray-800 rounded-t-xl shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 w-12 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto my-2" />

            <div className="px-4 py-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Playback Speed</h2>
              <button
                onClick={() => setShowSpeedControls(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 grid grid-cols-3 gap-3">
              {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
                <Button
                  key={rate}
                  variant={playbackRate === rate ? "default" : "outline"}
                  size="lg"
                  onClick={() => changePlaybackRate(rate)}
                  className="h-16 text-lg font-bold"
                >
                  {rate.toFixed(2)}x
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
