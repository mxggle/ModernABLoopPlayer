import { useState } from "react";
import {
  usePlayerStore,
  type MediaHistoryItem,
} from "../../stores/playerStore";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import {
  History,
  Play,
  Trash2,
  X,
  FileAudio,
  Youtube,
  Clock,
} from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../utils/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { StorageUsageInfo } from "./StorageUsageInfo";
import { useNavigate } from "react-router-dom";

// History list component
interface HistoryListProps {
  historyItems: MediaHistoryItem[];
  onLoadItem: (item: MediaHistoryItem) => void;
  onRemoveItem: (id: string, e: React.MouseEvent) => void;
  formatDate: (timestamp: number) => string;
}

const HistoryList = ({
  historyItems,
  onLoadItem,
  onRemoveItem,
  formatDate,
}: HistoryListProps) => {
  if (historyItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Clock size={48} className="mb-2 opacity-30" />
        <p>No history items to display</p>
      </div>
    );
  }

  return (
    <div className="p-2">
      {historyItems.map((item) => (
        <div
          key={item.id}
          onClick={() => onLoadItem(item)}
          className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 mb-2 group"
        >
          {/* Icon based on media type */}
          <div className="shrink-0">
            {item.type === "file" ? (
              <FileAudio size={24} className="text-blue-500" />
            ) : (
              <Youtube size={24} className="text-red-500" />
            )}
          </div>

          {/* Media details */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">{item.name}</h3>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={12} />
              {formatDate(item.accessedAt)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600"
              onClick={() => onLoadItem(item)}
              title="Play media"
            >
              <Play size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600"
              onClick={(e) => onRemoveItem(item.id, e)}
              title="Remove from history"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export const MediaHistory = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "files" | "youtube">(
    "all"
  );

  const { mediaHistory, removeFromHistory, clearMediaHistory } =
    usePlayerStore();

  const navigate = useNavigate();

  // Toggle drawer
  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  // Filter history based on active tab
  const filteredHistory = mediaHistory.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "files") return item.type === "file";
    if (activeTab === "youtube") return item.type === "youtube";
    return true;
  });

  // Load media from history and navigate
  const handleLoadFromHistory = async (item: MediaHistoryItem) => {
    try {
      // First load the media into the store
      const { loadFromHistory } = usePlayerStore.getState();
      await loadFromHistory(item.id);

      // Navigate to player
      navigate("/player");
      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Failed to load media:", error);
      toast.error("Failed to load media");
    }
  };

  // Remove an item from history
  const handleRemoveFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromHistory(id);
  };

  // Clear all history
  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear all history?")) {
      clearMediaHistory();
    }
  };

  // Format date for display
  const formatDate = (timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return "Unknown time";
    }
  };

  // No longer need to check if there's any history to show since we're displaying count in the header

  return (
    <>
      {/* Hidden button that can be triggered from the header */}
      <button
        id="historyDrawerToggle"
        onClick={toggleDrawer}
        className="hidden"
        aria-label={isDrawerOpen ? "Close recent media" : "Open recent media"}
      />

      {/* Original floating button - now hidden since we moved it to the header */}
      {/* <Button
        variant="outline"
        size="icon"
        className="fixed right-4 bottom-60 sm:bottom-42 sm:right-24 z-20 p-2.5 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
        onClick={toggleDrawer}
        title={
          hasHistory
            ? `Media History (${mediaHistory.length} items)`
            : "Media History"
        }
      >
        <History size={20} />
        {hasHistory && (
          <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {mediaHistory.length > 9 ? "9+" : mediaHistory.length}
          </span>
        )}
      </Button> */}

      {/* History drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-[60] w-full sm:w-96 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out",
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <History size={20} />
              Recent Media
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearHistory}
                title="Clear all history"
                className="text-gray-500 hover:text-red-500"
              >
                <Trash2 size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDrawer}
                title="Close recent media"
              >
                <X size={20} />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            defaultValue="all"
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "all" | "files" | "youtube")
            }
            className="w-full"
          >
            <div className="px-4 pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">
                  All
                </TabsTrigger>
                <TabsTrigger value="files" className="flex-1">
                  Audio Files
                </TabsTrigger>
                <TabsTrigger value="youtube" className="flex-1">
                  YouTube
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Content area - same for all tabs, just filtered differently */}
            <TabsContent value="all" className="flex-1 overflow-y-auto">
              <HistoryList
                historyItems={filteredHistory}
                onLoadItem={handleLoadFromHistory}
                onRemoveItem={handleRemoveFromHistory}
                formatDate={formatDate}
              />
            </TabsContent>
            <TabsContent value="files" className="flex-1 overflow-y-auto">
              <HistoryList
                historyItems={filteredHistory}
                onLoadItem={handleLoadFromHistory}
                onRemoveItem={handleRemoveFromHistory}
                formatDate={formatDate}
              />
            </TabsContent>
            <TabsContent value="youtube" className="flex-1 overflow-y-auto">
              <HistoryList
                historyItems={filteredHistory}
                onLoadItem={handleLoadFromHistory}
                onRemoveItem={handleRemoveFromHistory}
                formatDate={formatDate}
              />
            </TabsContent>
          </Tabs>

          {/* Storage usage information at the bottom of the drawer */}
          <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700">
            <StorageUsageInfo />
          </div>
        </div>
      </div>
    </>
  );
};
