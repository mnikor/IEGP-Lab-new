import OpenAI from "openai";
import { InsertIdea, NewTournamentRequest } from "@shared/tournament";
import { perplexityWebSearch } from "./perplexity";
import { calculateFeasibility } from "./feasibilityCalculator";
import { generateJJBusinessPrompt } from "./jjBusinessIntelligence";

const llmEnabled = process.env.PORTFOLIO_SUMMARY_USE_LLM === "true";
const openai = llmEnabled && process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Generates seed ideas for a tournament using the GPT-4.1 model
 * 
 * @param tournamentData The tournament request data
 * @param tournamentId The ID of the created tournament
 * @param numIdeas The number of seed ideas to generate (default: 5)
 * @returns Array of seed ideas
 */
export async function generateSeedIdeas(
  tournamentData: NewTournamentRequest, 
  tournamentId: number,
  numIdeas: number = 5
): Promise<InsertIdea[]> {
  if (!openai) {
    console.warn("Seed idea generation: LLM disabled, using deterministic concepts");
    const rawComparatorDrugs = (tournamentData as any)?.comparatorDrugs;
    const comparatorList = Array.isArray(rawComparatorDrugs) && rawComparatorDrugs.length
      ? rawComparatorDrugs
      : ["Standard of Care"];
    const targetSubpopulation = (tournamentData as any)?.targetSubpopulation || null;
    const geographyList = Array.isArray(tournamentData.geography) && tournamentData.geography.length
      ? tournamentData.geography
      : ["US", "EU"];

    const fallbackConcepts = Array.from({ length: numIdeas }).map((_, index) => ({
      title: `${tournamentData.drugName} Concept ${index + 1}`,
      drugName: tournamentData.drugName,
      indication: tournamentData.indication,
      strategicGoals: tournamentData.strategicGoals.map(goal => goal.goal),
      geography: geographyList,
      studyPhase: tournamentData.studyPhasePref,
      targetSubpopulation,
      comparatorDrugs: comparatorList,
      knowledgeGapAddressed: "Deterministic fallback concept derived from user inputs.",
      innovationJustification: "Uses provided strategic goals to focus on feasible execution.",
      picoData: {
        population: `Adults with ${tournamentData.indication}`,
        intervention: tournamentData.drugName,
        comparator: comparatorList[0] || "Standard of Care",
        outcomes: "Efficacy and safety endpoints"
      },
      mcdaScores: {
        scientificValidity: 3.4,
        clinicalImpact: 3.3,
        commercialValue: 3.1,
        feasibility: 3.5,
        overall: 3.3
      },
      swotAnalysis: {
        strengths: ["Aligns with strategic goals", "Feasible multi-region execution"],
        weaknesses: ["Derived without LLM insights"],
        opportunities: ["Establishes presence in key geographies"],
        threats: ["Competitive programs may advance faster"]
      },
      feasibilityData: {}
    }));

    const ideas: InsertIdea[] = await Promise.all(fallbackConcepts.map(async (concept: any, index: number) => {
      const laneId = index;
      const ideaId = `${String.fromCharCode(65 + laneId)}_v1`;

      const requestData = {
        drugName: tournamentData.drugName,
        indication: tournamentData.indication,
        strategicGoals: concept.strategicGoals,
        geography: concept.geography,
        studyPhasePref: concept.studyPhase,
        targetSubpopulation: concept.targetSubpopulation,
        comparatorDrugs: concept.comparatorDrugs,
        budgetCeilingEur: tournamentData.budgetCeilingEur || undefined,
        timelineCeilingMonths: tournamentData.timelineCeilingMonths || undefined,
        globalLoeDate: tournamentData.globalLoeDate || undefined
      };

      const calculatedFeasibilityData = await calculateFeasibility(concept, requestData);
      const correctedPicoData = {
        ...concept.picoData,
        population: updatePicoPopulationWithSampleSize(
          concept.picoData.population,
          calculatedFeasibilityData.sampleSize,
          concept.indication,
          concept.targetSubpopulation
        )
      };

      return {
        ideaId,
        tournamentId,
        laneId,
        round: 0,
        isChampion: true,
        title: concept.title,
        drugName: concept.drugName,
        indication: concept.indication,
        strategicGoals: concept.strategicGoals,
        geography: concept.geography,
        studyPhase: concept.studyPhase,
        targetSubpopulation: concept.targetSubpopulation || null,
        comparatorDrugs: concept.comparatorDrugs || [],
        knowledgeGapAddressed: concept.knowledgeGapAddressed,
        innovationJustification: concept.innovationJustification,
        picoData: correctedPicoData,
        mcdaScores: concept.mcdaScores,
        swotAnalysis: concept.swotAnalysis,
        feasibilityData: {
          ...calculatedFeasibilityData,
          pivotalFollowOnPlan: (calculatedFeasibilityData as any)?.pivotalFollowOnPlan || "Define follow-on pivotal evidence once primary endpoints met."
        },
        evidenceSources: [],
        overallScore: 0,
        scoreChange: null,
      } as InsertIdea;
    }));

    return ideas;
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable not found");
    }

    // Create search query from tournament data
    const strategicGoalsFocus = tournamentData.strategicGoals.map(goal => goal.goal.replace('_', ' ')).join(' and ');
    const isOncology = (tournamentData.indication || '').toLowerCase().includes('cancer') || 
                      (tournamentData.indication || '').toLowerCase().includes('oncol') ||
                      (tournamentData.indication || '').toLowerCase().includes('tumor');
    
    const searchQuery = `Provide the latest clinical evidence for ${tournamentData.drugName} in ${tournamentData.indication} focusing on ${strategicGoalsFocus}. 
    Include details about: 
    1. Optimal study design (Phase ${tournamentData.studyPhasePref}) 
    2. Typical patient populations and sample sizes 
    3. Common comparators used in similar studies
    4. Standard endpoints and outcomes
    5. Average costs and durations for similar trials${isOncology ? ' in oncology' : ''}
    6. Common inclusion/exclusion criteria 
    7. Geographic patterns/differences in conducting these trials`;
    
    // Perform web search using Perplexity API
    const searchResults = await perplexityWebSearch(searchQuery, [
      "pubmed.ncbi.nlm.nih.gov",
      "clinicaltrials.gov",
      "fda.gov",
      "ema.europa.eu",
      "nejm.org",
      "thelancet.com",
      "jamanetwork.com"
    ]);

    // Build the prompt for generating seed ideas
    const prompt = buildSeedIdeaPrompt(tournamentData, searchResults, numIdeas);

    // Generate seed ideas using OpenAI
    const response = await openai!.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { 
          role: "system", 
          content: `You are a clinical study concept generator. Generate evidence-based clinical study concepts based on the provided drug, indication, and strategic goals. Each concept should be scientifically rigorous, clinically relevant, and commercially viable.` 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 1.0, // Higher temperature for more diverse seed ideas
    });

    // Parse the response
    const result = JSON.parse(response.choices[0].message.content || "{}");
    let concepts = result.concepts || [];
    
    // Ensure we have the requested number of ideas
    if (concepts.length < numIdeas) {
      console.warn(`Only ${concepts.length} seed ideas generated, expected ${numIdeas}`);
    }

    // Transform concepts into InsertIdea objects with proper feasibility calculations
    const ideas: InsertIdea[] = await Promise.all(concepts.map(async (concept: any, index: number) => {
      const laneId = index;
      const ideaId = `${String.fromCharCode(65 + laneId)}_v1`; // A_v1, B_v1, etc.
      
      // Calculate proper feasibility data with sample size for each concept
      // Convert tournament strategic goals format to concept format
      const requestData = {
        drugName: tournamentData.drugName,
        indication: tournamentData.indication,
        strategicGoals: concept.strategicGoals,
        geography: concept.geography,
        studyPhasePref: concept.studyPhase,
        targetSubpopulation: concept.targetSubpopulation,
        comparatorDrugs: concept.comparatorDrugs,
        budgetCeilingEur: tournamentData.budgetCeilingEur || undefined,
        timelineCeilingMonths: tournamentData.timelineCeilingMonths || undefined,
        globalLoeDate: tournamentData.globalLoeDate || undefined
      };
      const calculatedFeasibilityData = await calculateFeasibility(concept, requestData);
      
      // Merge AI-generated feasibility data with calculated values, prioritizing calculated values
      const finalFeasibilityData = {
        ...concept.feasibilityData,
        ...calculatedFeasibilityData,
        // Ensure sample size and justification are always from calculations
        sampleSize: calculatedFeasibilityData.sampleSize,
        sampleSizeJustification: calculatedFeasibilityData.sampleSizeJustification,
        numberOfSites: calculatedFeasibilityData.numberOfSites,
        numberOfCountries: calculatedFeasibilityData.numberOfCountries,
        // Keep cost and timeline from calculations for consistency
        estimatedCost: calculatedFeasibilityData.estimatedCost,
        timeline: calculatedFeasibilityData.timeline
      };
      
      // Fix PICO population field to reflect actual calculated sample size
      const correctedPicoData = {
        ...concept.picoData,
        population: updatePicoPopulationWithSampleSize(
          concept.picoData.population, 
          calculatedFeasibilityData.sampleSize,
          concept.indication,
          concept.targetSubpopulation
        )
      };
      
      return {
        ideaId,
        tournamentId,
        laneId,
        round: 0, // Seed ideas are round 0
        isChampion: true, // All seed ideas start as champions
        
        title: concept.title,
        drugName: concept.drugName,
        indication: concept.indication,
        strategicGoals: concept.strategicGoals,
        geography: concept.geography,
        studyPhase: concept.studyPhase,
        targetSubpopulation: concept.targetSubpopulation || null,
        comparatorDrugs: concept.comparatorDrugs || [],
        knowledgeGapAddressed: concept.knowledgeGapAddressed || null,
        innovationJustification: concept.innovationJustification || null,
        
        picoData: correctedPicoData,
        mcdaScores: concept.mcdaScores,
        swotAnalysis: concept.swotAnalysis,
        feasibilityData: finalFeasibilityData,
        evidenceSources: concept.evidenceSources,
        
        overallScore: 0, // Will be calculated after review
        scoreChange: null,
      };
    }));

    return ideas;
  } catch (error) {
    console.error("Error generating seed ideas:", error);
    throw error;
  }
}

/**
 * Updates PICO population field to include actual calculated sample size
 */
function updatePicoPopulationWithSampleSize(
  originalPopulation: string,
  calculatedSampleSize: number,
  indication: string,
  targetSubpopulation?: string
): string {
  // Remove any existing patient numbers that might conflict
  let cleanedPopulation = originalPopulation
    .replace(/\b\d{3,4}\s+(?:patients?|subjects?|adults?|participants?)\b/gi, '')
    .replace(/\bn\s*=\s*\d{3,4}\b/gi, '')
    .replace(/\btotal\s+of\s+\d{3,4}\b/gi, '')
    .replace(/\bapproximately\s+\d{3,4}\b/gi, '')
    .trim();
  
  // Clean up any double spaces or formatting issues
  cleanedPopulation = cleanedPopulation.replace(/\s+/g, ' ').trim();
  
  // Add the correct sample size at the beginning for clarity
  const sampleSizeText = `n=${calculatedSampleSize} patients with ${indication}${targetSubpopulation ? ` (${targetSubpopulation})` : ''}`;
  
  // If the cleaned population is very short or generic, enhance it
  if (cleanedPopulation.length < 30) {
    return `${sampleSizeText}, meeting study inclusion criteria`;
  }
  
  // Otherwise, prepend the sample size to the existing description
  return `${sampleSizeText}. ${cleanedPopulation}`;
}

// Helper function to determine therapeutic area from indication
function getTherapeuticAreaFromIndication(indication: string): string {
  const lowerIndication = indication.toLowerCase();
  if (lowerIndication.includes('cancer') || lowerIndication.includes('tumor') || lowerIndication.includes('oncol') || 
      lowerIndication.includes('carcinoma') || lowerIndication.includes('sarcoma') || lowerIndication.includes('leukemia') ||
      lowerIndication.includes('lymphoma') || lowerIndication.includes('prostate') || lowerIndication.includes('nsclc') ||
      lowerIndication.includes('colorectal') || lowerIndication.includes('crc')) {
    return 'oncology';
  }
  if (lowerIndication.includes('psoriasis') || lowerIndication.includes('arthritis') || lowerIndication.includes('crohn') ||
      lowerIndication.includes('colitis') || lowerIndication.includes('immunology') || lowerIndication.includes('autoimmune')) {
    return 'immunology';
  }
  return 'general';
}

/**
 * Builds a prompt for seed idea generation
 */
function buildSeedIdeaPrompt(
  data: NewTournamentRequest, 
  searchResults: { content: string; citations: string[] },
  numIdeas: number
): string {
  const strategicGoalsText = data.strategicGoals.map(goalObj => {
    return `${goalObj.goal.replace('_', ' ')} (weight: ${goalObj.weight})`;
  }).join(', ');

  // Generate J&J business intelligence guidance
  const therapeuticArea = getTherapeuticAreaFromIndication(data.indication);
  const jjBusinessPrompt = generateJJBusinessPrompt(therapeuticArea, data.drugName);

  const intentGuidance = `Strategic interpretation hints:
  - "accelerate uptake": consider pragmatic, head-to-head, or RWE/registry designs that shorten adoption lag or differentiate versus incumbents.
  - "defend market share": evaluate comparator or switch-prevention trials, RWE retention programs, or new population unlocks that sustain share.
  - "generate real world evidence": prioritise observational/pragmatic or hybrid designs that create post-launch evidence and inform practice.
  - "facilitate market access": favour designs demonstrating payer-relevant outcomes, budget impact, or localized effectiveness.
  - "expand label" / "secure initial approval": focus on pivotal or confirmatory interventional studies unlocking new indications or patient segments.
  Provide a short reason for the selected design intent.`;

  return `
  ${jjBusinessPrompt}
  
  Based on the following parameters and evidence, generate ${numIdeas} distinct clinical study concepts for ${data.drugName} in ${data.indication}.

  # Parameters:
  - Drug: ${data.drugName}
  - Indication: ${data.indication}
  - Strategic Goals: ${strategicGoalsText}
  - Geography: ${data.geography.join(', ')}
  - Study Phase Preference: ${data.studyPhasePref}

  # Evidence from Literature:
  ${searchResults.content}
  
  ${intentGuidance}

  ## CRITICAL INSTRUCTIONS:
  1. FIRST, analyze the evidence to identify what is ALREADY KNOWN about ${data.drugName} in ${data.indication}.
  2. SECOND, identify critical KNOWLEDGE GAPS that align with the strategic goals.
  3. THIRD, design NOVEL study concepts that address these gaps and advance the strategic goals, rather than replicating existing studies.
  
  ## Design Requirements:
  1. Create truly innovative studies that build upon existing evidence rather than duplicating what's already been done.
  2. For Phase III oncology studies, ensure cost estimates accurately reflect the high expense (typically €30-100M range).
  3. When EU is specified as a geography, your design should include multiple European countries (8-12 countries).
  4. Sample sizes should align with typical values for the specified phase and indication.
  5. Each concept should clearly explain WHY this approach is novel and how it addresses a specific gap in current knowledge.
  
  Respond with a JSON object in this format:
  {
    "concepts": [
      {
        "title": "A descriptive title for the study",
        "drugName": "The drug name from the parameters",
        "indication": "The indication from the parameters",
        "strategicGoals": ["Array of strategic goals from the parameters"],
        "geography": ["Array of geography codes"],
        "studyPhase": "A recommended study phase (I, II, III, IV, or any)",
        "targetSubpopulation": "The target subpopulation (use the provided value or suggest one)",
        "comparatorDrugs": ["Array of comparator drugs (use the provided values or suggest appropriate ones)"],
        "knowledgeGapAddressed": "Detailed explanation of the specific knowledge gap this study addresses based on current evidence",
        "innovationJustification": "Explanation of why this study design is novel and how it advances the strategic goal",
        "picoData": {
          "population": "Detailed description of the study population",
          "intervention": "Detailed description of the intervention",
          "comparator": "Detailed description of the comparator",
          "outcomes": "Detailed description of the outcomes"
        },
        "mcdaScores": {
          "scientificValidity": 3.5,
          "clinicalImpact": 4.0,
          "commercialValue": 3.8,
          "feasibility": 3.2,
          "overall": 3.6
        },
        "swotAnalysis": {
          "strengths": ["Strength 1", "Strength 2"],
          "weaknesses": ["Weakness 1", "Weakness 2"],
          "opportunities": ["Opportunity 1", "Opportunity 2"],
          "threats": ["Threat 1", "Threat 2"]
        },
        "feasibilityData": {
          "estimatedCost": 2000000,
          "timeline": 24,
          "projectedROI": 2.5,
          "recruitmentRate": 0.7,
          "completionRisk": 0.3
        },
        "evidenceSources": [
          {
            "title": "Source title",
            "authors": "Optional authors",
            "publication": "Optional publication name",
            "year": 2023,
            "citation": "Full citation string"
          }
        ]
      }
      // Generate ${numIdeas} total concepts
    ]
  }
  
  Ensure each concept is distinct, evidence-based, and aligned with the strategic goals. The concepts should be feasible given the parameters. Include appropriate mcdaScores and feasibilityData values that reflect realistic projections.`;
}