import { useState, useRef } from "react";
import { usePlayerStore, type LoopBookmark } from "../../stores/playerStore";
import { toast } from "react-hot-toast";
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
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { cn } from "../../utils/cn";

export const BookmarkDrawer = () => {
  const [bookmarkName, setBookmarkName] = useState("");
  const [bookmarkAnnotation, setBookmarkAnnotation] = useState("");
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editAnnotation, setEditAnnotation] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    currentFile,
    currentYouTube,
    loopStart,
    loopEnd,
    playbackRate,
    bookmarks,
    selectedBookmarkId,
    addBookmark: storeAddBookmark,
    updateBookmark,
    deleteBookmark: storeDeleteBookmark,
    loadBookmark: storeLoadBookmark,
    importBookmarks: storeImportBookmarks,
  } = usePlayerStore();

  // Add a new bookmark
  const handleAddBookmark = () => {
    if (loopStart === null || loopEnd === null) {
      toast.error("Please set loop points first");
      return;
    }

    if (!bookmarkName.trim()) {
      toast.error("Please enter a name for the bookmark");
      return;
    }

    storeAddBookmark({
      name: bookmarkName.trim(),
      start: loopStart,
      end: loopEnd,
      playbackRate,
      annotation: bookmarkAnnotation.trim(),
      mediaName: currentFile?.name,
      mediaType: currentFile?.type,
      youtubeId: currentYouTube?.id,
    });

    setBookmarkName("");
    setBookmarkAnnotation("");
    setIsAddingBookmark(false);
    toast.success("Bookmark added");
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
      toast.error("Bookmark name cannot be empty");
      return;
    }

    updateBookmark(editingBookmarkId, {
      name: editName.trim(),
      annotation: editAnnotation.trim(),
    });

    setIsEditDialogOpen(false);
    setEditingBookmarkId(null);
    toast.success("Bookmark updated");
  };

  // Delete a bookmark
  const handleDeleteBookmark = (id: string) => {
    storeDeleteBookmark(id);
    toast.success("Bookmark deleted");
  };

  // Load a bookmark
  const handleLoadBookmark = (id: string) => {
    storeLoadBookmark(id);
    toast.success("Bookmark loaded");
  };

  // Export bookmarks
  const handleExportBookmarks = () => {
    if (bookmarks.length === 0) {
      toast.error("No bookmarks to export");
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

    toast.success("Bookmarks exported");
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
          toast.success(`Imported ${importedBookmarks.length} bookmarks`);
        } else {
          toast.error("Invalid bookmark file format");
        }
      } catch (error) {
        console.error("Error importing bookmarks:", error);
        toast.error("Error importing bookmarks");
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
      toast.error("Please set loop points first");
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
      .then(() => toast.success("Shareable link copied to clipboard"))
      .catch(() => toast.error("Failed to copy link"));
  };

  // Toggle drawer
  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <>
      {/* Hidden button that can be triggered from the header */}
      <button
        id="bookmarkDrawerToggle"
        onClick={toggleDrawer}
        className="hidden"
        aria-label={isDrawerOpen ? "Close bookmarks" : "Open bookmarks"}
      />
      
      {/* Original drawer toggle button - now hidden since we moved it to the header */}
      {/* <button
        onClick={toggleDrawer}
        className="fixed bottom-60 sm:bottom-42 sm:right-40 right-20 z-20 p-2.5 rounded-lg bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-colors"
        aria-label={isDrawerOpen ? "Close bookmarks" : "Open bookmarks"}
      >
        <Bookmark size={20} />
      </button> */}

      {/* Bookmarks drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full bg-white dark:bg-gray-800 shadow-xl z-30 transition-all duration-300 ease-in-out overflow-y-auto",
          isDrawerOpen ? "w-80 translate-x-0" : "w-80 translate-x-full"
        )}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bookmark size={20} />
            <span>Bookmarks</span>
          </h2>
          <button
            onClick={toggleDrawer}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close bookmarks"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex space-x-1 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingBookmark(!isAddingBookmark)}
              aria-label="Add bookmark"
              className="flex-1"
            >
              <Plus size={16} className="mr-1" />
              <span>Add</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShareLoopSettings}
              aria-label="Share loop settings"
              disabled={loopStart === null || loopEnd === null}
              className="flex-1"
            >
              <Share2 size={16} className="mr-1" />
              <span>Share</span>
            </Button>
          </div>

          <div className="flex space-x-1 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportBookmarks}
              aria-label="Export bookmarks"
              disabled={bookmarks.length === 0}
              className="flex-1"
            >
              <Download size={16} className="mr-1" />
              <span>Export</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
              aria-label="Import bookmarks"
              className="flex-1"
            >
              <Upload size={16} className="mr-1" />
              <span>Import</span>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                className="hidden"
                onChange={handleImportBookmarks}
              />
            </Button>
          </div>

          {isAddingBookmark && (
            <div className="mb-4 space-y-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md">
              <div>
                <Input
                  placeholder="Bookmark name"
                  value={bookmarkName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setBookmarkName(e.target.value)
                  }
                  className="w-full"
                />
              </div>

              <div>
                <Textarea
                  placeholder="Annotation (optional)"
                  value={bookmarkAnnotation}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setBookmarkAnnotation(e.target.value)
                  }
                  className="w-full h-20 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingBookmark(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAddBookmark}
                  disabled={
                    !bookmarkName.trim() ||
                    loopStart === null ||
                    loopEnd === null
                  }
                >
                  Save
                </Button>
              </div>
            </div>
          )}

          {bookmarks.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <Bookmark className="mx-auto h-8 w-8 opacity-50 mb-2" />
              <p>No bookmarks yet</p>
              <p className="text-sm">
                Create your first bookmark by clicking the + button above
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
                    <div className="flex items-center">
                      <button
                        onClick={() => handleLoadBookmark(bookmark.id)}
                        className="flex items-center group text-left"
                      >
                        <PlayCircle
                          size={16}
                          className="mr-2 text-gray-500 group-hover:text-primary"
                        />
                        <span className="font-medium truncate group-hover:text-primary">
                          {bookmark.name}
                        </span>
                      </button>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>
                        {formatTime(bookmark.start)} -{" "}
                        {formatTime(bookmark.end)}
                      </span>
                      {bookmark.annotation && (
                        <div className="mt-1 italic">{bookmark.annotation}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEditBookmark(bookmark)}
                      aria-label="Edit bookmark"
                    >
                      <Edit size={14} />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      aria-label="Delete bookmark"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit bookmark dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bookmark</DialogTitle>
            <DialogDescription>
              Update the name and annotation for this bookmark.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="edit-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditName(e.target.value)
                }
                placeholder="Bookmark name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-annotation" className="text-sm font-medium">
                Annotation
              </label>
              <Textarea
                id="edit-annotation"
                value={editAnnotation}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditAnnotation(e.target.value)
                }
                placeholder="Annotation (optional)"
                className="h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              variant="default"
              onClick={handleSaveEdit}
              disabled={!editName.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
