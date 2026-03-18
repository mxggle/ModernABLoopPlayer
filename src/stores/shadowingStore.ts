import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deleteMediaFile } from "../utils/mediaStorage";

interface ShadowingSegment {
    id: string;
    startTime: number;
    duration: number;
    storageId: string;
    fileOffset?: number;
    peaks?: number[];
    peakTimes?: number[];
}

interface ShadowingSession {
    segments: ShadowingSegment[];
}

interface ShadowingState {
    isShadowingMode: boolean;
    delay: number;
    isRecording: boolean;
    volume: number;
    previousShadowVolume?: number;
    muted: boolean;
    sessions: Record<string, ShadowingSession>;
    currentRecording: {
        startTime: number;
        peaks: number[];
        peakTimes: number[];
    } | null;
    currentRecordingRevision: number;
}

interface ShadowingActions {
    setShadowingMode: (enabled: boolean) => void;
    setDelay: (seconds: number) => void;
    setIsRecording: (isRecording: boolean) => void;
    setVolume: (volume: number) => void;
    setPreviousShadowVolume: (volume: number) => void;
    setMuted: (muted: boolean) => void;
    beginCurrentRecording: (startTime: number) => void;
    appendCurrentRecordingPeak: (peak: number, elapsedTime: number) => void;
    clearCurrentRecording: () => void;
    addSegment: (mediaId: string, segment: ShadowingSegment) => void;
    getSegments: (mediaId: string) => ShadowingSegment[];
    clearSegments: (mediaId: string) => void;
    deleteAllSegments: (mediaId: string) => Promise<void>;
    removeOverlappingSegments: (mediaId: string, startTime: number, endTime: number) => Promise<void>;
}

const EMPTY_SESSION: ShadowingSession = { segments: [] };

const sliceSegmentPeakData = (
    segment: ShadowingSegment,
    sliceStart: number,
    sliceEnd: number
): Pick<ShadowingSegment, "peaks" | "peakTimes"> => {
    if (!segment.peaks?.length || !segment.peakTimes?.length) {
        return {};
    }

    const slicedPeaks: number[] = [];
    const slicedPeakTimes: number[] = [];

    segment.peakTimes.forEach((time, index) => {
        if (time >= sliceStart && time <= sliceEnd) {
            slicedPeaks.push(segment.peaks![index]);
            slicedPeakTimes.push(time - sliceStart);
        }
    });

    return slicedPeaks.length > 0
        ? { peaks: slicedPeaks, peakTimes: slicedPeakTimes }
        : {};
};

export const useShadowingStore = create<ShadowingState & ShadowingActions>()(
    persist(
        (set, get) => ({
            isShadowingMode: false,
            delay: 2,
            isRecording: false,
            volume: 1,
            muted: false,
            sessions: {},
            currentRecording: null,
            currentRecordingRevision: 0,

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
            beginCurrentRecording: (startTime) => set((state) => ({
                currentRecording: {
                    startTime,
                    peaks: [],
                    peakTimes: [],
                },
                currentRecordingRevision: state.currentRecordingRevision + 1,
            })),
            appendCurrentRecordingPeak: (peak, elapsedTime) => set((state) => {
                if (!state.currentRecording) {
                    return state;
                }

                state.currentRecording.peaks.push(peak);
                state.currentRecording.peakTimes.push(elapsedTime);

                return {
                    currentRecording: state.currentRecording,
                    currentRecordingRevision: state.currentRecordingRevision + 1,
                };
            }),
            clearCurrentRecording: () => set((state) => ({
                currentRecording: null,
                currentRecordingRevision: state.currentRecordingRevision + 1,
            })),

            addSegment: (mediaId, segment) => set((state) => {
                const session = state.sessions[mediaId] || EMPTY_SESSION;

                return {
                    muted: false,
                    volume: state.volume === 0 ? 1 : state.volume,
                    sessions: {
                        ...state.sessions,
                        [mediaId]: {
                            segments: [...session.segments, segment],
                        },
                    },
                };
            }),

            getSegments: (mediaId) => {
                return get().sessions[mediaId]?.segments || [];
            },

            clearSegments: (mediaId) => set((state) => {
                const rest = { ...state.sessions };
                delete rest[mediaId];
                return { sessions: rest };
            }),

            deleteAllSegments: async (mediaId) => {
                const session = get().sessions[mediaId];
                if (!session) return;

                const storageIds = new Set(session.segments.map((segment) => segment.storageId));

                set((state) => {
                    const rest = { ...state.sessions };
                    delete rest[mediaId];
                    return { sessions: rest };
                });

                for (const storageId of storageIds) {
                    try {
                        await deleteMediaFile(storageId);
                        console.log("🗑️ [ShadowingStore] Deleted recording file:", storageId);
                    } catch (error) {
                        console.error(`🗑️ [ShadowingStore] Failed to delete file ${storageId}:`, error);
                    }
                }
            },

            removeOverlappingSegments: async (mediaId, startTime, endTime) => {
                const session = get().sessions[mediaId];
                if (!session) return;

                console.log(`🗑️ [ShadowingStore] Checking for overlaps in track: new recording [${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s]`);

                const newSegments: ShadowingSegment[] = [];
                const idsToRemove = new Set<string>();
                const storageIdsToCheckForDeletion = new Set<string>();

                session.segments.forEach((seg) => {
                    const segDuration = seg.duration > 0.1 ? seg.duration : 5.0;
                    const segStart = seg.startTime;
                    const segEnd = segStart + segDuration;
                    const fileOffset = seg.fileOffset || 0;

                    if (startTime < segEnd && endTime > segStart) {
                        console.log(`🗑️ [ShadowingStore] Processing overlap for segment ${seg.id} [${segStart.toFixed(2)}-${segEnd.toFixed(2)}]`);

                        idsToRemove.add(seg.id);
                        storageIdsToCheckForDeletion.add(seg.storageId);

                        if (startTime <= segStart && endTime >= segEnd) {
                            console.log("   -> Fully overwritten");
                        } else if (startTime > segStart && endTime < segEnd) {
                            console.log("   -> Split in middle");
                            const firstDuration = startTime - segStart;
                            newSegments.push({
                                id: Math.random().toString(36).substring(7),
                                startTime: segStart,
                                duration: firstDuration,
                                storageId: seg.storageId,
                                fileOffset,
                                ...sliceSegmentPeakData(seg, 0, firstDuration),
                            });

                            const secondDuration = segEnd - endTime;
                            const secondOffset = fileOffset + (endTime - segStart);
                            newSegments.push({
                                id: Math.random().toString(36).substring(7),
                                startTime: endTime,
                                duration: secondDuration,
                                storageId: seg.storageId,
                                fileOffset: secondOffset,
                                ...sliceSegmentPeakData(seg, endTime - segStart, segEnd - segStart),
                            });
                        } else if (startTime > segStart) {
                            console.log("   -> Trim end");
                            const newDuration = startTime - segStart;
                            newSegments.push({
                                id: Math.random().toString(36).substring(7),
                                startTime: segStart,
                                duration: newDuration,
                                storageId: seg.storageId,
                                fileOffset,
                                ...sliceSegmentPeakData(seg, 0, newDuration),
                            });
                        } else if (endTime < segEnd) {
                            console.log("   -> Trim start");
                            const newDuration = segEnd - endTime;
                            const newOffset = fileOffset + (endTime - segStart);
                            newSegments.push({
                                id: Math.random().toString(36).substring(7),
                                startTime: endTime,
                                duration: newDuration,
                                storageId: seg.storageId,
                                fileOffset: newOffset,
                                ...sliceSegmentPeakData(seg, endTime - segStart, segEnd - segStart),
                            });
                        }
                    }
                });

                set((state) => {
                    const currentSession = state.sessions[mediaId];
                    if (!currentSession) return state;

                    const keptSegments = currentSession.segments.filter((segment) => !idsToRemove.has(segment.id));
                    return {
                        sessions: {
                            ...state.sessions,
                            [mediaId]: {
                                segments: [...keptSegments, ...newSegments],
                            },
                        },
                    };
                });

                const activeStorageIds = new Set(
                    (get().sessions[mediaId]?.segments || []).map((segment) => segment.storageId)
                );

                for (const storageId of storageIdsToCheckForDeletion) {
                    if (!activeStorageIds.has(storageId)) {
                        try {
                            console.log("🗑️ [ShadowingStore] Deleting orphaned file:", storageId);
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
            version: 3,
            partialize: (state) => ({
                isShadowingMode: state.isShadowingMode,
                delay: state.delay,
                sessions: state.sessions,
                volume: state.volume,
                muted: state.muted,
            }),
            migrate: (persistedState: unknown) => {
                const state = (persistedState as Record<string, unknown>) || {};
                const rawSessions = (state.sessions as Record<string, { segments?: ShadowingSegment[]; recordings?: Array<{ segments: ShadowingSegment[] }> }> | undefined) || {};
                const sessions: Record<string, ShadowingSession> = {};

                for (const [mediaId, session] of Object.entries(rawSessions)) {
                    if (session?.segments) {
                        sessions[mediaId] = { segments: session.segments };
                        continue;
                    }

                    if (session?.recordings) {
                        sessions[mediaId] = {
                            segments: session.recordings.flatMap((recording) => recording.segments || []),
                        };
                    }
                }

                return {
                    ...state,
                    sessions,
                };
            },
        }
    )
);
