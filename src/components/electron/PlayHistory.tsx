import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePlayerStore, type MediaHistoryItem } from "../../stores/playerStore";
import { Music, Youtube, X, SquareArrowOutUpRight } from "lucide-react";
import {
  getShowInFileManagerLabel,
  revealInFileManager,
} from "./fileManager";

/* ── Time-ago helper ────────────────────────────────────────────── */
const timeAgo = (
  timestamp: number,
  t: (key: string, opts?: Record<string, unknown>) => string
): string => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t("sidebar.timeAgo.justNow", { defaultValue: "just now" });
  if (minutes < 60)
    return t("sidebar.timeAgo.minutesAgo", { count: minutes, defaultValue: `${minutes}m ago` });
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return t("sidebar.timeAgo.hoursAgo", { count: hours, defaultValue: `${hours}h ago` });
  const days = Math.floor(hours / 24);
  return t("sidebar.timeAgo.daysAgo", { count: days, defaultValue: `${days}d ago` });
};

/* ── Subtext (path / URL) ───────────────────────────────────────── */
const getSubtext = (item: MediaHistoryItem): string => {
  if (item.type === "youtube") {
    return item.youtubeData?.youtubeId
      ? `youtube.com/watch?v=${item.youtubeData.youtubeId}`
      : "YouTube";
  }
  const nativePath = item.nativePath ?? item.fileData?.nativePath;
  if (nativePath) return nativePath;
  return item.name;
};

/* ── Is this item currently playing? ────────────────────────────── */
const isActive = (
  item: MediaHistoryItem,
  currentFilePath?: string | null,
  currentYouTubeId?: string | null
): boolean => {
  if (item.type === "youtube") {
    return item.youtubeData?.youtubeId === currentYouTubeId;
  }
  const nativePath = item.nativePath ?? item.fileData?.nativePath;
  return !!nativePath && nativePath === currentFilePath;
};

/* ── Exported component ─────────────────────────────────────────── */
export const PlayHistory = () => {
  const { t } = useTranslation();
  const { mediaHistory, loadFromHistory, removeFromHistory, currentFile, currentYouTube } =
    usePlayerStore();
  const showInFileManagerLabel = getShowInFileManagerLabel(t);

  const sorted = [...mediaHistory].sort((a, b) => b.accessedAt - a.accessedAt);

  const currentFilePath = currentFile?.nativePath ?? null;
  const currentYouTubeId = currentYouTube?.id ?? null;

  const handleRemove = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      removeFromHistory(id);
    },
    [removeFromHistory]
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
        <Music className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t("sidebar.noHistory", "No recent files.")}
        </p>
      </div>
    );
  }

  return (
    <ul>
      {sorted.map((item) => {
        const active = isActive(item, currentFilePath, currentYouTubeId);
        const nativePath = item.nativePath ?? item.fileData?.nativePath;
        return (
          <li key={item.id}>
            <button
              onClick={() => loadFromHistory(item.id)}
              className={`w-full flex items-center h-[28px] px-2 text-left transition-colors group ${
                active
                  ? "bg-purple-500/12 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700/40 text-gray-600 dark:text-gray-300"
              }`}
            >
              {/* Icon */}
              {item.type === "youtube" ? (
                <Youtube className="w-3.5 h-3.5 shrink-0 text-red-400 dark:text-red-500 mr-1.5" />
              ) : (
                <Music className="w-3.5 h-3.5 shrink-0 text-purple-400 dark:text-purple-500 mr-1.5" />
              )}

              {/* Name */}
              <span
                className={`text-xs truncate flex-1 min-w-0 ${
                  active ? "font-semibold" : "font-normal"
                }`}
              >
                {item.name}
              </span>

              {/* Time ago (hidden on hover, replaced by remove button) */}
              <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 ml-2 tabular-nums group-hover:hidden">
                {timeAgo(item.accessedAt, t)}
              </span>

              {nativePath && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    void revealInFileManager(nativePath);
                  }}
                  title={showInFileManagerLabel}
                  className="hidden group-hover:flex items-center justify-center p-0.5 ml-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0"
                >
                  <SquareArrowOutUpRight className="w-3 h-3" />
                </span>
              )}

              {/* Remove button (visible on hover) */}
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => handleRemove(e, item.id)}
                title={t("sidebar.removeItem", "Remove")}
                className="hidden group-hover:flex items-center justify-center p-0.5 ml-1 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
              >
                <X className="w-3 h-3" />
              </span>
            </button>

            {/* Subtext line */}
            <div
              className={`flex items-center h-[16px] px-2 pl-[30px] ${
                active ? "text-purple-400/70 dark:text-purple-400/50" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <span className="text-[10px] font-mono truncate">{getSubtext(item)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
