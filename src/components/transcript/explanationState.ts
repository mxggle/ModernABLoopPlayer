import type { AIProvider } from "../../types/aiService";

export interface ExplanationResult {
  explanation: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AIProvider;
}

export interface ExplanationState {
  text: string;
  status: "idle" | "loading" | "completed" | "error";
  result?: ExplanationResult;
  error?: string;
}

// Single source of truth shared between TranscriptSegment and ExplanationDrawer
export const globalExplanationStates = new Map<string, ExplanationState>();
// Keyed listeners: only notify subscribers for the specific text key that changed
const keyedListeners = new Map<string, Set<() => void>>();
export const explanationCache = new Map<string, ExplanationResult>();

/** @deprecated Use subscribeToExplanation for keyed subscriptions */
export const globalExplanationListeners = new Set<() => void>();

export const setGlobalExplanationState = (
  text: string,
  state: Partial<ExplanationState>
): void => {
  const existing = globalExplanationStates.get(text) || { text, status: "idle" };
  globalExplanationStates.set(text, { ...existing, ...state });
  // Only notify listeners subscribed to this specific text key
  keyedListeners.get(text)?.forEach((listener) => listener());
  // Also notify legacy global listeners (for backward compat)
  globalExplanationListeners.forEach((listener) => listener());
};

export const getGlobalExplanationState = (text: string): ExplanationState => {
  return globalExplanationStates.get(text) || { text, status: "idle" };
};

/** Subscribe to state changes for a specific text key. Returns an unsubscribe function. */
export const subscribeToExplanation = (text: string, listener: () => void): () => void => {
  if (!keyedListeners.has(text)) {
    keyedListeners.set(text, new Set());
  }
  keyedListeners.get(text)!.add(listener);
  return () => {
    keyedListeners.get(text)?.delete(listener);
    if (keyedListeners.get(text)?.size === 0) {
      keyedListeners.delete(text);
    }
  };
};
