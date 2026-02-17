import { useEffect, useRef, useState, useCallback } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useShadowingStore } from "../stores/shadowingStore";
import { retrieveMediaFile } from "../utils/mediaStorage";

// Stable empty array to avoid creating new [] on every render
const EMPTY_SEGMENTS: readonly any[] = Object.freeze([]);

// Web Audio API context standardizer
const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext;

export const useShadowingPlayer = () => {
    const {
        isPlaying,
        currentTime,
        playbackRate,
    } = usePlayerStore();

    const {
        volume,
        muted,
    } = useShadowingStore();

    // Get master volume and muted state reactively
    const masterVolume = usePlayerStore((state) => state.volume);
    const masterMuted = usePlayerStore((state) => state.muted);

    const audioContextRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const activeNodesRef = useRef<AudioBufferSourceNode[]>([]);
    const segmentsRef = useRef<{ start: number; duration: number; fileOffset: number; buffer: AudioBuffer }[]>([]);
    const startTimeRef = useRef<number>(0);
    const contextStartTimeRef = useRef<number>(0);

    // Track loaded state to preventing trying to play before ready
    const [isLoaded, setIsLoaded] = useState(false);

    // Use getCurrentMediaId to ensure consistency
    const mediaId = usePlayerStore((state) => state.getCurrentMediaId());

    // Use a Zustand selector for segments to ensure referential stability
    const segments = useShadowingStore((state) => {
        if (!mediaId) return EMPTY_SEGMENTS as any[];
        return state.sessions[mediaId]?.segments || (EMPTY_SEGMENTS as any[]);
    });

    // Initialize AudioContext
    useEffect(() => {
        if (!audioContextRef.current) {
            const ctx = new AudioContextClass();
            const gain = ctx.createGain();
            gain.connect(ctx.destination);

            audioContextRef.current = ctx;
            gainNodeRef.current = gain;
        }

        return () => {
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(console.error);
                audioContextRef.current = null;
            }
        };
    }, [mediaId]); // Re-init on media change

    // Load segments when media changes OR when segments are added/removed
    useEffect(() => {
        if (!mediaId || !audioContextRef.current) {
            segmentsRef.current = [];
            setIsLoaded(false);
            return;
        }

        if (segments.length === 0) {
            segmentsRef.current = [];
            setIsLoaded(true);
            return;
        }

        let active = true;
        setIsLoaded(false);

        const loadAudio = async () => {
            const loaded = await Promise.all(
                segments.map(async (seg, index) => {
                    try {
                        const file = await retrieveMediaFile(seg.storageId);
                        if (!file) {
                            console.warn(`[ShadowingPlayer] No file found for segment ${index}`);
                            return null;
                        }

                        const arrayBuffer = await file.arrayBuffer();

                        if (!audioContextRef.current) {
                            return null;
                        }

                        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

                        return {
                            start: seg.startTime,
                            duration: seg.duration,
                            fileOffset: seg.fileOffset || 0,
                            buffer: audioBuffer
                        };
                    } catch (e) {
                        console.error(`[ShadowingPlayer] Failed to load segment ${index}:`, e);
                        return null;
                    }
                })
            );

            if (active) {
                const validSegments = loaded.filter((s): s is NonNullable<typeof s> => s !== null);
                segmentsRef.current = validSegments;
                setIsLoaded(true);
            }
        };

        loadAudio();
        return () => { active = false; };
    }, [mediaId, segments.length]); // Monitor segments.length to detect new recordings

    // Handle Playback
    const stopAll = useCallback(() => {
        activeNodesRef.current.forEach(node => {
            try {
                node.stop();
                node.disconnect();
            } catch (e) {
                // Ignore errors if already stopped
            }
        });
        activeNodesRef.current = [];
    }, []);

    const playAt = useCallback(async (time: number) => {
        if (!audioContextRef.current || !gainNodeRef.current || !isLoaded) {
            return;
        }

        // Ensure context is running (browsers suspend it by default)
        if (audioContextRef.current.state === "suspended") {
            try {
                await audioContextRef.current.resume();
            } catch (err) {
                console.error("[ShadowingPlayer] Failed to resume AudioContext:", err);
                return;
            }
        }

        stopAll();

        const ctx = audioContextRef.current;
        startTimeRef.current = time;
        contextStartTimeRef.current = ctx.currentTime;

        segmentsRef.current.forEach((seg) => {
            const playDuration = seg.duration || seg.buffer.duration;
            const segEnd = seg.start + playDuration;

            if (segEnd < time) {
                return;
            }

            const source = ctx.createBufferSource();
            source.buffer = seg.buffer;
            source.playbackRate.value = playbackRate;

            source.connect(gainNodeRef.current!);

            const fileOffset = seg.fileOffset || 0;

            if (seg.start >= time) {
                const delay = (seg.start - time) / playbackRate;
                source.start(ctx.currentTime + delay, fileOffset, playDuration);
            } else {
                const seekInSegment = (time - seg.start);
                const bufferOffset = fileOffset + seekInSegment;
                const timeRemaining = playDuration - seekInSegment;

                if (timeRemaining > 0) {
                    source.start(ctx.currentTime, bufferOffset, timeRemaining);
                }
            }

            activeNodesRef.current.push(source);

            source.onended = () => {
                const nodeIndex = activeNodesRef.current.indexOf(source);
                if (nodeIndex > -1) {
                    activeNodesRef.current.splice(nodeIndex, 1);
                }
            };
        });
    }, [isLoaded, playbackRate, stopAll]);

    // Respond to Play/Pause/Seek
    useEffect(() => {
        if (isPlaying) {
            playAt(currentTime);
        } else {
            stopAll();
        }
    }, [isPlaying, playAt, stopAll]); // currentTime dependency removed to avoid restart on every tick

    // Handle Seeking (when currentTime changes significantly while playing)
    // This is tricky because currentTime updates constantly during playback.
    // We need to differentiate a "seek" from a "tick".
    // The store's currentTime is updated via requestAnimationFrame loop in the player?
    // Usually, a manual seek calls setCurrentTime which might trigger a significant jump.

    // Actually, we can just rely on `isPlaying` toggle for play/pause.
    // For Seeking: the user usually pauses -> seeks -> plays.
    // If they seek while playing, the player component usually pauses briefly?
    // If not, we might drift.

    // Ideally we listen to a specific "seek" event or compare last time.
    // But usePlayerStore doesn't expose an event stream easily.
    // Let's rely on the fact that if 'isPlaying' is true, and 'currentTime' jumps, we might need to re-sync?
    // But re-syncing on every 0.1s update is bad.
    // Let's assume audio stays synced because we scheduled it based on rate.
    // We only re-schedule if we detect a drift or explicit seek?

    // Use a ref to track the expected time.
    // If (currentTime - expectedTime) > threshold, it's a seek.

    const lastTimeRef = useRef(currentTime);
    useEffect(() => {
        if (!isPlaying) {
            lastTimeRef.current = currentTime;
            return;
        }

        const diff = Math.abs(currentTime - lastTimeRef.current);
        // If we moved more than 1 second unexpectedly (assuming update interval is small), it's a seek
        if (diff > 1.5) {
            playAt(currentTime);
        }
        lastTimeRef.current = currentTime;
    }, [currentTime, isPlaying, playAt]);


    // Update Volume / Mute - combine master volume with track volume
    useEffect(() => {
        if (gainNodeRef.current) {
            const finalGain = (masterMuted || muted) ? 0 : (masterVolume * volume);
            gainNodeRef.current.gain.value = finalGain;
        }
    }, [volume, muted, masterVolume, masterMuted]);

    // Update Playback Rate 
    // Update active nodes if rate changes live
    useEffect(() => {
        if (audioContextRef.current) {
            activeNodesRef.current.forEach(node => {
                try {
                    node.playbackRate.setValueAtTime(playbackRate, audioContextRef.current!.currentTime);
                } catch (e) { }
            });

            // Note: Changing rate live might shift relative scheduling if we had future scheduled starts.
            // It's complex to adjust on the fly precisely without restart.
            // For now, simpler to restart if playing.
            if (isPlaying) {
                playAt(currentTime);
            }
        }
    }, [playbackRate]);
};
