import { usePlayerStore } from "../../stores/playerStore";
import { Subtitles } from "lucide-react";

export const TranscriptToggle = () => {
  const { showTranscript, toggleShowTranscript, getCurrentMediaTranscripts } =
    usePlayerStore();
  const transcriptSegments = getCurrentMediaTranscripts();
  const hasTranscriptData = transcriptSegments.length > 0;

  return (
    <button
      onClick={toggleShowTranscript}
      disabled={!hasTranscriptData}
      className={`p-1.5 rounded-full ${
        showTranscript
          ? "bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
          : hasTranscriptData
          ? "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
          : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50"
      } shadow-sm transition-colors relative`}
      aria-label={
        !hasTranscriptData
          ? "No transcript available"
          : showTranscript
          ? "Hide transcript"
          : "Show media transcript"
      }
      title={
        !hasTranscriptData
          ? "No transcript available"
          : showTranscript
          ? "Hide transcript"
          : "Show media transcript"
      }
    >
      <Subtitles size={16} />
      {hasTranscriptData && !showTranscript && (
        <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {transcriptSegments.length > 9 ? "9+" : transcriptSegments.length}
        </span>
      )}
    </button>
  );
};
