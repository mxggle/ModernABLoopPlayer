import { useState } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { useTranslation } from "react-i18next";

import { toast } from "react-hot-toast";
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
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { Button } from "../ui/button";

export const MobileControls = () => {
  const { t } = useTranslation();

  const {
    isPlaying,
    duration,
    volume,
    muted,
    playbackRate,
    loopStart,
    loopEnd,
    isLooping,
    selectedBookmarkId,
    currentFile,
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setPlaybackRate,
    setLoopPoints,
    setIsLooping,
    toggleMute,
    seekForward: storeSeekForward,
    seekBackward: storeSeekBackward,
    seekStepSeconds,
    getCurrentMediaBookmarks,
    addBookmark: storeAddBookmark,
    deleteBookmark,
    // Auto-advance bookmarks
    autoAdvanceBookmarks,
    setAutoAdvanceBookmarks,
    toggleLooping,
  } = usePlayerStore();

  const [showSpeedControls, setShowSpeedControls] = useState(false);
  const [showVolumeDrawer, setShowVolumeDrawer] = useState(false);

  // Get current media bookmarks for the bookmark button
  const bookmarks = getCurrentMediaBookmarks();

  // Toggle play/pause
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
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

  // toggleMute is now from the store

  // Change playback rate
  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedControls(false);
  };

  // Handle bookmark toggle button - add/remove bookmarks directly (primary controls)
  const handleBookmarkAction = () => {
    const BOOKMARK_TOAST_ID = "bookmark-action-toast";

    if (selectedBookmarkId) {
      // Delete mode
      deleteBookmark(selectedBookmarkId);
      toast.success(t("bookmarks.bookmarkRemoved"), { id: BOOKMARK_TOAST_ID });
    } else if (loopStart !== null && loopEnd !== null) {
      // Check if a bookmark already exists for this range
      const TOL = 0.05; // 50ms tolerance
      const existingBookmarks = getCurrentMediaBookmarks();
      const existingBookmark = existingBookmarks.find(
        (b) =>
          Math.abs(b.start - loopStart) < TOL && Math.abs(b.end - loopEnd) < TOL
      );

      if (existingBookmark) {
        // If a bookmark already exists, remove it (toggle behavior)
        deleteBookmark(existingBookmark.id);
        toast.success(t("bookmarks.bookmarkRemoved"), {
          id: BOOKMARK_TOAST_ID,
        });
      } else {
        // Add mode - create new bookmark
        const bookmarkCount = existingBookmarks.length + 1;
        const added = storeAddBookmark({
          name: t("bookmarks.defaultClipName", { count: bookmarkCount }),
          start: loopStart,
          end: loopEnd,
          playbackRate,
          mediaName: currentFile?.name,
          mediaType: currentFile?.type,
          youtubeId: undefined,
          annotation: "",
        });
        if (added)
          toast.success(t("bookmarks.bookmarkAdded"), {
            id: BOOKMARK_TOAST_ID,
          });
      }
    }
  };

  // Navigate to previous bookmark
  const goToPreviousBookmark = () => {
    if (bookmarks.length === 0) return;

    // Find the bookmark that comes before the current time
    const sortedBookmarks = [...bookmarks].sort((a, b) => a.start - b.start);
    const { currentTime } = usePlayerStore.getState();
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
    const { currentTime } = usePlayerStore.getState();
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
    const { currentTime } = usePlayerStore.getState();
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
    const { currentTime } = usePlayerStore.getState();
    const start = loopStart !== null ? loopStart : 0;
    if (currentTime > start) {
      setLoopPoints(start, currentTime);
      // Enable looping when points are set
      if (!isLooping) {
        setIsLooping(true);
      }
    }
  };



  // Clear loop points function moved to waveform footer

  // Note: Loop jump functions removed as they're not used in the mobile interface

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-[50] pb-safe">
      <div className="px-3 pt-2 pb-3">

        {/* Main controls - reorganized for better vertical space usage */}
        <div className="space-y-4">
          {/* Primary controls row - play/pause and seek */}
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={seekBackward}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label={t("player.seekBackwardSeconds", {
                seconds: seekStepSeconds,
              })}
            >
              <SkipBack size={24} />
            </button>

            <button
              onClick={togglePlayPause}
              className="p-4 bg-purple-600 rounded-full text-white hover:bg-purple-700 shadow-md"
              aria-label={isPlaying ? t("player.pause") : t("player.play")}
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
              aria-label={t("player.seekForwardSeconds", {
                seconds: seekStepSeconds,
              })}
            >
              <SkipForward size={24} />
            </button>
            <button
              onClick={() => setShowSpeedControls(true)}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label={t("player.playbackSpeed")}
            >
              <span className="text-sm font-bold">{playbackRate}x</span>
            </button>
          </div>

          {/* Secondary controls row - features and tools */}
          <div className="flex items-center justify-center space-x-4">

            <button
              onClick={() => setAutoAdvanceBookmarks(!autoAdvanceBookmarks)}
              className={`p-3 rounded-full ${autoAdvanceBookmarks
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                : "hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              aria-label={
                autoAdvanceBookmarks
                  ? t("player.autoAdvanceOn")
                  : t("player.autoAdvanceOff")
              }
            >
              <ChevronsRight size={20} />
            </button>

            <button
              onClick={toggleLooping}
              className={`p-3 rounded-full ${isLooping
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                : "hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              aria-label={
                isLooping ? t("player.loopStatusOn") : t("player.loopStatusOff")
              }
            >
              <Repeat size={20} />
            </button>

            <button
              onClick={setLoopStartAtCurrentTime}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label={t("loop.setStart")}
            >
              <AlignStartHorizontal size={20} />
            </button>

            <button
              onClick={setLoopEndAtCurrentTime}
              className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label={t("loop.setEnd")}
            >
              <AlignEndHorizontal size={20} />
            </button>

            <button
              onClick={handleBookmarkAction}
              className={`p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 ${selectedBookmarkId
                ? "bg-purple-700 hover:bg-red-500/80 active:bg-red-500/90 text-white" // Active/Delete mode
                : loopStart !== null && loopEnd !== null
                  ? "bg-purple-600/50 hover:bg-purple-700 active:bg-purple-800 text-white" // Add mode
                  : "opacity-50 cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700" // Disabled - matches other disabled buttons
                }`}
              disabled={
                !selectedBookmarkId && !(loopStart !== null && loopEnd !== null)
              }
              aria-label={
                selectedBookmarkId
                  ? t("bookmarks.removeBookmarkTooltip")
                  : t("bookmarks.addBookmarkTooltip")
              }
            >
              <Bookmark size={20} />
            </button>
          </div>

          {/* Bookmark navigation row */}
          {bookmarks.length > 0 && (
            <div className="flex items-center justify-center space-x-6 pt-2">
              <button
                onClick={goToPreviousBookmark}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label={t("player.previousBookmark")}
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                {t("player.bookmarkNavigation")}
              </span>
              <button
                onClick={goToNextBookmark}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label={t("player.nextBookmark")}
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
          className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
          onClick={() => setShowVolumeDrawer(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 max-h-[80vh] bg-white dark:bg-gray-800 rounded-t-xl shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 w-12 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto my-2" />

            <div className="px-4 py-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">{t("player.volume")}</h2>
              <button
                onClick={() => setShowVolumeDrawer(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label={t("common.close")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 flex flex-col items-center">
              <div className="flex items-center justify-center mb-4">
                <button
                  onClick={toggleMute}
                  className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-4"
                  aria-label={
                    muted ? t("player.unmute") : t("player.mute")
                  }
                >
                  {muted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>
                <span className="text-lg font-medium">
                  {Math.round(volume * 100)}%
                </span>
              </div>

              <input
                type="range"
                value={muted ? 0 : volume}
                min={0}
                max={1}
                step={0.01}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-12 appearance-none bg-gradient-to-r from-purple-200 to-purple-500 rounded-full"
                style={{
                  WebkitAppearance: "none",
                  background: `linear-gradient(to right, #9333ea ${(muted ? 0 : volume) * 100
                    }%, #e2e8f0 ${(muted ? 0 : volume) * 100}%)`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Playback Speed Panel */}
      {showSpeedControls && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
          onClick={() => setShowSpeedControls(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 max-h-[80vh] bg-white dark:bg-gray-800 rounded-t-xl shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 w-12 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto my-2" />

            <div className="px-4 py-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">
                {t("player.playbackSpeed")}
              </h2>
              <button
                onClick={() => setShowSpeedControls(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label={t("common.close")}
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
