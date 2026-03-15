import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import { FileAudio, FolderOpen } from "lucide-react";
import { motion } from "framer-motion";
import { storeMediaFile } from "../../utils/mediaStorage";
import { isElectron, nativePathToUrl } from "../../utils/platform";

export const FileUploader = () => {
  const { t } = useTranslation();
  const { setCurrentFile } = usePlayerStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // Check if file is audio or video
      if (!file.type.includes("audio") && !file.type.includes("video")) {
        toast.error(t("upload.invalidFileType"));
        return;
      }

      try {
        const storageId = await storeMediaFile(file);
        const tempUrl = URL.createObjectURL(file);

        setCurrentFile({
          name: file.name,
          type: file.type,
          size: file.size,
          url: tempUrl,
          storageId,
        });
      } catch (error) {
        console.error("Error in file upload:", error);
        toast.error(t("upload.uploadError"));
      }
    },
    [setCurrentFile, t]
  );

  const handleElectronOpenFile = useCallback(async () => {
    const filePath = await window.electronAPI!.openFile();
    if (!filePath) return;

    const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = ext === "mp4" || ext === "mkv" || ext === "avi" || ext === "mov" || ext === "webm" || ext === "m4v"
      ? `video/${ext}`
      : `audio/${ext}`;

    setCurrentFile({
      name: fileName,
      type: mimeType,
      size: 0,
      url: nativePathToUrl(filePath),
      nativePath: filePath,
    });
  }, [setCurrentFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".ogg", ".flac", ".aac"],
      "video/*": [".mp4", ".webm", ".ogv"],
    },
    maxFiles: 1,
  });

  if (isElectron()) {
    return (
      <div className="flex flex-col gap-3 h-full justify-center items-center">
        {/* Native open-file button */}
        <button
          onClick={handleElectronOpenFile}
          className="w-full flex flex-col items-center justify-center gap-3 p-6 border-2 border-purple-100 dark:border-purple-900/30 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-center cursor-pointer transition-all duration-200 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex justify-center items-center p-4 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-full shadow-inner">
            <FolderOpen className="h-10 w-10 text-purple-500 dark:text-purple-400 drop-shadow-md" />
          </div>
          <div>
            <p className="text-base font-medium text-gray-800 dark:text-gray-100 mb-1">
              {t("upload.openFile", "Open File")}
            </p>
            <p className="text-xs text-purple-500 dark:text-purple-400 font-medium">
              {t("upload.supportedFormats")}
            </p>
          </div>
        </button>

        {/* Drag-and-drop still available in Electron (e.g. drag from Finder) */}
        <div
          {...getRootProps()}
          className={`w-full p-3 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors text-sm ${
            isDragActive
              ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
              : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-purple-300 dark:hover:border-purple-700"
          }`}
        >
          <input {...getInputProps()} />
          <p>{isDragActive ? t("upload.dropToUpload") : t("upload.dragDrop")}</p>
        </div>
      </div>
    );
  }

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
            ? t("upload.dropToUpload")
            : t("upload.dragDrop")}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
          {t("upload.browseFiles")}
        </p>
        <p className="text-xs text-purple-500 dark:text-purple-400 font-medium">
          {t("upload.supportedFormats")}
        </p>
      </motion.div>
    </div>
  );
};
