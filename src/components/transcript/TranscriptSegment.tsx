import {
  usePlayerStore,
  TranscriptSegment as TranscriptSegmentType,
} from "../../stores/playerStore";
import { Bookmark, Play, Repeat, Pause, Brain } from "lucide-react";
import { toast } from "react-hot-toast";
import { useState } from "react";
import { ExplanationDrawer } from "./ExplanationDrawer";

interface TranscriptSegmentProps {
  segment: TranscriptSegmentType;
}

export const TranscriptSegment = ({ segment }: TranscriptSegmentProps) => {
  const [showExplanation, setShowExplanation] = useState(false);

  const {
    setCurrentTime,
    createBookmarkFromTranscript,
    currentTime,
    getCurrentMediaBookmarks,
    setIsPlaying,
    setIsLooping,
    setLoopPoints,
    isLooping,
    isPlaying,
  } = usePlayerStore();

  // Get current media bookmarks to check if this segment is bookmarked
  const bookmarks = getCurrentMediaBookmarks();

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Jump to this segment's time and start playing
  const handleJumpToTime = () => {
    // Cancel any active A-B loop to allow the selected line to play with highest priority
    setIsLooping(false);

    setCurrentTime(segment.startTime);
    setIsPlaying(true); // Start playback immediately
    toast.success(`Playing from ${formatTime(segment.startTime)}`);
  };

  // Pause playback
  const handlePausePlayback = () => {
    setIsPlaying(false);
    toast.success("Playback paused");
  };

  // Toggle looping for this segment
  const handleToggleLoop = () => {
    const playerState = usePlayerStore.getState();
    const loopStart = playerState.loopStart;
    const loopEnd = playerState.loopEnd;

    // If we're already looping this segment, turn off looping
    if (
      isLooping &&
      loopStart !== null &&
      loopEnd !== null &&
      Math.abs(loopStart - segment.startTime) < 0.1 &&
      Math.abs(loopEnd - segment.endTime) < 0.1
    ) {
      setIsLooping(false);
      toast.success("Loop disabled");
    } else {
      // Set loop points to this segment's start and end times
      setLoopPoints(segment.startTime, segment.endTime);
      setIsLooping(true);
      // Jump to start of the segment
      setCurrentTime(segment.startTime);
      setIsPlaying(true);
      toast.success(
        `Looping: ${formatTime(segment.startTime)} - ${formatTime(
          segment.endTime
        )}`
      );
    }
  };

  // Toggle bookmark for this segment
  const handleToggleBookmark = () => {
    // If already bookmarked, find and delete the bookmark
    if (isBookmarked) {
      // Find the bookmark ID that matches this segment
      const bookmarkToDelete = bookmarks.find(
        (bookmark) =>
          Math.abs(bookmark.start - segment.startTime) < 0.5 &&
          Math.abs(bookmark.end - segment.endTime) < 0.5
      );

      if (bookmarkToDelete) {
        // Use the deleteBookmark function from the store
        usePlayerStore.getState().deleteBookmark(bookmarkToDelete.id);
        toast.success("Bookmark removed");
      }
    } else {
      // Create a new bookmark
      createBookmarkFromTranscript(segment.id);
    }
  };

  // Handle explain button click
  const handleExplain = () => {
    setShowExplanation(true);
  };

  // Check if this segment has an associated bookmark
  const isBookmarked = bookmarks.some(
    (bookmark) =>
      Math.abs(bookmark.start - segment.startTime) < 0.5 &&
      Math.abs(bookmark.end - segment.endTime) < 0.5
  );

  // Check if this segment is currently being looped
  const playerState = usePlayerStore.getState();
  const loopStart = playerState.loopStart;
  const loopEnd = playerState.loopEnd;

  const isCurrentlyLooping =
    isLooping &&
    loopStart !== null &&
    loopEnd !== null &&
    Math.abs(loopStart - segment.startTime) < 0.1 &&
    Math.abs(loopEnd - segment.endTime) < 0.1;

  // Determine if this segment is currently active
  const isActive =
    currentTime >= segment.startTime && currentTime <= segment.endTime;

  // Determine if we should show pause button (when segment is active and audio is playing)
  const shouldShowPauseButton = isActive && isPlaying;

  return (
    <>
      <div
        className={`p-2 rounded-md ${
          isActive
            ? "bg-purple-50 dark:bg-purple-900/20 border-l-2 border-purple-500"
            : "bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-800/50"
        } transition-colors`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
          </span>

          <div className="flex space-x-1">
            <button
              onClick={
                shouldShowPauseButton ? handlePausePlayback : handleJumpToTime
              }
              className={`p-1 rounded transition-colors ${
                isActive
                  ? "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30"
                  : "text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
              }`}
              title={
                shouldShowPauseButton
                  ? "Pause playback"
                  : "Play from this segment"
              }
            >
              {shouldShowPauseButton ? (
                <Pause size={12} fill="currentColor" />
              ) : (
                <Play size={12} fill={isActive ? "currentColor" : "none"} />
              )}
            </button>

            <button
              onClick={handleToggleLoop}
              className={`p-1 rounded transition-colors ${
                isCurrentlyLooping
                  ? "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30"
                  : "text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
              }`}
              title={
                isCurrentlyLooping
                  ? "Stop looping this segment"
                  : "Loop this segment"
              }
            >
              <Repeat
                size={12}
                fill={isCurrentlyLooping ? "currentColor" : "none"}
              />
            </button>

            <button
              onClick={handleToggleBookmark}
              className={`p-1 rounded transition-colors ${
                isBookmarked
                  ? "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30"
                  : "text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
              }`}
              title={
                isBookmarked
                  ? "Remove bookmark for this segment"
                  : "Create bookmark from this segment"
              }
            >
              <Bookmark
                size={12}
                fill={isBookmarked ? "currentColor" : "none"}
              />
            </button>

            <button
              onClick={handleExplain}
              className="p-1 rounded transition-colors text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
              title="Explain this text with AI"
            >
              <Brain size={12} />
            </button>
          </div>
        </div>

        <p className="text-gray-800 dark:text-gray-200">{segment.text}</p>
      </div>

      <ExplanationDrawer
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
        text={segment.text}
      />
    </>
  );
};
