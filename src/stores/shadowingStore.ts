import { create } from "zustand";
import { persist } from "zustand/middleware";
import { storeMediaFile, retrieveMediaFile } from "../utils/mediaStorage";

interface ShadowingSegment {
    id: string;
    startTime: number; // offset in seconds relative to media start
    duration: number; // in seconds
    storageId: string; // ID in IndexedDB
}

interface ShadowingState {
    isShadowingMode: boolean;
    delay: number; // Seconds to record after playback stops
    isRecording: boolean;
    volume: number;
    previousShadowVolume?: number; // Store volume before muting
    muted: boolean;

    // Per-media shadowing data
    // Key is media ID (or unique identifier for the file/youtube video)
    sessions: Record<string, {
        segments: ShadowingSegment[];
    }>;
}

interface ShadowingActions {
    setShadowingMode: (enabled: boolean) => void;
    setDelay: (seconds: number) => void;
    setIsRecording: (isRecording: boolean) => void;
    setVolume: (volume: number) => void;
    setPreviousShadowVolume: (volume: number) => void;
    setMuted: (muted: boolean) => void;

    addSegment: (mediaId: string, segment: ShadowingSegment) => void;
    getSegments: (mediaId: string) => ShadowingSegment[];
    clearSegments: (mediaId: string) => void;
}

export const useShadowingStore = create<ShadowingState & ShadowingActions>()(
    persist(
        (set, get) => ({
            isShadowingMode: false,
            delay: 2, // Default 2 seconds delay
            isRecording: false,
            volume: 1,
            muted: false,
            sessions: {},

            setShadowingMode: (enabled) => set({ isShadowingMode: enabled }),
            setDelay: (seconds) => set({ delay: seconds }),
            setIsRecording: (isRecording) => set({ isRecording }),
            setVolume: (volume) => {
                console.log("🔊 [ShadowingStore] Setting volume:", volume);
                set({ volume });
            },
            setPreviousShadowVolume: (previousShadowVolume) => set({ previousShadowVolume }),
            setMuted: (muted) => {
                console.log("🔇 [ShadowingStore] Setting muted:", muted);
                set({ muted });
            },

            addSegment: (mediaId, segment) => set((state) => {
                const currentSession = state.sessions[mediaId] || { segments: [] };
                return {
                    sessions: {
                        ...state.sessions,
                        [mediaId]: {
                            ...currentSession,
                            segments: [...currentSession.segments, segment],
                        },
                    },
                };
            }),

            getSegments: (mediaId) => {
                return get().sessions[mediaId]?.segments || [];
            },

            clearSegments: (mediaId) => set((state) => {
                // ideally we should also delete files from storage, but for now just clear local reference
                // cleanup can happen lazily or via a separate action
                const { [mediaId]: removed, ...rest } = state.sessions;
                return { sessions: rest };
            }),
        }),
        {
            name: "shadowing-store",
            partialize: (state) => ({
                isShadowingMode: state.isShadowingMode,
                delay: state.delay,
                sessions: state.sessions,
                volume: state.volume,
                muted: state.muted,
            }),
        }
    )
);
