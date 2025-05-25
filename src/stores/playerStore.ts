import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  storeMediaFile,
  retrieveMediaFile,
  deleteMediaFile,
} from "../utils/mediaStorage";
import { toast } from "react-hot-toast";

export interface MediaFile {
  name: string;
  type: string;
  size: number;
  url: string;
  id?: string;
  storageId?: string; // ID for IndexedDB storage
}

export interface YouTubeMedia {
  id: string;
  title?: string;
}

export interface LoopBookmark {
  id: string;
  name: string;
  start: number;
  end: number;
  createdAt: number;
  mediaName?: string;
  mediaType?: string;
  youtubeId?: string;
  playbackRate?: number;
  annotation?: string;
}

// New interface for media-scoped bookmarks
export interface MediaBookmarks {
  [mediaId: string]: LoopBookmark[];
}

export interface MediaHistoryItem {
  id: string;
  type: "file" | "youtube";
  name: string;
  accessedAt: number;
  fileData?: Omit<MediaFile, "id">;
  youtubeData?: {
    title?: string;
    youtubeId?: string;
  };
  storageId?: string; // ID for IndexedDB storage
}

export interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  isFinal: boolean;
}

export interface PlayerState {
  // Media state
  currentFile: MediaFile | null;
  currentYouTube: YouTubeMedia | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  muted: boolean;
  isLoadingMedia: boolean; // Add loading state

  // Loop state
  loopStart: number | null;
  loopEnd: number | null;
  isLooping: boolean;
  loopCount: number;
  maxLoops: number;
  bpm: number | null;
  quantizeLoop: boolean;

  // UI state
  theme: "light" | "dark";
  waveformZoom: number;
  showWaveform: boolean;
  videoSize: "sm" | "md" | "lg" | "xl";
  mediaBookmarks: MediaBookmarks; // Changed from bookmarks array to media-scoped object
  selectedBookmarkId: string | null;

  // Transcript state
  transcriptSegments: TranscriptSegment[];
  showTranscript: boolean;
  isTranscribing: boolean;
  transcriptLanguage: string;

  // History and sharing
  recentYouTubeVideos: YouTubeMedia[];
  mediaHistory: MediaHistoryItem[];
  historyLimit: number;
}

export interface PlayerActions {
  // Media actions
  setCurrentFile: (file: MediaFile | null) => void;
  setCurrentYouTube: (youtube: YouTubeMedia | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setMuted: (muted: boolean) => void;
  togglePlay: () => void;
  toggleMute: () => void;
  seekForward: (seconds: number) => void;
  seekBackward: (seconds: number) => void;
  setIsLoadingMedia: (loading: boolean) => void; // Add loading action

  // Loop actions
  setLoopPoints: (start: number | null, end: number | null) => void;
  setIsLooping: (isLooping: boolean) => void;
  setLoopCount: (count: number) => void;
  setMaxLoops: (max: number) => void;
  toggleLooping: () => void;
  moveLoopWindow: (deltaTime: number) => void;
  extendLoopStart: (deltaTime: number) => void;
  extendLoopEnd: (deltaTime: number) => void;
  scaleLoop: (factor: number) => void;
  setBpm: (bpm: number | null) => void;
  setQuantizeLoop: (quantize: boolean) => void;
  quantizeCurrentLoop: () => void;

  // UI actions
  setTheme: (theme: "light" | "dark") => void;
  setWaveformZoom: (zoom: number) => void;
  setShowWaveform: (show: boolean) => void;
  setVideoSize: (size: "sm" | "md" | "lg" | "xl") => void;

  // Transcript actions
  startTranscribing: () => void;
  stopTranscribing: () => void;
  toggleTranscribing: () => void;
  addTranscriptSegment: (segment: Omit<TranscriptSegment, "id">) => void;
  updateTranscriptSegment: (
    id: string,
    changes: Partial<TranscriptSegment>
  ) => void;
  clearTranscript: () => void;
  setShowTranscript: (show: boolean) => void;
  toggleShowTranscript: () => void;
  setTranscriptLanguage: (language: string) => void;
  exportTranscript: (format: "txt" | "srt" | "vtt") => string;
  createBookmarkFromTranscript: (segmentId: string) => void;

  // Bookmark actions
  addBookmark: (bookmark: Omit<LoopBookmark, "id" | "createdAt">) => void;
  updateBookmark: (id: string, changes: Partial<LoopBookmark>) => void;
  deleteBookmark: (id: string) => void;
  loadBookmark: (id: string) => void;
  setSelectedBookmarkId: (id: string | null) => void;
  importBookmarks: (bookmarks: LoopBookmark[]) => void;

  // Helper functions for media-scoped bookmarks
  getCurrentMediaId: () => string | null;
  getCurrentMediaBookmarks: () => LoopBookmark[];

  // History actions
  addRecentYouTubeVideo: (video: YouTubeMedia) => void;
  clearRecentYouTubeVideos: () => void;
  addToMediaHistory: (
    item: Omit<MediaHistoryItem, "id" | "accessedAt">
  ) => void;
  loadFromHistory: (historyItemId: string) => void;
  removeFromHistory: (historyItemId: string) => void;
  clearMediaHistory: () => void;
  setHistoryLimit: (limit: number) => void;
}

const initialState: PlayerState = {
  currentFile: null,
  currentYouTube: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  muted: false,
  loopStart: null,
  loopEnd: null,
  isLooping: false,
  loopCount: 0,
  maxLoops: 0,
  bpm: null,
  quantizeLoop: false,
  theme: "dark",
  waveformZoom: 1,
  showWaveform: true,
  videoSize: "md",
  mediaBookmarks: {},
  selectedBookmarkId: null,
  transcriptSegments: [],
  showTranscript: false,
  isTranscribing: false,
  transcriptLanguage: "en-US",
  recentYouTubeVideos: [],
  mediaHistory: [],
  historyLimit: 30,
  isLoadingMedia: false,
};

export const usePlayerStore = create<PlayerState & PlayerActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Media actions
      setCurrentFile: async (file) => {
        if (file) {
          try {
            // Store the file in IndexedDB if it's a local file (has File object)
            let storageId = file.storageId;

            if (file instanceof File && !storageId) {
              try {
                // Store the actual file data in IndexedDB
                storageId = await storeMediaFile(file);
                console.log("File stored in IndexedDB with ID:", storageId);
              } catch (error) {
                console.error("Failed to store file in IndexedDB:", error);
                // Continue even if storage fails, just won't be available after refresh
              }
            }

            // Check if this file already exists in history by name and size or storageId
            const { mediaHistory } = get();
            let existingHistoryItem = null;

            if (storageId) {
              // First try to find by storageId (most reliable)
              existingHistoryItem = mediaHistory.find(
                (item) => item.type === "file" && item.storageId === storageId
              );
            }

            if (!existingHistoryItem) {
              // Then try by filename and size
              existingHistoryItem = mediaHistory.find(
                (item) =>
                  item.type === "file" &&
                  item.fileData?.name === file.name &&
                  item.fileData?.size === file.size
              );
            }

            // Use existing ID if found in history, otherwise generate a new one
            const fileId = existingHistoryItem
              ? existingHistoryItem.id.replace("history-", "file-")
              : `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const fileWithId = {
              ...file,
              id: file.id || fileId,
              storageId,
            };

            // Add to history with storage ID
            get().addToMediaHistory({
              type: "file",
              name: fileWithId.name,
              fileData: {
                name: fileWithId.name,
                type: fileWithId.type,
                size: fileWithId.size,
                url: fileWithId.url,
              },
              storageId,
            });

            set({
              currentFile: fileWithId,
              currentYouTube: null,
              currentTime: 0,
              isPlaying: false,
              // Reset loop points and selected bookmark when switching media
              loopStart: null,
              loopEnd: null,
              isLooping: false,
              selectedBookmarkId: null,
            });
          } catch (error) {
            console.error("Error setting current file:", error);
            toast.error("Failed to load media file");

            set({
              currentFile: null,
              currentTime: 0,
              isPlaying: false,
              loopStart: null,
              loopEnd: null,
              isLooping: false,
              selectedBookmarkId: null,
            });
          }
        } else {
          set({
            currentFile: null,
            currentTime: 0,
            isPlaying: false,
            loopStart: null,
            loopEnd: null,
            isLooping: false,
            selectedBookmarkId: null,
          });
        }
      },
      setCurrentYouTube: (youtube) => {
        if (youtube) {
          get().addRecentYouTubeVideo(youtube);

          // Also add to general history
          get().addToMediaHistory({
            type: "youtube",
            name: youtube.title || `YouTube Video: ${youtube.id}`,
            youtubeData: {
              title: youtube.title,
              youtubeId: youtube.id,
            },
          });
        }
        set({
          currentYouTube: youtube,
          currentFile: null,
          currentTime: 0,
          isPlaying: false,
          // Reset loop points and selected bookmark when switching media
          loopStart: null,
          loopEnd: null,
          isLooping: false,
          selectedBookmarkId: null,
        });
      },
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setCurrentTime: (currentTime) => set({ currentTime }),
      setDuration: (duration) => set({ duration }),
      setVolume: (volume) => set({ volume }),
      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      setMuted: (muted) => set({ muted }),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      toggleMute: () => set((state) => ({ muted: !state.muted })),

      // Seek forward/backward
      seekForward: (seconds) => {
        const { currentTime, duration } = get();
        const newTime = Math.min(currentTime + seconds, duration);
        set({ currentTime: newTime });
      },

      seekBackward: (seconds) => {
        const { currentTime } = get();
        const newTime = Math.max(currentTime - seconds, 0);
        set({ currentTime: newTime });
      },

      // Loop actions
      setLoopPoints: (loopStart, loopEnd) => set({ loopStart, loopEnd }),
      setIsLooping: (isLooping) => set({ isLooping }),
      setLoopCount: (loopCount) => set({ loopCount }),
      setMaxLoops: (maxLoops) => set({ maxLoops }),
      toggleLooping: () => set((state) => ({ isLooping: !state.isLooping })),
      moveLoopWindow: (deltaTime) => {
        const { loopStart, loopEnd, duration } = get();
        if (loopStart === null || loopEnd === null) return;

        let newStart = loopStart + deltaTime;
        let newEnd = loopEnd + deltaTime;

        // Ensure we stay within valid bounds
        if (newStart < 0) {
          const shift = -newStart;
          newStart = 0;
          newEnd = Math.min(newEnd + shift, duration);
        }

        if (newEnd > duration) {
          const shift = newEnd - duration;
          newEnd = duration;
          newStart = Math.max(newStart - shift, 0);
        }

        set({ loopStart: newStart, loopEnd: newEnd });
      },
      extendLoopStart: (deltaTime) => {
        const { loopStart, loopEnd } = get();
        if (loopStart === null || loopEnd === null) return;

        const newStart = Math.max(0, loopStart + deltaTime);
        if (newStart < loopEnd) {
          set({ loopStart: newStart });
        }
      },
      extendLoopEnd: (deltaTime) => {
        const { loopStart, loopEnd, duration } = get();
        if (loopStart === null || loopEnd === null) return;

        const newEnd = Math.min(duration, loopEnd + deltaTime);
        if (newEnd > loopStart) {
          set({ loopEnd: newEnd });
        }
      },
      scaleLoop: (factor) => {
        const { loopStart, loopEnd, duration } = get();
        if (loopStart === null || loopEnd === null) return;

        const center = (loopStart + loopEnd) / 2;
        const halfLength = (loopEnd - loopStart) / 2;
        const newHalfLength = halfLength * factor;

        const newStart = Math.max(0, center - newHalfLength);
        const newEnd = Math.min(duration, center + newHalfLength);

        set({ loopStart: newStart, loopEnd: newEnd });
      },
      setBpm: (bpm) => set({ bpm }),
      setQuantizeLoop: (quantizeLoop) => set({ quantizeLoop }),
      quantizeCurrentLoop: () => {
        const { loopStart, loopEnd, bpm } = get();
        if (loopStart === null || loopEnd === null || !bpm) return;

        // Calculate beat duration in seconds
        const beatDuration = 60 / bpm;

        // Calculate how many beats the current loop spans
        const currentDuration = loopEnd - loopStart;
        const numBeats = Math.round(currentDuration / beatDuration);

        // Ensure at least 1 beat
        const quantizedNumBeats = Math.max(1, numBeats);
        const quantizedDuration = quantizedNumBeats * beatDuration;

        // Calculate the new end time while keeping the start fixed
        const newEnd = loopStart + quantizedDuration;

        set({ loopEnd: newEnd });
      },

      // UI actions
      setTheme: (theme) => set({ theme }),
      setWaveformZoom: (waveformZoom) => set({ waveformZoom }),
      setShowWaveform: (showWaveform) => set({ showWaveform }),
      setVideoSize: (videoSize) => set({ videoSize }),

      // Bookmark actions
      addBookmark: (bookmark) => {
        const { getCurrentMediaId } = get();
        const mediaId = getCurrentMediaId();
        if (!mediaId) return;

        set((state) => ({
          mediaBookmarks: {
            ...state.mediaBookmarks,
            [mediaId]: [
              ...(state.mediaBookmarks[mediaId] || []),
              {
                ...bookmark,
                id: Date.now().toString(),
                createdAt: Date.now(),
              },
            ],
          },
        }));
      },
      updateBookmark: (id, changes) => {
        const { getCurrentMediaId } = get();
        const mediaId = getCurrentMediaId();
        if (!mediaId) return;

        set((state) => ({
          mediaBookmarks: {
            ...state.mediaBookmarks,
            [mediaId]: (state.mediaBookmarks[mediaId] || []).map((bookmark) =>
              bookmark.id === id ? { ...bookmark, ...changes } : bookmark
            ),
          },
        }));
      },
      deleteBookmark: (id) => {
        const { getCurrentMediaId } = get();
        const mediaId = getCurrentMediaId();
        if (!mediaId) return;

        set((state) => ({
          mediaBookmarks: {
            ...state.mediaBookmarks,
            [mediaId]: (state.mediaBookmarks[mediaId] || []).filter(
              (bookmark) => bookmark.id !== id
            ),
          },
          selectedBookmarkId:
            state.selectedBookmarkId === id ? null : state.selectedBookmarkId,
        }));
      },
      loadBookmark: (id) => {
        const { getCurrentMediaBookmarks } = get();
        const bookmarks = getCurrentMediaBookmarks();
        const bookmark = bookmarks.find((b) => b.id === id);

        if (bookmark) {
          set({
            loopStart: bookmark.start,
            loopEnd: bookmark.end,
            isLooping: true,
            selectedBookmarkId: id,
            ...(bookmark.playbackRate !== undefined
              ? { playbackRate: bookmark.playbackRate }
              : {}),
          });
        }
      },
      setSelectedBookmarkId: (selectedBookmarkId) =>
        set({ selectedBookmarkId }),
      importBookmarks: (bookmarks) => {
        const { getCurrentMediaId } = get();
        const mediaId = getCurrentMediaId();
        if (!mediaId) return;

        set((state) => ({
          mediaBookmarks: {
            ...state.mediaBookmarks,
            [mediaId]: [...(state.mediaBookmarks[mediaId] || []), ...bookmarks],
          },
        }));
      },

      // History actions
      addRecentYouTubeVideo: (video) =>
        set((state) => {
          // Check if this video is already in recent videos
          const exists = state.recentYouTubeVideos.some(
            (v) => v.id === video.id
          );
          if (exists) {
            // Move it to the top of the list
            return {
              recentYouTubeVideos: [
                video,
                ...state.recentYouTubeVideos.filter((v) => v.id !== video.id),
              ].slice(0, 10), // Keep only 10 most recent
            };
          } else {
            // Add it to the top
            return {
              recentYouTubeVideos: [video, ...state.recentYouTubeVideos].slice(
                0,
                10
              ), // Keep only 10 most recent
            };
          }
        }),
      clearRecentYouTubeVideos: () => set({ recentYouTubeVideos: [] }),

      // Extended history management
      addToMediaHistory: (item) =>
        set((state) => {
          const id = `history-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
          const timestamp = Date.now();

          // Check if this item already exists in history
          let existingItemIndex = -1;

          if (item.type === "file" && item.fileData) {
            // First check by storageId if available (most reliable)
            if (item.storageId) {
              existingItemIndex = state.mediaHistory.findIndex(
                (h) => h.type === "file" && h.storageId === item.storageId
              );
            }

            // If not found by storageId, try by filename and size
            if (existingItemIndex === -1 && item.fileData.name) {
              existingItemIndex = state.mediaHistory.findIndex(
                (h) =>
                  h.type === "file" &&
                  h.fileData?.name === item.fileData?.name &&
                  h.fileData?.size === item.fileData?.size
              );
            }
          } else if (item.type === "youtube" && item.youtubeData) {
            existingItemIndex = state.mediaHistory.findIndex(
              (h) =>
                h.type === "youtube" &&
                h.youtubeData?.youtubeId === item.youtubeData?.youtubeId
            );
          }

          // If item exists, update its timestamp and move to top of history
          if (existingItemIndex >= 0) {
            const updatedHistory = [...state.mediaHistory];
            const existingItem = updatedHistory.splice(existingItemIndex, 1)[0];

            // Update the storageId if the new item has one but the existing one doesn't
            const updatedItem = {
              ...existingItem,
              accessedAt: timestamp,
              // Update storageId if the new item has one
              ...(item.storageId && !existingItem.storageId
                ? { storageId: item.storageId }
                : {}),
              // Update fileData if needed
              ...(item.fileData
                ? { fileData: { ...existingItem.fileData, ...item.fileData } }
                : {}),
            };

            return {
              mediaHistory: [updatedItem, ...updatedHistory].slice(
                0,
                state.historyLimit
              ),
            };
          }

          // Otherwise add as new item
          return {
            mediaHistory: [
              { ...item, id, accessedAt: timestamp },
              ...state.mediaHistory,
            ].slice(0, state.historyLimit),
          };
        }),

      loadFromHistory: async (historyItemId) => {
        // Set loading state at the beginning
        set({ isLoadingMedia: true });

        const { mediaHistory } = get();
        const historyItem = mediaHistory.find(
          (item) => item.id === historyItemId
        );

        if (!historyItem) {
          set({ isLoadingMedia: false });
          return;
        }

        try {
          if (historyItem.type === "file" && historyItem.fileData) {
            // Check if we have this file stored in IndexedDB
            if (historyItem.storageId) {
              try {
                // Try to retrieve the file from IndexedDB
                const file = await retrieveMediaFile(historyItem.storageId);

                if (file) {
                  // Create a URL for the file
                  const url = URL.createObjectURL(file);
                  console.log(
                    "Retrieved file from IndexedDB:",
                    file,
                    "Created URL:",
                    url
                  );

                  const fileData: MediaFile = {
                    name: historyItem.fileData.name,
                    type: historyItem.fileData.type,
                    size: historyItem.fileData.size,
                    url: url,
                    id: `file-${Date.now()}-${Math.random()
                      .toString(36)
                      .substr(2, 9)}`,
                    storageId: historyItem.storageId,
                  };

                  get().setCurrentFile(fileData);
                  set({ isLoadingMedia: false });
                  return;
                }
              } catch (error) {
                console.error("Failed to load file from storage:", error);
                // Fall back to using the URL if available
              }
            }

            // If we don't have it in storage or retrieval failed, try using the URL
            // (this will likely fail after page refresh for local files)
            const fileData: MediaFile = {
              ...historyItem.fileData,
              id: `file-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            };

            get().setCurrentFile(fileData);

            // If we couldn't retrieve from storage and the URL doesn't work, show an error
            if (historyItem.storageId) {
              setTimeout(() => {
                const { currentFile } = get();
                if (!currentFile || !currentFile.url) {
                  toast.error("Could not retrieve media file");
                }
              }, 1000);
            }
          } else if (
            historyItem.type === "youtube" &&
            historyItem.youtubeData
          ) {
            // Get the YouTube ID from the history item
            const youtubeId = historyItem.youtubeData.youtubeId;
            if (!youtubeId) {
              set({ isLoadingMedia: false });
              return;
            }

            const youtubeData: YouTubeMedia = {
              id: youtubeId,
              title: historyItem.youtubeData.title,
            };
            get().setCurrentYouTube(youtubeData);
          }

          // Update the access timestamp but don't create a new entry
          // Just move this item to the top of the history list
          set((state) => {
            const updatedHistory = [...state.mediaHistory];
            const existingItemIndex = updatedHistory.findIndex(
              (item) => item.id === historyItemId
            );

            if (existingItemIndex >= 0) {
              const existingItem = updatedHistory.splice(
                existingItemIndex,
                1
              )[0];
              return {
                mediaHistory: [
                  { ...existingItem, accessedAt: Date.now() },
                  ...updatedHistory,
                ].slice(0, state.historyLimit),
              };
            }

            return state; // No changes if item not found
          });
        } finally {
          // Always clear loading state when done
          set({ isLoadingMedia: false });
        }
      },

      removeFromHistory: async (historyItemId) => {
        const { mediaHistory } = get();
        const historyItem = mediaHistory.find(
          (item) => item.id === historyItemId
        );

        // If this item has a storage ID, delete the file from IndexedDB
        if (historyItem && historyItem.storageId) {
          try {
            await deleteMediaFile(historyItem.storageId);
            console.log(
              "Deleted media file from storage:",
              historyItem.storageId
            );
          } catch (error) {
            console.error("Failed to delete media file from storage:", error);
          }
        }

        // Remove from history state
        set((state) => ({
          mediaHistory: state.mediaHistory.filter(
            (item) => item.id !== historyItemId
          ),
        }));
      },

      clearMediaHistory: async () => {
        try {
          // Clear all media files from IndexedDB
          const { clearAllMediaFiles } = await import("../utils/mediaStorage");
          await clearAllMediaFiles();
          console.log("All media files cleared from storage");
        } catch (error) {
          console.error("Failed to clear media storage:", error);
        }

        // Clear history state
        set({ mediaHistory: [] });
      },

      setHistoryLimit(limit) {
        set({ historyLimit: limit });
      },

      // Transcript actions
      startTranscribing() {
        set({ isTranscribing: true });
        toast.success("Voice transcription started");
      },

      stopTranscribing() {
        set({ isTranscribing: false });
        toast.success("Voice transcription stopped");
      },

      toggleTranscribing() {
        const { isTranscribing } = get();
        set({ isTranscribing: !isTranscribing });
        toast.success(
          !isTranscribing
            ? "Voice transcription started"
            : "Voice transcription stopped"
        );
      },

      addTranscriptSegment(segment) {
        const id = crypto.randomUUID();
        const newSegment = { ...segment, id };
        const { transcriptSegments } = get();
        set({ transcriptSegments: [...transcriptSegments, newSegment] });
      },

      updateTranscriptSegment(id, changes) {
        const { transcriptSegments } = get();
        const updatedSegments = transcriptSegments.map((segment) =>
          segment.id === id ? { ...segment, ...changes } : segment
        );
        set({ transcriptSegments: updatedSegments });
      },

      clearTranscript() {
        set({ transcriptSegments: [] });
        toast.success("Transcript cleared");
      },

      setShowTranscript(show) {
        set({ showTranscript: show });
      },

      toggleShowTranscript() {
        const { showTranscript } = get();
        set({ showTranscript: !showTranscript });
      },

      setTranscriptLanguage(language) {
        set({ transcriptLanguage: language });
        toast.success(`Transcript language set to ${language}`);
      },

      exportTranscript(format) {
        const { transcriptSegments } = get();

        if (transcriptSegments.length === 0) {
          toast.error("No transcript data to export");
          return "";
        }

        // Helper functions for time formatting
        function formatTime(seconds: number): string {
          const mins = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          return `${mins}:${secs.toString().padStart(2, "0")}`;
        }

        function formatSrtTime(seconds: number): string {
          const hrs = Math.floor(seconds / 3600);
          const mins = Math.floor((seconds % 3600) / 60);
          const secs = Math.floor(seconds % 60);
          const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
          return `${hrs.toString().padStart(2, "0")}:${mins
            .toString()
            .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms
            .toString()
            .padStart(3, "0")}`;
        }

        function formatVttTime(seconds: number): string {
          const hrs = Math.floor(seconds / 3600);
          const mins = Math.floor((seconds % 3600) / 60);
          const secs = Math.floor(seconds % 60);
          const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
          return `${hrs.toString().padStart(2, "0")}:${mins
            .toString()
            .padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms
            .toString()
            .padStart(3, "0")}`;
        }

        // We can use media info for context if needed in the future

        if (format === "txt") {
          // Simple text format
          const text = transcriptSegments
            .map(
              (segment) =>
                `[${formatTime(segment.startTime)} - ${formatTime(
                  segment.endTime
                )}] ${segment.text}`
            )
            .join("\n");

          return text;
        } else if (format === "srt") {
          // SubRip format
          const srt = transcriptSegments
            .map((segment, index) => {
              const startTime = formatSrtTime(segment.startTime);
              const endTime = formatSrtTime(segment.endTime);
              return `${index + 1}\n${startTime} --> ${endTime}\n${
                segment.text
              }\n`;
            })
            .join("\n");

          return srt;
        } else if (format === "vtt") {
          // WebVTT format
          const vtt = ["WEBVTT\n"];

          transcriptSegments.forEach((segment, index) => {
            const startTime = formatVttTime(segment.startTime);
            const endTime = formatVttTime(segment.endTime);
            vtt.push(
              `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`
            );
          });

          return vtt.join("\n");
        }

        return "";
      },

      createBookmarkFromTranscript(segmentId) {
        const {
          transcriptSegments,
          addBookmark,
          currentFile,
          currentYouTube,
          playbackRate,
        } = get();
        const segment = transcriptSegments.find((s) => s.id === segmentId);

        if (!segment) {
          toast.error("Transcript segment not found");
          return;
        }

        // Create a bookmark from this transcript segment
        addBookmark({
          name:
            segment.text.substring(0, 30) +
            (segment.text.length > 30 ? "..." : ""),
          start: segment.startTime,
          end: segment.endTime,
          mediaName: currentFile?.name,
          mediaType: currentFile?.type,
          youtubeId: currentYouTube?.id,
          playbackRate,
          annotation: segment.text,
        });

        toast.success("Bookmark created from transcript");
      },

      // New loading action
      setIsLoadingMedia: (loading) => set({ isLoadingMedia: loading }),

      // Helper functions for media-scoped bookmarks
      getCurrentMediaId: () => {
        const { currentFile, currentYouTube } = get();
        if (currentFile) {
          return (
            currentFile.storageId ||
            currentFile.id ||
            `file-${currentFile.name}-${currentFile.size}`
          );
        }
        if (currentYouTube) {
          return `youtube-${currentYouTube.id}`;
        }
        return null;
      },
      getCurrentMediaBookmarks: () => {
        const { mediaBookmarks, getCurrentMediaId } = get();
        const mediaId = getCurrentMediaId();
        return mediaId ? mediaBookmarks[mediaId] || [] : [];
      },
    }),
    {
      name: "abloop-player-storage",
      partialize: (state) => ({
        volume: state.volume,
        muted: state.muted,
        playbackRate: state.playbackRate,
        theme: state.theme,
        waveformZoom: state.waveformZoom,
        showWaveform: state.showWaveform,
        videoSize: state.videoSize,
        mediaBookmarks: state.mediaBookmarks,
        transcriptSegments: state.transcriptSegments,
        showTranscript: state.showTranscript,
        transcriptLanguage: state.transcriptLanguage,
        recentYouTubeVideos: state.recentYouTubeVideos,
        mediaHistory: state.mediaHistory,
        historyLimit: state.historyLimit,
      }),
    }
  )
);
