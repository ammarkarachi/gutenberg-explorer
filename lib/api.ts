import { BookMetadata, BookRecord } from '@/types';
import axios from 'axios';
import { preprocessBookText } from './utils';
import Fuse from 'fuse.js';


let bookRecords: BookRecord[] | null = null;

/**
 * Fetches TSV data from a given URL and caches it
 */
export async function fetchAndCacheTsv(): Promise<string | null> {
  try {
    const tsvUrl = 'https://raw.githubusercontent.com/gitenberg-dev/giten_site/refs/heads/master/assets/GITenberg_repos_list_2.tsv';
    const response = await axios.get(tsvUrl);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch TSV data:', error);
    throw new Error('Failed to fetch TSV data');
  }
}


/**
 * Performs a fuzzy search on the title and starts with on the id
 */
export async function searchBooks(query: string): Promise<BookRecord[]> {
  const bookRecords = await getBookRecords();
  
  const fuse = new Fuse(bookRecords, {
    keys: ['title'],
    threshold: 0.4,
  });

  const fuzzyResults = fuse.search(query).map(result => result.item);
  const idResults = bookRecords.filter(record => record.gitb_id && record.gitb_id.startsWith(query));

  return [...new Set([...fuzzyResults, ...idResults])].slice(0, 10);
}

/**
 * Parses TSV data and transforms it into an array of BookRecord objects
 */
export async function getBookRecords(): Promise<BookRecord[]> {
  const records: BookRecord[] = [];
  if (bookRecords) {
    return bookRecords;
  }
  const tsv = await fetchAndCacheTsv();
  if (!tsv) {
    throw new Error('Failed to fetch TSV data');
  }
  const lines = tsv.split('\n');
  const headers = lines[0].split('\t');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].split('\t');
    const record: BookRecord = {
      gitb_id: line[headers.indexOf('gitb_id')],
      gitb_name: line[headers.indexOf('gitb_name')],
      title: line[headers.indexOf('title')],
      language: line[headers.indexOf('language')],
      text_files: parseTextFiles(line[headers.indexOf('text_files')]),
    };
    records.push(record);
  }

  return records;
}


/**
 * Parses a string of text files into an array of filenames
 */
function parseTextFiles(textFiles: string): string[] {
  if (!textFiles) {
    return [];
  }
  textFiles = textFiles.replace("[", "").replace("]", "");
  return textFiles.split(',').map(file => file.trim());
}


/**
 * Fetches book content from Project Gutenberg
 */
export async function fetchBookContent(bookId : string): Promise<string> {
  try {
    const bookRecords = await getBookRecords();
    const bookRecord = bookRecords.find(record => record.gitb_id === bookId);
    if (!bookRecord) {
      throw new Error(`Book ID ${bookId} not found`);
    }
    
    const url = `https://raw.githubusercontent.com/GITenberg/${bookRecord.gitb_name}/master/${bookRecord.text_files[0]}`;
    const response = await axios.get<string>(url);
    return preprocessBookText(response.data);

  } catch (error) {
    console.error('Failed to fetch book content:', error);
      throw new Error(`Failed to fetch book content for ID ${bookId}`);
  }
}

/**
 * Fetches book metadata from Project Gutenberg
 */
export async function fetchBookMetadata(bookId: string) {
  try {
    const metadataUrl = `https://gutendex.com/books/${bookId}`;
    const response = await axios.get<BookMetadata>(metadataUrl);
    const data = response.data
    return {
      id: bookId,
      title: data.title,
      author: data.authors.map(author => author.name).join(', '),
      language: data.languages.join(', '),
      subjects: data.subjects || [],
      summary : data.summaries[0],
      coverImage: data.formats['image/jpeg'],
      content: await fetchBookContent(bookId),
    };
  } catch (error) {
    throw new Error(`Failed to fetch book metadata for ID ${error}`);
  }
}
