import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names with Tailwind's utility classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncates text to a maximum length and adds an ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Extracts basic metadata from Project Gutenberg text headers
 */
export function extractBasicMetadata(text: string) {
  const titleMatch = text.match(/Title:\s*([^\r\n]+)/i);
  const authorMatch = text.match(/Author:\s*([^\r\n]+)/i);
  const releaseMatch = text.match(/Release Date:\s*([^\r\n]+)/i);
  const languageMatch = text.match(/Language:\s*([^\r\n]+)/i);

  return {
    title: titleMatch ? titleMatch[1].trim() : 'Unknown Title',
    author: authorMatch ? authorMatch[1].trim() : 'Unknown Author',
    releaseDate: releaseMatch ? releaseMatch[1].trim() : 'Unknown Date',
    language: languageMatch ? languageMatch[1].trim() : 'English',
  };
}

/**
 * Attempts to strip Project Gutenberg header and footer from book text
 */
export function stripGutenbergHeaderFooter(text: string): string {
  const startMarkers = [
    '*** START OF THIS PROJECT GUTENBERG EBOOK',
    '*** START OF THE PROJECT GUTENBERG EBOOK',
    'START OF THE PROJECT GUTENBERG EBOOK',
    'START OF THIS PROJECT GUTENBERG EBOOK',
  ];

  const endMarkers = [
    '*** END OF THIS PROJECT GUTENBERG EBOOK',
    '*** END OF THE PROJECT GUTENBERG EBOOK',
    'END OF THE PROJECT GUTENBERG EBOOK',
    'END OF THIS PROJECT GUTENBERG EBOOK',
  ];

  let startPos = 0;
  let endPos = text.length;

  for (const marker of startMarkers) {
    const pos = text.indexOf(marker);
    if (pos !== -1) {
      const lineEndPos = text.indexOf('\n', pos);
      if (lineEndPos !== -1) {
        startPos = lineEndPos + 1;
        break;
      }
    }
  }

  for (const marker of endMarkers) {
    const pos = text.indexOf(marker);
    if (pos !== -1) {
      endPos = pos;
      break;
    }
  }

  return text.slice(startPos, endPos).trim();
}

/**
 * Generates a random color in hex format
 */
export function getRandomColor(): string {
  const colors = [
    '#2563EB',
    '#7C3AED',
    '#DB2777',
    '#D97706',
    '#059669',
    '#DC2626',
    '#4F46E5',
    '#0891B2',
    '#7E22CE',
    '#65A30D',
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Formats a date to a readable string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Validates a Project Gutenberg book ID
 */
export function isValidBookId(id: string): boolean {
  return /^\d+$/.test(id);
}

/**
 * Performs basic preprocessing on book text
 */
export function preprocessBookText(text: string): string {
  const strippedText = stripGutenbergHeaderFooter(text);

  return strippedText;
}

export function convertNumberToOrdinal(num: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const value = num % 100;
  return num + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
}
