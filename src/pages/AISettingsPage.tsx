import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  CheckCircle,
  Eye,
  EyeOff,
  FileAudio,
  Globe,
  Key,
  Save,
  TestTube,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ModelSelector } from "../components/ui/ModelSelector";
import { cn } from "../utils/cn";
import { aiService } from "../services/aiService";
import {
  AIProvider,
  AIServiceConfig,
  DEFAULT_MODELS,
  TranscriptionProvider,
  TRANSCRIPTION_PROVIDERS,
  getModelById,
} from "../types/aiService";

const LANGUAGE_OPTIONS = [
  "english",
  "spanish",
  "french",
  "german",
  "chinese",
  "japanese",
  "korean",
] as const;

const LANGUAGE_VALUES: Record<(typeof LANGUAGE_OPTIONS)[number], string> = {
  english: "English",
  spanish: "Spanish",
  french: "French",
  german: "German",
  chinese: "Chinese",
  japanese: "Japanese",
  korean: "Korean",
};

const providerSurfaceClassName: Record<AIProvider, string> = {
  openai: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  gemini: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  grok: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  ollama: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
};


const statusToneClassName = {
  success:
    "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  error:
    "border border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  neutral:
    "border border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  setApiKey: (key: string) => void;
  model: string;
  setModel: (model: string) => void;
}

type SettingsTab = "defaults" | "providers" | "transcription";

export const AISettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>("defaults");

  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [grokApiKey, setGrokApiKey] = useState("");
  const [groqApiKey, setGroqApiKey] = useState("");

  const [openaiModel, setOpenaiModel] = useState(DEFAULT_MODELS.openai);
  const [geminiModel, setGeminiModel] = useState(DEFAULT_MODELS.gemini);
  const [grokModel, setGrokModel] = useState(DEFAULT_MODELS.grok);

  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState(DEFAULT_MODELS.ollama);
  const [localWhisperUrl, setLocalWhisperUrl] = useState("http://localhost:8000");
  const [localWhisperModel, setLocalWhisperModel] = useState("Systran/faster-whisper-large-v3");

  const [preferredProvider, setPreferredProvider] =
    useState<AIProvider>("openai");
  const [preferredTranscriptionProvider, setPreferredTranscriptionProvider] =
    useState<TranscriptionProvider>("openai");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);

  const [showApiKeys, setShowApiKeys] = useState<Record<AIProvider, boolean>>({
    openai: false,
    gemini: false,
    grok: false,
    ollama: false,
  });
  const [showGroqApiKey, setShowGroqApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState<
    Record<AIProvider, boolean>
  >({
    openai: false,
    gemini: false,
    grok: false,
    ollama: false,
  });
  const [connectionStatus, setConnectionStatus] = useState<
    Record<AIProvider, "idle" | "success" | "error">
  >({
    openai: "idle",
    gemini: "idle",
    grok: "idle",
    ollama: "idle",
  });

  const providerDisplayName = (provider: AIProvider) =>
    t(`aiSettingsPage.providers.${provider}`);

  useEffect(() => {
    const savedOpenaiKey = localStorage.getItem("openai_api_key") || "";
    const savedGeminiKey = localStorage.getItem("gemini_api_key") || "";
    const savedGrokKey = localStorage.getItem("grok_api_key") || "";
    const savedGroqKey = localStorage.getItem("groq_api_key") || "";
    const savedPreferredProvider =
      (localStorage.getItem("preferred_ai_provider") as AIProvider) || "openai";
    const savedTranscriptionProvider =
      (localStorage.getItem(
        "preferred_transcription_provider"
      ) as TranscriptionProvider) || "openai";
    const savedTargetLanguage =
      localStorage.getItem("target_language") || "English";
    const savedTemperature = parseFloat(
      localStorage.getItem("ai_temperature") || "0.7"
    );
    const savedMaxTokens = parseInt(
      localStorage.getItem("ai_max_tokens") || "1000",
      10
    );
    const savedOpenaiModel =
      localStorage.getItem("openai_model") || DEFAULT_MODELS.openai;
    const savedGeminiModel =
      localStorage.getItem("gemini_model") || DEFAULT_MODELS.gemini;
    const savedGrokModel =
      localStorage.getItem("grok_model") || DEFAULT_MODELS.grok;
    const savedOllamaBaseUrl =
      localStorage.getItem("ollama_base_url") || "http://localhost:11434";
    const savedOllamaModel =
      localStorage.getItem("ollama_model") || DEFAULT_MODELS.ollama;
    const savedLocalWhisperUrl =
      localStorage.getItem("local_whisper_url") || "http://localhost:8000";
    const savedLocalWhisperModel =
      localStorage.getItem("local_whisper_model") || "Systran/faster-whisper-large-v3";

    setOpenaiApiKey(savedOpenaiKey);
    setGeminiApiKey(savedGeminiKey);
    setGrokApiKey(savedGrokKey);
    setGroqApiKey(savedGroqKey);
    setPreferredProvider(savedPreferredProvider);
    setPreferredTranscriptionProvider(savedTranscriptionProvider);
    setTargetLanguage(savedTargetLanguage);
    setTemperature(Number.isFinite(savedTemperature) ? savedTemperature : 0.7);
    setMaxTokens(Number.isFinite(savedMaxTokens) ? savedMaxTokens : 1000);
    setOpenaiModel(savedOpenaiModel);
    setGeminiModel(savedGeminiModel);
    setGrokModel(savedGrokModel);
    setOllamaBaseUrl(savedOllamaBaseUrl);
    setOllamaModel(savedOllamaModel);
    setLocalWhisperUrl(savedLocalWhisperUrl);
    setLocalWhisperModel(savedLocalWhisperModel);
  }, []);

  const providerConfigs: ProviderConfig[] = [
    {
      provider: "openai",
      apiKey: openaiApiKey,
      setApiKey: setOpenaiApiKey,
      model: openaiModel,
      setModel: setOpenaiModel,
    },
    {
      provider: "gemini",
      apiKey: geminiApiKey,
      setApiKey: setGeminiApiKey,
      model: geminiModel,
      setModel: setGeminiModel,
    },
    {
      provider: "grok",
      apiKey: grokApiKey,
      setApiKey: setGrokApiKey,
      model: grokModel,
      setModel: setGrokModel,
    },
    {
      provider: "ollama",
      apiKey: "", // no API key required
      setApiKey: () => {},
      model: ollamaModel,
      setModel: setOllamaModel,
    },
  ];

  const configuredProvidersCount = providerConfigs.filter(({ provider, apiKey }) =>
    aiService.validateApiKey(provider, apiKey)
  ).length;
  const transcriptionSharedProvider =
    preferredTranscriptionProvider === "groq" || preferredTranscriptionProvider === "local-whisper"
      ? null
      : preferredTranscriptionProvider;

  const handleSave = () => {
    localStorage.setItem("openai_api_key", openaiApiKey);
    localStorage.setItem("gemini_api_key", geminiApiKey);
    localStorage.setItem("grok_api_key", grokApiKey);
    localStorage.setItem("groq_api_key", groqApiKey);

    localStorage.setItem("openai_model", openaiModel);
    localStorage.setItem("gemini_model", geminiModel);
    localStorage.setItem("grok_model", grokModel);
    localStorage.setItem("ollama_base_url", ollamaBaseUrl);
    localStorage.setItem("ollama_model", ollamaModel);
    localStorage.setItem("local_whisper_url", localWhisperUrl);
    localStorage.setItem("local_whisper_model", localWhisperModel);

    localStorage.setItem("preferred_ai_provider", preferredProvider);
    localStorage.setItem(
      "preferred_transcription_provider",
      preferredTranscriptionProvider
    );
    localStorage.setItem("target_language", targetLanguage);
    localStorage.setItem("ai_temperature", temperature.toString());
    localStorage.setItem("ai_max_tokens", maxTokens.toString());

    window.dispatchEvent(new CustomEvent("aiSettingsUpdated"));
    window.dispatchEvent(new CustomEvent("ai-settings-updated"));

    toast.success(t("aiSettingsPage.saveSuccess"));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSave();
  };

  const toggleApiKeyVisibility = (provider: AIProvider) => {
    setShowApiKeys((current) => ({ ...current, [provider]: !current[provider] }));
  };

  const getProviderSetupStatus = (provider: AIProvider, apiKey: string) => {
    if (!apiKey.trim()) {
      return {
        label: t("aiSettingsPage.status.missing"),
        className: statusToneClassName.warning,
      };
    }

    if (!aiService.validateApiKey(provider, apiKey)) {
      return {
        label: t("aiSettingsPage.status.invalid"),
        className: statusToneClassName.error,
      };
    }

    return {
      label: t("aiSettingsPage.status.ready"),
      className: statusToneClassName.success,
    };
  };

  const getConnectionStatusIcon = (provider: AIProvider) => {
    switch (connectionStatus[provider]) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const testConnection = async (provider: AIProvider) => {
    const config = providerConfigs.find((item) => item.provider === provider);

    if (!config || !config.apiKey.trim()) {
      toast.error(
        t("aiSettingsPage.enterApiKeyFirst", {
          provider: providerDisplayName(provider),
        })
      );
      return;
    }

    setTestingConnection((current) => ({ ...current, [provider]: true }));
    setConnectionStatus((current) => ({ ...current, [provider]: "idle" }));

    try {
      const requestConfig: AIServiceConfig = {
        provider,
        model: config.model,
        apiKey: config.apiKey,
        temperature: 0.1,
        maxTokens: 10,
      };

      const success = await aiService.testConnection(requestConfig);

      if (success) {
        setConnectionStatus((current) => ({ ...current, [provider]: "success" }));
        toast.success(
          t("aiSettingsPage.connectionSuccess", {
            provider: providerDisplayName(provider),
          })
        );
      } else {
        setConnectionStatus((current) => ({ ...current, [provider]: "error" }));
        toast.error(
          t("aiSettingsPage.connectionFailed", {
            provider: providerDisplayName(provider),
          })
        );
      }
    } catch (error) {
      setConnectionStatus((current) => ({ ...current, [provider]: "error" }));
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
      setTestingConnection((current) => ({ ...current, [provider]: false }));
    }
  };

  const TABS = [
    { id: "defaults" as const, label: t("aiSettingsPage.sectionNav.defaults"), Icon: Globe },
    { id: "providers" as const, label: t("aiSettingsPage.sectionNav.providers"), Icon: Key },
    { id: "transcription" as const, label: t("aiSettingsPage.sectionNav.transcription"), Icon: FileAudio },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
              {t("aiSettingsPage.title")}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              {t("aiSettingsPage.subtitle")}
            </p>
          </div>
          <Button type="submit" size="sm" form="ai-settings-form" className="gap-2 shrink-0">
            <Save className="h-3.5 w-3.5" />
            {t("aiSettingsPage.saveSettings")}
          </Button>
        </div>

        {/* AI glance */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-2 border-b border-gray-100 dark:border-gray-800/60">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-gray-100 p-1 dark:bg-gray-900">
                <Brain className="h-3 w-3 text-gray-600 dark:text-gray-300" />
              </div>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                configuredProvidersCount > 0 ? statusToneClassName.success : statusToneClassName.warning
              )}>
                {configuredProvidersCount}/{providerConfigs.length}
              </span>
            </div>
            <div className="w-px h-3.5 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
            {[
              { label: t("aiSettingsPage.preferredProvider"), value: providerDisplayName(preferredProvider) },
              { label: t("aiSettingsPage.summaryDefaultModel"), value: preferredProvider === "ollama" ? (ollamaModel || DEFAULT_MODELS.ollama) : (getModelById(providerConfigs.find(({ provider }) => provider === preferredProvider)?.model || DEFAULT_MODELS[preferredProvider])?.name || DEFAULT_MODELS[preferredProvider]) },
              { label: t("aiSettingsPage.transcriptionProvider"), value: t(`aiSettingsPage.transcriptionProviders.${preferredTranscriptionProvider}`) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1">
                <span className="text-xs text-gray-400 dark:text-gray-500">{label}:</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex gap-1">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  activeTab === id
                    ? "border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <form
        id="ai-settings-form"
        onSubmit={handleSubmit}
        className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-4"
      >
        {/* General Settings tab */}
        {activeTab === "defaults" && (
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 divide-y divide-gray-100 dark:divide-gray-800">
            {/* Preferred provider */}
            <div className="px-5 py-5 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t("aiSettingsPage.preferredProvider")}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {t("aiSettingsPage.providerSetupDescription")}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {providerConfigs.map(({ provider, apiKey, model }) => {
                  const status = getProviderSetupStatus(provider, apiKey);
                  const modelName = provider === "ollama" ? (model || DEFAULT_MODELS.ollama) : (getModelById(model)?.name || DEFAULT_MODELS[provider]);
                  const isActive = preferredProvider === provider;
                  return (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => setPreferredProvider(provider)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        isActive
                          ? "border-gray-900 bg-gray-950 dark:border-gray-100 dark:bg-gray-50"
                          : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-gray-700 dark:hover:bg-gray-900"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={cn(
                          "text-sm font-medium",
                          isActive ? "text-white dark:text-gray-950" : "text-gray-900 dark:text-gray-100"
                        )}>
                          {providerDisplayName(provider)}
                        </span>
                        {isActive && <CheckCircle className="h-3.5 w-3.5 shrink-0 text-white/60 dark:text-gray-500" />}
                      </div>
                      <p className={cn(
                        "text-xs truncate mb-2",
                        isActive ? "text-white/60 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"
                      )}>
                        {modelName}
                      </p>
                      <span className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        isActive ? "bg-white/10 text-white/80 dark:bg-black/10 dark:text-gray-600" : status.className
                      )}>
                        {status.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language + Max tokens */}
            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="target-language" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t("aiSettingsPage.targetLanguage")}
                </label>
                <select
                  id="target-language"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-gray-300/20"
                >
                  {LANGUAGE_OPTIONS.map((k) => (
                    <option key={k} value={LANGUAGE_VALUES[k]}>
                      {t(`aiSettingsPage.languages.${k}`)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("aiSettingsPage.targetLanguageHelp")}
                </p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="max-tokens" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t("aiSettingsPage.maxTokens")}
                </label>
                <Input
                  id="max-tokens"
                  type="number"
                  min={100}
                  max={4000}
                  value={maxTokens}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setMaxTokens(Number.isFinite(v) ? v : 1000);
                  }}
                  className="h-9"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("aiSettingsPage.maxTokensHelp")}
                </p>
              </div>
            </div>

            {/* Temperature */}
            <div className="px-5 py-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t("aiSettingsPage.generationBehavior")}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {t("aiSettingsPage.temperatureHelp")}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-mono font-medium text-gray-900 dark:bg-gray-900 dark:text-gray-100">
                  {temperature.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-gray-900 dark:accent-gray-100"
              />
              <div className="mt-1.5 flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>{t("aiSettingsPage.temperatureFocused")}</span>
                <span>{t("aiSettingsPage.temperatureBalanced")}</span>
                <span>{t("aiSettingsPage.temperatureCreative")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Providers tab */}
        {activeTab === "providers" && (
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 divide-y divide-gray-100 dark:divide-gray-800">
            {providerConfigs.map(({ provider, apiKey, setApiKey, model, setModel }) => {
              const providerName = providerDisplayName(provider);
              const setupStatus = getProviderSetupStatus(provider, apiKey);
              const isValidKey = aiService.validateApiKey(provider, apiKey);
              const isOllama = provider === "ollama";

              return (
                <div key={provider} className="px-5 py-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("rounded-xl p-2", providerSurfaceClassName[provider])}>
                        <Brain className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                            {providerName}
                          </h3>
                          {!isOllama && getConnectionStatusIcon(provider)}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t(`aiSettingsPage.providerDescriptions.${provider}`)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {preferredProvider === provider && (
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                          {t("aiSettingsPage.status.default")}
                        </span>
                      )}
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", setupStatus.className)}>
                        {setupStatus.label}
                      </span>
                    </div>
                  </div>

                  {isOllama ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {t("aiSettingsPage.ollamaBaseUrl")}
                        </label>
                        <Input
                          type="text"
                          value={ollamaBaseUrl}
                          onChange={(e) => setOllamaBaseUrl(e.target.value)}
                          placeholder="http://localhost:11434"
                          className="h-9 font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t("aiSettingsPage.ollamaBaseUrlHelp")}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {t("aiSettingsPage.ollamaModel")}
                        </label>
                        <Input
                          type="text"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="llama3.2"
                          className="h-9 text-sm"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t("aiSettingsPage.ollamaModelHelp")}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {t("aiSettingsPage.apiKeyLabel")}
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showApiKeys[provider] ? "text" : "password"}
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder={t("aiSettingsPage.apiKeyPlaceholderLabel", { provider: providerName })}
                              className={cn(
                                "h-9 pr-9 font-mono text-sm",
                                apiKey && !isValidKey && "border-red-300 dark:border-red-700"
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => toggleApiKeyVisibility(provider)}
                              className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
                              aria-label={showApiKeys[provider] ? t("common.hide") : t("common.show")}
                            >
                              {showApiKeys[provider] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => testConnection(provider)}
                            disabled={!apiKey.trim() || testingConnection[provider]}
                            className="h-9 gap-1.5 shrink-0"
                          >
                            {testingConnection[provider]
                              ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                              : <TestTube className="h-3.5 w-3.5" />
                            }
                            {t("aiSettingsPage.testConnection")}
                          </Button>
                        </div>
                        {apiKey && !isValidKey && (
                          <p className="text-xs text-red-600 dark:text-red-400">{t("aiSettingsPage.invalidApiKeyFormat")}</p>
                        )}
                        {connectionStatus[provider] === "success" && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">{t("aiSettingsPage.status.testPassed")}</p>
                        )}
                        {connectionStatus[provider] === "error" && (
                          <p className="text-xs text-red-600 dark:text-red-400">{t("aiSettingsPage.status.testFailed")}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {t("aiSettingsPage.defaultModel")}
                        </label>
                        <ModelSelector
                          selectedModel={model}
                          onModelSelect={setModel}
                          provider={provider}
                          placeholder={t("aiSettingsPage.selectModelPlaceholder", { provider: providerName })}
                          showPricing={true}
                          showCapabilities={true}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Transcription tab */}
        {activeTab === "transcription" && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(TRANSCRIPTION_PROVIDERS) as TranscriptionProvider[]).map((provider) => {
                const isSelected = preferredTranscriptionProvider === provider;
                const isLocalWhisper = provider === "local-whisper";
                const isGroq = provider === "groq";
                const isShared = !isGroq && !isLocalWhisper;
                const providerReady = isLocalWhisper
                  ? true
                  : isGroq
                  ? groqApiKey.trim().length > 0
                  : provider === "openai"
                  ? aiService.validateApiKey("openai", openaiApiKey)
                  : aiService.validateApiKey("gemini", geminiApiKey);
                const statusLabel = isShared
                  ? t("aiSettingsPage.transcriptionSharedKey")
                  : providerReady
                  ? t("aiSettingsPage.status.ready")
                  : t("aiSettingsPage.status.missing");

                return (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setPreferredTranscriptionProvider(provider)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all",
                      isSelected
                        ? "border-gray-900 bg-gray-950 dark:border-gray-100 dark:bg-gray-50"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={cn(
                        "text-sm font-medium",
                        isSelected ? "text-white dark:text-gray-950" : "text-gray-900 dark:text-gray-100"
                      )}>
                        {t(`aiSettingsPage.transcriptionProviders.${provider}`)}
                      </span>
                      {isSelected && <CheckCircle className="h-3.5 w-3.5 shrink-0 text-white/60 dark:text-gray-500" />}
                    </div>
                    <p className={cn(
                      "text-xs truncate mb-2",
                      isSelected ? "text-white/60 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"
                    )}>
                      {isLocalWhisper ? localWhisperModel || "configurable" : TRANSCRIPTION_PROVIDERS[provider].model}
                    </p>
                    <span className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      isSelected
                        ? "bg-white/10 text-white/80 dark:bg-black/10 dark:text-gray-600"
                        : providerReady ? statusToneClassName.success : statusToneClassName.warning
                    )}>
                      {statusLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
              {preferredTranscriptionProvider === "local-whisper" ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {t("aiSettingsPage.localWhisperUrl")}
                    </label>
                    <Input
                      type="text"
                      value={localWhisperUrl}
                      onChange={(e) => setLocalWhisperUrl(e.target.value)}
                      placeholder="http://localhost:8000"
                      className="h-9 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("aiSettingsPage.localWhisperUrlHelp")}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {t("aiSettingsPage.localWhisperModel")}
                    </label>
                    <Input
                      type="text"
                      value={localWhisperModel}
                      onChange={(e) => setLocalWhisperModel(e.target.value)}
                      placeholder="Systran/faster-whisper-large-v3"
                      className="h-9 text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("aiSettingsPage.localWhisperModelHelp")}
                    </p>
                  </div>
                </div>
              ) : transcriptionSharedProvider ? (
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t("aiSettingsPage.transcriptionSharedKey")}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t("aiSettingsPage.transcriptionSharedKeyDescription", {
                      provider: providerDisplayName(transcriptionSharedProvider),
                    })}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t("aiSettingsPage.groqApiKeyLabel")}
                  </label>
                  <div className="relative">
                    <Input
                      type={showGroqApiKey ? "text" : "password"}
                      value={groqApiKey}
                      onChange={(e) => setGroqApiKey(e.target.value)}
                      placeholder={t("aiSettingsPage.groqApiKeyPlaceholder")}
                      className="h-9 pr-9 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGroqApiKey((v) => !v)}
                      className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
                      aria-label={showGroqApiKey ? t("common.hide") : t("common.show")}
                    >
                      {showGroqApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {t("aiSettingsPage.getGroqApiKey")}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
