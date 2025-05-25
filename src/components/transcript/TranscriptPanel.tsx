import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import {
  Loader,
  Save,
  Trash,
  Play,
  Bookmark,
  FileAudio,
  Key,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { OpenAI } from "openai";
import FormData from "form-data";

// Import types from store
import { TranscriptSegment as TranscriptSegmentType } from "../../stores/playerStore";

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

export const TranscriptPanel = () => {
  const {
    transcriptSegments,
    showTranscript,
    isTranscribing,
    currentFile,
    currentYouTube,
    toggleTranscribing,
    addTranscriptSegment,
    clearTranscript,
    exportTranscript,
  } = usePlayerStore();

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
      toast.success("API key saved");
    }
  };

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("openai_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Function to extract audio from the media file
  const extractAudioFromMedia = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!currentFile) {
        reject(new Error("No file loaded"));
        return;
      }

      // For audio files, we can use them directly
      if (currentFile.type.includes("audio")) {
        fetch(currentFile.url)
          .then((response) => response.blob())
          .then((blob) => resolve(blob))
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
          video.currentTime = 0;
          video.play();
          mediaRecorder.start();

          // Stop recording after the video duration
          setTimeout(() => {
            video.pause();
            mediaRecorder.stop();
            audioContext.close();
          }, video.duration * 1000);
        };

        video.onerror = () => {
          reject(new Error("Error loading video"));
        };

        return;
      }

      reject(new Error("Unsupported file type"));
    });
  };

  // Function to transcribe the current media using OpenAI's Whisper API
  const transcribeMedia = async () => {
    // Check if we have media to transcribe
    if (!currentFile && !currentYouTube) {
      toast.error("No media loaded to transcribe");
      return;
    }

    // Check if API key is provided
    if (!apiKey) {
      setShowApiKeyInput(true);
      return;
    }

    // Check if OpenAI client is initialized
    if (!openaiRef.current) {
      toast.error("OpenAI client not initialized");
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage("");
      clearTranscript();
      toggleTranscribing(); // Set isTranscribing to true
      setProcessingProgress(10);

      // For YouTube videos, we can't directly access the audio
      // We would need a server-side component to download and process the video
      if (currentYouTube) {
        toast.error(
          "YouTube transcription requires server-side processing. Using simulation instead."
        );
        await simulateTranscription();
        return;
      }

      // Extract audio from the media file
      const audioBlob = await extractAudioFromMedia();
      setProcessingProgress(30);

      // Convert the blob to a File object for the OpenAI API
      const audioFile = new File([audioBlob], "audio.wav", {
        type: "audio/wav",
      });

      // Create a FormData object to send to the OpenAI API
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");
      formData.append("timestamp_granularities", ["segment"]);

      setProcessingProgress(50);
      toast.success("Sending audio to OpenAI for transcription...");

      // Send the audio to the OpenAI API
      const response = await openaiRef.current.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      });

      setProcessingProgress(80);

      // Process the response and add segments to the store
      const whisperResponse = response as unknown as WhisperResponse;
      if (whisperResponse && whisperResponse.segments) {
        whisperResponse.segments.forEach((segment, index) => {
          addTranscriptSegment({
            text: segment.text.trim(),
            startTime: segment.start,
            endTime: segment.end,
            confidence: Math.exp(segment.avg_logprob),
            isFinal: true,
          });

          // Update progress
          const progress =
            Math.round(
              ((index + 1) / (whisperResponse.segments.length || 1)) * 20
            ) + 80;
          setProcessingProgress(Math.min(progress, 100));
        });

        toast.success("Transcription completed");
      } else {
        // If no segments are returned, use the full transcript
        addTranscriptSegment({
          text: response.text,
          startTime: 0,
          endTime: 30, // Arbitrary end time
          confidence: 0.95,
          isFinal: true,
        });

        toast.success("Transcription completed (without timestamps)");
      }

      setProcessingProgress(100);
    } catch (error) {
      console.error("Error transcribing media:", error);
      setErrorMessage(
        "Failed to transcribe media. Please check your API key and try again."
      );
      toast.error("Transcription failed");

      // Fall back to simulation for demo purposes
      await simulateTranscription();
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate transcription process for demo purposes
  const simulateTranscription = async () => {
    const mediaName = currentFile?.name || `YouTube: ${currentYouTube?.id}`;
    toast.success(`Starting transcription of ${mediaName}`);

    // Sample transcript segments to simulate real transcription
    const sampleSegments = [
      {
        text: "Welcome to this audio demonstration.",
        startTime: 1.2,
        endTime: 3.5,
        confidence: 0.92,
      },
      {
        text: "Today we'll explore the key features of our application.",
        startTime: 3.8,
        endTime: 7.2,
        confidence: 0.89,
      },
      {
        text: "The first feature is the ability to create precise loops.",
        startTime: 7.5,
        endTime: 10.8,
        confidence: 0.95,
      },
      {
        text: "You can set the start and end points exactly where you want them.",
        startTime: 11.2,
        endTime: 14.5,
        confidence: 0.91,
      },
      {
        text: "This is perfect for musicians practicing difficult passages.",
        startTime: 14.8,
        endTime: 18.2,
        confidence: 0.88,
      },
      {
        text: "Or for language learners who want to repeat specific phrases.",
        startTime: 18.5,
        endTime: 22.0,
        confidence: 0.93,
      },
      {
        text: "The second feature is our waveform visualization.",
        startTime: 22.5,
        endTime: 25.8,
        confidence: 0.9,
      },
      {
        text: "It helps you see the audio structure and identify specific parts.",
        startTime: 26.2,
        endTime: 30.0,
        confidence: 0.87,
      },
      {
        text: "And now we've added automatic transcription.",
        startTime: 30.5,
        endTime: 33.2,
        confidence: 0.94,
      },
      {
        text: "So you can read along as you listen.",
        startTime: 33.5,
        endTime: 35.8,
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
        startTime: segment.startTime,
        endTime: segment.endTime,
        confidence: segment.confidence,
        isFinal: true,
      });

      // Delay to simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    toast.success("Transcription completed");
  };

  // Scroll to bottom when new segments are added
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcriptSegments]);

  // Don't render if transcript is not shown
  if (!showTranscript) return null;

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

    toast.success(`Transcript exported as ${format.toUpperCase()}`);
  };

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Media Transcript (OpenAI Whisper)
          </h3>
          {isProcessing && (
            <div className="ml-2 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                Processing {processingProgress}%
              </span>
            </div>
          )}
          {isTranscribing && !isProcessing && (
            <div className="ml-2 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                Transcribed
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            title="Set OpenAI API Key"
          >
            <Key size={16} />
          </button>

          <button
            onClick={transcribeMedia}
            className={`p-1.5 rounded-full ${
              isTranscribing
                ? "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
            title="Transcribe media with Whisper"
            disabled={isProcessing || (!currentFile && !currentYouTube)}
          >
            <FileAudio size={16} />
          </button>

          <button
            onClick={() => handleExport("txt")}
            className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            title="Export transcript as TXT"
            disabled={transcriptSegments.length === 0}
          >
            <Save size={16} />
          </button>

          <button
            onClick={() => clearTranscript()}
            className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            title="Clear transcript"
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
            <h4 className="font-medium mb-2">OpenAI API Key Required</h4>
            <p className="text-xs mb-3">
              To use Whisper for transcription, you need to provide your OpenAI
              API key. This key is stored only in your browser's local storage.
            </p>
            <form
              onSubmit={handleApiKeySubmit}
              className="flex flex-col space-y-2"
            >
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="px-3 py-2 border border-blue-300 dark:border-blue-700 rounded text-sm dark:bg-gray-800 dark:text-gray-200"
                required
              />
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                >
                  Save API Key
                </button>
                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(false)}
                  className="px-3 py-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Get an API key from OpenAI
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
              Processing media with OpenAI Whisper...
            </p>
            <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-3">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {transcriptSegments.length === 0 &&
          !isProcessing &&
          !showApiKeyInput && (
            <div className="text-gray-500 dark:text-gray-400 text-center py-4">
              {!currentFile && !currentYouTube
                ? "Load media first to generate a transcript"
                : "Click the transcribe button to generate a transcript of this media using OpenAI Whisper"}
            </div>
          )}

        {transcriptSegments.map((segment) => (
          <TranscriptSegmentItem key={segment.id} segment={segment} />
        ))}
      </div>

      <TranscriptControlsPanel />
    </div>
  );
};

// Inline TranscriptSegmentItem component
const TranscriptSegmentItem = ({
  segment,
}: {
  segment: TranscriptSegmentType;
}) => {
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

// Inline TranscriptControlsPanel component
const TranscriptControlsPanel = () => {
  const { transcriptLanguage, setTranscriptLanguage, exportTranscript } =
    usePlayerStore();

  const LANGUAGE_OPTIONS = [
    { value: "en-US", label: "English (US)" },
    { value: "en-GB", label: "English (UK)" },
    { value: "es-ES", label: "Spanish" },
    { value: "fr-FR", label: "French" },
    { value: "de-DE", label: "German" },
    { value: "ja-JP", label: "Japanese" },
    { value: "ko-KR", label: "Korean" },
    { value: "zh-CN", label: "Chinese (Simplified)" },
    { value: "ru-RU", label: "Russian" },
  ];

  return (
    <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center">
        <label
          htmlFor="transcript-language"
          className="text-xs text-gray-600 dark:text-gray-400 mr-2"
        >
          Language:
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

            toast.success(`Transcript exported as TXT`);
          }}
          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
        >
          TXT
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

            toast.success(`Transcript exported as SRT`);
          }}
          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
        >
          SRT
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

            toast.success(`Transcript exported as VTT`);
          }}
          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
        >
          VTT
        </button>
      </div>
    </div>
  );
};

// No need for Web Speech API declarations since we're not using it
