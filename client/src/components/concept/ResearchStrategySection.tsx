import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Edit3, 
  Play, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  Lightbulb,
  Plus,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ResearchStrategy, SearchItem } from '@shared/schema';
import type { StrategicGoal } from '@/lib/types';
import { SituationalAnalysisModal } from '@/components/concept/SituationalAnalysisModal';

interface ResearchStrategySectionProps {
  drugName: string;
  indication: string;
  strategicGoals: StrategicGoal[];
  studyPhase: string;
  geography: string[];
  onStrategyGenerated?: (strategy: ResearchStrategy) => void;
}

export const ResearchStrategySection: React.FC<ResearchStrategySectionProps> = ({
  drugName,
  indication,
  strategicGoals,
  studyPhase,
  geography,
  onStrategyGenerated
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState<ResearchStrategy | null>(null);
  const [editingSearches, setEditingSearches] = useState<SearchItem[]>([]);
  const [userNotes, setUserNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<any>(null);
  const [showResearchResults, setShowResearchResults] = useState(false);
  const [showAdditionalResearch, setShowAdditionalResearch] = useState(false);
  const [researchResults, setResearchResults] = useState<any[]>([]);
  const { toast } = useToast();

  const canGenerateStrategy = drugName && indication && strategicGoals.length > 0 && studyPhase && geography.length > 0;

  const handleGenerateStrategy = async () => {
    if (!canGenerateStrategy) {
      toast({
        title: "Missing Information",
        description: "Please fill in drug name, indication, strategic goals, study phase, and geography first",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest('POST', '/api/research-strategies/generate', {
        drugName,
        indication,
        strategicGoals,
        studyPhase,
        geography,
        sessionId: `concept_${Date.now()}`
      });

      const strategy: ResearchStrategy = await response.json();
      setCurrentStrategy(strategy);
      setEditingSearches([...(strategy.proposedSearches as SearchItem[])]);
      onStrategyGenerated?.(strategy);
      
      toast({
        title: "Research Strategy Generated",
        description: `Generated ${strategy.proposedSearches.length} targeted research queries`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate research strategy",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearchToggle = (searchId: string, enabled: boolean) => {
    setEditingSearches(searches => 
      searches.map(search => 
        search.id === searchId ? { ...search, enabled, userModified: true } : search
      )
    );
  };

  const handleSearchEdit = (searchId: string, field: keyof SearchItem, value: any) => {
    setEditingSearches(searches => 
      searches.map(search => 
        search.id === searchId ? { ...search, [field]: value, userModified: true } : search
      )
    );
  };

  const handleExecuteStrategy = async () => {
    if (!currentStrategy) return;

    // Save amendments first if any
    const hasModifications = editingSearches.some(s => s.userModified) || userNotes.trim();
    if (hasModifications) {
      try {
        await apiRequest('POST', '/api/research-strategies/amend', {
          strategyId: currentStrategy.id,
          modifiedSearches: editingSearches,
          userNotes
        });
      } catch (error) {
        console.error('Failed to save amendments:', error);
      }
    }

    setIsExecuting(true);
    try {
      const response = await apiRequest('POST', '/api/research-strategies/execute', {
        strategyId: currentStrategy.id
      });

      const results = await response.json();
      console.log("Execution results received:", results);
      setExecutionResults(results);
      setResearchResults(results.researchResults || []);
      console.log("Research results set:", results.researchResults?.length || 0);
      
      toast({
        title: "Research Executed",
        description: `Completed ${results.successfulSearches}/${results.totalSearches} searches successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Execution Failed",
        description: error.message || "Failed to execute research strategy",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getSearchTypeColor = (type: string) => {
    const colors = {
      core: 'bg-blue-100 text-blue-800',
      strategic: 'bg-green-100 text-green-800',
      therapeutic: 'bg-purple-100 text-purple-800',
      phase: 'bg-orange-100 text-orange-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 9) return 'bg-red-100 text-red-800';
    if (priority >= 7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="mb-6">
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">Research Strategy (Optional)</CardTitle>
              <CardDescription>
                Generate targeted research to inform your study concept design
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {currentStrategy && (
              <Badge variant="outline" className="text-green-700 border-green-700">
                Strategy Generated
              </Badge>
            )}
            {executionResults && (
              <Badge variant="outline" className="text-blue-700 border-blue-700">
                Research Complete
              </Badge>
            )}
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
          <CardContent>
            {!currentStrategy ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800 mb-3">
                    Generate an AI-driven research strategy to gather targeted intelligence that will inform your study design decisions.
                  </p>
                  <div className="text-xs text-blue-600 space-y-1">
                    <div>• <strong>Core Research:</strong> Regulatory precedents and unmet clinical needs</div>
                    <div>• <strong>Strategic Intelligence:</strong> Market access, competitive positioning, and biomarker validation</div>
                    <div>• <strong>Therapeutic Focus:</strong> Disease-specific design considerations and endpoints</div>
                    <div>• <strong>Phase-Specific:</strong> Requirements and regulatory guidance for your study phase</div>
                  </div>
                </div>

                <Button 
                  onClick={handleGenerateStrategy}
                  disabled={!canGenerateStrategy || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Research Strategy...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Generate Research Strategy
                    </>
                  )}
                </Button>

                {!canGenerateStrategy && (
                  <div className="flex items-center space-x-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>Complete the basic study parameters above to generate a research strategy</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* AI Rationale */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">AI Strategy Recommendation</h4>
                  <p className="text-sm text-blue-800">{currentStrategy.aiRationale}</p>
                </div>

                {/* Research Searches */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Proposed Research Queries</h4>
                    <div className="text-sm text-muted-foreground">
                      {editingSearches.filter(s => s.enabled).length} of {editingSearches.length} enabled
                    </div>
                  </div>

                  {editingSearches.map((search) => (
                    <Card key={search.id} className={`${!search.enabled ? 'opacity-60' : ''}`}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={search.enabled}
                                onCheckedChange={(checked) => 
                                  handleSearchToggle(search.id, !!checked)
                                }
                              />
                              <Badge className={getSearchTypeColor(search.type)}>
                                {search.type}
                              </Badge>
                              <Badge className={getPriorityColor(search.priority)}>
                                Priority {search.priority}
                              </Badge>
                              {search.userModified && (
                                <Badge variant="outline">
                                  <Edit3 className="w-3 h-3 mr-1" />
                                  Modified
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Search query"
                              value={search.query}
                              onChange={(e) => handleSearchEdit(search.id, 'query', e.target.value)}
                              className="min-h-[60px]"
                            />
                            <p className="text-sm text-muted-foreground">{search.rationale}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* User Notes */}
                <div className="space-y-2">
                  <h4 className="font-medium">Additional Research Notes</h4>
                  <Textarea
                    placeholder="Add any specific research requirements or context..."
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <Separator />

                {/* Execution Controls */}
                <div className="space-y-4">
                  <Button 
                    onClick={handleExecuteStrategy}
                    disabled={isExecuting || editingSearches.filter(s => s.enabled).length === 0}
                    className="w-full"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing Research...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Execute Research Strategy ({editingSearches.filter(s => s.enabled).length} queries)
                      </>
                    )}
                  </Button>

                  {executionResults && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <h4 className="font-medium text-green-900">Research Complete</h4>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowResearchResults(true)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Results
                          </Button>
                        </div>
                        <p className="text-sm text-green-800 mb-2">
                          Successfully completed {executionResults.successfulSearches} of {executionResults.totalSearches} research queries with {researchResults.reduce((acc, r) => acc + (r.rawResults?.citations?.length || 0), 0)} sources.
                        </p>
                        <p className="text-xs text-green-600">
                          Research insights are now available and will enhance concept generation.
                        </p>
                      </div>
                      
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Need Additional Research?</h4>
                        <p className="text-sm text-blue-800 mb-3">
                          If specific areas need more investigation, you can run additional targeted searches.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowAdditionalResearch(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add More Research
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reset Option */}
                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setCurrentStrategy(null);
                      setEditingSearches([]);
                      setUserNotes('');
                      setExecutionResults(null);
                    }}
                    className="text-sm"
                  >
                    Start Over with New Strategy
                  </Button>
                </div>
              </div>
            )}
        </CardContent>
      )}
      
      {/* Research Results Modal */}
      <SituationalAnalysisModal
        isOpen={showResearchResults}
        onClose={() => setShowResearchResults(false)}
        drugName={drugName}
        indication={indication}
        researchResults={researchResults}
        isLoading={false}
      />
    </Card>
  );
};