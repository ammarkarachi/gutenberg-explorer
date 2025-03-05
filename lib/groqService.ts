import axios from 'axios';
import { truncateForAnalysis } from './chapterUtils';
import { AnalysisType } from '@/types';
import { Groq, } from 'groq-sdk';


const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
const DEFAULT_MODEL = 'deepseek-r1-distill-llama-70b';
const client = new Groq({
    apiKey: GROQ_API_KEY,
    dangerouslyAllowBrowser: true
});

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
    try {
        const response = await client.chat.completions.create({
            ...params,
            
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error calling Groq API:', error);
        throw new Error('Failed to analyze text using AI. Please try again later.');
    }
}

/**
 * Generates prompts for different analysis types
 */
function getAnalysisPrompt(chapterContent: string, analysisType: AnalysisType): string {
    // Truncate content to avoid token limits
    const truncatedContent = truncateForAnalysis(chapterContent);
    
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
 * Analyzes text using Groq API
 */
export async function analyzeWithGroq(
    chapterContent: string, 
    analysisType: AnalysisType,
    modelName: string = DEFAULT_MODEL  // Default model
): Promise<any> {
    const prompt = getAnalysisPrompt(chapterContent, analysisType);
    
    if (!prompt) {
        throw new Error(`Unsupported analysis type: ${analysisType}`);
    }
    
    const params: GroqRequestParams = {
        model: modelName,
        messages: [
            {
                role: 'system',
                content: 'You are a literary analysis assistant specializing in detailed textual analysis. Provide insightful, accurate analysis following the user\'s requested format exactly.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.2,  // Lower temperature for more consistent responses
        max_tokens: 2048   // Limit response length
    };
    
    const response = await makeGroqRequest(params);
    
    // Try to parse JSON if expected
    if (analysisType === 'characters' || analysisType === 'themes' || analysisType === 'sentiment') {
        try {
            // Find JSON in the response (if there's any text around it)
            const jsonMatch = response.match(/(\[|\{).*(\]|\})/s);
            const jsonStr = jsonMatch ? jsonMatch[0] : response;
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error('Error parsing JSON from Groq response:', error);
            return response; // Return the raw text if parsing fails
        }
    }
    
    return response;
}

/**
 * Detects the language of text using Groq API
 */
export async function detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    // Truncate text for language detection
    const sampleText = text.slice(0, 1000);
    
    const params: GroqRequestParams = {
        model: 'llama3-8b-8192', // Can use a smaller model for language detection
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
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('Error parsing language detection response:', error);
        return { language: 'Unknown', confidence: 0 };
    }
}

// // Replace with your actual environment variable name
// const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// interface GroqRequestParams {
//   model: string;
//   messages: {
//     role: 'system' | 'user';
//     content: string;
//   }[];
//   temperature?: number;
//   max_tokens?: number;
// }

// /**
//  * Makes a request to the Groq API
//  */
// async function makeGroqRequest(params: GroqRequestParams) {
//   try {
//     const response = await axios.post(GROQ_API_URL, params, {
//       headers: {
//         'Authorization': `Bearer ${GROQ_API_KEY}`,
//         'Content-Type': 'application/json'
//       }
//     });
    
//     return response.data.choices[0].message.content;
//   } catch (error) {
//     console.error('Error calling Groq API:', error);
//     throw new Error('Failed to analyze text using AI. Please try again later.');
//   }
// }

// /**
//  * Generates prompts for different analysis types
//  */
// function getAnalysisPrompt(chapterContent: string, analysisType: AnalysisType): string {
//   // Truncate content to avoid token limits
//   const truncatedContent = truncateForAnalysis(chapterContent);
  
//   switch (analysisType) {
//     case 'characters':
//       return `Analyze the following text excerpt from a book and identify the key characters present in this chapter. For each character, provide their name, a brief description of their role in this chapter, and their importance level (Primary, Secondary, Minor).
      
// Text excerpt:
// """
// ${truncatedContent}
// """

// Format your response as a JSON array with objects containing "name", "description", and "importance" fields. Do not include any explanatory text outside the JSON array.`;

//     case 'summary':
//       return `Create a concise summary of the following chapter from a book. Capture the main events, key plot developments, and significant character interactions.
      
// Text excerpt:
// """
// ${truncatedContent}
// """

// Provide the summary as a single cohesive paragraph of approximately 150-200 words. Do not include any introductory or concluding remarks.`;

//     case 'sentiment':
//       return `Perform sentiment analysis on the following chapter from a book. Analyze the emotional tone throughout the chapter.
      
// Text excerpt:
// """
// ${truncatedContent}
// """

// Provide your analysis in JSON format with the following structure:
// {
//   "overall": "The dominant sentiment of the chapter (Positive/Negative/Neutral/Mixed)",
//   "beginning": "Sentiment at the start of the chapter",
//   "middle": "Sentiment in the middle of the chapter",
//   "end": "Sentiment at the end of the chapter",
//   "analysis": "A brief paragraph explaining the emotional flow and tone throughout the chapter"
// }

// Do not include any text outside of this JSON structure.`;

//     case 'themes':
//       return `Identify the major themes and motifs present in the following chapter from a book.
      
// Text excerpt:
// """
// ${truncatedContent}
// """

// Format your response as a JSON array of objects, each with "theme" and "description" fields. Identify 3-5 prominent themes. Do not include any explanatory text outside the JSON array.`;

//     default:
//       return '';
//   }
// }

// /**
//  * Analyzes text using Groq API
//  */
// export async function analyzeWithGroq(
//   chapterContent: string, 
//   analysisType: AnalysisType,
//   modelName: string = 'DEFAULT_MODEL'  // Default model
// ): Promise<any> {
//   const prompt = getAnalysisPrompt(chapterContent, analysisType);
  
//   if (!prompt) {
//     throw new Error(`Unsupported analysis type: ${analysisType}`);
//   }
  
//   const params: GroqRequestParams = {
//     model: modelName,
//     messages: [
//       {
//         role: 'system',
//         content: 'You are a literary analysis assistant specializing in detailed textual analysis. Provide insightful, accurate analysis following the user\'s requested format exactly.'
//       },
//       {
//         role: 'user',
//         content: prompt
//       }
//     ],
//     temperature: 0.2,  // Lower temperature for more consistent responses
//     max_tokens: 2048   // Limit response length
//   };
  
//   const response = await makeGroqRequest(params);
  
//   // Try to parse JSON if expected
//   if (analysisType === 'characters' || analysisType === 'themes' || analysisType === 'sentiment') {
//     try {
//       // Find JSON in the response (if there's any text around it)
//       const jsonMatch = response.match(/(\[|\{).*(\]|\})/s);
//       const jsonStr = jsonMatch ? jsonMatch[0] : response;
//       return JSON.parse(jsonStr);
//     } catch (error) {
//       console.error('Error parsing JSON from Groq response:', error);
//       return response; // Return the raw text if parsing fails
//     }
//   }
  
//   return response;
// }

// /**
//  * Detects the language of text using Groq API
//  */
// export async function detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
//   // Truncate text for language detection
//   const sampleText = text.slice(0, 1000);
  
//   const params: GroqRequestParams = {
//     model: 'llama3-8b-8192', // Can use a smaller model for language detection
//     messages: [
//       {
//         role: 'system',
//         content: 'You are a language detection expert. Analyze the provided text and determine its language.'
//       },
//       {
//         role: 'user',
//         content: `Detect the language of the following text and return only a JSON object with "language" (full language name) and "confidence" (number from 0-1) properties.
        
// Text to analyze:
// """
// ${sampleText}
// """

// Respond only with the JSON object, no additional text.`
//       }
//     ],
//     temperature: 0.1
//   };
  
//   const response = await makeGroqRequest(params);
  
//   try {
//     const jsonMatch = response.match(/(\{).*(\})/s);
//     const jsonStr = jsonMatch ? jsonMatch[0] : response;
//     return JSON.parse(jsonStr);
//   } catch (error) {
//     console.error('Error parsing language detection response:', error);
//     return { language: 'Unknown', confidence: 0 };
//   }
// }