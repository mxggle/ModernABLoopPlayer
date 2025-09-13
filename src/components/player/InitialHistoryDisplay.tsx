import {
  usePlayerStore,
  type MediaHistoryItem,
} from "../../stores/playerStore";
import { formatDistanceToNow } from "date-fns";
import { FileAudio, Youtube, Clock, History, Play } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export const InitialHistoryDisplay = () => {
  const { mediaHistory } = usePlayerStore();
  const navigate = useNavigate();

  // If no history, don't display anything
  if (mediaHistory.length === 0) {
    return null;
  }

  // Format date for display
  const formatDate = (timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return "Unknown time";
    }
  };

  // Load media from history and navigate
  const handleLoadFromHistory = async (item: MediaHistoryItem) => {
    try {
      // First load the media into the store
      const { loadFromHistory } = usePlayerStore.getState();
      await loadFromHistory(item.id);

      // Navigate to player
      navigate("/player");
    } catch (error) {
      console.error("Failed to load media:", error);
      toast.error("Failed to load media");
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <History size={18} className="text-purple-500" />
          Your Recent Media
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded-full">
            {mediaHistory.length} {mediaHistory.length === 1 ? "item" : "items"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              document.getElementById("historyDrawerToggle")?.click()
            }
          >
            Manage
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {mediaHistory.slice(0, 6).map((item) => (
          <div
            key={item.id}
            onClick={() => handleLoadFromHistory(item)}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700 
                      hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-3">
              {/* Icon based on media type */}
              <div className="shrink-0">
                {item.type === "file" ? (
                  <FileAudio size={24} className="text-blue-500" />
                ) : (
                  <Youtube size={24} className="text-red-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">{item.name}</h4>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} />
                  {formatDate(item.accessedAt)}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadFromHistory(item);
                }}
              >
                <Play size={16} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {mediaHistory.length > 6 && (
        <div className="text-center text-sm text-gray-500">
          <span>+ {mediaHistory.length - 6} more items in history</span>
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>
    </div>
  );
};
