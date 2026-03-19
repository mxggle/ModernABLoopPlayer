import React, { useState, useEffect } from "react";
import { Button } from "./button";
import { cn } from "../../utils/cn";
import {
  ChevronDown,
  Brain,
  Zap,
  Eye,
  Cpu,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  AIProvider,
  ModelOption,
  getAllModels,
  getModelsByProvider,
} from "../../types/aiService";
import { useTranslation } from "react-i18next";

interface ModelSelectorProps {
  selectedModel?: string;
  onModelSelect: (modelId: string) => void;
  provider?: AIProvider;
  showAllProviders?: boolean;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  showPricing?: boolean;
  showCapabilities?: boolean;
  compact?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelSelect,
  provider,
  showAllProviders = false,
  className,
  disabled = false,
  placeholder,
  showPricing = true,
  showCapabilities = true,
  compact = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModelInfo, setSelectedModelInfo] =
    useState<ModelOption | null>(null);
  const placeholderText = placeholder ?? t("modelSelector.placeholder");

  useEffect(() => {
    if (showAllProviders) {
      setModels(getAllModels());
    } else if (provider) {
      setModels(getModelsByProvider(provider));
    } else {
      setModels([]);
    }
  }, [provider, showAllProviders]);

  useEffect(() => {
    if (selectedModel) {
      const modelInfo = models.find((m) => m.id === selectedModel);
      setSelectedModelInfo(modelInfo || null);
    } else {
      setSelectedModelInfo(null);
    }
  }, [selectedModel, models]);

  const getProviderIcon = (provider: AIProvider) => {
    switch (provider) {
      case "openai":
        return <Brain className="w-4 h-4" />;
      case "gemini":
        return <Zap className="w-4 h-4" />;
      case "grok":
        return <Eye className="w-4 h-4" />;
      default:
        return <Cpu className="w-4 h-4" />;
    }
  };

  const getProviderColor = (provider: AIProvider) => {
    switch (provider) {
      case "openai":
        return "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400";
      case "gemini":
        return "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
      case "grok":
        return "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400";
      default:
        return "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const formatPrice = (price: number) => {
    if (price < 1) {
      return `$${price.toFixed(3)}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const hasPricing = (model: ModelOption) =>
    model.pricing.input > 0 || model.pricing.output > 0;

  const hasContextWindow = (model: ModelOption) => model.contextWindow > 0;

  const getCapabilityIcon = (capability: string) => {
    switch (capability) {
      case "vision":
        return <Eye className="w-3 h-3" />;
      case "audio":
        return <Cpu className="w-3 h-3" />;
      case "video":
        return <Cpu className="w-3 h-3" />;
      case "function-calling":
        return <Cpu className="w-3 h-3" />;
      case "reasoning":
        return <Brain className="w-3 h-3" />;
      case "thinking":
        return <Brain className="w-3 h-3" />;
      default:
        return <CheckCircle className="w-3 h-3" />;
    }
  };

  const getCapabilityLabel = (capability: string) =>
    t(`modelSelector.capabilities.${capability}`, capability);

  const groupedModels = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<AIProvider, ModelOption[]>);

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full justify-between text-left font-normal",
          !selectedModelInfo && "text-muted-foreground",
          compact && "h-8 text-sm"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedModelInfo ? (
            <>
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                  getProviderColor(selectedModelInfo.provider)
                )}
              >
                {getProviderIcon(selectedModelInfo.provider)}
                {selectedModelInfo.provider.toUpperCase()}
              </div>
              <span className="truncate">{selectedModelInfo.name}</span>
              {showPricing && !compact && hasPricing(selectedModelInfo) && (
                <span className="text-xs text-muted-foreground">
                  {t("modelSelector.pricePerMillion", { price: formatPrice(selectedModelInfo.pricing.input) })}
                </span>
              )}
            </>
          ) : (
            <span>{placeholderText}</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "transform rotate-180"
          )}
        />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-96 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {Object.entries(groupedModels).map(
            ([providerKey, providerModels]) => (
              <div key={providerKey}>
                {showAllProviders && (
                  <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      {getProviderIcon(providerKey as AIProvider)}
                      {providerKey.toUpperCase()}
                    </div>
                  </div>
                )}
                {providerModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelSelect(model.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full border-b border-gray-100 px-3 py-2 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/80 last:border-b-0",
                      selectedModel === model.id &&
                        "border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30",
                      compact && "py-1"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          {!showAllProviders && (
                            <div
                              className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
                                getProviderColor(model.provider)
                              )}
                            >
                              {getProviderIcon(model.provider)}
                            </div>
                          )}
                          <span className="font-medium text-sm">
                            {model.name}
                          </span>
                          {selectedModel === model.id && (
                            <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        {!compact && (
                          <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                            {model.description}
                          </p>
                        )}
                        {showCapabilities && !compact && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {model.capabilities
                              .slice(0, 4)
                              .map((capability) => (
                                <span
                                  key={capability}
                                  className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                >
                                  {getCapabilityIcon(capability)}
                                  {getCapabilityLabel(capability)}
                                </span>
                              ))}
                            {model.capabilities.length > 4 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {t("modelSelector.moreCapabilities", {
                                  count: model.capabilities.length - 4,
                                })}
                              </span>
                            )}
                          </div>
                        )}
                        {showPricing && !compact && (hasPricing(model) || hasContextWindow(model)) && (
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            {hasPricing(model) && (
                              <>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  {t("modelSelector.inputPrice", {
                                    price: formatPrice(model.pricing.input),
                                  })}
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  {t("modelSelector.outputPrice", {
                                    price: formatPrice(model.pricing.output),
                                  })}
                                </div>
                              </>
                            )}
                            {hasContextWindow(model) && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {t("modelSelector.contextWindow", {
                                  value: (model.contextWindow / 1000).toFixed(0),
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
          {models.length === 0 && (
            <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm">{t("modelSelector.noModels")}</p>
              {!showAllProviders && !provider && (
                <p className="text-xs">{t("modelSelector.selectProvider")}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
