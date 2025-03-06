"use client"

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, BookOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { BookRecord } from '@/types'
import { searchBooks } from '@/lib/api'


const BookSearch = ({ onSelectBook }: { onSelectBook?: (bookId: string) => void }) => {
  const [bookId, setBookId] = useState('')
  const [searchText, setSearchText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchResults, setSearchResults] = useState<BookRecord[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Perform the search when searchText changes
  // In your real implementation, you'll replace this with your actual search function
  useEffect(() => {
    if (!searchText.trim() || searchText.length < 3) {
      setSearchResults([])
      return
    }

    
    const handler = setTimeout(async () => {
      const books = await searchBooks(searchText)
      console.log(books)
      setSearchResults(books)
    }, 300)
    
    return () => clearTimeout(handler)
  }, [searchText])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookId.trim()) return
    
    setIsLoading(true)
    
    // Use the provided callback or navigate to the book page
    if (onSelectBook) {
      onSelectBook(bookId)
    } else {
      router.push(`/books/${bookId}`)
    }
  }
  
  const handleSelectBook = (book: BookRecord) => {
    setBookId(book.gitb_id)
    setSearchText(book.title)
    setShowDropdown(false)
  }
  
  const clearSearch = () => {
    setSearchText('')
    setBookId('')
    setSearchResults([])
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Find a Book</h3>
            <p className="text-sm text-gray-500 mb-4">
              Search for a book by title or enter a Project Gutenberg book ID.
            </p>
          </div>
          
          <div className="relative" ref={searchRef}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search by title or author"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="pl-10 pr-10"
                />
                {searchText && (
                  <button 
                    type="button" 
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <Button type="submit" disabled={isLoading || !bookId.trim()}>
                {isLoading ? (
                  <span className="animate-spin mr-2">⟳</span>
                ) : (
                  <BookOpen className="h-4 w-4 mr-2" />
                )}
                Go to Book
              </Button>
            </div>
            
            {/* Dropdown results */}
            {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-100 mt-1 w-full bg-slate-800 text-white rounded-md border border-gray-700 max-h-80 overflow-y-auto">
                <ul className="py-1">
                  {searchResults.map(book => (
                  <li 
                  key={book.gitb_id}
                  onClick={() => handleSelectBook(book)}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                  >
                  <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{book.title}</p>
                  </div>
                  <span className="text-xs text-gray-400">{book.gitb_id}</span>
                  </div>
                  </li>
                  ))}
                </ul>
                </div>
            )}
          </div>
          
       
        </form>
      </CardContent>
    </Card>
  )
}

export default BookSearch