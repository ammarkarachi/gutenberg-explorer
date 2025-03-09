import axios from 'axios';
import { truncateForAnalysis, estimateTokenCount } from './chapterUtils';
import { AnalysisType } from '@/types';
import { rateLimitManager, withRateLimit } from './rateLimitManager';
/* eslint-disable @typescript-eslint/no-explicit-any */
const getGroqApiKey = (): string => {
  return process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const LARGE_MODEL = process.env.GROQ_LARGE_MODEL || 'llama-3.1-8b-instant'
const SMALL_MODEL = process.env.GROQ_SMALL_MODEL ||'llama3-8b-8192'
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

  
    const apiKey = getGroqApiKey();
  
    if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key is required for text analysis');
  }
  
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
            if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Invalid API key. Please check your credentials and try again.');
        } else if (error.response.status === 429) {
          throw error
        } else {
          throw new Error(`API error: ${error.response.data.message || error.response.statusText}`);
        }
      }
      throw error;     }
  }, 'groq');
}


/**
 * Optimizes prompt length based on model token limit
 */
function optimizePromptForTokenLimit(
  prompt: string, 
  analysisType: AnalysisType,
  modelName: string,
  reservedTokens: number = 1000  ): string {
    const tokenLimit = MODEL_TOKEN_LIMITS;
  
    const availableTokens = tokenLimit - reservedTokens;
  
    const estimatedTokens = estimateTokenCount(prompt.length);
  
    if (estimatedTokens <= availableTokens) {
    return prompt;
  }
  
    const reductionFactor = availableTokens / estimatedTokens;
  
    const textStart = prompt.indexOf('"""') + 3;
  const textEnd = prompt.lastIndexOf('"""');
  
  if (textStart >= 3 && textEnd > textStart) {
        const textToCompress = prompt.substring(textStart, textEnd);
    const promptPrefix = prompt.substring(0, textStart);
    const promptSuffix = prompt.substring(textEnd);
    
        const keepLength = Math.floor(textToCompress.length * reductionFactor);
    
        const compressedText = truncateForAnalysis(
      textToCompress, 
      analysisType,
      keepLength
    );
    
        return promptPrefix + compressedText + promptSuffix;
  }
  
    return prompt.substring(0, Math.floor(prompt.length * reductionFactor)) + '...';
}

/**
 * Generates prompts for different analysis types
 */
function getAnalysisPrompt(chapterContent: string, analysisType: AnalysisType): string {
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

    case 'character-graph':
      return `Extract Character Relationships for Visualization
Analyze this book and create a JSON character network with this structure:
{
  "nodes": [
    {
      "id": "character_name",
      "name": "Character Full Name",
      "group": "faction",
      "importance": 1-10
    }
  ],
  "links": [
    {
      "source": "character1_id",
      "target": "character2_id",
      "type": "relationship_type",
      "strength": 1-10,
      "sentiment": -5 to 5
    }
  ]
}
Instructions:
1. Include all named characters and important unnamed ones
2. Rate character importance (1-10)
3. Group characters by faction/family where possible
4. For relationships, include:
   - Type (family, friend, enemy, etc.)
   - Strength (1-10)
   - Sentiment (-5=negative, 5=positive)
5. Focus on significant relationships that drive the narrative
6. Use lowercase IDs without spaces
7. Do not include any explanatory text outside the JSON array.
Book content.:
${truncatedContent}`;
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
  modelName: string = LARGE_MODEL  ): Promise<any> {
  const prompt = getAnalysisPrompt(chapterContent, analysisType);
  
  if (!prompt) {
    throw new Error(`Unsupported analysis type: ${analysisType}`);
  }
  
    const optimizedPrompt = optimizePromptForTokenLimit(prompt, analysisType, modelName);
  
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
    temperature: 0.2,    };
  
  const response = await makeGroqRequest(params);
  
    if (analysisType === 'characters' || analysisType === 'themes' || analysisType === 'sentiment' || analysisType === 'character-graph') {
    try {
          const jsonMatch = response.match(/(\[|\{).*(\]|\})/s);
    let jsonStr = jsonMatch ? jsonMatch[0] : response;
    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
            console.error('Error parsing JSON from Groq response retry:', parseError);
      if (jsonStr.startsWith('{')) {
        jsonStr += '}';
      } else if (jsonStr.startsWith('[')) {
        jsonStr += ']';
      }
      
      return JSON.parse(jsonStr);
    }
    } catch (error) {
      console.error('Error parsing JSON from Groq response:', error);
      return response;     }
  }
  
  return response;
}

/**
 * Detects the language of text using Groq API with optimization
 */
export async function detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    const cachedResult = getCachedLanguageDetection(text);
  if (cachedResult) {
    return cachedResult;
  }
  
      const textLength = text.length;
  const sampleSize = Math.min(300, Math.floor(textLength / 3));
  
  const beginning = text.slice(0, sampleSize);
  const middle = text.slice(Math.floor(textLength / 2) - Math.floor(sampleSize / 2), 
                            Math.floor(textLength / 2) + Math.floor(sampleSize / 2));
  const end = text.slice(textLength - sampleSize);
  
  const sampleText = `${beginning}\n\n${middle}\n\n${end}`;
  
    const limitsInfo = rateLimitManager.getLimitsInfo('groq');
  if (limitsInfo.minuteLimit.remaining <= 0) {
    const waitTime = rateLimitManager.getTimeToWait('groq');
    const waitSeconds = Math.ceil(waitTime / 1000);
    throw new Error(`Rate limit reached. Please try again in ${waitSeconds} seconds.`);
  }
  
  const params: GroqRequestParams = {
    model: SMALL_MODEL,     messages: [
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
    
        cacheLanguageDetection(text, result);
    
    return result;
  } catch (error) {
    console.error('Error parsing language detection response:', error);
    return { language: 'Unknown', confidence: 0 };
  }
}

const languageCache = new Map<string, { language: string; confidence: number }>();

function getCachedLanguageDetection(text: string): { language: string; confidence: number } | null {
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
    const estimatedTokens = estimateTokenCount(textLength);
  
    let compressionLevel = 1;
  let modelName = 'llama3-70b-8192';
  let shouldCompress = false;
  
    if (estimatedTokens > 7000) {
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
  
    if (analysisType === 'themes' && estimatedTokens > 6000) {
    modelName = 'mixtral-8x7b-32768';
  }
  
  return {
    compressionLevel,
    modelName,
    shouldCompress,
    estimatedTokens,
    estimatedRequestTokens: estimatedTokens + 500,     estimatedCost: (estimatedTokens / 1000) * 0.0004   };
}