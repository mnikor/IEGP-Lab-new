import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  ExternalLink,
  FileText,
  Lightbulb,
  AlertCircle
} from 'lucide-react';

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

interface ResearchSidebarProps {
  researchResults: ResearchResult[];
  isOpen: boolean;
  onToggle: () => void;
}

export const ResearchSidebar: React.FC<ResearchSidebarProps> = ({
  researchResults,
  isOpen,
  onToggle
}) => {
  const [activeSection, setActiveSection] = useState<'insights' | 'findings' | 'citations'>('insights');

  const hasResearchData = researchResults && researchResults.length > 0;
  const totalCitations = hasResearchData 
    ? researchResults.reduce((acc, result) => acc + (result.rawResults.citations?.length || 0), 0)
    : 0;

  const getSearchTypeColor = (type: string) => {
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

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className={`fixed top-1/2 z-50 transition-all duration-300 ${
          isOpen ? 'right-[420px]' : 'right-4'
        } transform -translate-y-1/2 bg-white shadow-lg border-2 hover:bg-blue-50`}
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        <span className="ml-1 text-xs">
          {isOpen ? 'Hide' : 'Research'}
        </span>
        {hasResearchData && !isOpen && (
          <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700">
            {researchResults.length}
          </Badge>
        )}
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full bg-white border-l shadow-xl transition-transform duration-300 z-40 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '400px' }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Research Intelligence</h3>
              </div>
              {hasResearchData && (
                <div className="flex space-x-2">
                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                    {researchResults.length} searches
                  </Badge>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    {totalCitations} citations
                  </Badge>
                </div>
              )}
            </div>
            
            {hasResearchData && (
              <div className="mt-3 flex space-x-1">
                <Button
                  variant={activeSection === 'insights' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveSection('insights')}
                  className="flex-1"
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Insights
                </Button>
                <Button
                  variant={activeSection === 'findings' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveSection('findings')}
                  className="flex-1"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Findings
                </Button>
                <Button
                  variant={activeSection === 'citations' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveSection('citations')}
                  className="flex-1"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Sources
                </Button>
              </div>
            )}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-4">
            {!hasResearchData ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h4 className="font-medium text-gray-700 mb-2">No Research Data</h4>
                <p className="text-sm text-gray-500">
                  Generate concepts with research strategy to see intelligence here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeSection === 'insights' && (
                  <>
                    {researchResults.map((result, index) => (
                      <Card key={result.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-sm font-medium leading-tight">
                              {result.searchQuery}
                            </CardTitle>
                            <div className="flex space-x-1 ml-2 flex-shrink-0">
                              <Badge className={getSearchTypeColor(result.searchType)} variant="outline">
                                {result.searchType}
                              </Badge>
                              <Badge className={getPriorityColor(result.priority)} variant="outline">
                                P{result.priority}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {result.synthesizedInsights && (
                            <div className="bg-blue-50 rounded-lg p-3 mb-3">
                              <h5 className="text-xs font-semibold text-blue-800 mb-1">Key Insights</h5>
                              <p className="text-xs text-blue-700 leading-relaxed">
                                {result.synthesizedInsights}
                              </p>
                            </div>
                          )}
                          
                          {result.designImplications && result.designImplications.length > 0 && (
                            <div className="mb-3">
                              <h5 className="text-xs font-semibold text-gray-700 mb-1">Design Implications</h5>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {result.designImplications.slice(0, 3).map((implication, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-gray-400 mr-1">•</span>
                                    <span>{implication}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="text-xs text-gray-500">
                            {result.rawResults.citations?.length || 0} sources referenced
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}

                {activeSection === 'findings' && (
                  <>
                    {researchResults.map((result, index) => (
                      <Card key={result.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-sm font-medium">
                              {result.searchType} Research
                            </CardTitle>
                            <Badge className={getPriorityColor(result.priority)} variant="outline">
                              Priority {result.priority}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {result.keyFindings && result.keyFindings.length > 0 ? (
                            <div className="space-y-2">
                              {result.keyFindings.map((finding, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-lg p-2">
                                  <p className="text-xs text-gray-700">{finding}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 italic">No specific findings extracted</p>
                          )}

                          {result.strategicRecommendations && result.strategicRecommendations.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <h5 className="text-xs font-semibold text-gray-700 mb-2">Recommendations</h5>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {result.strategicRecommendations.slice(0, 2).map((rec, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-blue-400 mr-1">→</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}

                {activeSection === 'citations' && (
                  <>
                    {researchResults.map((result, index) => (
                      <Card key={result.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            {result.searchType} Sources
                          </CardTitle>
                          <p className="text-xs text-gray-500">
                            {result.rawResults.citations?.length || 0} citations
                          </p>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {result.rawResults.citations && result.rawResults.citations.length > 0 ? (
                            <div className="space-y-2">
                              {result.rawResults.citations.map((citation, idx) => (
                                <div key={idx} className="flex items-start space-x-2">
                                  <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                                    {idx + 1}.
                                  </span>
                                  <a
                                    href={citation}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline leading-relaxed break-all"
                                  >
                                    {citation}
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 italic">No citations available</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Overlay when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-30"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default ResearchSidebar;