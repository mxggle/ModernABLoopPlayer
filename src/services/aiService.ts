import {
  AIProvider,
  AIServiceConfig,
  AIResponse,
  OpenAIRequest,
  OpenAIResponse,
  GeminiRequest,
  GeminiResponse,
  GrokRequest,
  GrokResponse,
  ModelOption,
  getAllModels,
  getModelById,
  DEFAULT_MODELS,
} from "../types/aiService";

export class UnifiedAIService {
  private static instance: UnifiedAIService;

  public static getInstance(): UnifiedAIService {
    if (!UnifiedAIService.instance) {
      UnifiedAIService.instance = new UnifiedAIService();
    }
    return UnifiedAIService.instance;
  }

  // OpenAI API call
  private async callOpenAI(
    config: AIServiceConfig,
    prompt: string
  ): Promise<AIResponse> {
    const model = getModelById(config.model);
    if (!model || model.provider !== "openai") {
      throw new Error(`Invalid OpenAI model: ${config.model}`);
    }

    const request: OpenAIRequest = {
      model: config.model,
      messages: [
        ...(config.systemPrompt
          ? [{ role: "system" as const, content: config.systemPrompt }]
          : []),
        { role: "user" as const, content: prompt },
      ],
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? model.maxOutputTokens,
      top_p: config.topP ?? 1,
      frequency_penalty: config.frequencyPenalty ?? 0,
      presence_penalty: config.presencePenalty ?? 0,
    };

    const response = await fetch(
      config.baseURL || "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data: OpenAIResponse = await response.json();

    return {
      content: data.choices[0]?.message?.content || "",
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: config.model,
      provider: "openai",
      finishReason: data.choices[0]?.finish_reason,
    };
  }

  // Gemini API call
  private async callGemini(
    config: AIServiceConfig,
    prompt: string
  ): Promise<AIResponse> {
    const model = getModelById(config.model);
    if (!model || model.provider !== "gemini") {
      throw new Error(`Invalid Gemini model: ${config.model}`);
    }

    const request: GeminiRequest = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      ...(config.systemPrompt
        ? {
            systemInstruction: {
              role: "system",
              parts: [{ text: config.systemPrompt }],
            },
          }
        : {}),
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        topP: config.topP ?? 1,
        maxOutputTokens: config.maxTokens ?? model.maxOutputTokens,
      },
    };

    const apiKey = config.apiKey;
    const baseURL =
      config.baseURL || "https://generativelanguage.googleapis.com/v1beta";
    const url = `${baseURL}/models/${config.model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data: GeminiResponse = await response.json();

    return {
      content: data.candidates[0]?.content?.parts[0]?.text || "",
      usage: {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount,
      },
      model: config.model,
      provider: "gemini",
      finishReason: data.candidates[0]?.finishReason,
    };
  }

  // Grok API call
  private async callGrok(
    config: AIServiceConfig,
    prompt: string
  ): Promise<AIResponse> {
    const model = getModelById(config.model);
    if (!model || model.provider !== "grok") {
      throw new Error(`Invalid Grok model: ${config.model}`);
    }

    const request: GrokRequest = {
      model: config.model,
      messages: [
        ...(config.systemPrompt
          ? [{ role: "system" as const, content: config.systemPrompt }]
          : []),
        { role: "user" as const, content: prompt },
      ],
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? model.maxOutputTokens,
      top_p: config.topP ?? 1,
    };

    const response = await fetch(
      config.baseURL || "https://api.x.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Grok API error: ${response.status} - ${error}`);
    }

    const data: GrokResponse = await response.json();

    return {
      content: data.choices[0]?.message?.content || "",
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: config.model,
      provider: "grok",
      finishReason: data.choices[0]?.finish_reason,
    };
  }

  // Main method to call any AI service
  public async generateResponse(
    config: AIServiceConfig,
    prompt: string
  ): Promise<AIResponse> {
    if (!config.apiKey) {
      throw new Error(`API key is required for ${config.provider}`);
    }

    switch (config.provider) {
      case "openai":
        return this.callOpenAI(config, prompt);
      case "gemini":
        return this.callGemini(config, prompt);
      case "grok":
        return this.callGrok(config, prompt);
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }

  // Get available models
  public getAvailableModels(): ModelOption[] {
    return getAllModels();
  }

  // Get models by provider
  public getModelsByProvider(provider: AIProvider): ModelOption[] {
    return getAllModels().filter((model) => model.provider === provider);
  }

  // Get default model for provider
  public getDefaultModel(provider: AIProvider): string {
    return DEFAULT_MODELS[provider];
  }

  // Validate API key format
  public validateApiKey(provider: AIProvider, apiKey: string): boolean {
    if (!apiKey || apiKey.trim() === "") return false;

    switch (provider) {
      case "openai":
        return apiKey.startsWith("sk-") && apiKey.length > 20;
      case "gemini":
        return apiKey.length > 20; // Gemini keys don't have a specific prefix
      case "grok":
        return apiKey.startsWith("xai-") || apiKey.length > 20;
      default:
        return false;
    }
  }

  // Test API connection
  public async testConnection(config: AIServiceConfig): Promise<boolean> {
    try {
      const testPrompt =
        "Hello, this is a test message. Please respond with 'OK'.";
      const response = await this.generateResponse(config, testPrompt);
      return response.content.length > 0;
    } catch (error) {
      console.error(`Connection test failed for ${config.provider}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const aiService = UnifiedAIService.getInstance();
