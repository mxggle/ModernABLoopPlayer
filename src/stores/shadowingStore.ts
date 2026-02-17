import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deleteMediaFile } from "../utils/mediaStorage";

interface ShadowingSegment {
    id: string;
    startTime: number; // offset in seconds relative to media start
    duration: number; // in seconds
    storageId: string; // ID in IndexedDB
    fileOffset?: number; // Start offset within the audio file (for trimmed/split segments)
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

    // Real-time recording visualization state
    currentRecording: {
        startTime: number;
        peaks: number[];
    } | null;
    updateCurrentRecording: (data: { startTime: number; peaks: number[] } | null) => void;

    addSegment: (mediaId: string, segment: ShadowingSegment) => void;
    getSegments: (mediaId: string) => ShadowingSegment[];
    clearSegments: (mediaId: string) => void;
    deleteAllSegments: (mediaId: string) => Promise<void>;
    removeOverlappingSegments: (mediaId: string, startTime: number, endTime: number) => Promise<void>;
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
            currentRecording: null,

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

            updateCurrentRecording: (data) => set({ currentRecording: data }),

            addSegment: (mediaId, segment) => set((state) => {
                const currentSession = state.sessions[mediaId] || { segments: [] };
                return {
                    // Ensure new recordings are audible
                    muted: false,
                    volume: state.volume === 0 ? 1 : state.volume,
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
                const { [mediaId]: _removed, ...rest } = state.sessions;
                return { sessions: rest };
            }),

            deleteAllSegments: async (mediaId) => {
                const session = get().sessions[mediaId];
                if (!session) return;

                // Collect unique storage IDs to delete
                const storageIds = new Set(session.segments.map(s => s.storageId));

                // Clear the session state first
                set((state) => {
                    const { [mediaId]: _removed, ...rest } = state.sessions;
                    return { sessions: rest };
                });

                // Delete all audio files from IndexedDB
                for (const storageId of storageIds) {
                    try {
                        await deleteMediaFile(storageId);
                        console.log(`🗑️ [ShadowingStore] Deleted recording file:`, storageId);
                    } catch (error) {
                        console.error(`🗑️ [ShadowingStore] Failed to delete file ${storageId}:`, error);
                    }
                }
            },

            removeOverlappingSegments: async (mediaId, startTime, endTime) => {
                const currentSession = get().sessions[mediaId];
                if (!currentSession) return;

                console.log(`🗑️ [ShadowingStore] Checking for overlaps: new recording [${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s]`);

                const session = currentSession;
                const newSegments: ShadowingSegment[] = [];
                const idsToRemove = new Set<string>();
                const storageIdsToCheckForDeletion = new Set<string>();

                session.segments.forEach(seg => {
                    const segDuration = seg.duration > 0.1 ? seg.duration : 5.0;
                    const segStart = seg.startTime;
                    const segEnd = segStart + segDuration;
                    const fileOffset = seg.fileOffset || 0;

                    // Check overlap
                    // Overlap exists if start < segEnd AND end > segStart
                    if (startTime < segEnd && endTime > segStart) {
                        console.log(`🗑️ [ShadowingStore] Processing overlap for segment ${seg.id} [${segStart.toFixed(2)}-${segEnd.toFixed(2)}]`);

                        idsToRemove.add(seg.id);
                        storageIdsToCheckForDeletion.add(seg.storageId);

                        // Case 1: Fully contained (New recording covers entire segment)
                        // startTime <= segStart AND endTime >= segEnd
                        if (startTime <= segStart && endTime >= segEnd) {
                            console.log(`   -> Fully overwritten`);
                            // Just remove, done.
                        }
                        // Case 2: Split in middle (New recording in middle of segment)
                        // startTime > segStart AND endTime < segEnd
                        else if (startTime > segStart && endTime < segEnd) {
                            console.log(`   -> Split in middle`);
                            // Create first half
                            // [segStart, startTime]
                            const firstDuration = startTime - segStart;
                            newSegments.push({
                                id: Math.random().toString(36).substring(7),
                                startTime: segStart,
                                duration: firstDuration,
                                storageId: seg.storageId,
                                fileOffset: fileOffset // Starts at same point in file
                            });

                            // Create second half
                            // [endTime, segEnd]
                            const secondDuration = segEnd - endTime;
                            // Offset in file increases by (endTime - segStart)
                            // Wait: fileOffset corresponds to segStart.
                            // New start is endTime. Diff is endTime - segStart.
                            const secondOffset = fileOffset + (endTime - segStart);
                            newSegments.push({
                                id: Math.random().toString(36).substring(7),
                                startTime: endTime,
                                duration: secondDuration,
                                storageId: seg.storageId,
                                fileOffset: secondOffset
                            });
                        }
                        // Case 3: Trim end (New recording starts during segment)
                        // startTime > segStart
                        else if (startTime > segStart) {
                            console.log(`   -> Trim end`);
                            // Keep start part: [segStart, startTime]
                            const newDuration = startTime - segStart;
                            newSegments.push({
                                id: Math.random().toString(36).substring(7),
                                startTime: segStart,
                                duration: newDuration,
                                storageId: seg.storageId,
                                fileOffset: fileOffset
                            });
                        }
                        // Case 4: Trim start (New recording ends during segment)
                        // endTime < segEnd
                        else if (endTime < segEnd) {
                            console.log(`   -> Trim start`);
                            // Keep end part: [endTime, segEnd]
                            const newDuration = segEnd - endTime;
                            const newOffset = fileOffset + (endTime - segStart);
                            newSegments.push({
                                id: Math.random().toString(36).substring(7),
                                startTime: endTime,
                                duration: newDuration,
                                storageId: seg.storageId,
                                fileOffset: newOffset
                            });
                        }
                    }
                });

                // Update state
                set((state) => {
                    const session = state.sessions[mediaId];
                    if (!session) return state;

                    // Filter out removed IDs and add new splits
                    const keptSegments = session.segments.filter(s => !idsToRemove.has(s.id));
                    const finalSegments = [...keptSegments, ...newSegments];

                    return {
                        sessions: {
                            ...state.sessions,
                            [mediaId]: {
                                ...session,
                                segments: finalSegments,
                            },
                        },
                    };
                });

                // File Deletion Logic: Reference Counting
                // We only delete a file if NO segments (including new ones) refer to it anymore.
                const allSegmentsNow = get().sessions[mediaId]?.segments || [];
                const activeStorageIds = new Set(allSegmentsNow.map(s => s.storageId));

                for (const storageId of storageIdsToCheckForDeletion) {
                    if (!activeStorageIds.has(storageId)) {
                        try {
                            console.log(`🗑️ [ShadowingStore] Deleting orphaned file:`, storageId);
                            await deleteMediaFile(storageId);
                        } catch (error) {
                            console.error(`🗑️ [ShadowingStore] Failed to delete file ${storageId}:`, error);
                        }
                    } else {
                        console.log(`🗑️ [ShadowingStore] Preserving file ${storageId} (still referenced)`);
                    }
                }
            },
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
