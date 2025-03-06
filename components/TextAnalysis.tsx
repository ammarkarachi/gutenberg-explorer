"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AlertCircle, 
  User, 
  Bookmark, 
  MessageSquare, 
  Download,
  BookOpen,
  Globe,
  Loader2,
  Database
} from 'lucide-react'
import { Skeleton } from "@/components/ui/skeleton"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { AnalysisType } from '@/types'
import { splitBookIntoChapters, getChapterPreview } from '@/lib/chapterUtils'
import { analyzeWithGroq, detectLanguage, getGroqRateLimits } from '@/lib/groqService'
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useBookCacheStore } from '@/lib/bookCacheStore'

type AnalysisProps = {
  bookId: string
  bookTitle: string
  bookContent: string
}

const TextAnalysis = ({ bookId, bookTitle, bookContent }: AnalysisProps) => {
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType>('characters')
  const [isLoading, setIsLoading] = useState(false)
  const [chapters, setChapters] = useState<{ title: string; content: string }[]>([])
  const [activeChapter, setActiveChapter] = useState<number>(0)
  const [language, setLanguage] = useState<{ language: string; confidence: number } | null>(null)
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  // Get cache functions
  const { 
    getCachedAnalysis, 
    cacheAnalysis, 
    saveProgress, 
    getProgress 
  } = useBookCacheStore()
  
  // Store analysis results by chapter and type
  const [analysisData, setAnalysisData] = useState<{
    [chapterIndex: number]: {
      [key in AnalysisType]?: any
    }
  }>({})
  
  // Split the book into chapters on component mount
  useEffect(() => {
    if (bookContent) {
      const detectedChapters = splitBookIntoChapters(bookContent)
      setChapters(detectedChapters)
    }
  }, [bookContent])
  
  // Load cached analyses and restore progress
  useEffect(() => {
    // Initialize analyses from cache
    const newAnalysisData = { ...analysisData }
    
    // Go through all chapters and analysis types to check cache
    for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
      for (const type of ['characters', 'summary', 'sentiment', 'themes'] as AnalysisType[]) {
        const cachedResult = getCachedAnalysis(bookId, chapterIndex, type)
        if (cachedResult) {
          if (!newAnalysisData[chapterIndex]) {
            newAnalysisData[chapterIndex] = {}
          }
          newAnalysisData[chapterIndex][type] = cachedResult
        }
      }
    }
    
    // Set analysis data if we found cached results
    if (Object.keys(newAnalysisData).length > 0) {
      setAnalysisData(newAnalysisData)
    }
    
    // Restore progress if available
    const progress = getProgress(bookId)
    if (progress) {
      if (progress.currentChapter !== undefined && chapters[progress.currentChapter]) {
        setActiveChapter(progress.currentChapter)
      }
      
      if (progress.lastAnalysisType) {
        setActiveAnalysis(progress.lastAnalysisType)
      }
    }
  }, [bookId, chapters.length, getCachedAnalysis, getProgress])
  
  // Save progress when chapter or analysis type changes
  useEffect(() => {
    if (bookId) {
      saveProgress(bookId, {
        currentChapter: activeChapter,
        lastAnalysisType: activeAnalysis
      })
    }
  }, [bookId, activeChapter, activeAnalysis, saveProgress])
  
  // Function to detect language
  const handleDetectLanguage = async () => {
    if (isDetectingLanguage) return
    
    try {
      setIsDetectingLanguage(true)
      setError(null)
      
      const result = await detectLanguage(bookContent)
      setLanguage(result)
      
      
    } catch (err: any) {
      setError(`Failed to detect language: ${err.message}`)
      console.error('Language detection error:', err)
    } finally {
      setIsDetectingLanguage(false)
    }
  }
  
  // Function to analyze a specific chapter
  const analyzeChapter = async (chapterIndex: number, type: AnalysisType) => {
    if (isLoading) return
    
    try {
      // Check if we already have this analysis (either in state or cache)
      if (
        analysisData[chapterIndex] && 
        analysisData[chapterIndex][type]
      ) {
        // Just show the existing analysis
        setActiveChapter(chapterIndex)
        setActiveAnalysis(type)
        return
      }
      
      // Check cache one more time
      const cachedResult = getCachedAnalysis(bookId, chapterIndex, type)
      if (cachedResult) {
        setAnalysisData(prev => ({
          ...prev,
          [chapterIndex]: {
            ...prev[chapterIndex],
            [type]: cachedResult
          }
        }))
        setActiveChapter(chapterIndex)
        setActiveAnalysis(type)
        return
      }
      
      // Not in cache, need to run analysis
      setIsLoading(true)
      setError(null)
      setAnalysisProgress(0)
      
      const chapterContent = chapters[chapterIndex].content
      
   
      
      // Run analysis with Groq
      const result = await analyzeWithGroq(chapterContent, type)
      
      // Update the analysis data
      setAnalysisData(prev => ({
        ...prev,
        [chapterIndex]: {
          ...prev[chapterIndex],
          [type]: result
        }
      }))
      
      // Cache the result
      cacheAnalysis({
        bookId,
        chapterIndex,
        analysisType: type,
        result
      })
      
      
      setActiveChapter(chapterIndex)
    } catch (err: any) {
      setError(`Analysis failed: ${err.message || 'Unknown error'}`)
      console.error('Analysis error:', err)
      
    } finally {
      setIsLoading(false)
      setAnalysisProgress(100)
    }
  }
  
  // Function to analyze all chapters (for the current type)
  const analyzeAllChapters = async () => {
    if (isLoading || chapters.length === 0) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      for (let i = 0; i < chapters.length; i++) {
        // Update progress
        setAnalysisProgress(Math.round((i / chapters.length) * 100))
        
        // Skip if we already have this analysis
        if (
          analysisData[i] && 
          analysisData[i][activeAnalysis]
        ) {
          continue
        }
        
        // Run analysis
        await new Promise(resolve => setTimeout(resolve, 3000))
        const result = await analyzeWithGroq(chapters[i].content, activeAnalysis)
        
        // Update the analysis data
        setAnalysisData(prev => ({
          ...prev,
          [i]: {
            ...prev[i],
            [activeAnalysis]: result
          }
        }))
      }
      
      setAnalysisProgress(100)
    } catch (err: any) {
      setError(`Analysis failed: ${err.message || 'Unknown error'}`)
      console.error('Analysis error:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Checks if a specific chapter has been analyzed
  const isChapterAnalyzed = (chapterIndex: number, type: AnalysisType) => {
    return !!(
      analysisData[chapterIndex] && 
      analysisData[chapterIndex][type]
    )
  }
  
  // Get currently active analysis data
  const getCurrentAnalysisData = () => {
    if (
      analysisData[activeChapter] && 
      analysisData[activeChapter][activeAnalysis]
    ) {
      return analysisData[activeChapter][activeAnalysis]
    }
    return null
  }
  
  // Export analysis to JSON file
  const exportAnalysis = () => {
    const analysisJson = JSON.stringify(analysisData, null, 2)
    const blob = new Blob([analysisJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `${bookTitle.replace(/\s+/g, '_')}_analysis.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl">AI Analysis for "{bookTitle}"</CardTitle>
              <CardDescription>
                {chapters.length === 1 
                  ? "1 chapter detected" 
                  : `${chapters.length} chapters detected`}
                
                {language && (
                  <Badge variant="outline" className="ml-2">
                    {language.language}
                  </Badge>
                )}
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              {!language && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDetectLanguage}
                  disabled={isDetectingLanguage}
                >
                  {isDetectingLanguage ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Detecting
                    </>
                  ) : (
                    <>
                      <Globe className="mr-1 h-3 w-3" />
                      Detect Language
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportAnalysis}
                disabled={Object.keys(analysisData).length === 0}
              >
                <Download className="mr-1 h-3 w-3" />
                Export Analysis
              </Button>
              
              <Badge variant="secondary" className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                {Object.values(analysisData).reduce((count, chapterData) => 
                  count + Object.keys(chapterData).length, 0)} cached
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Tabs 
            value={activeAnalysis} 
            onValueChange={(value) => setActiveAnalysis(value as AnalysisType)}
          >
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="characters" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                Characters
              </TabsTrigger>
              <TabsTrigger value="summary" className="flex items-center">
                <Bookmark className="mr-2 h-4 w-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="sentiment" className="flex items-center">
                <MessageSquare className="mr-2 h-4 w-4" />
                Sentiment
              </TabsTrigger>
              <TabsTrigger value="themes" className="flex items-center">
                <AlertCircle className="mr-2 h-4 w-4" />
                Themes
              </TabsTrigger>
            </TabsList>
            
            {/* Chapter selector */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <BookOpen className="mr-2 h-4 w-4" />
                Select Chapter to Analyze
              </h3>
              
              <div className="rounded-md p-2 max-h-60 overflow-y-auto">
                <Accordion type="single" collapsible>
                  {chapters.map((chapter, index) => (
                    <AccordionItem key={index} value={`chapter-${index}`}>
                      <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        <div className="flex items-center">
                          <span className="mr-2">{chapter.title}</span>
                          {isChapterAnalyzed(index, activeAnalysis) && (
                            <Badge variant="secondary" className="text-xs">Analyzed</Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-xs text-gray-600 mb-2">
                          {getChapterPreview(chapter.content)}
                        </div>
                        <Button 
                          size="sm" 
                          variant={activeChapter === index ? "default" : "outline"}
                          onClick={() => {
                            if (isChapterAnalyzed(index, activeAnalysis)) {
                              // Just switch to this chapter
                              setActiveChapter(index)
                            } else {
                              // Run analysis for this chapter
                              analyzeChapter(index, activeAnalysis)
                            }
                          }}
                          disabled={isLoading}
                        >
                          {isChapterAnalyzed(index, activeAnalysis) ? 'View Analysis' : 'Analyze Chapter'}
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
              
              <div className="mt-2 flex justify-between">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={analyzeAllChapters}
                  disabled={isLoading || chapters.length === 0}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze All Chapters'
                  )}
                </Button>
                
                {analysisData && Object.keys(analysisData).length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={exportAnalysis}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Analysis
                  </Button>
                )}
            </div>
            
            {isLoading && (
              <div className="mt-2 mb-6">
                <Progress value={analysisProgress} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  Analyzing with Groq AI...
                </p>
              </div>
            )}
            </div>
            
            {/* Characters Analysis */}
            <TabsContent value="characters">
              {isLoading && activeAnalysis === 'characters' ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[350px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : getCurrentAnalysisData() ? (
                <div className="space-y-6">
                  <div className="p-3 rounded-md">
                    <h3 className="font-medium text-sm mb-1">
                      Chapter Analysis: {chapters[activeChapter].title}
                    </h3>
                  </div>
                
                  {Array.isArray(getCurrentAnalysisData()) ? (
                    getCurrentAnalysisData().map((character: any, index: number) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="bg-blue-100 text-blue-800 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
                          {character.name ? character.name.charAt(0) : '?'}
                        </div>
                        <div>
                          <h3 className="font-medium">{character.name}</h3>
                          <p className="text-sm text-gray-600">{character.description}</p>
                          <span className="inline-block mt-1 px-2 py-1 rounded text-xs bg-gray-900">
                            {character.importance}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600">Could not display character analysis properly.</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="mb-4 text-gray-600">Select a chapter above to run character analysis</p>
                </div>
              )}
            </TabsContent>
            
            {/* Summary Analysis */}
            <TabsContent value="summary">
              {isLoading && activeAnalysis === 'summary' ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : getCurrentAnalysisData() ? (
                <div>
                  <div className="p-3 rounded-md mb-4">
                    <h3 className="font-medium text-sm mb-1">
                      Chapter Summary: {chapters[activeChapter].title}
                    </h3>
                  </div>
                  
                  <div className="prose max-w-none">
                    <p>{getCurrentAnalysisData()}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="mb-4 text-gray-600">Select a chapter above to generate a summary</p>
                </div>
              )}
            </TabsContent>
            
            {/* Sentiment Analysis */}
            <TabsContent value="sentiment">
              {isLoading && activeAnalysis === 'sentiment' ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : getCurrentAnalysisData() ? (
                <div>
                  <div className="p-3 rounded-md mb-4">
                    <h3 className="font-medium text-sm mb-1">
                      Sentiment Analysis: {chapters[activeChapter].title}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-gray-50">
                      <CardContent className="pt-6 text-center">
                        <h3 className="text-sm font-medium uppercase text-gray-500">Overall Tone</h3>
                        <p className="text-2xl font-bold mt-2">{getCurrentAnalysisData().overall}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-50">
                      <CardContent className="pt-6 text-center">
                        <h3 className="text-sm font-medium uppercase text-gray-500">Beginning</h3>
                        <p className="text-xl font-medium mt-2">{getCurrentAnalysisData().beginning}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-50">
                      <CardContent className="pt-6 text-center">
                        <h3 className="text-sm font-medium uppercase text-gray-500">Middle</h3>
                        <p className="text-xl font-medium mt-2">{getCurrentAnalysisData().middle}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-50">
                      <CardContent className="pt-6 text-center">
                        <h3 className="text-sm font-medium uppercase text-gray-500">End</h3>
                        <p className="text-xl font-medium mt-2">{getCurrentAnalysisData().end}</p>
                      </CardContent>
                    </Card>
                  </div>
                  <p className="text-gray-700">{getCurrentAnalysisData().analysis}</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="mb-4 text-gray-600">Select a chapter above to analyze sentiment</p>
                </div>
              )}
            </TabsContent>
            
            {/* Themes Analysis */}
            <TabsContent value="themes">
              {isLoading && activeAnalysis === 'themes' ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              ) : getCurrentAnalysisData() ? (
                <div>
                  <div className="p-3 rounded-md mb-4">
                    <h3 className="font-medium text-sm mb-1">
                      Theme Analysis: {chapters[activeChapter].title}
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    {Array.isArray(getCurrentAnalysisData()) ? (
                      getCurrentAnalysisData().map((theme: any, index: number) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                          <h3 className="font-medium">{theme.theme}</h3>
                          <p className="text-sm text-gray-600">{theme.description}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600">Could not display theme analysis properly.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="mb-4 text-gray-600">Select a chapter above to analyze themes</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default TextAnalysis