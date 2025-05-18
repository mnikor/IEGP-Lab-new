import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useTournament } from '@/context/TournamentContext';
import { ExtendedIdea, SuccessFactor } from '@/lib/tournamentTypes';
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
  LucideArrowRight,
  LucideX,
  LucideArrowLeft,
  Trophy,
  CheckCircle2
} from 'lucide-react';

// Mapping of agent IDs to their display names and icons
const agentConfig = {
  'CLIN': { name: 'Clinical Expert', icon: <LucideBeaker className="w-4 h-4" /> },
  'STAT': { name: 'Statistical Expert', icon: <LucideClipboard className="w-4 h-4" /> },
  'SAF': { name: 'Safety Expert', icon: <LucideShield className="w-4 h-4" /> },
  'REG': { name: 'Regulatory Expert', icon: <LucideFlaskConical className="w-4 h-4" /> },
  'ETH': { name: 'Ethics Expert', icon: <LucideThumbsUp className="w-4 h-4" /> },
  'OPS': { name: 'Operations Expert', icon: <LucideClipboard className="w-4 h-4" /> },
  'SUC': { name: 'Success Probability Expert', icon: <LucideThumbsUp className="w-4 h-4" /> },
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
  const [showResearchData, setShowResearchData] = useState<boolean>(false);
  const [researchData, setResearchData] = useState<{content: string, citations: string[]} | null>(null);
  const [isLoadingResearch, setIsLoadingResearch] = useState<boolean>(false);
  
  // We'll use the actualChampionIds variable defined later in the component
  
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
    
    // Default view - current state - show all lanes with their champions
    // Get all unique lane IDs
    const laneIds = ideas
      .map(idea => idea.laneId)
      .filter((laneId, index, self) => self.indexOf(laneId) === index);
    
    // For each lane, find the current champion (if any) or the best idea
    const laneData = laneIds.map(laneId => {
      // Try to find the official champion for this lane
      const champion = ideas.find(i => i.laneId === laneId && i.isChampion);
      
      if (champion) {
        // This lane has an official champion
        const challengers = ideas.filter(i => 
          i.laneId === laneId && 
          !i.isChampion && 
          i.round === currentRound
        );
        
        return {
          laneId,
          champion,
          isCurrentChampion: true, // This is a current champion
          challengers
        };
      } else {
        // No official champion, find the best idea for this lane
        const laneIdeas = ideas.filter(i => i.laneId === laneId);
        
        if (laneIdeas.length === 0) return null;
        
        // Sort by score descending and take the highest
        const sortedIdeas = [...laneIdeas].sort((a, b) => b.overallScore - a.overallScore);
        const bestIdea = sortedIdeas[0];
        
        const challengers = ideas.filter(i => 
          i.laneId === laneId && 
          i !== bestIdea && 
          i.round === currentRound
        );
        
        return {
          laneId,
          champion: bestIdea,
          isCurrentChampion: false, // Not an official champion
          challengers
        };
      }
    }).filter(lane => lane !== null);
    
    // Sort lanes by champion score (descending) to rank them
    return laneData.sort((a, b) => 
      b!.champion.overallScore - a!.champion.overallScore
    ).map((lane, index) => ({
      ...lane,
      rank: index + 1  // Add ranking position (1st, 2nd, 3rd, etc.)
    }));
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
  
  // Use server-calculated progress value from TournamentContext
  const { progress: serverProgress } = useTournament();
  const roundProgress = serverProgress;
  
  // Determine if a round is actively in progress (for UI indicators)
  const isRoundInProgress = tournament.status === 'running';
  
  // Tournament just started or is in the seeding stage (before first round completes)
  const isTournamentJustStarted = tournament.currentRound === 0 || 
    (tournament.currentRound === 1 && isRoundInProgress);
    
  // For display purposes, we need to know which ideas are actual champions
  // This will be used to only highlight true champions, not just highest scoring ideas
  const actualChampionIds = ideas
    .filter(idea => idea.isChampion)
    .map(idea => idea.ideaId);

  // Winners Podium component
  const WinnersPodium = () => {
    const { winners } = useTournament();
    
    if (!tournament.status || tournament.status !== 'completed' || winners.length === 0) {
      return null;
    }
    
    return (
      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Trophy className="mr-2 h-5 w-5 text-amber-500" />
            Tournament Results
          </CardTitle>
          <CardDescription>
            Congratulations! Here are the top performing study concepts:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {winners.slice(0, 3).map((winner, index) => (
              <div key={winner.ideaId} 
                className={`p-4 rounded-lg border ${
                  index === 0 
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' 
                    : index === 1 
                      ? 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800' 
                      : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <Badge className={`
                    ${index === 0 ? 'bg-amber-500 hover:bg-amber-600' : 
                      index === 1 ? 'bg-slate-500 hover:bg-slate-600' : 
                                   'bg-orange-500 hover:bg-orange-600'}
                  `}>
                    {index === 0 ? '🥇 1st Place' : index === 1 ? '🥈 2nd Place' : '🥉 3rd Place'}
                  </Badge>
                  <Badge variant="outline">Score: {winner.overallScore.toFixed(2)}</Badge>
                </div>
                <h3 className="font-medium line-clamp-2">{winner.title}</h3>
                {winner.laneId && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Lane {winner.laneId}
                  </p>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 w-full"
                  onClick={() => {
                    setSelectedLane(winner.laneId);
                    setSelectedIdeaId(winner.ideaId);
                  }}
                >
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Research Data Modal */}
      <ResearchDataModal
        isOpen={showResearchData}
        onClose={() => setShowResearchData(false)}
        tournamentName={tournament.drugName}
        indication={tournament.indication}
        data={researchData}
        isLoading={isLoadingResearch}
      />
      
      {/* Display Winners Podium for completed tournaments */}
      <WinnersPodium />
      
      {/* Tournament Header */}
      
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">{tournament.drugName} for {tournament.indication}</h1>
            <p className="text-muted-foreground">
              {tournament.status === 'running' ? 'Tournament in progress' : 'Tournament complete'}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <Badge variant={tournament.status === 'completed' ? 'default' : 'secondary'} className="text-sm mb-2">
              {tournament.status.toUpperCase()}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs"
              onClick={() => {
                setIsLoadingResearch(true);
                fetch(`/api/tournaments/${tournament.id}/research-data`)
                  .then(response => response.json())
                  .then(data => {
                    setResearchData(data);
                    setShowResearchData(true);
                    setIsLoadingResearch(false);
                  })
                  .catch(error => {
                    console.error("Error loading research data:", error);
                    setIsLoadingResearch(false);
                  });
              }}
            >
              Situational Analysis
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1 relative">
            {/* Progress bar with percentage and visual indicators */}
            <div className="flex justify-between text-xs mb-1">
              <span>Progress: {Math.round(roundProgress)}%</span>
              <span>
                {isRoundInProgress 
                  ? `Processing round ${tournament.currentRound}` 
                  : tournament.status === 'completed' 
                    ? 'Tournament completed' 
                    : `Round ${tournament.currentRound} of ${tournament.maxRounds}`
                }
              </span>
            </div>
            
            <Progress value={roundProgress} className={`h-3 ${isRoundInProgress ? 'animate-pulse' : ''}`} />
            
            {/* Visual animation for processing state */}
            {isRoundInProgress && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-[shimmer_1.5s_infinite] opacity-70"></div>
            )}
            
            {/* Progress stages - dynamically generate based on maxRounds */}
            <div className="flex justify-between mt-2 text-xs">
              {/* Initial stage */}
              <div className={`flex flex-col items-center ${tournament.currentRound >= 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-3 h-3 rounded-full ${tournament.currentRound >= 0 ? 'bg-primary' : 'bg-muted'}`}></div>
                <span>Initial</span>
              </div>

              {/* Middle rounds */}
              {Array.from({ length: tournament.maxRounds - 1 }, (_, index) => (
                <div 
                  key={`round-${index + 1}`} 
                  className={`flex flex-col items-center ${tournament.currentRound >= index + 1 ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <div className={`w-3 h-3 rounded-full ${tournament.currentRound >= index + 1 ? 'bg-primary' : 'bg-muted'}`}></div>
                  <span>Round {index + 1}</span>
                </div>
              ))}

              {/* Final round */}
              <div className={`flex flex-col items-center ${tournament.currentRound >= tournament.maxRounds ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-3 h-3 rounded-full ${tournament.currentRound >= tournament.maxRounds ? 'bg-primary' : 'bg-muted'}`}></div>
                <span>Final</span>
              </div>
            </div>
          </div>
          
          {/* Current status indicator */}
          <div className="text-sm whitespace-nowrap flex items-center">
            {isRoundInProgress && (
              <div className="flex items-center bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
                <span className="font-medium">Processing round {tournament.currentRound}</span>
              </div>
            )}
            
            {!isRoundInProgress && tournament.status === 'completed' && (
              <div className="flex items-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full">
                <LucideThumbsUp className="w-4 h-4 mr-2" />
                <span className="font-medium">Tournament completed</span>
              </div>
            )}
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
                {laneData.map((lane, index) => (
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
                            {/* Show rank badges if tournament is complete or nearly complete
                                AND either in the main view OR when viewing the final round */}
                            {((viewingRound === null || viewingRound === tournament.maxRounds) && 
                              (tournament.status === 'completed' || tournament.currentRound >= tournament.maxRounds)) && (
                              <>
                                {index === 0 && (
                                  <Badge variant="default" className="ml-2 text-xs bg-yellow-500">🥇 1st Place</Badge>
                                )}
                                {index === 1 && (
                                  <Badge variant="default" className="ml-2 text-xs bg-gray-400">🥈 2nd Place</Badge>
                                )}
                                {index === 2 && (
                                  <Badge variant="default" className="ml-2 text-xs bg-amber-600">🥉 3rd Place</Badge>
                                )}
                              </>
                            )}
                            {/* Show champion badge ONLY if:
                                1. The idea is officially designated as a champion,
                                2. It's not in the top 3 (which already have place badges),
                                3. The tournament has progressed beyond the seeding stage,
                                4. We're not viewing the final round 
                                   OR we're viewing the final round but it's not a top 3 idea */}
                            {actualChampionIds.includes(lane.champion.ideaId) && 
                             !isTournamentJustStarted && 
                             !(viewingRound === tournament.maxRounds || tournament.status === 'completed') && 
                             !(index < 3) && (
                              <Badge variant="outline" className="ml-2 text-xs border-primary text-primary">Champion</Badge>
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
                      <TabsTrigger value="success">Success Probability</TabsTrigger>
                      <TabsTrigger value="details">Full Details</TabsTrigger>
                      {selectedIdea.parentIdeaId && (
                        <TabsTrigger value="improvements">Improvements</TabsTrigger>
                      )}
                    </TabsList>
                    
                    {/* Improvements Tab for showing idea evolution */}
                    {selectedIdea.parentIdeaId && (
                      <TabsContent value="improvements">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2 mb-4">
                            <Badge variant="outline" className="text-primary border-primary">
                              Round {selectedIdea.round} Challenger
                            </Badge>
                            <span className="text-muted-foreground">Derived from: {selectedIdea.parentIdeaId}</span>
                          </div>
                          
                          {/* Improvement rationale */}
                          <div className="p-4 border rounded-lg bg-accent/20">
                            <h3 className="text-sm font-medium mb-2">Improvement Rationale</h3>
                            <p className="text-sm">
                              {(selectedIdea as any).improvementRationale || 'This idea was generated to address weaknesses identified by reviewers in the previous champion while maintaining its strengths.'}
                            </p>
                          </div>
                          
                          {/* Key improvements */}
                          <div>
                            <h3 className="text-sm font-medium mb-2">Key Improvements</h3>
                            {(selectedIdea as any).keyImprovements && (selectedIdea as any).keyImprovements.length > 0 ? (
                              <ul className="space-y-2">
                                {(selectedIdea as any).keyImprovements.map((improvement: string, i: number) => (
                                  <li key={i} className="p-3 border rounded-md flex items-start">
                                    <div className="bg-green-100 dark:bg-green-900/20 p-1 rounded-full mr-2">
                                      <LucideArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <span className="text-sm">{improvement}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="p-4 border border-dashed rounded-md text-sm text-muted-foreground">
                                No specific improvements recorded for this idea.
                              </div>
                            )}
                          </div>
                          
                          {/* Score comparison */}
                          <div>
                            <h3 className="text-sm font-medium mb-2">Score Comparison</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 border rounded-md">
                                <div className="text-xs text-muted-foreground">Previous Champion Score</div>
                                <div className="font-medium mt-1">
                                  {ideas.find(i => i.ideaId === selectedIdea.parentIdeaId)?.overallScore.toFixed(2) || 'N/A'}
                                </div>
                              </div>
                              <div className="p-3 border rounded-md">
                                <div className="text-xs text-muted-foreground">This Idea Score</div>
                                <div className="font-medium mt-1">
                                  {selectedIdea.overallScore.toFixed(2)}
                                </div>
                              </div>
                            </div>
                            
                            {/* Score change indicator */}
                            {selectedIdea.parentIdeaId && (
                              <div className="mt-2 p-3 border rounded-md bg-accent/10">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-muted-foreground">Score Change</div>
                                  <Badge 
                                    variant={selectedIdea.scoreChange && selectedIdea.scoreChange > 0 ? "default" : "outline"}
                                    className={selectedIdea.scoreChange && selectedIdea.scoreChange > 0 ? "bg-green-500" : ""}
                                  >
                                    {selectedIdea.scoreChange 
                                      ? (selectedIdea.scoreChange > 0 ? '+' : '') + selectedIdea.scoreChange.toFixed(2) 
                                      : 'Not calculated'}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    )}
                    
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
                    
                    {/* Success Probability Tab */}
                    <TabsContent value="success">
                      <div className="space-y-6">
                        {/* Main Success Probability Score */}
                        <div className="bg-accent/20 rounded-lg p-6 mb-4">
                          <h3 className="text-sm font-medium mb-3">Overall Probability of Success</h3>
                          <div className="flex items-center justify-center">
                            <div className="relative w-40 h-40">
                              {/* Circular progress bar */}
                              <svg className="w-full h-full" viewBox="0 0 100 100">
                                {/* Background circle */}
                                <circle
                                  className="text-muted-foreground/20 stroke-current"
                                  strokeWidth="10"
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="transparent"
                                />
                                {/* Progress circle */}
                                <circle
                                  className={`${
                                    ((selectedIdea as any).successProbability || 0) > 70 
                                      ? 'text-green-500' 
                                      : ((selectedIdea as any).successProbability || 0) > 40 
                                        ? 'text-amber-500' 
                                        : 'text-red-500'
                                  } stroke-current`}
                                  strokeWidth="10"
                                  strokeLinecap="round"
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="transparent"
                                  strokeDasharray="251.2"
                                  strokeDashoffset={251.2 - (251.2 * ((selectedIdea as any).successProbability || 0)) / 100}
                                  transform="rotate(-90 50 50)"
                                />
                                {/* Percentage text */}
                                <text
                                  x="50"
                                  y="50"
                                  className="text-2xl font-bold"
                                  dominantBaseline="middle"
                                  textAnchor="middle"
                                >
                                  {(selectedIdea as any).successProbability ? Math.round((selectedIdea as any).successProbability) : "--"}%
                                </text>
                                <text
                                  x="50"
                                  y="65"
                                  className="text-xs"
                                  dominantBaseline="middle"
                                  textAnchor="middle"
                                >
                                  success probability
                                </text>
                              </svg>
                            </div>
                          </div>
                          
                          <div className="text-center mt-4 text-sm">
                            <p className="mb-2">
                              <span className="font-medium">Assessment by: </span>
                              <span>Success Probability Expert (SUC)</span>
                            </p>
                            <p className="text-muted-foreground">
                              Based on historical data, mechanism of action, endpoints, and feasibility factors
                            </p>
                          </div>
                          
                          {/* Impact on overall score */}
                          <div className="mt-4 p-3 border rounded bg-white/50 dark:bg-black/20">
                            <h4 className="text-xs font-medium mb-1">Impact on Overall Score</h4>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Study concept quality:</span>
                              <Badge variant="outline" className="font-mono">
                                +{(((selectedIdea as any).successProbability || 0) * 0.2).toFixed(2)} points
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              The success probability contributes 20% to the overall study concept score
                            </p>
                          </div>
                        </div>

                        {/* Success Factors Analysis */}
                        <div>
                          <h3 className="text-sm font-medium mb-3">Key Success Factors</h3>
                          {(selectedIdea as any).successFactors && (selectedIdea as any).successFactors.factors ? (
                            <div className="space-y-2">
                              {(selectedIdea as any).successFactors.factors.map((factor: any, index: number) => (
                                <div key={index} className="p-3 border rounded-md">
                                  <div className="flex justify-between items-center">
                                    <div className="text-sm font-medium">{factor.factor}</div>
                                    <Badge 
                                      className={factor.isPositive 
                                        ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100" 
                                        : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                                      }
                                    >
                                      {factor.isPositive ? '+' : ''}{factor.impact}%
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {factor.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 border border-dashed rounded-md text-center text-muted-foreground">
                              {(selectedIdea as any).successProbability 
                                ? "Detailed success factor data not available" 
                                : "Success probability assessment not available for this concept"
                              }
                            </div>
                          )}
                        </div>

                        {/* Risk Mitigation Recommendations */}
                        <div>
                          <h3 className="text-sm font-medium mb-3">Risk Mitigation Recommendations</h3>
                          <div className="p-4 border rounded-md bg-accent/10">
                            {(selectedIdea as any).successFactors && (selectedIdea as any).successFactors.recommendations && 
                             (selectedIdea as any).successFactors.recommendations.length > 0 ? (
                              <ul className="space-y-2 list-disc list-inside">
                                {(selectedIdea as any).successFactors.recommendations.map((rec: string, i: number) => (
                                  <li key={i} className="text-sm">{rec}</li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-center text-muted-foreground">
                                <p>No risk mitigation recommendations available</p>
                              </div>
                            )}
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

// Research data modal component
const ResearchDataModal = ({ 
  isOpen, 
  onClose, 
  tournamentName, 
  indication, 
  data, 
  isLoading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  tournamentName: string; 
  indication: string;
  data: { content: string; citations: string[] } | null;
  isLoading: boolean;
}) => {
  if (!isOpen) return null;
  
  const processMarkdown = (text: string) => {
    if (!text) return '';
    return text
      .replace(/## (.*?)\n/g, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/   -/g, '&nbsp;&nbsp;&nbsp;•');
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-background p-4 border-b flex items-center justify-between z-10">
          <h2 className="text-xl font-bold">Research Data: {tournamentName} for {indication}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <LucideX className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LucideLoader className="w-12 h-12 animate-spin text-primary mb-4" />
              <p>Loading research data...</p>
            </div>
          ) : data ? (
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-muted-foreground mb-6">
                This data was generated using Perplexity AI to inform the tournament's idea generation.
              </p>
              
              <div dangerouslySetInnerHTML={{ __html: processMarkdown(data.content) }} />
              
              <h2 className="text-xl font-bold mt-8 mb-4">Citations</h2>
              <ol className="space-y-2 text-sm">
                {data.citations.map((citation, index) => (
                  <li key={index}>
                    <a href={citation} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {citation}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p>No research data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentView;