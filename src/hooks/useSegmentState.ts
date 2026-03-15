import { useEffect, useState } from "react";
import { usePlayerStore } from "../stores/playerStore";
import type { TranscriptSegment } from "../stores/playerStore";

const BUFFER = 0.15;

interface SegmentState {
  isActive: boolean;
  isPlaying: boolean;
  isCurrentlyLooping: boolean;
}

function computeSegmentState(segment: TranscriptSegment): SegmentState {
  const { currentTime, isLooping, loopStart, loopEnd, isPlaying } =
    usePlayerStore.getState();
  const expectedLoopStart = Math.max(0, segment.startTime - BUFFER);
  const isCurrentlyLooping =
    isLooping &&
    loopStart !== null &&
    loopEnd !== null &&
    Math.abs(loopStart - expectedLoopStart) < 0.1 &&
    Math.abs(loopEnd - segment.endTime) < 0.1;
  const isActive = isCurrentlyLooping
    ? currentTime >= expectedLoopStart && currentTime <= segment.endTime
    : !isLooping &&
      currentTime >= segment.startTime &&
      currentTime <= segment.endTime;
  return { isActive, isPlaying, isCurrentlyLooping };
}

/**
 * Subscribes to the player store externally (not as a React hook dependency)
 * and only triggers a re-render when isActive, isPlaying, or isCurrentlyLooping
 * actually changes. This prevents the per-tick re-render storm that occurs when
 * currentTime updates ~20 times/second.
 */
export function useSegmentState(segment: TranscriptSegment): SegmentState {
  const [state, setState] = useState<SegmentState>(() =>
    computeSegmentState(segment)
  );

  useEffect(() => {
    // deps are the primitive values that affect computation; segment reference is irrelevant
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const unsub = usePlayerStore.subscribe(() => {
      const next = computeSegmentState(segment);
      setState((prev) => {
        if (
          prev.isActive === next.isActive &&
          prev.isPlaying === next.isPlaying &&
          prev.isCurrentlyLooping === next.isCurrentlyLooping
        ) {
          return prev;
        }
        return next;
      });
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment.startTime, segment.endTime]);

  return state;
}
