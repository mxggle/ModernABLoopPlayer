import { CachedWaveformData } from "./mediaStorage";

const DETAILED_FILE_LIMIT = 20 * 1024 * 1024;
const ADAPTIVE_FILE_LIMIT = 80 * 1024 * 1024;

type WaveformAnalysisProgress = {
  progress: number;
  status: NonNullable<CachedWaveformData["status"]>;
};

export const buildWaveformMediaKey = (media: {
  storageId?: string;
  id?: string;
  name?: string;
  size?: number;
  type?: string;
}) =>
  media.storageId ||
  media.id ||
  `${media.name || "unknown"}:${media.size || 0}:${media.type || "unknown"}`;

export const shouldUseDetailedWaveform = (file: {
  type: string;
  size: number;
}) => file.type.includes("audio") && file.size <= DETAILED_FILE_LIMIT;

export const shouldUseAdaptiveWaveform = (file: {
  type: string;
  size: number;
}) => file.type.includes("audio") && file.size <= ADAPTIVE_FILE_LIMIT;

export const shouldUseProgressiveWaveform = (file: {
  type: string;
  size: number;
}) =>
  file.type.includes("audio") &&
  file.size > DETAILED_FILE_LIMIT &&
  file.size <= ADAPTIVE_FILE_LIMIT;

export const createPlaceholderWaveform = (
  duration = 0,
  resolution = 512
): CachedWaveformData => {
  const peaks = Array.from({ length: resolution }, (_, index) => {
    const x = index / Math.max(1, resolution - 1);
    const envelope = 0.2 + 0.8 * Math.sin(x * Math.PI);
    return Math.max(0.06, Math.abs(Math.sin(x * 18) * Math.cos(x * 3.5)) * 0.45 * envelope);
  });

  return {
    peaks,
    resolution,
    duration,
    strategy: "placeholder",
    status: "placeholder",
    progress: 0,
    updatedAt: Date.now(),
  };
};

const downsampleChannelData = (
  channelData: Float32Array,
  targetLength: number
) => {
  const safeTargetLength = Math.max(1, targetLength);
  const result = new Float32Array(safeTargetLength);
  const windowSize = Math.max(1, Math.floor(channelData.length / safeTargetLength));

  for (let index = 0; index < safeTargetLength; index++) {
    const start = index * windowSize;
    const end = Math.min(channelData.length, start + windowSize);
    let peak = 0;

    for (let cursor = start; cursor < end; cursor++) {
      const sample = Math.abs(channelData[cursor]);
      if (sample > peak) {
        peak = sample;
      }
    }

    result[index] = peak;
  }

  return result;
};

export const analyzeAudioFileWaveform = async (
  file: File,
  onProgress?: (update: WaveformAnalysisProgress) => void
): Promise<CachedWaveformData> => {
  const AudioContextClass =
    window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return createPlaceholderWaveform(0);
  }

  const audioContext = new AudioContextClass();
  const reportProgress = (
    progress: number,
    status: WaveformAnalysisProgress["status"]
  ) => {
    onProgress?.({
      progress: Math.max(0, Math.min(100, Math.round(progress))),
      status,
    });
  };

  try {
    reportProgress(10, "analyzing");
    const buffer = await file.arrayBuffer();
    reportProgress(55, "analyzing");
    const decoded = await audioContext.decodeAudioData(buffer.slice(0));
    const resolution = shouldUseDetailedWaveform(file) ? 2000 : 1000;
    reportProgress(85, "analyzing");
    const peaks = downsampleChannelData(decoded.getChannelData(0), resolution);
    reportProgress(100, "ready");

    return {
      peaks: Array.from(peaks),
      resolution,
      duration: decoded.duration,
      strategy: shouldUseDetailedWaveform(file) ? "detailed" : "adaptive",
      status: "ready",
      progress: 100,
      updatedAt: Date.now(),
    };
  } finally {
    await audioContext.close();
  }
};
