import { useEffect, useRef } from "react";
import { usePlayerStore } from "../stores/playerStore";

/**
 * Hook to persist playback time to the history item in the store.
 * It debounces the update to avoid frequent store writes/re-renders.
 */
export const usePlaybackPersistence = () => {
    const { currentFile, currentYouTube, currentTime, updateHistoryPlaybackTime, mediaHistory } = usePlayerStore();
    const lastSavedTime = useRef<number>(currentTime);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Determine current media ID
    const getCurrentMediaId = () => {
        if (currentFile) {
            // Find the history item for this file
            // We can't rely just on file ID because the history ID is what we need to update
            // But we don't have the history ID directly in currentFile state usually
            // However, addToMediaHistory ensures we have an entry.
            // Let's find it.
            if (currentFile.storageId) {
                return mediaHistory.find(h => h.type === "file" && h.storageId === currentFile.storageId)?.id;
            }
            return mediaHistory.find(h => h.type === "file" && h.fileData?.name === currentFile.name && h.fileData?.size === currentFile.size)?.id;
        }

        if (currentYouTube) {
            return mediaHistory.find(h => h.type === "youtube" && h.youtubeData?.youtubeId === currentYouTube.id)?.id;
        }

        return null;
    };

    const currentHistoryId = getCurrentMediaId();

    // Save on unmount or media change
    useEffect(() => {
        const handleSave = () => {
            if (currentHistoryId && Math.abs(currentTime - lastSavedTime.current) > 1) {
                updateHistoryPlaybackTime(currentHistoryId, currentTime);
                lastSavedTime.current = currentTime;
            }
        };

        // Save when unmounting or changing media
        return () => {
            // We need to capture the values at the time of unmount
            // But hooks refs are mutable.
            // Actually, we should just save periodically.
            // The cleanup function runs when dependencies change.
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            handleSave();
        };
    }, [currentHistoryId, currentTime, updateHistoryPlaybackTime]);

    // Periodic save (debounce)
    useEffect(() => {
        if (!currentHistoryId) return;

        if (Math.abs(currentTime - lastSavedTime.current) > 2) { // Only save if changed significantly (2s)
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(() => {
                updateHistoryPlaybackTime(currentHistoryId, currentTime);
                lastSavedTime.current = currentTime;
            }, 2000); // 2 second debounce
        }

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [currentTime, currentHistoryId, updateHistoryPlaybackTime]);
};
