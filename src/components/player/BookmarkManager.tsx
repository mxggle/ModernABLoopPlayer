import { useState, useRef } from "react";
import { usePlayerStore, type LoopBookmark } from "../../stores/playerStore";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { formatTime } from "../../utils/formatTime";
import { generateShareableUrl } from "../../utils/shareableUrl";
import {
  Bookmark,
  Plus,
  Trash2,
  Share2,
  Download,
  Upload,
  Edit,
  PlayCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { cn } from "../../utils/cn";

export const BookmarkManager = () => {
  const { t } = useTranslation();
  const [bookmarkName, setBookmarkName] = useState("");
  const [bookmarkAnnotation, setBookmarkAnnotation] = useState("");
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editAnnotation, setEditAnnotation] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    currentFile,
    currentYouTube,
    loopStart,
    loopEnd,
    playbackRate,
    getCurrentMediaBookmarks,
    selectedBookmarkId,
    addBookmark: storeAddBookmark,
    updateBookmark,
    deleteBookmark: storeDeleteBookmark,
    loadBookmark: storeLoadBookmark,
    // setSelectedBookmarkId, // Unused variable
    importBookmarks: storeImportBookmarks,
  } = usePlayerStore();

  // Get current media bookmarks
  const bookmarks = getCurrentMediaBookmarks();

  // Add a new bookmark
  const handleAddBookmark = () => {
    if (loopStart === null || loopEnd === null) {
      toast.error(t("bookmarks.setLoopPointsFirst"));
      return;
    }

    if (!bookmarkName.trim()) {
      toast.error(t("bookmarks.enterBookmarkName"));
      return;
    }
    const added = storeAddBookmark({
      name: bookmarkName.trim(),
      start: loopStart,
      end: loopEnd,
      playbackRate,
      annotation: bookmarkAnnotation.trim(),
      mediaName: currentFile?.name,
      mediaType: currentFile?.type,
      youtubeId: currentYouTube?.id,
    });
    if (added) {
      setBookmarkName("");
      setBookmarkAnnotation("");
      setIsAddingBookmark(false);
      toast.success(t("bookmarks.bookmarkAdded"));
    }
  };

  // Start editing a bookmark
  const handleEditBookmark = (bookmark: LoopBookmark) => {
    setEditingBookmarkId(bookmark.id);
    setEditName(bookmark.name);
    setEditAnnotation(bookmark.annotation || "");
    setIsEditDialogOpen(true);
  };

  // Save bookmark edits
  const handleSaveEdit = () => {
    if (!editingBookmarkId) return;

    if (!editName.trim()) {
      toast.error(t("bookmarks.nameCannotBeEmpty"));
      return;
    }

    updateBookmark(editingBookmarkId, {
      name: editName.trim(),
      annotation: editAnnotation.trim(),
    });

    setIsEditDialogOpen(false);
    setEditingBookmarkId(null);
  };

  // Delete a bookmark
  const handleDeleteBookmark = (id: string) => {
    storeDeleteBookmark(id);
  };

  // Load a bookmark
  const handleLoadBookmark = (id: string) => {
    storeLoadBookmark(id);
  };

  // Export bookmarks
  const handleExportBookmarks = () => {
    if (bookmarks.length === 0) {
      toast.error(t("bookmarks.noBookmarksToExport"));
      return;
    }

    const dataStr = JSON.stringify(bookmarks, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
      dataStr
    )}`;

    const exportFileDefaultName = `abloop-bookmarks-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();

    toast.success(t("bookmarks.bookmarksExported"));
  };

  // Import bookmarks
  const handleImportBookmarks = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const importedBookmarks = JSON.parse(e.target?.result as string);

        if (Array.isArray(importedBookmarks)) {
          storeImportBookmarks(importedBookmarks);
          toast.success(t("bookmarks.bookmarksImported", { count: importedBookmarks.length }));
        } else {
          toast.error(t("bookmarks.invalidFileFormat"));
        }
      } catch (error) {
        console.error("Error importing bookmarks:", error);
        toast.error(t("bookmarks.importError"));
      }
    };

    reader.readAsText(file);

    // Reset the input
    event.target.value = "";
  };

  // Trigger file input click
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Generate a shareable URL with current loop settings
  const handleShareLoopSettings = () => {
    if (loopStart === null || loopEnd === null) {
      toast.error(t("bookmarks.setLoopPointsFirst"));
      return;
    }

    // Generate URL using the utility function
    const url = generateShareableUrl({
      loopStart,
      loopEnd,
      youtubeId: currentYouTube?.id,
      playbackRate,
    });

    // Copy to clipboard
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success(t("bookmarks.linkCopied")))
      .catch(() => toast.error(t("bookmarks.copyFailed")));
  };

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex justify-between items-center">
          <span>{t("bookmarks.title")}</span>
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingBookmark(!isAddingBookmark)}
              aria-label={t("bookmarks.addBookmark")}
            >
              <Plus size={16} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShareLoopSettings}
              aria-label={t("bookmarks.shareLoopSettings")}
              disabled={loopStart === null || loopEnd === null}
            >
              <Share2 size={16} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportBookmarks}
              aria-label={t("bookmarks.exportBookmarks")}
              disabled={bookmarks.length === 0}
            >
              <Download size={16} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
              aria-label={t("bookmarks.importBookmarks")}
            >
              <Upload size={16} />
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                className="hidden"
                onChange={handleImportBookmarks}
              />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isAddingBookmark && (
          <div className="mb-4 space-y-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md">
            <div>
              <input
                type="text"
                value={bookmarkName}
                onChange={(e) => setBookmarkName(e.target.value)}
                placeholder={t("bookmarks.bookmarkName")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <textarea
                value={bookmarkAnnotation}
                onChange={(e) => setBookmarkAnnotation(e.target.value)}
                placeholder={t("bookmarks.annotationOptional")}
                className="w-full h-20 resize-none"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingBookmark(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleAddBookmark}
                disabled={
                  !bookmarkName.trim() || loopStart === null || loopEnd === null
                }
              >
                {t("common.save")}
              </Button>
            </div>
          </div>
        )}

        {bookmarks.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <Bookmark className="mx-auto h-8 w-8 opacity-50 mb-2" />
            <p>{t("bookmarks.noBookmarks")}</p>
            <p className="text-sm">
              {t("bookmarks.createFirstBookmark")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className={cn(
                  "p-3 rounded-md border flex items-start justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors",
                  selectedBookmarkId === bookmark.id
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 dark:border-gray-700"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center min-w-0">
                    <button
                      onClick={() => handleLoadBookmark(bookmark.id)}
                      className="flex items-center group text-left min-w-0 flex-1"
                    >
                      <PlayCircle
                        size={16}
                        className="mr-2 text-gray-500 group-hover:text-primary flex-shrink-0"
                      />
                      <span className="font-medium truncate group-hover:text-primary block">
                        {bookmark.name}
                      </span>
                    </button>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>
                      {formatTime(bookmark.start)} - {formatTime(bookmark.end)}
                    </span>
                    {bookmark.annotation && (
                      <div
                        className="mt-1 italic truncate"
                        title={bookmark.annotation}
                      >
                        {bookmark.annotation}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-1 ml-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEditBookmark(bookmark)}
                    aria-label={t("bookmarks.editBookmark")}
                  >
                    <Edit size={14} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={() => handleDeleteBookmark(bookmark.id)}
                    aria-label={t("bookmarks.deleteBookmark")}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit bookmark dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("bookmarks.editBookmark")}</DialogTitle>
            <DialogDescription>
              {t("bookmarks.updateBookmarkDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="edit-name" className="text-sm font-medium">
                {t("bookmarks.name")}
              </label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditName(e.target.value)
                }
                placeholder={t("bookmarks.bookmarkName")}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-annotation" className="text-sm font-medium">
                {t("bookmarks.annotation")}
              </label>
              <Textarea
                id="edit-annotation"
                value={editAnnotation}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditAnnotation(e.target.value)
                }
                placeholder={t("bookmarks.annotationOptional")}
                className="h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>

            <Button
              variant="default"
              onClick={handleSaveEdit}
              disabled={!editName.trim()}
            >
              {t("bookmarks.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
