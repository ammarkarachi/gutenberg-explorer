import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names with Tailwind's utility classes
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
  }


/**
 * Truncates text to a maximum length and adds an ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Extracts basic metadata from Project Gutenberg text headers
 */
export function extractBasicMetadata(text: string) {
  // Basic regex patterns to extract metadata from Gutenberg texts
  // These are simplified and might need refinement
  const titleMatch = text.match(/Title:\s*([^\r\n]+)/i)
  const authorMatch = text.match(/Author:\s*([^\r\n]+)/i)
  const releaseMatch = text.match(/Release Date:\s*([^\r\n]+)/i)
  const languageMatch = text.match(/Language:\s*([^\r\n]+)/i)
  
  return {
    title: titleMatch ? titleMatch[1].trim() : 'Unknown Title',
    author: authorMatch ? authorMatch[1].trim() : 'Unknown Author',
    releaseDate: releaseMatch ? releaseMatch[1].trim() : 'Unknown Date',
    language: languageMatch ? languageMatch[1].trim() : 'English',
  }
}

/**
 * Attempts to strip Project Gutenberg header and footer from book text
 */
export function stripGutenbergHeaderFooter(text: string): string {
  // This is a simplified approach - a real implementation would need to be more robust
  
  // Look for common start markers
  const startMarkers = [
    '*** START OF THIS PROJECT GUTENBERG EBOOK',
    '*** START OF THE PROJECT GUTENBERG EBOOK',
    'START OF THE PROJECT GUTENBERG EBOOK',
    'START OF THIS PROJECT GUTENBERG EBOOK',
  ]
  
  // Look for common end markers
  const endMarkers = [
    '*** END OF THIS PROJECT GUTENBERG EBOOK',
    '*** END OF THE PROJECT GUTENBERG EBOOK',
    'END OF THE PROJECT GUTENBERG EBOOK',
    'END OF THIS PROJECT GUTENBERG EBOOK',
  ]
  
  let startPos = 0
  let endPos = text.length
  
  // Find start of actual content
  for (const marker of startMarkers) {
    const pos = text.indexOf(marker)
    if (pos !== -1) {
      // Find the end of the line containing the marker
      const lineEndPos = text.indexOf('\n', pos)
      if (lineEndPos !== -1) {
        startPos = lineEndPos + 1
        break
      }
    }
  }
  
  // Find end of actual content
  for (const marker of endMarkers) {
    const pos = text.indexOf(marker)
    if (pos !== -1) {
      endPos = pos
      break
    }
  }
  
  // Extract the content between markers
  return text.slice(startPos, endPos).trim()
}

/**
 * Generates a random color in hex format
 */
export function getRandomColor(): string {
  const colors = [
    '#2563EB', // blue-600
    '#7C3AED', // violet-600
    '#DB2777', // pink-600
    '#D97706', // amber-600
    '#059669', // emerald-600
    '#DC2626', // red-600
    '#4F46E5', // indigo-600
    '#0891B2', // cyan-600
    '#7E22CE', // purple-600
    '#65A30D'  // lime-600
  ]
  
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * Formats a date to a readable string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/**
 * Validates a Project Gutenberg book ID
 */
export function isValidBookId(id: string): boolean {
  // Basic validation - Gutenberg IDs are numeric
  return /^\d+$/.test(id)
}

/**
 * Performs basic preprocessing on book text
 */
export function preprocessBookText(text: string): string {
  // Remove Project Gutenberg header/footer
  const strippedText = stripGutenbergHeaderFooter(text)
  
  // Normalize whitespace
  return strippedText
    // .replace(/\r\n/g, '\n')         // Normalize line endings
    // .replace(/\n{3,}/g, '\n\n')     // Reduce multiple blank lines
    // .replace(/\s+/g, ' ')           // Normalize spaces
    // .trim()
}

export function convertNumberToOrdinal(num: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = num % 100;
  return num + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
}