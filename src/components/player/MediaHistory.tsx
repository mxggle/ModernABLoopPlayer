import { useState, useEffect, useMemo } from "react";
import {
  usePlayerStore,
  type MediaHistoryItem,
  type MediaFolder,
} from "../../stores/playerStore";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
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
  ArrowUpDown,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Home,
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

// Folder item component for displaying folders in the main area
interface FolderItemProps {
  folder: MediaFolder;
  onNavigate: (folderId: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  isHovered?: boolean;
}

const FolderItem = ({
  folder,
  onNavigate,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  isHovered,
}: FolderItemProps) => {
  const { t } = useTranslation();

  return (
    <div
      onClick={() => onNavigate(folder.id)}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex items-center gap-3 p-4 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 mb-2 group border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
        isHovered ? "ring-2 ring-purple-500" : ""
      )}
    >
      <div className="shrink-0">
        <Folder size={24} className="text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium truncate">{folder.name}</h3>
        <p className="text-xs text-gray-500">{t("history.folder")}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <RenameFolderButton folderId={folder.id} />
        <ChevronRight size={16} className="text-gray-400" />
      </div>
    </div>
  );
};

// History list component
interface HistoryListProps {
  historyItems: MediaHistoryItem[];
  onLoadItem: (item: MediaHistoryItem) => void;
  onRemoveItem: (id: string, e: React.MouseEvent) => void;
  formatDate: (timestamp: number) => string;
  onDragStartItem?: (id: string) => void;
  onDragEndItem?: () => void;
  currentFolderId?: string | null;
}

// Breadcrumb navigation component
interface BreadcrumbNavProps {
  currentFolderId: string | null;
  folderBreadcrumb: MediaFolder[];
  onNavigateToFolder: (folderId: string | null) => void;
  onNavigateUp: () => void;
  canNavigateUp: boolean;
}

const BreadcrumbNav = ({
  folderBreadcrumb,
  onNavigateToFolder,
  onNavigateUp,
  canNavigateUp,
}: BreadcrumbNavProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <Button
        variant="ghost"
        size="sm"
        onClick={onNavigateUp}
        disabled={!canNavigateUp}
        title={t("history.goBack")}
        className="shrink-0"
      >
        <ChevronLeft size={16} className="mr-1" />
        {t("history.back")}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigateToFolder(null)}
        title={t("history.goToRoot")}
        className="shrink-0"
      >
        <Home size={16} />
      </Button>

      <div className="flex items-center gap-1 min-w-0 text-sm text-gray-600 dark:text-gray-400">
        <button
          onClick={() => onNavigateToFolder(null)}
          className="hover:text-gray-900 dark:hover:text-gray-200 truncate"
        >
          {t("history.libraryRoot")}
        </button>
        {folderBreadcrumb.map((folder) => (
          <div key={folder.id} className="flex items-center gap-1">
            <span>/</span>
            <button
              onClick={() => onNavigateToFolder(folder.id)}
              className="hover:text-gray-900 dark:hover:text-gray-200 truncate"
            >
              {folder.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const HistoryList = ({
  historyItems,
  onLoadItem,
  onRemoveItem,
  formatDate,
  onDragStartItem,
  onDragEndItem,
  currentFolderId,
}: HistoryListProps) => {
  const { t } = useTranslation();
  const { mediaFolders, moveHistoryItemToFolder } = usePlayerStore();
  if (historyItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Clock size={48} className="mb-2 opacity-30" />
        <p>{t("history.noHistoryItems")}</p>
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
              title={t("history.playMedia")}
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
                  title={t("history.moveToFolder")}
                >
                  <Folder size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    {t("history.moveToFolder")}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant={!item.folderId ? "default" : "outline"}
                      size="sm"
                      onClick={() => moveHistoryItemToFolder(item.id, null)}
                    >
                      {t("history.unfiled")}
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
                    <NewFolderForMoveButton
                      itemId={item.id}
                      parentFolderId={currentFolderId ?? null}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600"
              onClick={(e) => onRemoveItem(item.id, e)}
              title={t("history.removeFromHistory")}
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
  const { t } = useTranslation();
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
    moveHistoryItemToFolder,
    startPlaybackQueue,
  } = usePlayerStore();

  const navigate = useNavigate();

  const currentFolderId =
    historyFolderFilter === "all" || historyFolderFilter === "unfiled"
      ? null
      : historyFolderFilter;

  const foldersByParent = useMemo(() => {
    const map = new Map<string | null, MediaFolder[]>();
    Object.values(mediaFolders).forEach((folder) => {
      const parentKey = folder.parentId ?? null;
      const list = map.get(parentKey);
      if (list) {
        list.push(folder);
      } else {
        map.set(parentKey, [folder]);
      }
    });
    map.forEach((list) => {
      list.sort((a, b) => a.name.localeCompare(b.name));
    });
    return map;
  }, [mediaFolders]);

  // Get folders and files for the current level
  const currentLevelFolders =
    foldersByParent.get(currentFolderId ?? null) ?? [];

  const folderBreadcrumb = useMemo(() => {
    if (!currentFolderId) return [];
    const path: MediaFolder[] = [];
    let nextId: string | null = currentFolderId;
    while (nextId) {
      const currentFolder: MediaFolder | undefined =
        mediaFolders[nextId as string];
      if (!currentFolder) break;
      path.unshift(currentFolder);
      nextId = currentFolder.parentId ?? null;
    }
    return path;
  }, [currentFolderId, mediaFolders]);

  const handleNavigateToFolder = (folderId: string | null) => {
    if (!folderId) {
      setHistoryFolderFilter("unfiled");
      return;
    }
    setHistoryFolderFilter(folderId);
  };

  const handleNavigateUp = () => {
    if (!currentFolderId) {
      return; // Already at root
    }
    const parentId = mediaFolders[currentFolderId]?.parentId ?? null;
    handleNavigateToFolder(parentId);
  };

  const canNavigateUp = currentFolderId !== null;

  const sortHistoryItems = (items: MediaHistoryItem[]) => {
    const dir = historySortOrder === "asc" ? 1 : -1;
    return items.slice().sort((a, b) => {
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
  };

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

  const byTab = useMemo(() => {
    return mediaHistory.filter((item) => {
      if (activeTab === "all") return true;
      if (activeTab === "files") return item.type === "file";
      if (activeTab === "youtube") return item.type === "youtube";
      return true;
    });
  }, [mediaHistory, activeTab]);

  const byFolder = useMemo(() => {
    return byTab.filter((item) => {
      if (historyFolderFilter === "all") return true;
      if (historyFolderFilter === "unfiled") return !item.folderId;
      return item.folderId === historyFolderFilter;
    });
  }, [byTab, historyFolderFilter]);

  const sortedHistory = useMemo(
    () => sortHistoryItems(byFolder),
    [byFolder, historySortBy, historySortOrder]
  );

  const currentFolderHistory = useMemo(() => {
    const targetFolderId = currentFolderId ?? null;
    const filtered = byTab.filter((item) =>
      targetFolderId ? item.folderId === targetFolderId : !item.folderId
    );
    return sortHistoryItems(filtered);
  }, [byTab, currentFolderId, historySortBy, historySortOrder]);

  const displayedHistory =
    historyFolderFilter === "all" ? sortedHistory : currentFolderHistory;

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
      toast.error(t("history.failedToLoadMedia"));
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
          aria-label={
            isDrawerOpen
              ? t("history.closeRecentMedia")
              : t("history.openRecentMedia")
          }
        />
      )}

      {embedded ? (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History size={18} /> {t("history.mediaLibrary")}
              </h2>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      title={t("history.sort")}
                      className="hidden sm:flex"
                    >
                      <ArrowUpDown size={16} className="mr-1" />
                      {t("history.sort")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        {t("history.sortBy")}
                      </div>
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
                            {t(`history.${k}`)}
                          </Button>
                        ))}
                      </div>
                      <div className="text-sm font-medium">
                        {t("history.order")}
                      </div>
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
                            {t(`history.${o}`)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <NewFolderButton parentId={currentFolderId} />
                {/* Mobile-only icon buttons */}
                <div className="flex sm:hidden items-center gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t("history.sort")}
                      >
                        <ArrowUpDown size={18} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          {t("history.sortBy")}
                        </div>
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
                              {t(`history.${k}`)}
                            </Button>
                          ))}
                        </div>
                        <div className="text-sm font-medium">
                          {t("history.order")}
                        </div>
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
                              {t(`history.${o}`)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() =>
                      startPlaybackQueue(displayedHistory.map((i) => i.id))
                    }
                    title={t("history.playAll")}
                  >
                    <PlayCircle size={18} />
                  </Button>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    startPlaybackQueue(displayedHistory.map((i) => i.id))
                  }
                  title={t("history.playAll")}
                  className="hidden sm:flex"
                >
                  <PlayCircle size={16} className="mr-1" />{" "}
                  {t("history.playAll")}
                </Button>
              </div>
            </div>
            {/* Breadcrumb Navigation */}
            <BreadcrumbNav
              currentFolderId={currentFolderId}
              folderBreadcrumb={folderBreadcrumb}
              onNavigateToFolder={handleNavigateToFolder}
              onNavigateUp={handleNavigateUp}
              canNavigateUp={canNavigateUp}
            />

            {/* Main content area */}
            <div className="flex flex-col min-h-[360px]">
              <div className="flex-1 min-w-0">
                <Tabs
                  defaultValue="all"
                  value={activeTab}
                  onValueChange={(value) => setActiveTab(value as any)}
                  className="w-full"
                >
                  <div className="px-4 pt-2">
                    <TabsList className="w-full">
                      <TabsTrigger value="all" className="flex-1">
                        {t("history.all")}
                      </TabsTrigger>
                      <TabsTrigger value="files" className="flex-1">
                        {t("history.audioFiles")}
                      </TabsTrigger>
                      <TabsTrigger value="youtube" className="flex-1">
                        {t("history.youtube")}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="all" className="flex-1 overflow-y-auto">
                    <div className="p-2">
                      {/* Show folders first */}
                      {currentLevelFolders.map((folder) => (
                        <FolderItem
                          key={folder.id}
                          folder={folder}
                          onNavigate={handleNavigateToFolder}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDragEnter={() => setHoveredFolder(folder.id)}
                          onDragLeave={() => setHoveredFolder(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            const id =
                              e.dataTransfer.getData("text/plain") ||
                              draggingId;
                            if (!id) return;
                            moveHistoryItemToFolder(id, folder.id);
                            setHoveredFolder(null);
                            setDraggingId(null);
                          }}
                          isHovered={hoveredFolder === folder.id}
                        />
                      ))}

                      {/* Then show media files */}
                      <HistoryList
                        historyItems={displayedHistory}
                        onLoadItem={handleLoadFromHistory}
                        onRemoveItem={handleRemoveFromHistory}
                        formatDate={formatDate}
                        onDragStartItem={(id) => setDraggingId(id)}
                        onDragEndItem={() => setDraggingId(null)}
                        currentFolderId={currentFolderId}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="files" className="flex-1 overflow-y-auto">
                    <div className="p-2">
                      {/* Show folders first */}
                      {currentLevelFolders.map((folder) => (
                        <FolderItem
                          key={folder.id}
                          folder={folder}
                          onNavigate={handleNavigateToFolder}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDragEnter={() => setHoveredFolder(folder.id)}
                          onDragLeave={() => setHoveredFolder(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            const id =
                              e.dataTransfer.getData("text/plain") ||
                              draggingId;
                            if (!id) return;
                            moveHistoryItemToFolder(id, folder.id);
                            setHoveredFolder(null);
                            setDraggingId(null);
                          }}
                          isHovered={hoveredFolder === folder.id}
                        />
                      ))}

                      {/* Then show media files */}
                      <HistoryList
                        historyItems={displayedHistory}
                        onLoadItem={handleLoadFromHistory}
                        onRemoveItem={handleRemoveFromHistory}
                        formatDate={formatDate}
                        onDragStartItem={(id) => setDraggingId(id)}
                        onDragEndItem={() => setDraggingId(null)}
                        currentFolderId={currentFolderId}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="youtube"
                    className="flex-1 overflow-y-auto"
                  >
                    <div className="p-2">
                      {/* Show folders first */}
                      {currentLevelFolders.map((folder) => (
                        <FolderItem
                          key={folder.id}
                          folder={folder}
                          onNavigate={handleNavigateToFolder}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDragEnter={() => setHoveredFolder(folder.id)}
                          onDragLeave={() => setHoveredFolder(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            const id =
                              e.dataTransfer.getData("text/plain") ||
                              draggingId;
                            if (!id) return;
                            moveHistoryItemToFolder(id, folder.id);
                            setHoveredFolder(null);
                            setDraggingId(null);
                          }}
                          isHovered={hoveredFolder === folder.id}
                        />
                      ))}

                      {/* Then show media files */}
                      <HistoryList
                        historyItems={displayedHistory}
                        onLoadItem={handleLoadFromHistory}
                        onRemoveItem={handleRemoveFromHistory}
                        formatDate={formatDate}
                        onDragStartItem={(id) => setDraggingId(id)}
                        onDragEndItem={() => setDraggingId(null)}
                        currentFolderId={currentFolderId}
                      />
                    </div>
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
                  {title || t("history.recentMedia")}
                </h2>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={t("history.sort")}
                        className="hidden sm:flex"
                      >
                        <ArrowUpDown size={16} className="mr-1" />
                        {t("history.sort")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          {t("history.sortBy")}
                        </div>
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
                        <div className="text-sm font-medium">
                          {t("history.order")}
                        </div>
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
                  <NewFolderButton parentId={currentFolderId} />
                  {/* Mobile-only icon buttons */}
                  <div className="flex sm:hidden items-center gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("history.sort")}
                        >
                          <ArrowUpDown size={18} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">
                            {t("history.sortBy")}
                          </div>
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
                                {t(`history.${k}`)}
                              </Button>
                            ))}
                          </div>
                          <div className="text-sm font-medium">
                            {t("history.order")}
                          </div>
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
                                {t(`history.${o}`)}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() =>
                        startPlaybackQueue(displayedHistory.map((i) => i.id))
                      }
                      title={t("history.playAll")}
                    >
                      <PlayCircle size={18} />
                    </Button>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() =>
                      startPlaybackQueue(displayedHistory.map((i) => i.id))
                    }
                    title={t("history.playAll")}
                    className="hidden sm:flex"
                  >
                    <PlayCircle size={16} className="mr-1" />{" "}
                    {t("history.playAll")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearHistory}
                    title={t("history.clearAllHistory")}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleDrawer}
                    title={t("history.closeRecentMedia")}
                  >
                    <X size={20} />
                  </Button>
                </div>
              </div>
              {/* Breadcrumb Navigation */}
              <BreadcrumbNav
                currentFolderId={currentFolderId}
                folderBreadcrumb={folderBreadcrumb}
                onNavigateToFolder={handleNavigateToFolder}
                onNavigateUp={handleNavigateUp}
                canNavigateUp={canNavigateUp}
              />

              {/* Main content area */}
              <div className="flex flex-1 min-h-0">
                <div className="flex-1 flex flex-col min-w-0 min-h-0">
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
                          {t("history.all")}
                        </TabsTrigger>
                        <TabsTrigger value="files" className="flex-1">
                          {t("history.audioFiles")}
                        </TabsTrigger>
                        <TabsTrigger value="youtube" className="flex-1">
                          {t("history.youtube")}
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent
                      value="all"
                      className="flex-1 overflow-y-auto overscroll-contain"
                    >
                      <div className="p-2">
                        {/* Show folders first */}
                        {currentLevelFolders.map((folder) => (
                          <FolderItem
                            key={folder.id}
                            folder={folder}
                            onNavigate={handleNavigateToFolder}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                            }}
                            onDragEnter={() => setHoveredFolder(folder.id)}
                            onDragLeave={() => setHoveredFolder(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              const id =
                                e.dataTransfer.getData("text/plain") ||
                                draggingId;
                              if (!id) return;
                              moveHistoryItemToFolder(id, folder.id);
                              setHoveredFolder(null);
                              setDraggingId(null);
                            }}
                            isHovered={hoveredFolder === folder.id}
                          />
                        ))}

                        {/* Then show media files */}
                        <HistoryList
                          historyItems={displayedHistory}
                          onLoadItem={handleLoadFromHistory}
                          onRemoveItem={handleRemoveFromHistory}
                          formatDate={formatDate}
                          onDragStartItem={(id) => setDraggingId(id)}
                          onDragEndItem={() => setDraggingId(null)}
                          currentFolderId={currentFolderId}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="files"
                      className="flex-1 overflow-y-auto overscroll-contain"
                    >
                      <div className="p-2">
                        {/* Show folders first */}
                        {currentLevelFolders.map((folder) => (
                          <FolderItem
                            key={folder.id}
                            folder={folder}
                            onNavigate={handleNavigateToFolder}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                            }}
                            onDragEnter={() => setHoveredFolder(folder.id)}
                            onDragLeave={() => setHoveredFolder(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              const id =
                                e.dataTransfer.getData("text/plain") ||
                                draggingId;
                              if (!id) return;
                              moveHistoryItemToFolder(id, folder.id);
                              setHoveredFolder(null);
                              setDraggingId(null);
                            }}
                            isHovered={hoveredFolder === folder.id}
                          />
                        ))}

                        {/* Then show media files */}
                        <HistoryList
                          historyItems={displayedHistory}
                          onLoadItem={handleLoadFromHistory}
                          onRemoveItem={handleRemoveFromHistory}
                          formatDate={formatDate}
                          onDragStartItem={(id) => setDraggingId(id)}
                          onDragEndItem={() => setDraggingId(null)}
                          currentFolderId={currentFolderId}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="youtube"
                      className="flex-1 overflow-y-auto overscroll-contain"
                    >
                      <div className="p-2">
                        {/* Show folders first */}
                        {currentLevelFolders.map((folder) => (
                          <FolderItem
                            key={folder.id}
                            folder={folder}
                            onNavigate={handleNavigateToFolder}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                            }}
                            onDragEnter={() => setHoveredFolder(folder.id)}
                            onDragLeave={() => setHoveredFolder(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              const id =
                                e.dataTransfer.getData("text/plain") ||
                                draggingId;
                              if (!id) return;
                              moveHistoryItemToFolder(id, folder.id);
                              setHoveredFolder(null);
                              setDraggingId(null);
                            }}
                            isHovered={hoveredFolder === folder.id}
                          />
                        ))}

                        {/* Then show media files */}
                        <HistoryList
                          historyItems={displayedHistory}
                          onLoadItem={handleLoadFromHistory}
                          onRemoveItem={handleRemoveFromHistory}
                          formatDate={formatDate}
                          onDragStartItem={(id) => setDraggingId(id)}
                          onDragEndItem={() => setDraggingId(null)}
                          currentFolderId={currentFolderId}
                        />
                      </div>
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
function NewFolderButton({
  fullWidth = false,
  parentId = null,
}: {
  fullWidth?: boolean;
  parentId?: string | null;
}) {
  const { t } = useTranslation();
  const { createMediaFolder } = usePlayerStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn(fullWidth ? "w-full" : undefined, "hidden sm:flex")}
        onClick={() => setOpen(true)}
        title={t("history.newFolder")}
      >
        <FolderPlus size={16} className="mr-1" /> {t("history.new")}
      </Button>
      {/* Mobile icon-only version */}
      <Button
        variant="ghost"
        size="icon"
        className="flex sm:hidden"
        onClick={() => setOpen(true)}
        title={t("history.newFolder")}
      >
        <FolderPlus size={18} />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("history.newFolder")}</DialogTitle>
            <DialogDescription>
              {t("history.enterFolderName")}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (name.trim()) {
                  createMediaFolder(name.trim(), parentId ?? null);
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
                  createMediaFolder(name.trim(), parentId ?? null);
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

// Commented out unused component
/*
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
*/

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

function NewFolderForMoveButton({
  itemId,
  parentFolderId,
}: {
  itemId: string;
  parentFolderId: string | null;
}) {
  const { t } = useTranslation();
  const { createMediaFolder, moveHistoryItemToFolder } = usePlayerStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <FolderPlus size={14} className="mr-1" /> {t("history.newFolder")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("history.newFolder")}</DialogTitle>
            <DialogDescription>
              {t("history.enterFolderNameAndMove")}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                const id = createMediaFolder(
                  name.trim(),
                  parentFolderId ?? null
                );
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
                  const id = createMediaFolder(
                    name.trim(),
                    parentFolderId ?? null
                  );
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
