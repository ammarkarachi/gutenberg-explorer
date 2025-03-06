import axios from 'axios';
import { truncateForAnalysis, estimateTokenCount } from './chapterUtils';
import { AnalysisType } from '@/types';
import { rateLimitManager, withRateLimit } from './rateLimitManager';

// Get API key from environment variable - will be set by TextAnalysis component
const getGroqApiKey = (): string => {
  return process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Maximum tokens per model
const MODEL_TOKEN_LIMITS = 8192

interface GroqRequestParams {
  model: string;
  messages: {
    role: 'system' | 'user';
    content: string;
  }[];
  temperature?: number;
  max_tokens?: number;
}


/**
 * Makes a request to the Groq API
 */
async function makeGroqRequest(params: GroqRequestParams) {

  
  // Get API key at request time
  const apiKey = getGroqApiKey();
  
  // Validate API key is present
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key is required for text analysis');
  }
  
  // Use withRateLimit to handle rate limiting
  return withRateLimit(async () => {
    try {
      const response = await axios.post(GROQ_API_URL, params, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.choices[0].message.content;
    } catch (error: any) {
      // Provide more helpful error messages for common issues
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Invalid API key. Please check your credentials and try again.');
        } else if (error.response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else {
          throw new Error(`API error: ${error.response.data.message || error.response.statusText}`);
        }
      }
      throw error; // Re-throw if not a response error
    }
  }, 'groq');
}


/**
 * Optimizes prompt length based on model token limit
 */
function optimizePromptForTokenLimit(
  prompt: string, 
  modelName: string,
  reservedTokens: number = 1000  // Reserve tokens for system message and response
): string {
  // Get model token limit
  const tokenLimit = MODEL_TOKEN_LIMITS;
  
  // Calculate available tokens for the prompt
  const availableTokens = tokenLimit - reservedTokens;
  
  // Estimate current prompt token count
  const estimatedTokens = estimateTokenCount(prompt.length);
  
  // If prompt fits within available tokens, return as is
  if (estimatedTokens <= availableTokens) {
    return prompt;
  }
  
  // Calculate how much we need to reduce
  const reductionFactor = availableTokens / estimatedTokens;
  
  // Extract the actual text from the prompt template
  let textStart = prompt.indexOf('"""') + 3;
  let textEnd = prompt.lastIndexOf('"""');
  
  if (textStart >= 3 && textEnd > textStart) {
    // Extract the text between the triple quotes
    const textToCompress = prompt.substring(textStart, textEnd);
    const promptPrefix = prompt.substring(0, textStart);
    const promptSuffix = prompt.substring(textEnd);
    
    // Calculate how many characters we can keep
    const keepLength = Math.floor(textToCompress.length * reductionFactor);
    
    // Compress the text
    const compressedText = truncateForAnalysis(
      textToCompress, 
      'default',
      keepLength
    );
    
    // Reconstruct the prompt
    return promptPrefix + compressedText + promptSuffix;
  }
  
  // Fallback if we can't find the text to compress
  return prompt.substring(0, Math.floor(prompt.length * reductionFactor)) + '...';
}

/**
 * Generates prompts for different analysis types
 */
function getAnalysisPrompt(chapterContent: string, analysisType: AnalysisType): string {
  // Truncate content to avoid token limits with smart compression
  const truncatedContent = truncateForAnalysis(chapterContent, analysisType);
  
  switch (analysisType) {
    case 'characters':
      return `Analyze the following text excerpt from a book and identify the key characters present in this chapter. For each character, provide their name, a brief description of their role in this chapter, and their importance level (Primary, Secondary, Minor).
      
Text excerpt:
"""
${truncatedContent}
"""

Format your response as a JSON array with objects containing "name", "description", and "importance" fields. Do not include any explanatory text outside the JSON array.`;

    case 'summary':
      return `Create a concise summary of the following chapter from a book. Capture the main events, key plot developments, and significant character interactions.
      
Text excerpt:
"""
${truncatedContent}
"""

Provide the summary as a single cohesive paragraph of approximately 150-200 words. Do not include any introductory or concluding remarks.`;

    case 'sentiment':
      return `Perform sentiment analysis on the following chapter from a book. Analyze the emotional tone throughout the chapter.
      
Text excerpt:
"""
${truncatedContent}
"""

Provide your analysis in JSON format with the following structure:
{
  "overall": "The dominant sentiment of the chapter (Positive/Negative/Neutral/Mixed)",
  "beginning": "Sentiment at the start of the chapter",
  "middle": "Sentiment in the middle of the chapter",
  "end": "Sentiment at the end of the chapter",
  "analysis": "A brief paragraph explaining the emotional flow and tone throughout the chapter"
}

Do not include any text outside of this JSON structure.`;

    case 'themes':
      return `Identify the major themes and motifs present in the following chapter from a book.
      
Text excerpt:
"""
${truncatedContent}
"""

Format your response as a JSON array of objects, each with "theme" and "description" fields. Identify 3-5 prominent themes. Do not include any explanatory text outside the JSON array.`;

    default:
      return '';
  }
}

/**
 * Analyzes text using Groq API with token optimization
 */
export async function analyzeWithGroq(
  chapterContent: string, 
  analysisType: AnalysisType,
  modelName: string = 'llama3-8b-8192'  // Default model
): Promise<any> {
  const prompt = getAnalysisPrompt(chapterContent, analysisType);
  
  if (!prompt) {
    throw new Error(`Unsupported analysis type: ${analysisType}`);
  }
  
  // Optimize prompt for token limit
  const optimizedPrompt = optimizePromptForTokenLimit(prompt, modelName);
  
  const params: GroqRequestParams = {
    model: modelName,
    messages: [
      {
        role: 'system',
        content: 'You are a literary analysis assistant specializing in detailed textual analysis. Provide insightful, concise and accurate analysis following the user\'s requested format exactly. Make sure to give complete responses'
      },
      {
        role: 'user',
        content: optimizedPrompt
      }
    ],
    temperature: 0.2,  // Lower temperature for more consistent responses
  };
  
  const response = await makeGroqRequest(params);
  
  // Try to parse JSON if expected
  if (analysisType === 'characters' || analysisType === 'themes' || analysisType === 'sentiment') {
    try {
      // Find JSON in the response (if there's any text around it)
      const jsonMatch = response.match(/(\[|\{).*(\]|\})/s);
    let jsonStr = jsonMatch ? jsonMatch[0] : response;
    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      // Attempt to complete the JSON if it doesn't match
      if (jsonStr.startsWith('{')) {
        jsonStr += '}';
      } else if (jsonStr.startsWith('[')) {
        jsonStr += ']';
      }
      return JSON.parse(jsonStr);
    }
    } catch (error) {
      console.error('Error parsing JSON from Groq response:', error);
      return response; // Return the raw text if parsing fails
    }
  }
  
  return response;
}

/**
 * Detects the language of text using Groq API with optimization
 */
export async function detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
  // Use a cached result if available
  const cachedResult = getCachedLanguageDetection(text);
  if (cachedResult) {
    return cachedResult;
  }
  
  // Truncate text for language detection - we don't need much for this task
  // Take a sample from beginning, middle, and end to cover potential language switches
  const textLength = text.length;
  const sampleSize = Math.min(300, Math.floor(textLength / 3));
  
  const beginning = text.slice(0, sampleSize);
  const middle = text.slice(Math.floor(textLength / 2) - Math.floor(sampleSize / 2), 
                            Math.floor(textLength / 2) + Math.floor(sampleSize / 2));
  const end = text.slice(textLength - sampleSize);
  
  const sampleText = `${beginning}\n\n${middle}\n\n${end}`;
  
  // Check rate limits before proceeding
  const limitsInfo = rateLimitManager.getLimitsInfo('groq');
  if (limitsInfo.minuteLimit.remaining <= 0) {
    const waitTime = rateLimitManager.getTimeToWait('groq');
    const waitSeconds = Math.ceil(waitTime / 1000);
    throw new Error(`Rate limit reached. Please try again in ${waitSeconds} seconds.`);
  }
  
  const params: GroqRequestParams = {
    model: 'llama3-70b-8192', // Can use a smaller model for language detection
    messages: [
      {
        role: 'system',
        content: 'You are a language detection expert. Analyze the provided text and determine its language.'
      },
      {
        role: 'user',
        content: `Detect the language of the following text and return only a JSON object with "language" (full language name) and "confidence" (number from 0-1) properties.
        
Text to analyze:
"""
${sampleText}
"""

Respond only with the JSON object, no additional text.`
      }
    ],
    temperature: 0.1
  };
  
  const response = await makeGroqRequest(params);
  
  try {
    const jsonMatch = response.match(/(\{).*(\})/s);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    const result = JSON.parse(jsonStr);
    
    // Cache the result
    cacheLanguageDetection(text, result);
    
    return result;
  } catch (error) {
    console.error('Error parsing language detection response:', error);
    return { language: 'Unknown', confidence: 0 };
  }
}

// Simple in-memory cache for language detection
const languageCache = new Map<string, { language: string; confidence: number }>();

function getCachedLanguageDetection(text: string): { language: string; confidence: number } | null {
  // Use first 100 chars as key to avoid huge keys
  const key = text.slice(0, 100);
  return languageCache.get(key) || null;
}

function cacheLanguageDetection(text: string, result: { language: string; confidence: number }): void {
  const key = text.slice(0, 100);
  languageCache.set(key, result);
}

/**
 * Get current rate limit information
 */
export function getGroqRateLimits() {
  return rateLimitManager.getLimitsInfo('groq');
}

/**
 * Calculates the optimal compression level based on text length and model constraints
 */
export function calculateCompressionOptions(textLength: number, analysisType: AnalysisType) {
  // Estimate token count based on text length
  const estimatedTokens = estimateTokenCount(textLength);
  
  // Default to minimum compression
  let compressionLevel = 1;
  let modelName = 'llama3-70b-8192';
  let shouldCompress = false;
  
  // Calculate appropriate compression level based on estimated tokens
  if (estimatedTokens > 7000) {
    // For very long texts, use high compression
    compressionLevel = 5;
    shouldCompress = true;
  } else if (estimatedTokens > 5000) {
    compressionLevel = 4;
    shouldCompress = true;
  } else if (estimatedTokens > 3000) {
    compressionLevel = 3;
    shouldCompress = true;
  } else if (estimatedTokens > 2000) {
    compressionLevel = 2;
    shouldCompress = true;
  }
  
  // For theme analysis, which benefits from more context, use a higher capacity model if available
  if (analysisType === 'themes' && estimatedTokens > 6000) {
    modelName = 'mixtral-8x7b-32768';
  }
  
  return {
    compressionLevel,
    modelName,
    shouldCompress,
    estimatedTokens,
    estimatedRequestTokens: estimatedTokens + 500, // Include prompt overhead
    estimatedCost: (estimatedTokens / 1000) * 0.0004 // Approximate cost at $0.0004 per 1K tokens
  };
}