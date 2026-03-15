import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";
import { Loader, X } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  AIProvider,
  AIServiceConfig,
  DEFAULT_MODELS,
  normalizeModelId,
} from "../../types/aiService";
import { aiService } from "../../services/aiService";
import {
  ExplanationResult,
  globalExplanationListeners,
  explanationCache,
  setGlobalExplanationState,
  getGlobalExplanationState,
} from "./explanationState";

interface ExplanationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
}

export const ExplanationDrawer: React.FC<ExplanationDrawerProps> = ({
  isOpen,
  onClose,
  text,
}) => {
  const { t } = useTranslation();
  const [explanation, setExplanation] = useState<ExplanationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("openai");
  const [selectedModel, setSelectedModel] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("English");

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Subscribe to global explanation state
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateLocalState = () => {
      const globalState = getGlobalExplanationState(text);
      if (globalState.status === "completed" && globalState.result) {
        setExplanation(globalState.result);
        setError(null);
        setIsLoading(false);
      } else if (globalState.status === "error") {
        setError(globalState.error || "Unknown error");
        setExplanation(null);
        setIsLoading(false);
      } else if (globalState.status === "loading") {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoading(false);
        setError(null);
      }
    };

    globalExplanationListeners.add(updateLocalState);
    updateLocalState();
    return () => { globalExplanationListeners.delete(updateLocalState); };
  }, [text]);

  // Load settings
  useEffect(() => {
    const loadSettings = () => {
      const savedProvider = (localStorage.getItem("preferred_ai_provider") as AIProvider) || "openai";
      const savedLanguage = localStorage.getItem("target_language") || "English";
      const savedModel = normalizeModelId(
        savedProvider,
        localStorage.getItem(`${savedProvider}_model`) || DEFAULT_MODELS[savedProvider]
      );
      localStorage.setItem(`${savedProvider}_model`, savedModel);
      setSelectedProvider(savedProvider);
      setTargetLanguage(savedLanguage);
      setSelectedModel(savedModel);
    };
    loadSettings();
    window.addEventListener("aiSettingsUpdated", loadSettings);
    return () => window.removeEventListener("aiSettingsUpdated", loadSettings);
  }, []);

  useEffect(() => {
    const savedModel = normalizeModelId(
      selectedProvider,
      localStorage.getItem(`${selectedProvider}_model`) || DEFAULT_MODELS[selectedProvider]
    );
    localStorage.setItem(`${selectedProvider}_model`, savedModel);
    setSelectedModel(savedModel);
  }, [selectedProvider]);

  // Check cache
  useEffect(() => {
    if (text) {
      const cached = explanationCache.get(text);
      if (cached) { setExplanation(cached); setError(null); }
    }
  }, [text]);

  const getApiKey = useCallback((provider: AIProvider) =>
    localStorage.getItem(`${provider}_api_key`) || "", []);

  const hasValidApiKey = useCallback((provider: AIProvider) =>
    aiService.validateApiKey(provider, getApiKey(provider)), [getApiKey]);

  const generateExplanation = useCallback(async () => {
    if (!text.trim()) { toast.error(t("explanation.noTextSelected")); return; }
    if (!hasValidApiKey(selectedProvider)) {
      toast.error(t("explanation.configureApiKey", { provider: selectedProvider.toUpperCase() }));
      return;
    }

    setIsLoading(true);
    setError(null);
    setExplanation(null);
    setGlobalExplanationState(text, { status: "loading" });

    try {
      const config: AIServiceConfig = {
        provider: selectedProvider,
        model: selectedModel,
        apiKey: getApiKey(selectedProvider),
        temperature: parseFloat(localStorage.getItem("ai_temperature") || "0.7"),
        maxTokens: parseInt(localStorage.getItem("ai_max_tokens") || "2000"),
        systemPrompt: `You are a language tutor. Reply in ${targetLanguage}. Be brief and direct — no intros, no summaries.`,
      };

      const prompt = `Explain this sentence for a language learner:\n"${text}"\n\nUse these section icons (no other section titles):\n💬 — overall meaning in 1 sentence\n📖 — bullet each unfamiliar word/phrase as \`word\` — meaning (part of speech, usage note if needed)\n🔤 — only non-obvious grammar patterns, 1 line each (omit if none)\n\nAll explanations in ${targetLanguage}. Skip obvious things. Be concise.`;
      const response = await aiService.generateResponse(config, prompt);

      const result: ExplanationResult = {
        explanation: response.content,
        usage: response.usage,
        model: response.model,
        provider: response.provider,
      };

      explanationCache.set(text, result);
      setExplanation(result);
      setGlobalExplanationState(text, { status: "completed", result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("explanation.unknownError");
      setError(msg);
      setGlobalExplanationState(text, { status: "error", error: msg });
      toast.error(t("explanation.generationFailed", { message: msg }));
    } finally {
      setIsLoading(false);
    }
  }, [text, selectedProvider, selectedModel, targetLanguage, getApiKey, hasValidApiKey, t]);

  // Auto-generate when opened
  useEffect(() => {
    if (isOpen && text && !explanation && !isLoading && !error) {
      generateExplanation();
    }
  }, [isOpen, text, explanation, isLoading, error, generateExplanation]);

  if (!isOpen) return null;

  return (
    <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t("explanation.title")}
        </span>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="px-3 py-3">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader size={14} className="animate-spin shrink-0" />
            <span>{t("explanation.generating")}</span>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {explanation && (
          <div>
            <div className="prose prose-sm dark:prose-invert max-w-none [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-blue-700 dark:[&_h1]:text-blue-400 [&_h1]:mb-1 [&_h1]:mt-3 [&_h1]:border-0 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-blue-700 dark:[&_h2]:text-blue-400 [&_h2]:mb-1 [&_h2]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-700 dark:[&_h3]:text-gray-300 [&_h3]:mb-1 [&_h3]:mt-2 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-gray-600 dark:[&_h4]:text-gray-400 [&_h4]:mb-1 [&_p]:text-sm [&_p]:mb-2 [&_li]:text-sm">
              <MarkdownRenderer content={explanation.explanation} />
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <span className="capitalize">{explanation.provider}</span>
              <span>·</span>
              <span>{explanation.model}</span>
              {explanation.usage && (
                <>
                  <span>·</span>
                  <span>{explanation.usage.totalTokens} tokens</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
