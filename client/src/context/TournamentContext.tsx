import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface Tournament {
  id: number;
  drugName: string;
  indication: string;
  strategicGoals: Array<{
    goal: string;
    weight: number;
  }>;
  geography: string[];
  studyPhasePref: string;
  maxRounds: number;
  lanes: number;
  currentRound: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export interface Idea {
  id: number;
  ideaId: string;
  tournamentId: number;
  laneId: number;
  round: number;
  isChampion: boolean;
  parentIdeaId?: string;
  
  title: string;
  drugName: string;
  indication: string;
  strategicGoals: string[];
  geography: string[];
  studyPhase: string;
  targetSubpopulation?: string;
  comparatorDrugs?: string[];
  knowledgeGapAddressed?: string;
  innovationJustification?: string;
  
  picoData: {
    population: string;
    intervention: string;
    comparator: string;
    outcomes: string;
  };
  mcdaScores: {
    scientificValidity: number;
    clinicalImpact: number;
    commercialValue: number;
    feasibility: number;
    overall: number;
  };
  swotAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  feasibilityData: {
    estimatedCost: number;
    timeline: number;
    projectedROI: number;
    recruitmentRate: number;
    completionRisk: number;
  };
  evidenceSources: any[];
  
  overallScore: number;
  scoreChange: number | null;
}

export interface Review {
  agent_id: string;
  strengths: string[];
  weaknesses: string[];
  score: number;
  additionalMetrics: any;
}

export interface LaneUpdate {
  laneId: number;
  champion: {
    ideaId: string;
    score: number;
  };
  challenger?: {
    ideaId: string;
    score: number;
  };
  delta?: number;
}

export interface TournamentRoundUpdate {
  round: number;
  lanes: LaneUpdate[];
  timestamp: string;
}

export interface TournamentWinner extends Idea {
  rank: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
}

interface TournamentContextType {
  tournament: Tournament | null;
  ideas: Idea[];
  rounds: TournamentRoundUpdate[];
  currentRound: number;
  isLoading: boolean;
  error: string | null;
  progress: number;
  winners: TournamentWinner[];
  connectToTournament: (tournamentId: number) => void;
  disconnectFromTournament: () => void;
  getReviewForIdea: (ideaId: string, agentId: string) => Promise<Review>;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [rounds, setRounds] = useState<TournamentRoundUpdate[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [winners, setWinners] = useState<TournamentWinner[]>([]);

  // Cleanup event source on unmount
  // Cleanup event source on unmount or when tournament changes
  useEffect(() => {
    return () => {
      if (eventSource) {
        console.log('Closing previous EventSource connection');
        eventSource.close();
      }
    };
  }, [eventSource]);

  const connectToTournament = async (tournamentId: number) => {
    try {
      // Clear any existing connection first
      if (eventSource) {
        console.log('Closing existing EventSource connection before connecting to new tournament');
        eventSource.close();
        setEventSource(null);
      }
      
      setIsLoading(true);
      setError(null);
      
      // Reset state to prevent flashing old data
      setTournament(null);
      setIdeas([]);
      setRounds([]);

      // Fetch tournament details
      const response = await apiRequest('GET', `/api/tournaments/${tournamentId}`);
      const tournamentData = await response.json();

      if (!tournamentData) {
        throw new Error('Failed to fetch tournament data');
      }

      setTournament(tournamentData.tournament);
      
      // Set progress from server-calculated value
      if (tournamentData.progress !== undefined) {
        setProgress(tournamentData.progress);
      }
      
      // Set winners if tournament is completed
      if (tournamentData.winners && tournamentData.winners.length > 0) {
        setWinners(tournamentData.winners);
      } else {
        setWinners([]);
      }
      
      // Ensure currentRound is never less than 1 for completed tournaments
      if (tournamentData.tournament.status === 'completed' && tournamentData.tournament.currentRound === 0) {
        console.log('Tournament is complete but currentRound is 0, setting to maxRounds');
        setCurrentRound(tournamentData.tournament.maxRounds);
      } else {
        setCurrentRound(tournamentData.tournament.currentRound);
      }
      
      // Convert existing rounds to expected format
      if (tournamentData.rounds && tournamentData.rounds.length > 0) {
        const formattedRounds = tournamentData.rounds.map((round: any) => ({
          round: round.roundNumber,
          lanes: round.laneUpdates,
          timestamp: round.startedAt
        }));
        setRounds(formattedRounds);
      }

      // Fetch all ideas for this tournament
      const ideasResponse = await apiRequest('GET', `/api/tournaments/${tournamentId}/ideas`);
      const ideasData = await ideasResponse.json();

      if (ideasData) {
        setIdeas(ideasData);
      }

      // Connect to SSE endpoint for real-time updates
      // Use a small timeout to ensure previous connections are properly closed
      setTimeout(() => {
        const sse = new EventSource(`/api/tournaments/stream/${tournamentId}`);
        
        sse.onopen = () => {
          console.log(`SSE connection opened for tournament ${tournamentId}`);
        };
        
        sse.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Check if this is just a connection message
            if (data.connected) {
              console.log('Connected to tournament stream');
              return;
            }
            
            // This is a round update
            console.log('Received round update:', data);
            
            setRounds(prevRounds => {
              // Check if this round already exists
              const existingRoundIndex = prevRounds.findIndex(r => r.round === data.round);
              
              if (existingRoundIndex >= 0) {
                // Update existing round
                const updatedRounds = [...prevRounds];
                updatedRounds[existingRoundIndex] = data;
                return updatedRounds;
              } else {
                // Add new round
                return [...prevRounds, data];
              }
            });
            
            // Update current round if needed
            if (data.round > currentRound) {
              setCurrentRound(data.round);
            }
            
            // Refresh ideas list after a round update
            refreshIdeas(tournamentId);
          } catch (err) {
            console.error('Error processing SSE message:', err);
          }
        };
        
        sse.onerror = (err) => {
          console.error('SSE error:', err);
          sse.close();
        };
        
        setEventSource(sse);
      }, 100);  // Small delay to ensure clean connection
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error connecting to tournament:', err);
      setError('Failed to connect to tournament: ' + (err instanceof Error ? err.message : String(err)));
      setIsLoading(false);
    }
  };

  const disconnectFromTournament = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    
    setTournament(null);
    setIdeas([]);
    setRounds([]);
    setCurrentRound(0);
  };

  const refreshIdeas = async (tournamentId: number) => {
    try {
      const ideasResponse = await apiRequest('GET', `/api/tournaments/${tournamentId}/ideas`);
      const ideasData = await ideasResponse.json();

      if (ideasData) {
        setIdeas(ideasData);
      }
    } catch (err) {
      console.error('Error refreshing ideas:', err);
    }
  };

  const getReviewForIdea = async (ideaId: string, agentId: string): Promise<Review> => {
    try {
      const reviewResponse = await apiRequest('GET', `/api/tournaments/feedback/${ideaId}/${agentId}`);
      const review = await reviewResponse.json();

      if (!review) {
        throw new Error('Failed to fetch review');
      }

      return review;
    } catch (err) {
      console.error('Error fetching review:', err);
      throw err;
    }
  };

  return (
    <TournamentContext.Provider
      value={{
        tournament,
        ideas,
        rounds,
        currentRound,
        isLoading,
        error,
        progress,
        winners,
        connectToTournament,
        disconnectFromTournament,
        getReviewForIdea
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};