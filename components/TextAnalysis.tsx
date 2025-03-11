'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  User,
  Bookmark,
  MessageSquare,
  Download,
  BookOpen,
  Globe,
  Loader2,
  Database,
  Lock,
  KeyRound,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { AnalysisType } from '@/types';
import { splitBookIntoChapters, getChapterPreview } from '@/lib/chapterUtils';
import { analyzeWithGroq, detectLanguage } from '@/lib/groqService';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBookCacheStore } from '@/lib/bookCacheStore';
import { ApiKeyModal, getStoredApiKey } from '@/components/ApiKeyModal';
import CharacterRelationshipGraph from './ui/graph';

type AnalysisProps = {
  bookId: string;
  bookTitle: string;
  bookContent: string;
};

const TEXT_ANALYSIS_SERVICE = 'Groq AI';

const TextAnalysis = ({ bookId, bookTitle, bookContent }: AnalysisProps) => {
  const [activeAnalysis, setActiveAnalysis] =
    useState<AnalysisType>('characters');
  const [isLoading, setIsLoading] = useState(false);
  const [chapters, setChapters] = useState<
    { title: string; content: string }[]
  >([]);
  const [activeChapter, setActiveChapter] = useState<number>(0);
  const [language, setLanguage] = useState<{
    language: string;
    confidence: number;
  } | null>(null);
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'analyze' | 'detectLanguage' | 'analyze-all';
    chapterIndex?: number;
    analysisType?: AnalysisType;
  } | null>(null);

  const { getCachedAnalysis, cacheAnalysis, saveProgress, getProgress } =
    useBookCacheStore();

  const [analysisData, setAnalysisData] = useState<{
    [chapterIndex: number]: {
      [key in AnalysisType]?: any;
    };
  }>({});

  useEffect(() => {
    const storedKey = getStoredApiKey(TEXT_ANALYSIS_SERVICE);
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  useEffect(() => {
    if (bookContent) {
      const detectedChapters = splitBookIntoChapters(bookContent);
      setChapters(detectedChapters);
    }
  }, [bookContent]);

  useEffect(() => {
    const newAnalysisData = { ...analysisData };

    for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
      for (const type of [
        'characters',
        'summary',
        'sentiment',
        'themes',
      ] as AnalysisType[]) {
        const cachedResult = getCachedAnalysis(bookId, chapterIndex, type);
        if (cachedResult) {
          if (!newAnalysisData[chapterIndex]) {
            newAnalysisData[chapterIndex] = {};
          }
          newAnalysisData[chapterIndex][type] = cachedResult;
        }
      }
    }

    if (Object.keys(newAnalysisData).length > 0) {
      setAnalysisData(newAnalysisData);
    }

    const progress = getProgress(bookId);
    if (progress) {
      if (
        progress.currentChapter !== undefined &&
        chapters[progress.currentChapter]
      ) {
        setActiveChapter(progress.currentChapter);
      }

      if (progress.lastAnalysisType) {
        setActiveAnalysis(progress.lastAnalysisType);
      }
    }
  }, [bookId, chapters]);

  useEffect(() => {
    if (bookId) {
      saveProgress(bookId, {
        currentChapter: activeChapter,
        lastAnalysisType: activeAnalysis,
      });
    }
  }, [bookId, activeChapter, activeAnalysis, saveProgress]);

  const performLanguageDetection = async (currentApiKey: string) => {
    setIsDetectingLanguage(true);
    setError(null);

    try {
      process.env.NEXT_PUBLIC_GROQ_API_KEY = currentApiKey;

      const result = await detectLanguage(bookContent);
      setLanguage(result);
    } catch (err: any) {
      if (
        err.message?.includes('API key') ||
        err.message?.includes('authentication') ||
        err.message?.includes('unauthorized')
      ) {
        setError('Invalid API key. Please check your API key and try again.');
        setApiKey(null);
      } else {
        setError(`Failed to detect language: ${err.message}`);
        console.error('Language detection error:', err);
      }
    } finally {
      setIsDetectingLanguage(false);
    }
  };
  useEffect(() => {
    if (apiKey && pendingAction) {
      process.env.NEXT_PUBLIC_GROQ_API_KEY = apiKey;

      if (
        pendingAction.type === 'analyze' &&
        pendingAction.chapterIndex !== undefined &&
        pendingAction.analysisType
      ) {
        performAnalysis(
          pendingAction.chapterIndex,
          pendingAction.analysisType,
          apiKey
        );
      } else if (pendingAction.type === 'detectLanguage') {
        performLanguageDetection(apiKey);
      } else if (pendingAction.type === 'analyze-all') {
        process.env.NEXT_PUBLIC_GROQ_API_KEY = apiKey;
        analyzeAllChapters();
      }

      setPendingAction(null);
    }
  }, [apiKey, pendingAction]);

  const handleDetectLanguage = async () => {
    if (isDetectingLanguage) return;

    if (!apiKey) {
      setPendingAction({
        type: 'detectLanguage',
      });
      setShowApiKeyModal(true);
      return;
    }

    performLanguageDetection(apiKey);
  };

  const analyzeAllChapters = async () => {
    if (isLoading || chapters.length === 0) return;

    try {
      setIsLoading(true);
      setError(null);

      if (!apiKey) {
        setPendingAction({
          type: 'analyze-all',
          chapterIndex: -1,
          analysisType: activeAnalysis,
        });
        setShowApiKeyModal(true);
        return;
      }

      for (let i = 0; i < chapters.length; i++) {
        setAnalysisProgress(Math.round((i / chapters.length) * 100));

        if (checkExistingChapterAnalysis(i, activeAnalysis)) {
          continue;
        }

        await performAnalysis(i, activeAnalysis, apiKey, false);
      }

      setAnalysisProgress(100);
    } catch (err: any) {
      setError(`Analysis failed: ${err.message || 'Unknown error'}`);
      console.error('Analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkExistingChapterAnalysis = (
    chapterIndex: number,
    type: AnalysisType
  ) => {
    if (analysisData[chapterIndex] && analysisData[chapterIndex][type]) {
      setActiveChapter(chapterIndex);
      setActiveAnalysis(type);
      return true;
    }

    const cachedResult = getCachedAnalysis(bookId, chapterIndex, type);
    if (cachedResult) {
      setAnalysisData((prev) => ({
        ...prev,
        [chapterIndex]: {
          ...prev[chapterIndex],
          [type]: cachedResult,
        },
      }));
      setActiveChapter(chapterIndex);
      setActiveAnalysis(type);
      return true;
    }
    return false;
  };

  const handleAnalyzeChapter = async (
    chapterIndex: number,
    type: AnalysisType
  ) => {
    if (isLoading) return;

    if (checkExistingChapterAnalysis(chapterIndex, type)) {
      return;
    }
    if (!apiKey) {
      setPendingAction({
        type: 'analyze',
        chapterIndex,
        analysisType: type,
      });
      setShowApiKeyModal(true);
      return;
    }

    performAnalysis(chapterIndex, type, apiKey);
  };

  const performAnalysis = async (
    chapterIndex: number,
    type: AnalysisType,
    currentApiKey: string,
    modifyLoading: boolean = true
  ) => {
    if (modifyLoading) {
      setIsLoading(true);
      setAnalysisProgress(0);
    }

    setError(null);

    const chapterContent = chapters[chapterIndex].content;
    try {
      process.env.NEXT_PUBLIC_GROQ_API_KEY = currentApiKey;

      const result = await analyzeWithGroq(chapterContent, type);

      setAnalysisData((prev) => ({
        ...prev,
        [chapterIndex]: {
          ...prev[chapterIndex],
          [type]: result,
        },
      }));

      cacheAnalysis({
        bookId,
        chapterIndex,
        analysisType: type,
        result,
      });

      setActiveChapter(chapterIndex);
    } catch (err: any) {
      if (
        err.message?.includes('API key') ||
        err.message?.includes('authentication') ||
        err.message?.includes('unauthorized')
      ) {
        setError('Invalid API key. Please check your API key and try again.');
        setApiKey(null);
        setShowApiKeyModal(true);
      } else {
        setError(`Analysis failed: ${err.message || 'Unknown error'}`);
        console.error('Analysis error:', err);
      }
    } finally {
      if (modifyLoading) {
        setIsLoading(false);
        setAnalysisProgress(100);
      }
    }
  };

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
  };

  const isChapterAnalyzed = (chapterIndex: number, type: AnalysisType) => {
    return !!(analysisData[chapterIndex] && analysisData[chapterIndex][type]);
  };

  const getCurrentAnalysisData = () => {
    if (
      analysisData[activeChapter] &&
      analysisData[activeChapter][activeAnalysis]
    ) {
      return analysisData[activeChapter][activeAnalysis];
    }
    return null;
  };

  const exportAnalysis = () => {
    const analysisJson = JSON.stringify(analysisData, null, 2);
    const blob = new Blob([analysisJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${bookTitle.replace(/\s+/g, '_')}_analysis.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-xl">
                  AI Analysis for &quot;{bookTitle}&quot;
                </CardTitle>
                <CardDescription>
                  {chapters.length === 1
                    ? '1 chapter detected'
                    : `${chapters.length} chapters detected`}

                  {language && (
                    <Badge variant="outline" className="ml-2">
                      {language.language}
                    </Badge>
                  )}

                  {apiKey ? (
                    <Badge
                      variant="outline"
                      className="ml-2 text-green-700 border-green-200"
                    >
                      <KeyRound className="h-3 w-3 mr-1" />
                      API Key Set
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="ml-2 text-amber-700 border-amber-200"
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      API Key Required
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
                  {Object.values(analysisData).reduce(
                    (count, chapterData) =>
                      count + Object.keys(chapterData).length,
                    0
                  )}{' '}
                  cached
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
              onValueChange={(value) =>
                setActiveAnalysis(value as AnalysisType)
              }
            >
              <TabsList className="grid grid-cols-5 mb-6">
                <TabsTrigger
                  value="characters"
                  className="flex items-center"
                  disabled={isLoading}
                >
                  <User className="mr-2 h-5 w-5" />
                  Characters
                </TabsTrigger>
                <TabsTrigger
                  value="summary"
                  className="flex items-center"
                  disabled={isLoading}
                >
                  <Bookmark className="mr-2 h-5 w-5" />
                  Summary
                </TabsTrigger>
                <TabsTrigger
                  value="sentiment"
                  className="flex items-center"
                  disabled={isLoading}
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Sentiment
                </TabsTrigger>
                <TabsTrigger
                  value="themes"
                  className="flex items-center"
                  disabled={isLoading}
                >
                  <AlertCircle className="mr-2 h-5 w-5" />
                  Themes
                </TabsTrigger>
                <TabsTrigger
                  value="character-graph"
                  className="flex items-center"
                  disabled={isLoading}
                >
                  <AlertCircle className="mr-2 h-5 w-5" />
                  Character Relationship
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
                              <Badge variant="secondary" className="text-xs">
                                Analyzed
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="text-xs text-gray-600 mb-2">
                            {getChapterPreview(chapter.content)}
                          </div>
                          <Button
                            size="sm"
                            variant={
                              activeChapter === index ? 'default' : 'outline'
                            }
                            onClick={() =>
                              handleAnalyzeChapter(index, activeAnalysis)
                            }
                            disabled={isLoading}
                          >
                            {isChapterAnalyzed(index, activeAnalysis)
                              ? 'View Analysis'
                              : 'Analyze Chapter'}
                          </Button>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
              {!isLoading && (
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
              )}
              {isLoading && (
                <div className="mt-2 mb-6">
                  <Progress value={analysisProgress} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    Analyzing with Groq AI...
                  </p>
                </div>
              )}

              {/* Characters Analysis */}
              <TabsContent value="characters">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
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
                      getCurrentAnalysisData().map(
                        (character: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-start space-x-3"
                          >
                            <div className="bg-blue-100 text-blue-800 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
                              {character.name ? character.name.charAt(0) : '?'}
                            </div>
                            <div>
                              <h3 className="font-medium">{character.name}</h3>
                              <p className="text-sm text-gray-600">
                                {character.description}
                              </p>
                              <span className="inline-block mt-1 px-2 py-1 rounded text-xs bg-gray-900">
                                {character.importance}
                              </span>
                            </div>
                          </div>
                        )
                      )
                    ) : (
                      <p className="text-gray-600">
                        Could not display character analysis properly.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="mb-4 text-gray-600">
                      Select a chapter above to run character analysis
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Summary Analysis */}
              <TabsContent value="summary">
                {isLoading ? (
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
                    <p className="mb-4 text-gray-600">
                      Select a chapter above to generate a summary
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Sentiment Analysis */}
              <TabsContent value="sentiment">
                {isLoading ? (
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
                          <h3 className="text-sm font-medium uppercase text-gray-500">
                            Overall Tone
                          </h3>
                          <p className="text-2xl font-bold mt-2">
                            {getCurrentAnalysisData().overall}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-50">
                        <CardContent className="pt-6 text-center">
                          <h3 className="text-sm font-medium uppercase text-gray-500">
                            Beginning
                          </h3>
                          <p className="text-xl font-medium mt-2">
                            {getCurrentAnalysisData().beginning}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-50">
                        <CardContent className="pt-6 text-center">
                          <h3 className="text-sm font-medium uppercase text-gray-500">
                            Middle
                          </h3>
                          <p className="text-xl font-medium mt-2">
                            {getCurrentAnalysisData().middle}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-50">
                        <CardContent className="pt-6 text-center">
                          <h3 className="text-sm font-medium uppercase text-gray-500">
                            End
                          </h3>
                          <p className="text-xl font-medium mt-2">
                            {getCurrentAnalysisData().end}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    <p className="text-gray-700">
                      {getCurrentAnalysisData().analysis}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="mb-4 text-gray-600">
                      Select a chapter above to analyze sentiment
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Themes Analysis */}
              <TabsContent value="themes">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
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
                        getCurrentAnalysisData().map(
                          (theme: any, index: number) => (
                            <div
                              key={index}
                              className="border-l-4 border-blue-500 pl-4 py-2"
                            >
                              <h3 className="font-medium">{theme.theme}</h3>
                              <p className="text-sm text-gray-600">
                                {theme.description}
                              </p>
                            </div>
                          )
                        )
                      ) : (
                        <p className="text-gray-600">
                          Could not display theme analysis properly.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="mb-4 text-gray-600">
                      Select a chapter above to analyze themes
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Character Relationship Graph */}
              <TabsContent value="character-graph">
                {/* <div className="text-center py-8">
                <p className="mb-4 text-gray-600">Character Relationship Graph</p>
              </div> */}
                <CharacterRelationshipGraph
                  characterData={getCurrentAnalysisData()}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSubmit={handleApiKeySubmit}
        serviceName={TEXT_ANALYSIS_SERVICE}
      />
    </>
  );
};

export default TextAnalysis;
