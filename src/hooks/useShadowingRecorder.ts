import { useEffect, useRef } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useShadowingStore } from "../stores/shadowingStore";
import { storeMediaFile } from "../utils/mediaStorage";
import { toast } from "react-hot-toast";

export const useShadowingRecorder = () => {
    const { isPlaying, currentFile, currentYouTube, currentTime } = usePlayerStore();
    const {
        isShadowingMode,
        delay,
        setIsRecording,
        addSegment,
    } = useShadowingStore();

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const stopTimerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);
    const streamRef = useRef<MediaStream | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    // Initialize stream when shadowing mode is enabled
    useEffect(() => {
        if (isShadowingMode) {
            if (!streamRef.current) {
                navigator.mediaDevices
                    .getUserMedia({ audio: true })
                    .then((stream) => {
                        streamRef.current = stream;
                    })
                    .catch((err) => {
                        console.error("Microphone access denied:", err);
                        toast.error("Microphone access is required for shadowing.");
                    });
            }
        } else {
            // Cleanup stream when disabled
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        }
    }, [isShadowingMode]);

    useEffect(() => {
        if (!isShadowingMode) return;
        if (!streamRef.current && isPlaying) {
            // Retry getting stream if missing (e.g. user enabled while playing?) 
            // Or just let the failure handle it (toast above).
            // Realistically, we should check stream availability before starting.
            // For now, assume promise resolves fast enough or next update handles it.
            // But better to be safe: without stream, we can't record.
        }

        const startRecording = () => {
            if (!streamRef.current) return;
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") return;

            try {
                const recorder = new MediaRecorder(streamRef.current);
                mediaRecorderRef.current = recorder;
                chunksRef.current = [];
                startTimeRef.current = currentTime; // Rough start time

                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
                };

                recorder.onstop = async () => {
                    console.log("🎙️ [ShadowingRecorder] Recording stopped, processing...");

                    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                    console.log("🎙️ [ShadowingRecorder] Created blob:", { size: blob.size, type: blob.type });

                    if (blob.size === 0) {
                        console.warn("🎙️ [ShadowingRecorder] Blob is empty, skipping save");
                        return;
                    }

                    // Convert blob to File for storage utility
                    // We use a timestamped name
                    const fileName = `shadowing-${Date.now()}.webm`;
                    const file = new File([blob], fileName, { type: "audio/webm" });
                    console.log("🎙️ [ShadowingRecorder] Created file:", { name: file.name, size: file.size, type: file.type });

                    try {
                        console.log("🎙️ [ShadowingRecorder] Storing file to IndexedDB...");
                        const storageId = await storeMediaFile(file);
                        console.log("🎙️ [ShadowingRecorder] File stored with ID:", storageId);

                        // Use the same media ID logic as the rest of the app
                        const { getCurrentMediaId } = usePlayerStore.getState();
                        const mediaId = getCurrentMediaId();
                        console.log("🎙️ [ShadowingRecorder] Current media ID (using getCurrentMediaId):", mediaId);

                        if (mediaId) {
                            // Calculate duration from blob if possible, or use wall clock diff?
                            // WebM duration metadata might be missing.
                            // For visualization, we might decode it later. 
                            // For now, let's just save valid segments.
                            // We'll trust the visualizer to figure out exact duration from the buffer.

                            // Wait, we need the stored file ID to retrieve it later for visualization.
                            const segment = {
                                id: Math.random().toString(36).substring(7),
                                startTime: startTimeRef.current,
                                duration: 0, // Placeholder, will need to be calculated on load
                                storageId: storageId,
                            };

                            console.log("🎙️ [ShadowingRecorder] Adding segment to store:", segment);
                            addSegment(mediaId, segment);
                            console.log("🎙️ [ShadowingRecorder] Segment added successfully");

                            toast.success("Shadowing recording saved");
                        } else {
                            console.error("🎙️ [ShadowingRecorder] No media ID available, cannot save segment");
                        }
                    } catch (error) {
                        console.error("🎙️ [ShadowingRecorder] Failed to save shadowing recording:", error);
                        toast.error("Failed to save recording");
                    }

                    setIsRecording(false);
                    mediaRecorderRef.current = null;
                };

                recorder.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Failed to start MediaRecorder:", err);
                toast.error("Failed to start recording");
            }
        };

        const stopRecording = () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
        };

        if (isPlaying) {
            // If playing, ensure we are recording
            if (stopTimerRef.current) {
                clearTimeout(stopTimerRef.current);
                stopTimerRef.current = null;
            }

            startRecording();
        } else {
            // If paused, schedule stop
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                if (!stopTimerRef.current) {
                    stopTimerRef.current = setTimeout(() => {
                        stopRecording();
                        stopTimerRef.current = null;
                    }, delay * 1000);
                }
            }
        }
    }, [isPlaying, isShadowingMode, delay, currentTime, currentFile, currentYouTube, setIsRecording, addSegment]);
};
