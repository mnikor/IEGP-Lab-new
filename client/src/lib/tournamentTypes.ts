import { Idea, Tournament, TournamentRound, LaneUpdate, TournamentRoundUpdate } from '@shared/tournament';

// Define the success factor interface
export interface SuccessFactor {
  factor: string;
  impact: number;
  description: string;
  isPositive: boolean;
}

// Define the success factors structure
export interface SuccessFactors {
  factors: SuccessFactor[];
  recommendations: string[];
}

// Extend the Idea interface to include success probability fields
export interface ExtendedIdea extends Idea {
  successProbability?: number;
  successFactors?: SuccessFactors;
}

// Tournament context state
export interface TournamentContextState {
  tournament: Tournament | null;
  ideas: ExtendedIdea[];
  rounds: TournamentRound[];
  currentRound: number;
  isLoading: boolean;
  error: string | null;
  connectToTournament: (id: number) => void;
  disconnectFromTournament: () => void;
  getReviewForIdea: (ideaId: string, agentId: string) => Promise<any>;
}