"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Info, BarChart3, ChevronDown, ChevronUp, Tag } from 'lucide-react'

type BookProps = {
  id: string
  title: string
  author: string
  content: string
  coverImage?: string
  subjects: string[]
  language: string
  publisher?: string
  categories?: string[]
  publishDate?: string
  rights?: string

}

const BookDisplay = ({ 
  book,
  onAnalyze
}: {
  book: BookProps
  onAnalyze: () => void
}) => {
  const [expandedContent, setExpandedContent] = useState(false)
  const contentPreview = expandedContent 
    ? book.content 
    : book.content.slice(0, 1000) + '...'

  // Combine subjects and categories for display, removing duplicates
  const allCategories = [...new Set([
    ...(book.subjects || []),
    ...(book.categories || [])
  ])];

  // Default cover image if none provided
  const coverImage = book.coverImage || `/api/placeholder/240/320`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>{book.title}</CardTitle>
              <CardDescription>{book.author}</CardDescription>
            </div>
            
            {/* Categories badges */}
            <div className="flex flex-wrap gap-1">
              {allCategories.slice(0, 3).map((category, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {category}
                </Badge>
              ))}
              {allCategories.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{allCategories.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Book cover and quick info sidebar */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center">
              {/* Book cover image */}
              <div className="relative w-full max-w-[240px] h-[320px] mb-4 overflow-hidden rounded-md shadow-md border border-gray-200">
                <Image 
                  src={coverImage}
                  alt={`Cover for ${book.title}`}
                  fill
                  className="object-cover"
                />
              </div>
              
              {/* Quick metadata */}
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Language:</span>
                  <span>{book.language}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Published:</span>
                  <span>{book.publishDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Publisher:</span>
                  <span>{book.publisher}</span>
                </div>
              </div>
              
              {/* Category list for sidebar */}
              <div className="w-full mt-4">
                <h4 className="text-sm font-medium flex items-center mb-2">
                  <Tag className="h-4 w-4 mr-1" /> 
                  Categories
                </h4>
                <div className="flex flex-wrap gap-1">
                  {allCategories.map((category, index) => (
                    <Badge key={index} variant="outline" className="text-xs mb-1">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Analyze button in sidebar */}
              <Button 
                onClick={onAnalyze} 
                className="w-full mt-6"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Analyze This Book
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Main content area */}
        <div className="md:col-span-3">
          <Tabs defaultValue="content">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="content" className="flex items-center">
                <BookOpen className="mr-2 h-4 w-4" />
                Content
              </TabsTrigger>
              <TabsTrigger value="metadata" className="flex items-center">
                <Info className="mr-2 h-4 w-4" />
                Metadata
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center">
                <BarChart3 className="mr-2 h-4 w-4" />
                Analysis
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {contentPreview}
                    </pre>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 flex items-center"
                    onClick={() => setExpandedContent(!expandedContent)}
                  >
                    {expandedContent ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Show More
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="metadata">
              <Card>
                <CardContent className="pt-6">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Title</dt>
                      <dd className="mt-1 text-sm text-gray-1000">{book.title}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Author</dt>
                      <dd className="mt-1 text-sm text-gray-1000">{book.author}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Language</dt>
                      <dd className="mt-1 text-sm text-gray-1000">{book.language}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Publisher</dt>
                      <dd className="mt-1 text-sm text-gray-1000">{book.publisher}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Publish Date</dt>
                      <dd className="mt-1 text-sm text-gray-1000">{book.publishDate}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Rights</dt>
                      <dd className="mt-1 text-sm text-gray-1000">{book.rights}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 flex items-center">
                        <Tag className="h-4 w-4 mr-1" /> 
                        Categories & Subjects
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <div className="flex flex-wrap gap-2">
                          {allCategories.map((category, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 rounded-full text-xs bg-gray-100"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="analysis">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="mb-4">Run an AI-powered analysis to identify key characters, plot elements, and more.</p>
                  <Button onClick={onAnalyze}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analyze This Book
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default BookDisplay