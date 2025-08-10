import { TherapeuticArea } from '@shared/schema';

export interface JJDrugInfo {
  name: string;
  indication: string[];
  mechanism: string;
  developmentStage: string;
  strategicPriority: 'high' | 'medium' | 'low';
  combinationOpportunities: string[];
  competitorAlternatives: string[];
}

export interface JJBusinessGuidance {
  preferredDrugs: JJDrugInfo[];
  avoidCompetitors: string[];
  strategicPriorities: string[];
  portfolioSynergies: string[];
}

// J&J Portfolio and Business Intelligence
export const JJ_PORTFOLIO: Record<string, JJDrugInfo[]> = {
  oncology: [
    {
      name: "amivantamab",
      indication: ["NSCLC", "colorectal cancer", "EGFR-mutated tumors"],
      mechanism: "EGFR-MET bispecific antibody",
      developmentStage: "approved/expanding",
      strategicPriority: "high",
      combinationOpportunities: ["chemotherapy", "targeted therapy", "immunotherapy"],
      competitorAlternatives: ["cetuximab", "panitumumab", "osimertinib"]
    },
    {
      name: "apalutamide",
      indication: ["prostate cancer", "mCSPC", "nmCRPC"],
      mechanism: "AR antagonist",
      developmentStage: "approved",
      strategicPriority: "high",
      combinationOpportunities: ["ADT", "chemotherapy", "PARP inhibitors"],
      competitorAlternatives: ["enzalutamide", "darolutamide", "abiraterone"]
    },
    {
      name: "pasritamig",
      indication: ["mCRPC", "prostate cancer"],
      mechanism: "KLK2-targeted ADC",
      developmentStage: "clinical development",
      strategicPriority: "high",
      combinationOpportunities: ["apalutamide", "ADT", "chemotherapy"],
      competitorAlternatives: ["enzalutamide combinations", "lutetium combinations"]
    },
    {
      name: "rucaparib",
      indication: ["ovarian cancer", "prostate cancer", "BRCA-mutated tumors"],
      mechanism: "PARP inhibitor",
      developmentStage: "approved",
      strategicPriority: "medium",
      combinationOpportunities: ["chemotherapy", "immunotherapy", "AR inhibitors"],
      competitorAlternatives: ["olaparib", "niraparib", "talazoparib"]
    }
  ],
  immunology: [
    {
      name: "guselkumab",
      indication: ["psoriasis", "psoriatic arthritis", "Crohn's disease"],
      mechanism: "IL-23 inhibitor",
      developmentStage: "approved/expanding",
      strategicPriority: "high",
      combinationOpportunities: ["methotrexate", "conventional DMARDs"],
      competitorAlternatives: ["adalimumab", "ustekinumab", "secukinumab"]
    },
    {
      name: "tremfya",
      indication: ["psoriasis", "psoriatic arthritis"],
      mechanism: "IL-23 inhibitor",
      developmentStage: "approved",
      strategicPriority: "high",
      combinationOpportunities: ["topical therapies", "phototherapy"],
      competitorAlternatives: ["humira", "cosentyx", "skyrizi"]
    }
  ]
};

export const JJ_COMPETITORS_TO_AVOID = [
  // Oncology competitors
  "enzalutamide", "darolutamide", "abiraterone", "cetuximab", "panitumumab", 
  "osimertinib", "olaparib", "niraparib", "talazoparib",
  // Immunology competitors  
  "adalimumab", "humira", "ustekinumab", "secukinumab", "cosentyx", "skyrizi",
  // General competitors
  "pfizer", "roche", "novartis", "merck", "bristol myers squibb", "abbvie"
];

export const JJ_STRATEGIC_PRIORITIES = [
  "Leverage existing J&J portfolio synergies",
  "Prioritize combination opportunities with J&J drugs",
  "Focus on differentiation from competitor approaches",
  "Maximize lifecycle management of approved J&J assets",
  "Support regulatory pathways that favor J&J portfolio",
  "Consider manufacturing and supply chain advantages",
  "Align with J&J's therapeutic area expertise and infrastructure"
];

export function getJJBusinessGuidance(therapeuticArea: string, drugName?: string): JJBusinessGuidance {
  const areaPortfolio = JJ_PORTFOLIO[therapeuticArea.toLowerCase()] || [];
  
  const guidance: JJBusinessGuidance = {
    preferredDrugs: areaPortfolio,
    avoidCompetitors: JJ_COMPETITORS_TO_AVOID,
    strategicPriorities: JJ_STRATEGIC_PRIORITIES,
    portfolioSynergies: []
  };

  // Add specific synergies based on drug
  if (drugName) {
    const drug = areaPortfolio.find(d => d.name.toLowerCase().includes(drugName.toLowerCase()));
    if (drug) {
      guidance.portfolioSynergies = drug.combinationOpportunities;
    }
  }

  return guidance;
}

export function generateJJBusinessPrompt(therapeuticArea: string, drugName?: string): string {
  const guidance = getJJBusinessGuidance(therapeuticArea, drugName);
  
  return `
CRITICAL BUSINESS REQUIREMENT - J&J PORTFOLIO PRIORITIZATION:

You are designing clinical studies for Johnson & Johnson. Always prioritize J&J's business interests and portfolio:

PREFERRED J&J DRUGS TO RECOMMEND:
${guidance.preferredDrugs.map(drug => 
  `• ${drug.name}: ${drug.mechanism} (${drug.indication.join(', ')}) - Strategic Priority: ${drug.strategicPriority}`
).join('\n')}

AVOID THESE COMPETITORS:
${guidance.avoidCompetitors.join(', ')}

STRATEGIC PRIORITIES:
${guidance.strategicPriorities.map(priority => `• ${priority}`).join('\n')}

COMBINATION STRATEGY:
- When suggesting combinations, ALWAYS prefer J&J drugs over competitors
- For example: prefer apalutamide over enzalutamide for prostate cancer combinations
- Consider J&J portfolio synergies and cross-selling opportunities
- Factor in J&J's manufacturing capabilities and regulatory relationships

BUSINESS IMPACT CONSIDERATIONS:
- Maximize lifecycle value of existing J&J assets
- Support regulatory differentiation from competitor approaches  
- Consider commercial advantages (pricing, market access, physician relationships)
- Align with J&J's therapeutic area centers of excellence
`;
}