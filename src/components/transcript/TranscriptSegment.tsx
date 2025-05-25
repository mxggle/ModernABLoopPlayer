import {
  usePlayerStore,
  TranscriptSegment as TranscriptSegmentType,
} from "../../stores/playerStore";
import { Bookmark, Play } from "lucide-react";
import { toast } from "react-hot-toast";

interface TranscriptSegmentProps {
  segment: TranscriptSegmentType;
}

export const TranscriptSegment = ({ segment }: TranscriptSegmentProps) => {
  const { setCurrentTime, createBookmarkFromTranscript, currentTime } =
    usePlayerStore();

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Jump to this segment's time
  const handleJumpToTime = () => {
    setCurrentTime(segment.startTime);
    toast.success(`Jumped to ${formatTime(segment.startTime)}`);
  };

  // Create a bookmark from this segment
  const handleCreateBookmark = () => {
    createBookmarkFromTranscript(segment.id);
  };

  // Determine if this segment is currently active
  const isActive =
    currentTime >= segment.startTime && currentTime <= segment.endTime;

  return (
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
            onClick={handleJumpToTime}
            className="p-1 rounded text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
            title="Jump to this segment"
          >
            <Play size={12} />
          </button>

          <button
            onClick={handleCreateBookmark}
            className="p-1 rounded text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
            title="Create bookmark from this segment"
          >
            <Bookmark size={12} />
          </button>
        </div>
      </div>

      <p className="text-gray-800 dark:text-gray-200">{segment.text}</p>
    </div>
  );
};
