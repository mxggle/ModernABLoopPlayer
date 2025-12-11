import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import {
  Loader,
  Save,
  Trash,
  Play,
  Bookmark,
  FileAudio,
  Key,
  Repeat,
  Pause,
  Brain,
  Settings,
  Edit,
  PlayCircle,
  Sidebar,
  PanelLeftClose,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { OpenAI } from "openai";
import { TranscriptUploader } from "./TranscriptUploader";
import { ExplanationDrawer } from "./ExplanationDrawer";
import { useNavigate } from "react-router-dom";
import { breakIntoSentences as utilBreakIntoSentences } from "../../utils/sentenceBreaker";

import { TranscriptSegment as TranscriptSegmentType } from "../../stores/playerStore";
import { encodeWAV } from "../../utils/wavEncoder";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";


// Define interfaces for OpenAI Whisper API response
interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

interface WhisperResponse {
  task: string;
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
}

// TranscriptSegmentItem component
const TranscriptSegmentItem = ({
  segment,
}: {
  segment: TranscriptSegmentType;
}) => {
  const { t } = useTranslation();
  const [showExplanation, setShowExplanation] = useState(false);

  const {
    setCurrentTime,
    createBookmarkFromTranscript,
    currentTime,
    setIsPlaying,
    getCurrentMediaBookmarks,
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

    // Add a small buffer before the segment start to prevent cutoff
    const bufferTime = 0.15; // 150ms buffer to catch any lead-in audio
    const startTime = Math.max(0, segment.startTime - bufferTime);

    setCurrentTime(startTime);
    setIsPlaying(true); // Start playback immediately
  };

  // Pause playback
  const handlePausePlayback = () => {
    setIsPlaying(false);
  };

  // Get player state for checking loop status
  const playerState = usePlayerStore.getState();
  const currentLoopStart = playerState.loopStart;
  const currentLoopEnd = playerState.loopEnd;

  // Check if this segment is currently being looped
  const bufferTime = 0.15; // Same buffer as used in loop creation
  const expectedLoopStart = Math.max(0, segment.startTime - bufferTime);

  const isCurrentlyLooping =
    isLooping &&
    currentLoopStart !== null &&
    currentLoopEnd !== null &&
    Math.abs(currentLoopStart - expectedLoopStart) < 0.1 &&
    Math.abs(currentLoopEnd - segment.endTime) < 0.1;

  // Determine if this segment is currently active
  // For looped segments, consider the buffer zone as part of the active range
  // But ensure only the looped segment gets priority when looping is active
  const isActive = isCurrentlyLooping
    ? currentTime >= expectedLoopStart && currentTime <= segment.endTime
    : !isLooping &&
    currentTime >= segment.startTime &&
    currentTime <= segment.endTime;

  // Determine if we should show pause button (when segment is active and audio is playing)
  const shouldShowPauseButton = isActive && isPlaying;

  // Toggle looping for this segment
  const handleToggleLoop = () => {
    // If we're already looping this segment, turn off looping
    if (
      isLooping &&
      currentLoopStart !== null &&
      currentLoopEnd !== null &&
      Math.abs(currentLoopStart - expectedLoopStart) < 0.1 &&
      Math.abs(currentLoopEnd - segment.endTime) < 0.1
    ) {
      setIsLooping(false);
    } else {
      // Add a small buffer before the segment start to prevent cutoff
      const bufferTime = 0.15; // 150ms buffer to catch any lead-in audio
      const loopStartTime = Math.max(0, segment.startTime - bufferTime);

      // Set loop points to this segment's start and end times
      setLoopPoints(loopStartTime, segment.endTime);
      setIsLooping(true);
      // Jump to start of the segment (with buffer)
      setCurrentTime(loopStartTime);
      setIsPlaying(true);
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

  return (
    <>
      <div
        className={`p-2 rounded-md ${isActive
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
              className={`p-1 rounded transition-colors ${isActive
                ? "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30"
                : "text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                }`}
              title={t(shouldShowPauseButton ? "transcript.pausePlayback" : "transcript.playSegment")}
            >
              {shouldShowPauseButton ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill={isActive ? "currentColor" : "none"} />
              )}
            </button>

            <button
              onClick={handleToggleLoop}
              className={`p-1 rounded transition-colors ${isCurrentlyLooping
                ? "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30"
                : "text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                }`}
              title={t(isCurrentlyLooping ? "transcript.stopLoopingSegment" : "transcript.loopSegment")}
            >
              <Repeat
                size={18}
                fill={isCurrentlyLooping ? "currentColor" : "none"}
              />
            </button>

            <button
              onClick={handleToggleBookmark}
              className={`p-1 rounded transition-colors ${isBookmarked
                ? "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30"
                : "text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                }`}
              title={t(isBookmarked ? "transcript.removeBookmark" : "transcript.createBookmark")}
            >
              <Bookmark
                size={18}
                fill={isBookmarked ? "currentColor" : "none"}
              />
            </button>

            <button
              onClick={handleExplain}
              className="p-1 rounded transition-colors text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
              title={t("transcript.explainWithAI")}
            >
              <Brain size={18} />
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

// TranscriptControlsPanel component
const TranscriptControlsPanel = () => {
  const { t } = useTranslation();
  const { transcriptLanguage, setTranscriptLanguage, exportTranscript } =
    usePlayerStore();

  const LANGUAGE_OPTIONS = [
    { value: "en-US", label: t("transcript.languages.en-US") },
    { value: "en-GB", label: t("transcript.languages.en-GB") },
    { value: "es-ES", label: t("transcript.languages.es-ES") },
    { value: "fr-FR", label: t("transcript.languages.fr-FR") },
    { value: "de-DE", label: t("transcript.languages.de-DE") },
    { value: "ja-JP", label: t("transcript.languages.ja-JP") },
    { value: "ko-KR", label: t("transcript.languages.ko-KR") },
    { value: "zh-CN", label: t("transcript.languages.zh-CN") },
    { value: "ru-RU", label: t("transcript.languages.ru-RU") },
  ];

  return (
    <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center">
        <label
          htmlFor="transcript-language"
          className="text-xs text-gray-600 dark:text-gray-400 mr-2"
        >
          {t("transcript.language")}:
        </label>
        <select
          id="transcript-language"
          value={transcriptLanguage}
          onChange={(e) => setTranscriptLanguage(e.target.value)}
          className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-700 dark:text-gray-300"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-1 text-xs">
        <button
          onClick={() => {
            const content = exportTranscript("txt");
            if (!content) return;

            // Create a blob and download link
            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `transcript.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success(t("transcript.exportSuccess", { format: "TXT" }));
          }}
          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
        >
          {t("transcript.exportAsTXT")}
        </button>
        <button
          onClick={() => {
            const content = exportTranscript("srt");
            if (!content) return;

            // Create a blob and download link
            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `transcript.srt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success(t("transcript.exportSuccess", { format: "SRT" }));
          }}
          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
        >
          {t("transcript.exportAsSRT")}
        </button>
        <button
          onClick={() => {
            const content = exportTranscript("vtt");
            if (!content) return;

            // Create a blob and download link
            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `transcript.vtt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success(t("transcript.exportSuccess", { format: "VTT" }));
          }}
          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
        >
          {t("transcript.exportAsVTT")}
        </button>
      </div>
    </div>
  );
};

export const TranscriptPanel = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    getCurrentMediaTranscripts,
    isTranscribing,
    currentFile,
    currentYouTube,
    toggleTranscribing,
    addTranscriptSegment,
    clearTranscript,
    exportTranscript,
    getCurrentMediaBookmarks,
    updateBookmark,
    selectedBookmarkId,
    loadBookmark,
    setSelectedBookmarkId,
    setCurrentTime,
    setIsPlaying,
  } = usePlayerStore();

  const transcriptSegments = getCurrentMediaTranscripts();
  const bookmarks = getCurrentMediaBookmarks();

  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState<number>(0);
  const [editEnd, setEditEnd] = useState<number>(0);
  const [editAnnotation, setEditAnnotation] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Sync active tab with selected bookmark from store (e.g. from waveform interactions)
  useEffect(() => {
    setActiveTabId(selectedBookmarkId);
  }, [selectedBookmarkId]);

  // Filter segments based on active tab
  const filteredSegments = activeTabId
    ? transcriptSegments.filter((segment) => {
      const bookmark = bookmarks.find((b) => b.id === activeTabId);
      if (!bookmark) return false;
      // Allow some overlap (e.g. 0.5s)
      const elementStart = segment.startTime;
      const elementEnd = segment.endTime;
      return (
        // Segment roughly inside bookmark
        (elementStart >= bookmark.start - 0.5 && elementEnd <= bookmark.end + 0.5) ||
        // Or segment covers bookmark (unlikely but possible for short bookmarks)
        (elementStart <= bookmark.start && elementEnd >= bookmark.end)
      );
    })
    : transcriptSegments;


  const handleTabSelect = (id: string | null) => {
    if (id) {
      // If switching to a specific bookmark tab
      const bookmark = bookmarks.find((b) => b.id === id);
      if (bookmark) {
        // Use loadBookmark to sync store state (loop points, selected ID, etc.)
        loadBookmark(id);
        setCurrentTime(bookmark.start);
      }
    } else {
      // If switching to "Full Transcript"
      setSelectedBookmarkId(null);
    }
  };

  const handlePlayBookmark = (e: React.MouseEvent, bookmarkId: string) => {
    e.stopPropagation();
    const bookmark = bookmarks.find((b) => b.id === bookmarkId);
    if (bookmark) {
      loadBookmark(bookmarkId);
      setCurrentTime(bookmark.start);
      setIsPlaying(true);
    }
  };

  const handleEditBookmark = (e: React.MouseEvent, bookmark: any) => {
    e.stopPropagation();
    setEditingBookmarkId(bookmark.id);
    setEditName(bookmark.name);
    setEditStart(bookmark.start);
    setEditEnd(bookmark.end);
    setEditAnnotation(bookmark.annotation || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingBookmarkId) return;

    if (!editName.trim()) {
      toast.error(t("bookmarks.nameCannotBeEmpty"));
      return;
    }

    updateBookmark(editingBookmarkId, {
      name: editName.trim(),
      start: editStart,
      end: editEnd,
      annotation: editAnnotation.trim(),
    });

    setIsEditDialogOpen(false);
    setEditingBookmarkId(null);
    toast.success(t("bookmarks.bookmarkUpdated"));
  };

  const handleTranscribeBookmark = () => {
    const bookmark = bookmarks.find((b) => b.id === activeTabId);
    if (bookmark) {
      transcribeMedia({ start: bookmark.start, end: bookmark.end });
    }
  };

  const handleTranscribeFull = () => {
    transcribeMedia();
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const openaiRef = useRef<OpenAI | null>(null);

  // Initialize OpenAI client when API key is provided
  useEffect(() => {
    if (apiKey) {
      openaiRef.current = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true, // This is necessary for client-side use
      });
    }
  }, [apiKey]);

  // Function to handle API key input
  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem("openai_api_key", apiKey);
      setShowApiKeyInput(false);
      toast.success(t("transcript.apiKeySaved"));

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent("ai-settings-updated"));
    }
  };

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("openai_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }

    // Listen for AI settings updates from the AI Settings page
    const handleSettingsUpdate = () => {
      const updatedApiKey = localStorage.getItem("openai_api_key");
      if (updatedApiKey) {
        setApiKey(updatedApiKey);
      } else {
        setApiKey("");
      }
    };

    window.addEventListener("ai-settings-updated", handleSettingsUpdate);

    return () => {
      window.removeEventListener("ai-settings-updated", handleSettingsUpdate);
    };
  }, []);

  const handleOpenAISettings = () => {
    navigate("/ai-settings");
  };

  // Function to extract audio from the media file
  const extractAudioFromMedia = async (range?: { start: number; end: number }): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!currentFile) {
        reject(new Error(t("transcript.noFileLoaded")));
        return;
      }

      // For audio files, we can use them directly or slice them if range provided
      if (currentFile.type.includes("audio")) {
        fetch(currentFile.url)
          .then((response) => response.arrayBuffer())
          .then(async (arrayBuffer) => {
            // If no range, return original blob if possible, or decode/encode to ensure WAV
            // But to support detailed range slicing, we should always decode

            try {
              const audioContext = new AudioContext();
              const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

              let startFrame = 0;
              let endFrame = audioBuffer.length;

              if (range) {
                startFrame = Math.floor(range.start * audioBuffer.sampleRate);
                endFrame = Math.floor(range.end * audioBuffer.sampleRate);
                // Ensure bounds
                startFrame = Math.max(0, startFrame);
                endFrame = Math.min(audioBuffer.length, endFrame);
              }

              const frameCount = endFrame - startFrame;
              if (frameCount <= 0) {
                reject(new Error("Invalid time range"));
                return;
              }

              // Extract channel data (mix down to mono if needed, or just take left channel for speech)
              // Better to mix down for speech recognition
              const channel0 = audioBuffer.getChannelData(0);
              const slicedData = new Float32Array(frameCount);

              if (audioBuffer.numberOfChannels > 1) {
                const channel1 = audioBuffer.getChannelData(1);
                // Simple average mixdown
                for (let i = 0; i < frameCount; i++) {
                  const idx = startFrame + i;
                  slicedData[i] = (channel0[idx] + channel1[idx]) / 2;
                }
              } else {
                // Mono copy
                for (let i = 0; i < frameCount; i++) {
                  slicedData[i] = channel0[startFrame + i];
                }
              }

              // Encode to WAV
              const wavBlob = encodeWAV(slicedData, audioBuffer.sampleRate);
              resolve(wavBlob);

            } catch (err) {
              console.error("Error processing audio:", err);
              reject(err);
            }
          })
          .catch((error) => reject(error));
        return;
      }

      // For video files, we need to extract the audio
      if (currentFile.type.includes("video")) {
        const video = document.createElement("video");
        video.src = currentFile.url;

        // Create an audio context and source node
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        const source = audioContext.createMediaElementSource(video);
        source.connect(destination);

        // Create a media recorder to capture the audio
        const mediaRecorder = new MediaRecorder(destination.stream);
        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/wav" });
          resolve(blob);
        };

        // Start recording and playing the video
        video.onloadedmetadata = () => {
          const startTime = range ? range.start : 0;
          const duration = range ? (range.end - range.start) : video.duration;

          video.currentTime = startTime;

          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            video.play();
            mediaRecorder.start();

            // Stop recording after the duration
            setTimeout(() => {
              video.pause();
              mediaRecorder.stop();
              audioContext.close();
              video.remove(); // Clean up
            }, duration * 1000);
          };

          video.addEventListener("seeked", onSeeked);
        };

        video.onerror = () => {
          reject(new Error(t("transcript.errorLoadingVideo")));
        };

        return;
      }

      reject(new Error(t("transcript.unsupportedFileType")));
    });
  };

  // Function to transcribe the current media using OpenAI's Whisper API
  const transcribeMedia = async (range?: { start: number; end: number }) => {
    // Check if we have media to transcribe
    if (!currentFile && !currentYouTube) {
      toast.error(t("transcript.noMediaToTranscribe"));
      return;
    }

    // Check if API key is provided
    if (!apiKey) {
      setShowApiKeyInput(true);
      return;
    }

    // Check if OpenAI client is initialized
    if (!openaiRef.current) {
      toast.error(t("transcript.openaiClientNotInitialized"));
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage("");

      // Only clear if doing full transcript
      if (!range) {
        clearTranscript();
      }

      toggleTranscribing(); // Set isTranscribing to true
      setProcessingProgress(10);

      // For YouTube videos, we can't directly access the audio
      // We would need a server-side component to download and process the video
      if (currentYouTube) {
        toast.error(t("transcript.youtubeTranscriptionWarning"));
        await simulateTranscription();
        return;
      }

      // Extract audio from the media file
      const audioBlob = await extractAudioFromMedia(range);
      setProcessingProgress(30);

      // Convert the blob to a File object for the OpenAI API
      const audioFile = new File([audioBlob], "audio.wav", {
        type: "audio/wav",
      });

      setProcessingProgress(50);

      // Enhanced Whisper API call with better sentence segmentation parameters
      let response;
      try {
        // Try with advanced parameters first - request both word and segment timestamps
        response = await openaiRef.current.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
          response_format: "verbose_json",
          timestamp_granularities: ["word", "segment"],
          prompt:
            "Please transcribe this audio with proper sentence breaks and punctuation. Break long sentences into shorter, more natural segments.", // Prompt to encourage better sentence breaking
          temperature: 0.0, // Lower temperature for more consistent results
        });
      } catch (advancedError) {
        console.warn(
          "Advanced Whisper parameters failed, falling back to basic:",
          advancedError
        );

        // Fallback to basic parameters
        response = await openaiRef.current.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
          response_format: "verbose_json",
          temperature: 0.0,
        });
      }

      setProcessingProgress(80);

      // Process the response with enhanced continuous segment creation
      const whisperResponse = response as unknown as WhisperResponse & {
        words?: Array<{
          word: string;
          start: number;
          end: number;
        }>;
      };

      if (whisperResponse && whisperResponse.segments) {
        // Use the enhanced continuous segments approach
        const continuousSegments = createContinuousSegments(whisperResponse);
        const startTimeOffset = range ? range.start : 0;

        continuousSegments.forEach((segment, index) => {
          addTranscriptSegment({
            text: segment.text.trim(),
            startTime: Math.max(0, segment.start + startTimeOffset),
            endTime: Math.max(segment.start + startTimeOffset, segment.end + startTimeOffset),
            confidence: Math.exp(segment.avg_logprob),
            isFinal: true,
          });

          // Update progress
          const progress =
            Math.round(((index + 1) / continuousSegments.length) * 20) + 80;
          setProcessingProgress(Math.min(progress, 100));
        });
      } else {
        // If no segments are returned, use the full transcript with basic sentence breaking
        const sentences = await utilBreakIntoSentences(response.text);
        const startTimeOffset = range ? range.start : 0;

        sentences.forEach((sentence, index) => {
          const startTime = (index * 30) / sentences.length; // Estimate timing
          const endTime = ((index + 1) * 30) / sentences.length;

          addTranscriptSegment({
            text: sentence.trim(),
            startTime: Math.max(0, startTime + startTimeOffset),
            endTime: Math.max(startTime + startTimeOffset, endTime + startTimeOffset), // Ensure at least 1s duration
            confidence: 0.95,
            isFinal: true,
          });
        });
      }

      setProcessingProgress(100);
    } catch (error) {
      console.error("Error transcribing media:", error);

      // More detailed error handling
      let errorMessage = t("transcript.transcriptionFailed");

      if (error instanceof Error) {
        if (
          error.message.includes("401") ||
          error.message.includes("Unauthorized")
        ) {
          errorMessage += t("transcript.invalidApiKey");
        } else if (
          error.message.includes("429") ||
          error.message.includes("rate limit")
        ) {
          errorMessage += t("transcript.rateLimitExceeded");
        } else if (
          error.message.includes("413") ||
          error.message.includes("too large")
        ) {
          errorMessage += t("transcript.audioFileTooLarge");
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage += t("transcript.networkError");
        } else {
          errorMessage += t("transcript.genericError", { message: error.message });
        }
      } else {
        errorMessage += t("transcript.unknownError");
      }

      setErrorMessage(errorMessage);
      toast.error(errorMessage);

      // Fall back to simulation for demo purposes
      await simulateTranscription();
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to create intelligent segments from word-level timestamps
  // TEMPORARILY DISABLED
  /*
  const createIntelligentSegments = async (
    words: Array<{ word: string; start: number; end: number }>,
    fullText: string
  ) => {
    console.log("Creating intelligent segments from", words.length, "words");
    console.log("Full text:", fullText);

    // Instead of trying to match sentences to words, let's use a simpler approach:
    // 1. Create segments based on natural pauses in the word timestamps
    // 2. Then apply sentence breaking to the text within reasonable time boundaries
    // 3. Bridge gaps to create continuous timing for better loop functionality

    const segments = [];
    const pauseThreshold = 0.8; // If there's more than 0.8s gap between words, consider it a segment break

    let currentSegmentWords = [];
    let currentSegmentText = "";
    let lastSegmentEndTime = 0; // Track the end time of the last segment to ensure continuity

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const nextWord = words[i + 1];

      currentSegmentWords.push(word);
      currentSegmentText += word.word + " ";

      // Check if this should be the end of a segment
      const shouldEndSegment =
        !nextWord || // Last word
        nextWord.start - word.end > pauseThreshold || // Long pause
        currentSegmentText.length > 200; // Segment getting too long

      if (shouldEndSegment && currentSegmentWords.length > 0) {
        // Use continuous timing - start where last segment ended, or at the first word's start time
        const segmentStart =
          lastSegmentEndTime > 0
            ? lastSegmentEndTime
            : currentSegmentWords[0].start;
        const naturalSegmentEnd =
          currentSegmentWords[currentSegmentWords.length - 1].end;

        // If there's a next word, extend this segment to bridge the gap
        const segmentEnd = nextWord ? nextWord.start : naturalSegmentEnd;

        // Apply sentence breaking to this segment's text
        const sentences = utilBreakIntoSentences(currentSegmentText.trim());

        if (sentences.length > 1) {
          // Multiple sentences in this segment - split the timing proportionally
          const totalDuration = segmentEnd - segmentStart;
          const totalLength = currentSegmentText.trim().length;

          let currentTime = segmentStart;

          sentences.forEach((sentence, sentenceIndex) => {
            const sentenceLength = sentence.length;
            const sentenceDuration = Math.max(
              0.5,
              (sentenceLength / totalLength) * totalDuration
            );
            let endTime =
              sentenceIndex === sentences.length - 1
                ? segmentEnd
                : currentTime + sentenceDuration;

            // Ensure minimum duration of 0.3 seconds but don't create gaps
            const minDuration = 0.3;
            const actualDuration = endTime - currentTime;
            if (actualDuration < minDuration) {
              endTime = currentTime + minDuration;
            }

            segments.push({
              text: sentence,
              startTime: currentTime,
              endTime: endTime,
              confidence: 0.9,
            });

            console.log(
              `Created sentence segment: "${sentence}" (${currentTime}s - ${endTime}s)`
            );
            currentTime = endTime; // No gap - next sentence starts exactly where this one ends
          });

          lastSegmentEndTime = segmentEnd;
        } else {
          // Single sentence - use the full segment timing
          segments.push({
            text: currentSegmentText.trim(),
            startTime: segmentStart,
            endTime: segmentEnd,
            confidence: 0.9,
          });

          console.log(
            `Created single segment: "${currentSegmentText.trim()}" (${segmentStart}s - ${segmentEnd}s)`
          );

          lastSegmentEndTime = segmentEnd;
        }

        // Reset for next segment
        currentSegmentWords = [];
        currentSegmentText = "";
      }
    }

    console.log("Final segments:", segments);
    return segments;
  };
  */

  // Helper function to post-process segments for better sentence breaking
  // TEMPORARILY DISABLED
  /*
  const postProcessSegments = async (segments: WhisperSegment[]) => {
    const processedSegments = [];

    for (const segment of segments) {
      // If segment is too long, try to break it into sentences
      if (segment.text.length > 100) {
        const sentences = await utilBreakIntoSentences(segment.text);

        if (sentences.length > 1) {
          const duration = segment.end - segment.start;
          const timePerSentence = duration / sentences.length;

          sentences.forEach((sentence, index) => {
            const segmentStart = segment.start + index * timePerSentence;
            const segmentEnd = segment.start + (index + 1) * timePerSentence;

            // Ensure minimum duration of 0.3 seconds but don't create gaps
            const minDuration = 0.3;
            const actualDuration = segmentEnd - segmentStart;
            const finalEnd =
              actualDuration < minDuration
                ? segmentStart + minDuration
                : segmentEnd;

            processedSegments.push({
              ...segment,
              text: sentence,
              start: segmentStart,
              end: finalEnd,
            });
          });
        } else {
          processedSegments.push(segment);
        }
      } else {
        processedSegments.push(segment);
      }
    }

    return processedSegments;
  };
  */

  // Enhanced function to create continuous segments from Whisper response
  const createContinuousSegments = (
    whisperResponse: WhisperResponse & {
      words?: Array<{
        word: string;
        start: number;
        end: number;
      }>;
    }
  ) => {
    console.log("Creating continuous segments from Whisper response");

    // Strategy 1: Use word-level timestamps if available (most accurate)
    if (whisperResponse.words && whisperResponse.words.length > 0) {
      console.log("Using word-level timestamps for better accuracy");
      return createSegmentsFromWords(
        whisperResponse.words,
        whisperResponse.segments
      );
    }

    // Strategy 2: Fill gaps in segment-level timestamps
    console.log("Using segment-level timestamps with gap filling");
    return fillSegmentGaps(whisperResponse.segments);
  };

  // Create segments from word-level timestamps (most accurate approach)
  const createSegmentsFromWords = (
    words: Array<{ word: string; start: number; end: number }>,
    originalSegments: WhisperSegment[]
  ) => {
    const segments: WhisperSegment[] = [];
    const maxSegmentDuration = 10; // Maximum 10 seconds per segment
    const minSegmentDuration = 1; // Minimum 1 second per segment

    let wordIndex = 0;

    for (const originalSegment of originalSegments) {
      // Find words that belong to this segment based on timing overlap
      const segmentWords = [];
      const segmentStartTime = originalSegment.start;
      const segmentEndTime = originalSegment.end;

      // Collect words that fall within this segment's timeframe
      while (wordIndex < words.length) {
        const word = words[wordIndex];

        // Check if word overlaps with current segment
        if (word.start >= segmentStartTime && word.start <= segmentEndTime) {
          segmentWords.push(word);
          wordIndex++;
        } else if (word.start > segmentEndTime) {
          // Word is beyond current segment, break to next segment
          break;
        } else {
          // Word is before current segment, skip it
          wordIndex++;
        }
      }

      if (segmentWords.length === 0) {
        // No words found, use original segment with gap filling
        const adjustedStart: number =
          segments.length > 0
            ? segments[segments.length - 1].end
            : originalSegment.start;
        segments.push({
          ...originalSegment,
          start: adjustedStart,
          end: Math.max(
            adjustedStart + minSegmentDuration,
            originalSegment.end
          ),
        });
        continue;
      }

      // Create continuous segments from words
      let segmentStart = segmentWords[0].start;
      const segmentEnd = segmentWords[segmentWords.length - 1].end;

      // Ensure continuity with previous segment (aggressive anti-cutoff approach)
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        const gap = segmentStart - lastSegment.end;

        if (gap > 0) {
          if (gap <= 1.0) {
            // Small to medium gaps - fill almost completely
            lastSegment.end = segmentStart - 0.05;
          } else if (gap <= 2.5) {
            // Large gaps - fill most of it
            const extension = gap * 0.8;
            lastSegment.end = lastSegment.end + extension;
            segmentStart = lastSegment.end + 0.05;
          } else {
            // Very large gaps - still extend significantly to prevent cutoff
            const extension = Math.min(1.2, gap * 0.5);
            lastSegment.end = lastSegment.end + extension;
          }
        } else if (gap < 0) {
          // Overlap - adjust current segment start
          segmentStart = lastSegment.end + 0.05;
        }
      }

      // Split long segments if necessary
      if (segmentEnd - segmentStart > maxSegmentDuration) {
        // Split into multiple segments
        const wordsPerSegment = Math.ceil(
          segmentWords.length /
          Math.ceil((segmentEnd - segmentStart) / maxSegmentDuration)
        );

        for (let i = 0; i < segmentWords.length; i += wordsPerSegment) {
          const segmentWordSlice = segmentWords.slice(i, i + wordsPerSegment);
          const subSegmentStart =
            i === 0 ? segmentStart : segmentWordSlice[0].start;
          const subSegmentEnd =
            segmentWordSlice[segmentWordSlice.length - 1].end;
          const subSegmentText = segmentWordSlice.map((w) => w.word).join("");

          segments.push({
            ...originalSegment,
            id: segments.length,
            start: subSegmentStart,
            end: subSegmentEnd,
            text: subSegmentText,
          });
        }
      } else {
        // Single segment
        segments.push({
          ...originalSegment,
          id: segments.length,
          start: segmentStart,
          end: segmentEnd,
          text: segmentWords.map((w) => w.word).join(""),
        });
      }
    }

    // Final pass: aggressively eliminate gaps that could cause cutoff
    for (let i = 1; i < segments.length; i++) {
      const prevSegment = segments[i - 1];
      const currentSegment = segments[i];

      if (currentSegment.start > prevSegment.end) {
        const gap = currentSegment.start - prevSegment.end;

        if (gap <= 1.0) {
          // Small to medium gaps - fill almost completely
          const buffer = 0.05;
          const fillableGap = gap - buffer;
          const extension = fillableGap * 0.9; // Fill 90% of fillable gap
          prevSegment.end = prevSegment.end + extension;
          currentSegment.start = prevSegment.end + buffer;
        } else if (gap <= 2.5) {
          // Large gaps - fill most of it
          const extension = gap * 0.7;
          prevSegment.end = prevSegment.end + extension;
          currentSegment.start =
            currentSegment.start - (gap - extension - 0.05);
        } else {
          // Very large gaps - still fill significantly to prevent cutoff
          const extension = Math.min(1.0, gap * 0.4);
          prevSegment.end = prevSegment.end + extension;
        }
      }
    }

    console.log(
      `Created ${segments.length} continuous segments from word-level timestamps`
    );
    return segments;
  };

  // Enhanced gap-filling function optimized to prevent any audio cutoff
  const fillSegmentGaps = (segments: WhisperSegment[]) => {
    if (segments.length === 0) return segments;

    const filledSegments = [];
    const sortedSegments = [...segments].sort((a, b) => a.start - b.start);
    const minSegmentDuration = 0.5; // Minimum segment duration

    for (let i = 0; i < sortedSegments.length; i++) {
      const currentSegment = { ...sortedSegments[i] };
      const nextSegment = sortedSegments[i + 1];

      // Ensure minimum duration
      if (currentSegment.end - currentSegment.start < minSegmentDuration) {
        currentSegment.end = currentSegment.start + minSegmentDuration;
      }

      // Aggressive gap filling to prevent any audio cutoff
      if (nextSegment) {
        const gap = nextSegment.start - currentSegment.end;

        if (gap > 0) {
          if (gap <= 1.0) {
            // Small to medium gaps (≤1s) - fill almost completely to prevent cutoff
            currentSegment.end = nextSegment.start - 0.05; // Leave minimal buffer
            console.log(
              `Aggressively filled gap of ${gap.toFixed(
                3
              )}s between segments ${i} and ${i + 1}`
            );
          } else if (gap <= 2.0) {
            // Larger gaps (1-2s) - fill most of it to prevent cutoff
            const extension = gap * 0.85; // Fill 85% of gap
            currentSegment.end = currentSegment.end + extension;
            console.log(
              `Filled large gap of ${gap.toFixed(
                3
              )}s by extending ${extension.toFixed(3)}s`
            );
          } else if (gap <= 4.0) {
            // Very large gaps (2-4s) - still extend significantly to prevent cutoff
            const extension = Math.min(1.0, gap * 0.6); // Max 1s extension, or 60% of gap
            currentSegment.end = currentSegment.end + extension;
            console.log(
              `Extended for very large gap of ${gap.toFixed(
                3
              )}s by ${extension.toFixed(3)}s`
            );
          } else {
            // Extremely large gaps (>4s) - minimal extension but still prevent cutoff
            const extension = Math.min(0.8, gap * 0.3); // Max 0.8s extension
            currentSegment.end = currentSegment.end + extension;
            console.log(
              `Minimal extension for huge gap of ${gap.toFixed(
                3
              )}s by ${extension.toFixed(3)}s`
            );
          }
        } else if (gap < 0) {
          // Overlap - adjust current segment end but leave small buffer
          currentSegment.end = nextSegment.start - 0.05;
          console.log(`Resolved overlap between segments ${i} and ${i + 1}`);
        }
      }

      filledSegments.push(currentSegment);
    }

    return filledSegments;
  };

  // Simulate transcription process for demo purposes
  const simulateTranscription = async () => {
    // Sample transcript segments to simulate real transcription - with continuous timing (no gaps)
    const sampleSegments = [
      {
        text: "Welcome to this audio demonstration.",
        startTime: 0.0,
        endTime: 3.5,
        confidence: 0.92,
      },
      {
        text: "Today we'll explore the key features of our application.",
        startTime: 3.5,
        endTime: 7.2,
        confidence: 0.89,
      },
      {
        text: "The first feature is the ability to create precise loops.",
        startTime: 7.2,
        endTime: 10.8,
        confidence: 0.95,
      },
      {
        text: "You can set the start and end points exactly where you want them.",
        startTime: 10.8,
        endTime: 14.5,
        confidence: 0.91,
      },
      {
        text: "This is perfect for musicians practicing difficult passages.",
        startTime: 14.5,
        endTime: 18.2,
        confidence: 0.88,
      },
      {
        text: "Or for language learners who want to repeat specific phrases.",
        startTime: 18.2,
        endTime: 22.0,
        confidence: 0.93,
      },
      {
        text: "The second feature is our waveform visualization.",
        startTime: 22.0,
        endTime: 25.8,
        confidence: 0.9,
      },
      {
        text: "It helps you see the audio structure and identify specific parts.",
        startTime: 25.8,
        endTime: 30.0,
        confidence: 0.87,
      },
      {
        text: "And now we've added automatic transcription.",
        startTime: 30.0,
        endTime: 33.2,
        confidence: 0.94,
      },
      {
        text: "So you can read along as you listen.",
        startTime: 33.2,
        endTime: 36.0,
        confidence: 0.92,
      },
    ];

    // Clear any existing transcript
    clearTranscript();

    // Add segments with delay to simulate processing time
    for (let i = 0; i < sampleSegments.length; i++) {
      const segment = sampleSegments[i];
      const progress = Math.round(((i + 1) / sampleSegments.length) * 100);

      // Update progress
      setProcessingProgress(progress);

      // Add segment to store
      addTranscriptSegment({
        text: segment.text,
        startTime: Math.max(0, segment.startTime),
        endTime: Math.max(segment.startTime, segment.endTime), // Remove the 0.5s buffer
        confidence: segment.confidence,
        isFinal: true,
      });

      // Delay to simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  // Scroll to bottom when new segments are added
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcriptSegments]);

  // Handle export
  const handleExport = (format: "txt" | "srt" | "vtt") => {
    const content = exportTranscript(format);
    if (!content) return;

    // Create a blob and download link
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(t("transcript.exportSuccess", { format: format.toUpperCase() }));
  };

  // State and handlers moved to top level of component


  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleDeleteBookmark = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(t("bookmarks.deleteConfirmation"))) {
      usePlayerStore.getState().deleteBookmark(id);
      toast.success(t("bookmarks.bookmarkDeleted"));
    }
  };

  return (
    <div className="flex w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden relative">
      {/* Sidebar Toggle Button (Floating or inside) */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute z-10 top-2 left-2 p-1.5 rounded-md bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-all duration-300 ${isSidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        title={t("transcript.toggleSidebar")}
      >
        <Sidebar size={16} />
      </button>

      {/* Sidebar */}
      <div
        className={`${isSidebarOpen ? "w-1/4 min-w-[200px] max-w-[300px] border-r" : "w-0 border-none"} transition-all duration-300 ease-in-out border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50/50 dark:bg-gray-900/50 overflow-hidden relative`}
      >
        <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="font-medium text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">
            {t("transcript.sections")}
          </span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button
            onClick={() => handleTabSelect(null)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${activeTabId === null
              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-medium"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
          >
            {t("transcript.fullTranscript")}
          </button>

          {bookmarks.length > 0 && (
            <div className="mt-4 mb-2 px-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase whitespace-nowrap overflow-hidden text-ellipsis">
              {t("transcript.bookmarks")}
            </div>
          )}

          {bookmarks.map(b => (
            <div
              key={b.id}
              onClick={() => handleTabSelect(b.id)}
              className={`group w-full text-left px-3 py-2 rounded text-sm transition-colors cursor-pointer flex items-center justify-between ${activeTabId === b.id
                ? "bg-purple-100 dark:bg-purple-900/30"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              title={b.name}
            >
              <div className="flex-1 min-w-0 mr-2 overflow-hidden">
                <div className={`truncate font-medium ${activeTabId === b.id
                  ? "text-purple-700 dark:text-purple-300"
                  : "text-gray-700 dark:text-gray-300"
                  }`}>
                  {b.name}
                </div>
                <div className="text-xs opacity-70 font-mono text-gray-500 dark:text-gray-400 truncate">
                  {Math.floor(b.start / 60)}:{Math.floor(b.start % 60).toString().padStart(2, '0')} -
                  {Math.floor(b.end / 60)}:{Math.floor(b.end % 60).toString().padStart(2, '0')}
                </div>
              </div>

              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity space-x-1 shrink-0">
                <button
                  onClick={(e) => handlePlayBookmark(e, b.id)}
                  className="p-1 rounded-full hover:bg-white/50 dark:hover:bg-black/50 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                  title={t("player.play")}
                >
                  <PlayCircle size={16} />
                </button>
                <button
                  onClick={(e) => handleEditBookmark(e, b)}
                  className="p-1 rounded-full hover:bg-white/50 dark:hover:bg-black/50 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  title={t("bookmarks.editBookmark")}
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={(e) => handleDeleteBookmark(e, b.id)}
                  className="p-1 rounded-full hover:bg-white/50 dark:hover:bg-black/50 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                  title={t("bookmarks.deleteBookmark")}
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center min-w-0 mr-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              {activeTabId
                ? bookmarks.find(b => b.id === activeTabId)?.name || t("transcript.title")
                : t("transcript.title")
              }
            </h3>
            {isProcessing && (
              <div className="ml-2 flex items-center flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {t("transcript.processing", { progress: processingProgress })}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0">
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              title={t("transcript.setOpenAiApiKey")}
            >
              <Key size={16} />
            </button>

            <button
              onClick={handleOpenAISettings}
              className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              title={t("transcript.openAiSettings")}
            >
              <Settings size={16} />
            </button>

            {/* Show transcribe button behavior based on active tab */}
            {activeTabId ? (
              <button
                onClick={handleTranscribeBookmark}
                className={`p-1.5 rounded-full ${isTranscribing
                  ? "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                title={t("transcript.transcribeBookmark")}
                disabled={isProcessing || (!currentFile && !currentYouTube)}
              >
                <FileAudio size={16} />
              </button>
            ) : (
              <button
                onClick={handleTranscribeFull}
                className={`p-1.5 rounded-full ${isTranscribing
                  ? "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                title={t("transcript.transcribeWithWhisper")}
                disabled={isProcessing || (!currentFile && !currentYouTube)}
              >
                <FileAudio size={16} />
              </button>
            )}

            <button
              onClick={() => handleExport("txt")}
              className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              title={t("transcript.exportAsTxt")}
              disabled={transcriptSegments.length === 0}
            >
              <Save size={16} />
            </button>

            <button
              onClick={() => clearTranscript()}
              className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              title={t("transcript.clearTranscript")}
              disabled={transcriptSegments.length === 0}
            >
              <Trash size={16} />
            </button>
          </div>
        </div>

        <div
          ref={transcriptRef}
          className="flex-1 overflow-y-auto p-3 space-y-2 text-sm"
        >
          {showApiKeyInput && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-md mb-3">
              <h4 className="font-medium mb-2">{t("transcript.apiKeyRequired")}</h4>
              <p className="text-xs mb-3">{t("transcript.apiKeyNotice")}</p>
              <form
                onSubmit={handleApiKeySubmit}
                className="flex flex-col space-y-2"
              >
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t("transcript.apiKeyPlaceholder")}
                  className="px-3 py-2 border border-blue-300 dark:border-blue-700 rounded text-sm dark:bg-gray-800 dark:text-gray-200"
                  required
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                  >
                    {t("transcript.saveApiKey")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApiKeyInput(false)}
                    className="px-3 py-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs font-medium"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t("transcript.getApiKey")}
                  </a>
                </p>
              </form>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-md">
              {errorMessage}
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Loader size={24} className="animate-spin text-blue-500 mb-2" />
              <p className="text-gray-600 dark:text-gray-400">
                {t("transcript.processingWithWhisper")}
              </p>
              <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-3">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Empty state logic based on active tab */}
          {!isProcessing && !showApiKeyInput && (
            <>
              {activeTabId ? (
                // Bookmark View Empty State
                filteredSegments.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-6 space-y-4">
                    <div>
                      {t("transcript.noTranscriptForBookmark")}
                    </div>
                    <button
                      onClick={handleTranscribeBookmark}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      {t("transcript.transcribeBookmarkButton")}
                    </button>
                  </div>
                ) : null
              ) : (
                // Full Transcript Empty State
                transcriptSegments.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-6 space-y-4">
                    <div>
                      {t(!currentFile && !currentYouTube ? "transcript.loadMediaFirst" : "transcript.clickToTranscribe")}
                    </div>
                    {(currentFile || currentYouTube) && (
                      <div className="space-y-2">
                        <div className="text-sm">{t("common.or")}</div>
                        <div className="flex justify-center">
                          <TranscriptUploader variant="prominent" />
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {t("transcript.uploadExisting")}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null
              )}
            </>
          )}

          {filteredSegments.map((segment) => (
            <TranscriptSegmentItem key={segment.id} segment={segment} />
          ))}
        </div>

        <TranscriptControlsPanel />
      </div>

      {/* Edit bookmark dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("bookmarks.editBookmark")}</DialogTitle>
            <DialogDescription>{t("bookmarks.updateBookmarkDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="edit-name" className="text-sm font-medium">{t("bookmarks.name")}</label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditName(e.target.value)
                }
                placeholder={t("bookmarks.bookmarkName")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="edit-start" className="text-sm font-medium">{t("common.start")}</label>
                <Input
                  id="edit-start"
                  type="number"
                  step="0.1"
                  min="0"
                  value={editStart}
                  onChange={(e) => setEditStart(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-end" className="text-sm font-medium">{t("common.end")}</label>
                <Input
                  id="edit-end"
                  type="number"
                  step="0.1"
                  min="0"
                  value={editEnd}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditEnd(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-annotation" className="text-sm font-medium">{t("bookmarks.annotation")}</label>
              <Textarea
                id="edit-annotation"
                value={editAnnotation}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditAnnotation(e.target.value)
                }
                placeholder={t("bookmarks.annotationOptional")}
                className="h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>

            <Button
              variant="default"
              onClick={handleSaveEdit}
              disabled={!editName.trim()}
            >
              {t("bookmarks.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
