/**
 * Utility functions for intelligent sentence breaking in transcriptions
 * Supports multiple languages including Japanese, English, and other languages
 */

export interface SentenceBreakOptions {
  language?: string;
  maxLength?: number;
  minLength?: number;
}

/**
 * Break text into sentences using language-specific rules
 */
export function breakIntoSentences(
  text: string,
  options: SentenceBreakOptions = {}
): string[] {
  const { language = "auto", maxLength = 150, minLength = 10 } = options;

  // Clean up the text
  const cleanText = text.trim();
  if (!cleanText) return [];

  // Detect language if auto
  const detectedLanguage =
    language === "auto" ? detectLanguage(cleanText) : language;

  let sentences: string[] = [];

  if (detectedLanguage === "ja" || detectedLanguage === "japanese") {
    sentences = breakJapaneseSentences(cleanText);
  } else if (detectedLanguage === "zh" || detectedLanguage === "chinese") {
    sentences = breakChineseSentences(cleanText);
  } else {
    sentences = breakWesternSentences(cleanText);
  }

  // Post-process sentences
  sentences = sentences
    .map((s) => s.trim())
    .filter((s) => s.length >= minLength);

  // Split overly long sentences
  const finalSentences: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length > maxLength) {
      const splitSentences = splitLongSentence(
        sentence,
        maxLength,
        detectedLanguage
      );
      finalSentences.push(...splitSentences);
    } else {
      finalSentences.push(sentence);
    }
  }

  return finalSentences;
}

/**
 * Detect the language of the text
 */
function detectLanguage(text: string): string {
  // Simple language detection based on character patterns
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  const chinesePattern = /[\u4E00-\u9FAF]/;
  const koreanPattern = /[\uAC00-\uD7AF]/;

  if (japanesePattern.test(text)) return "ja";
  if (chinesePattern.test(text) && !japanesePattern.test(text)) return "zh";
  if (koreanPattern.test(text)) return "ko";

  return "en";
}

/**
 * Break Japanese sentences using proper punctuation marks
 */
function breakJapaneseSentences(text: string): string[] {
  // Japanese sentence endings: 。！？
  const sentences = text.split(/([。！？]+)/).filter((s) => s.trim());

  const result: string[] = [];
  let currentSentence = "";

  for (let i = 0; i < sentences.length; i++) {
    const part = sentences[i];

    if (/[。！？]+/.test(part)) {
      // This is punctuation, add it to current sentence and finalize
      currentSentence += part;
      if (currentSentence.trim()) {
        result.push(currentSentence.trim());
      }
      currentSentence = "";
    } else {
      // This is text content
      currentSentence += part;
    }
  }

  // Add any remaining content
  if (currentSentence.trim()) {
    result.push(currentSentence.trim());
  }

  return result;
}

/**
 * Break Chinese sentences using proper punctuation marks
 */
function breakChineseSentences(text: string): string[] {
  // Chinese sentence endings: 。！？；
  const sentences = text.split(/([。！？；]+)/).filter((s) => s.trim());

  const result: string[] = [];
  let currentSentence = "";

  for (let i = 0; i < sentences.length; i++) {
    const part = sentences[i];

    if (/[。！？；]+/.test(part)) {
      currentSentence += part;
      if (currentSentence.trim()) {
        result.push(currentSentence.trim());
      }
      currentSentence = "";
    } else {
      currentSentence += part;
    }
  }

  if (currentSentence.trim()) {
    result.push(currentSentence.trim());
  }

  return result;
}

/**
 * Break Western language sentences (English, Spanish, French, etc.)
 */
function breakWesternSentences(text: string): string[] {
  // More sophisticated sentence breaking for Western languages
  // Handle abbreviations, decimals, etc.

  // First, protect common abbreviations
  const protectedText = text
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|i\.e|e\.g)\./gi, "$1<DOT>")
    .replace(/\b\d+\.\d+/g, (match) => match.replace(".", "<DOT>"));

  // Split on sentence endings
  const sentences = protectedText.split(/([.!?]+\s+)/).filter((s) => s.trim());

  const result: string[] = [];
  let currentSentence = "";

  for (let i = 0; i < sentences.length; i++) {
    const part = sentences[i];

    if (/[.!?]+\s*/.test(part)) {
      currentSentence += part;
      if (currentSentence.trim()) {
        // Restore protected dots
        const restored = currentSentence.replace(/<DOT>/g, ".").trim();
        result.push(restored);
      }
      currentSentence = "";
    } else {
      currentSentence += part;
    }
  }

  if (currentSentence.trim()) {
    const restored = currentSentence.replace(/<DOT>/g, ".").trim();
    result.push(restored);
  }

  return result;
}

/**
 * Split overly long sentences at natural break points
 */
function splitLongSentence(
  sentence: string,
  maxLength: number,
  language: string
): string[] {
  if (sentence.length <= maxLength) return [sentence];

  const breakPoints = findNaturalBreakPoints(sentence, language);
  const result: string[] = [];
  let currentStart = 0;

  for (const breakPoint of breakPoints) {
    if (
      breakPoint - currentStart >= maxLength ||
      breakPoint === breakPoints[breakPoints.length - 1]
    ) {
      const segment = sentence.substring(currentStart, breakPoint).trim();
      if (segment) {
        result.push(segment);
      }
      currentStart = breakPoint;
    }
  }

  // Add any remaining content
  if (currentStart < sentence.length) {
    const remaining = sentence.substring(currentStart).trim();
    if (remaining) {
      result.push(remaining);
    }
  }

  return result.length > 0 ? result : [sentence];
}

/**
 * Find natural break points in a sentence
 */
function findNaturalBreakPoints(sentence: string, language: string): number[] {
  const breakPoints: number[] = [];

  if (language === "ja") {
    // Japanese break points: particles, conjunctions, commas
    const japaneseBreaks = /[、，,]/g;
    let match;
    while ((match = japaneseBreaks.exec(sentence)) !== null) {
      breakPoints.push(match.index + 1);
    }
  } else if (language === "zh") {
    // Chinese break points: commas, semicolons
    const chineseBreaks = /[，、；,]/g;
    let match;
    while ((match = chineseBreaks.exec(sentence)) !== null) {
      breakPoints.push(match.index + 1);
    }
  } else {
    // Western languages: commas, semicolons, conjunctions
    const westernBreaks =
      /[,;]\s+|\s+(and|but|or|however|therefore|moreover|furthermore)\s+/gi;
    let match;
    while ((match = westernBreaks.exec(sentence)) !== null) {
      breakPoints.push(match.index + match[0].length);
    }
  }

  // Always include the end of the sentence
  breakPoints.push(sentence.length);

  return breakPoints.sort((a, b) => a - b);
}

/**
 * Estimate timing for sentence segments based on word count and language
 */
export function estimateSegmentTiming(
  sentences: string[],
  totalDuration: number,
  language: string = "en"
): Array<{ startTime: number; endTime: number }> {
  // Calculate relative weights based on content length
  const weights = sentences.map((sentence) => {
    if (language === "ja" || language === "zh") {
      // For CJK languages, count characters
      return sentence.length;
    } else {
      // For other languages, count words
      return sentence.split(/\s+/).length;
    }
  });

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  const timings: Array<{ startTime: number; endTime: number }> = [];
  let currentTime = 0;

  for (let i = 0; i < sentences.length; i++) {
    const weight = weights[i];
    const duration = (weight / totalWeight) * totalDuration;

    timings.push({
      startTime: currentTime,
      endTime: currentTime + duration,
    });

    currentTime += duration;
  }

  return timings;
}
