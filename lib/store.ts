/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Book = {
  id: string;
  title: string;
  author: string;
  lastAccessed: Date;
};

type Analysis = {
  id: string;
  bookId: string;
  bookTitle: string;
  author: string;
  type: string;
  date: Date;
  results: any;
};

interface BookStore {
  recentBooks: Book[];
  savedBooks: Book[];
  currentBook: {
    id: string | null;
    content: string | null;
    metadata: any | null;
  };

  analyses: Analysis[];

  addRecentBook: (book: Omit<Book, 'lastAccessed'>) => void;
  saveBook: (book: Omit<Book, 'lastAccessed'>) => void;
  removeBook: (id: string) => void;
  setCurrentBook: (id: string, content: string, metadata: any) => void;
  clearCurrentBook: () => void;

  saveAnalysis: (analysis: Omit<Analysis, 'id' | 'date'>) => void;
  removeAnalysis: (id: string) => void;
}

export const useBookStore = create<BookStore>()(
  persist(
    (set) => ({
      recentBooks: [],
      savedBooks: [],
      currentBook: {
        id: null,
        content: null,
        metadata: null,
      },
      analyses: [],

      addRecentBook: (book) =>
        set((state) => {
          const filteredBooks = state.recentBooks.filter(
            (b) => b.id !== book.id
          );

          return {
            recentBooks: [
              { ...book, lastAccessed: new Date() },
              ...filteredBooks,
            ].slice(0, 10),
          };
        }),

      saveBook: (book) =>
        set((state) => {
          if (state.savedBooks.some((b) => b.id === book.id)) {
            return {
              savedBooks: state.savedBooks.map((b) =>
                b.id === book.id ? { ...b, lastAccessed: new Date() } : b
              ),
            };
          }

          return {
            savedBooks: [
              { ...book, lastAccessed: new Date() },
              ...state.savedBooks,
            ],
          };
        }),

      removeBook: (id) =>
        set((state) => ({
          savedBooks: state.savedBooks.filter((book) => book.id !== id),
        })),

      setCurrentBook: (id, content, metadata) =>
        set({
          currentBook: { id, content, metadata },
        }),

      clearCurrentBook: () =>
        set({
          currentBook: { id: null, content: null, metadata: null },
        }),

      saveAnalysis: (analysis) =>
        set((state) => ({
          analyses: [
            {
              ...analysis,
              id: `${analysis.bookId}-${analysis.type}-${Date.now()}`,
              date: new Date(),
            },
            ...state.analyses,
          ],
        })),

      removeAnalysis: (id) =>
        set((state) => ({
          analyses: state.analyses.filter((analysis) => analysis.id !== id),
        })),
    }),
    {
      name: 'gutenberg-explorer-storage',
    }
  )
);
