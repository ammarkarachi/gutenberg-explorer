/**
 * Splits book text into chapters based on common chapter patterns
 */
export function splitBookIntoChapters(text: string): { title: string; content: string }[] {
    // Common chapter heading patterns in classic literature
    const chapterPatterns = [
      /\bCHAPTER\s+([IVXLCDM]+|\d+)(?:\s+|:|\.)/gi,  // CHAPTER I, CHAPTER 1, etc.
      /\bChapter\s+([IVXLCDM]+|\d+)(?:\s+|:|\.)/g,   // Chapter I, Chapter 1, etc.
      /\b([IVXLCDM]+|\d+)\.\s+/g,                    // I. or 1.
      /\n\s*([IVXLCDM]+|\d+)\s*\n/g,                 // Roman numerals or numbers on their own line
    ];
    
    // Find all potential chapter markers with their positions
    let chapterMarkers: { index: number; title: string }[] = [];
    
    for (const pattern of chapterPatterns) {
      let match;
      // Reset pattern for each search
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const chapterNumber = match[1] || '';
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
   */
  export function truncateForAnalysis(text: string, maxLength: number = 10000): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    // For longer texts, take the beginning, middle and end
    const thirdLength = Math.floor(maxLength / 3);
    
    const beginning = text.slice(0, thirdLength);
    const middle = text.slice(Math.floor(text.length / 2) - thirdLength / 2, Math.floor(text.length / 2) + thirdLength / 2);
    const end = text.slice(text.length - thirdLength);
    
    return `${beginning}\n\n[...content omitted for length...]\n\n${middle}\n\n[...content omitted for length...]\n\n${end}`;
  }