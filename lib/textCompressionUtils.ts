/**
 * Utilities for compressing text before sending to LLM APIs
 * to reduce token usage and avoid rate limits
 */

import { AnalysisType } from '@/types';

/**
 * Extracts key sentences from text using a basic extractive summarization approach
 * @param text The input text to compress
 * @param compressionLevel How aggressively to compress (1-5, where 5 is most aggressive)
 * @returns Compressed text
 */
export function extractKeyContent(
  text: string,
  compressionLevel: number = 3
): string {
  if (text.length < 2000) return text;

  const sentences = text
    .replace(/([.!?])\s*(?=[A-Z])/g, '$1|')
    .split('|')
    .filter((s) => s.trim().length > 0);

  if (sentences.length < 10) return text;

  const keepPercent = Math.max(5, 100 - compressionLevel * 15);
  const sentencesToKeep = Math.max(
    10,
    Math.floor(sentences.length * (keepPercent / 100))
  );

  const scores = sentences.map((sentence) => {
    let score = 0;

    score += Math.min(5, sentence.length / 20);

    if (sentence.includes('"') || sentence.includes("'")) {
      score += 2;
    }

    if (/\b[A-Z][a-z]+\b/.test(sentence)) {
      score += 1;
    }

    const narrativeWords = [
      'said',
      'asked',
      'replied',
      'told',
      'felt',
      'thought',
      'knew',
      'because',
      'therefore',
      'however',
      'although',
      'suddenly',
      'finally',
      'eventually',
    ];

    for (const word of narrativeWords) {
      if (sentence.toLowerCase().includes(word)) {
        score += 0.5;
      }
    }

    return score;
  });

  const indexedScores = scores.map((score, index) => [index, score]);

  indexedScores.sort((a, b) => b[1] - a[1]);

  const selectedIndices = indexedScores
    .slice(0, sentencesToKeep)
    .map((pair) => pair[0])
    .sort((a, b) => a - b);
  const selectedSentences = selectedIndices.map((index) => sentences[index]);

  const startSentences = sentences.slice(0, 3);
  const endSentences = sentences.slice(-3);

  const uniqueSentences = Array.from(
    new Set([...startSentences, ...selectedSentences, ...endSentences])
  );

  uniqueSentences.sort((a, b) => {
    const indexA = sentences.indexOf(a);
    const indexB = sentences.indexOf(b);
    return indexA - indexB;
  });

  return uniqueSentences.join(' ');
}

/**
 * Summarizes a chapter by extracting important sections
 * Focused on character interactions, plot developments, and key themes
 */
export function summarizeForCharacterAnalysis(
  text: string,
  maxLength: number = 2000
): string {
  if (text.length <= maxLength) return text;

  const paragraphs = text.split(/\n\s*\n/);

  const scoredParagraphs = paragraphs.map((paragraph) => {
    let score = 0;

    const names = paragraph.match(/\b[A-Z][a-z]+\b/g) || [];
    score += names.length * 2;

    const dialogueMatches = paragraph.match(/["'].*?["']/g) || [];
    score += dialogueMatches.length * 3;

    const emotionWords = [
      'feel',
      'felt',
      'emotion',
      'angry',
      'happy',
      'sad',
      'joy',
      'fear',
      'love',
      'hate',
      'upset',
      'worried',
      'anxious',
      'excited',
      'nervous',
    ];
    for (const word of emotionWords) {
      if (paragraph.toLowerCase().includes(word)) {
        score += 1;
      }
    }

    return { paragraph, score };
  });

  scoredParagraphs.sort((a, b) => b.score - a.score);

  const totalLength = text.length;
  const compressionRatio = maxLength / totalLength;
  const paragraphsToKeep = Math.max(
    5,
    Math.ceil(paragraphs.length * compressionRatio)
  );

  const firstParagraph = paragraphs[0];
  const lastParagraph = paragraphs[paragraphs.length - 1];

  const topParagraphs = scoredParagraphs
    .slice(0, paragraphsToKeep)
    .map((item) => item.paragraph);

  let result = [
    firstParagraph,
    ...topParagraphs.filter((p) => p !== firstParagraph && p !== lastParagraph),
    lastParagraph,
  ].join('\n\n');

  if (result.length > maxLength) {
    result =
      firstParagraph +
      '\n\n' +
      '[...content summarized...]\n\n' +
      topParagraphs.slice(0, 3).join('\n\n') +
      '\n\n' +
      '[...content summarized...]\n\n' +
      lastParagraph;
  }

  return result;
}

/**
 * Compresses text for sentiment analysis by focusing on emotional content
 */
export function compressForSentimentAnalysis(
  text: string,
  maxLength: number = 2000
): string {
  if (text.length <= maxLength) return text;

  const paragraphs = text.split(/\n\s*\n/);

  const scoredParagraphs = paragraphs.map((paragraph) => {
    let score = 0;

    const emotionWords = [
      'feel',
      'felt',
      'emotion',
      'angry',
      'happy',
      'sad',
      'joy',
      'fear',
      'love',
      'hate',
      'upset',
      'worried',
      'anxious',
      'excited',
      'nervous',
      'afraid',
      'scared',
      'terrified',
      'delighted',
      'thrilled',
      'horrified',
      'pleased',
      'satisfied',
      'disappointed',
      'devastated',
      'hopeful',
      'hopeless',
      'desperate',
      'content',
      'miserable',
      'ecstatic',
    ];

    for (const word of emotionWords) {
      const regex = new RegExp(`\\b${word}\\w*\\b`, 'gi');
      const matches = paragraph.match(regex) || [];
      score += matches.length * 2;
    }

    const exclamations = (paragraph.match(/!/g) || []).length;
    score += exclamations * 3;

    const questions = (paragraph.match(/\?/g) || []).length;
    score += questions;

    const dialogue = (paragraph.match(/["']/g) || []).length;
    score += dialogue / 2;

    return { paragraph, score };
  });

  scoredParagraphs.sort((a, b) => b.score - a.score);

  const third = Math.floor(paragraphs.length / 3);
  const beginning = paragraphs.slice(0, third);
  const middle = paragraphs.slice(third, third * 2);
  const end = paragraphs.slice(third * 2);

  const topBeginning = beginning
    .map((p) => ({
      paragraph: p,
      score: scoredParagraphs.find((sp) => sp.paragraph === p)?.score || 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.paragraph);

  const topMiddle = middle
    .map((p) => ({
      paragraph: p,
      score: scoredParagraphs.find((sp) => sp.paragraph === p)?.score || 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.paragraph);

  const topEnd = end
    .map((p) => ({
      paragraph: p,
      score: scoredParagraphs.find((sp) => sp.paragraph === p)?.score || 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.paragraph);

  const result = [
    paragraphs[0],
    ...topBeginning,
    '[...beginning section...]',
    ...topMiddle,
    '[...middle section...]',
    ...topEnd,
    paragraphs[paragraphs.length - 1],
  ].join('\n\n');

  return result;
}

/**
 * Compresses text for theme analysis by focusing on thematic content
 */
export function compressForThemeAnalysis(
  text: string,
  maxLength: number = 2000
): string {
  if (text.length <= maxLength) return text;

  const paragraphs = text.split(/\n\s*\n/);

  const scoredParagraphs = paragraphs.map((paragraph) => {
    let score = 0;

    const thematicWords = [
      'truth',
      'beauty',
      'justice',
      'freedom',
      'love',
      'hate',
      'war',
      'peace',
      'life',
      'death',
      'fate',
      'destiny',
      'choice',
      'responsibility',
      'moral',
      'ethics',
      'right',
      'wrong',
      'good',
      'evil',
      'society',
      'individual',
      'nature',
      'civilization',
      'power',
      'corruption',
      'redemption',
      'sacrifice',
      'identity',
      'meaning',
      'purpose',
      'struggle',
      'conflict',
      'harmony',
      'balance',
      'chaos',
      'order',
      'tradition',
      'change',
      'progress',
    ];

    for (const word of thematicWords) {
      const regex = new RegExp(`\\b${word}\\w*\\b`, 'gi');
      const matches = paragraph.match(regex) || [];
      score += matches.length * 2;
    }

    score += Math.min(5, paragraph.length / 200);

    const quotes = (paragraph.match(/["']/g) || []).length;
    if (quotes < 4) score += 2;

    return { paragraph, score };
  });

  scoredParagraphs.sort((a, b) => b.score - a.score);

  const topParagraphs = scoredParagraphs
    .slice(0, 6)
    .map((item) => item.paragraph);

  const result = [
    paragraphs[0],
    ...topParagraphs.filter(
      (p) => p !== paragraphs[0] && p !== paragraphs[paragraphs.length - 1]
    ),
    paragraphs[paragraphs.length - 1],
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
      return extractKeyContent(text, 3);
    default:
      return extractKeyContent(text, 2);
  }
}
