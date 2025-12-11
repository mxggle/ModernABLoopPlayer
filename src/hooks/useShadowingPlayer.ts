import { useEffect, useRef, useState, useCallback } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useShadowingStore } from "../stores/shadowingStore";
import { retrieveMediaFile } from "../utils/mediaStorage";

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
        getSegments,
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


    // Get segments - getSegments is already destructured above
    const segments = mediaId ? getSegments(mediaId) : [];

    // Initialize AudioContext
    useEffect(() => {
        if (!audioContextRef.current) {
            console.log("🎤 [ShadowingPlayer] Initializing AudioContext");
            const ctx = new AudioContextClass();
            const gain = ctx.createGain();
            gain.connect(ctx.destination);

            audioContextRef.current = ctx;
            gainNodeRef.current = gain;

            console.log("🎤 [ShadowingPlayer] AudioContext initialized:", {
                state: ctx.state,
                sampleRate: ctx.sampleRate,
                destination: ctx.destination
            });

            // Try to resume immediately (might fail if no user interaction yet)
            if (ctx.state === "suspended") {
                console.log("🎤 [ShadowingPlayer] AudioContext created in suspended state, will resume on first play");
            }
        }

        return () => {
            // Don't close context immediately on unmount/re-render to avoid performance hit
            // but strictly we should clean up if the component is truly unmounting.
            // For a persistent hook, we might keep it. 
            // Let's close it if mediaId changes or component unmounts.
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                console.log("🎤 [ShadowingPlayer] Closing AudioContext");
                audioContextRef.current.close().catch(console.error);
                audioContextRef.current = null;
            }
        };
    }, [mediaId]); // Re-init on media change

    // Load segments when media changes OR when segments are added/removed
    useEffect(() => {
        console.log("🎤 [ShadowingPlayer] Load segments effect triggered", { mediaId, hasContext: !!audioContextRef.current, segmentCount: segments.length });

        if (!mediaId || !audioContextRef.current) {
            console.log("🎤 [ShadowingPlayer] No mediaId or context, clearing segments");
            segmentsRef.current = [];
            setIsLoaded(false);
            return;
        }

        console.log("🎤 [ShadowingPlayer] Got segments for media:", { mediaId, segmentCount: segments.length, segments });

        if (segments.length === 0) {
            console.log("🎤 [ShadowingPlayer] No segments found, marking as loaded");
            segmentsRef.current = [];
            setIsLoaded(true);
            return;
        }

        let active = true;
        setIsLoaded(false);

        const loadAudio = async () => {
            console.log("🎤 [ShadowingPlayer] Starting to load audio for", segments.length, "segments");

            const loaded = await Promise.all(
                segments.map(async (seg, index) => {
                    try {
                        console.log(`🎤 [ShadowingPlayer] Loading segment ${index}:`, { storageId: seg.storageId, startTime: seg.startTime });

                        const file = await retrieveMediaFile(seg.storageId);
                        if (!file) {
                            console.warn(`🎤 [ShadowingPlayer] No file found for segment ${index}, storageId:`, seg.storageId);
                            return null;
                        }

                        console.log(`🎤 [ShadowingPlayer] Retrieved file for segment ${index}:`, { name: file.name, size: file.size, type: file.type });

                        const arrayBuffer = await file.arrayBuffer();
                        console.log(`🎤 [ShadowingPlayer] Got arrayBuffer for segment ${index}, size:`, arrayBuffer.byteLength);

                        // We need to decode audio data relative to a context
                        // If context is closed or null, we can't decode
                        if (!audioContextRef.current) {
                            console.error(`🎤 [ShadowingPlayer] AudioContext is null for segment ${index}`);
                            return null;
                        }

                        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                        console.log(`🎤 [ShadowingPlayer] Decoded audio for segment ${index}:`, {
                            duration: audioBuffer.duration,
                            channels: audioBuffer.numberOfChannels,
                            sampleRate: audioBuffer.sampleRate
                        });

                        return {
                            start: seg.startTime,
                            duration: seg.duration,
                            fileOffset: seg.fileOffset || 0,
                            buffer: audioBuffer
                        };
                    } catch (e) {
                        console.error(`🎤 [ShadowingPlayer] Failed to load shadowing segment ${index}:`, e);
                        return null;
                    }
                })
            );

            if (active) {
                const validSegments = loaded.filter((s): s is NonNullable<typeof s> => s !== null);
                console.log("🎤 [ShadowingPlayer] Loaded segments:", { total: segments.length, valid: validSegments.length });
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
        console.log("🎤 [ShadowingPlayer] playAt called:", { time, hasContext: !!audioContextRef.current, hasGain: !!gainNodeRef.current, isLoaded, segmentCount: segmentsRef.current.length });

        if (!audioContextRef.current || !gainNodeRef.current || !isLoaded) {
            console.warn("🎤 [ShadowingPlayer] Cannot play - missing requirements:", {
                hasContext: !!audioContextRef.current,
                hasGain: !!gainNodeRef.current,
                isLoaded
            });
            return;
        }

        // Ensure context is running (browsers suspend it by default)
        if (audioContextRef.current.state === "suspended") {
            console.log("🎤 [ShadowingPlayer] AudioContext is suspended, attempting to resume...");
            try {
                await audioContextRef.current.resume();
                console.log("🎤 [ShadowingPlayer] AudioContext resumed successfully, new state:", audioContextRef.current.state);
            } catch (err) {
                console.error("🎤 [ShadowingPlayer] Failed to resume AudioContext:", err);
                return;
            }
        }

        stopAll();

        const ctx = audioContextRef.current;
        startTimeRef.current = time;
        contextStartTimeRef.current = ctx.currentTime;

        console.log("🎤 [ShadowingPlayer] Starting playback:", {
            contextTime: ctx.currentTime,
            mediaTime: time,
            segmentCount: segmentsRef.current.length,
            contextState: ctx.state
        });

        segmentsRef.current.forEach((seg, index) => {
            // Use stored duration for playback logic, not just buffer duration. 
            // Fallback to buffer duration if not set (legacy support)
            const playDuration = seg.duration || seg.buffer.duration;
            const segEnd = seg.start + playDuration;

            // Check if segment is in the future relative to 'time', or currently overlapping
            // If segment finished before 'time', skip
            if (segEnd < time) {
                // console.log(`🎤 [ShadowingPlayer] Skipping segment ${index} (already finished)`);
                return;
            }


            const source = ctx.createBufferSource();
            source.buffer = seg.buffer;
            source.playbackRate.value = playbackRate;

            source.connect(gainNodeRef.current!);

            // Calculate start time in context time
            // time = where we want to start playing in media timeline
            // seg.start = where segment starts in media timeline

            const fileOffset = seg.fileOffset || 0;

            if (seg.start >= time) {
                // Segment starts in future
                const delay = (seg.start - time) / playbackRate;
                // Start playing from fileOffset, for playDuration
                source.start(ctx.currentTime + delay, fileOffset, playDuration);
            } else {
                // Segment is already playing, join in progress
                const seekInSegment = (time - seg.start); // How many seconds we are into the segment
                const bufferOffset = fileOffset + seekInSegment; // Where to read in the buffer
                const timeRemaining = playDuration - seekInSegment;

                if (timeRemaining > 0) {
                    // Start now, read from calculated buffer offset, play for remaining time
                    source.start(ctx.currentTime, bufferOffset, timeRemaining);
                }
            }

            activeNodesRef.current.push(source);

            source.onended = () => {
                console.log(`🎤 [ShadowingPlayer] Segment ${index} ended`);
                const nodeIndex = activeNodesRef.current.indexOf(source);
                if (nodeIndex > -1) {
                    activeNodesRef.current.splice(nodeIndex, 1);
                }
            };
        });

        console.log("🎤 [ShadowingPlayer] Scheduled", activeNodesRef.current.length, "audio sources");
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
            // Calculate final gain: master volume * track volume, or 0 if either is muted
            const finalGain = (masterMuted || muted) ? 0 : (masterVolume * volume);

            console.log("🎤 [ShadowingPlayer] Setting volume:", {
                masterVolume,
                masterMuted,
                trackVolume: volume,
                trackMuted: muted,
                finalGain,
                currentGain: gainNodeRef.current.gain.value
            });

            gainNodeRef.current.gain.value = finalGain;
        } else {
            console.warn("🎤 [ShadowingPlayer] No gain node available to set volume");
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
