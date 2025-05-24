import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MediaFile {
  name: string
  type: string
  size: number
  url: string
}

export interface YouTubeMedia {
  id: string
  title?: string
}

export interface LoopBookmark {
  id: string
  name: string
  start: number
  end: number
  createdAt: number
  mediaName?: string
  mediaType?: string
  youtubeId?: string
  playbackRate?: number
  annotation?: string
}

export interface PlayerState {
  // Media state
  currentFile: MediaFile | null
  currentYouTube: YouTubeMedia | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playbackRate: number
  muted: boolean
  
  // Loop state
  loopStart: number | null
  loopEnd: number | null
  isLooping: boolean
  loopCount: number
  maxLoops: number
  bpm: number | null
  quantizeLoop: boolean
  
  // UI state
  theme: 'light' | 'dark'
  waveformZoom: number
  showWaveform: boolean
  videoSize: 'sm' | 'md' | 'lg' | 'xl'
  bookmarks: LoopBookmark[]
  selectedBookmarkId: string | null
  
  // History and sharing
  recentYouTubeVideos: YouTubeMedia[]
}

export interface PlayerActions {
  // Media actions
  setCurrentFile: (file: MediaFile | null) => void
  setCurrentYouTube: (youtube: YouTubeMedia | null) => void
  setIsPlaying: (isPlaying: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
  setMuted: (muted: boolean) => void
  togglePlay: () => void
  toggleMute: () => void
  
  // Loop actions
  setLoopPoints: (start: number | null, end: number | null) => void
  setIsLooping: (isLooping: boolean) => void
  setLoopCount: (count: number) => void
  setMaxLoops: (max: number) => void
  toggleLooping: () => void
  moveLoopWindow: (deltaTime: number) => void
  extendLoopStart: (deltaTime: number) => void
  extendLoopEnd: (deltaTime: number) => void
  scaleLoop: (factor: number) => void
  setBpm: (bpm: number | null) => void
  setQuantizeLoop: (quantize: boolean) => void
  quantizeCurrentLoop: () => void
  
  // UI actions
  setTheme: (theme: 'light' | 'dark') => void
  setWaveformZoom: (zoom: number) => void
  setShowWaveform: (show: boolean) => void
  setVideoSize: (size: 'sm' | 'md' | 'lg' | 'xl') => void
  
  // Bookmark actions
  addBookmark: (bookmark: Omit<LoopBookmark, 'id' | 'createdAt'>) => void
  updateBookmark: (id: string, changes: Partial<LoopBookmark>) => void
  deleteBookmark: (id: string) => void
  loadBookmark: (id: string) => void
  setSelectedBookmarkId: (id: string | null) => void
  importBookmarks: (bookmarks: LoopBookmark[]) => void
  
  // History actions
  addRecentYouTubeVideo: (video: YouTubeMedia) => void
  clearRecentYouTubeVideos: () => void
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
  theme: 'dark',
  waveformZoom: 1,
  showWaveform: true,
  videoSize: 'md',
  bookmarks: [],
  selectedBookmarkId: null,
  recentYouTubeVideos: [],
}

export const usePlayerStore = create<PlayerState & PlayerActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Media actions
      setCurrentFile: (file) => set({ 
        currentFile: file,
        currentYouTube: null,
        currentTime: 0,
        isPlaying: false,
      }),
      setCurrentYouTube: (youtube) => {
        if (youtube) {
          get().addRecentYouTubeVideo(youtube);
        }
        set({ 
          currentYouTube: youtube,
          currentFile: null,
          currentTime: 0,
          isPlaying: false,
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
      addBookmark: (bookmark) => set((state) => ({ 
        bookmarks: [
          ...state.bookmarks, 
          { 
            ...bookmark, 
            id: Date.now().toString(), 
            createdAt: Date.now() 
          }
        ],
      })),
      updateBookmark: (id, changes) => set((state) => ({
        bookmarks: state.bookmarks.map(bookmark => 
          bookmark.id === id ? { ...bookmark, ...changes } : bookmark
        ),
      })),
      deleteBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.filter(bookmark => bookmark.id !== id),
        selectedBookmarkId: state.selectedBookmarkId === id ? null : state.selectedBookmarkId,
      })),
      loadBookmark: (id) => {
        const { bookmarks } = get();
        const bookmark = bookmarks.find(b => b.id === id);
        
        if (bookmark) {
          set({ 
            loopStart: bookmark.start,
            loopEnd: bookmark.end,
            isLooping: true,
            selectedBookmarkId: id,
            ...(bookmark.playbackRate !== undefined ? { playbackRate: bookmark.playbackRate } : {})
          });
        }
      },
      setSelectedBookmarkId: (selectedBookmarkId) => set({ selectedBookmarkId }),
      importBookmarks: (bookmarks) => set((state) => ({
        bookmarks: [...state.bookmarks, ...bookmarks],
      })),
      
      // History actions
      addRecentYouTubeVideo: (video) => set((state) => {
        // Check if this video is already in recent videos
        const exists = state.recentYouTubeVideos.some(v => v.id === video.id);
        if (exists) {
          // Move it to the top of the list
          return {
            recentYouTubeVideos: [
              video,
              ...state.recentYouTubeVideos.filter(v => v.id !== video.id)
            ].slice(0, 10) // Keep only 10 most recent
          };
        } else {
          // Add it to the top
          return {
            recentYouTubeVideos: [
              video,
              ...state.recentYouTubeVideos
            ].slice(0, 10) // Keep only 10 most recent
          };
        }
      }),
      clearRecentYouTubeVideos: () => set({ recentYouTubeVideos: [] }),
    }),
    {
      name: 'abloop-player-storage',
      partialize: (state) => ({
        volume: state.volume,
        theme: state.theme,
        bookmarks: state.bookmarks,
        recentYouTubeVideos: state.recentYouTubeVideos,
      }),
    }
  )
)
