import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Drawer } from "../ui/drawer";
import { ModelSelector } from "../ui/ModelSelector";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";
import {
  Loader,
  Brain,
  Globe,
  BookOpen,
  Settings,
  FileText,
  Zap,
  CheckCircle,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  AIProvider,
  AIServiceConfig,
  DEFAULT_MODELS,
} from "../../types/aiService";
import { aiService } from "../../services/aiService";

interface ExplanationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
}

interface ExplanationResult {
  explanation: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AIProvider;
}

// Global explanation state management (shared with TranscriptSegment)
interface ExplanationState {
  text: string;
  status: "idle" | "loading" | "completed" | "error";
  result?: ExplanationResult;
  error?: string;
}

// Simple global state management
const globalExplanationStates = new Map<string, ExplanationState>();
const globalExplanationListeners = new Set<() => void>();

const setGlobalExplanationState = (
  text: string,
  state: Partial<ExplanationState>
) => {
  const existing = globalExplanationStates.get(text) || {
    text,
    status: "idle",
  };
  globalExplanationStates.set(text, { ...existing, ...state });
  globalExplanationListeners.forEach((listener) => listener());
};

const getGlobalExplanationState = (text: string): ExplanationState => {
  return globalExplanationStates.get(text) || { text, status: "idle" };
};

// Simplified local cache for backward compatibility
const explanationCache = new Map<string, ExplanationResult>();

export const ExplanationDrawer: React.FC<ExplanationDrawerProps> = ({
  isOpen,
  onClose,
  text,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [explanation, setExplanation] = useState<ExplanationResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canCloseWhileLoading, setCanCloseWhileLoading] = useState(false);

  // Model selection state
  const [selectedProvider, setSelectedProvider] =
    useState<AIProvider>("openai");
  const [selectedModel, setSelectedModel] = useState("");

  // Settings state
  const [targetLanguage, setTargetLanguage] = useState("English");

  const handleClose = useCallback(() => {
    if (isLoading && canCloseWhileLoading) {
      toast(t("explanation.generatingInBackground"), {
        icon: "ℹ️",
        duration: 3000,
      });
    }
    onClose();
  }, [isLoading, canCloseWhileLoading, onClose, t]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
    }, [isOpen, handleClose]);

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
        setCanCloseWhileLoading(true);
      } else {
        setIsLoading(false);
        setError(null);
      }
    };

    globalExplanationListeners.add(updateLocalState);
    updateLocalState(); // Initial update

    return () => {
      globalExplanationListeners.delete(updateLocalState);
    };
  }, [text]);

  // Load settings and listen for updates
  useEffect(() => {
    const loadSettings = () => {
      const savedProvider =
        (localStorage.getItem("preferred_ai_provider") as AIProvider) ||
        "openai";
      const savedLanguage =
        localStorage.getItem("target_language") || "English";
      const savedModel =
        localStorage.getItem(`${savedProvider}_model`) ||
        DEFAULT_MODELS[savedProvider];

      setSelectedProvider(savedProvider);
      setTargetLanguage(savedLanguage);
      setSelectedModel(savedModel);
    };

    loadSettings();

    // Listen for settings updates
    const handleSettingsUpdate = () => {
      loadSettings();
    };

    window.addEventListener("aiSettingsUpdated", handleSettingsUpdate);
    return () =>
      window.removeEventListener("aiSettingsUpdated", handleSettingsUpdate);
  }, []);

  // Update selected model when provider changes
  useEffect(() => {
    const savedModel =
      localStorage.getItem(`${selectedProvider}_model`) ||
      DEFAULT_MODELS[selectedProvider];
    setSelectedModel(savedModel);
  }, [selectedProvider]);

  // Check for cached explanation when text changes
  useEffect(() => {
    if (text) {
      const cached = explanationCache.get(text);
      if (cached) {
        setExplanation(cached);
        setError(null);
      }
    }
  }, [text]);

  const getApiKey = useCallback((provider: AIProvider): string => {
    return localStorage.getItem(`${provider}_api_key`) || "";
  }, []);

  const hasValidApiKey = useCallback((provider: AIProvider): boolean => {
    const apiKey = getApiKey(provider);
    return aiService.validateApiKey(provider, apiKey);
  }, [getApiKey]);

    const generateExplanation = useCallback(async () => {
    if (!text.trim()) {
      toast.error(t("explanation.noTextSelected"));
      return;
    }

    const apiKey = getApiKey(selectedProvider);
    if (!hasValidApiKey(selectedProvider)) {
      toast.error(t("explanation.configureApiKey", { provider: selectedProvider.toUpperCase() }));
      return;
    }

    setIsLoading(true);
    setError(null);
    setExplanation(null);
    setCanCloseWhileLoading(true);

    // Update global state
    setGlobalExplanationState(text, { status: "loading" });

    try {
      const config: AIServiceConfig = {
        provider: selectedProvider,
        model: selectedModel,
        apiKey,
        temperature: parseFloat(
          localStorage.getItem("ai_temperature") || "0.7"
        ),
        maxTokens: parseInt(localStorage.getItem("ai_max_tokens") || "1000"),
        systemPrompt: `You are a helpful assistant that explains text clearly and concisely. 
        Provide explanations in ${targetLanguage}. 
        Focus on making complex concepts easy to understand.`,
      };

      const prompt = `Please explain the following text in detail, breaking down any complex concepts, terminology, or ideas:

"${text}"

Provide a clear, comprehensive explanation that would help someone understand this content better.`;

      const response = await aiService.generateResponse(config, prompt);

      const result: ExplanationResult = {
        explanation: response.content,
        usage: response.usage,
        model: response.model,
        provider: response.provider,
      };

      // Cache the result
      explanationCache.set(text, result);
      setExplanation(result);

      // Update global state
      setGlobalExplanationState(text, { status: "completed", result });

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{t("explanation.explanationReady")}</span>
        </div>,
        { duration: 2000 }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("explanation.unknownError");
      setError(errorMessage);

      // Update global state
      setGlobalExplanationState(text, {
        status: "error",
        error: errorMessage,
      });

      toast.error(t("explanation.generationFailed", { message: errorMessage }));
    } finally {
      setIsLoading(false);
      setCanCloseWhileLoading(false);
    }
    }, [text, selectedProvider, selectedModel, targetLanguage, getApiKey, hasValidApiKey, t]);

  // Auto-generate explanation when drawer opens
  useEffect(() => {
    if (isOpen && text && !explanation && !isLoading && !error) {
      generateExplanation();
    }
  }, [isOpen, text, explanation, isLoading, error, generateExplanation]);

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);
    // Clear current explanation when provider changes
    setExplanation(null);
    setError(null);
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    // Save the selected model for this provider
    localStorage.setItem(`${selectedProvider}_model`, modelId);
    // Clear current explanation when model changes
    setExplanation(null);
    setError(null);
  };

      
  const formatTokenUsage = (usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }) => {
    if (!usage) return null;
    return t("explanation.tokenUsage", { total: usage.totalTokens, prompt: usage.promptTokens, completion: usage.completionTokens });
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title={t("explanation.title")}
    >
      <div className="space-y-6 p-4">
        {/* Loading State with Close Option */}
        {isLoading && canCloseWhileLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader className="w-5 h-5 animate-spin text-blue-600" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">{t("explanation.generating")}</h4>
                  <p className="text-xs text-blue-600 mt-1">{t("explanation.canCloseDrawer")}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-blue-600 hover:text-blue-800 p-1"
                title={t("explanation.closeAndContinue")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Model Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2"><Brain className="w-5 h-5" />{t("explanation.aiModelSelection")}</h3>
            <button
              onClick={() => navigate("/ai-settings")}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Settings className="w-4 h-4" />
              {t("common.settings")}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("explanation.aiProvider")}</label>
              <select
                value={selectedProvider}
                onChange={(e) =>
                  handleProviderChange(e.target.value as AIProvider)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="openai">{t("explanation.providers.openai")}</option>
                <option value="gemini">{t("explanation.providers.gemini")}</option>
                <option value="grok">{t("explanation.providers.grok")}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("explanation.model")}</label>
              <ModelSelector
                selectedModel={selectedModel}
                onModelSelect={handleModelChange}
                provider={selectedProvider}
                placeholder={t("explanation.selectModel")}
                compact={true}
                showPricing={false}
                showCapabilities={false}
                disabled={isLoading}
              />
            </div>
          </div>

          {!hasValidApiKey(selectedProvider) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2 text-yellow-800">
                <Settings className="w-4 h-4" />
                <span className="text-sm">
                  {t("explanation.configureApiKeyInSettings", { provider: selectedProvider.toUpperCase() })} <button onClick={() => navigate("/ai-settings")} className="underline hover:no-underline">{t("common.settings")}</button>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Selected Text */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><FileText className="w-5 h-5" />{t("explanation.selectedText")}</h3>
          <div className="p-4 bg-gray-50 rounded-lg border">
            <p className="text-gray-700 whitespace-pre-wrap">{text}</p>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex gap-3">
          <button
            onClick={generateExplanation}
            disabled={isLoading || !hasValidApiKey(selectedProvider)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                {t("explanation.generating")}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                {t(explanation ? "explanation.regenerate" : "explanation.generate")} {t("explanation.explanation")}
              </>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Explanation Result */}
        {explanation && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5" />{t("explanation.explanation")}</h3>
              {explanation.usage && (
                <span className="text-xs text-gray-500">
                  {formatTokenUsage(explanation.usage)}
                </span>
              )}
            </div>
            <div className="p-4 bg-white border rounded-lg">
              <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    explanation.provider === "openai"
                      ? "bg-green-100 text-green-700"
                      : explanation.provider === "gemini"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {explanation.provider.toUpperCase()}
                </span>
                <span>{explanation.model}</span>
              </div>
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer content={explanation.explanation} />
              </div>
            </div>
          </div>
        )}

        {/* Language Settings */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Globe className="w-5 h-5" />{t("explanation.languageSettings")}</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("explanation.targetLanguage")}</label>
            <select
              value={targetLanguage}
              onChange={(e) => {
                setTargetLanguage(e.target.value);
                localStorage.setItem("target_language", e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="English">{t("explanation.languages.english")}</option>
              <option value="Spanish">{t("explanation.languages.spanish")}</option>
              <option value="French">{t("explanation.languages.french")}</option>
              <option value="German">{t("explanation.languages.german")}</option>
              <option value="Chinese">{t("explanation.languages.chinese")}</option>
              <option value="Japanese">{t("explanation.languages.japanese")}</option>
              <option value="Korean">{t("explanation.languages.korean")}</option>
            </select>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
