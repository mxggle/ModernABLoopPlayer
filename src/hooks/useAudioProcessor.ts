import { useEffect, useRef } from "react";
import { AudioProcessor } from "../utils/audioProcessor";
import { usePlayerStore } from "../stores/playerStore";

export const useAudioProcessor = () => {
  const processor = useRef<AudioProcessor | null>(null);
  const {
    setCurrentTime,
    currentFile,
    isPlaying,
    playbackRate,
    loopStart,
    loopEnd,
  } = usePlayerStore();

  useEffect(() => {
    processor.current = new AudioProcessor();

    return () => {
      processor.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!processor.current || !currentFile) return;

    const loadFile = async () => {
      const response = await fetch(currentFile.url);
      const blob = await response.blob();
      const file = new File([blob], currentFile.name, {
        type: currentFile.type,
      });
      await processor.current?.loadFile(file);
    };

    loadFile();
  }, [currentFile]);

  useEffect(() => {
    if (!processor.current) return;

    processor.current.onTimeUpdate((time) => {
      setCurrentTime(time);
    });
  }, [setCurrentTime]);

  useEffect(() => {
    if (!processor.current) return;

    if (isPlaying) {
      processor.current.play();
    } else {
      processor.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!processor.current) return;
    processor.current.setPlaybackRate(playbackRate);
  }, [playbackRate]);

  useEffect(() => {
    if (!processor.current) return;
    processor.current.setLoopPoints(loopStart, loopEnd);
  }, [loopStart, loopEnd]);

  return processor.current;
};
