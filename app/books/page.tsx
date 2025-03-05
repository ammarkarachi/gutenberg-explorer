"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Book, Clock, X, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// This would be replaced with actual data from storage
const mockSavedBooks = [
  { id: '1342', title: 'Pride and Prejudice', author: 'Jane Austen', lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: '84', title: 'Frankenstein', author: 'Mary Wollstonecraft Shelley', lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24) },
  { id: '1661', title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) },
  { id: '1952', title: 'The Yellow Wallpaper', author: 'Charlotte Perkins Gilman', lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) },
  { id: '1400', title: 'Great Expectations', author: 'Charles Dickens', lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4) },
]

export default function SavedBooksPage() {
  const [savedBooks, setSavedBooks] = useState<Array<{
    id: string;
    title: string;
    author: string;
    lastAccessed: Date;
  }>>([])
  
  useEffect(() => {
    // In a real implementation, we would fetch from local storage or an API
    setSavedBooks(mockSavedBooks)
  }, [])
  
  const removeBook = (id: string) => {
    // In a real implementation, we would also remove from storage
    setSavedBooks(savedBooks.filter(book => book.id !== id))
  }
  
  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto py-10">
        <h1 className="text-3xl font-bold mb-4">Your Books</h1>
        <p className="text-gray-600">
          View and manage your saved books from Project Gutenberg.
        </p>
        <div className="mt-6">
          <Link href="/">
            <Button>
              <Search className="mr-2 h-4 w-4" />
              Find New Books
            </Button>
          </Link>
        </div>
      </div>
      
      {savedBooks.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">You haven&apos;t saved any books yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="grid">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-gray-500">{savedBooks.length} books saved</p>
            </div>
            <TabsList>
              <TabsTrigger value="grid">Grid</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="grid">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedBooks.map(book => (
                <Card key={book.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <Button
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeBook(book.id)}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 hover:bg-white"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    
                    <Link href={`/books/${book.id}`}>
                      <div className="flex flex-col h-full">
                        <div className="mb-2 flex items-start">
                          <Book className="h-5 w-5 mt-1 text-blue-500 mr-2" />
                          <div>
                            <h3 className="font-medium">{book.title}</h3>
                            <p className="text-sm text-gray-600">{book.author}</p>
                          </div>
                        </div>
                        <div className="mt-auto flex items-center pt-4 text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>
                            {formatDistanceToNow(book.lastAccessed, { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="list">
            <div className="space-y-3">
              {savedBooks.map(book => (
                <Card key={book.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <Link href={`/books/${book.id}`} className="flex-1">
                        <div className="flex items-center">
                          <Book className="h-5 w-5 text-blue-500 mr-3" />
                          <div>
                            <h3 className="font-medium">{book.title}</h3>
                            <p className="text-sm text-gray-600">{book.author}</p>
                          </div>
                        </div>
                      </Link>
                      
                      <div className="flex items-center space-x-4">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(book.lastAccessed, { addSuffix: true })}
                        </span>
                        <Button
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeBook(book.id)}
                          className="h-8 w-8 rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}