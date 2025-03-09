"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Book, Sparkles, Clock, ChevronRight, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useBookCacheStore } from '@/lib/bookCacheStore'
import { Analysis } from '@/types'
import { convertNumberToOrdinal } from '@/lib/utils'


export default function AnalysisPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const {
    getSavedAnalyses
  } = useBookCacheStore()
  useEffect(() => {
    setAnalyses(getSavedAnalyses())
  }, [getSavedAnalyses])
  
  const filteredAnalyses = analyses.filter(
    analysis => 
      analysis.bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.type.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const removeAnalysis = (id: string) => {
    setAnalyses(analyses.filter(analysis => analysis.id !== id))
  }
  
  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">Text Analysis</h1>
        <p className="text-gray-600">
          View your saved analyses and gain deeper insights into your favorite books.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Create New Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-gray-600">Select a book to analyze with AI or view your existing analyses below.</p>
          <Button onClick={() => router.push('/')}>
            <Book className="mr-2 h-4 w-4" />
            Select a Book to Analyze
          </Button>
        </CardContent>
      </Card>
      
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Your Analyses</h2>
          
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search analyses..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {filteredAnalyses.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">
                {searchTerm ? 'No analyses match your search.' : 'You have no saved analyses yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAnalyses.map(analysis => (
              <Card key={analysis.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="bg-purple-100 text-purple-800 rounded-full h-10 w-10 flex items-center justify-center">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{`${analysis.bookTitle} - ${convertNumberToOrdinal((analysis.chapterIndex ?? 0) + 1)} Chapter`}</h3>
                        <p className="text-sm text-gray-600">{analysis.author}</p>
                        <div className="flex items-center mt-2">
                          <span className="text-xs px-2 py-1 rounded-full">
                            {analysis.type}
                          </span>
                          <span className="text-xs text-gray-500 ml-2 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDistanceToNow(analysis.date, { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push(`/books/${analysis.bookId}`)}
                      >
                        <span className="mr-1">View</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeAnalysis(analysis.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}