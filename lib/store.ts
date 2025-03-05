import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Book = {
  id: string
  title: string
  author: string
  lastAccessed: Date
}

type Analysis = {
  id: string
  bookId: string
  bookTitle: string
  author: string
  type: string
  date: Date
  results: any
}

interface BookStore {
  // Book state
  recentBooks: Book[]
  savedBooks: Book[]
  currentBook: {
    id: string | null
    content: string | null
    metadata: any | null
  }
  
  // Analysis state
  analyses: Analysis[]
  
  // Actions
  addRecentBook: (book: Omit<Book, 'lastAccessed'>) => void
  saveBook: (book: Omit<Book, 'lastAccessed'>) => void
  removeBook: (id: string) => void
  setCurrentBook: (id: string, content: string, metadata: any) => void
  clearCurrentBook: () => void
  
  saveAnalysis: (analysis: Omit<Analysis, 'id' | 'date'>) => void
  removeAnalysis: (id: string) => void
}

export const useBookStore = create<BookStore>()(
  persist(
    (set) => ({
      // Initial state
      recentBooks: [],
      savedBooks: [],
      currentBook: {
        id: null,
        content: null,
        metadata: null
      },
      analyses: [],
      
      // Actions
      addRecentBook: (book) => set((state) => {
        // Remove the book if it already exists
        const filteredBooks = state.recentBooks.filter(b => b.id !== book.id)
        
        // Add to the start of the array
        return {
          recentBooks: [
            { ...book, lastAccessed: new Date() },
            ...filteredBooks
          ].slice(0, 10) // Keep only 10 most recent
        }
      }),
      
      saveBook: (book) => set((state) => {
        // Check if book is already saved
        if (state.savedBooks.some(b => b.id === book.id)) {
          return {
            savedBooks: state.savedBooks.map(b => 
              b.id === book.id 
                ? { ...b, lastAccessed: new Date() }
                : b
            )
          }
        }
        
        // Add new book
        return {
          savedBooks: [
            { ...book, lastAccessed: new Date() },
            ...state.savedBooks
          ]
        }
      }),
      
      removeBook: (id) => set((state) => ({
        savedBooks: state.savedBooks.filter(book => book.id !== id)
      })),
      
      setCurrentBook: (id, content, metadata) => set({
        currentBook: { id, content, metadata }
      }),
      
      clearCurrentBook: () => set({
        currentBook: { id: null, content: null, metadata: null }
      }),
      
      saveAnalysis: (analysis) => set((state) => ({
        analyses: [
          {
            ...analysis,
            id: `${analysis.bookId}-${analysis.type}-${Date.now()}`,
            date: new Date()
          },
          ...state.analyses
        ]
      })),
      
      removeAnalysis: (id) => set((state) => ({
        analyses: state.analyses.filter(analysis => analysis.id !== id)
      }))
    }),
    {
      name: 'gutenberg-explorer-storage'
    }
  )
)