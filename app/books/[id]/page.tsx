"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import BookDisplay from '@/components/BookDisplay'
import TextAnalysis from '@/components/TextAnalysis'
import { fetchBookMetadata } from '@/lib/api'


export default function BookPage() {
  const params = useParams()
  const router = useRouter()
  const [bookData, setBookData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAnalysis, setShowAnalysis] = useState(false)
  
  const bookId = typeof params.id === 'string' ? params.id : params.id?.[0] || ''
  
  useEffect(() => {
    const getBookData = async () => {
      try {
        setLoading(true)
        const data = await fetchBookMetadata(bookId)
        setBookData(data)
        
        // In a real implementation, we'd save this to local storage
        // localStorage.setItem(`book_${bookId}`, JSON.stringify({ 
        //   ...data, 
        //   lastAccessed: new Date() 
        // }))
      } catch (error) {
        console.error('Error fetching book:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (bookId) {
      getBookData()
    }
  }, [bookId])
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        <p className="mt-4 text-gray-500">Loading book information...</p>
      </div>
    )
  }
  
  if (!bookData) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Book Not Found</h2>
        <p className="mb-8">We couldn't find a book with the ID: {bookId}</p>
        <Button onClick={() => router.push('/')}>
          Return Home
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/')}
          className="mr-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{bookData.title}</h1>
      </div>
      
      {!showAnalysis ? (
        <BookDisplay 
          book={bookData} 
          onAnalyze={() => setShowAnalysis(true)} 
        />
      ) : (
        <>
          <Button 
            variant="outline" 
            onClick={() => setShowAnalysis(false)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Book
          </Button>
          <TextAnalysis 
            bookId={bookId}
            bookTitle={bookData.title}
            bookContent={bookData.content}
          />
        </>
      )}
    </div>
  )
}