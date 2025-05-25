import { useRef } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { toast } from "react-hot-toast";
import { Upload } from "lucide-react";

interface TranscriptUploaderProps {
  variant?: "compact" | "prominent";
}

export const TranscriptUploader = ({
  variant = "compact",
}: TranscriptUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importTranscript } = usePlayerStore();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileName = file.name.toLowerCase();
    const validExtensions = [".srt", ".vtt", ".txt"];
    const isValidFile = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidFile) {
      toast.error(
        "Please upload a valid transcript file (.srt, .vtt, or .txt)"
      );
      return;
    }

    try {
      await importTranscript(file);
    } catch (error) {
      console.error("Error uploading transcript:", error);
      toast.error("Failed to upload transcript");
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (variant === "prominent") {
    return (
      <>
        <button
          onClick={handleUploadClick}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          title="Upload transcript file"
        >
          <Upload size={16} />
          Upload Transcript
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".srt,.vtt,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleUploadClick}
        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 flex items-center gap-1 text-xs"
        title="Upload transcript file"
      >
        <Upload size={12} />
        Upload
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".srt,.vtt,.txt"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
};
