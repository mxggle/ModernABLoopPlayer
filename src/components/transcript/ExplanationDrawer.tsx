import React, { useState, useEffect } from "react";
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
  }, [isOpen]);

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

  const getApiKey = (provider: AIProvider): string => {
    return localStorage.getItem(`${provider}_api_key`) || "";
  };

  const hasValidApiKey = (provider: AIProvider): boolean => {
    const apiKey = getApiKey(provider);
    return aiService.validateApiKey(provider, apiKey);
  };

  const generateExplanation = async () => {
    if (!text.trim()) {
      toast.error("No text selected for explanation");
      return;
    }

    const apiKey = getApiKey(selectedProvider);
    if (!hasValidApiKey(selectedProvider)) {
      toast.error(
        `Please configure your ${selectedProvider.toUpperCase()} API key in settings`
      );
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
          <span>Explanation ready!</span>
        </div>,
        { duration: 2000 }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);

      // Update global state
      setGlobalExplanationState(text, {
        status: "error",
        error: errorMessage,
      });

      toast.error(`Failed to generate explanation: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setCanCloseWhileLoading(false);
    }
  };

  // Auto-generate explanation when drawer opens
  useEffect(() => {
    if (isOpen && text && !explanation && !isLoading && !error) {
      generateExplanation();
    }
  }, [isOpen, text]);

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

  const handleClose = () => {
    if (isLoading && canCloseWhileLoading) {
      toast("Explanation will continue generating in background", {
        icon: "ℹ️",
        duration: 3000,
      });
    }
    onClose();
  };

  const formatTokenUsage = (usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }) => {
    if (!usage) return null;
    return `${usage.totalTokens} tokens (${usage.promptTokens} prompt + ${usage.completionTokens} completion)`;
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title="AI Explanation"
    >
      <div className="space-y-6 p-4">
        {/* Loading State with Close Option */}
        {isLoading && canCloseWhileLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader className="w-5 h-5 animate-spin text-blue-600" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">
                    Generating explanation...
                  </h4>
                  <p className="text-xs text-blue-600 mt-1">
                    You can close this drawer and the explanation will continue
                    in the background
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-blue-600 hover:text-blue-800 p-1"
                title="Close and continue in background"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Model Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Model Selection
            </h3>
            <button
              onClick={() => navigate("/ai-settings")}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) =>
                  handleProviderChange(e.target.value as AIProvider)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="grok">xAI Grok</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <ModelSelector
                selectedModel={selectedModel}
                onModelSelect={handleModelChange}
                provider={selectedProvider}
                placeholder="Select model..."
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
                  Please configure your {selectedProvider.toUpperCase()} API key
                  in{" "}
                  <button
                    onClick={() => navigate("/ai-settings")}
                    className="underline hover:no-underline"
                  >
                    settings
                  </button>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Selected Text */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Selected Text
          </h3>
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
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                {explanation ? "Regenerate" : "Generate"} Explanation
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
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Explanation
              </h3>
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
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Language Settings
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Language
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => {
                setTargetLanguage(e.target.value);
                localStorage.setItem("target_language", e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Chinese">Chinese</option>
              <option value="Japanese">Japanese</option>
              <option value="Korean">Korean</option>
            </select>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
