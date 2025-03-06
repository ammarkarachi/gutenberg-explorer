export interface Book {
    id: string
    title: string
    author: string
    content: string
    metadata: BookMetadata
    lastAccessed?: Date
  }
  
  export type AnalysisType = 'characters' | 'summary' | 'sentiment' | 'themes'
  
  export interface Character {
    name: string
    description: string
    importance: string
  }
  
  export interface Theme {
    theme: string
    description: string
  }
  
  export interface SentimentAnalysis {
    overall: string
    beginning: string
    middle: string
    end: string
    analysis: string
  }
  
  export interface Analysis {
    id: string
    bookId: string
    bookTitle: string
    author: string
    type: AnalysisType
    chapterIndex?: number
    date: Date
    results: CharacterAnalysis | string | SentimentAnalysis | Theme[]
  }
  export interface BookMetadata {
    title: string
    authors: { name: string; birth_year: number; death_year: number }[]
    summaries: string[]
    subjects: string[]
    bookshelves: string[]
    languages: string[]
    media_type: string
    formats: { [key: string]: string }
    download_count: number
  }

  export type BookRecord = {
    gitb_id: string;
    gitb_name: string;
    title: string;
    language: string;
    text_files: string[];
  };

  export interface CharacterAnalysis extends Array<Character> {}