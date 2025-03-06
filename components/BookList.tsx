"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Book, Clock, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { useBookCacheStore } from '@/lib/bookCacheStore'

// This would be replaced with actual data from storage
const mockRecentBooks = [
  { id: '1342', title: 'Pride and Prejudice', author: 'Jane Austen', lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: '84', title: 'Frankenstein', author: 'Mary Wollstonecraft Shelley', lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24) },
  { id: '1661', title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) },
]

const BookList = () => {
  const [recentBooks, setRecentBooks] = useState<Array<{
    id: string;
    title: string;
    author: string;
    lastAccessed: Date;
  }>>([])
  const {
    getRecentBooks
  } = useBookCacheStore()
  useEffect(() => {
    const books = getRecentBooks()
    setRecentBooks(books.map(book => ({
      ...book,
      lastAccessed: new Date(book.lastAccessed)
    })))
  }, [])

  if (recentBooks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">You haven&apos;t explored any books yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {recentBooks.map(book => (
        <Link key={book.id} href={`/books/${book.id}`}>
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div className="flex items-start space-x-3">
                  <Book className="h-5 w-5 mt-1 text-blue-500" />
                  <div>
                    <h3 className="font-medium">{book.title}</h3>
                    <p className="text-sm text-gray-600">{book.author}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>
                        {formatDistanceToNow(book.lastAccessed, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export default BookList