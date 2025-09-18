import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { ModelSelector } from "../components/ui/ModelSelector";
import {
  ArrowLeft,
  Key,
  Brain,
  Globe,
  Save,
  Eye,
  EyeOff,
  TestTube,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  AIProvider,
  AIServiceConfig,
  DEFAULT_MODELS,
} from "../types/aiService";
import { aiService } from "../services/aiService";
import { useTranslation } from "react-i18next";

export const AISettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // API Keys state
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [grokApiKey, setGrokApiKey] = useState("");

  // Model selections
  const [openaiModel, setOpenaiModel] = useState(DEFAULT_MODELS.openai);
  const [geminiModel, setGeminiModel] = useState(DEFAULT_MODELS.gemini);
  const [grokModel, setGrokModel] = useState(DEFAULT_MODELS.grok);

  // Settings state
  const [preferredProvider, setPreferredProvider] =
    useState<AIProvider>("openai");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);

  // UI state
  const [showApiKeys, setShowApiKeys] = useState<Record<AIProvider, boolean>>({
    openai: false,
    gemini: false,
    grok: false,
  });
  const [testingConnection, setTestingConnection] = useState<
    Record<AIProvider, boolean>
  >({
    openai: false,
    gemini: false,
    grok: false,
  });
  const [connectionStatus, setConnectionStatus] = useState<
    Record<AIProvider, "idle" | "success" | "error">
  >({
    openai: "idle",
    gemini: "idle",
    grok: "idle",
  });

  const providerDisplayName = (provider: AIProvider) =>
    t(`aiSettingsPage.providers.${provider}`);

  // Load settings from localStorage
  useEffect(() => {
    const savedOpenaiKey = localStorage.getItem("openai_api_key") || "";
    const savedGeminiKey = localStorage.getItem("gemini_api_key") || "";
    const savedGrokKey = localStorage.getItem("grok_api_key") || "";
    const savedPreferredProvider =
      (localStorage.getItem("preferred_ai_provider") as AIProvider) || "openai";
    const savedTargetLanguage =
      localStorage.getItem("target_language") || "English";
    const savedTemperature = parseFloat(
      localStorage.getItem("ai_temperature") || "0.7"
    );
    const savedMaxTokens = parseInt(
      localStorage.getItem("ai_max_tokens") || "1000"
    );
    const savedOpenaiModel =
      localStorage.getItem("openai_model") || DEFAULT_MODELS.openai;
    const savedGeminiModel =
      localStorage.getItem("gemini_model") || DEFAULT_MODELS.gemini;
    const savedGrokModel =
      localStorage.getItem("grok_model") || DEFAULT_MODELS.grok;

    setOpenaiApiKey(savedOpenaiKey);
    setGeminiApiKey(savedGeminiKey);
    setGrokApiKey(savedGrokKey);
    setPreferredProvider(savedPreferredProvider);
    setTargetLanguage(savedTargetLanguage);
    setTemperature(savedTemperature);
    setMaxTokens(savedMaxTokens);
    setOpenaiModel(savedOpenaiModel);
    setGeminiModel(savedGeminiModel);
    setGrokModel(savedGrokModel);
  }, []);

  const handleSave = () => {
    // Save API keys
    localStorage.setItem("openai_api_key", openaiApiKey);
    localStorage.setItem("gemini_api_key", geminiApiKey);
    localStorage.setItem("grok_api_key", grokApiKey);

    // Save models
    localStorage.setItem("openai_model", openaiModel);
    localStorage.setItem("gemini_model", geminiModel);
    localStorage.setItem("grok_model", grokModel);

    // Save general settings
    localStorage.setItem("preferred_ai_provider", preferredProvider);
    localStorage.setItem("target_language", targetLanguage);
    localStorage.setItem("ai_temperature", temperature.toString());
    localStorage.setItem("ai_max_tokens", maxTokens.toString());

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent("aiSettingsUpdated"));

    toast.success(t("aiSettingsPage.saveSuccess"));
  };

  const testConnection = async (provider: AIProvider) => {
    const apiKey =
      provider === "openai"
        ? openaiApiKey
        : provider === "gemini"
        ? geminiApiKey
        : grokApiKey;
    const model =
      provider === "openai"
        ? openaiModel
        : provider === "gemini"
        ? geminiModel
        : grokModel;

    if (!apiKey.trim()) {
      toast.error(
        t("aiSettingsPage.enterApiKeyFirst", {
          provider: providerDisplayName(provider),
        })
      );
      return;
    }

    setTestingConnection((prev) => ({ ...prev, [provider]: true }));
    setConnectionStatus((prev) => ({ ...prev, [provider]: "idle" }));

    try {
      const config: AIServiceConfig = {
        provider,
        model,
        apiKey,
        temperature: 0.1,
        maxTokens: 10,
      };

      const success = await aiService.testConnection(config);

      if (success) {
        setConnectionStatus((prev) => ({ ...prev, [provider]: "success" }));
        toast.success(
          t("aiSettingsPage.connectionSuccess", {
            provider: providerDisplayName(provider),
          })
        );
      } else {
        setConnectionStatus((prev) => ({ ...prev, [provider]: "error" }));
        toast.error(
          t("aiSettingsPage.connectionFailed", {
            provider: providerDisplayName(provider),
          })
        );
      }
    } catch (error) {
      setConnectionStatus((prev) => ({ ...prev, [provider]: "error" }));
      toast.error(
        t("aiSettingsPage.connectionFailedWithError", {
          provider: providerDisplayName(provider),
          message:
            error instanceof Error
              ? error.message
              : t("explanation.unknownError"),
        })
      );
    } finally {
      setTestingConnection((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const toggleApiKeyVisibility = (provider: AIProvider) => {
    setShowApiKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const getConnectionStatusIcon = (provider: AIProvider) => {
    switch (connectionStatus[provider]) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const renderProviderSection = (
    provider: AIProvider,
    apiKey: string,
    setApiKey: (key: string) => void,
    model: string,
    setModel: (model: string) => void
  ) => {
    const providerName = providerDisplayName(provider);
    const isValidKey = aiService.validateApiKey(provider, apiKey);

    return (
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                provider === "openai"
                  ? "bg-green-100 text-green-600"
                  : provider === "gemini"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-purple-100 text-purple-600"
              }`}
            >
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{providerName}</h3>
              <p className="text-sm text-gray-600">
                {t(`aiSettingsPage.providerDescriptions.${provider}`)}
              </p>
            </div>
          </div>
          {getConnectionStatusIcon(provider)}
        </div>

        <div className="space-y-4">
          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("aiSettingsPage.apiKeyLabel")}
            </label>
            <div className="relative">
              <input
                type={showApiKeys[provider] ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t("aiSettingsPage.apiKeyPlaceholderLabel", {
                  provider: providerName,
                })}
                className={`w-full px-3 py-2 pr-20 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  apiKey && !isValidKey ? "border-red-300" : "border-gray-300"
                }`}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleApiKeyVisibility(provider)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  {showApiKeys[provider] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testConnection(provider)}
                  disabled={!apiKey.trim() || testingConnection[provider]}
                  className="h-6 px-2 text-xs"
                >
                  {testingConnection[provider] ? (
                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <TestTube className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            {apiKey && !isValidKey && (
              <p className="text-xs text-red-600 mt-1">
                {t("aiSettingsPage.invalidApiKeyFormat")}
              </p>
            )}
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("aiSettingsPage.defaultModel")}
            </label>
            <ModelSelector
              selectedModel={model}
              onModelSelect={setModel}
              provider={provider}
              placeholder={t("aiSettingsPage.selectModelPlaceholder", {
                provider: providerName,
              })}
              showPricing={true}
              showCapabilities={true}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("common.back")}
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t("aiSettingsPage.title")}</h1>
            <p className="text-gray-600">
              {t("aiSettingsPage.subtitle")}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* General Settings */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t("aiSettingsPage.generalSettings")}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("aiSettingsPage.preferredProvider")}
                </label>
                <select
                  value={preferredProvider}
                  onChange={(e) =>
                    setPreferredProvider(e.target.value as AIProvider)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="openai">{providerDisplayName("openai")}</option>
                  <option value="gemini">{providerDisplayName("gemini")}</option>
                  <option value="grok">{providerDisplayName("grok")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("aiSettingsPage.targetLanguage")}
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="English">{t("aiSettingsPage.languages.english")}</option>
                  <option value="Spanish">{t("aiSettingsPage.languages.spanish")}</option>
                  <option value="French">{t("aiSettingsPage.languages.french")}</option>
                  <option value="German">{t("aiSettingsPage.languages.german")}</option>
                  <option value="Chinese">{t("aiSettingsPage.languages.chinese")}</option>
                  <option value="Japanese">{t("aiSettingsPage.languages.japanese")}</option>
                  <option value="Korean">{t("aiSettingsPage.languages.korean")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("aiSettingsPage.temperature", { value: temperature })}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{t("aiSettingsPage.temperatureFocused")}</span>
                  <span>{t("aiSettingsPage.temperatureBalanced")}</span>
                  <span>{t("aiSettingsPage.temperatureCreative")}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("aiSettingsPage.maxTokens")}
                </label>
                <input
                  type="number"
                  min="100"
                  max="4000"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* AI Providers */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Key className="w-5 h-5" />
              {t("aiSettingsPage.providersSection")}
            </h2>

            {renderProviderSection(
              "openai",
              openaiApiKey,
              setOpenaiApiKey,
              openaiModel,
              setOpenaiModel
            )}
            {renderProviderSection(
              "gemini",
              geminiApiKey,
              setGeminiApiKey,
              geminiModel,
              setGeminiModel
            )}
            {renderProviderSection(
              "grok",
              grokApiKey,
              setGrokApiKey,
              grokModel,
              setGrokModel
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {t("aiSettingsPage.saveSettings")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
