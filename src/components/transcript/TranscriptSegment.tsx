import {
  usePlayerStore,
  TranscriptSegment as TranscriptSegmentType,
  LoopBookmark,
} from "../../stores/playerStore";
import {
  Bookmark,
  Play,
  Repeat,
  Pause,
  Brain,
  Loader,
  CheckCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { ExplanationDrawer } from "./ExplanationDrawer";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface TranscriptSegmentProps {
  segment: TranscriptSegmentType;
}

// Global explanation state management
interface ExplanationState {
  text: string;
  status: "idle" | "loading" | "completed" | "error";
  result?: string;
  error?: string;
}

// Simple global state management (shared with ExplanationDrawer)
const globalExplanationStates = new Map<string, ExplanationState>();
const globalExplanationListeners = new Set<() => void>();

const setGlobalExplanationState = (
  text: string,
  state: Partial<ExplanationState>
) => {
  const existing = globalExplanationStates.get(text) || {
    text,
    status: "idle",
  };
  globalExplanationStates.set(text, { ...existing, ...state });
  globalExplanationListeners.forEach((listener) => listener());
};

const getGlobalExplanationState = (text: string): ExplanationState => {
  return globalExplanationStates.get(text) || { text, status: "idle" };
};

export const TranscriptSegment = ({ segment }: TranscriptSegmentProps) => {
  const { t } = useTranslation();
  const {
    currentTime,
    isPlaying,
    loopStart,
    loopEnd,
    isLooping,
    setCurrentTime,
    setIsPlaying,
    setLoopPoints,
    setIsLooping,
    addBookmark,
    deleteBookmark,
    getCurrentMediaBookmarks,
  } = usePlayerStore();

  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationState, setLocalExplanationState] =
    useState<ExplanationState>(getGlobalExplanationState(segment.text));

  // Subscribe to explanation state changes
  useEffect(() => {
    const updateState = () => {
      setLocalExplanationState(getGlobalExplanationState(segment.text));
    };

    globalExplanationListeners.add(updateState);

    return () => {
      globalExplanationListeners.delete(updateState);
    };
  }, [segment.text]);

  const isCurrentSegment =
    currentTime >= segment.startTime && currentTime <= segment.endTime;

  // Get current media bookmarks to check if this segment is bookmarked
  const bookmarks = getCurrentMediaBookmarks();
  const isBookmarked = bookmarks.some(
    (bookmark: LoopBookmark) =>
      Math.abs(bookmark.start - segment.startTime) < 0.5 &&
      Math.abs(bookmark.end - segment.endTime) < 0.5
  );

  const isCurrentlyLooping =
    isLooping &&
    loopStart !== null &&
    loopEnd !== null &&
    Math.abs(loopStart - segment.startTime) < 0.1 &&
    Math.abs(loopEnd - segment.endTime) < 0.1;

  const handlePlay = () => {
    setCurrentTime(segment.startTime);
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const handleToggleLoop = () => {
    if (isCurrentlyLooping) {
      setIsLooping(false);
      setLoopPoints(null, null);
    } else {
      setLoopPoints(segment.startTime, segment.endTime);
      setIsLooping(true);
      setCurrentTime(segment.startTime);
      if (!isPlaying) {
        setIsPlaying(true);
      }
    }
  };

  const handleToggleBookmark = () => {
    if (isBookmarked) {
      const bookmark = bookmarks.find(
        (b: LoopBookmark) =>
          Math.abs(b.start - segment.startTime) < 0.5 &&
          Math.abs(b.end - segment.endTime) < 0.5
      );
      if (bookmark) {
        deleteBookmark(bookmark.id);
      }
    } else {
      addBookmark({
        name: t("transcript.segmentBookmarkName", {
          time: segment.startTime.toFixed(1),
        }),
        start: segment.startTime,
        end: segment.endTime,
        annotation: segment.text,
      });
    }
  };

  const handleExplain = () => {
    const currentState = getGlobalExplanationState(segment.text);

    if (currentState.status === "completed") {
      // If already completed, just show the drawer
      setShowExplanation(true);
    } else if (currentState.status === "loading") {
      // If currently loading, show drawer to see progress
      setShowExplanation(true);
      toast(t("explanation.generating"), {
        icon: "⏳",
        duration: 2000,
      });
    } else {
      // Start new explanation
      setShowExplanation(true);
    }
  };

  // Function to start background explanation generation
  const startBackgroundExplanation = async () => {
    if (
      explanationState.status === "loading" ||
      explanationState.status === "completed"
    ) {
      return;
    }

    setGlobalExplanationState(segment.text, { status: "loading" });

    // Show toast notification
    const toastId = toast.loading(t("explanation.generatingInBackground"), {
      duration: 4000,
    });

    try {
      // Simulate API call - replace with actual AI service call
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Mock successful response
      const mockExplanation = t("explanation.mockExplanation", {
        snippet: `${segment.text.substring(0, 50)}...`,
      });

      setGlobalExplanationState(segment.text, {
        status: "completed",
        result: mockExplanation,
      });

      toast.success(t("explanation.explanationReady"), {
        id: toastId,
        duration: 2000,
      });
    } catch (error) {
      setGlobalExplanationState(segment.text, {
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : t("explanation.unknownError"),
      });

      toast.error(
        t("explanation.generationFailed", {
          message:
            error instanceof Error
              ? error.message
              : t("explanation.unknownError"),
        }),
        {
          id: toastId,
          duration: 3000,
        }
      );
    }
  };

  // Auto-start background explanation when user hovers over brain icon
  const handleBrainHover = () => {
    if (explanationState.status === "idle") {
      startBackgroundExplanation();
    }
  };

  const getBrainIcon = () => {
    switch (explanationState.status) {
      case "loading":
        return <Loader className="animate-spin" size={12} />;
      case "completed":
        return <CheckCircle className="text-green-600" size={12} />;
      case "error":
        return <Brain className="text-red-600" size={12} />;
      default:
        return <Brain size={12} />;
    }
  };

  const getBrainButtonClass = () => {
    const baseClass = "p-1 rounded transition-colors";

    switch (explanationState.status) {
      case "loading":
        return `${baseClass} text-blue-600 bg-blue-100 dark:bg-blue-900/30`;
      case "completed":
        return `${baseClass} text-green-600 bg-green-100 dark:bg-green-900/30`;
      case "error":
        return `${baseClass} text-red-600 bg-red-100 dark:bg-red-900/30`;
      default:
        return `${baseClass} text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400`;
    }
  };

  const getBrainTooltip = () => {
    switch (explanationState.status) {
      case "loading":
        return t("explanation.generating");
      case "completed":
        return t("explanation.viewExplanation");
      case "error":
        return t("explanation.errorRetry");
      default:
        return t("transcript.explainWithAI");
    }
  };

  return (
    <div
      className={`p-3 rounded-lg border transition-all duration-200 ${
        isCurrentSegment
          ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700"
          : "bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-750"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <span>
            {Math.floor(segment.startTime / 60)}:
            {(segment.startTime % 60).toFixed(1).padStart(4, "0")}
          </span>
          <span>→</span>
          <span>
            {Math.floor(segment.endTime / 60)}:
            {(segment.endTime % 60).toFixed(1).padStart(4, "0")}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handlePlay}
            className={`p-1 rounded transition-colors ${
              isCurrentSegment
                ? "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30"
                : "text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
            }`}
            title={t("transcript.playSegment")}
          >
            {isCurrentSegment && isPlaying ? (
              <Pause size={12} />
            ) : (
              <Play size={12} />
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
                ? t("transcript.stopLoopingSegment")
                : t("transcript.loopSegment")
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
                ? t("transcript.removeBookmark")
                : t("transcript.createBookmark")
            }
          >
            <Bookmark size={12} fill={isBookmarked ? "currentColor" : "none"} />
          </button>

          <button
            onClick={handleExplain}
            onMouseEnter={handleBrainHover}
            className={getBrainButtonClass()}
            title={getBrainTooltip()}
          >
            {getBrainIcon()}
          </button>
        </div>
      </div>

      <p className="text-gray-800 dark:text-gray-200">{segment.text}</p>

      <ExplanationDrawer
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
        text={segment.text}
      />
    </div>
  );
};
