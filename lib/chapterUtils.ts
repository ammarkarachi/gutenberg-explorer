import { AnalysisType } from '@/types';
import { compressTextForAnalysis } from './textCompressionUtils';

/**
 * Splits book text into chapters based on common chapter patterns
 */
export function splitBookIntoChapters(text: string): { title: string; content: string }[] {
    const chapterPatterns = [
    /\bCHAPTER\s+([IVXLCDM]+|\d+)(?:\s+|:|\.)/gi,      /\bChapter\s+([IVXLCDM]+|\d+)(?:\s+|:|\.)/g,       /\b([IVXLCDM]+|\d+)\.\s+/g,                        /\n\s*([IVXLCDM]+|\d+)\s*\n/g,                   ];
  
  const chapterMarkers: { index: number; title: string }[] = [];
  
  for (const pattern of chapterPatterns) {
    let match;
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
  
    if (chapterMarkers.length === 0) {
    return [{ title: "Complete Text", content: text }];
  }
  
    chapterMarkers.sort((a, b) => a.index - b.index);
  
    const chapters: { title: string; content: string }[] = [];
  
  for (let i = 0; i < chapterMarkers.length; i++) {
    const currentMarker = chapterMarkers[i];
    const nextMarker = i < chapterMarkers.length - 1 ? chapterMarkers[i + 1] : null;
    
    const startIndex = currentMarker.index;
    const endIndex = nextMarker ? nextMarker.index : text.length;
    
    const chapterContent = text.slice(startIndex, endIndex).trim();
    
        if (chapterContent.length > 100) {
      chapters.push({
        title: `Chapter ${i + 1}: ${currentMarker.title}`,
        content: chapterContent
      });
    }
  }
  
      if (chapters.length === 0) {
    return [{ title: "Complete Text", content: text }];
  }
  
    if (chapters.length > 30) {
    const combinedChapters: { title: string; content: string }[] = [];
    const chapterGroupSize = Math.ceil(chapters.length / 20);     
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
    const contentWithoutHeading = chapterContent
    .replace(/^.*?\n/, '')      .trim();
  
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
    const compressed = compressTextForAnalysis(text, analysisType, maxLength);
  
    if (compressed.length <= maxLength) {
    return compressed;
  }
  
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
    const availableTokens = maxTokens * 0.7;   const availableChars = availableTokens * charsPerToken;
  
    if (textLength <= availableChars) {
    return textLength;
  }
  
  return Math.floor(availableChars);
}