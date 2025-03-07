/**
 * Utilities for compressing text before sending to LLM APIs
 * to reduce token usage and avoid rate limits
 */

import { AnalysisType } from "@/types";

/**
 * Extracts key sentences from text using a basic extractive summarization approach
 * @param text The input text to compress
 * @param compressionLevel How aggressively to compress (1-5, where 5 is most aggressive)
 * @returns Compressed text
 */
export function extractKeyContent(text: string, compressionLevel: number = 3): string {
    // Short texts don't need compression
    if (text.length < 2000) return text;
    
    // Split text into sentences
    const sentences = text
      .replace(/([.!?])\s*(?=[A-Z])/g, "$1|")
      .split("|")
      .filter(s => s.trim().length > 0);
    
    // If very few sentences, don't compress
    if (sentences.length < 10) return text;
    
    // Calculate what percentage of sentences to keep based on compression level
    const keepPercent = Math.max(5, 100 - (compressionLevel * 15)); // 85% for level 1, down to 25% for level 5
    const sentencesToKeep = Math.max(10, Math.floor(sentences.length * (keepPercent / 100)));
    
    // Calculate importance scores for each sentence
    const scores = sentences.map(sentence => {
      let score = 0;
      
      // Longer sentences might contain more information
      score += Math.min(5, sentence.length / 20);
      
      // Sentences with dialogue might be important
      if (sentence.includes('"') || sentence.includes("'")) {
        score += 2;
      }
      
      // Sentences with character names or mentions might be important
      if (/\b[A-Z][a-z]+\b/.test(sentence)) {
        score += 1;
      }
      
      // Sentences with key narrative words might be important
      const narrativeWords = [
        'said', 'asked', 'replied', 'told', 'felt', 'thought', 'knew',
        'because', 'therefore', 'however', 'although', 
        'suddenly', 'finally', 'eventually'
      ];
      
      for (const word of narrativeWords) {
        if (sentence.toLowerCase().includes(word)) {
          score += 0.5;
        }
      }
      
      return score;
    });
    
    // Create pairs of [index, score]
    const indexedScores = scores.map((score, index) => [index, score]);
    
    // Sort by score in descending order
    indexedScores.sort((a, b) => b[1] - a[1]);
    
    // Take top N sentences based on sentencesToKeep
    const selectedIndices = indexedScores
      .slice(0, sentencesToKeep)
      .map(pair => pair[0])
      .sort((a, b) => a - b); // Sort by original position
    
    // Construct the compressed text maintaining the original order
    const selectedSentences = selectedIndices.map(index => sentences[index]);
    
    // Always include the first and last few sentences for context
    const startSentences = sentences.slice(0, 3);
    const endSentences = sentences.slice(-3);
    
    // Combine unique sentences, ensuring start and end are included
    const uniqueSentences = Array.from(new Set([
      ...startSentences,
      ...selectedSentences,
      ...endSentences
    ]));
    
    // Sort by original position
    uniqueSentences.sort((a, b) => {
      const indexA = sentences.indexOf(a);
      const indexB = sentences.indexOf(b);
      return indexA - indexB;
    });
    
    // Join the sentences back together
    return uniqueSentences.join(' ');
  }
  
  /**
   * Summarizes a chapter by extracting important sections
   * Focused on character interactions, plot developments, and key themes
   */
  export function summarizeForCharacterAnalysis(text: string, maxLength: number = 2000): string {
    // If text is already shorter than maxLength, return as is
    if (text.length <= maxLength) return text;
    
    // Split into paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    // Score paragraphs for character relevance
    const scoredParagraphs = paragraphs.map(paragraph => {
      let score = 0;
      
      // Look for character names (capitalized words)
      const names = paragraph.match(/\b[A-Z][a-z]+\b/g) || [];
      score += names.length * 2;
      
      // Look for dialogue (likely character interactions)
      const dialogueMatches = paragraph.match(/["'].*?["']/g) || [];
      score += dialogueMatches.length * 3;
      
      // Look for emotion words
      const emotionWords = [
        'feel', 'felt', 'emotion', 'angry', 'happy', 'sad', 'joy', 'fear',
        'love', 'hate', 'upset', 'worried', 'anxious', 'excited', 'nervous'
      ];
      for (const word of emotionWords) {
        if (paragraph.toLowerCase().includes(word)) {
          score += 1;
        }
      }
      
      return { paragraph, score };
    });
    
    // Sort by score
    scoredParagraphs.sort((a, b) => b.score - a.score);
    
    // Calculate how many top paragraphs to keep
    const totalLength = text.length;
    const compressionRatio = maxLength / totalLength;
    const paragraphsToKeep = Math.max(
      5,
      Math.ceil(paragraphs.length * compressionRatio)
    );
    
    // Always include first and last paragraph for context
    const firstParagraph = paragraphs[0];
    const lastParagraph = paragraphs[paragraphs.length - 1];
    
    // Get the top scoring paragraphs
    const topParagraphs = scoredParagraphs
      .slice(0, paragraphsToKeep)
      .map(item => item.paragraph);
    
    // Combine and ensure first/last paragraphs are included
    let result = [
      firstParagraph,
      ...topParagraphs.filter(p => p !== firstParagraph && p !== lastParagraph),
      lastParagraph
    ].join('\n\n');
    
    // If still too long, perform additional trimming
    if (result.length > maxLength) {
      result = firstParagraph + '\n\n' + 
        '[...content summarized...]\n\n' +
        topParagraphs.slice(0, 3).join('\n\n') + '\n\n' +
        '[...content summarized...]\n\n' +
        lastParagraph;
    }
    
    return result;
  }
  
  /**
   * Compresses text for sentiment analysis by focusing on emotional content
   */
  export function compressForSentimentAnalysis(text: string, maxLength: number = 2000): string {
    // If text is already shorter than maxLength, return as is
    if (text.length <= maxLength) return text;
    
    // Split into paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    // Score paragraphs for emotional content
    const scoredParagraphs = paragraphs.map(paragraph => {
      let score = 0;
      
      // Look for emotion words
      const emotionWords = [
        'feel', 'felt', 'emotion', 'angry', 'happy', 'sad', 'joy', 'fear',
        'love', 'hate', 'upset', 'worried', 'anxious', 'excited', 'nervous',
        'afraid', 'scared', 'terrified', 'delighted', 'thrilled', 'horrified',
        'pleased', 'satisfied', 'disappointed', 'devastated', 'hopeful',
        'hopeless', 'desperate', 'content', 'miserable', 'ecstatic'
      ];
      
      for (const word of emotionWords) {
        const regex = new RegExp(`\\b${word}\\w*\\b`, 'gi');
        const matches = paragraph.match(regex) || [];
        score += matches.length * 2;
      }
      
      // Exclamation marks indicate emotional intensity
      const exclamations = (paragraph.match(/!/g) || []).length;
      score += exclamations * 3;
      
      // Question marks might indicate uncertainty or tension
      const questions = (paragraph.match(/\?/g) || []).length;
      score += questions;
      
      // Dialogue often contains emotional exchanges
      const dialogue = (paragraph.match(/["']/g) || []).length;
      score += dialogue / 2;
      
      return { paragraph, score };
    });
    
    // Sort by score
    scoredParagraphs.sort((a, b) => b.score - a.score);
    
    // We want paragraphs from beginning, middle and end to get sentiment flow
    // Divide the text into three sections
    const third = Math.floor(paragraphs.length / 3);
    const beginning = paragraphs.slice(0, third);
    const middle = paragraphs.slice(third, third * 2);
    const end = paragraphs.slice(third * 2);
    
    // Get top scoring paragraphs from each section
    const topBeginning = beginning
      .map((p) => ({ paragraph: p, score: scoredParagraphs.find(sp => sp.paragraph === p)?.score || 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(item => item.paragraph);
    
    const topMiddle = middle
      .map((p) => ({ paragraph: p, score: scoredParagraphs.find(sp => sp.paragraph === p)?.score || 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(item => item.paragraph);
    
    const topEnd = end
      .map((p) => ({ paragraph: p, score: scoredParagraphs.find(sp => sp.paragraph === p)?.score || 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(item => item.paragraph);
    
    // Combine sections with markers
    const result = [
      paragraphs[0],
      ...topBeginning,
      '[...beginning section...]',
      ...topMiddle,
      '[...middle section...]',
      ...topEnd,
      paragraphs[paragraphs.length - 1]
    ].join('\n\n');
    
    return result;
  }
  
  /**
   * Compresses text for theme analysis by focusing on thematic content
   */
  export function compressForThemeAnalysis(text: string, maxLength: number = 2000): string {
    // If text is already shorter than maxLength, return as is
    if (text.length <= maxLength) return text;
    
    // Split into paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    // Score paragraphs for thematic relevance
    const scoredParagraphs = paragraphs.map(paragraph => {
      let score = 0;
      
      // Look for abstract/thematic words
      const thematicWords = [
        'truth', 'beauty', 'justice', 'freedom', 'love', 'hate', 'war', 'peace',
        'life', 'death', 'fate', 'destiny', 'choice', 'responsibility', 'moral',
        'ethics', 'right', 'wrong', 'good', 'evil', 'society', 'individual',
        'nature', 'civilization', 'power', 'corruption', 'redemption', 'sacrifice',
        'identity', 'meaning', 'purpose', 'struggle', 'conflict', 'harmony',
        'balance', 'chaos', 'order', 'tradition', 'change', 'progress'
      ];
      
      for (const word of thematicWords) {
        const regex = new RegExp(`\\b${word}\\w*\\b`, 'gi');
        const matches = paragraph.match(regex) || [];
        score += matches.length * 2;
      }
      
      // Longer paragraphs might have more thematic development
      score += Math.min(5, paragraph.length / 200);
      
      // Less dialogue often means more narration/theme development
      const quotes = (paragraph.match(/["']/g) || []).length;
      if (quotes < 4) score += 2;
      
      return { paragraph, score };
    });
    
    // Sort by score
    scoredParagraphs.sort((a, b) => b.score - a.score);
    
    // Take top scoring paragraphs
    const topParagraphs = scoredParagraphs
      .slice(0, 6)
      .map(item => item.paragraph);
    
    // Always include first and last paragraph
    const result = [
      paragraphs[0],
      ...topParagraphs.filter(p => p !== paragraphs[0] && p !== paragraphs[paragraphs.length - 1]),
      paragraphs[paragraphs.length - 1]
    ].join('\n\n');
    
    return result;
  }
  
  /**
   * Master function to compress text based on analysis type
   */
  export function compressTextForAnalysis(
    text: string, 
    analysisType: AnalysisType, 
    maxLength: number = 2000
  ): string {
    // Skip compression for small texts
    if (text.length <= maxLength) return text;
    
    switch (analysisType) {
      case 'characters':
      case 'character-graph':
        return summarizeForCharacterAnalysis(text, maxLength);
      case 'sentiment':
        return compressForSentimentAnalysis(text, maxLength);
      case 'themes':
        return compressForThemeAnalysis(text, maxLength);
      case 'summary':
        // For summary we want a good representation of the full text
        return extractKeyContent(text, 3);
      default:
        // Default compression for other types
        return extractKeyContent(text, 2);
    }
  }