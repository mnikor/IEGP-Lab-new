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
      // Additional fields
      otherStrategicGoalText: data.otherStrategicGoalText,
      budgetCeilingEur: data.budgetCeilingEur,
      timelineCeilingMonths: data.timelineCeilingMonths,
      salesImpactThreshold: data.salesImpactThreshold,
      anticipatedFpiDate: data.anticipatedFpiDate,
      globalLoeDate: data.globalLoeDate,
      patentExtensionPotential: data.patentExtensionPotential,
      additionalContext: data.additionalContext,
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
 * Calculate the progress of a tournament based on its current state
 * @param tournamentId The ID of the tournament to calculate progress for
 * @returns A progress percentage from 0-100
 */
async function calculateTournamentProgress(tournamentId: number): Promise<number> {
  const tournament = await storage.getTournament(tournamentId);
  if (!tournament) return 0;
  
  // If tournament is completed, return 100%
  if (tournament.status === 'completed') {
    return 100;
  }
  
  // Get all ideas for this tournament
  const ideas = await storage.getIdeasByTournament(tournamentId);
  
  // Base percentages
  const initialPercentage = 10; // Starting point after initialization
  const finalPercentage = 95;   // Max percentage before completion
  
  // If no rounds have started yet
  if (tournament.currentRound === 0) {
    const seedIdeas = ideas.filter(idea => idea.round === 0);
    // Check if we have seed ideas (initialized)
    if (seedIdeas.length > 0) {
      return initialPercentage;
    }
    return 5; // Just created, not yet initialized
  }
  
  // Calculate progress based on rounds completed and current round progress
  const totalRounds = tournament.maxRounds;
  const currentRound = tournament.currentRound;
  
  // Each round represents a portion of the progress
  const progressPerRound = (finalPercentage - initialPercentage) / totalRounds;
  
  // Calculate progress for completed rounds
  const completedRoundsProgress = initialPercentage + ((currentRound - 1) * progressPerRound);
  
  // Calculate progress within the current round
  const ideasInCurrentRound = ideas.filter(idea => idea.round === currentRound).length;
  const expectedIdeasPerRound = tournament.lanes * 2; // Champions and challengers
  const currentRoundProgress = Math.min(1, ideasInCurrentRound / expectedIdeasPerRound) * progressPerRound;
  
  return Math.min(finalPercentage, completedRoundsProgress + currentRoundProgress);
}

// Define the type for tournament winners with rank and medal
interface TournamentWinner {
  ideaId: string;
  tournamentId: number;
  laneId: number;
  round: number;
  isChampion: boolean;
  title: string;
  overallScore: number;
  rank: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
  [key: string]: any; // Allow other Idea properties
}

/**
 * Get tournament winners with ranking information
 * @param tournamentId The tournament ID
 * @returns Top ranked ideas with placement information
 */
async function getTournamentWinners(tournamentId: number): Promise<TournamentWinner[]> {
  // Get all ideas for this tournament
  const ideas = await storage.getIdeasByTournament(tournamentId);
  
  // Get champions and latest round ideas
  const latestRound = Math.max(...ideas.map(i => i.round));
  const bestIdeas = ideas.filter(idea => 
    idea.isChampion || (idea.round === latestRound && idea.round > 0)
  );
  
  // Sort by overall score (descending)
  const sortedIdeas = [...bestIdeas].sort((a, b) => b.overallScore - a.overallScore);
  
  // Return the top ideas with ranking information
  return sortedIdeas.map((idea, index) => ({
    ...idea,
    rank: index + 1,
    medal: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : null
  }));
}

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
    
    // Calculate progress percentage
    const progress = await calculateTournamentProgress(tournamentId);
    
    // Get winners if tournament is completed
    let winners: TournamentWinner[] = [];
    if (tournament.status === 'completed') {
      winners = await getTournamentWinners(tournamentId);
    }
    
    // Return the tournament with enhanced information
    return res.json({ 
      tournament, 
      rounds, 
      progress: Math.round(progress),
      winners: tournament.status === 'completed' ? winners : []
    });
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

/**
 * Get research data from Perplexity for a tournament
 */
router.get('/:id/research-data', async (req: Request, res: Response) => {
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
    
    // In a real implementation, we would use a call to the Perplexity API here
    // to dynamically generate research data based on the tournament details
    
    // For demonstration purposes, create dynamic research content based on drug and indication
    const drugName = tournament.drugName || "amivantamab";
    const indication = tournament.indication || "metastatic colorectal cancer";
    
    const researchData = {
      content: `## Search Round 1: Current Unmet Needs in ${indication}

Despite advances in treatment options for ${indication}, there remain significant unmet needs, particularly for patients who have progressed on standard therapies. ${drugName} is being investigated for potential applications beyond its current approved indications.

Key unmet needs in ${indication} treatment:

1. **Resistance to Current Therapies**: Many patients develop resistance to existing treatments through various molecular mechanisms, creating an urgent need for novel therapeutic approaches.

2. **Limited Options for Specific Genetic Subtypes**: There are limited effective treatments for certain molecular subtypes of ${indication}, highlighting the need for targeted therapies.

3. **Need for Biomarker-Guided Approaches**: Precision medicine approaches that match patients to appropriate therapies based on molecular profiles require further development for ${indication}.

4. **Long-term Efficacy Challenges**: Current treatments often provide transient responses with limited durability, necessitating new therapeutic strategies.

5. **Optimal Sequencing Strategies**: There is limited evidence on the optimal sequence of therapies for ${indication}, particularly for incorporating novel agents like ${drugName}.

**Recent or Ongoing Studies with ${drugName} in ${indication}:**

1. **Clinical Trial Landscape**: There are multiple ongoing studies evaluating ${drugName} in various solid tumors, with several specifically recruiting patients with ${indication}.

2. **Basket Trials**: Several basket trials are currently evaluating ${drugName} in biomarker-selected patient populations across multiple tumor types, including ${indication} cohorts.

3. **Combination Approaches**: Emerging evidence suggests potential synergistic activity when combining ${drugName} with existing standard-of-care therapies for ${indication}, warranting further investigation.

## Search Round 2: Regulatory Status and Competitive Landscape for ${drugName} in ${indication}

Current regulatory status and competitive landscape for ${drugName}:

1. **Regulatory Status**: 
   - Current approved indications for ${drugName}
   - Potential pathway to approval for ${indication} based on available data
   - Key regulatory considerations specific to this development program

2. **Competitive Landscape**: 
   - Current standard of care for ${indication}
   - Similar agents in development for this indication
   - Potential positioning strategy for ${drugName} in this space

3. **Market Differentiation**:
   - Key differentiating features of ${drugName} compared to existing therapies
   - Potential unmet needs ${drugName} addresses in ${indication}
   - Commercial considerations for development in this space

4. **Relevant Biomarker Landscape**:
   - Current biomarker tests relevant to ${indication}
   - Potential companion diagnostic needs for ${drugName} in this indication
   - Biomarker-driven stratification considerations for clinical trials

5. **Clinical Development Opportunities**:
   - Phase I/II trial opportunities for ${drugName} in ${indication}
   - Potential for accelerated development pathways
   - Novel combination approaches to explore

## Search Round 3: Clinical Trial Design Considerations for ${drugName} in ${indication}

Based on our research, optimal trial design considerations for ${drugName} in ${indication} include:

1. **Patient Population Selection**:
   - Key patient selection criteria for ${indication}
   - Relevant biomarkers to consider for enrollment
   - Potential subpopulations where ${drugName} may show enhanced efficacy
   - Considerations for treatment line (naive vs. previously treated)

2. **Study Design Options**:
   - Recommended phase and design type for ${drugName} in ${indication}
   - Sample size considerations based on anticipated effect size
   - Randomization strategies and control arm selection
   - Adaptive design possibilities

3. **Endpoint Selection**:
   - Primary endpoint recommendations for ${drugName} in ${indication}
   - Relevant secondary endpoints to consider
   - Surrogate endpoint options and regulatory acceptance
   - Patient-reported outcomes appropriate for this indication
4. **Dose Selection and Schedule**:
   - Recommended dosing strategies for ${drugName} in ${indication}
   - Schedule considerations (frequency, duration, cycles)
   - Combination dosing adjustments if applicable
   - Management of dose-limiting toxicities

5. **Biomarker Strategy**:
   - Recommended biomarkers for patient selection
   - Companion diagnostic considerations
   - Exploratory biomarkers for response prediction
   - Pharmacodynamic markers for mechanism confirmation
6. **Safety Monitoring Requirements**:
   - Known safety profile considerations for ${drugName}
   - Standard safety assessments for ${indication} studies
   - Specific safety concerns requiring special monitoring
   - Risk management strategies
7. **Operational Considerations**:
   - Geographic regions optimal for patient recruitment
   - Potential challenges specific to ${indication} trials
   - Standard costs and timeline expectations
   - Key performance indicators for site selection

## Search Round 4: Recent Clinical Trials in ${indication}

Analysis of recent clinical trials in ${indication} relevant to the development of ${drugName}:

1. **Landmark Studies**:
   - Recent key Phase II/III trials in ${indication}
   - Study designs that have shown success in this therapeutic area
   - Common comparator arms used in registration-enabling studies
   - Average sample sizes for pivotal trials

2. **Study Design Trends**:
   - Modern trial design elements gaining popularity in ${indication}
   - Use of adaptive designs, basket trials, and platform studies
   - Innovative endpoints being accepted by regulators
   - Patient-centric design considerations 

3. **Recruitment and Inclusion Criteria Patterns**:
   - Typical inclusion/exclusion criteria in recent ${indication} trials
   - Evolving patient population definitions
   - Average enrollment rates and recruitment challenges
   - Geographic distribution of clinical sites

4. **Outcome Measurements**:
   - Primary endpoints commonly used in recent ${indication} trials
   - Secondary endpoints providing supportive evidence
   - Novel endpoints gaining regulatory acceptance
   - Quality of life and patient-reported outcomes

5. **Regulatory Considerations**:
   - Pathways to approval for ${drugName} in ${indication}
   - Recent precedents for similar drug approvals
   - Special designations to consider (breakthrough, accelerated approval)
   - Health authority feedback on similar development programs`,
      citations: [
        "https://clinicaltrials.gov/search",
        "https://pubmed.ncbi.nlm.nih.gov/",
        "https://clinicaltrials.gov/",
        "https://www.fda.gov/drugs/development-approval-process-drugs",
        "https://www.ema.europa.eu/en/medicines",
        "https://www.nature.com/subjects/clinical-trials",
        "https://www.thelancet.com/journals/lanonc/home"
      ]
    };
    
    return res.json(researchData);
  } catch (error) {
    console.error('Error getting research data:', error);
    return res.status(500).json({ error: 'Failed to get research data' });
  }
});

export default router;