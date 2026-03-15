import { useTranslation } from "react-i18next";
import { usePlayerStore, type MediaHistoryItem } from "../../stores/playerStore";
import { History, Music, Youtube, Trash2 } from "lucide-react";

const getSubtext = (item: MediaHistoryItem): string => {
  if (item.type === "youtube") {
    return item.youtubeData?.youtubeId
      ? `youtube.com/watch?v=${item.youtubeData.youtubeId}`
      : "YouTube";
  }
  // Electron native file — show disk path (top-level or nested in fileData)
  const nativePath = item.nativePath ?? item.fileData?.nativePath;
  if (nativePath) return nativePath;
  return item.name;
};

export const PlayHistory = () => {
  const { t } = useTranslation();
  const { mediaHistory, loadFromHistory, clearMediaHistory } = usePlayerStore();

  const sorted = [...mediaHistory].sort((a, b) => b.accessedAt - a.accessedAt);

  return (
    <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-md border border-gray-100 dark:border-gray-700/50 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          {t("playHistory.title", "Play History")}
        </h3>
        {sorted.length > 0 && (
          <button
            onClick={clearMediaHistory}
            title={t("playHistory.clearHistory", "Clear history")}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t("playHistory.clearHistory", "Clear")}
          </button>
        )}
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          {t("playHistory.emptyState", "No play history yet. Open a file or YouTube video to get started.")}
        </p>
      )}

      {/* History list */}
      {sorted.length > 0 && (
        <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700/50">
          {sorted.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => loadFromHistory(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors group"
              >
                {item.type === "youtube" ? (
                  <Youtube className="w-4 h-4 flex-shrink-0 text-red-400 dark:text-red-500" />
                ) : (
                  <Music className="w-4 h-4 flex-shrink-0 text-purple-400 dark:text-purple-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-200 truncate group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate font-mono mt-0.5">
                    {getSubtext(item)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
