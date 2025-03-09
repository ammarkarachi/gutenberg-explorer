"use client"

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react'
import BookDisplay from '@/components/BookDisplay'
import TextAnalysis from '@/components/TextAnalysis'
import { fetchBookMetadata } from '@/lib/api'
import { CachedBook, useBookCacheStore } from '@/lib/bookCacheStore'

export default function BookPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = typeof params.id === 'string' ? params.id : params.id?.[0] || ''
  
  const [bookData, setBookData] = useState<CachedBook | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  
    const contentRef = useRef<HTMLDivElement>(null)
  
    const { 
    getCachedBook, 
    cacheBook, 
    removeBookFromCache,
    saveProgress,
    getProgress
  } = useBookCacheStore()
  
    useEffect(() => {
    const loadBook = async () => {
      if (!bookId) return
      
      try {
        setLoading(true)
        
                const cachedBook = getCachedBook(bookId)
        if (cachedBook) {
          console.log('Loading book from cache:', bookId)
          setBookData(cachedBook)
          setIsSaved(true)
          
                    const progress = getProgress(bookId)
          if (progress) {
                        if (progress.lastAnalysisType) {
              setShowAnalysis(true)
            }
          }
          
          setLoading(false)
          return
        }
        
                console.log('Fetching book from API:', bookId)
        const data = await fetchBookMetadata(bookId)
        setBookData({
          ...data,
          lastAccessed: new Date().toISOString()
        })
        
                cacheBook(data)
        
      } catch (error) {
        console.error('Error loading book:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadBook()
  }, [bookId, getCachedBook, cacheBook, getProgress ])
  
    useEffect(() => {
    if (!bookData || loading) return
    
        const progress = getProgress(bookId)
    if (progress && contentRef.current && !showAnalysis) {
            window.setTimeout(() => {
        window.scrollTo({
          top: progress.scrollPosition,
          behavior: 'auto'
        })
      }, 100)
    }
    
        const handleScroll = () => {
      if (bookId) {
        saveProgress(bookId, {
          scrollPosition: window.scrollY,
          lastAnalysisType: showAnalysis ? 'characters' : undefined
        })
      }
    }
    
        let scrollTimer: NodeJS.Timeout
    const debouncedScroll = () => {
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(handleScroll, 200)
    }
    
    window.addEventListener('scroll', debouncedScroll)
    return () => {
      window.removeEventListener('scroll', debouncedScroll)
      handleScroll()     }
  }, [bookId, bookData, loading, showAnalysis, saveProgress, getProgress])
  
    const handleToggleSave = () => {
    if (isSaved) {
      removeBookFromCache(bookId)
      setIsSaved(false)
    } else {
      if (bookData) {
        cacheBook(bookData)
      }
      setIsSaved(true)
    }
  }
  
  const handleAnalysisToggle = (show: boolean) => {
    setShowAnalysis(show)
    
        if (bookId) {
      saveProgress(bookId, {
        lastAnalysisType: show ? 'characters' : undefined
      })
    }
    
        window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
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
        <p className="mb-8">We couldn&apos;t find a book with the ID: {bookId}</p>
        <Button onClick={() => router.push('/')}>
          Return Home
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6" ref={contentRef}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/')}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold truncate max-w-md">{bookData.title}</h1>
        </div>
        
        <Button 
          variant={isSaved ? "outline" : "default"}
          onClick={handleToggleSave}
        >
          {isSaved ? (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Book
            </>
          )}
        </Button>
      </div>
      
      {!showAnalysis ? (
        <BookDisplay 
          book={bookData} 
          onAnalyze={() => handleAnalysisToggle(true)} 
        />
      ) : (
        <>
          <Button 
            variant="outline" 
            onClick={() => handleAnalysisToggle(false)}
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