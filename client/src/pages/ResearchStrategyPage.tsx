import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Search, Eye, Edit3, Play, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ResearchStrategy, SearchItem } from '@shared/schema';

const researchFormSchema = z.object({
  drugName: z.string().min(1, 'Drug name is required'),
  indication: z.string().min(1, 'Indication is required'),
  strategicGoals: z.array(z.string()).min(1, 'At least one strategic goal is required'),
  studyPhase: z.string().min(1, 'Study phase is required'),
  geography: z.array(z.string()).min(1, 'At least one geography is required'),
});

type ResearchFormData = z.infer<typeof researchFormSchema>;

const strategicGoals = [
  { value: 'expand_label', label: 'Expand Label' },
  { value: 'validate_biomarker', label: 'Validate Biomarker' },
  { value: 'accelerate_uptake', label: 'Accelerate Uptake' },
  { value: 'gain_approval', label: 'Gain Approval' },
  { value: 'defend_market_share', label: 'Defend Market Share' },
  { value: 'manage_safety_risk', label: 'Manage Safety Risk' }
];

const studyPhases = [
  { value: 'I', label: 'Phase I' },
  { value: 'II', label: 'Phase II' },
  { value: 'III', label: 'Phase III' },
  { value: 'IV', label: 'Phase IV' }
];

const geographies = [
  { value: 'US', label: 'United States' },
  { value: 'EU', label: 'European Union' },
  { value: 'JP', label: 'Japan' },
  { value: 'CN', label: 'China' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' }
];

export default function ResearchStrategyPage() {
  const [currentStrategy, setCurrentStrategy] = useState<ResearchStrategy | null>(null);
  const [activeTab, setActiveTab] = useState('generate');
  const [editingSearches, setEditingSearches] = useState<SearchItem[]>([]);
  const [userNotes, setUserNotes] = useState('');
  const { toast } = useToast();

  const form = useForm<ResearchFormData>({
    resolver: zodResolver(researchFormSchema),
    defaultValues: {
      drugName: '',
      indication: '',
      strategicGoals: [],
      studyPhase: '',
      geography: []
    }
  });

  // Generate research strategy mutation  
  const generateStrategyMutation = useMutation({
    mutationFn: (data: ResearchFormData) => 
      apiRequest('/api/research-strategies/generate', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: (strategy: ResearchStrategy) => {
      setCurrentStrategy(strategy);
      setEditingSearches([...strategy.proposedSearches]);
      setActiveTab('review');
      toast({
        title: "Research Strategy Generated",
        description: `Generated ${strategy.proposedSearches.length} targeted research queries`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate research strategy",
        variant: "destructive"
      });
    }
  });

  // Amend strategy mutation
  const amendStrategyMutation = useMutation({
    mutationFn: (data: { strategyId: number; modifiedSearches: SearchItem[]; userNotes: string }) =>
      apiRequest('/api/research-strategies/amend', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: (updatedStrategy: ResearchStrategy) => {
      setCurrentStrategy(updatedStrategy);
      toast({
        title: "Strategy Updated",
        description: "Your research strategy amendments have been saved",
      });
    }
  });

  // Execute strategy mutation
  const executeStrategyMutation = useMutation({
    mutationFn: (strategyId: number) =>
      apiRequest('/api/research-strategies/execute', {
        method: 'POST',
        body: JSON.stringify({ strategyId })
      }),
    onSuccess: (result: any) => {
      setActiveTab('results');
      toast({
        title: "Research Executed",
        description: `Completed ${result.successfulSearches}/${result.totalSearches} searches successfully`,
      });
    }
  });

  // Get research results query
  const { data: researchResults, refetch: refetchResults } = useQuery({
    queryKey: ['research-results', currentStrategy?.id],
    queryFn: () => apiRequest(`/api/research-strategies/${currentStrategy?.id}/results`),
    enabled: !!currentStrategy?.id && activeTab === 'results'
  });

  const onSubmit = (data: ResearchFormData) => {
    generateStrategyMutation.mutate(data);
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

  const handleAmendStrategy = () => {
    if (!currentStrategy) return;
    
    amendStrategyMutation.mutate({
      strategyId: currentStrategy.id,
      modifiedSearches: editingSearches,
      userNotes
    });
  };

  const handleExecuteStrategy = () => {
    if (!currentStrategy) return;
    executeStrategyMutation.mutate(currentStrategy.id);
  };

  const getSearchTypeColor = (type: string) => {
    const colors = {
      core: 'bg-blue-100 text-blue-800',
      strategic: 'bg-green-100 text-green-800',
      therapeutic: 'bg-purple-100 text-purple-800',
      phase: 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 9) return 'bg-red-100 text-red-800';
    if (priority >= 7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI-Driven Research Strategy</h1>
        <p className="text-muted-foreground">
          Generate targeted research strategies that directly inform study design decisions
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="review" disabled={!currentStrategy} className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Review & Amend
          </TabsTrigger>
          <TabsTrigger value="execute" disabled={!currentStrategy} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Execute
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!currentStrategy} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Study Context</CardTitle>
              <CardDescription>
                Provide study details to generate a targeted research strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="drugName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Drug Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Pembrolizumab" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="indication"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Indication</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Non-small cell lung cancer" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="strategicGoals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strategic Goals</FormLabel>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {strategicGoals.map((goal) => (
                            <div key={goal.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={goal.value}
                                checked={field.value.includes(goal.value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, goal.value]);
                                  } else {
                                    field.onChange(field.value.filter(v => v !== goal.value));
                                  }
                                }}
                              />
                              <label htmlFor={goal.value} className="text-sm font-medium">
                                {goal.label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="studyPhase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Study Phase</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select phase" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {studyPhases.map((phase) => (
                                <SelectItem key={phase.value} value={phase.value}>
                                  {phase.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="geography"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Geography</FormLabel>
                          <div className="grid grid-cols-2 gap-2">
                            {geographies.map((geo) => (
                              <div key={geo.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={geo.value}
                                  checked={field.value.includes(geo.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...field.value, geo.value]);
                                    } else {
                                      field.onChange(field.value.filter(v => v !== geo.value));
                                    }
                                  }}
                                />
                                <label htmlFor={geo.value} className="text-sm">
                                  {geo.label}
                                </label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={generateStrategyMutation.isPending}
                  >
                    {generateStrategyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Strategy...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Generate Research Strategy
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="mt-6">
          {currentStrategy && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Strategy Recommendation</CardTitle>
                  <CardDescription>
                    Review and customize the proposed research strategy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm">{currentStrategy.aiRationale}</p>
                  </div>

                  <div className="space-y-4">
                    {editingSearches.map((search, index) => (
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
                              <Input
                                placeholder="Rationale"
                                value={search.rationale}
                                onChange={(e) => handleSearchEdit(search.id, 'rationale', e.target.value)}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-4">
                    <h4 className="font-medium">Additional Notes</h4>
                    <Textarea
                      placeholder="Add any specific requirements or context for the research..."
                      value={userNotes}
                      onChange={(e) => setUserNotes(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleAmendStrategy}
                      disabled={amendStrategyMutation.isPending}
                      variant="outline"
                    >
                      {amendStrategyMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Edit3 className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>

                    <Button 
                      onClick={() => setActiveTab('execute')}
                      className="flex-1"
                    >
                      Proceed to Execute
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="execute" className="mt-6">
          {currentStrategy && (
            <Card>
              <CardHeader>
                <CardTitle>Execute Research Strategy</CardTitle>
                <CardDescription>
                  Run all enabled searches and synthesize results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <h4 className="font-medium text-yellow-800">Ready to Execute</h4>
                    </div>
                    <p className="text-sm text-yellow-700">
                      This will execute {editingSearches.filter(s => s.enabled).length} research queries 
                      and synthesize the results into actionable insights for your study design.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {editingSearches.filter(s => s.enabled && s.type === 'core').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Core Searches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {editingSearches.filter(s => s.enabled && s.type === 'strategic').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Strategic Searches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {editingSearches.filter(s => s.enabled && s.type === 'therapeutic').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Therapeutic Searches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {editingSearches.filter(s => s.enabled && s.type === 'phase').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Phase Searches</div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleExecuteStrategy}
                    disabled={executeStrategyMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {executeStrategyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing Research...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Execute Research Strategy
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          {researchResults && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Research Results</CardTitle>
                  <CardDescription>
                    Synthesized insights from your research strategy execution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {researchResults.map((result: any, index: number) => (
                      <Card key={result.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{result.searchQuery}</CardTitle>
                            <div className="flex gap-2">
                              <Badge className={getSearchTypeColor(result.searchType)}>
                                {result.searchType}
                              </Badge>
                              <Badge className={getPriorityColor(result.priority)}>
                                Priority {result.priority}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap text-sm">
                              {result.synthesizedInsights}
                            </div>
                          </div>
                          
                          {result.keyFindings && result.keyFindings.length > 0 && (
                            <div className="mt-4">
                              <h5 className="font-medium mb-2">Key Findings:</h5>
                              <ul className="space-y-1">
                                {result.keyFindings.map((finding: any, idx: number) => (
                                  <li key={idx} className="text-sm text-muted-foreground">
                                    • {finding.finding}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}