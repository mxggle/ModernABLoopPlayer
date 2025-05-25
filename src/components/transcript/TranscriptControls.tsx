import { usePlayerStore } from "../../stores/playerStore";
import { TranscriptUploader } from "./TranscriptUploader";

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

export const TranscriptControls = () => {
  const { transcriptLanguage, setTranscriptLanguage, exportTranscript } =
    usePlayerStore();

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
        <TranscriptUploader />
        <button
          onClick={() => exportTranscript("txt")}
          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
        >
          TXT
        </button>
        <button
          onClick={() => exportTranscript("srt")}
          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
        >
          SRT
        </button>
        <button
          onClick={() => exportTranscript("vtt")}
          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
        >
          VTT
        </button>
      </div>
    </div>
  );
};
