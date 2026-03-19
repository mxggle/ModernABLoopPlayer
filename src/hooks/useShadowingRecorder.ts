import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../stores/playerStore";
import { useShadowingStore } from "../stores/shadowingStore";
import { storeMediaFile } from "../utils/mediaStorage";
import { toast } from "react-hot-toast";
import { UniversalAudioRecorder } from "../utils/audioRecorder";

type WindowWithWebkitAudioContext = Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
};

export const useShadowingRecorder = () => {
    const { t } = useTranslation();
    const { isPlaying, currentFile, currentYouTube } = usePlayerStore();
    const {
        isShadowingMode,
        setIsRecording,
        addSegment,
        muted: shadowingMuted,
        setMuted: setShadowingMuted,
    } = useShadowingStore();

    const audioRecorderRef = useRef<UniversalAudioRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startTimeRef = useRef<number>(0);
    const endTimeRef = useRef<number>(0);
    const recordingClockStartRef = useRef<number>(0);
    const streamRef = useRef<MediaStream | null>(null);
    const previousMuteStateRef = useRef<boolean>(false);
    const isStartingRef = useRef(false);
    const [streamVersion, setStreamVersion] = useState(0);

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        if (isShadowingMode) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("getUserMedia is not supported in this browser");
                toast.error(t("shadowing.errors.notSupported"));
                const { setShadowingMode } = useShadowingStore.getState();
                setShadowingMode(false);
                return;
            }

            if (!streamRef.current) {
                void (async () => {
                    try {
                        const isSecureContext = window.isSecureContext || window.location.protocol === "https:";
                        if (!isSecureContext && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
                            console.warn("🎤 [ShadowingRecorder] iOS requires HTTPS for microphone access");
                            toast.error(t("shadowing.errors.iosHttpsRequired"), { duration: 6000 });
                            const { setShadowingMode } = useShadowingStore.getState();
                            setShadowingMode(false);
                            return;
                        }

                        console.log("🎤 [ShadowingRecorder] Requesting microphone access...");
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        if (cancelled || !useShadowingStore.getState().isShadowingMode) {
                            stream.getTracks().forEach((track) => track.stop());
                            return;
                        }
                        streamRef.current = stream;
                        console.log("🎤 [ShadowingRecorder] Microphone stream initialized");
                        setStreamVersion((version) => version + 1);
                    } catch (err) {
                        if (cancelled) {
                            return;
                        }

                        console.error("🎤 [ShadowingRecorder] Microphone access denied or failed:", err);
                        const error = err as Error;
                        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
                            toast.error(t("shadowing.errors.permissionDenied"), { duration: 5000 });
                        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
                            toast.error(t("shadowing.errors.noMicrophone"));
                        } else if (error.name === "NotSupportedError") {
                            toast.error(t("shadowing.errors.notSupportedIOS"), { duration: 6000 });
                        } else {
                            toast.error(t("shadowing.errors.failedToAccess", { message: error.message }), { duration: 5000 });
                        }

                        const { setShadowingMode } = useShadowingStore.getState();
                        setShadowingMode(false);
                    }
                })();
            }
        } else if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            setStreamVersion((version) => version + 1);
        }

        return () => {
            cancelled = true;
        };
    }, [isShadowingMode, t]);

    useEffect(() => {
        const stopRecording = () => {
            isStartingRef.current = false;

            if (audioRecorderRef.current && audioRecorderRef.current.getState() === "recording") {
                const { currentTime } = usePlayerStore.getState();
                endTimeRef.current = currentTime;

                audioRecorderRef.current.stop();

                const stateToRestore = previousMuteStateRef.current;
                console.log("🔊 [ShadowingRecorder] RESTORING mute state:", stateToRestore, "(was saved at recording start)");
                setShadowingMuted(stateToRestore);
                console.log("🔊 [ShadowingRecorder] Mute state restoration called");
            }
        };

        if (!isShadowingMode) {
            stopRecording();
            return;
        }

        const startRecording = async () => {
            if (!streamRef.current) {
                console.warn("🎤 [ShadowingRecorder] No stream available for recording");
                return;
            }
            if (isStartingRef.current) return;
            if (audioRecorderRef.current && audioRecorderRef.current.getState() === "recording") return;

            const currentMuteState = shadowingMuted;
            previousMuteStateRef.current = currentMuteState;
            console.log("💾 [ShadowingRecorder] Saved mute state BEFORE recording:", currentMuteState);

            try {
                const { currentTime } = usePlayerStore.getState();
                startTimeRef.current = currentTime;
                recordingClockStartRef.current = performance.now();
                chunksRef.current = [];

                const { beginCurrentRecording } = useShadowingStore.getState();
                beginCurrentRecording(currentTime);

                const recorder = new UniversalAudioRecorder(streamRef.current, {
                    onPeakUpdate: (peak) => {
                        const elapsedSeconds = Math.max(
                            0,
                            (performance.now() - recordingClockStartRef.current) / 1000
                        );
                        const { appendCurrentRecordingPeak } = useShadowingStore.getState();
                        appendCurrentRecordingPeak(peak, elapsedSeconds);
                    },
                    onStop: async (blob) => {
                        console.log("🎙️ [ShadowingRecorder] Recording stopped, processing...");
                        console.log("🎙️ [ShadowingRecorder] Created blob:", { size: blob.size, type: blob.type });

                        if (blob.size === 0) {
                            console.warn("🎙️ [ShadowingRecorder] Blob is empty, skipping save");
                            return;
                        }

                        const isWav = blob.type.includes("wav");
                        const extension = isWav ? "wav" : "webm";
                        const fileName = `shadowing-${Date.now()}.${extension}`;
                        const file = new File([blob], fileName, { type: blob.type });
                        console.log("🎙️ [ShadowingRecorder] Created file:", { name: file.name, size: file.size, type: file.type });

                        try {
                            const arrayBuffer = await file.arrayBuffer();
                            const AudioContextClass =
                                window.AudioContext ||
                                (window as WindowWithWebkitAudioContext).webkitAudioContext;
                            const audioContext = new AudioContextClass();
                            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                            const actualDuration = audioBuffer.duration;
                            audioContext.close();

                            console.log("🎙️ [ShadowingRecorder] Decoded audio duration:", actualDuration);

                            console.log("🎙️ [ShadowingRecorder] Storing file to IndexedDB...");
                            const storageId = await storeMediaFile(file);
                            console.log("🎙️ [ShadowingRecorder] File stored with ID:", storageId);

                            const { getCurrentMediaId } = usePlayerStore.getState();
                            const mediaId = getCurrentMediaId();
                            console.log("🎙️ [ShadowingRecorder] Current media ID:", mediaId);

                            if (mediaId) {
                                const recordingStartTime = startTimeRef.current;
                                const recordingEndTime = endTimeRef.current;
                                const finalCurrentRecording = useShadowingStore.getState().currentRecording;
                                console.log(`🎙️ [ShadowingRecorder] Recording time range: ${recordingStartTime.toFixed(2)}s - ${recordingEndTime.toFixed(2)}s (played duration: ${(recordingEndTime - recordingStartTime).toFixed(2)}s, audio duration: ${actualDuration.toFixed(2)}s)`);

                                const { removeOverlappingSegments } = useShadowingStore.getState();
                                await removeOverlappingSegments(mediaId, recordingStartTime, recordingEndTime);

                                const segment = {
                                    id: Math.random().toString(36).substring(7),
                                    startTime: recordingStartTime,
                                    duration: actualDuration,
                                    storageId,
                                    peaks: finalCurrentRecording?.peaks ? [...finalCurrentRecording.peaks] : [],
                                    peakTimes: finalCurrentRecording?.peakTimes ? [...finalCurrentRecording.peakTimes] : [],
                                };

                                console.log("🎙️ [ShadowingRecorder] Adding segment to store:", segment);
                                addSegment(mediaId, segment);
                                console.log("🎙️ [ShadowingRecorder] Segment added successfully");

                                toast.success(t("shadowing.success.saved"));
                            } else {
                                console.error("🎙️ [ShadowingRecorder] No media ID available, cannot save segment");
                            }
                        } catch (error) {
                            console.error("🎙️ [ShadowingRecorder] Failed to save shadowing recording:", error);
                            toast.error(t("shadowing.failedToSave"));
                        }

                        const { clearCurrentRecording } = useShadowingStore.getState();
                        clearCurrentRecording();
                        setIsRecording(false);
                        audioRecorderRef.current = null;
                    },
                    onError: (error) => {
                        console.error("🎙️ [ShadowingRecorder] Recording error:", error);
                        toast.error(t("shadowing.recordingError", { message: error.message }));
                        const { clearCurrentRecording } = useShadowingStore.getState();
                        clearCurrentRecording();
                        setIsRecording(false);
                        audioRecorderRef.current = null;
                    },
                });

                audioRecorderRef.current = recorder;

                isStartingRef.current = true;
                await recorder.start();

                if (!useShadowingStore.getState().isShadowingMode || !usePlayerStore.getState().isPlaying) {
                    recorder.stop();
                    audioRecorderRef.current = null;
                    return;
                }

                setIsRecording(true);

                if (!currentMuteState) {
                    console.log("🔇 [ShadowingRecorder] Muting shadowing playback during recording");
                    setShadowingMuted(true);
                }
            } catch (err) {
                console.error("🎙️ [ShadowingRecorder] Failed to start recorder:", err);
                audioRecorderRef.current = null;
                const { clearCurrentRecording, setShadowingMode } = useShadowingStore.getState();
                clearCurrentRecording();
                setIsRecording(false);
                setShadowingMode(false);

                const error = err as Error;
                toast.error(t("shadowing.errors.failedToStart", { message: error.message || t("shadowing.errors.unknownError") }));
            } finally {
                isStartingRef.current = false;
            }
        };

        if (isPlaying) {
            void startRecording();
        } else if (audioRecorderRef.current && audioRecorderRef.current.getState() === "recording") {
            stopRecording();
        }
    }, [isPlaying, isShadowingMode, currentFile, currentYouTube, setIsRecording, addSegment, setShadowingMuted, shadowingMuted, streamVersion, t]);
};
