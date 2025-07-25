import { users, type User, type InsertUser, studyConcepts, synopsisValidations, type StudyConcept, type InsertStudyConcept, type SynopsisValidation, type InsertSynopsisValidation, type ResearchStrategy, type InsertResearchStrategy, type ResearchResult, type InsertResearchResult } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

import { 
  Tournament, 
  InsertTournament, 
  Idea, 
  InsertIdea, 
  Review, 
  InsertReview,
  TournamentRound,
  InsertTournamentRound
} from '@shared/tournament';

export interface IStorage {
  // User methods (retained from template)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Study concept methods
  getAllStudyConcepts(): Promise<StudyConcept[]>;
  getRecentStudyConcepts(limit: number): Promise<StudyConcept[]>;
  getStudyConcept(id: number): Promise<StudyConcept | undefined>;
  createStudyConcept(concept: InsertStudyConcept): Promise<StudyConcept>;
  updateStudyConcept(id: number, concept: Partial<InsertStudyConcept>): Promise<StudyConcept | undefined>;
  deleteStudyConcept(id: number): Promise<boolean>;
  
  // Synopsis validation methods
  getAllSynopsisValidations(): Promise<SynopsisValidation[]>;
  getRecentSynopsisValidations(limit: number): Promise<SynopsisValidation[]>;
  getSynopsisValidation(id: number): Promise<SynopsisValidation | undefined>;
  createSynopsisValidation(validation: InsertSynopsisValidation): Promise<SynopsisValidation>;
  updateSynopsisValidation(id: number, validation: Partial<InsertSynopsisValidation>): Promise<SynopsisValidation | undefined>;
  deleteSynopsisValidation(id: number): Promise<boolean>;
  
  // Tournament methods
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  getTournament(id: number): Promise<Tournament | undefined>;
  getAllTournaments(): Promise<Tournament[]>;
  getRecentTournaments(limit: number): Promise<Tournament[]>;
  updateTournament(id: number, tournament: Partial<Tournament>): Promise<Tournament | undefined>;
  deleteTournament(id: number): Promise<boolean>;
  
  // Idea methods
  createIdea(idea: InsertIdea): Promise<Idea>;
  getIdea(ideaId: string): Promise<Idea | undefined>;
  getIdeasByTournament(tournamentId: number): Promise<Idea[]>;
  getIdeasByTournamentAndRound(tournamentId: number, round: number): Promise<Idea[]>;
  getChampionsByTournament(tournamentId: number): Promise<Idea[]>;
  updateIdea(ideaId: string, idea: Partial<Idea>): Promise<Idea | undefined>;
  deleteIdea(ideaId: string): Promise<boolean>;
  
  // Review methods
  createReview(review: InsertReview): Promise<Review>;
  getReview(id: number): Promise<Review | undefined>;
  getReviewsByIdeaId(ideaId: string): Promise<Review[]>;
  deleteReview(id: number): Promise<boolean>;
  
  // Tournament round methods
  createTournamentRound(round: InsertTournamentRound): Promise<TournamentRound>;
  getTournamentRound(id: number): Promise<TournamentRound | undefined>;
  getTournamentRoundsByTournament(tournamentId: number): Promise<TournamentRound[]>;
  getTournamentRoundByTournamentAndRound(tournamentId: number, roundNumber: number): Promise<TournamentRound | undefined>;
  deleteTournamentRound(id: number): Promise<boolean>;
  
  // Research Strategy methods
  createResearchStrategy(strategy: InsertResearchStrategy): Promise<ResearchStrategy>;
  getResearchStrategy(id: number): Promise<ResearchStrategy | undefined>;
  getResearchStrategiesBySession(sessionId: string): Promise<ResearchStrategy[]>;
  updateResearchStrategy(id: number, strategy: Partial<InsertResearchStrategy>): Promise<ResearchStrategy | undefined>;
  deleteResearchStrategy(id: number): Promise<boolean>;
  
  // Research Result methods
  createResearchResult(result: InsertResearchResult): Promise<ResearchResult>;
  getResearchResult(id: number): Promise<ResearchResult | undefined>;
  getResearchResultsByStrategy(strategyId: number): Promise<ResearchResult[]>;
  deleteResearchResult(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private concepts: Map<number, StudyConcept>;
  private validations: Map<number, SynopsisValidation>;
  private tournaments: Map<number, Tournament>;
  private ideas: Map<string, Idea>;
  private reviews: Map<number, Review>;
  private tournamentRounds: Map<number, TournamentRound>;
  private researchStrategies: Map<number, ResearchStrategy>;
  private researchResults: Map<number, ResearchResult>;
  
  private userId: number;
  private conceptId: number;
  private validationId: number;
  private tournamentId: number;
  private reviewId: number;
  private tournamentRoundId: number;
  private researchStrategyId: number;
  private researchResultId: number;

  constructor() {
    this.users = new Map();
    this.concepts = new Map();
    this.validations = new Map();
    this.tournaments = new Map();
    this.ideas = new Map();
    this.reviews = new Map();
    this.tournamentRounds = new Map();
    this.researchStrategies = new Map();
    this.researchResults = new Map();
    
    this.userId = 1;
    this.conceptId = 1;
    this.validationId = 1;
    this.tournamentId = 1;
    this.reviewId = 1;
    this.tournamentRoundId = 1;
    this.researchStrategyId = 1;
    this.researchResultId = 1;
    
    // Add some mock data for testing
    this.addMockData();
  }

  // User methods (retained from template)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Study concept methods
  async getAllStudyConcepts(): Promise<StudyConcept[]> {
    return Array.from(this.concepts.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  async getRecentStudyConcepts(limit: number): Promise<StudyConcept[]> {
    return Array.from(this.concepts.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
  
  async getStudyConcept(id: number): Promise<StudyConcept | undefined> {
    return this.concepts.get(id);
  }
  
  async createStudyConcept(concept: InsertStudyConcept): Promise<StudyConcept> {
    const id = this.conceptId++;
    const now = new Date();
    const studyConcept: StudyConcept = {
      ...concept,
      id,
      createdAt: now.toISOString()
    };
    this.concepts.set(id, studyConcept);
    return studyConcept;
  }
  
  async updateStudyConcept(id: number, concept: Partial<InsertStudyConcept>): Promise<StudyConcept | undefined> {
    const existingConcept = this.concepts.get(id);
    if (!existingConcept) return undefined;
    
    const updatedConcept: StudyConcept = {
      ...existingConcept,
      ...concept
    };
    this.concepts.set(id, updatedConcept);
    return updatedConcept;
  }
  
  async deleteStudyConcept(id: number): Promise<boolean> {
    return this.concepts.delete(id);
  }
  
  // Synopsis validation methods
  async getAllSynopsisValidations(): Promise<SynopsisValidation[]> {
    return Array.from(this.validations.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  async getRecentSynopsisValidations(limit: number): Promise<SynopsisValidation[]> {
    return Array.from(this.validations.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
  
  async getSynopsisValidation(id: number): Promise<SynopsisValidation | undefined> {
    return this.validations.get(id);
  }
  
  async createSynopsisValidation(validation: InsertSynopsisValidation): Promise<SynopsisValidation> {
    const id = this.validationId++;
    const now = new Date();
    const synopsisValidation: SynopsisValidation = {
      ...validation,
      id,
      createdAt: now.toISOString()
    };
    this.validations.set(id, synopsisValidation);
    return synopsisValidation;
  }
  
  async updateSynopsisValidation(id: number, validation: Partial<InsertSynopsisValidation>): Promise<SynopsisValidation | undefined> {
    const existingValidation = this.validations.get(id);
    if (!existingValidation) return undefined;
    
    const updatedValidation: SynopsisValidation = {
      ...existingValidation,
      ...validation
    };
    this.validations.set(id, updatedValidation);
    return updatedValidation;
  }
  
  async deleteSynopsisValidation(id: number): Promise<boolean> {
    return this.validations.delete(id);
  }
  
  // Tournament methods
  async createTournament(tournament: InsertTournament): Promise<Tournament> {
    const id = this.tournamentId++;
    const newTournament: Tournament = {
      ...tournament,
      id,
      currentRound: 0,
      status: 'in_progress',
      createdAt: new Date(),
      completedAt: null
    };
    this.tournaments.set(id, newTournament);
    return newTournament;
  }

  async getTournament(id: number): Promise<Tournament | undefined> {
    return this.tournaments.get(id);
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return Array.from(this.tournaments.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getRecentTournaments(limit: number): Promise<Tournament[]> {
    return Array.from(this.tournaments.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async updateTournament(id: number, tournament: Partial<Tournament>): Promise<Tournament | undefined> {
    const existingTournament = this.tournaments.get(id);
    if (!existingTournament) {
      return undefined;
    }
    
    const updatedTournament: Tournament = {
      ...existingTournament,
      ...tournament
    };
    
    this.tournaments.set(id, updatedTournament);
    return updatedTournament;
  }

  async deleteTournament(id: number): Promise<boolean> {
    return this.tournaments.delete(id);
  }
  
  // Idea methods
  async createIdea(idea: InsertIdea): Promise<Idea> {
    const newIdea: Idea = {
      ...idea,
      createdAt: new Date()
    };
    
    this.ideas.set(idea.ideaId, newIdea);
    return newIdea;
  }

  async getIdea(ideaId: string): Promise<Idea | undefined> {
    return this.ideas.get(ideaId);
  }

  async getIdeasByTournament(tournamentId: number): Promise<Idea[]> {
    return Array.from(this.ideas.values()).filter(idea => 
      idea.tournamentId === tournamentId
    );
  }

  async getIdeasByTournamentAndRound(tournamentId: number, round: number): Promise<Idea[]> {
    return Array.from(this.ideas.values()).filter(idea => 
      idea.tournamentId === tournamentId && idea.round === round
    );
  }

  async getChampionsByTournament(tournamentId: number): Promise<Idea[]> {
    return Array.from(this.ideas.values()).filter(idea => 
      idea.tournamentId === tournamentId && idea.isChampion
    );
  }

  async updateIdea(ideaId: string, idea: Partial<Idea>): Promise<Idea | undefined> {
    const existingIdea = this.ideas.get(ideaId);
    if (!existingIdea) {
      return undefined;
    }
    
    const updatedIdea: Idea = {
      ...existingIdea,
      ...idea
    };
    
    this.ideas.set(ideaId, updatedIdea);
    return updatedIdea;
  }

  async deleteIdea(ideaId: string): Promise<boolean> {
    return this.ideas.delete(ideaId);
  }
  
  // Review methods
  async createReview(review: InsertReview): Promise<Review> {
    const id = this.reviewId++;
    const newReview: Review = {
      ...review,
      id,
      createdAt: new Date()
    };
    
    this.reviews.set(id, newReview);
    return newReview;
  }

  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
  }

  async getReviewsByIdeaId(ideaId: string): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(review => 
      review.ideaId === ideaId
    );
  }

  async deleteReview(id: number): Promise<boolean> {
    return this.reviews.delete(id);
  }
  
  // Tournament round methods
  async createTournamentRound(round: InsertTournamentRound): Promise<TournamentRound> {
    const id = this.tournamentRoundId++;
    const newRound: TournamentRound = {
      ...round,
      id,
      startedAt: new Date(),
      completedAt: new Date()
    };
    
    this.tournamentRounds.set(id, newRound);
    return newRound;
  }

  async getTournamentRound(id: number): Promise<TournamentRound | undefined> {
    return this.tournamentRounds.get(id);
  }

  async getTournamentRoundsByTournament(tournamentId: number): Promise<TournamentRound[]> {
    return Array.from(this.tournamentRounds.values()).filter(round => 
      round.tournamentId === tournamentId
    ).sort((a, b) => a.roundNumber - b.roundNumber);
  }

  async getTournamentRoundByTournamentAndRound(tournamentId: number, roundNumber: number): Promise<TournamentRound | undefined> {
    return Array.from(this.tournamentRounds.values()).find(round => 
      round.tournamentId === tournamentId && round.roundNumber === roundNumber
    );
  }

  async deleteTournamentRound(id: number): Promise<boolean> {
    return this.tournamentRounds.delete(id);
  }
  
  // Helper to add some mock data
  private addMockData() {
    // Sample study concept
    const sampleConcept: InsertStudyConcept = {
      title: "Pembrolizumab plus Chemotherapy vs. Standard of Care in PD-L1+ NSCLC with Brain Metastases",
      drugName: "Pembrolizumab",
      indication: "Non-small cell lung cancer with brain metastases",
      strategicGoals: ["expand_label", "accelerate_uptake"],
      geography: ["US", "EU"],
      studyPhase: "III",
      targetSubpopulation: "PD-L1 positive patients",
      comparatorDrugs: ["Standard of Care"],
      globalLoeDate: "2032-06-15", // Add explicit LOE date at the concept level (top level)
      timeToLoe: 84, // Add explicit timeToLoe value at the concept level (top level)
      picoData: {
        population: "Adult patients (≥18 years) with stage IV non-small cell lung cancer (NSCLC), confirmed PD-L1 expression ≥1%, and at least one measurable brain metastasis (5-30mm).",
        intervention: "Pembrolizumab (200mg IV, q3w) plus platinum-based doublet chemotherapy for up to 35 cycles or disease progression.",
        comparator: "Standard of care: platinum-based doublet chemotherapy alone for up to 6 cycles followed by maintenance therapy.",
        outcomes: "Primary: Intracranial progression-free survival (iPFS). Secondary: Overall survival (OS), extracranial PFS, objective response rate (ORR), duration of response, and safety."
      },
      mcdaScores: {
        scientificValidity: 4.8,
        clinicalImpact: 4.5,
        commercialValue: 4.7,
        feasibility: 3.9,
        overall: 4.5
      },
      swotAnalysis: {
        strengths: [
          "Addresses an unmet medical need in NSCLC with brain metastases",
          "Builds on established efficacy of pembrolizumab in NSCLC",
          "Clear clinically meaningful endpoints"
        ],
        weaknesses: [
          "Complex patient population may slow recruitment",
          "Potential for increased toxicity with combination therapy",
          "Requires specialized imaging expertise at all centers"
        ],
        opportunities: [
          "Potential label expansion to include brain metastases indication",
          "First mover advantage in this specific subpopulation",
          "Positive results could influence treatment guidelines"
        ],
        threats: [
          "Competing trials targeting similar population",
          "Evolving standard of care in brain metastases management",
          "Reimbursement challenges for combination therapy"
        ]
      },
      reasonsToBelieve: {
        scientificRationale: {
          mechanismOfAction: "PD-1 inhibition has shown efficacy across blood-brain barrier in preclinical models, with pembrolizumab demonstrating CNS penetration in pharmacokinetic studies.",
          preclinicalData: "Mouse models with brain metastases showed 40% tumor reduction with PD-1 blockade. Pembrolizumab CSF concentrations reach 0.1-1% of plasma levels, sufficient for target engagement.",
          biomarkerSupport: "PD-L1 expression in brain metastases correlates with systemic tumor expression in 78% of cases, supporting biomarker-driven patient selection."
        },
        clinicalEvidence: {
          priorPhaseData: "KEYNOTE-001 showed 33% response rate in NSCLC brain metastases subset (n=18). KEYNOTE-189 excluded active brain metastases but treated patients showed 21-month median OS.",
          safetyProfile: "No increased CNS toxicity observed in 1,500+ pembrolizumab-treated NSCLC patients. Immune-related AEs manageable with established protocols.",
          efficacySignals: "Case series reported 6 complete CNS responses in 15 patients with brain metastases, suggesting meaningful clinical activity."
        },
        marketRegulatory: {
          regulatoryPrecedent: "FDA approved nivolumab for brain metastases indication in melanoma based on CNS efficacy data. EMA guidance supports brain metastases as distinct indication.",
          unmetNeed: "40-60% of NSCLC patients develop brain metastases. Current treatments (radiation, surgery) have limited durability. Median survival <12 months.",
          competitiveAdvantage: "First PD-1 inhibitor with dedicated brain metastases trial design. Combination with chemotherapy could establish new standard of care."
        },
        developmentFeasibility: {
          patientAccess: "25 comprehensive cancer centers already identified with >50 eligible patients/year each. MRI screening protocols established.",
          endpointViability: "CNS response per RANO-BM criteria accepted by FDA. Overall survival endpoint provides regulatory certainty for approval.",
          operationalReadiness: "Pembrolizumab supply secured. CRO partnerships in place. Regulatory pre-submission meetings scheduled Q2 2024."
        },
        overallConfidence: "High confidence based on strong biological rationale, supportive clinical signals, clear regulatory pathway, and established operational infrastructure."
      },
      feasibilityData: {
        estimatedCost: 4200000,
        timeline: 32,
        projectedROI: 3.8,
        recruitmentRate: 0.65,
        completionRisk: 0.35,
        sampleSize: 150,
        sampleSizeJustification: "Based on 80% power to detect 40% improvement in CNS response rate (primary endpoint), with alpha=0.05 and assuming 15% dropout rate.",
        numberOfSites: 25,
        numberOfCountries: 3,
        recruitmentPeriodMonths: 18,
        followUpPeriodMonths: 12,
        timeToLoe: 84,
        globalLoeDate: "2032-06-15",
        estimatedFpiDate: "2025-06-15",
        regionalLoeData: [
          {
            region: "United States",
            loeDate: "2032-06-15",
            hasPatentExtension: false,
            extensionPotential: true,
            notes: "Primary patent expires 2032"
          },
          {
            region: "European Union",
            loeDate: "2032-08-30",
            hasPatentExtension: true,
            extensionPotential: false,
            notes: "SPC extension granted until 2032"
          }
        ],
        postLoeValue: 0.25, // 25% value retention after LOE
        
        // Cost breakdown components
        siteCosts: 625000,
        personnelCosts: 1260000,
        materialCosts: 630000,
        monitoringCosts: 840000,
        dataCosts: 420000,
        regulatoryCosts: 425000,
        
        // Statistical power analysis details
        statisticalPower: 0.8,
        alphaLevel: 0.05,
        effectSize: 0.4,
        endpointType: "response_rate",
        powerAnalysis: "Sample size calculated for 80% power to detect 40% improvement in CNS response rate over historical control of 15%, with two-sided alpha=0.05",
        
        // Risk factors
        dropoutRate: 0.15,
        complexityFactor: 0.75
      },
      evidenceSources: [
        {
          title: "Pembrolizumab for management of patients with NSCLC and brain metastases: long-term results from KEYNOTE-001",
          authors: "Goldberg SB, et al.",
          publication: "J Thorac Oncol",
          year: 2020,
          citation: "Goldberg SB, et al. (2020). Pembrolizumab for management of patients with NSCLC and brain metastases: long-term results from KEYNOTE-001. J Thorac Oncol. 15(3):426-435."
        },
        {
          title: "KEYNOTE-189: Updated overall survival and progression after the next line of therapy with pembrolizumab plus chemotherapy in metastatic non-small cell lung cancer",
          authors: "Gadgeel S, et al.",
          publication: "J Clin Oncol",
          year: 2019,
          citation: "Gadgeel S, et al. (2019). KEYNOTE-189: Updated overall survival and progression after the next line of therapy with pembrolizumab plus chemotherapy in metastatic non-small cell lung cancer. J Clin Oncol. 37(15_suppl):9013."
        }
      ]
    };
    
    // Sample validation
    const sampleValidation: InsertSynopsisValidation = {
      title: "Validation Report: Trastuzumab Deruxtecan in HER2+ Metastatic Breast Cancer",
      drugName: "Trastuzumab Deruxtecan",
      indication: "HER2+ Metastatic Breast Cancer",
      strategicGoals: ["defend_share", "real_world_evidence"],
      originalFileName: "trastuzumab_study_synopsis.pdf",
      geography: ["US", "EU"],
      studyPhase: "III",
      extractedPico: {
        population: "Adult patients with HER2-positive metastatic breast cancer who have received at least one prior anti-HER2-based regimen",
        intervention: "Trastuzumab deruxtecan (T-DXd) 5.4 mg/kg IV every 3 weeks",
        comparator: "Physician's choice (trastuzumab emtansine, lapatinib plus capecitabine, or trastuzumab plus capecitabine)",
        outcomes: "Primary: Progression-free survival (PFS). Secondary: Overall survival (OS), objective response rate (ORR), duration of response (DOR), clinical benefit rate (CBR), and safety."
      },
      benchmarkDeltas: [
        {
          aspect: "Patient Population",
          current: "Patients with HER2+ MBC who have received ≥1 prior anti-HER2 regimen",
          suggested: "Specify patients with HER2 IHC 3+ or ISH+ status and include brain metastases subgroup",
          impact: "positive"
        },
        {
          aspect: "Dosing Schedule",
          current: "T-DXd 5.4 mg/kg IV Q3W",
          suggested: "Consider evaluating 5.4 mg/kg vs. 4.4 mg/kg to address ILD risk",
          impact: "positive"
        },
        {
          aspect: "Primary Endpoint",
          current: "Progression-free survival",
          suggested: "Maintain PFS as primary endpoint, no change needed",
          impact: "neutral"
        }
      ],
      riskFlags: [
        {
          category: "Safety Monitoring",
          description: "Insufficient ILD/pneumonitis monitoring protocol",
          severity: "high",
          mitigation: "Implement rigorous pulmonary toxicity monitoring with defined management algorithms"
        },
        {
          category: "Biomarker Strategy",
          description: "Limited biomarker collection beyond HER2 status",
          severity: "medium",
          mitigation: "Expand biomarker analysis to include HER2 heterogeneity and HER3 expression"
        },
        {
          category: "Recruitment Timeline",
          description: "Ambitious enrollment projections given competition",
          severity: "low",
          mitigation: "Increase site numbers and consider Asia-Pacific region expansion"
        }
      ],
      revisedEconomics: {
        originalCost: 6500000,
        revisedCost: 7200000,
        originalTimeline: 24,
        revisedTimeline: 28,
        originalROI: 3.2,
        revisedROI: 3.5,
        notes: "Increased costs reflect expanded biomarker analysis and additional sites, but higher potential ROI due to improved patient selection and expanded geographic reach."
      },
      swotAnalysis: {
        strengths: [
          "Strong preliminary efficacy data from phase II studies",
          "Novel mechanism of action with cytotoxic payload",
          "Addresses significant unmet need in pretreated population"
        ],
        weaknesses: [
          "ILD/pneumonitis risk requires careful monitoring",
          "Complex manufacturing process may affect supply chain",
          "Higher cost compared to some competitor regimens"
        ],
        opportunities: [
          "Potential for expansion into earlier lines of therapy",
          "Combination strategies with immunotherapy",
          "Application in other HER2-expressing tumors"
        ],
        threats: [
          "Emerging competitors in HER2+ MBC space",
          "Evolving standard of care with tucatinib combinations",
          "Regulatory focus on toxicity management"
        ]
      }
    };
    
    // Sample tournament
    const sampleTournament: InsertTournament = {
      drugName: "amivantamab",
      indication: "non-small cell lung cancer with EGFR exon 20 insertion mutations",
      strategicGoals: [
        { goal: "expand_label", weight: 0.4 },
        { goal: "accelerate_uptake", weight: 0.3 },
        { goal: "demonstrate_safety", weight: 0.3 }
      ],
      geography: ["US", "EU", "JP"],
      studyPhasePref: "II",
      maxRounds: 5,
      lanes: 4,
      status: "running",
      currentRound: 2,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
    };
    
    // Add tournament to storage
    this.createTournament(sampleTournament).then(tournament => {
      console.log("Created tournament:", tournament.id);
      
      // Create sample ideas for the tournament
      const ideaA: InsertIdea = {
        ideaId: "A_v1",
        tournamentId: tournament.id,
        laneId: 1,
        round: 1,
        isChampion: true,
        title: "EGFR Exon 20 First-line Comparison Study",
        drugName: "amivantamab",
        indication: "NSCLC with EGFR exon 20 insertion mutations",
        strategicGoals: ["expand_label", "accelerate_uptake"],
        geography: ["US", "EU", "JP"],
        studyPhase: "II",
        picoData: {
          population: "Treatment-naive patients with NSCLC and confirmed EGFR exon 20 insertion mutations",
          intervention: "Amivantamab (1050mg IV, q3w) monotherapy",
          comparator: "Platinum-based chemotherapy",
          outcomes: "PFS, OS, ORR, DOR, safety"
        },
        mcdaScores: {
          scientificValidity: 0.78,
          clinicalImpact: 0.85,
          commercialValue: 0.82,
          feasibility: 0.70,
          overall: 0.79
        },
        swotAnalysis: {
          strengths: ["Addresses unmet need in first-line setting", "Built on strong Phase 1 data", "Potential for practice-changing results"],
          weaknesses: ["Complex trial design", "Recruitment challenges for rare mutation", "Higher cost than current SOC"],
          opportunities: ["First-line label expansion", "Guideline inclusion", "Increase market share"],
          threats: ["Competing agents in development", "Evolving molecular testing landscape", "Reimbursement challenges"]
        },
        feasibilityData: {
          estimatedCost: 5200000,
          timeline: 36,
          projectedROI: 3.2,
          recruitmentRate: 0.62,
          completionRisk: 0.40
        },
        evidenceSources: [],
        overallScore: 0.79,
        scoreChange: null
      };
      
      const ideaB: InsertIdea = {
        ideaId: "B_v1",
        tournamentId: tournament.id,
        laneId: 2,
        round: 1,
        isChampion: true,
        title: "Amivantamab + Chemo vs Chemo alone in pretreated NSCLC",
        drugName: "amivantamab",
        indication: "Previously treated NSCLC with EGFR exon 20 insertion mutations",
        strategicGoals: ["demonstrate_safety", "accelerate_uptake"],
        geography: ["US", "EU"],
        studyPhase: "II",
        picoData: {
          population: "Patients with NSCLC and EGFR exon 20 insertion mutations who progressed after platinum-based chemotherapy",
          intervention: "Amivantamab + docetaxel",
          comparator: "Docetaxel alone",
          outcomes: "PFS, OS, ORR, safety"
        },
        mcdaScores: {
          scientificValidity: 0.75,
          clinicalImpact: 0.80,
          commercialValue: 0.74,
          feasibility: 0.82,
          overall: 0.77
        },
        swotAnalysis: {
          strengths: ["Combination approach addresses resistance mechanisms", "Feasible recruitment timeline", "Clear endpoints"],
          weaknesses: ["Added toxicity with combination", "Complex dosing schedule", "Longer treatment duration impacts costs"],
          opportunities: ["Expand use in later lines", "Potential synergistic effect", "Address docetaxel resistance"],
          threats: ["Other EGFR-targeting agents", "Evolving treatment landscape", "Payer restrictions"]
        },
        feasibilityData: {
          estimatedCost: 4800000,
          timeline: 30,
          projectedROI: 2.8,
          recruitmentRate: 0.70,
          completionRisk: 0.35
        },
        evidenceSources: [],
        overallScore: 0.77,
        scoreChange: null
      };
      
      const ideaC: InsertIdea = {
        ideaId: "C_v2",
        tournamentId: tournament.id,
        laneId: 1,
        round: 2,
        isChampion: false,
        parentIdeaId: "A_v1",
        title: "Amivantamab vs. Osimertinib in EGFR Exon 20+ NSCLC",
        drugName: "amivantamab",
        indication: "NSCLC with EGFR exon 20 insertion mutations",
        strategicGoals: ["expand_label", "accelerate_uptake", "demonstrate_safety"],
        geography: ["US", "EU", "JP", "CN"],
        studyPhase: "II",
        picoData: {
          population: "Treatment-naive patients with NSCLC and confirmed EGFR exon 20 insertion mutations",
          intervention: "Amivantamab (1050mg IV, q3w)",
          comparator: "Osimertinib (80mg daily)",
          outcomes: "PFS, OS, ORR, DOR, CNS efficacy, safety"
        },
        mcdaScores: {
          scientificValidity: 0.82,
          clinicalImpact: 0.88,
          commercialValue: 0.85,
          feasibility: 0.73,
          overall: 0.83
        },
        swotAnalysis: {
          strengths: ["Direct comparison to most relevant competitor", "Includes CNS efficacy assessment", "Robust biomarker analysis"],
          weaknesses: ["More complex patient selection criteria", "Added CNS imaging increases complexity", "Higher per-patient costs"],
          opportunities: ["Definitive positioning vs osimertinib", "Enhanced physician confidence", "Potential premium pricing justification"],
          threats: ["Osimertinib established prescribing patterns", "Upcoming novel agents", "Regulatory hurdles for complex endpoints"]
        },
        feasibilityData: {
          estimatedCost: 5800000,
          timeline: 38,
          projectedROI: 3.5,
          recruitmentRate: 0.60,
          completionRisk: 0.45
        },
        evidenceSources: [],
        overallScore: 0.83,
        scoreChange: null
      };
      
      const ideaD: InsertIdea = {
        ideaId: "D_v2",
        tournamentId: tournament.id,
        laneId: 2,
        round: 2,
        isChampion: false,
        parentIdeaId: "B_v1",
        title: "Amivantamab + Lazertinib Combination Study",
        drugName: "amivantamab",
        indication: "NSCLC with EGFR exon 20 insertion mutations",
        strategicGoals: ["demonstrate_safety", "accelerate_uptake", "expand_label"],
        geography: ["US", "EU", "JP"],
        studyPhase: "II",
        picoData: {
          population: "Treatment-naive and previously treated patients with NSCLC and EGFR exon 20 insertion mutations",
          intervention: "Amivantamab + lazertinib",
          comparator: "Physician's choice (platinum chemotherapy or EGFR TKI)",
          outcomes: "PFS, OS, ORR, safety, CNS efficacy"
        },
        mcdaScores: {
          scientificValidity: 0.84,
          clinicalImpact: 0.82,
          commercialValue: 0.83,
          feasibility: 0.68,
          overall: 0.80
        },
        swotAnalysis: {
          strengths: ["Novel combination approach", "Targets multiple resistance mechanisms", "Strong preclinical rationale"],
          weaknesses: ["Increased complexity with dual therapy", "Drug-drug interaction potential", "Higher cost impact"],
          opportunities: ["First combination approach in this setting", "Potential for enhanced efficacy", "New mechanism targeting"],
          threats: ["Complex regulatory path for combination", "Competing combination approaches", "Added toxicity concerns"]
        },
        feasibilityData: {
          estimatedCost: 6200000,
          timeline: 42,
          projectedROI: 3.0,
          recruitmentRate: 0.55,
          completionRisk: 0.50
        },
        evidenceSources: [],
        overallScore: 0.80,
        scoreChange: null
      };
      
      // Add ideas to storage
      Promise.all([
        this.createIdea(ideaA),
        this.createIdea(ideaB),
        this.createIdea(ideaC),
        this.createIdea(ideaD)
      ]).then(ideas => {
        console.log("Created ideas for tournament:", ideas.length);
        
        // Create reviews for each idea
        const reviewsForA = [
          {
            ideaId: "A_v1",
            agentId: "CLIN",
            score: 0.81,
            strengths: ["Strong clinical rationale", "Clear patient population", "Meaningful endpoints"],
            weaknesses: ["Limited biomarker strategy", "No quality of life measures"],
            additionalMetrics: {
              clinicalRelevance: 0.85,
              novelty: 0.78,
              feasibility: 0.80
            }
          },
          {
            ideaId: "A_v1",
            agentId: "REG",
            score: 0.76,
            strengths: ["Well-defined regulatory pathway", "Endpoints align with prior approvals"],
            weaknesses: ["Limited global regulatory strategy", "Documentation requirements unclear"],
            additionalMetrics: {
              approvability: 0.79,
              timeToApproval: 0.72,
              labelExpansionPotential: 0.77
            }
          }
        ];
        
        const reviewsForB = [
          {
            ideaId: "B_v1",
            agentId: "CLIN",
            score: 0.79,
            strengths: ["Addresses clinical resistance problem", "Feasible comparison"],
            weaknesses: ["Potential for overlapping toxicities", "Limited biomarker analysis"],
            additionalMetrics: {
              clinicalRelevance: 0.82,
              novelty: 0.75,
              feasibility: 0.80
            }
          },
          {
            ideaId: "B_v1",
            agentId: "SAF",
            score: 0.73,
            strengths: ["Clear safety monitoring plan", "Manageable toxicity profile expected"],
            weaknesses: ["Potential for additive toxicities", "Limited risk mitigation strategies"],
            additionalMetrics: {
              safetyProfile: 0.75,
              monitoringFeasibility: 0.72,
              riskMitigation: 0.71
            }
          }
        ];
        
        const reviewsForC = [
          {
            ideaId: "C_v2",
            agentId: "CLIN",
            score: 0.86,
            strengths: ["Direct competitor comparison", "CNS efficacy assessment", "Comprehensive endpoints"],
            weaknesses: ["Complex patient population", "Limited biomarker analysis"],
            additionalMetrics: {
              clinicalRelevance: 0.90,
              novelty: 0.82,
              feasibility: 0.85
            }
          },
          {
            ideaId: "C_v2",
            agentId: "STAT",
            score: 0.83,
            strengths: ["Robust statistical design", "Appropriate power calculations", "Well-defined endpoints"],
            weaknesses: ["Complex stratification factors", "Ambitious effect size assumptions"],
            additionalMetrics: {
              statisticalRobustness: 0.84,
              sampleSizeJustification: 0.81,
              analysisMethodology: 0.85
            }
          }
        ];
        
        const reviewsForD = [
          {
            ideaId: "D_v2",
            agentId: "CLIN",
            score: 0.84,
            strengths: ["Novel combination approach", "Strong scientific rationale", "Addresses resistance mechanisms"],
            weaknesses: ["Complex administration", "Potential for drug interactions"],
            additionalMetrics: {
              clinicalRelevance: 0.85,
              novelty: 0.90,
              feasibility: 0.77
            }
          },
          {
            ideaId: "D_v2",
            agentId: "ETH",
            score: 0.78,
            strengths: ["Addresses patient need", "Reasonable risk-benefit balance"],
            weaknesses: ["Limited patient engagement strategy", "Complex informed consent requirements"],
            additionalMetrics: {
              ethicalConsiderations: 0.80,
              patientBenefit: 0.82,
              inclusivity: 0.75
            }
          }
        ];
        
        // Add all reviews
        const allReviews = [...reviewsForA, ...reviewsForB, ...reviewsForC, ...reviewsForD];
        Promise.all(allReviews.map(review => this.createReview(review))).then(createdReviews => {
          console.log("Created reviews:", createdReviews.length);
          
          // Create tournament rounds
          const round1: InsertTournamentRound = {
            tournamentId: tournament.id,
            roundNumber: 1,
            startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            status: "completed",
            laneUpdates: [
              {
                laneId: 1,
                champion: {
                  ideaId: "A_v1",
                  score: 0.79
                }
              },
              {
                laneId: 2,
                champion: {
                  ideaId: "B_v1",
                  score: 0.77
                }
              }
            ]
          };
          
          const round2: InsertTournamentRound = {
            tournamentId: tournament.id,
            roundNumber: 2,
            startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            completedAt: null,
            status: "in_progress",
            laneUpdates: [
              {
                laneId: 1,
                champion: {
                  ideaId: "A_v1",
                  score: 0.79
                },
                challenger: {
                  ideaId: "C_v2",
                  score: 0.83
                },
                delta: 0.04
              },
              {
                laneId: 2,
                champion: {
                  ideaId: "B_v1",
                  score: 0.77
                },
                challenger: {
                  ideaId: "D_v2",
                  score: 0.80
                },
                delta: 0.03
              }
            ]
          };
          
          Promise.all([
            this.createTournamentRound(round1),
            this.createTournamentRound(round2)
          ]).then(rounds => {
            console.log("Created tournament rounds:", rounds.length);
          });
        });
      });
    });
    
    // Add the sample concept and validation data
    this.createStudyConcept(sampleConcept);
    this.createSynopsisValidation(sampleValidation);
  }
  
  // Research Strategy methods
  async createResearchStrategy(strategy: InsertResearchStrategy): Promise<ResearchStrategy> {
    const id = this.researchStrategyId++;
    const now = new Date().toISOString();
    const researchStrategy: ResearchStrategy = { 
      ...strategy, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.researchStrategies.set(id, researchStrategy);
    return researchStrategy;
  }

  async getResearchStrategy(id: number): Promise<ResearchStrategy | undefined> {
    return this.researchStrategies.get(id);
  }

  async getResearchStrategiesBySession(sessionId: string): Promise<ResearchStrategy[]> {
    return Array.from(this.researchStrategies.values())
      .filter(strategy => strategy.sessionId === sessionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateResearchStrategy(id: number, strategy: Partial<InsertResearchStrategy>): Promise<ResearchStrategy | undefined> {
    const existing = this.researchStrategies.get(id);
    if (!existing) return undefined;
    
    const updated: ResearchStrategy = {
      ...existing,
      ...strategy,
      updatedAt: new Date().toISOString()
    };
    this.researchStrategies.set(id, updated);
    return updated;
  }

  async deleteResearchStrategy(id: number): Promise<boolean> {
    return this.researchStrategies.delete(id);
  }

  // Research Result methods
  async createResearchResult(result: InsertResearchResult): Promise<ResearchResult> {
    const id = this.researchResultId++;
    const researchResult: ResearchResult = { 
      ...result, 
      id,
      executedAt: new Date().toISOString()
    };
    this.researchResults.set(id, researchResult);
    return researchResult;
  }

  async getResearchResult(id: number): Promise<ResearchResult | undefined> {
    return this.researchResults.get(id);
  }

  async getResearchResultsByStrategy(strategyId: number): Promise<ResearchResult[]> {
    return Array.from(this.researchResults.values())
      .filter(result => result.strategyId === strategyId)
      .sort((a, b) => result.priority - result.priority);
  }

  async deleteResearchResult(id: number): Promise<boolean> {
    return this.researchResults.delete(id);
  }
}

export const storage = new MemStorage();
