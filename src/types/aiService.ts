// AI Service Types and Configurations
export type AIProvider = "openai" | "gemini" | "grok" | "ollama";

// OpenAI Models - Updated March 2026
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
  "gpt-5": {
    id: "gpt-5",
    name: "GPT-5",
    description: "Most capable OpenAI model for complex reasoning and agentic tasks",
    contextWindow: 400000,
    maxOutputTokens: 65536,
    inputPricing: 1.25,
    outputPricing: 10.0,
    capabilities: ["text", "vision", "audio", "reasoning", "function-calling"],
  },
  "gpt-5-mini": {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    description: "Fast and cost-efficient version of GPT-5",
    contextWindow: 400000,
    maxOutputTokens: 65536,
    inputPricing: 0.25,
    outputPricing: 2.0,
    capabilities: ["text", "vision", "reasoning", "function-calling"],
  },
  "gpt-4.1": {
    id: "gpt-4.1",
    name: "GPT-4.1",
    description: "Powerful and versatile with 1M context, great instruction following",
    contextWindow: 1047576,
    maxOutputTokens: 65536,
    inputPricing: 2.0,
    outputPricing: 8.0,
    capabilities: ["text", "vision", "function-calling"],
  },
  "gpt-4.1-mini": {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    description: "Great balance of power, speed, and affordability",
    contextWindow: 1047576,
    maxOutputTokens: 65536,
    inputPricing: 0.4,
    outputPricing: 1.6,
    capabilities: ["text", "vision", "function-calling"],
  },
  "gpt-4.1-nano": {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    description: "Fastest and most affordable GPT-4.1 variant",
    contextWindow: 1047576,
    maxOutputTokens: 65536,
    inputPricing: 0.1,
    outputPricing: 0.4,
    capabilities: ["text", "vision", "function-calling"],
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Advanced multimodal model (legacy, available via API)",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    inputPricing: 2.5,
    outputPricing: 10.0,
    capabilities: ["text", "vision", "audio", "function-calling"],
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Affordable small model (legacy, available via API)",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    inputPricing: 0.15,
    outputPricing: 0.6,
    capabilities: ["text", "vision", "function-calling"],
  },
  o3: {
    id: "o3",
    name: "o3",
    description: "Advanced reasoning model for complex STEM problems",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    inputPricing: 2.0,
    outputPricing: 8.0,
    capabilities: ["text", "reasoning", "function-calling"],
  },
  "o4-mini": {
    id: "o4-mini",
    name: "o4-mini",
    description: "Latest compact reasoning model with vision support",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    inputPricing: 1.1,
    outputPricing: 4.4,
    capabilities: ["text", "vision", "reasoning", "function-calling"],
  },
};

// Gemini Models - Updated March 2026 from official documentation
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
  "gemini-3.1-pro": {
    id: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    description: "Most powerful Gemini model with 2M context for complex multimodal tasks",
    contextWindow: 2097152,
    maxOutputTokens: 65536,
    inputPricing: 2.0,
    outputPricing: 12.0,
    capabilities: [
      "text",
      "vision",
      "audio",
      "video",
      "thinking",
      "function-calling",
      "code-execution",
      "structured-outputs",
    ],
  },
  "gemini-3-flash": {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    description: "Frontier intelligence with speed, search, and grounding",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    inputPricing: 0.5,
    outputPricing: 3.0,
    capabilities: [
      "text",
      "vision",
      "audio",
      "video",
      "thinking",
      "function-calling",
      "code-execution",
      "structured-outputs",
    ],
  },
  "gemini-3.1-flash-lite": {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    description: "Cost-efficient Gemini 3 model for high-volume tasks",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    inputPricing: 0.25,
    outputPricing: 1.5,
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
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "State-of-the-art thinking model for code, math, and STEM",
    contextWindow: 2097152,
    maxOutputTokens: 65536,
    inputPricing: 1.25,
    outputPricing: 10.0,
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
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Best price-performance with adaptive thinking and 1M context",
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
  "gemini-2.5-flash-lite": {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    description: "Fastest and most cost-efficient model for at-scale usage",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    inputPricing: 0.1,
    outputPricing: 0.4,
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
};

// Grok Models - Updated March 2026 from xAI official documentation
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
  "grok-4-0709": {
    id: "grok-4-0709",
    name: "Grok 4",
    description: "Most advanced flagship reasoning model from xAI",
    contextWindow: 256000,
    maxOutputTokens: 131072,
    inputPricing: 3.0,
    outputPricing: 15.0,
    capabilities: ["text", "vision", "reasoning", "function-calling", "structured-outputs"],
  },
  "grok-4-fast-reasoning": {
    id: "grok-4-fast-reasoning",
    name: "Grok 4 Fast (Reasoning)",
    description: "Cost-efficient reasoning with 2M context window",
    contextWindow: 2000000,
    maxOutputTokens: 131072,
    inputPricing: 0.2,
    outputPricing: 0.5,
    capabilities: ["text", "reasoning", "function-calling", "structured-outputs"],
  },
  "grok-4-fast-non-reasoning": {
    id: "grok-4-fast-non-reasoning",
    name: "Grok 4 Fast",
    description: "Fastest and most affordable Grok 4 variant with 2M context",
    contextWindow: 2000000,
    maxOutputTokens: 131072,
    inputPricing: 0.2,
    outputPricing: 0.5,
    capabilities: ["text", "function-calling", "structured-outputs"],
  },
  "grok-3": {
    id: "grok-3",
    name: "Grok 3",
    description: "Previous generation powerful Grok model",
    contextWindow: 131072,
    maxOutputTokens: 131072,
    inputPricing: 3.0,
    outputPricing: 15.0,
    capabilities: ["text", "function-calling", "structured-outputs"],
  },
  "grok-3-mini": {
    id: "grok-3-mini",
    name: "Grok 3 Mini",
    description: "Fast and affordable mini reasoning model",
    contextWindow: 131072,
    maxOutputTokens: 131072,
    inputPricing: 0.3,
    outputPricing: 0.5,
    capabilities: ["text", "reasoning", "function-calling", "structured-outputs"],
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

// Default models for each provider - Updated March 2026
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: "gpt-4.1",
  gemini: "gemini-3-flash",
  grok: "grok-4-fast-non-reasoning",
  ollama: "llama3.2",
};

// Transcription Provider Types
export type TranscriptionProvider = "openai" | "groq" | "gemini" | "local-whisper";

export const DEFAULT_TRANSCRIPTION_PROVIDER: TranscriptionProvider = "openai";

export const TRANSCRIPTION_PROVIDERS: Record<TranscriptionProvider, { name: string; description: string; model: string }> = {
  openai: {
    name: "OpenAI Whisper",
    description: "High-quality transcription with word-level timestamps",
    model: "whisper-1",
  },
  groq: {
    name: "Groq Whisper",
    description: "Ultra-fast transcription powered by Groq LPU",
    model: "whisper-large-v3-turbo",
  },
  gemini: {
    name: "Google Gemini",
    description: "Multimodal AI transcription with speaker diarization",
    model: "gemini-3-flash",
  },
  "local-whisper": {
    name: "Local Whisper",
    description: "Self-hosted faster-whisper-server (localhost)",
    model: "configurable",
  },
};
