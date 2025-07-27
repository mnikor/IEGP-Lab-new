import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Loader2, FileText, Search, Lightbulb, ExternalLink } from 'lucide-react';

interface ResearchResult {
  id: number;
  searchQuery: string;
  searchType: string;
  priority: number;
  synthesizedInsights: string;
  keyFindings: string[];
  designImplications: string[];
  strategicRecommendations: string[];
  rawResults: {
    content: string;
    citations: string[];
    error?: string;
  };
}

interface SituationalAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  drugName: string;
  indication: string;
  researchResults: ResearchResult[];
  isLoading: boolean;
}

export const SituationalAnalysisModal: React.FC<SituationalAnalysisModalProps> = ({
  isOpen,
  onClose,
  drugName,
  indication,
  researchResults,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState('overview');



  if (!isOpen) return null;

  const processMarkdown = (text: string) => {
    if (!text) return '';
    
    // Simple text formatting - no table processing to avoid alignment issues
    let processed = text
      .replace(/## (.*?)\n/g, '<h2 class="text-lg font-bold mt-4 mb-2 text-blue-900 border-b border-blue-200 pb-1">$1</h2>')
      .replace(/### (.*?)\n/g, '<h3 class="text-base font-semibold mt-3 mb-2 text-blue-800">$1</h3>')
      .replace(/#### (.*?)\n/g, '<h4 class="text-sm font-medium mt-2 mb-1 text-blue-700">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-blue-900">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em class="italic text-blue-700">$1</em>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/^\- (.*$)/gm, '<div class="ml-4 mb-1">• $1</div>')
      .replace(/^• (.*$)/gm, '<div class="ml-4 mb-1">• $1</div>');

    // Highlight NCT numbers for clinical trials
    processed = processed.replace(/NCT\d{8}/g, '<span class="inline-block bg-blue-100 text-blue-800 font-mono text-sm px-2 py-1 rounded border font-semibold">$&</span>');
    
    // Handle pipe-separated content as simple formatted text blocks instead of tables
    processed = processed.replace(/\|([^|\n]+\|[^|\n]*)/g, '<div class="bg-gray-50 p-2 rounded text-sm border-l-4 border-blue-300 mb-2">$1</div>');
    
    return processed;
  };

  const getSearchTypeColor = (type: string | undefined) => {
    if (!type || typeof type !== 'string') return 'bg-gray-100 text-gray-700 border-gray-200';
    switch (type.toLowerCase()) {
      case 'regulatory':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'competitive':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'therapeutic':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'strategic':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'bg-red-100 text-red-700';
    if (priority === 2) return 'bg-orange-100 text-orange-700';
    return 'bg-blue-100 text-blue-700';
  };

  const totalCitations = researchResults ? researchResults.reduce((acc, result) => 
    acc + (result.rawResults?.citations?.length || 0), 0
  ) : 0;

  const getSearchesByType = (type: string) => 
    researchResults ? researchResults.filter(result => 
      result.searchType && typeof result.searchType === 'string' && 
      result.searchType.toLowerCase() === type.toLowerCase()
    ) : [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <Search className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold">Situational Analysis: {drugName} for {indication}</h2>
              <p className="text-sm text-gray-500">
                Research insights gathered to inform study concept generation
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
              <p>Loading situational analysis...</p>
            </div>
          ) : researchResults && researchResults.length > 0 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="insights">Strategic Insights</TabsTrigger>
                <TabsTrigger value="competitive">Competitive Analysis</TabsTrigger>
                <TabsTrigger value="regulatory">Regulatory Intelligence</TabsTrigger>
                <TabsTrigger value="citations">Sources & Citations</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <span>Research Overview</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        This research was conducted using Perplexity AI to gather comprehensive evidence about {drugName} for {indication}. 
                        The analysis focused on several key strategic areas to inform optimal study design:
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-semibold text-blue-900 mb-2">Research Scope</h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• {researchResults.length} targeted research queries</li>
                            <li>• {totalCitations} authentic medical sources</li>
                            <li>• Multi-faceted competitive intelligence</li>
                            <li>• Real-time regulatory landscape analysis</li>
                          </ul>
                        </div>
                        
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h4 className="font-semibold text-green-900 mb-2">Analysis Categories</h4>
                          <div className="space-y-2">
                            {['therapeutic', 'competitive', 'regulatory', 'strategic'].map(type => {
                              const count = getSearchesByType(type).length;
                              if (count === 0) return null;
                              return (
                                <div key={type} className="flex items-center justify-between">
                                  <Badge className={getSearchTypeColor(type)} variant="outline">
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                  </Badge>
                                  <span className="text-sm text-green-700">{count} queries</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <h4 className="font-semibold text-yellow-800 mb-2">Key Research Insights</h4>
                        <p className="text-sm text-yellow-700">
                          This data directly informs the AI-powered study concept generation, ensuring designs are 
                          grounded in current medical evidence, competitive intelligence, and regulatory considerations.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="insights">
                <div className="space-y-4">
                  {researchResults.map((result, index) => (
                    <Card key={result.id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base font-medium">
                              {result.searchQuery}
                            </CardTitle>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge className={getSearchTypeColor(result.searchType)} variant="outline">
                                {result.searchType}
                              </Badge>
                              <Badge className={getPriorityColor(result.priority)} variant="outline">
                                Priority {result.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {result.synthesizedInsights && (
                          <div className="mb-4">
                            <h5 className="font-semibold text-gray-800 mb-2 flex items-center">
                              <Lightbulb className="h-4 w-4 mr-1 text-blue-600" />
                              Strategic Insights
                            </h5>
                            <div 
                              className="prose prose-sm max-w-none text-gray-700"
                              dangerouslySetInnerHTML={{ __html: processMarkdown(result.synthesizedInsights) }}
                            />
                          </div>
                        )}

                        {result.designImplications && result.designImplications.length > 0 && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <h5 className="font-semibold text-gray-700 mb-2">Study Design Implications</h5>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {result.designImplications.map((implication, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="text-blue-400 mr-2">→</span>
                                  <span>{implication}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-3 text-xs text-gray-500">
                          {result.rawResults.citations?.length || 0} sources referenced
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="competitive">
                <div className="space-y-4">
                  {getSearchesByType('competitive').map((result) => (
                    <Card key={result.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{result.searchQuery}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {result.rawResults.content && (
                          <div 
                            className="text-sm text-gray-700 leading-relaxed max-w-none overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: processMarkdown(result.rawResults.content) }}
                          />
                        )}
                        {result.strategicRecommendations && result.strategicRecommendations.length > 0 && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <h5 className="font-semibold text-blue-800 mb-2">Competitive Recommendations</h5>
                            <ul className="text-sm text-blue-700 space-y-1">
                              {result.strategicRecommendations.map((rec, idx) => (
                                <li key={idx}>• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {getSearchesByType('competitive').length === 0 && (
                    <p className="text-gray-500 text-center py-8">No competitive analysis data available</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="regulatory">
                <div className="space-y-4">
                  {getSearchesByType('regulatory').map((result) => (
                    <Card key={result.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{result.searchQuery}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {result.rawResults.content && (
                          <div 
                            className="text-sm text-gray-700 leading-relaxed max-w-none overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: processMarkdown(result.rawResults.content) }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {getSearchesByType('regulatory').length === 0 && (
                    <p className="text-gray-500 text-center py-8">No regulatory intelligence data available</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="citations">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <ExternalLink className="h-5 w-5 text-blue-600" />
                        <span>Research Sources & Citations</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        All research insights are backed by authentic medical sources including clinical databases, 
                        peer-reviewed journals, and regulatory documents.
                      </p>
                      
                      {researchResults.map((result, index) => (
                        <div key={result.id} className="mb-6 p-4 border border-gray-200 rounded-lg">
                          <h4 className="font-semibold text-gray-800 mb-2">{result.searchQuery}</h4>
                          <div className="text-xs text-gray-500 mb-3">
                            {result.rawResults.citations?.length || 0} citations
                          </div>
                          
                          {result.rawResults.citations && result.rawResults.citations.length > 0 ? (
                            <ol className="space-y-2 text-sm">
                              {result.rawResults.citations.map((citation, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="text-gray-400 mr-2 flex-shrink-0">{idx + 1}.</span>
                                  <a
                                    href={citation}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                                  >
                                    {citation}
                                  </a>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No citations available for this search</p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Research Data Available</h3>
              <p className="text-gray-500">
                Generate concepts with research strategy to see situational analysis here.
              </p>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SituationalAnalysisModal;