import { useState } from "react";
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
  Repeat,
  AlignStartHorizontal,
  AlignEndHorizontal,
  X,
  Bookmark,
  ListMusic,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { Button } from "../ui/button";

export const MobileControls = () => {
  const { t } = useTranslation();
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
    seekForward: storeSeekForward,
    seekBackward: storeSeekBackward,
    seekStepSeconds,
    getCurrentMediaBookmarks,
    // Playlist / queue state
    playbackQueue,
    playbackIndex,
    stopPlaybackQueue,
    setPlaybackMode,
    playbackMode,
    // Auto-advance bookmarks
    autoAdvanceBookmarks,
    setAutoAdvanceBookmarks,
  } = usePlayerStore();

  const [showSpeedControls, setShowSpeedControls] = useState(false);
  const [showVolumeDrawer, setShowVolumeDrawer] = useState(false);
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState(false);

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

  // Seek backward by configured step
  const seekBackward = () => {
    storeSeekBackward(seekStepSeconds);
  };

  // Seek forward by configured step
  const seekForward = () => {
    storeSeekForward(seekStepSeconds);
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

  // Navigate to previous bookmark
  const goToPreviousBookmark = () => {
    if (bookmarks.length === 0) return;

    // Find the bookmark that comes before the current time
    const sortedBookmarks = [...bookmarks].sort((a, b) => a.start - b.start);
    let targetBookmark = null;

    for (let i = sortedBookmarks.length - 1; i >= 0; i--) {
      if (sortedBookmarks[i].start < currentTime - 0.5) {
        // 0.5s tolerance
        targetBookmark = sortedBookmarks[i];
        break;
      }
    }

    // If no previous bookmark found, go to the last one
    if (!targetBookmark && sortedBookmarks.length > 0) {
      targetBookmark = sortedBookmarks[sortedBookmarks.length - 1];
    }

    if (targetBookmark) {
      setCurrentTime(targetBookmark.start);
    }
  };

  // Navigate to next bookmark
  const goToNextBookmark = () => {
    if (bookmarks.length === 0) return;

    // Find the bookmark that comes after the current time
    const sortedBookmarks = [...bookmarks].sort((a, b) => a.start - b.start);
    const targetBookmark = sortedBookmarks.find(
      (bookmark) => bookmark.start > currentTime + 0.5
    ); // 0.5s tolerance

    // If no next bookmark found, go to the first one
    const bookmarkToUse = targetBookmark || sortedBookmarks[0];

    if (bookmarkToUse) {
      setCurrentTime(bookmarkToUse.start);
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

        {/* Main controls - reorganized for better vertical space usage */}
        <div className="space-y-4">
          {/* Primary controls row - play/pause and seek */}
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={() => setShowPlaylistDrawer(true)}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 relative"
              aria-label="Open playlist"
            >
              <ListMusic size={20} />
              {playbackQueue.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {playbackQueue.length > 9 ? "9+" : playbackQueue.length}
                </span>
              )}
            </button>
            <button
              onClick={seekBackward}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label={`Seek backward ${seekStepSeconds} seconds`}
            >
              <SkipBack size={24} />
            </button>

            <button
              onClick={togglePlayPause}
              className="p-4 bg-purple-600 rounded-full text-white hover:bg-purple-700 shadow-md"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={32} />
              ) : (
                <Play size={32} className="ml-1" />
              )}
            </button>

            <button
              onClick={seekForward}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label={`Seek forward ${seekStepSeconds} seconds`}
            >
              <SkipForward size={24} />
            </button>
            <button
              onClick={() => setShowSpeedControls(true)}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Playback speed"
            >
              <span className="text-sm font-bold">{playbackRate}x</span>
            </button>
          </div>

          {/* Secondary controls row - features and tools */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={toggleBookmarkDrawer}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 relative"
              aria-label="Open bookmarks"
            >
              <Bookmark size={20} />
              {bookmarks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {bookmarks.length > 9 ? "9+" : bookmarks.length}
                </span>
              )}
            </button>


            <button
              onClick={() => setAutoAdvanceBookmarks(!autoAdvanceBookmarks)}
              className={`p-3 rounded-full ${
                autoAdvanceBookmarks
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              aria-label={autoAdvanceBookmarks ? 'Auto-advance between bookmarks: On' : 'Auto-advance between bookmarks: Off'}
            >
              <ChevronsRight size={20} />
            </button>

            <button
              onClick={toggleLooping}
              className={`p-3 rounded-full ${
                isLooping
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              aria-label={isLooping ? 'Loop: On' : 'Loop: Off'}
            >
              <Repeat size={20} />
            </button>

            <button
              onClick={setLoopStartAtCurrentTime}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Set A point at current time"
            >
              <AlignStartHorizontal size={20} />
            </button>

            <button
              onClick={setLoopEndAtCurrentTime}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Set B point at current time"
            >
              <AlignEndHorizontal size={20} />
            </button>

            <button
              onClick={clearLoopPoints}
              disabled={loopStart === null && loopEnd === null}
              className={`p-3 rounded-full ${
                loopStart === null && loopEnd === null
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
              }`}
              aria-label="Clear loop points"
            >
              <X size={20} />
            </button>
          </div>

          {/* Bookmark navigation row */}
          {bookmarks.length > 0 && (
            <div className="flex items-center justify-center space-x-6 pt-2">
              <button
                onClick={goToPreviousBookmark}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Previous bookmark"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                {t("player.bookmarkNavigation")}
              </span>
              <button
                onClick={goToNextBookmark}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Next bookmark"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>


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

      {/* Playlist Panel */}
      {showPlaylistDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowPlaylistDrawer(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 max-h-[80vh] bg-white dark:bg-gray-800 rounded-t-xl shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 w-12 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto my-2" />

            <div className="px-4 py-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">
                {t("player.playlist")}{" "}
                {playbackQueue.length > 0 ? `(${playbackQueue.length})` : ""}
              </h2>
              <button
                onClick={() => setShowPlaylistDrawer(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {playbackQueue.length > 0 && (
              <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
                <Button
                  variant={playbackMode === "shuffle" ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setPlaybackMode(
                      playbackMode === "shuffle" ? "order" : "shuffle"
                    )
                  }
                  className="flex-1"
                >
                  <Shuffle size={16} className="mr-1" />
                  {playbackMode === "shuffle" ? t("player.shuffle") : t("player.order")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopPlaybackQueue}
                  className="px-3 text-red-600 dark:text-red-400"
                >
                  {t("player.clear")}
                </Button>
              </div>
            )}

            <div className="p-4">
              {playbackQueue.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ListMusic size={48} className="mx-auto mb-2 opacity-30" />
                  <p>{t("player.noItemsInPlaylist")}</p>
                </div>
              ) : (
                <ul className="max-h-64 overflow-y-auto space-y-2">
                  {playbackQueue.map((id, idx) => {
                    const { mediaHistory } = usePlayerStore.getState();
                    const item = mediaHistory.find((h) => h.id === id);
                    if (!item) return null;

                    const isCurrentItem = idx === playbackIndex;
                    return (
                      <li
                        key={id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isCurrentItem
                            ? "bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800"
                            : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.type === "file" ? t("player.audioFile") : "YouTube"}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isCurrentItem && (
                            <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                              {t("player.now")}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Remove item from queue by creating new queue without this item
                              const newQueue = playbackQueue.filter(
                                (_, i) => i !== idx
                              );
                              const { playbackQueueOriginal } =
                                usePlayerStore.getState();
                              const newOriginal = playbackQueueOriginal.filter(
                                (id) => newQueue.includes(id)
                              );

                              if (newQueue.length === 0) {
                                stopPlaybackQueue();
                              } else {
                                const newIndex =
                                  idx < playbackIndex
                                    ? playbackIndex - 1
                                    : idx === playbackIndex
                                    ? Math.min(
                                        playbackIndex,
                                        newQueue.length - 1
                                      )
                                    : playbackIndex;
                                usePlayerStore.setState({
                                  playbackQueue: newQueue,
                                  playbackQueueOriginal: newOriginal,
                                  playbackIndex: newIndex,
                                });
                              }
                            }}
                            className="text-red-600 dark:text-red-400 p-1 h-8 w-8"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
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
              <h2 className="text-lg font-semibold">{t("player.playbackSpeed")}</h2>
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
