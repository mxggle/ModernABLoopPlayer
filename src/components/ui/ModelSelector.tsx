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
  placeholder = "Select a model...",
  showPricing = true,
  showCapabilities = true,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModelInfo, setSelectedModelInfo] =
    useState<ModelOption | null>(null);

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
        return "text-green-600 bg-green-50";
      case "gemini":
        return "text-blue-600 bg-blue-50";
      case "grok":
        return "text-purple-600 bg-purple-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const formatPrice = (price: number) => {
    if (price < 1) {
      return `$${price.toFixed(3)}`;
    }
    return `$${price.toFixed(2)}`;
  };

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
              {showPricing && !compact && (
                <span className="text-xs text-muted-foreground">
                  {formatPrice(selectedModelInfo.pricing.input)}/1M
                </span>
              )}
            </>
          ) : (
            <span>{placeholder}</span>
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
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-96 overflow-auto">
          {Object.entries(groupedModels).map(
            ([providerKey, providerModels]) => (
              <div key={providerKey}>
                {showAllProviders && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
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
                      "w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0",
                      selectedModel === model.id &&
                        "bg-blue-50 border-blue-200",
                      compact && "py-1"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
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
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        {!compact && (
                          <p className="text-xs text-gray-600 mb-2">
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
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                                >
                                  {getCapabilityIcon(capability)}
                                  {capability}
                                </span>
                              ))}
                            {model.capabilities.length > 4 && (
                              <span className="text-xs text-gray-500">
                                +{model.capabilities.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                        {showPricing && !compact && (
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              Input: {formatPrice(model.pricing.input)}/1M
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              Output: {formatPrice(model.pricing.output)}/1M
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {(model.contextWindow / 1000).toFixed(0)}K context
                            </div>
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
            <div className="px-3 py-4 text-center text-gray-500">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm">No models available</p>
              {!showAllProviders && !provider && (
                <p className="text-xs">Please select a provider first</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
