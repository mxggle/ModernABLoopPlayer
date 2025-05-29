// AI Service Types and Configurations
export type AIProvider = "openai" | "gemini" | "grok";

// OpenAI Models - Updated with latest 2025 models
export interface OpenAIModel {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  maxOutputTokens: number;
  inputPricing: number; // per 1M tokens
  outputPricing: number; // per 1M tokens
  capabilities: string[];
}

export const OPENAI_MODELS: Record<string, OpenAIModel> = {
  "o3-mini": {
    id: "o3-mini",
    name: "o3-mini",
    description: "Latest small reasoning model with high intelligence",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    inputPricing: 1.1,
    outputPricing: 4.4,
    capabilities: ["text", "reasoning", "function-calling"],
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Most advanced multimodal model",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputPricing: 2.5,
    outputPricing: 10.0,
    capabilities: ["text", "vision", "audio", "function-calling"],
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Affordable and intelligent small model",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    inputPricing: 0.15,
    outputPricing: 0.6,
    capabilities: ["text", "vision", "function-calling"],
  },
  "gpt-4-turbo": {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    description: "Previous generation flagship model",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputPricing: 10.0,
    outputPricing: 30.0,
    capabilities: ["text", "vision", "function-calling"],
  },
  "gpt-3.5-turbo": {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    description: "Fast and affordable model",
    contextWindow: 16385,
    maxOutputTokens: 4096,
    inputPricing: 0.5,
    outputPricing: 1.5,
    capabilities: ["text", "function-calling"],
  },
  o1: {
    id: "o1",
    name: "o1",
    description: "Reasoning model for complex problems",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    inputPricing: 15.0,
    outputPricing: 60.0,
    capabilities: ["text", "reasoning"],
  },
  "o1-mini": {
    id: "o1-mini",
    name: "o1-mini",
    description: "Faster reasoning model",
    contextWindow: 128000,
    maxOutputTokens: 65536,
    inputPricing: 3.0,
    outputPricing: 12.0,
    capabilities: ["text", "reasoning"],
  },
};

// Gemini Models - Updated with latest 2025 models from official documentation
export interface GeminiModel {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  maxOutputTokens: number;
  inputPricing: number; // per 1M tokens
  outputPricing: number; // per 1M tokens
  capabilities: string[];
}

export const GEMINI_MODELS: Record<string, GeminiModel> = {
  "gemini-2.5-flash-preview-05-20": {
    id: "gemini-2.5-flash-preview-05-20",
    name: "Gemini 2.5 Flash",
    description: "Best price-performance with adaptive thinking",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    inputPricing: 0.15,
    outputPricing: 0.6,
    capabilities: [
      "text",
      "vision",
      "audio",
      "video",
      "thinking",
      "function-calling",
      "code-execution",
    ],
  },
  "gemini-2.5-pro-preview-05-06": {
    id: "gemini-2.5-pro-preview-05-06",
    name: "Gemini 2.5 Pro",
    description: "Most powerful thinking model",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    inputPricing: 1.25,
    outputPricing: 5.0,
    capabilities: [
      "text",
      "vision",
      "audio",
      "video",
      "thinking",
      "function-calling",
      "code-execution",
    ],
  },
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Next generation features and speed",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    inputPricing: 0.075,
    outputPricing: 0.3,
    capabilities: ["text", "vision", "audio", "video", "function-calling"],
  },
  "gemini-2.0-flash-lite": {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite",
    description: "Cost efficient and low latency",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    inputPricing: 0.075,
    outputPricing: 0.3,
    capabilities: ["text", "vision", "audio", "video", "function-calling"],
  },
  "gemini-1.5-flash": {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    description: "Fast and versatile multimodal model",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    inputPricing: 0.075,
    outputPricing: 0.3,
    capabilities: ["text", "vision", "audio", "video", "function-calling"],
  },
  "gemini-1.5-pro": {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    description: "Complex reasoning tasks",
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    inputPricing: 1.25,
    outputPricing: 5.0,
    capabilities: ["text", "vision", "audio", "video", "function-calling"],
  },
};

// Grok Models - Updated with latest 2025 models from xAI
export interface GrokModel {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  maxOutputTokens: number;
  inputPricing: number; // per 1M tokens
  outputPricing: number; // per 1M tokens
  capabilities: string[];
}

export const GROK_MODELS: Record<string, GrokModel> = {
  "grok-3": {
    id: "grok-3",
    name: "Grok 3",
    description: "Latest and most advanced Grok model",
    contextWindow: 131072,
    maxOutputTokens: 131072,
    inputPricing: 2.0,
    outputPricing: 10.0,
    capabilities: ["text", "function-calling", "structured-outputs"],
  },
  "grok-3-beta": {
    id: "grok-3-beta",
    name: "Grok 3 Beta",
    description: "Beta version of Grok 3 with latest features",
    contextWindow: 131072,
    maxOutputTokens: 131072,
    inputPricing: 2.0,
    outputPricing: 10.0,
    capabilities: ["text", "function-calling", "structured-outputs"],
  },
  "grok-3-mini-fast-beta": {
    id: "grok-3-mini-fast-beta",
    name: "Grok 3 Mini Fast",
    description: "Fast and efficient mini version of Grok 3",
    contextWindow: 131072,
    maxOutputTokens: 131072,
    inputPricing: 1.0,
    outputPricing: 5.0,
    capabilities: ["text", "function-calling"],
  },
  "grok-2-1212": {
    id: "grok-2-1212",
    name: "Grok 2",
    description: "Previous generation Grok model",
    contextWindow: 131072,
    maxOutputTokens: 131072,
    inputPricing: 2.0,
    outputPricing: 10.0,
    capabilities: ["text", "function-calling"],
  },
  "grok-2-vision-1212": {
    id: "grok-2-vision-1212",
    name: "Grok 2 Vision",
    description: "Grok 2 with vision capabilities",
    contextWindow: 32768,
    maxOutputTokens: 32768,
    inputPricing: 2.0,
    outputPricing: 10.0,
    capabilities: ["text", "vision", "function-calling"],
  },
};

// Request/Response Types for each provider
export interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant" | "function";
    content:
      | string
      | Array<{
          type: "text" | "image_url";
          text?: string;
          image_url?: { url: string };
        }>;
    name?: string;
    function_call?: Record<string, unknown>;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  functions?: Array<Record<string, unknown>>;
  function_call?: Record<string, unknown>;
  stream?: boolean;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      function_call?: Record<string, unknown>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface GeminiRequest {
  contents: Array<{
    role?: "user" | "model";
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
      fileData?: {
        mimeType: string;
        fileUri: string;
      };
    }>;
  }>;
  systemInstruction?: {
    role: string;
    parts: Array<{ text: string }>;
  };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
  tools?: Array<{
    functionDeclarations?: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>;
  }>;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
        functionCall?: Record<string, unknown>;
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface GrokRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

export interface GrokResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Unified AI Service Configuration
export interface AIServiceConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
}

// Unified Response Type
export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AIProvider;
  finishReason?: string;
}

// Model Selection Interface
export interface ModelOption {
  id: string;
  name: string;
  description: string;
  provider: AIProvider;
  contextWindow: number;
  maxOutputTokens: number;
  pricing: {
    input: number;
    output: number;
  };
  capabilities: string[];
}

// Get all available models
export function getAllModels(): ModelOption[] {
  const models: ModelOption[] = [];

  // Add OpenAI models
  Object.values(OPENAI_MODELS).forEach((model) => {
    models.push({
      id: model.id,
      name: model.name,
      description: model.description,
      provider: "openai",
      contextWindow: model.contextWindow,
      maxOutputTokens: model.maxOutputTokens,
      pricing: {
        input: model.inputPricing,
        output: model.outputPricing,
      },
      capabilities: model.capabilities,
    });
  });

  // Add Gemini models
  Object.values(GEMINI_MODELS).forEach((model) => {
    models.push({
      id: model.id,
      name: model.name,
      description: model.description,
      provider: "gemini",
      contextWindow: model.contextWindow,
      maxOutputTokens: model.maxOutputTokens,
      pricing: {
        input: model.inputPricing,
        output: model.outputPricing,
      },
      capabilities: model.capabilities,
    });
  });

  // Add Grok models
  Object.values(GROK_MODELS).forEach((model) => {
    models.push({
      id: model.id,
      name: model.name,
      description: model.description,
      provider: "grok",
      contextWindow: model.contextWindow,
      maxOutputTokens: model.maxOutputTokens,
      pricing: {
        input: model.inputPricing,
        output: model.outputPricing,
      },
      capabilities: model.capabilities,
    });
  });

  return models;
}

// Get models by provider
export function getModelsByProvider(provider: AIProvider): ModelOption[] {
  return getAllModels().filter((model) => model.provider === provider);
}

// Get model by ID
export function getModelById(modelId: string): ModelOption | undefined {
  return getAllModels().find((model) => model.id === modelId);
}

// Default models for each provider - Updated to use latest available models
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash-preview-05-20",
  grok: "grok-3",
};
