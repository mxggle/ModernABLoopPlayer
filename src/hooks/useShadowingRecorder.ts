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
        muted: shadowingMuted,
        setMuted: setShadowingMuted,
    } = useShadowingStore();

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
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

            // FIRST: Save current mute state BEFORE any other operations
            const currentMuteState = shadowingMuted;
            previousMuteStateRef.current = currentMuteState;
            console.log("💾 [ShadowingRecorder] Saved mute state BEFORE recording:", currentMuteState);

            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

                // Create source from stream
                const source = audioContext.createMediaStreamSource(streamRef.current);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);

                const recorder = new MediaRecorder(streamRef.current);
                mediaRecorderRef.current = recorder;
                chunksRef.current = [];
                startTimeRef.current = currentTime; // Rough start time

                // Initialize active recording state
                const { updateCurrentRecording } = useShadowingStore.getState();
                updateCurrentRecording({ startTime: currentTime, peaks: [] });

                // Start data collection loop
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                const updateInterval = 50; // Update every 50ms (20fps)

                // Using a ref for the interval to clear it later
                const analysisInterval = setInterval(() => {
                    if (mediaRecorderRef.current?.state !== "recording") {
                        clearInterval(analysisInterval);
                        return;
                    }

                    analyser.getByteTimeDomainData(dataArray);

                    // Calculate RMS
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        const amplitude = (dataArray[i] - 128) / 128; // Normalize to -1..1
                        sum += amplitude * amplitude;
                    }
                    const rms = Math.sqrt(sum / dataArray.length);

                    // Update store with new peak
                    // We use functional state update to append without reading full state unnecessarily?
                    // actually zustand 'set' merges. deeply nested updates are harder.
                    // Let's read current, append, set.
                    const current = useShadowingStore.getState().currentRecording;
                    if (current) {
                        updateCurrentRecording({
                            ...current,
                            peaks: [...current.peaks, rms]
                        });
                    }
                }, updateInterval);

                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
                };

                recorder.onstop = async () => {
                    clearInterval(analysisInterval);
                    updateCurrentRecording(null); // Clear visualization on stop

                    // Clean up audio context
                    source.disconnect();
                    analyser.disconnect();
                    if (audioContext.state !== 'closed') {
                        audioContext.close();
                    }

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
                        // Decode audio to get actual duration
                        const arrayBuffer = await file.arrayBuffer();
                        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
                        console.log("🎙️ [ShadowingRecorder] Current media ID (using getCurrentMediaId):", mediaId);

                        if (mediaId) {
                            const recordingStartTime = startTimeRef.current;
                            const recordingEndTime = endTimeRef.current; // Use actual played end time

                            console.log(`🎙️ [ShadowingRecorder] Recording time range: ${recordingStartTime.toFixed(2)}s - ${recordingEndTime.toFixed(2)}s (played duration: ${(recordingEndTime - recordingStartTime).toFixed(2)}s, audio duration: ${actualDuration.toFixed(2)}s)`);

                            // Remove any overlapping segments in the PLAYED time range
                            const { removeOverlappingSegments } = useShadowingStore.getState();
                            await removeOverlappingSegments(mediaId, recordingStartTime, recordingEndTime);

                            const segment = {
                                id: Math.random().toString(36).substring(7),
                                startTime: recordingStartTime,
                                duration: actualDuration, // Store actual audio duration for playback
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

                // THEN: Mute shadowing playback if it wasn't already muted
                if (!currentMuteState) {
                    console.log("🔇 [ShadowingRecorder] Muting shadowing playback during recording");
                    setShadowingMuted(true);
                }
            } catch (err) {
                console.error("Failed to start MediaRecorder:", err);
                toast.error("Failed to start recording");
            }
        };

        const stopRecording = () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                // Capture the end time when recording actually stops
                endTimeRef.current = currentTime;

                mediaRecorderRef.current.stop();

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
