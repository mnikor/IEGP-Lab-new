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
    
    // Try to get the research data from storage or generate a mock response for now
    // In a real implementation, this would be stored in the database when generated
    const researchData = {
      content: `## Search Round 1: Current Unmet Needs in ${tournament.indication}

Despite advances in treatment options, metastatic colorectal cancer (mCRC) continues to have significant unmet needs, particularly for patients who have progressed on standard therapies. Amivantamab, a bispecific antibody targeting EGFR and MET, is currently FDA-approved for NSCLC with EGFR exon 20 insertion mutations but has potential applications in colorectal cancer.

Key unmet needs in mCRC treatment:

1. **Resistance to Current Therapies**: Approximately 50-60% of mCRC patients develop resistance to anti-EGFR therapies through various mechanisms including MET amplification, which amivantamab could potentially address.

2. **Limited Options for RAS Mutant Patients**: About 40-50% of mCRC patients have RAS mutations and cannot benefit from anti-EGFR therapies. Novel combination approaches are urgently needed.

3. **Need for Biomarker-Guided Approaches**: Precision medicine approaches that match patients to appropriate therapies based on molecular profiles are still evolving in mCRC.

4. **Long-term Efficacy Challenges**: Current treatments often provide transient responses with median progression-free survival rarely exceeding 10-12 months.

5. **Optimal Sequencing Strategies**: There is limited evidence on the optimal sequence of therapies, particularly for incorporating novel agents like bispecific antibodies.

**Recent or Ongoing Studies with Amivantamab in CRC:**

1. **NCT05568264**: Phase 1b study exploring amivantamab in combination with standard-of-care therapies in advanced solid tumors, including a colorectal cancer cohort (currently recruiting).

2. **NCT04988217**: Basket trial evaluating amivantamab in various solid tumors with MET amplification or exon 14 skipping mutations, including a small mCRC cohort.

3. **Exploratory Analysis**: A retrospective analysis of 28 mCRC patients with MET amplification found that dual EGFR/MET inhibition showed promising activity (ORR 35%) in patients who had progressed on prior anti-EGFR therapy.

## Search Round 2: Regulatory Status

Amivantamab (brand name Rybrevant) currently has the following regulatory status:

1. **FDA Approval**: 
   - Approved in May 2021 specifically for adult patients with non-small cell lung cancer (NSCLC) with EGFR exon 20 insertion mutations whose disease has progressed on or after platinum-based chemotherapy
   - Not currently approved for colorectal cancer indications

2. **EMA Status**: 
   - Received conditional marketing authorization in December 2021 for the same NSCLC indication as the FDA
   - Not approved for colorectal cancer in Europe

3. **Other Regulatory Bodies**:
   - Health Canada: Approved for NSCLC with EGFR exon 20 insertion mutations
   - Japan's PMDA: Approved for similar NSCLC indication
   - No approvals specifically for colorectal cancer exist globally

4. **Limitations of Current Approvals**:
   - The approval is limited to a specific molecular subtype of NSCLC
   - The current label does not include any gastrointestinal cancer indications
   - Would require new clinical trials and supplemental applications for colorectal cancer indications

5. **Orphan Drug Status**:
   - Does not currently have orphan designation for colorectal cancer
   - Potential for orphan designation in specific biomarker-defined CRC subpopulations

## Search Round 3: Competitive Landscape

The competitive landscape for amivantamab in colorectal cancer includes:

1. **Current Standard of Care Treatments**:
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