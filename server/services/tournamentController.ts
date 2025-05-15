import { 
  Tournament, 
  Idea, 
  InsertIdea, 
  Review, 
  InsertReview, 
  TournamentRound, 
  InsertTournamentRound,
  LaneUpdate,
  TournamentRoundUpdate
} from '@shared/tournament';
import { storage } from '../storage';
import { generateSeedIdeas } from './ideaGenerator';
import { reviewIdeaWithAllAgents } from './reviewerAgent';
import { generateChallenger } from './proposer';
import { calculateOverallScore, createLaneUpdates, updateChampions } from './aggregator';

// Map of tournament IDs to their active event sources
export const tournamentEventSources: {[tournamentId: number]: Set<any>} = {};

/**
 * Starts a new tournament
 * 
 * @param tournament The tournament object
 * @returns The created tournament with initial ideas
 */
export async function startTournament(tournament: Tournament): Promise<Tournament> {
  try {
    console.log(`Starting tournament for ${tournament.drugName} in ${tournament.indication}`);
    
    // Generate initial seed ideas
    const seedIdeas = await generateSeedIdeas({
      drugName: tournament.drugName,
      indication: tournament.indication,
      strategicGoals: tournament.strategicGoals as any,
      geography: tournament.geography,
      studyPhasePref: tournament.studyPhasePref as any,
      maxRounds: tournament.maxRounds,
      lanes: tournament.lanes
    }, tournament.id);
    
    console.log(`Generated ${seedIdeas.length} seed ideas`);
    
    // Store the seed ideas in the database
    for (const idea of seedIdeas) {
      await storage.createIdea(idea);
    }
    
    // Initialize a new event source set for this tournament
    tournamentEventSources[tournament.id] = new Set();
    
    // Start the tournament processing in the background
    processTournament(tournament.id)
      .catch(err => console.error(`Error processing tournament ${tournament.id}:`, err));
    
    return tournament;
  } catch (error) {
    console.error("Error starting tournament:", error);
    throw error;
  }
}

/**
 * Processes a tournament asynchronously through multiple rounds
 * 
 * @param tournamentId The ID of the tournament to process
 */
async function processTournament(tournamentId: number) {
  try {
    // Get the tournament
    const tournament = await storage.getTournament(tournamentId);
    if (!tournament) {
      throw new Error(`Tournament ${tournamentId} not found`);
    }
    
    // Process initial round (seed ideas)
    console.log(`Processing initial round for tournament ${tournamentId}`);
    await processInitialRound(tournament);
    
    // Process subsequent rounds up to the max
    for (let round = 1; round <= tournament.maxRounds; round++) {
      console.log(`Processing round ${round} for tournament ${tournamentId}`);
      
      // Update the tournament's current round
      await storage.updateTournament(tournamentId, { currentRound: round });
      
      // Process this round
      const continueToNextRound = await processRound(tournament, round);
      
      // Check if we should stop early
      if (!continueToNextRound) {
        console.log(`Tournament ${tournamentId} stopping early after round ${round}`);
        break;
      }
    }
    
    // Complete the tournament
    await storage.updateTournament(tournamentId, { 
      status: 'completed',
      completedAt: new Date().toISOString()
    });
    
    console.log(`Tournament ${tournamentId} completed`);
  } catch (error) {
    console.error(`Error processing tournament ${tournamentId}:`, error);
    
    // Mark the tournament as failed
    await storage.updateTournament(tournamentId, { status: 'failed' });
  }
}

/**
 * Processes the initial round of a tournament (seed ideas)
 * 
 * @param tournament The tournament to process
 */
async function processInitialRound(tournament: Tournament) {
  try {
    // Get all seed ideas for this tournament
    const seedIdeas = await storage.getIdeasByTournamentAndRound(tournament.id, 0);
    if (seedIdeas.length === 0) {
      throw new Error(`No seed ideas found for tournament ${tournament.id}`);
    }
    
    console.log(`Processing ${seedIdeas.length} seed ideas for tournament ${tournament.id}`);
    
    // Review each seed idea with all agents
    const reviewPromises: Promise<void>[] = [];
    const ideaReviews: {[ideaId: string]: Review[]} = {};
    
    for (const idea of seedIdeas) {
      reviewPromises.push(
        (async () => {
          // Review this idea with all agents
          const reviews = await reviewIdeaWithAllAgents(idea);
          
          // Store the reviews in the database
          for (const review of reviews) {
            await storage.createReview(review);
          }
          
          // Store for score calculation
          ideaReviews[idea.ideaId] = reviews;
          
          // Calculate and update the idea's score
          const score = calculateOverallScore(idea, reviews);
          await storage.updateIdea(idea.ideaId, { overallScore: score });
        })()
      );
    }
    
    // Wait for all reviews to complete
    await Promise.all(reviewPromises);
    
    // Generate lane updates for the initial round
    const laneUpdates = createLaneUpdates(seedIdeas, null, ideaReviews, null);
    
    // Create a tournament round record
    const roundRecord: InsertTournamentRound = {
      tournamentId: tournament.id,
      roundNumber: 0,
      laneUpdates
    };
    
    // Store the round record
    await storage.createTournamentRound(roundRecord);
    
    // Broadcast the round update to clients
    const roundUpdate: TournamentRoundUpdate = {
      round: 0,
      lanes: laneUpdates,
      timestamp: new Date().toISOString()
    };
    
    broadcastTournamentUpdate(tournament.id, roundUpdate);
  } catch (error) {
    console.error(`Error processing initial round for tournament ${tournament.id}:`, error);
    throw error;
  }
}

/**
 * Processes a single round of a tournament
 * 
 * @param tournament The tournament to process
 * @param round The round number to process
 * @returns True if the tournament should continue to the next round
 */
async function processRound(tournament: Tournament, round: number): Promise<boolean> {
  try {
    // Get the current champions
    const champions = await storage.getChampionsByTournament(tournament.id);
    if (champions.length === 0) {
      throw new Error(`No champions found for tournament ${tournament.id}`);
    }
    
    // Generate challengers for each champion
    const challengerPromises: Promise<Idea>[] = [];
    const championReviews: {[ideaId: string]: Review[]} = {};
    
    // Get reviews for champions
    for (const champion of champions) {
      const reviews = await storage.getReviewsByIdeaId(champion.ideaId);
      championReviews[champion.ideaId] = reviews;
      
      // Generate a challenger for this champion
      challengerPromises.push(
        (async () => {
          // Generate the challenger
          const challenger = await generateChallenger(champion, reviews, round);
          
          // Store the challenger
          return await storage.createIdea(challenger);
        })()
      );
    }
    
    // Wait for all challengers to be generated
    const challengers = await Promise.all(challengerPromises);
    
    // Review all challengers
    const reviewPromises: Promise<void>[] = [];
    const challengerReviews: {[ideaId: string]: Review[]} = {};
    
    for (const challenger of challengers) {
      reviewPromises.push(
        (async () => {
          // Review this challenger with all agents
          const reviews = await reviewIdeaWithAllAgents(challenger);
          
          // Store the reviews in the database
          for (const review of reviews) {
            await storage.createReview(review);
          }
          
          // Store for score calculation
          challengerReviews[challenger.ideaId] = reviews;
          
          // Calculate and update the challenger's score
          const score = calculateOverallScore(challenger, reviews);
          await storage.updateIdea(challenger.ideaId, { overallScore: score });
        })()
      );
    }
    
    // Wait for all reviews to complete
    await Promise.all(reviewPromises);
    
    // Generate lane updates for this round
    const laneUpdates = createLaneUpdates(champions, challengers, championReviews, challengerReviews);
    
    // Update champions based on challenger performance
    const { newChampions, replaced } = updateChampions(
      champions, 
      challengers, 
      championReviews, 
      challengerReviews
    );
    
    // Update champion status in the database
    for (let i = 0; i < newChampions.length; i++) {
      const newChampion = newChampions[i];
      
      // Update the database record
      await storage.updateIdea(newChampion.ideaId, { 
        isChampion: true,
        scoreChange: newChampion.scoreChange || 0
      });
      
      // If this is a new champion (replaced the old one), update the old one
      if (replaced[i]) {
        const oldChampion = champions.find(c => c.laneId === newChampion.laneId);
        if (oldChampion) {
          await storage.updateIdea(oldChampion.ideaId, { isChampion: false });
        }
      }
    }
    
    // Create a tournament round record
    const roundRecord: InsertTournamentRound = {
      tournamentId: tournament.id,
      roundNumber: round,
      laneUpdates
    };
    
    // Store the round record
    const storedRound = await storage.createTournamentRound(roundRecord);
    
    // Broadcast the round update to clients
    const roundUpdate: TournamentRoundUpdate = {
      round,
      lanes: laneUpdates,
      timestamp: new Date().toISOString()
    };
    
    broadcastTournamentUpdate(tournament.id, roundUpdate);
    
    // Determine if we should continue to the next round
    // We continue if any champions were replaced or we haven't reached the max rounds
    return replaced.some(r => r) && round < tournament.maxRounds;
  } catch (error) {
    console.error(`Error processing round ${round} for tournament ${tournament.id}:`, error);
    throw error;
  }
}

/**
 * Broadcasts a tournament update to all connected clients
 * 
 * @param tournamentId The ID of the tournament
 * @param update The update to broadcast
 */
function broadcastTournamentUpdate(tournamentId: number, update: TournamentRoundUpdate) {
  const clients = tournamentEventSources[tournamentId];
  if (!clients) return;
  
  const data = JSON.stringify(update);
  
  for (const client of clients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (error) {
      console.error(`Error sending update to client for tournament ${tournamentId}:`, error);
    }
  }
}

/**
 * Adds a client to receive updates for a tournament
 * 
 * @param tournamentId The ID of the tournament
 * @param client The client to add
 */
export function addTournamentClient(tournamentId: number, client: any) {
  if (!tournamentEventSources[tournamentId]) {
    tournamentEventSources[tournamentId] = new Set();
  }
  
  tournamentEventSources[tournamentId].add(client);
}

/**
 * Removes a client from receiving updates for a tournament
 * 
 * @param tournamentId The ID of the tournament
 * @param client The client to remove
 */
export function removeTournamentClient(tournamentId: number, client: any) {
  if (!tournamentEventSources[tournamentId]) return;
  
  tournamentEventSources[tournamentId].delete(client);
}