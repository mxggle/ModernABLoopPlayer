import { useEffect, useRef } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useShadowingStore } from "../stores/shadowingStore";
import { storeMediaFile } from "../utils/mediaStorage";
import { toast } from "react-hot-toast";
import { UniversalAudioRecorder } from "../utils/audioRecorder";

export const useShadowingRecorder = () => {
    const { isPlaying, currentFile, currentYouTube } = usePlayerStore();
    const {
        isShadowingMode,
        delay,
        setIsRecording,
        addSegment,
        muted: shadowingMuted,
        setMuted: setShadowingMuted,
    } = useShadowingStore();

    const audioRecorderRef = useRef<UniversalAudioRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const stopTimerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);
    const endTimeRef = useRef<number>(0); // Track when recording actually ends
    const streamRef = useRef<MediaStream | null>(null);
    const previousMuteStateRef = useRef<boolean>(false); // Store mute state before recording

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
            // Check if getUserMedia is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("getUserMedia is not supported in this browser");
                toast.error("Audio recording is not supported in this browser. Please use a modern browser.");
                const { setShadowingMode } = useShadowingStore.getState();
                setShadowingMode(false);
                return;
            }

            if (!streamRef.current) {
                // Use async function with better error handling
                (async () => {
                    try {
                        // Check if we're on HTTPS (required for iOS Safari)
                        const isSecureContext = window.isSecureContext || window.location.protocol === 'https:';
                        if (!isSecureContext && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
                            console.warn("🎤 [ShadowingRecorder] iOS requires HTTPS for microphone access");
                            toast.error("iOS Safari requires HTTPS for recording. Please access this site via HTTPS or use localhost.", { duration: 6000 });
                            const { setShadowingMode } = useShadowingStore.getState();
                            setShadowingMode(false);
                            return;
                        }

                        console.log("🎤 [ShadowingRecorder] Requesting microphone access...");
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        streamRef.current = stream;
                        console.log("🎤 [ShadowingRecorder] Microphone stream initialized");
                    } catch (err) {
                        console.error("🎤 [ShadowingRecorder] Microphone access denied or failed:", err);

                        // Provide more specific error messages
                        const error = err as Error;
                        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
                            toast.error("Microphone permission denied. Please allow microphone access in your browser settings.", { duration: 5000 });
                        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
                            toast.error("No microphone found on this device.");
                        } else if (error.name === "NotSupportedError") {
                            toast.error("Microphone access is not supported. On iOS, please use HTTPS or localhost.", { duration: 6000 });
                        } else {
                            toast.error(`Failed to access microphone: ${error.message}`, { duration: 5000 });
                        }

                        // Automatically disable shadowing mode on error
                        const { setShadowingMode } = useShadowingStore.getState();
                        setShadowingMode(false);
                    }
                })();
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
            if (!streamRef.current) {
                console.warn("🎤 [ShadowingRecorder] No stream available for recording");
                return;
            }
            if (audioRecorderRef.current && audioRecorderRef.current.getState() === "recording") return;

            // FIRST: Save current mute state BEFORE any other operations
            const currentMuteState = shadowingMuted;
            previousMuteStateRef.current = currentMuteState;
            console.log("💾 [ShadowingRecorder] Saved mute state BEFORE recording:", currentMuteState);

            try {
                const { currentTime } = usePlayerStore.getState();
                startTimeRef.current = currentTime;
                chunksRef.current = [];

                // Initialize active recording state
                const { updateCurrentRecording } = useShadowingStore.getState();
                updateCurrentRecording({ startTime: currentTime, peaks: [] });

                // Create universal audio recorder
                const recorder = new UniversalAudioRecorder(streamRef.current, {
                    onPeakUpdate: (peak) => {
                        // Update store with new peak
                        const current = useShadowingStore.getState().currentRecording;
                        if (current) {
                            updateCurrentRecording({
                                ...current,
                                peaks: [...current.peaks, peak]
                            });
                        }
                    },
                    onStop: async (blob) => {
                        updateCurrentRecording(null); // Clear visualization on stop

                        console.log("🎙️ [ShadowingRecorder] Recording stopped, processing...");
                        console.log("🎙️ [ShadowingRecorder] Created blob:", { size: blob.size, type: blob.type });

                        if (blob.size === 0) {
                            console.warn("🎙️ [ShadowingRecorder] Blob is empty, skipping save");
                            return;
                        }

                        // Convert blob to File for storage
                        // Determine extension based on blob type
                        const isWav = blob.type.includes('wav');
                        const extension = isWav ? 'wav' : 'webm';
                        const fileName = `shadowing-${Date.now()}.${extension}`;
                        const file = new File([blob], fileName, { type: blob.type });
                        console.log("🎙️ [ShadowingRecorder] Created file:", { name: file.name, size: file.size, type: file.type });

                        try {
                            // Decode audio to get actual duration
                            const arrayBuffer = await file.arrayBuffer();
                            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                            const audioContext = new AudioContextClass();
                            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                            const actualDuration = audioBuffer.duration;
                            audioContext.close();

                            console.log("🎙️ [ShadowingRecorder] Decoded audio duration:", actualDuration);

                            console.log("🎙️ [ShadowingRecorder] Storing file to IndexedDB...");
                            const storageId = await storeMediaFile(file);
                            console.log("🎙️ [ShadowingRecorder] File stored with ID:", storageId);

                            // Use the same media ID logic as the rest of the app
                            const { getCurrentMediaId } = usePlayerStore.getState();
                            const mediaId = getCurrentMediaId();
                            console.log("🎙️ [ShadowingRecorder] Current media ID:", mediaId);

                            if (mediaId) {
                                const recordingStartTime = startTimeRef.current;
                                const recordingEndTime = endTimeRef.current;

                                console.log(`🎙️ [ShadowingRecorder] Recording time range: ${recordingStartTime.toFixed(2)}s - ${recordingEndTime.toFixed(2)}s (played duration: ${(recordingEndTime - recordingStartTime).toFixed(2)}s, audio duration: ${actualDuration.toFixed(2)}s)`);

                                // Remove any overlapping segments
                                const { removeOverlappingSegments } = useShadowingStore.getState();
                                await removeOverlappingSegments(mediaId, recordingStartTime, recordingEndTime);

                                const segment = {
                                    id: Math.random().toString(36).substring(7),
                                    startTime: recordingStartTime,
                                    duration: actualDuration,
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
                        audioRecorderRef.current = null;
                    },
                    onError: (error) => {
                        console.error("🎙️ [ShadowingRecorder] Recording error:", error);
                        toast.error(`Recording error: ${error.message}`);
                        setIsRecording(false);
                        audioRecorderRef.current = null;
                    }
                });

                audioRecorderRef.current = recorder;

                // Start recording
                recorder.start();
                setIsRecording(true);

                // THEN: Mute shadowing playback if it wasn't already muted
                if (!currentMuteState) {
                    console.log("🔇 [ShadowingRecorder] Muting shadowing playback during recording");
                    setShadowingMuted(true);
                }
            } catch (err) {
                console.error("🎙️ [ShadowingRecorder] Failed to start recorder:", err);

                // Auto-disable shadowing mode on error
                const { setShadowingMode } = useShadowingStore.getState();
                setShadowingMode(false);

                const error = err as Error;
                toast.error(`Recording failed: ${error.message || "Unknown error"}`);
            }
        };

        const stopRecording = () => {
            if (audioRecorderRef.current && audioRecorderRef.current.getState() === "recording") {
                // Capture the end time when recording actually stops
                const { currentTime } = usePlayerStore.getState();
                endTimeRef.current = currentTime;

                audioRecorderRef.current.stop();

                // Restore previous mute state
                const stateToRestore = previousMuteStateRef.current;
                console.log("🔊 [ShadowingRecorder] RESTORING mute state:", stateToRestore, "(was saved at recording start)");
                setShadowingMuted(stateToRestore);
                console.log("🔊 [ShadowingRecorder] Mute state restoration called");
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
            if (audioRecorderRef.current && audioRecorderRef.current.getState() === "recording") {
                if (!stopTimerRef.current) {
                    stopTimerRef.current = setTimeout(() => {
                        stopRecording();
                        stopTimerRef.current = null;
                    }, delay * 1000);
                }
            }
        }
    }, [isPlaying, isShadowingMode, delay, currentFile, currentYouTube, setIsRecording, addSegment]);
};
