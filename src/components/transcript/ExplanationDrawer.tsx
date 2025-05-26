import React, { useState, useEffect } from "react";
import { Drawer } from "../ui/drawer";
import {
  AIService,
  ExplanationResult,
  AIServiceConfig,
} from "../../utils/aiService";
import { Loader, Brain, Globe, BookOpen, Key, Settings } from "lucide-react";
import { toast } from "react-hot-toast";

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
  const [explanation, setExplanation] = useState<ExplanationResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiService, setAiService] = useState<AIService | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Settings state
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [grokApiKey, setGrokApiKey] = useState("");
  const [preferredService, setPreferredService] = useState<
    "openai" | "gemini" | "grok"
  >("openai");
  const [targetLanguage, setTargetLanguage] = useState("English");

  // Load saved settings on mount only
  useEffect(() => {
    const savedOpenAIKey = localStorage.getItem("openai_api_key") || "";
    const savedGeminiKey = localStorage.getItem("gemini_api_key") || "";
    const savedGrokKey = localStorage.getItem("grok_api_key") || "";
    const savedPreferredService =
      (localStorage.getItem("preferred_ai_service") as
        | "openai"
        | "gemini"
        | "grok") || "openai";
    const savedTargetLanguage =
      localStorage.getItem("target_language") || "English";

    console.log("Loading saved settings:", {
      hasOpenAI: !!savedOpenAIKey,
      hasGemini: !!savedGeminiKey,
      hasGrok: !!savedGrokKey,
      preferredService: savedPreferredService,
      targetLanguage: savedTargetLanguage,
    });

    setOpenaiApiKey(savedOpenAIKey);
    setGeminiApiKey(savedGeminiKey);
    setGrokApiKey(savedGrokKey);
    setPreferredService(savedPreferredService);
    setTargetLanguage(savedTargetLanguage);

    // Initialize AI service if we have at least one API key
    if (savedOpenAIKey || savedGeminiKey || savedGrokKey) {
      const config: AIServiceConfig = {
        openaiApiKey: savedOpenAIKey,
        geminiApiKey: savedGeminiKey,
        grokApiKey: savedGrokKey,
        preferredService: savedPreferredService,
        targetLanguage: savedTargetLanguage,
        strictMode: true, // Only use preferred service, no fallback
      };
      setAiService(new AIService(config));
    }
  }, []); // Only run on mount

  // Generate explanation when drawer opens and we have text (but not if we already have an explanation)
  useEffect(() => {
    if (isOpen && text && aiService && !explanation && !isLoading) {
      generateExplanation();
    }
  }, [isOpen, text, aiService]);

  // Reset explanation when text changes
  useEffect(() => {
    setExplanation(null);
    setError(null);
  }, [text]);

  const generateExplanation = async () => {
    if (!aiService) {
      setError("Please configure at least one AI service in settings.");
      setShowSettings(true);
      return;
    }

    console.log("Generating explanation with target language:", targetLanguage);
    setIsLoading(true);
    setError(null);

    try {
      // Make sure we use the current target language
      const result = await aiService.explainText(text, targetLanguage);
      setExplanation(result);
      toast.success("Explanation generated successfully!");
    } catch (error) {
      console.error("Failed to generate explanation:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate explanation";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = () => {
    console.log("Saving settings:", {
      hasOpenAI: !!openaiApiKey,
      hasGemini: !!geminiApiKey,
      hasGrok: !!grokApiKey,
      preferredService,
      targetLanguage,
    });

    // Save to localStorage
    localStorage.setItem("openai_api_key", openaiApiKey);
    localStorage.setItem("gemini_api_key", geminiApiKey);
    localStorage.setItem("grok_api_key", grokApiKey);
    localStorage.setItem("preferred_ai_service", preferredService);
    localStorage.setItem("target_language", targetLanguage);

    // Update AI service immediately
    if (openaiApiKey || geminiApiKey || grokApiKey) {
      const config: AIServiceConfig = {
        openaiApiKey: openaiApiKey,
        geminiApiKey: geminiApiKey,
        grokApiKey: grokApiKey,
        preferredService: preferredService,
        targetLanguage: targetLanguage,
        strictMode: true, // Only use preferred service, no fallback
      };

      // Create new AI service instance with updated config
      const newAiService = new AIService(config);
      setAiService(newAiService);

      toast.success("Settings saved successfully!");
      setShowSettings(false);

      // Clear existing explanation so user can regenerate with new settings
      setExplanation(null);
      setError(null);
    } else {
      toast.error("Please provide at least one API key.");
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case "beginner":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30";
      case "intermediate":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30";
      case "advanced":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30";
    }
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="AI Text Explanation"
    >
      <div className="p-4 space-y-4 max-h-[calc(80vh-120px)] overflow-y-auto">
        {/* Header with settings button */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
              → {targetLanguage}
            </span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="AI Settings"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Original text */}
        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Original Text:
          </h4>
          <p className="text-gray-800 dark:text-gray-200 italic">"{text}"</p>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <Key size={16} />
              AI Service Configuration
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AI..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  xAI Grok API Key
                </label>
                <input
                  type="password"
                  value={grokApiKey}
                  onChange={(e) => setGrokApiKey(e.target.value)}
                  placeholder="xai-..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preferred Service
                </label>
                <select
                  value={preferredService}
                  onChange={(e) =>
                    setPreferredService(
                      e.target.value as "openai" | "gemini" | "grok"
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="grok">xAI Grok</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Language
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => {
                    const newLanguage = e.target.value;
                    setTargetLanguage(newLanguage);

                    // Save to localStorage immediately
                    localStorage.setItem("target_language", newLanguage);

                    // Update AI service if it exists
                    if (aiService) {
                      aiService.updateConfig({
                        targetLanguage: newLanguage,
                      });
                    }

                    // Clear existing explanation to force regeneration with new language
                    setExplanation(null);
                    setError(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Italian">Italian</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Korean">Korean</option>
                  <option value="Russian">Russian</option>
                  <option value="Arabic">Arabic</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={saveSettings}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Save Settings
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>Get API keys from:</p>
              <p>
                •{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  OpenAI Platform
                </a>
              </p>
              <p>
                •{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
              <p>
                •{" "}
                <a
                  href="https://console.x.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  xAI Console
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Loader size={24} className="animate-spin text-purple-500 mb-2" />
            <p className="text-gray-600 dark:text-gray-400">
              Generating explanation...
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm mb-3">
              {error}
            </p>
            {!aiService && (
              <button
                onClick={() => setShowSettings(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Settings size={16} />
                Configure AI Services
              </button>
            )}
          </div>
        )}

        {/* Explanation content */}
        {explanation && !isLoading && (
          <div className="space-y-4">
            {/* Translation */}
            {explanation.translation && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                  <Globe size={16} />
                  Translation
                </h4>
                <p className="text-green-700 dark:text-green-300">
                  {explanation.translation}
                </p>
              </div>
            )}

            {/* Explanation */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                <BookOpen size={16} />
                Explanation
              </h4>
              <p className="text-purple-700 dark:text-purple-300">
                {explanation.explanation}
              </p>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {explanation.language && (
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Detected Language
                  </h5>
                  <p className="text-gray-800 dark:text-gray-200 capitalize">
                    {explanation.language}
                  </p>
                </div>
              )}

              {explanation.difficulty && (
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Difficulty Level
                  </h5>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${getDifficultyColor(
                      explanation.difficulty
                    )}`}
                  >
                    {explanation.difficulty}
                  </span>
                </div>
              )}
            </div>

            {/* Key words */}
            {explanation.keyWords && explanation.keyWords.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  Key Vocabulary
                </h4>
                <div className="flex flex-wrap gap-2">
                  {explanation.keyWords.map((word, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-md text-sm"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {!isLoading && !error && !explanation && aiService && (
          <div className="flex justify-center pt-2">
            <button
              onClick={generateExplanation}
              className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Brain size={18} />
              Generate Explanation
            </button>
          </div>
        )}

        {/* Regenerate button when explanation exists */}
        {explanation && !isLoading && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => {
                setExplanation(null);
                generateExplanation();
              }}
              className="w-full sm:w-auto px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              <Brain size={16} />
              Regenerate
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
};
