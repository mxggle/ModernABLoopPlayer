/**
 * Universal Audio Recorder
 * Supports both MediaRecorder API and Web Audio API fallback for iOS Safari
 */

export interface AudioRecorderConfig {
    sampleRate?: number;
    channelCount?: number;
    onDataAvailable?: (blob: Blob) => void;
    onStop?: (blob: Blob) => void;
    onError?: (error: Error) => void;
    onPeakUpdate?: (peak: number) => void;
}

export class UniversalAudioRecorder {
    private stream: MediaStream | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private audioContext: AudioContext | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private analyser: AnalyserNode | null = null;
    private recordedChunks: Float32Array[] = [];
    private config: AudioRecorderConfig;
    private isRecording = false;
    private useWebAudioFallback = false;
    private peakUpdateInterval: number | null = null;

    constructor(stream: MediaStream, config: AudioRecorderConfig = {}) {
        this.stream = stream;
        this.config = {
            sampleRate: config.sampleRate || 48000,
            channelCount: config.channelCount || 1,
            ...config,
        };

        // Detect if we need to use Web Audio API fallback
        this.useWebAudioFallback = typeof MediaRecorder === 'undefined';
    }

    async start(): Promise<void> {
        if (!this.stream) {
            throw new Error('No audio stream available');
        }

        this.isRecording = true;

        if (this.useWebAudioFallback) {
            console.log('🎤 [AudioRecorder] Using Web Audio API fallback for iOS Safari');
            await this.startWebAudioRecording();
        } else {
            console.log('🎤 [AudioRecorder] Using MediaRecorder API');
            this.startMediaRecorderRecording();
        }
    }

    private startMediaRecorderRecording(): void {
        if (!this.stream) return;

        try {
            // Create audio context for peak analysis
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.audioContext = new AudioContextClass();
            this.source = this.audioContext.createMediaStreamSource(this.stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.source.connect(this.analyser);

            // Start peak monitoring
            this.startPeakMonitoring();

            // Create MediaRecorder
            const chunks: Blob[] = [];

            // Try different MIME types for better compatibility
            let mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported('audio/webm')) {
                if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                    mimeType = 'audio/ogg';
                }
            }

            this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                    this.config.onDataAvailable?.(e.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                this.config.onStop?.(blob);
                this.cleanup();
            };

            this.mediaRecorder.onerror = (e: Event) => {
                console.error('MediaRecorder error:', e);
                this.config.onError?.(new Error('MediaRecorder error'));
            };

            this.mediaRecorder.start(100); // Collect data every 100ms
        } catch (error) {
            console.error('Failed to start MediaRecorder:', error);
            this.config.onError?.(error as Error);
        }
    }

    private async startWebAudioRecording(): Promise<void> {
        if (!this.stream) return;

        try {
            // Create audio context
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.audioContext = new AudioContextClass({
                sampleRate: this.config.sampleRate,
            });

            // Create source from stream
            this.source = this.audioContext.createMediaStreamSource(this.stream);

            // Create analyser for peak detection
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.source.connect(this.analyser);

            // Create script processor for recording
            const bufferSize = 4096;
            this.scriptProcessor = this.audioContext.createScriptProcessor(
                bufferSize,
                this.config.channelCount!,
                this.config.channelCount!
            );

            this.recordedChunks = [];

            this.scriptProcessor.onaudioprocess = (e) => {
                if (!this.isRecording) return;

                // Get audio data from first channel
                const inputData = e.inputBuffer.getChannelData(0);

                // Store a copy of the data
                const chunk = new Float32Array(inputData.length);
                chunk.set(inputData);
                this.recordedChunks.push(chunk);
            };

            // Connect the nodes
            this.source.connect(this.scriptProcessor);
            this.scriptProcessor.connect(this.audioContext.destination);

            // Start peak monitoring
            this.startPeakMonitoring();

            console.log('✅ [AudioRecorder] Web Audio recording started');
        } catch (error) {
            console.error('Failed to start Web Audio recording:', error);
            this.config.onError?.(error as Error);
        }
    }

    private startPeakMonitoring(): void {
        if (!this.analyser) return;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        const updatePeak = () => {
            if (!this.isRecording || !this.analyser) {
                if (this.peakUpdateInterval !== null) {
                    clearInterval(this.peakUpdateInterval);
                    this.peakUpdateInterval = null;
                }
                return;
            }

            this.analyser.getByteTimeDomainData(dataArray);

            // Calculate RMS
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const amplitude = (dataArray[i] - 128) / 128;
                sum += amplitude * amplitude;
            }
            const rms = Math.sqrt(sum / dataArray.length);

            this.config.onPeakUpdate?.(rms);
        };

        this.peakUpdateInterval = window.setInterval(updatePeak, 50);
    }

    stop(): void {
        this.isRecording = false;

        if (this.peakUpdateInterval !== null) {
            clearInterval(this.peakUpdateInterval);
            this.peakUpdateInterval = null;
        }

        if (this.useWebAudioFallback) {
            this.stopWebAudioRecording();
        } else {
            this.stopMediaRecorderRecording();
        }
    }

    private stopMediaRecorderRecording(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }

    private stopWebAudioRecording(): void {
        // Stop the script processor
        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor = null;
        }

        // Convert recorded chunks to WAV blob
        if (this.recordedChunks.length > 0) {
            const blob = this.exportToWav(this.recordedChunks);
            this.config.onStop?.(blob);
        }

        this.cleanup();
    }

    private exportToWav(chunks: Float32Array[]): Blob {
        // Calculate total length
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);

        // Merge all chunks
        const merged = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.length;
        }

        // Convert to WAV format
        const sampleRate = this.audioContext?.sampleRate || this.config.sampleRate || 48000;
        const wavBuffer = this.encodeWav(merged, sampleRate);

        return new Blob([wavBuffer], { type: 'audio/wav' });
    }

    private encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        // Write WAV header
        const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true); // PCM chunk size
        view.setUint16(20, 1, true); // PCM format
        view.setUint16(22, 1, true); // Mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true); // Byte rate
        view.setUint16(32, 2, true); // Block align
        view.setUint16(34, 16, true); // Bits per sample
        writeString(36, 'data');
        view.setUint32(40, samples.length * 2, true);

        // Write audio data
        let offset = 44;
        for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }

        return buffer;
    }

    private cleanup(): void {
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }

        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }

        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.recordedChunks = [];
    }

    getState(): 'inactive' | 'recording' | 'paused' {
        if (this.useWebAudioFallback) {
            return this.isRecording ? 'recording' : 'inactive';
        }
        return this.mediaRecorder?.state || 'inactive';
    }
}
