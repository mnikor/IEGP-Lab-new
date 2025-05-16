import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useTournament } from '@/context/TournamentContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  LucideBeaker,
  LucideClipboard,
  LucideFlaskConical,
  LucideLoader,
  LucideShield,
  LucideThumbsUp,
  LucideAlertTriangle,
  LucideArrowUpRight,
  LucideArrowRight
} from 'lucide-react';

// Mapping of agent IDs to their display names and icons
const agentConfig = {
  'CLIN': { name: 'Clinical Expert', icon: <LucideBeaker className="w-4 h-4" /> },
  'STAT': { name: 'Statistical Expert', icon: <LucideClipboard className="w-4 h-4" /> },
  'SAF': { name: 'Safety Expert', icon: <LucideShield className="w-4 h-4" /> },
  'REG': { name: 'Regulatory Expert', icon: <LucideFlaskConical className="w-4 h-4" /> },
  'ETH': { name: 'Ethics Expert', icon: <LucideThumbsUp className="w-4 h-4" /> },
  'OPS': { name: 'Operations Expert', icon: <LucideClipboard className="w-4 h-4" /> },
};

const TournamentView = () => {
  const params = useParams();
  const [, navigate] = useLocation();
  const tournamentId = parseInt(params.id || '0');
  const [selectedLane, setSelectedLane] = useState<number | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>('CLIN');
  const [reviewData, setReviewData] = useState<any>(null);
  const [isLoadingReview, setIsLoadingReview] = useState<boolean>(false);
  const [viewingRound, setViewingRound] = useState<number | null>(null);
  
  const { 
    tournament, 
    ideas, 
    rounds, 
    currentRound, 
    isLoading, 
    error, 
    connectToTournament,
    disconnectFromTournament,
    getReviewForIdea
  } = useTournament();

  // Connect to tournament only once when component mounts or tournamentId changes
  useEffect(() => {
    if (tournamentId > 0) {
      console.log(`Connecting to tournament ${tournamentId}`);
      connectToTournament(tournamentId);
      
      // Cleanup function to disconnect when component unmounts
      return () => {
        console.log(`Disconnecting from tournament ${tournamentId}`);
        disconnectFromTournament();
      };
    }
    // Intentionally omitting connectToTournament from dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  // Set initial selected lane when data loads
  useEffect(() => {
    if (ideas.length > 0 && selectedLane === null) {
      // Find the first lane that has a champion
      const firstLane = ideas.find(idea => idea.isChampion)?.laneId || 1;
      setSelectedLane(firstLane);
      
      // Find the idea for this lane
      const championIdea = ideas.find(idea => idea.laneId === firstLane && idea.isChampion);
      if (championIdea) {
        setSelectedIdeaId(championIdea.ideaId);
      }
    }
  }, [ideas, selectedLane]);

  // Load review data when selected idea or agent changes
  useEffect(() => {
    // Skip initial render when selectedIdeaId might be null
    if (!selectedIdeaId || !selectedAgentId) return;
    
    let isMounted = true;
    const loadReview = async () => {
      setIsLoadingReview(true);
      try {
        const review = await getReviewForIdea(selectedIdeaId, selectedAgentId);
        // Only update state if the component is still mounted and
        // the selected idea/agent hasn't changed
        if (isMounted) {
          setReviewData(review);
        }
      } catch (err) {
        console.error('Failed to load review:', err);
        if (isMounted) {
          setReviewData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingReview(false);
        }
      }
    };
    
    loadReview();
    
    // Cleanup function to prevent updates after unmount
    return () => {
      isMounted = false;
    };
  }, [selectedIdeaId, selectedAgentId, getReviewForIdea]);

  const handleLaneSelect = (laneId: number) => {
    setSelectedLane(laneId);
    
    // Find champion for this lane
    const champion = ideas.find(idea => idea.laneId === laneId && idea.isChampion);
    if (champion) {
      setSelectedIdeaId(champion.ideaId);
    }
  };

  const handleIdeaSelect = (ideaId: string) => {
    setSelectedIdeaId(ideaId);
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
  };

  // Get sorted lanes (champions and their challengers)
  const getLaneData = () => {
    if (!ideas.length) return [];
    
    // If viewing a specific round
    if (viewingRound !== null) {
      // Get all unique lane IDs without using Set
      const allLaneIds = ideas
        .map(idea => idea.laneId)
        .filter((laneId, index, self) => self.indexOf(laneId) === index);
      
      // For initial round (0), show only the seed ideas
      if (viewingRound === 0) {
        const seedIdeas = ideas.filter(i => i.round === 0);
        return seedIdeas.map(idea => {
          // Check if this is still the current champion for highlighting purposes
          const isCurrentChampion = ideas.some(i => 
            i.laneId === idea.laneId && 
            i.isChampion &&
            i.ideaId === idea.ideaId
          );
          
          return {
            laneId: idea.laneId,
            champion: idea,
            isCurrentChampion,
            challengers: [] // No challengers in seed round
          };
        }).sort((a, b) => a.laneId - b.laneId);
      }
      
      // For all other rounds, determine the champion for that round (point in time)
      return allLaneIds.map(laneId => {
        // First, identify all ideas that existed for this lane up through this round
        const ideasThroughThisRound = ideas.filter(i => 
          i.laneId === laneId && 
          i.round <= viewingRound
        );
        
        if (ideasThroughThisRound.length === 0) return null;
        
        // To determine the champion for this lane at this point in time:
        // 1. First check if there was a champion specifically crowned in this round
        const thisRoundChampion = ideasThroughThisRound.find(i => 
          i.round === viewingRound && 
          i.isChampion
        );
        
        if (thisRoundChampion) {
          // This idea became champion in this exact round
          const challengers = ideasThroughThisRound.filter(i => 
            i.round === viewingRound && 
            i !== thisRoundChampion
          );
          
          // Check if this is still the current overall champion
          const isCurrentChampion = ideas.some(i => 
            i.laneId === laneId && 
            i.isChampion &&
            i.ideaId === thisRoundChampion.ideaId
          );
          
          return {
            laneId,
            champion: thisRoundChampion,
            isCurrentChampion,
            challengers
          };
        }
        
        // 2. If no champion from this round, find the most recent champion from earlier rounds
        const championsSoFar = ideasThroughThisRound
          .filter(i => i.isChampion)
          .sort((a, b) => b.round - a.round); // Sort by round descending
          
        if (championsSoFar.length > 0) {
          // The most recent champion up to this point is the effective champion
          const effectiveChampion = championsSoFar[0];
          
          // Check if this is still the current overall champion
          const isCurrentChampion = ideas.some(i => 
            i.laneId === laneId && 
            i.isChampion &&
            i.ideaId === effectiveChampion.ideaId
          );
          
          // Challengers are the ideas introduced in this specific round
          const challengers = ideasThroughThisRound.filter(i => 
            i.round === viewingRound && 
            i !== effectiveChampion
          );
          
          return {
            laneId,
            champion: effectiveChampion,
            isCurrentChampion,
            challengers
          };
        }
        
        // 3. If no champion has been crowned yet, the initial idea is the effective champion
        const initialIdea = ideasThroughThisRound.find(i => i.round === 0);
        if (initialIdea) {
          // Check if this is still the current overall champion
          const isCurrentChampion = ideas.some(i => 
            i.laneId === laneId && 
            i.isChampion &&
            i.ideaId === initialIdea.ideaId
          );
          
          const challengers = ideasThroughThisRound.filter(i => 
            i.round === viewingRound
          );
          
          return {
            laneId,
            champion: initialIdea,
            isCurrentChampion,
            challengers
          };
        }
        
        return null;
      })
      .filter(lane => lane !== null)
      .sort((a, b) => a!.laneId - b!.laneId);
    }
    
    // Default view - current state - just show the current champions
    const champions = ideas.filter(i => i.isChampion);
    const laneData = champions.map(champion => {
      const challengers = ideas.filter(i => 
        i.laneId === champion.laneId && 
        !i.isChampion && 
        i.round === currentRound
      );
      
      return {
        laneId: champion.laneId,
        champion,
        isCurrentChampion: true, // These are the current champions
        challengers
      };
    });
    
    return laneData.sort((a, b) => a.laneId - b.laneId);
  };

  // Get selected idea details
  const getSelectedIdea = () => {
    return ideas.find(idea => idea.ideaId === selectedIdeaId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LucideLoader className="w-12 h-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading tournament data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Alert variant="destructive" className="mb-8">
          <LucideAlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/tournaments')}>
          Back to Tournaments
        </Button>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Alert className="mb-8">
          <LucideAlertTriangle className="h-4 w-4" />
          <AlertTitle>Tournament not found</AlertTitle>
          <AlertDescription>The requested tournament could not be found or has not been initialized.</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/tournaments')}>
          Back to Tournaments
        </Button>
      </div>
    );
  }

  const laneData = getLaneData();
  const selectedIdea = getSelectedIdea();
  
  // Calculate round progress - ensure it's at least 10% for visual feedback
  // and set to 100% if tournament is completed
  let roundProgress = (tournament.currentRound / tournament.maxRounds) * 100;
  if (tournament.status === 'completed') {
    roundProgress = 100;
  } else if (roundProgress < 10) {
    roundProgress = 10; // Minimum visual indicator
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Tournament Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">{tournament.drugName} for {tournament.indication}</h1>
            <p className="text-muted-foreground">
              {tournament.status === 'running' ? 'Tournament in progress' : 'Tournament complete'}
            </p>
          </div>
          <Badge variant={tournament.status === 'completed' ? 'default' : 'secondary'} className="text-sm">
            {tournament.status.toUpperCase()}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1">
            <Progress value={roundProgress} className="h-2" />
          </div>
          <div className="text-sm whitespace-nowrap">
            Round {tournament.currentRound} of {tournament.maxRounds}
          </div>
        </div>
        
        {/* Round Selector */}
        <div className="mt-4 mb-2">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium">View progress by round:</div>
            {viewingRound !== null && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewingRound(null)}
                className="text-xs"
              >
                Return to current state
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: tournament.maxRounds + 1 }, (_, i) => (
              <Button
                key={i}
                variant={viewingRound === i ? "default" : "outline"}
                size="sm"
                onClick={() => setViewingRound(i)}
                className="flex-1"
              >
                {i === 0 ? "Initial" : `Round ${i}`}
              </Button>
            ))}
          </div>
          {viewingRound !== null && (
            <div className="bg-muted/30 text-muted-foreground p-2 rounded-md mt-2 text-xs text-center">
              Showing ideas from {viewingRound === 0 ? "initial seeding" : `round ${viewingRound}`}
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          {tournament.strategicGoals.map((goal, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {goal.goal.replace('_', ' ')}
            </Badge>
          ))}
          
          {tournament.geography.map((region, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {region}
            </Badge>
          ))}
          
          <Badge variant="outline" className="text-xs">
            Phase {tournament.studyPhasePref}
          </Badge>
        </div>
      </div>

      {/* Main Tournament View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lanes sidebar */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Study Concept Lanes</CardTitle>
              <CardDescription>
                Select a lane to view its champion and challengers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {laneData.map((lane) => (
                  lane.champion && (
                    <Card 
                      key={lane.laneId}
                      className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                        selectedLane === lane.laneId ? 'border-primary' : ''
                      } ${lane.isCurrentChampion ? 'border-l-4 border-l-primary' : ''}`}
                      onClick={() => handleLaneSelect(lane.laneId)}
                    >
                      <CardHeader className="py-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          <div className="flex items-center">
                            <span>Lane {lane.laneId}</span>
                            {lane.isCurrentChampion && (
                              <Badge variant="default" className="ml-2 text-xs">Current Champion</Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {lane.champion.overallScore.toFixed(2)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="text-sm font-medium">{lane.champion.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {lane.challengers.length} challenger{lane.challengers.length !== 1 ? 's' : ''} in {viewingRound !== null ? `round ${viewingRound}` : `round ${currentRound}`}
                        </div>
                      </CardContent>
                    </Card>
                  )
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main content area */}
        <div className="md:col-span-2">
          {selectedLane !== null && selectedIdea && (
            <>
              {/* Selected Lane Details */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Lane {selectedLane}</CardTitle>
                  <CardDescription>
                    Current champion and challengers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Champion */}
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default">Champion</Badge>
                        <Badge variant="outline" className="ml-auto">
                          Score: {
                            ideas.find(i => i.laneId === selectedLane && i.isChampion)?.overallScore.toFixed(2)
                          }
                        </Badge>
                      </div>
                      <div 
                        className={`p-3 border rounded-md cursor-pointer ${
                          selectedIdeaId === ideas.find(i => i.laneId === selectedLane && i.isChampion)?.ideaId
                            ? 'bg-accent'
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => 
                          handleIdeaSelect(ideas.find(i => i.laneId === selectedLane && i.isChampion)?.ideaId || '')
                        }
                      >
                        <div className="font-medium">
                          {ideas.find(i => i.laneId === selectedLane && i.isChampion)?.title}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {ideas.find(i => i.laneId === selectedLane && i.isChampion)?.studyPhase}
                        </div>
                      </div>
                    </div>
                    
                    {/* Challengers */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Challengers</h3>
                      <div className="space-y-2">
                        {ideas.filter(i => i.laneId === selectedLane && !i.isChampion && i.round === currentRound).map(idea => (
                          <div 
                            key={idea.ideaId}
                            className={`p-3 border rounded-md cursor-pointer ${
                              selectedIdeaId === idea.ideaId ? 'bg-accent' : 'hover:bg-accent/50'
                            }`}
                            onClick={() => handleIdeaSelect(idea.ideaId)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{idea.title}</div>
                              <Badge variant="outline">
                                Score: {idea.overallScore.toFixed(2)}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {idea.studyPhase}
                            </div>
                          </div>
                        ))}
                        
                        {ideas.filter(i => i.laneId === selectedLane && !i.isChampion && i.round === currentRound).length === 0 && (
                          <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-md">
                            No challengers in this round
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Selected Idea Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedIdea.title}</CardTitle>
                  <CardDescription>
                    {selectedIdea.drugName} for {selectedIdea.indication}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview">
                    <TabsList className="mb-4">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="reviews">Expert Reviews</TabsTrigger>
                      <TabsTrigger value="details">Full Details</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview">
                      <div className="space-y-6">
                        {/* MCDA Scores */}
                        <div>
                          <h3 className="text-sm font-medium mb-2">MCDA Scores</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">Scientific Validity</div>
                              <div className="font-medium mt-1">{selectedIdea.mcdaScores.scientificValidity.toFixed(2)}</div>
                            </div>
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">Clinical Impact</div>
                              <div className="font-medium mt-1">{selectedIdea.mcdaScores.clinicalImpact.toFixed(2)}</div>
                            </div>
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">Commercial Value</div>
                              <div className="font-medium mt-1">{selectedIdea.mcdaScores.commercialValue.toFixed(2)}</div>
                            </div>
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">Feasibility</div>
                              <div className="font-medium mt-1">{selectedIdea.mcdaScores.feasibility.toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="p-3 border rounded-md mt-2">
                            <div className="text-xs text-muted-foreground">Overall Score</div>
                            <div className="text-lg font-medium mt-1">{selectedIdea.overallScore.toFixed(2)}</div>
                          </div>
                        </div>
                        
                        {/* PICO Data */}
                        <div>
                          <h3 className="text-sm font-medium mb-2">PICO Framework</h3>
                          <div className="space-y-2">
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">Population</div>
                              <div className="text-sm mt-1">{selectedIdea.picoData.population}</div>
                            </div>
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">Intervention</div>
                              <div className="text-sm mt-1">{selectedIdea.picoData.intervention}</div>
                            </div>
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">Comparator</div>
                              <div className="text-sm mt-1">{selectedIdea.picoData.comparator}</div>
                            </div>
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">Outcomes</div>
                              <div className="text-sm mt-1">{selectedIdea.picoData.outcomes}</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* SWOT Analysis */}
                        <div>
                          <h3 className="text-sm font-medium mb-2">SWOT Analysis</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">Strengths</div>
                              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                                {selectedIdea.swotAnalysis.strengths.map((strength, i) => (
                                  <li key={i}>{strength}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">Weaknesses</div>
                              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                                {selectedIdea.swotAnalysis.weaknesses.map((weakness, i) => (
                                  <li key={i}>{weakness}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">Opportunities</div>
                              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                                {selectedIdea.swotAnalysis.opportunities.map((opportunity, i) => (
                                  <li key={i}>{opportunity}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">Threats</div>
                              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                                {selectedIdea.swotAnalysis.threats.map((threat, i) => (
                                  <li key={i}>{threat}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="reviews">
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2 mb-4">
                          {Object.entries(agentConfig).map(([agentId, { name, icon }]) => (
                            <Button
                              key={agentId}
                              variant={selectedAgentId === agentId ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleAgentSelect(agentId)}
                              className="flex items-center gap-2"
                            >
                              {icon}
                              <span>{name}</span>
                            </Button>
                          ))}
                        </div>
                        
                        {isLoadingReview ? (
                          <div className="flex items-center justify-center h-48">
                            <LucideLoader className="w-8 h-8 animate-spin text-primary" />
                          </div>
                        ) : reviewData ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium">
                                {selectedAgentId && agentConfig[selectedAgentId as keyof typeof agentConfig] ? agentConfig[selectedAgentId as keyof typeof agentConfig].name : 'Expert'} Review
                              </h3>
                              <Badge variant="outline">
                                Score: {reviewData.score.toFixed(2)}
                              </Badge>
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <h4 className="text-sm font-medium mb-2">Strengths</h4>
                              <ScrollArea className="h-[120px] rounded-md border p-4">
                                <ul className="space-y-2">
                                  {reviewData.strengths.map((strength: string, i: number) => (
                                    <li key={i} className="flex items-start">
                                      <LucideThumbsUp className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                                      <span>{strength}</span>
                                    </li>
                                  ))}
                                </ul>
                              </ScrollArea>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium mb-2">Weaknesses</h4>
                              <ScrollArea className="h-[120px] rounded-md border p-4">
                                <ul className="space-y-2">
                                  {reviewData.weaknesses.map((weakness: string, i: number) => (
                                    <li key={i} className="flex items-start">
                                      <LucideAlertTriangle className="w-4 h-4 text-amber-500 mr-2 mt-0.5" />
                                      <span>{weakness}</span>
                                    </li>
                                  ))}
                                </ul>
                              </ScrollArea>
                            </div>
                            
                            {reviewData.additionalMetrics && Object.keys(reviewData.additionalMetrics).length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">Additional Metrics</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {Object.entries(reviewData.additionalMetrics).map(([key, value]: [string, any]) => (
                                    <div key={key} className="p-2 border rounded-md">
                                      <div className="text-xs text-muted-foreground capitalize">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                      </div>
                                      <div className="font-medium">
                                        {typeof value === 'number' ? value.toFixed(2) : value.toString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-8 text-center border rounded-md">
                            <p className="text-muted-foreground">No review data available for this combination</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="details">
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
                              <div className="space-y-2 mt-2">
                                <div className="p-2 border rounded-md">
                                  <div className="text-xs text-muted-foreground">Study Phase</div>
                                  <div className="font-medium">{selectedIdea.studyPhase}</div>
                                </div>
                                <div className="p-2 border rounded-md">
                                  <div className="text-xs text-muted-foreground">Target Subpopulation</div>
                                  <div className="font-medium">{selectedIdea.targetSubpopulation || 'Not specified'}</div>
                                </div>
                                <div className="p-2 border rounded-md">
                                  <div className="text-xs text-muted-foreground">Comparator Drugs</div>
                                  <div className="font-medium">
                                    {selectedIdea.comparatorDrugs && selectedIdea.comparatorDrugs.length > 0
                                      ? selectedIdea.comparatorDrugs.join(', ')
                                      : 'None specified'
                                    }
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">Strategic Alignment</h3>
                              <div className="space-y-2 mt-2">
                                <div className="p-2 border rounded-md">
                                  <div className="text-xs text-muted-foreground">Knowledge Gap Addressed</div>
                                  <div className="font-medium">{selectedIdea.knowledgeGapAddressed || 'Not specified'}</div>
                                </div>
                                <div className="p-2 border rounded-md">
                                  <div className="text-xs text-muted-foreground">Innovation Justification</div>
                                  <div className="font-medium">{selectedIdea.innovationJustification || 'Not specified'}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">Feasibility Assessment</h3>
                              <div className="space-y-2 mt-2">
                                <div className="p-2 border rounded-md">
                                  <div className="text-xs text-muted-foreground">Estimated Cost</div>
                                  <div className="font-medium">
                                    ${selectedIdea.feasibilityData.estimatedCost.toLocaleString()}
                                  </div>
                                </div>
                                <div className="p-2 border rounded-md">
                                  <div className="text-xs text-muted-foreground">Timeline (months)</div>
                                  <div className="font-medium">{selectedIdea.feasibilityData.timeline}</div>
                                </div>
                                <div className="p-2 border rounded-md">
                                  <div className="text-xs text-muted-foreground">Projected ROI</div>
                                  <div className="font-medium">
                                    {(selectedIdea.feasibilityData.projectedROI * 100).toFixed(1)}%
                                  </div>
                                </div>
                                <div className="p-2 border rounded-md">
                                  <div className="text-xs text-muted-foreground">Recruitment Rate</div>
                                  <div className="font-medium">
                                    {selectedIdea.feasibilityData.recruitmentRate} patients/month
                                  </div>
                                </div>
                                <div className="p-2 border rounded-md">
                                  <div className="text-xs text-muted-foreground">Completion Risk</div>
                                  <div className="font-medium">
                                    {(selectedIdea.feasibilityData.completionRisk * 100).toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">Tournament Metadata</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="p-2 border rounded-md">
                              <div className="text-xs text-muted-foreground">Lane</div>
                              <div className="font-medium">{selectedIdea.laneId}</div>
                            </div>
                            <div className="p-2 border rounded-md">
                              <div className="text-xs text-muted-foreground">Round</div>
                              <div className="font-medium">{selectedIdea.round}</div>
                            </div>
                            <div className="p-2 border rounded-md">
                              <div className="text-xs text-muted-foreground">Champion Status</div>
                              <div className="font-medium">{selectedIdea.isChampion ? 'Yes' : 'No'}</div>
                            </div>
                            <div className="p-2 border rounded-md">
                              <div className="text-xs text-muted-foreground">Score Change</div>
                              <div className="font-medium flex items-center">
                                {selectedIdea.scoreChange !== null ? (
                                  <>
                                    {selectedIdea.scoreChange > 0 ? (
                                      <LucideArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                                    ) : selectedIdea.scoreChange < 0 ? (
                                      <LucideArrowRight className="w-4 h-4 text-red-500 mr-1" />
                                    ) : null}
                                    {selectedIdea.scoreChange.toFixed(3)}
                                  </>
                                ) : (
                                  'N/A'
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentView;