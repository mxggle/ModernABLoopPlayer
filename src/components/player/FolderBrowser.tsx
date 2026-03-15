import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import { nativePathToUrl } from "../../utils/platform";
import { Folder, FolderOpen, Music, FileVideo } from "lucide-react";

interface MediaEntry {
  name: string;
  path: string;
}

const VIDEO_EXTS = new Set(["mp4", "mkv", "avi", "mov", "webm", "m4v"]);

const getMimeType = (name: string): string => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTS.has(ext) ? `video/${ext}` : `audio/${ext}`;
};

export const FolderBrowser = () => {
  const { t } = useTranslation();
  const { setCurrentFile } = usePlayerStore();
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [files, setFiles] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const handleOpenFolder = useCallback(async () => {
    const selected = await window.electronAPI!.openFolder();
    if (!selected) return;

    setLoading(true);
    try {
      const entries = await window.electronAPI!.listMediaFiles(selected);
      setFolderPath(selected);
      setFiles(entries);
    } catch (err) {
      console.error("Failed to list folder:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileClick = useCallback(
    (entry: MediaEntry) => {
      setCurrentFile({
        name: entry.name,
        type: getMimeType(entry.name),
        size: 0,
        url: nativePathToUrl(entry.path),
        nativePath: entry.path,
      });
    },
    [setCurrentFile]
  );

  const folderName = folderPath ? folderPath.split(/[\\/]/).pop() : null;

  return (
    <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-md border border-gray-100 dark:border-gray-700/50 p-4 sm:p-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Folder className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          {t("folderBrowser.title", "Browse Folder")}
        </h3>
        <button
          onClick={handleOpenFolder}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          {t("folderBrowser.openFolder", "Open Folder")}
        </button>
      </div>

      {/* Current folder path */}
      {folderPath && (
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-3 font-mono">
          {folderPath}
        </p>
      )}

      {/* File list */}
      {loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          {t("folderBrowser.loading", "Loading...")}
        </p>
      )}

      {!loading && folderPath && files.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          {t("folderBrowser.noFiles", "No audio or video files found in this folder.")}
        </p>
      )}

      {!loading && files.length > 0 && (
        <>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            {files.length} {t("folderBrowser.filesFound", "file(s) found in")} {folderName}
          </p>
          <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700/50">
            {files.map((entry) => {
              const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
              const isVideo = VIDEO_EXTS.has(ext);
              return (
                <li key={entry.path}>
                  <button
                    onClick={() => handleFileClick(entry)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors group"
                  >
                    {isVideo ? (
                      <FileVideo className="w-4 h-4 flex-shrink-0 text-indigo-400 dark:text-indigo-500" />
                    ) : (
                      <Music className="w-4 h-4 flex-shrink-0 text-purple-400 dark:text-purple-500" />
                    )}
                    <span className="text-sm text-gray-700 dark:text-gray-200 truncate group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                      {entry.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {!loading && !folderPath && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          {t("folderBrowser.hint", "Open a folder to browse your local audio and video files.")}
        </p>
      )}
    </div>
  );
};
