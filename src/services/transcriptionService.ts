/**
 * Unified Transcription Service
 *
 * Supports multiple transcription providers:
 * - OpenAI Whisper (whisper-1)
 * - Groq Whisper (whisper-large-v3-turbo) — OpenAI-compatible API
 * - Google Gemini (generateContent with audio)
 */

import OpenAI from "openai";
import { TranscriptionProvider, TRANSCRIPTION_PROVIDERS } from "../types/aiService";

// --- Types ---

export interface TranscriptionSegment {
    id: number;
    text: string;
    start: number;
    end: number;
    confidence: number;
}

export interface TranscriptionResult {
    segments: TranscriptionSegment[];
    fullText: string;
    language?: string;
    duration?: number;
    provider: TranscriptionProvider;
}

export interface TranscriptionConfig {
    provider: TranscriptionProvider;
    apiKey: string;
    language?: string; // e.g., "en", "ja"
}

// Raw Whisper response types (shared by OpenAI and Groq)
interface WhisperSegment {
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
}

interface WhisperVerboseResponse {
    task: string;
    language: string;
    duration: number;
    text: string;
    segments: WhisperSegment[];
    words?: Array<{ word: string; start: number; end: number }>;
}

// --- Service ---

class TranscriptionService {
    private static instance: TranscriptionService;

    public static getInstance(): TranscriptionService {
        if (!TranscriptionService.instance) {
            TranscriptionService.instance = new TranscriptionService();
        }
        return TranscriptionService.instance;
    }

    /**
     * Main entry point — transcribe audio using the configured provider.
     */
    public async transcribe(
        config: TranscriptionConfig,
        audioBlob: Blob
    ): Promise<TranscriptionResult> {
        if (!config.apiKey) {
            throw new Error(`API key is required for ${config.provider} transcription`);
        }

        switch (config.provider) {
            case "openai":
                return this.transcribeWithOpenAI(config, audioBlob);
            case "groq":
                return this.transcribeWithGroq(config, audioBlob);
            case "gemini":
                return this.transcribeWithGemini(config, audioBlob);
            default:
                throw new Error(`Unsupported transcription provider: ${config.provider}`);
        }
    }

    /**
     * Get the provider info for display purposes
     */
    public getProviderInfo(provider: TranscriptionProvider) {
        return TRANSCRIPTION_PROVIDERS[provider];
    }

    /**
     * Get the API key for a transcription provider from localStorage
     */
    public getApiKeyForProvider(provider: TranscriptionProvider): string {
        switch (provider) {
            case "openai":
                return localStorage.getItem("openai_api_key") || "";
            case "groq":
                return localStorage.getItem("groq_api_key") || "";
            case "gemini":
                return localStorage.getItem("gemini_api_key") || "";
            default:
                return "";
        }
    }

    /**
     * Get the currently preferred transcription provider from localStorage
     */
    public getPreferredProvider(): TranscriptionProvider {
        const saved = localStorage.getItem("preferred_transcription_provider");
        if (saved && (saved === "openai" || saved === "groq" || saved === "gemini")) {
            return saved as TranscriptionProvider;
        }
        return "openai";
    }

    // ─── OpenAI Whisper ────────────────────────────────────────────

    private async transcribeWithOpenAI(
        config: TranscriptionConfig,
        audioBlob: Blob
    ): Promise<TranscriptionResult> {
        const openai = new OpenAI({
            apiKey: config.apiKey,
            dangerouslyAllowBrowser: true,
        });

        const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" });

        let response;
        try {
            // Try with advanced parameters — word + segment timestamps
            response = await openai.audio.transcriptions.create({
                file: audioFile,
                model: "whisper-1",
                response_format: "verbose_json",
                timestamp_granularities: ["word", "segment"],
                prompt:
                    "Please transcribe this audio with proper sentence breaks and punctuation. Break long sentences into shorter, more natural segments.",
                temperature: 0.0,
            });
        } catch {
            // Fallback to basic parameters
            response = await openai.audio.transcriptions.create({
                file: audioFile,
                model: "whisper-1",
                response_format: "verbose_json",
                temperature: 0.0,
            });
        }

        const whisperResponse = response as unknown as WhisperVerboseResponse;
        return this.parseWhisperResponse(whisperResponse, "openai");
    }

    // ─── Groq Whisper ──────────────────────────────────────────────

    private async transcribeWithGroq(
        config: TranscriptionConfig,
        audioBlob: Blob
    ): Promise<TranscriptionResult> {
        const formData = new FormData();
        formData.append("file", new File([audioBlob], "audio.wav", { type: "audio/wav" }));
        formData.append("model", TRANSCRIPTION_PROVIDERS.groq.model);
        formData.append("response_format", "verbose_json");
        formData.append("temperature", "0");
        formData.append("timestamp_granularities[]", "word");
        formData.append("timestamp_granularities[]", "segment");
        if (config.language) {
            formData.append("language", config.language);
        }

        const response = await fetch(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                },
                body: formData,
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Groq API error: ${response.status} - ${errorText}`);
        }

        const whisperResponse: WhisperVerboseResponse = await response.json();
        return this.parseWhisperResponse(whisperResponse, "groq");
    }

    // ─── Google Gemini ─────────────────────────────────────────────

    private async transcribeWithGemini(
        config: TranscriptionConfig,
        audioBlob: Blob
    ): Promise<TranscriptionResult> {
        // Convert audio to base64
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Audio = btoa(binary);

        const mimeType = audioBlob.type || "audio/wav";
        const model = TRANSCRIPTION_PROVIDERS.gemini.model;

        const languageInstruction = config.language
            ? `Transcribe in ${config.language} language.`
            : "Detect the language automatically.";

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Audio,
                            },
                        },
                        {
                            text: `Transcribe this audio with precise timestamps. ${languageInstruction}

Instructions:
1. Listen to the ENTIRE audio from start to finish
2. For EACH phrase or short sentence, note the EXACT second (with decimals) when the speaker starts and stops speaking
3. Timestamps are in SECONDS (not MM:SS). For example, 1 minute 30 seconds = 90.0, NOT 1:30
4. Be precise to at least one decimal place (e.g., 3.2, not 3)
5. Each segment should contain one short sentence or natural phrase (roughly 5-15 words)
6. The "end" of one segment must equal the "start" of the next segment — no gaps allowed
7. The first segment must start at 0.0 or when speech first begins
8. Include ALL spoken content — do not skip any words

IMPORTANT: All timestamps must be in total seconds as decimal numbers. 
Example: 2 minutes and 15.5 seconds = 135.5 (NOT 2:15.5, NOT 135, NOT "2m15s")`,
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.0,
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        text: {
                            type: "string",
                            description: "The full transcript text"
                        },
                        language: {
                            type: "string",
                            description: "Detected language code (e.g., en, ja, es, ko)"
                        },
                        segments: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    start: {
                                        type: "number",
                                        description: "Start time in seconds when this segment begins being spoken"
                                    },
                                    end: {
                                        type: "number",
                                        description: "End time in seconds when this segment finishes being spoken"
                                    },
                                    text: {
                                        type: "string",
                                        description: "The transcribed text for this segment"
                                    }
                                },
                                required: ["start", "end", "text"]
                            },
                            description: "Array of timed transcript segments"
                        }
                    },
                    required: ["text", "language", "segments"]
                },
            } as any,
        };

        const apiKey = config.apiKey;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        return this.parseGeminiResponse(content);
    }

    // ─── Response Parsers ──────────────────────────────────────────

    private parseWhisperResponse(
        response: WhisperVerboseResponse,
        provider: TranscriptionProvider
    ): TranscriptionResult {
        if (!response.segments || response.segments.length === 0) {
            // Fallback: single segment with full text
            return {
                segments: [
                    {
                        id: 0,
                        text: response.text,
                        start: 0,
                        end: response.duration || 0,
                        confidence: 0.9,
                    },
                ],
                fullText: response.text,
                language: response.language,
                duration: response.duration,
                provider,
            };
        }

        const segments: TranscriptionSegment[] = response.segments.map(
            (seg, index) => ({
                id: index,
                text: seg.text.trim(),
                start: seg.start,
                end: seg.end,
                confidence: Math.exp(seg.avg_logprob),
            })
        );

        return {
            segments,
            fullText: response.text,
            language: response.language,
            duration: response.duration,
            provider,
        };
    }

    private parseGeminiResponse(content: string): TranscriptionResult {
        // Try to extract JSON from the response (handle possible markdown wrapping)
        let jsonStr = content.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        try {
            const parsed = JSON.parse(jsonStr);

            let segments: TranscriptionSegment[] = (parsed.segments || []).map(
                (seg: { start: number; end: number; text: string }, index: number) => ({
                    id: index,
                    text: seg.text.trim(),
                    start: typeof seg.start === "number" && !isNaN(seg.start) ? Math.max(0, seg.start) : 0,
                    end: typeof seg.end === "number" && !isNaN(seg.end) ? Math.max(0, seg.end) : 0,
                    confidence: 0.85,
                })
            );

            // Sort segments by start time (Gemini occasionally returns out-of-order)
            segments.sort((a, b) => a.start - b.start);

            // Detect and fix the known Gemini "100-second minute" bug:
            // Some models output 100 where they mean 60, e.g., 130.0 instead of 90.0
            // Heuristic: if the last segment ends at > 1.5x the expected duration relative
            // to the number of segments and typical speech pace, timestamps may be scaled
            if (segments.length > 2) {
                const lastEnd = segments[segments.length - 1].end;
                const firstStart = segments[0].start;
                const totalDuration = lastEnd - firstStart;

                // Check for the pattern: gaps that are suspiciously large multiples
                // If the average segment is > 30 seconds, something is likely wrong
                const avgSegDuration = totalDuration / segments.length;

                if (avgSegDuration > 30 && segments.length > 3) {
                    // Likely a scaling issue — compress timestamps
                    // Estimate: typical speech has ~5-10 seconds per segment
                    const targetAvg = 7; // seconds per segment
                    const scale = targetAvg / avgSegDuration;

                    console.warn(`Gemini timestamp scaling detected: avg segment ${avgSegDuration.toFixed(1)}s, applying scale ${scale.toFixed(2)}`);

                    segments = segments.map((seg, i) => ({
                        ...seg,
                        id: i,
                        start: (seg.start - firstStart) * scale + firstStart,
                        end: (seg.end - firstStart) * scale + firstStart,
                    }));
                }
            }

            // Ensure each segment has a valid duration (end > start)
            segments = segments.map((seg) => {
                if (seg.end <= seg.start) {
                    // Give it a minimum duration based on text length (~150ms per word)
                    const wordCount = seg.text.split(/\s+/).length;
                    const estimatedDuration = Math.max(0.5, wordCount * 0.15);
                    return { ...seg, end: seg.start + estimatedDuration };
                }
                return seg;
            });

            // Re-assign IDs after all transforms
            segments = segments.map((seg, index) => ({ ...seg, id: index }));

            return {
                segments,
                fullText: parsed.text || segments.map((s) => s.text).join(" "),
                language: parsed.language,
                duration:
                    segments.length > 0 ? segments[segments.length - 1].end : undefined,
                provider: "gemini",
            };
        } catch {
            // If JSON parsing fails, treat the entire response as plain text
            console.warn("Gemini transcription: failed to parse structured response, using plain text");
            return {
                segments: [
                    {
                        id: 0,
                        text: content,
                        start: 0,
                        end: 0,
                        confidence: 0.7,
                    },
                ],
                fullText: content,
                provider: "gemini",
            };
        }
    }
}

// Export singleton
export const transcriptionService = TranscriptionService.getInstance();
