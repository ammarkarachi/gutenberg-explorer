import { AnalysisType } from '@/types';
import { compressTextForAnalysis } from './textCompressionUtils';

/**
 * Splits book text into chapters based on common chapter patterns
 */
export function splitBookIntoChapters(text: string): { title: string; content: string }[] {
  // Common chapter heading patterns
  const chapterPatterns = [
    /\bCHAPTER\s+([IVXLCDM]+|\d+)(?:\s+|:|\.)/gi,  // CHAPTER I, CHAPTER 1, etc.
    /\bChapter\s+([IVXLCDM]+|\d+)(?:\s+|:|\.)/g,   // Chapter I, Chapter 1, etc.
    /\b([IVXLCDM]+|\d+)\.\s+/g,                    // I. or 1.
    /\n\s*([IVXLCDM]+|\d+)\s*\n/g,                 // Roman numerals or numbers on their own line
  ];
  
  const chapterMarkers: { index: number; title: string }[] = [];
  
  for (const pattern of chapterPatterns) {
    let match;
    // Reset pattern for each search
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0];
      const chapterTitle = fullMatch.trim();
      chapterMarkers.push({
        index: match.index,
        title: chapterTitle
      });
    }
  }
  
  // If no chapters were found, treat the whole text as one chapter
  if (chapterMarkers.length === 0) {
    return [{ title: "Complete Text", content: text }];
  }
  
  // Sort markers by their position in the text
  chapterMarkers.sort((a, b) => a.index - b.index);
  
  // Split text into chapters
  const chapters: { title: string; content: string }[] = [];
  
  for (let i = 0; i < chapterMarkers.length; i++) {
    const currentMarker = chapterMarkers[i];
    const nextMarker = i < chapterMarkers.length - 1 ? chapterMarkers[i + 1] : null;
    
    const startIndex = currentMarker.index;
    const endIndex = nextMarker ? nextMarker.index : text.length;
    
    const chapterContent = text.slice(startIndex, endIndex).trim();
    
    // Only add if chapter has significant content (avoid false positives)
    if (chapterContent.length > 100) {
      chapters.push({
        title: `Chapter ${i + 1}: ${currentMarker.title}`,
        content: chapterContent
      });
    }
  }
  
  // If our chapter detection failed (resulted in no valid chapters),
  // fall back to treating the whole text as one chapter
  if (chapters.length === 0) {
    return [{ title: "Complete Text", content: text }];
  }
  
  // If we have many small chapters, combine them into larger chunks
  if (chapters.length > 30) {
    const combinedChapters: { title: string; content: string }[] = [];
    const chapterGroupSize = Math.ceil(chapters.length / 20); // Aim for ~20 combined chapters
    
    for (let i = 0; i < chapters.length; i += chapterGroupSize) {
      const group = chapters.slice(i, i + chapterGroupSize);
      const combinedContent = group.map(ch => ch.content).join('\n\n');
      const firstChapter = group[0].title;
      const lastChapter = group[group.length - 1].title;
      
      combinedChapters.push({
        title: `Chapters ${firstChapter} - ${lastChapter}`,
        content: combinedContent
      });
    }
    
    return combinedChapters;
  }
  
  return chapters;
}

/**
 * Extracts a chapter summary for display
 */
export function getChapterPreview(chapterContent: string, maxLength: number = 200): string {
  // Remove the chapter heading
  const contentWithoutHeading = chapterContent
    .replace(/^.*?\n/, '')  // Remove first line (likely the heading)
    .trim();
  
  // Return a preview of the chapter content
  if (contentWithoutHeading.length <= maxLength) {
    return contentWithoutHeading;
  }
  
  return contentWithoutHeading.slice(0, maxLength) + '...';
}

/**
 * Creates a truncated version of chapter content for API calls
 * to avoid exceeding token limits
 * 
 * This enhanced version uses smart compression based on analysis type
 */
export function truncateForAnalysis(text: string, analysisType: AnalysisType, maxLength: number = 4000): string {
  // First apply smart compression based on analysis type
  const compressed = compressTextForAnalysis(text, analysisType, maxLength);
  
  // If compressed version is still too long, use the old fallback approach
  if (compressed.length <= maxLength) {
    return compressed;
  }
  
  // For very long texts even after compression, take segments from beginning, middle and end
  const thirdLength = Math.floor(maxLength / 3);
  
  const beginning = text.slice(0, thirdLength);
  const middle = text.slice(Math.floor(text.length / 2) - thirdLength / 2, Math.floor(text.length / 2) + thirdLength / 2);
  const end = text.slice(text.length - thirdLength);
  
  
  return `${beginning}\n\n[...content omitted for length...]\n\n${middle}\n\n[...content omitted for length...]\n\n${end}`;
}

/**
 * Estimate token count based on text length
 * This is a rough approximation - actual tokenization varies by model
 */
export function estimateTokenCount(text: number): number {
  // A rough approximation is ~4 characters per token for English text
  return Math.ceil(text / 4);
}

/**
 * Calculate optimal chunk size for a text based on available tokens
 */
export function calculateOptimalChunkSize(
  textLength: number,
  maxTokens: number = 4000,
  charsPerToken: number = 4
): number {
  // Reserve some tokens for the prompt and response
  const availableTokens = maxTokens * 0.7; // Use 70% of max tokens for input
  const availableChars = availableTokens * charsPerToken;
  
  // If text fits within available tokens, return the full text length
  if (textLength <= availableChars) {
    return textLength;
  }
  
  return Math.floor(availableChars);
}