import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { usePlayerStore } from "../../stores/playerStore";
import { FileAudio } from "lucide-react";
import { motion } from "framer-motion";

export const FileUploader = () => {
  const { setCurrentFile } = usePlayerStore();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // Check if file is audio or video
      if (!file.type.includes("audio") && !file.type.includes("video")) {
        toast.error("Please upload an audio or video file");
        return;
      }

      // Create object URL for the file
      const url = URL.createObjectURL(file);

      // Set the current file in the store
      setCurrentFile({
        name: file.name,
        type: file.type,
        size: file.size,
        url,
      });

      toast.success(`Loaded: ${file.name}`);
    },
    [setCurrentFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".ogg", ".flac", ".aac"],
      "video/*": [".mp4", ".webm", ".ogv"],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`p-6 border-2 ${
        isDragActive
          ? "border-purple-500"
          : "border-purple-100 dark:border-purple-900/30"
      } bg-white dark:bg-gray-800 rounded-xl shadow-sm text-center cursor-pointer transition-all duration-200 h-full flex flex-col justify-center items-center ${
        isDragActive
          ? "bg-purple-50 dark:bg-purple-900/20"
          : "hover:bg-purple-50/50 dark:hover:bg-purple-900/10"
      }`}
    >
      <input {...getInputProps()} />
      <div className="relative">
        <div className="flex justify-center items-center p-4 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-full mb-5 shadow-inner">
          <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
            <FileAudio className="h-10 w-10 text-purple-500 dark:text-purple-400 drop-shadow-md" />
          </div>
          {/* <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
            <Music className="h-10 w-10 text-indigo-500 dark:text-indigo-400 drop-shadow-md" />
          </div> */}
        </div>
      </div>
      <motion.div
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="max-w-xs mx-auto"
      >
        <p className="text-base font-medium text-gray-800 dark:text-gray-100 mb-2">
          {isDragActive
            ? "Drop to upload..."
            : "Drag & drop audio/video files here"}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
          or click to browse files
        </p>
        <p className="text-xs text-purple-500 dark:text-purple-400 font-medium">
          MP3, WAV, OGG, FLAC, AAC, MP4, WebM
        </p>
      </motion.div>
    </div>
  );
};
