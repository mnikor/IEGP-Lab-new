import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import { newTournamentRequestSchema } from '@shared/tournament';
import { startTournament, addTournamentClient, removeTournamentClient } from '../services/tournamentController';
import multer from 'multer';

// Set up multer for file uploads (reusing existing setup if needed)
const upload = multer({ storage: multer.memoryStorage() });

// Create router for tournament endpoints
const router = Router();

/**
 * Start a new tournament with multiple reviewer agents
 */
router.post('/new-concept', async (req: Request, res: Response) => {
  try {
    // Validate the request body against the tournament schema
    const validationResult = newTournamentRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid request body', details: validationResult.error.format() });
    }
    
    const data = validationResult.data;
    console.log(`Received tournament request for ${data.drugName} in ${data.indication}`);
    
    // Create the tournament in the database
    const tournament = await storage.createTournament({
      drugName: data.drugName,
      indication: data.indication,
      strategicGoals: data.strategicGoals,
      geography: data.geography,
      studyPhasePref: data.studyPhasePref,
      maxRounds: data.maxRounds || 3,
      lanes: data.lanes || 5,
    });
    
    console.log(`Created tournament with ID ${tournament.id}`);
    
    // Start the tournament process asynchronously
    await startTournament(tournament);
    
    // Return the tournament ID
    return res.status(201).json({ tournament_id: tournament.id });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return res.status(500).json({ error: 'Failed to create tournament' });
  }
});

/**
 * Stream tournament updates using Server-Sent Events (SSE)
 */
router.get('/stream/:id', (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id);
    if (isNaN(tournamentId)) {
      return res.status(400).json({ error: 'Invalid tournament ID' });
    }
    
    console.log(`Starting SSE stream for tournament ${tournamentId}`);
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Send an initial connection message
    res.write('data: {"connected": true}\n\n');
    
    // Add this client to the tournament's client list
    addTournamentClient(tournamentId, res);
    
    // Handle client disconnect
    req.on('close', () => {
      removeTournamentClient(tournamentId, res);
      console.log(`Client disconnected from tournament ${tournamentId} stream`);
    });
  } catch (error) {
    console.error('Error setting up SSE stream:', error);
    return res.status(500).json({ error: 'Failed to set up tournament stream' });
  }
});

/**
 * Get details about a specific tournament
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id);
    if (isNaN(tournamentId)) {
      return res.status(400).json({ error: 'Invalid tournament ID' });
    }
    
    // Get the tournament
    const tournament = await storage.getTournament(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Get all rounds for this tournament
    const rounds = await storage.getTournamentRoundsByTournament(tournamentId);
    
    // Return the tournament with rounds
    return res.json({ tournament, rounds });
  } catch (error) {
    console.error('Error getting tournament:', error);
    return res.status(500).json({ error: 'Failed to get tournament' });
  }
});

/**
 * Get all ideas for a tournament
 */
router.get('/:id/ideas', async (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id);
    if (isNaN(tournamentId)) {
      return res.status(400).json({ error: 'Invalid tournament ID' });
    }
    
    // Get the tournament
    const tournament = await storage.getTournament(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Get all ideas for this tournament
    const ideas = await storage.getIdeasByTournament(tournamentId);
    
    // Return the ideas
    return res.json(ideas);
  } catch (error) {
    console.error('Error getting tournament ideas:', error);
    return res.status(500).json({ error: 'Failed to get tournament ideas' });
  }
});

/**
 * Get feedback from a specific agent on a specific idea
 */
router.get('/feedback/:ideaId/:agentId', async (req: Request, res: Response) => {
  try {
    const { ideaId, agentId } = req.params;
    
    // Get the idea
    const idea = await storage.getIdea(ideaId);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    
    // Get all reviews for this idea
    const reviews = await storage.getReviewsByIdeaId(ideaId);
    
    // Find the review from the specified agent
    const review = reviews.find(r => r.agentId === agentId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Return the review feedback
    return res.json({
      agent_id: review.agentId,
      strengths: review.strengths,
      weaknesses: review.weaknesses,
      score: review.score,
      additionalMetrics: review.additionalMetrics
    });
  } catch (error) {
    console.error('Error getting review feedback:', error);
    return res.status(500).json({ error: 'Failed to get review feedback' });
  }
});

/**
 * Get all tournaments
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Get all tournaments
    const tournaments = await storage.getAllTournaments();
    
    // Return the tournaments
    return res.json(tournaments);
  } catch (error) {
    console.error('Error getting all tournaments:', error);
    return res.status(500).json({ error: 'Failed to get tournaments' });
  }
});

export default router;