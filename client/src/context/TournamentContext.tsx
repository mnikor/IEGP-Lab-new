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

interface TournamentContextType {
  tournament: Tournament | null;
  ideas: Idea[];
  rounds: TournamentRoundUpdate[];
  currentRound: number;
  isLoading: boolean;
  error: string | null;
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

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const connectToTournament = async (tournamentId: number) => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch tournament details
      const tournamentData = await apiRequest<{ tournament: Tournament, rounds: any[] }>(
        `/api/tournaments/${tournamentId}`, 
        { method: 'GET' }
      );

      if (!tournamentData) {
        throw new Error('Failed to fetch tournament data');
      }

      setTournament(tournamentData.tournament);
      setCurrentRound(tournamentData.tournament.currentRound);
      
      // Convert existing rounds to expected format
      if (tournamentData.rounds && tournamentData.rounds.length > 0) {
        const formattedRounds = tournamentData.rounds.map(round => ({
          round: round.roundNumber,
          lanes: round.laneUpdates,
          timestamp: round.startedAt
        }));
        setRounds(formattedRounds);
      }

      // Fetch all ideas for this tournament
      const ideasData = await apiRequest<Idea[]>(
        `/api/tournaments/${tournamentId}/ideas`, 
        { method: 'GET' }
      );

      if (ideasData) {
        setIdeas(ideasData);
      }

      // Connect to SSE endpoint for real-time updates
      const sse = new EventSource(`/api/tournaments/stream/${tournamentId}`);
      
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
      const ideasData = await apiRequest<Idea[]>(
        `/api/tournaments/${tournamentId}/ideas`, 
        { method: 'GET' }
      );

      if (ideasData) {
        setIdeas(ideasData);
      }
    } catch (err) {
      console.error('Error refreshing ideas:', err);
    }
  };

  const getReviewForIdea = async (ideaId: string, agentId: string): Promise<Review> => {
    try {
      const review = await apiRequest<Review>(
        `/api/tournaments/feedback/${ideaId}/${agentId}`, 
        { method: 'GET' }
      );

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