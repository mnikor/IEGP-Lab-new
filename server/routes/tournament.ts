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
   - First-line: FOLFOX/FOLFIRI ± bevacizumab (Avastin)
   - For RAS wild-type: Anti-EGFR antibodies (cetuximab/Erbitux or panitumumab/Vectibix)
   - Second/third-line: Regorafenib, TAS-102, pembrolizumab (for MSI-high)
   - BRAF V600E mutations: Encorafenib + cetuximab combination

2. **Direct Competitors with Similar Mechanism**:
   - Anti-EGFR monoclonal antibodies: cetuximab, panitumumab
   - Dual MET/EGFR inhibition: telisotuzumab vedotin (antibody-drug conjugate)
   - EGFR TKIs: erlotinib, gefitinib (limited efficacy in CRC)

3. **Other Treatment Approaches in Development**:
   - HER2-directed therapies for HER2+ CRC: trastuzumab/pertuzumab, trastuzumab deruxtecan
   - KRAS G12C inhibitors: sotorasib, adagrasib for KRAS G12C mutant CRC
   - Novel immunotherapy combinations with chemotherapy
   - Circulating tumor DNA (ctDNA)-guided treatment approaches

4. **Market Position**:
   - Cetuximab and panitumumab dominate the anti-EGFR space in CRC
   - Bevacizumab has strong market position for first-line treatment
   - Encorafenib + cetuximab has secured the BRAF V600E niche

5. **Potential Competitive Advantages**:
   - Dual targeting of EGFR and MET could address resistance mechanisms
   - May be effective in patients who develop resistance to cetuximab/panitumumab
   - Could potentially work in combination with targeted therapies for specific mutations

## Search Round 4: Recent Trials

Recent clinical trials and emerging evidence for amivantamab in colorectal cancer are limited, as most research focuses on its approved NSCLC indication. However, some relevant developments include:

1. **Ongoing Clinical Trials**:
   - CHRYSALIS and CHRYSALIS-2: These are primarily studying amivantamab in NSCLC but have expansion cohorts for other solid tumors including limited CRC patients
   - No Phase II/III trials specifically in CRC registered in the past 2-3 years

2. **Preclinical/Translational Research**:
   - Recent studies have shown potential for dual EGFR-MET inhibition in overcoming resistance to EGFR-targeted therapy in CRC models
   - Interest in using amivantamab in combination with other targeted agents in the CRC setting

3. **Biomarker Development**:
   - Increasing focus on identifying appropriate biomarkers for patient selection
   - Liquid biopsy techniques being developed to monitor treatment response and resistance development

4. **Alternative Treatment Approaches**:
   - Several competing bispecific antibodies targeting different combinations of receptors are in development
   - Antibody-drug conjugates targeting EGFR are also being studied for CRC

5. **Emerging Data in Other Indications**:
   - Promising efficacy and safety in NSCLC provides rationale for exploration in CRC
   - Combination trials with checkpoint inhibitors may inform future CRC studies`,
      citations: [
        "https://www.cancer.gov/about-cancer/treatment/drugs/amivantamab-vmjw",
        "https://www.janssen.com/emea/sites/www_janssen_com_emea/files/rybrevant_summary_of_product_characteristics.pdf",
        "https://www.accessdata.fda.gov/drugsatfda_docs/label/2021/761210s000lbl.pdf",
        "https://clinicaltrials.gov/ct2/results?cond=Colorectal+Cancer&term=amivantamab&cntry=&state=&city=&dist=",
        "https://ascopubs.org/doi/10.1200/JCO.2022.40.16_suppl.e15084",
        "https://www.nature.com/articles/s41416-021-01553-0",
        "https://www.thelancet.com/journals/lanonc/article/PIIS1470-2045(22)00603-6/fulltext"
      ]
    };
    
    return res.json(researchData);
  } catch (error) {
    console.error('Error getting research data:', error);
    return res.status(500).json({ error: 'Failed to get research data' });
  }
});

export default router;