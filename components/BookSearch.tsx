"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

const BookSearch = () => {
  const [bookId, setBookId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookId.trim()) return
    
    setIsLoading(true)
    router.push(`/books/${bookId}`)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Find a Book</h3>
            <p className="text-sm text-gray-500 mb-4">
              Enter a Project Gutenberg book ID to explore and analyze its content.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter book ID (e.g., 1787)"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !bookId.trim()}>
              {isLoading ? (
                <span className="animate-spin mr-2">⟳</span>
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>
          
          <div className="text-xs text-gray-500">
            <p>Example IDs: 1342 (Pride and Prejudice), 84 (Frankenstein), 1661 (The Adventures of Sherlock Holmes)</p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default BookSearch