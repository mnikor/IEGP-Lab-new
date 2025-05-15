import { users, type User, type InsertUser, studyConcepts, synopsisValidations, type StudyConcept, type InsertStudyConcept, type SynopsisValidation, type InsertSynopsisValidation } from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private concepts: Map<number, StudyConcept>;
  private validations: Map<number, SynopsisValidation>;
  private tournaments: Map<number, Tournament>;
  private ideas: Map<string, Idea>;
  private reviews: Map<number, Review>;
  private tournamentRounds: Map<number, TournamentRound>;
  
  private userId: number;
  private conceptId: number;
  private validationId: number;
  private tournamentId: number;
  private reviewId: number;
  private tournamentRoundId: number;

  constructor() {
    this.users = new Map();
    this.concepts = new Map();
    this.validations = new Map();
    this.tournaments = new Map();
    this.ideas = new Map();
    this.reviews = new Map();
    this.tournamentRounds = new Map();
    
    this.userId = 1;
    this.conceptId = 1;
    this.validationId = 1;
    this.tournamentId = 1;
    this.reviewId = 1;
    this.tournamentRoundId = 1;
    
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
      feasibilityData: {
        estimatedCost: 4200000,
        timeline: 32,
        projectedROI: 3.8,
        recruitmentRate: 0.65,
        completionRisk: 0.35,
        timeToLoe: 84, // 7 years from data readout
        globalLoeDate: "2032-06-15", // Set a fixed LOE date as a sample
        estimatedFpiDate: "2025-06-15", // Set a sample FPI date
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
        postLoeValue: 0.25 // 25% value retention after LOE
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
    
    // Add the sample data
    this.createStudyConcept(sampleConcept);
    this.createSynopsisValidation(sampleValidation);
  }
}

export const storage = new MemStorage();
