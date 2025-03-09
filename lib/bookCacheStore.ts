/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'
import { persist, PersistOptions } from 'zustand/middleware'
import { Analysis, AnalysisType } from '@/types'

export interface CachedBook {
  id: string
  title: string
  author: string
  language: string
  subjects: string[]
  summary: string
  coverImage: string
  content: string
  lastAccessed: string }

export interface CachedAnalysis {
  bookId: string
  chapterIndex: number
  analysisType: AnalysisType
  result: any
  timestamp: string }

export interface ProgressState {
  bookId: string
  scrollPosition: number
  currentChapter: number
  lastAnalysisType: AnalysisType
}

interface BookCacheStore {
  cachedBooks: Record<string, CachedBook>
  cachedAnalyses: Record<string, Record<number, Record<AnalysisType, CachedAnalysis>>>
  recentBooks: string[]   
  userProgress: Record<string, ProgressState>
  
  cacheBook: (book: Omit<CachedBook, 'lastAccessed'>) => void
  getCachedBook: (bookId: string) => CachedBook | null
  removeBookFromCache: (bookId: string) => void
  getRecentBooks: () => CachedBook[]
  getSavedAnalyses: () => Analysis[]
  
  cacheAnalysis: (analysis: Omit<CachedAnalysis, 'timestamp'>) => void
  getCachedAnalysis: (bookId: string, chapterIndex: number, analysisType: AnalysisType) => any | null
  
  saveProgress: (bookId: string, progress: Partial<ProgressState>) => void
  getProgress: (bookId: string) => ProgressState | null
  
  clearAllCache: () => void
}

const estimateCacheSize = (store: BookCacheStore): number => {
  try {
    const serialized = JSON.stringify({
      cachedBooks: store.cachedBooks,
      cachedAnalyses: store.cachedAnalyses,
      recentBooks: store.recentBooks,
      userProgress: store.userProgress
    });
    
    return serialized.length;   } catch (e) {
    console.error('Error estimating cache size:', e);
    return 0;
  }
};

const MAX_CACHE_SIZE = 10 * 1024 * 1024; 

export const useBookCacheStore = create<BookCacheStore>()(
  persist(
    (set, get) => ({
      cachedBooks: {} as Record<string, CachedBook>,
      cachedAnalyses: {},
      recentBooks: [],
      userProgress: {},
      
      cacheBook: (book) => set((state) => {
                const newState = { ...state };
        
                const newBook: CachedBook = {
          ...book,
          lastAccessed: new Date().toISOString()
        };
        
                newState.cachedBooks = {
          ...state.cachedBooks,
          [book.id]: newBook
        };
        
                newState.recentBooks = [
          book.id,
          ...state.recentBooks.filter(id => id !== book.id)
        ].slice(0, 50);         
                if (estimateCacheSize(newState) > MAX_CACHE_SIZE) {
                    const booksToKeep = new Set(newState.recentBooks.slice(0, 10));           
                    const sortedBooks = Object.entries(newState.cachedBooks)
            .filter(([id]) => !booksToKeep.has(id))
            .sort(([, a], [, b]) => 
              new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime()
            );
          
                    while (
            sortedBooks.length > 0 && 
            estimateCacheSize(newState) > MAX_CACHE_SIZE
          ) {
            const [idToRemove] = sortedBooks.shift() || [null];
            if (idToRemove) {
              delete newState.cachedBooks[idToRemove];
              
                            if (newState.cachedAnalyses[idToRemove]) {
                delete newState.cachedAnalyses[idToRemove];
              }
              
                            if (newState.userProgress[idToRemove]) {
                delete newState.userProgress[idToRemove];
              }
              
                            newState.recentBooks = newState.recentBooks.filter(id => id !== idToRemove);
            }
          }
        }
        
        return newState;
      }),
      
      getCachedBook: (bookId) => {
        const state = get();
        const book = state.cachedBooks[bookId];
        
        if (book) {
                    set(state => ({
            cachedBooks: {
              ...state.cachedBooks,
              [bookId]: {
                ...book,
                lastAccessed: new Date().toISOString()
              }
            },
            recentBooks: [
              bookId,
              ...state.recentBooks.filter(id => id !== bookId)
            ]
          }));
        }
        
        return book || null;
      },
      getRecentBooks: () => {
        const state = get();
        return state.recentBooks
          .map(id => state.cachedBooks[id])
          .filter(book => !!book);
      },
      
      removeBookFromCache: (bookId) => set(state => {
                const newCachedBooks = { ...state.cachedBooks };
        const newCachedAnalyses = { ...state.cachedAnalyses };
        const newUserProgress = { ...state.userProgress };
        
                delete newCachedBooks[bookId];
        delete newCachedAnalyses[bookId];
        delete newUserProgress[bookId];
        
        return {
          cachedBooks: newCachedBooks,
          cachedAnalyses: newCachedAnalyses,
          userProgress: newUserProgress,
          recentBooks: state.recentBooks.filter(id => id !== bookId)
        };
      }),
      
      cacheAnalysis: (analysis) => set(state => {
                const bookAnalyses = state.cachedAnalyses[analysis.bookId] || {};
        const chapterAnalyses = bookAnalyses[analysis.chapterIndex] || {};
        
                return {
          cachedAnalyses: {
            ...state.cachedAnalyses,
            [analysis.bookId]: {
              ...bookAnalyses,
              [analysis.chapterIndex]: {
                ...chapterAnalyses,
                [analysis.analysisType]: {
                  ...analysis,
                  timestamp: new Date().toISOString()
                }
              }
            }
          }
        };
      }),
      
      getCachedAnalysis: (bookId, chapterIndex, analysisType) => {
        const state = get();
        return state.cachedAnalyses[bookId]?.[chapterIndex]?.[analysisType]?.result || null;
      },
      getSavedAnalyses: () => {
        const state = get();
        const analyses = [];

        for (const [bookId, chapters] of Object.entries(state.cachedAnalyses)) {
          const book = state.cachedBooks[bookId];
          if (!book) continue;

          for (const [chapterIndex, types] of Object.entries(chapters)) {
            for (const [analysisType, analysis] of Object.entries(types)) {
              analyses.push({
                id: `${bookId}-${analysisType}-${chapterIndex}`,
                bookId,
                bookTitle: book.title,
                author: book.author,
                type: analysisType as AnalysisType,
                date: new Date(analysis.timestamp),
                chapterIndex: parseInt(chapterIndex),
                results: analysis.result
              });
            }
          }
        }

        return analyses;
      },
      
      saveProgress: (bookId, progress) => set(state => {
        const currentProgress = state.userProgress[bookId] || {
          bookId,
          scrollPosition: 0,
          currentChapter: 0,
          lastAnalysisType: 'characters' as AnalysisType
        };
        
        return {
          userProgress: {
            ...state.userProgress,
            [bookId]: {
              ...currentProgress,
              ...progress
            }
          }
        };
      }),
      
      getProgress: (bookId) => {
        const state = get();
        return state.userProgress[bookId] || null;
      },
      
      clearAllCache: () => set({
        cachedBooks: {} as Record<string, CachedBook>,
        cachedAnalyses: {},
        recentBooks: [],
        userProgress: {}
      })
    }),
    {
      name: 'gutenberg-explorer-cache',
      serialize: (state: { recentBooks: any; userProgress: any; cachedBooks: Record<string, CachedBook>  ; cachedAnalyses: Record<string, Record<number, Record<AnalysisType, CachedAnalysis>>> }) => {
        const serializable = {
          cachedBooks: {} as Record<string, CachedBook>,
          cachedAnalyses: {} as Record<string, Record<number, Record<AnalysisType, CachedAnalysis>>>,
          recentBooks: state.recentBooks,
          userProgress: state.userProgress
        };
        for (const [id, book] of Object.entries(state.cachedBooks)) {
          serializable.cachedBooks[id] = {
            ...book,
            content: book.content
          };
        }
        serializable.cachedAnalyses = state.cachedAnalyses;
        return JSON.stringify(serializable);
      },
      deserialize: (str :string) => {
        const deserialized = JSON.parse(str);
        for (const [id, book] of Object.entries(deserialized.cachedBooks)) {
          deserialized.cachedBooks[id] = {
            ...(book as CachedBook),
            content: (book as CachedBook).content
          };
        }
        return deserialized;
      }
    } as unknown as PersistOptions<BookCacheStore, BookCacheStore>
  )
);

/**
 * Helper function to check if we have a cached book without modifying the access time
 */
export function checkBookInCache(bookId: string): boolean {
  return !!useBookCacheStore.getState().cachedBooks[bookId];
}

/**
 * Get all recent books without modifying the store state
 */
export function getRecentBooks(): CachedBook[] {
  const state = useBookCacheStore.getState();
  return state.recentBooks
    .map(id => state.cachedBooks[id])
    .filter(book => !!book);
}