import { OpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";
import { createXai } from "@ai-sdk/xai";
import { generateText } from "ai";

export interface ExplanationResult {
  translation?: string;
  explanation: string;
  grammar?: string;
  language?: string;
  difficulty?: string;
  keyWords?: string[];
}

export interface AIServiceConfig {
  openaiApiKey?: string;
  geminiApiKey?: string;
  grokApiKey?: string;
  preferredService?: "openai" | "gemini" | "grok";
  targetLanguage?: string;
  strictMode?: boolean;
}

export class AIService {
  private openai?: OpenAI;
  private gemini?: GoogleGenAI;
  private grok?: ReturnType<typeof createXai>;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;

    if (config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.openaiApiKey,
        dangerouslyAllowBrowser: true,
      });
    }

    if (config.geminiApiKey) {
      this.gemini = new GoogleGenAI({
        apiKey: config.geminiApiKey,
      });
    }

    if (config.grokApiKey) {
      this.grok = createXai({
        apiKey: config.grokApiKey,
      });
    }
  }

  async explainText(
    text: string,
    targetLanguage?: string
  ): Promise<ExplanationResult> {
    // Use provided target language or fall back to config
    const language = targetLanguage || this.config.targetLanguage || "English";
    const prompt = this.createExplanationPrompt(text, language);

    // Try preferred service first
    const preferredService = this.config.preferredService || "openai";
    const strictMode = this.config.strictMode !== false; // Default to strict mode

    console.log(
      `Using ${preferredService} service (strict mode: ${strictMode})`
    );

    try {
      if (preferredService === "openai" && this.openai) {
        return await this.explainWithOpenAI(prompt);
      } else if (preferredService === "gemini" && this.gemini) {
        return await this.explainWithGemini(prompt);
      } else if (preferredService === "grok" && this.grok) {
        return await this.explainWithGrok(prompt);
      }
    } catch (error) {
      console.warn(`Failed with ${preferredService}:`, error);

      // If strict mode is enabled, don't fallback to other services
      if (strictMode) {
        throw new Error(
          `Failed to generate explanation with ${preferredService}. Fallback to other services is disabled. ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    // Only fallback if strict mode is disabled
    if (!strictMode) {
      console.log("Strict mode disabled, trying fallback services...");

      // Fallback to other services
      const services = ["openai", "gemini", "grok"].filter(
        (s) => s !== preferredService
      );

      for (const service of services) {
        try {
          if (service === "openai" && this.openai) {
            return await this.explainWithOpenAI(prompt);
          } else if (service === "gemini" && this.gemini) {
            return await this.explainWithGemini(prompt);
          } else if (service === "grok" && this.grok) {
            return await this.explainWithGrok(prompt);
          }
        } catch (error) {
          console.warn(`Failed with ${service}:`, error);
        }
      }
    }

    throw new Error(
      `Unable to generate explanation with ${preferredService}. Please check your API key and try again.`
    );
  }

  private createExplanationPrompt(
    text: string,
    targetLanguage: string
  ): string {
    const languageInstructions =
      this.getLanguageSpecificInstructions(targetLanguage);

    return `You are a language learning assistant. Please analyze the following text and provide a response in JSON format.

Text to analyze: "${text}"
Target language for explanation: ${targetLanguage}

IMPORTANT INSTRUCTIONS:
- If the original text is NOT in ${targetLanguage}, provide a translation to ${targetLanguage}
- Provide the explanation in ${targetLanguage} (not English)
- All text fields except "language" should be in ${targetLanguage}
${languageInstructions}

Please respond in this exact JSON format:
{
  "translation": "translation to ${targetLanguage} if needed, or null if already in ${targetLanguage}",
  "explanation": "detailed explanation of meaning and context in ${targetLanguage}",
  "grammar": "explanation of grammar structures, tenses, and linguistic patterns used in the text in ${targetLanguage}",
  "language": "detected language of original text (in English)",
  "difficulty": "beginner/intermediate/advanced",
  "keyWords": ["key vocabulary words in original language"]
}`;
  }

  private getLanguageSpecificInstructions(targetLanguage: string): string {
    switch (targetLanguage.toLowerCase()) {
      case "chinese":
        return `
- Use Simplified Chinese characters (简体中文)
- The explanation should be written entirely in Chinese
- If translating from Japanese/English to Chinese, provide the Chinese translation
- Example: "explanation": "这句话的意思是..."`;
      case "japanese":
        return `
- Use appropriate Japanese script (hiragana, katakana, kanji)
- The explanation should be written entirely in Japanese
- Example: "explanation": "この文章の意味は..."`;
      case "korean":
        return `
- Use Korean Hangul script
- The explanation should be written entirely in Korean
- Example: "explanation": "이 문장의 의미는..."`;
      case "spanish":
        return `
- The explanation should be written entirely in Spanish
- Example: "explanation": "Esta frase significa..."`;
      case "french":
        return `
- The explanation should be written entirely in French
- Example: "explanation": "Cette phrase signifie..."`;
      default:
        return `- The explanation should be written entirely in ${targetLanguage}`;
    }
  }

  private async explainWithOpenAI(prompt: string): Promise<ExplanationResult> {
    if (!this.openai) {
      throw new Error("OpenAI not configured");
    }

    console.log("Sending prompt to OpenAI:", prompt);

    const response = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful language learning assistant. Provide clear, educational explanations that help users understand text better. Always respond in the target language specified in the prompt.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    console.log("Received from OpenAI:", content);

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      console.error("Failed to parse OpenAI JSON response:", error);
      // Fallback if JSON parsing fails
      return {
        explanation: content,
        language: "unknown",
        difficulty: "unknown",
        keyWords: [],
      };
    }
  }

  private async explainWithGemini(prompt: string): Promise<ExplanationResult> {
    if (!this.gemini) {
      throw new Error("Gemini not configured");
    }

    console.log("Sending prompt to Gemini:", prompt);

    const response = await this.gemini.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    });

    const content = response.text;
    console.log("Received from Gemini:", content);

    if (!content) {
      throw new Error("No response from Gemini");
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      console.error("Failed to parse Gemini JSON response:", error);
      // Fallback if JSON parsing fails
      return {
        explanation: content,
        language: "unknown",
        difficulty: "unknown",
        keyWords: [],
      };
    }
  }

  private async explainWithGrok(prompt: string): Promise<ExplanationResult> {
    if (!this.grok) {
      throw new Error("Grok not configured");
    }

    console.log("Sending prompt to Grok:", prompt);

    try {
      const response = await generateText({
        model: this.grok("grok-2-flash"),
        messages: [
          {
            role: "system",
            content:
              "You are a helpful language learning assistant. Provide clear, educational explanations that help users understand text better. Always respond in the target language specified in the prompt.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        maxTokens: 500,
      });

      console.log("Full Grok response:", response);

      // For xAI Grok, the response might be in different fields
      // Check for text, reasoning content, or other possible response fields
      let content = response.text;

      // If response.text is empty, check if there's reasoning content or other fields
      if (!content && "reasoning" in response) {
        content = (response as { reasoning: string }).reasoning;
      }

      // If still no content, check the raw response structure for xAI specific fields
      if (!content && "choices" in response) {
        const responseWithChoices = response as {
          choices: Array<{
            message: { content?: string; reasoning_content?: string };
          }>;
        };
        const message = responseWithChoices.choices?.[0]?.message;
        if (message) {
          content = message.content || message.reasoning_content || "";
        }
      }

      console.log("Extracted content from Grok:", content);

      if (!content) {
        console.error(
          "No content found in Grok response. Full response:",
          JSON.stringify(response, null, 2)
        );
        throw new Error("No response content from Grok");
      }

      try {
        return JSON.parse(content);
      } catch (error) {
        console.error("Failed to parse Grok JSON response:", error);
        console.error("Raw response content:", content);
        // Fallback if JSON parsing fails
        return {
          explanation: content,
          language: "unknown",
          difficulty: "unknown",
          keyWords: [],
        };
      }
    } catch (error) {
      console.error("Error calling Grok API:", error);
      throw new Error(
        `Grok API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  updateConfig(newConfig: Partial<AIServiceConfig>) {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: newConfig.openaiApiKey,
        dangerouslyAllowBrowser: true,
      });
    }

    if (newConfig.geminiApiKey) {
      this.gemini = new GoogleGenAI({
        apiKey: newConfig.geminiApiKey,
      });
    }

    if (newConfig.grokApiKey) {
      this.grok = createXai({
        apiKey: newConfig.grokApiKey,
      });
    }
  }

  isConfigured(): boolean {
    return !!(this.openai || this.gemini || this.grok);
  }

  getAvailableServices(): string[] {
    const services = [];
    if (this.openai) services.push("OpenAI");
    if (this.gemini) services.push("Google Gemini");
    if (this.grok) services.push("xAI Grok");
    return services;
  }
}
