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
  Shield,
  TrendingDown,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ValidationSearchItem {
  id: string;
  query: string;
  type: "core" | "competitive" | "regulatory" | "strategic" | "therapeutic" | "guidelines";
  priority: number;
  rationale: string;
  enabled: boolean;
  userModified: boolean;
  category?: string;
  riskType?: "showstopper" | "moderate" | "informational";
}

interface ValidationResearchData {
  searches: ValidationSearchItem[];
  rationale: string;
  riskCategories: string[];
}

interface ValidationResearchProps {
  drugName: string;
  indication: string;
  strategicGoals: string[];
  studyPhase?: string;
  geography?: string[];
  additionalContext?: string;
  onResearchComplete?: (data: any) => void;
}

const ValidationResearchSection: React.FC<ValidationResearchProps> = ({
  drugName,
  indication,
  strategicGoals,
  studyPhase,
  geography,
  additionalContext,
  onResearchComplete
}) => {
  const { toast } = useToast();
  const [researchStrategy, setResearchStrategy] = useState<ValidationResearchData | null>(null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [isExecutingResearch, setIsExecutingResearch] = useState(false);
  const [researchResults, setResearchResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(false);
  const [editedSearches, setEditedSearches] = useState<ValidationSearchItem[]>([]);
  const [userNotes, setUserNotes] = useState('');

  const generateValidationStrategy = async () => {
    if (!drugName || !indication) {
      toast({
        title: "Missing Information",
        description: "Drug name and indication are required to generate research strategy",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingStrategy(true);
    try {
      const response = await apiRequest(
        'POST',
        '/api/validation-research/generate-strategy',
        {
          drugName,
          indication,
          strategicGoals,
          studyPhase: studyPhase || 'III',
          geography: geography || ['US', 'EU'],
          additionalContext
        }
      );

      const data = await response.json();
      setResearchStrategy(data);
      setEditedSearches(data.searches);
      
      toast({
        title: "Research Strategy Generated",
        description: `Generated ${data.searches.length} validation-focused research queries`
      });
    } catch (error) {
      console.error('Failed to generate validation strategy:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate research strategy",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const executeValidationResearch = async () => {
    if (!researchStrategy) return;

    setIsExecutingResearch(true);
    try {
      const response = await apiRequest(
        'POST',
        '/api/validation-research/execute',
        {
          searches: editedSearches.filter(s => s.enabled),
          context: {
            drugName,
            indication,
            strategicGoals,
            riskCategories: researchStrategy.riskCategories
          }
        }
      );

      const data = await response.json();
      setResearchResults(data);
      setShowResults(true);
      
      if (onResearchComplete) {
        onResearchComplete(data);
      }
      
      toast({
        title: "Research Complete",
        description: "Validation research executed successfully"
      });
    } catch (error) {
      console.error('Failed to execute validation research:', error);
      toast({
        title: "Research Failed", 
        description: error instanceof Error ? error.message : "Failed to execute research",
        variant: "destructive"
      });
    } finally {
      setIsExecutingResearch(false);
    }
  };

  const toggleSearchEnabled = (searchId: string) => {
    setEditedSearches(prev => 
      prev.map(search => 
        search.id === searchId 
          ? { ...search, enabled: !search.enabled }
          : search
      )
    );
  };

  const updateSearchQuery = (searchId: string, newQuery: string) => {
    setEditedSearches(prev => 
      prev.map(search => 
        search.id === searchId 
          ? { ...search, query: newQuery, userModified: true }
          : search
      )
    );
  };

  const getRiskTypeIcon = (riskType?: string) => {
    switch (riskType) {
      case 'showstopper': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'moderate': return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'informational': return <TrendingDown className="h-4 w-4 text-blue-500" />;
      default: return <Search className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRiskTypeBadge = (riskType?: string) => {
    const variants = {
      showstopper: 'destructive',
      moderate: 'default', 
      informational: 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[riskType as keyof typeof variants] || 'outline'} className="text-xs">
        {riskType || 'general'}
      </Badge>
    );
  };

  if (!researchStrategy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Validation Research
          </CardTitle>
          <CardDescription>
            Generate AI-powered research strategy to validate study feasibility and identify potential risks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Button 
              onClick={generateValidationStrategy}
              disabled={isGeneratingStrategy || !drugName || !indication}
              size="lg"
            >
              {isGeneratingStrategy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Strategy...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Generate Validation Research Strategy
                </>
              )}
            </Button>
            
            {(!drugName || !indication) && (
              <p className="text-sm text-muted-foreground mt-2">
                Please provide drug name and indication to generate research strategy
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Validation Research Strategy
          </CardTitle>
          <CardDescription>
            {researchStrategy.rationale}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {researchStrategy.riskCategories.map(category => (
              <Badge key={category} variant="outline">
                {category.replace('_', ' ')}
              </Badge>
            ))}
          </div>
          
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingStrategy(!editingStrategy)}
            >
              <Edit3 className="mr-1 h-4 w-4" />
              {editingStrategy ? 'Finish Editing' : 'Edit Strategy'}
            </Button>
            
            <Button
              onClick={executeValidationResearch}
              disabled={isExecutingResearch || editedSearches.filter(s => s.enabled).length === 0}
            >
              {isExecutingResearch ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing Research...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute Research ({editedSearches.filter(s => s.enabled).length} queries)
                </>
              )}
            </Button>
            
            {researchResults && (
              <Button
                variant="outline"
                onClick={() => setShowResults(true)}
              >
                <Eye className="mr-1 h-4 w-4" />
                View Results
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {editedSearches.map((search, index) => (
              <div key={search.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={search.enabled}
                    onCheckedChange={() => toggleSearchEnabled(search.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getRiskTypeIcon(search.riskType)}
                      <Badge variant="outline" className="text-xs">
                        {search.type}
                      </Badge>
                      {getRiskTypeBadge(search.riskType)}
                      <Badge variant="secondary" className="text-xs">
                        Priority: {search.priority}/10
                      </Badge>
                    </div>
                    
                    {editingStrategy ? (
                      <Textarea
                        value={search.query}
                        onChange={(e) => updateSearchQuery(search.id, e.target.value)}
                        className="min-h-[60px]"
                        placeholder="Research query..."
                      />
                    ) : (
                      <p className="text-sm font-medium">{search.query}</p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {search.rationale}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {editingStrategy && (
            <div className="mt-4">
              <Textarea
                placeholder="Add notes about your modifications..."
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {showResults && researchResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Validation Research Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: researchResults.analysisHtml }} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ValidationResearchSection;