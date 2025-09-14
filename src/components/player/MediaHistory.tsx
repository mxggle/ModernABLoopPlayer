import { useState, useEffect } from "react";
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
  Folder,
  FolderPlus,
  Pencil,
  Filter,
} from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../utils/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { StorageUsageInfo } from "./StorageUsageInfo";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";

// History list component
interface HistoryListProps {
  historyItems: MediaHistoryItem[];
  onLoadItem: (item: MediaHistoryItem) => void;
  onRemoveItem: (id: string, e: React.MouseEvent) => void;
  formatDate: (timestamp: number) => string;
  onDragStartItem?: (id: string) => void;
  onDragEndItem?: () => void;
}

const HistoryList = ({
  historyItems,
  onLoadItem,
  onRemoveItem,
  formatDate,
  onDragStartItem,
  onDragEndItem,
}: HistoryListProps) => {
  const { mediaFolders, moveHistoryItemToFolder } = usePlayerStore();
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
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", item.id);
            e.dataTransfer.effectAllowed = "move";
            onDragStartItem?.(item.id);
          }}
          onDragEnd={() => onDragEndItem?.()}
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
            <RenameItemButton item={item} />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                  title="Move to folder"
                >
                  <Folder size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Move to folder</div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant={!item.folderId ? "default" : "outline"}
                      size="sm"
                      onClick={() => moveHistoryItemToFolder(item.id, null)}
                    >
                      Unfiled
                    </Button>
                    {Object.values(mediaFolders).map((f) => (
                      <Button
                        key={f.id}
                        variant={item.folderId === f.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => moveHistoryItemToFolder(item.id, f.id)}
                      >
                        <Folder size={14} className="mr-1" /> {f.name}
                      </Button>
                    ))}
                    <NewFolderForMoveButton itemId={item.id} />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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

export const MediaHistory = ({
  embedded = false,
  title,
}: {
  embedded?: boolean;
  title?: string;
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "files" | "youtube">(
    "all"
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredFolder, setHoveredFolder] = useState<
    string | "unfiled" | "all" | null
  >(null);

  const {
    mediaHistory,
    removeFromHistory,
    clearMediaHistory,
    mediaFolders,
    historySortBy,
    historySortOrder,
    historyFolderFilter,
    setHistoryFolderFilter,
    setHistorySort,
    createMediaFolder,
    renameMediaFolder,
    deleteMediaFolder,
    moveHistoryItemToFolder,
    renameHistoryItem,
    startPlaybackQueue,
  } = usePlayerStore();

  const navigate = useNavigate();

  // Toggle drawer (no-op in embedded mode)
  const toggleDrawer = () => {
    if (embedded) return;
    setIsDrawerOpen(!isDrawerOpen);
  };

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (embedded) return; // do not lock body for embedded panel
    if (isDrawerOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isDrawerOpen]);

  // Filter by tab
  const byTab = mediaHistory.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "files") return item.type === "file";
    if (activeTab === "youtube") return item.type === "youtube";
    return true;
  });

  // Filter by folder
  const byFolder = byTab.filter((item) => {
    if (historyFolderFilter === "all") return true;
    if (historyFolderFilter === "unfiled") return !item.folderId;
    return item.folderId === historyFolderFilter;
  });

  // Sort
  const sortedHistory = byFolder.slice().sort((a, b) => {
    const dir = historySortOrder === "asc" ? 1 : -1;
    if (historySortBy === "date") {
      return (a.accessedAt - b.accessedAt) * dir;
    }
    if (historySortBy === "name") {
      const an = (a.name || "").toLowerCase();
      const bn = (b.name || "").toLowerCase();
      if (an < bn) return -1 * dir;
      if (an > bn) return 1 * dir;
      return 0;
    }
    if (historySortBy === "type") {
      const at = a.type;
      const bt = b.type;
      if (at < bt) return -1 * dir;
      if (at > bt) return 1 * dir;
      return 0;
    }
    return 0;
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
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const handleClearHistory = () => setConfirmClearOpen(true);

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
      {!embedded && (
        <button
          id="historyDrawerToggle"
          onClick={toggleDrawer}
          className="hidden"
          aria-label={isDrawerOpen ? "Close recent media" : "Open recent media"}
        />
      )}

      {embedded ? (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History size={18} /> {"Media Library"}
              </h2>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" title="Sort">
                      <Filter size={16} className="mr-1" />
                      Sort
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Sort by</div>
                      <div className="flex flex-wrap gap-2">
                        {["date", "name", "type"].map((k) => (
                          <Button
                            key={k}
                            variant={
                              historySortBy === (k as any)
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              setHistorySort(k as any, historySortOrder)
                            }
                          >
                            {k}
                          </Button>
                        ))}
                      </div>
                      <div className="text-sm font-medium">Order</div>
                      <div className="flex gap-2">
                        {["asc", "desc"].map((o) => (
                          <Button
                            key={o}
                            variant={
                              historySortOrder === (o as any)
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              setHistorySort(historySortBy, o as any)
                            }
                          >
                            {o}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <NewFolderButton />
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    startPlaybackQueue(sortedHistory.map((i) => i.id))
                  }
                  title="Play all"
                >
                  <Play size={16} className="mr-1" /> Play All
                </Button>
              </div>
            </div>
            {/* Main content area with sidebar */}
            <div className="flex flex-col sm:flex-row min-h-[360px]">
              {/* Sidebar: same as drawer */}
              <aside className="w-full sm:w-56 shrink-0 border-r-0 sm:border-r border-gray-200 dark:border-gray-700 p-3 overflow-y-auto overscroll-contain block">
                <div className="text-xs uppercase text-gray-500 mb-2">
                  Folders
                </div>
                <div className="space-y-1">
                  {[
                    { id: "all", name: "All" },
                    { id: "unfiled", name: "Unfiled" },
                    ...Object.values(mediaFolders),
                  ].map((f: any) => (
                    <button
                      key={f.id}
                      onClick={() => setHistoryFolderFilter(f.id as any)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDragEnter={() => setHoveredFolder(f.id)}
                      onDragLeave={() => setHoveredFolder(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id =
                          e.dataTransfer.getData("text/plain") || draggingId;
                        if (!id) return;
                        if (f.id === "all") return;
                        moveHistoryItemToFolder(
                          id,
                          f.id === "unfiled" ? null : f.id
                        );
                        setHoveredFolder(null);
                        setDraggingId(null);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 group",
                        historyFolderFilter === f.id
                          ? "bg-gray-100 dark:bg-gray-700 font-medium"
                          : "",
                        hoveredFolder === f.id ? "ring-2 ring-purple-500" : ""
                      )}
                    >
                      {f.id !== "all" && f.id !== "unfiled" && (
                        <Folder size={14} />
                      )}
                      <span className="truncate">{f.name}</span>
                      {f.id !== "all" && f.id !== "unfiled" && (
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              // Open rename dialog for this folder
                              const dialog = document.getElementById(
                                `rename-folder-${f.id}`
                              ) as HTMLButtonElement;
                              if (dialog) dialog.click();
                            }}
                            title="Edit folder name"
                          >
                            <Pencil size={12} />
                          </Button>
                          <RenameFolderButton folderId={f.id} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </aside>
              {/* Content */}
              <div className="flex-1 min-w-0 border-t sm:border-t-0 border-gray-200 dark:border-gray-700">
                <Tabs
                  defaultValue="all"
                  value={activeTab}
                  onValueChange={(value) => setActiveTab(value as any)}
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
                  <TabsContent value="all" className="flex-1 overflow-y-auto">
                    <HistoryList
                      historyItems={sortedHistory}
                      onLoadItem={handleLoadFromHistory}
                      onRemoveItem={handleRemoveFromHistory}
                      formatDate={formatDate}
                      onDragStartItem={(id) => setDraggingId(id)}
                      onDragEndItem={() => setDraggingId(null)}
                    />
                  </TabsContent>
                  <TabsContent value="files" className="flex-1 overflow-y-auto">
                    <HistoryList
                      historyItems={sortedHistory}
                      onLoadItem={handleLoadFromHistory}
                      onRemoveItem={handleRemoveFromHistory}
                      formatDate={formatDate}
                      onDragStartItem={(id) => setDraggingId(id)}
                      onDragEndItem={() => setDraggingId(null)}
                    />
                  </TabsContent>
                  <TabsContent
                    value="youtube"
                    className="flex-1 overflow-y-auto"
                  >
                    <HistoryList
                      historyItems={sortedHistory}
                      onLoadItem={handleLoadFromHistory}
                      onRemoveItem={handleRemoveFromHistory}
                      formatDate={formatDate}
                      onDragStartItem={(id) => setDraggingId(id)}
                      onDragEndItem={() => setDraggingId(null)}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            {/* Footer storage bar */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <StorageUsageInfo />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Backdrop */}
          <div
            className={cn(
              "fixed inset-0 z-[59] bg-black/40 transition-opacity",
              isDrawerOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            )}
            onClick={toggleDrawer}
          />

          {/* History drawer */}
          <div
            className={cn(
              "fixed inset-y-0 right-0 z-[60] w-full sm:w-[720px] bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out overflow-hidden",
              isDrawerOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History size={20} />
                  {title || "Recent Media"}
                </h2>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" title="Sort">
                        <Filter size={16} className="mr-1" />
                        Sort
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Sort by</div>
                        <div className="flex flex-wrap gap-2">
                          {["date", "name", "type"].map((k) => (
                            <Button
                              key={k}
                              variant={
                                historySortBy === (k as any)
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                setHistorySort(k as any, historySortOrder)
                              }
                            >
                              {k}
                            </Button>
                          ))}
                        </div>
                        <div className="text-sm font-medium">Order</div>
                        <div className="flex gap-2">
                          {["asc", "desc"].map((o) => (
                            <Button
                              key={o}
                              variant={
                                historySortOrder === (o as any)
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                setHistorySort(historySortBy, o as any)
                              }
                            >
                              {o}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <NewFolderButton />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() =>
                      startPlaybackQueue(sortedHistory.map((i) => i.id))
                    }
                    title="Play all"
                  >
                    <Play size={16} className="mr-1" /> Play All
                  </Button>
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
              {/* Main content area with sidebar */}
              <div className="flex flex-1 min-h-0">
                {/* Sidebar: folders (hidden on mobile) */}
                <aside className="hidden sm:block w-56 shrink-0 border-r border-gray-200 dark:border-gray-700 p-3 overflow-y-auto overscroll-contain">
                  <div className="text-xs uppercase text-gray-500 mb-2">
                    Folders
                  </div>
                  <div className="space-y-1">
                    {[
                      { id: "all", name: "All" },
                      { id: "unfiled", name: "Unfiled" },
                      ...Object.values(mediaFolders),
                    ].map((f: any) => (
                      <button
                        key={f.id}
                        onClick={() => setHistoryFolderFilter(f.id as any)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDragEnter={() => setHoveredFolder(f.id)}
                        onDragLeave={() => setHoveredFolder(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          const id =
                            e.dataTransfer.getData("text/plain") || draggingId;
                          if (!id) return;
                          if (f.id === "all") return;
                          moveHistoryItemToFolder(
                            id,
                            f.id === "unfiled" ? null : f.id
                          );
                          setHoveredFolder(null);
                          setDraggingId(null);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 group",
                          historyFolderFilter === f.id
                            ? "bg-gray-100 dark:bg-gray-700 font-medium"
                            : "",
                          hoveredFolder === f.id ? "ring-2 ring-purple-500" : ""
                        )}
                      >
                        {f.id !== "all" && f.id !== "unfiled" && (
                          <Folder size={14} />
                        )}
                        <span className="truncate">{f.name}</span>
                        {f.id !== "all" && f.id !== "unfiled" && (
                          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                // Open rename dialog for this folder
                                const dialog = document.getElementById(
                                  `rename-folder-${f.id}`
                                ) as HTMLButtonElement;
                                if (dialog) dialog.click();
                              }}
                              title="Edit folder name"
                            >
                              <Pencil size={12} />
                            </Button>
                            <RenameFolderButton folderId={f.id} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </aside>

                {/* Content */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0">
                  {/* Mobile folder chips */}
                  <div className="sm:hidden px-3 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <div className="flex items-center gap-2">
                      {(
                        [
                          { id: "all", name: "All" },
                          { id: "unfiled", name: "Unfiled" },
                          ...Object.values(mediaFolders),
                        ] as { id: string; name: string }[]
                      ).map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setHistoryFolderFilter(f.id as any)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDragEnter={() => setHoveredFolder(f.id)}
                          onDragLeave={() => setHoveredFolder(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            const id =
                              e.dataTransfer.getData("text/plain") ||
                              draggingId;
                            if (!id) return;
                            if (f.id === "all") return;
                            moveHistoryItemToFolder(
                              id,
                              f.id === "unfiled" ? null : f.id
                            );
                            setHoveredFolder(null);
                            setDraggingId(null);
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm border group relative",
                            historyFolderFilter === f.id
                              ? "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                            hoveredFolder === f.id
                              ? "ring-2 ring-purple-500"
                              : ""
                          )}
                        >
                          {f.id !== "all" && f.id !== "unfiled" && (
                            <span className="inline-flex items-center mr-1 align-middle">
                              <Folder size={14} />
                            </span>
                          )}
                          <span className="align-middle">{f.name}</span>
                          {f.id !== "all" && f.id !== "unfiled" && (
                            <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 p-0 align-middle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  // Open rename dialog for this folder
                                  const dialog = document.getElementById(
                                    `rename-folder-${f.id}`
                                  ) as HTMLButtonElement;
                                  if (dialog) dialog.click();
                                }}
                                title="Edit folder name"
                              >
                                <Pencil size={10} />
                              </Button>
                              <RenameFolderButton folderId={f.id} />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Tabs
                    defaultValue="all"
                    value={activeTab}
                    onValueChange={(value) =>
                      setActiveTab(value as "all" | "files" | "youtube")
                    }
                    className="w-full flex-1 flex flex-col min-h-0"
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

                    <TabsContent
                      value="all"
                      className="flex-1 overflow-y-auto overscroll-contain"
                    >
                      <HistoryList
                        historyItems={sortedHistory}
                        onLoadItem={handleLoadFromHistory}
                        onRemoveItem={handleRemoveFromHistory}
                        formatDate={formatDate}
                        onDragStartItem={(id) => setDraggingId(id)}
                        onDragEndItem={() => setDraggingId(null)}
                      />
                    </TabsContent>
                    <TabsContent
                      value="files"
                      className="flex-1 overflow-y-auto overscroll-contain"
                    >
                      <HistoryList
                        historyItems={sortedHistory}
                        onLoadItem={handleLoadFromHistory}
                        onRemoveItem={handleRemoveFromHistory}
                        formatDate={formatDate}
                        onDragStartItem={(id) => setDraggingId(id)}
                        onDragEndItem={() => setDraggingId(null)}
                      />
                    </TabsContent>
                    <TabsContent
                      value="youtube"
                      className="flex-1 overflow-y-auto overscroll-contain"
                    >
                      <HistoryList
                        historyItems={sortedHistory}
                        onLoadItem={handleLoadFromHistory}
                        onRemoveItem={handleRemoveFromHistory}
                        formatDate={formatDate}
                        onDragStartItem={(id) => setDraggingId(id)}
                        onDragEndItem={() => setDraggingId(null)}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* Storage usage information at the bottom of the drawer */}
              <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700">
                <StorageUsageInfo />
              </div>
            </div>
          </div>
        </>
      )}
      {/* Dialogs */}
      <ConfirmClearDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        onConfirm={() => {
          clearMediaHistory();
          setConfirmClearOpen(false);
        }}
      />
    </>
  );
};

// Small components for cleaner JSX
function NewFolderButton({ fullWidth = false }: { fullWidth?: boolean }) {
  const { createMediaFolder } = usePlayerStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={fullWidth ? "w-full" : undefined}
        onClick={() => setOpen(true)}
        title="New folder"
      >
        <FolderPlus size={16} className="mr-1" /> New
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>Enter a name for the folder.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (name.trim()) {
                  createMediaFolder(name.trim());
                  setName("");
                  setOpen(false);
                }
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (name.trim()) {
                  createMediaFolder(name.trim());
                  setName("");
                  setOpen(false);
                }
              }}
              disabled={!name.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RenameFolderButton({ folderId }: { folderId: string }) {
  const { mediaFolders, renameMediaFolder } = usePlayerStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  // Update name when dialog opens to get the latest folder name
  useEffect(() => {
    if (open) {
      setName(mediaFolders[folderId]?.name || "");
    }
  }, [open, folderId, mediaFolders]);

  return (
    <>
      <Button
        id={`rename-folder-${folderId}`}
        variant="outline"
        size="sm"
        title="Rename folder"
        onClick={() => setOpen(true)}
        className="hidden"
      >
        <Pencil size={16} className="mr-1" /> Rename
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>Update the folder name.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (name.trim()) {
                  renameMediaFolder(folderId, name.trim());
                  setOpen(false);
                }
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (name.trim()) {
                  renameMediaFolder(folderId, name.trim());
                  setOpen(false);
                }
              }}
              disabled={!name.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeleteFolderButton({ folderId }: { folderId: string }) {
  const { deleteMediaFolder } = usePlayerStore();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        title="Delete folder"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={16} className="mr-1" /> Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Items will be moved to Unfiled. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteMediaFolder(folderId);
                setOpen(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConfirmClearDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear All History</DialogTitle>
          <DialogDescription>
            This will remove all media entries and clear stored files.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={onConfirm}>
            Clear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameItemButton({ item }: { item: MediaHistoryItem }) {
  const { renameHistoryItem } = usePlayerStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item.name);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Rename item"
      >
        <Pencil size={16} />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Item</DialogTitle>
            <DialogDescription>Update the item name.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                renameHistoryItem(item.id, name.trim());
                setOpen(false);
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (name.trim()) {
                  renameHistoryItem(item.id, name.trim());
                  setOpen(false);
                }
              }}
              disabled={!name.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NewFolderForMoveButton({ itemId }: { itemId: string }) {
  const { createMediaFolder, moveHistoryItemToFolder } = usePlayerStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <FolderPlus size={14} className="mr-1" /> New Folder
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>
              Enter a name and we’ll move the item there.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                const id = createMediaFolder(name.trim());
                moveHistoryItemToFolder(itemId, id);
                setOpen(false);
                setName("");
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (name.trim()) {
                  const id = createMediaFolder(name.trim());
                  moveHistoryItemToFolder(itemId, id);
                  setOpen(false);
                  setName("");
                }
              }}
              disabled={!name.trim()}
            >
              Create & Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
