import OpenAI from "openai";
import { GenerateConceptRequest, StudyConcept } from "@shared/schema";
import { PicoData } from "@/lib/types";

// Use gpt-4.1 model as specified by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analyzes search results and generates study concepts or validation results
 * 
 * @param searchResults The results from the Perplexity search
 * @param data Request data containing study parameters
 * @param isValidation Whether this is a validation request (true) or concept generation (false)
 * @returns Generated concepts or validation results
 */
export async function analyzeWithOpenAI(
  searchResults: { content: string; citations: string[] },
  data: any,
  isValidation: boolean = false
): Promise<any> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable not found");
    }

    const systemPrompt = isValidation
      ? `You are a clinical study protocol validator. Analyze the provided study synopsis against current evidence and identify areas for improvement. Provide detailed, evidence-based feedback.`
      : `You are a clinical study concept generator. Generate evidence-based clinical study concepts based on the provided drug, indication, and strategic goal. Each concept should be scientifically rigorous, clinically relevant, and commercially viable.`;

    const userPrompt = isValidation
      ? buildValidationPrompt(data, searchResults)
      : buildConceptGenerationPrompt(data, searchResults);

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    // Parse the JSON response carefully
    let result;
    try {
      result = JSON.parse(response.choices[0].message.content || "{}");
      console.log("OpenAI result type:", typeof result, Array.isArray(result) ? "array" : "not an array");
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      result = isValidation ? {} : [];
    }

    // Process evidence sources with citations
    if (!isValidation) {
      // For concept generation, ensure we have an array
      if (!Array.isArray(result)) {
        console.log("Converting non-array result to array");
        // If it's an object with a concepts property that's an array, use that
        if (result.concepts && Array.isArray(result.concepts)) {
          result = result.concepts;
        } else if (result.studyConcepts && Array.isArray(result.studyConcepts)) {
          // Some models output studyConcepts array
          result = result.studyConcepts;
        } else {
          // Otherwise, wrap it in an array if it's an object with expected properties
          if (typeof result === 'object' && result !== null && result.title) {
            result = [result];
          } else {
            // Create a default concept if empty or invalid response
            console.log("Creating default concept as response is invalid");
            result = [{
              title: `${data.drugName} for ${data.indication} - Feasibility Study`,
              drugName: data.drugName,
              indication: data.indication,
              strategicGoals: data.strategicGoals,
              geography: data.geography,
              studyPhase: data.studyPhasePref,
              picoData: {
                population: `Patients with ${data.indication}`,
                intervention: data.drugName,
                comparator: data.comparatorDrugs?.[0] || "Placebo",
                outcomes: "Safety and efficacy"
              },
              mcdaScores: {
                scientificValidity: 3.5,
                clinicalImpact: 3.5,
                commercialValue: 3.5,
                feasibility: 3.5,
                overall: 3.5
              },
              swotAnalysis: {
                strengths: ["Based on user provided parameters"],
                weaknesses: ["Limited evidence analysis"],
                opportunities: ["Address unmet needs in this indication"],
                threats: ["Competitive landscape evolving rapidly"]
              },
              feasibilityData: {
                estimatedCost: 2000000,
                timeline: 24,
                projectedROI: 2.5,
                recruitmentRate: 0.7,
                completionRisk: 0.3
              },
              evidenceSources: []
            }];
          }
        }
      }
      
      // Now we know result is an array
      result.forEach((concept: any) => {
        if (!concept.evidenceSources || !Array.isArray(concept.evidenceSources)) {
          concept.evidenceSources = [];
        }
        
        concept.evidenceSources = concept.evidenceSources.map((source: any, index: number) => {
          return {
            ...source,
            citation: source.citation || `${source.title || 'Unknown'}${source.authors ? `, ${source.authors}` : ""}${source.publication ? `. ${source.publication}` : ""}${source.year ? ` (${source.year})` : ""}`,
            url: searchResults.citations[index] || source.url || ""
          };
        });
      });
    }

    return result;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error;
  }
}

/**
 * Extracts PICO framework from uploaded document text
 * 
 * @param text The text content of the uploaded document
 * @returns Extracted PICO framework
 */
export async function extractPicoFromText(text: string): Promise<PicoData> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable not found");
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "You are a clinical research expert specializing in extracting PICO framework elements from study protocols and synopses. Extract the Population, Intervention, Comparator, and Outcomes from the provided document text."
        },
        {
          role: "user",
          content: `Extract the PICO framework from the following clinical study document text. Respond in JSON format with 'population', 'intervention', 'comparator', and 'outcomes' fields. Be as detailed and accurate as possible.\n\n${text.substring(0, 15000)}` // Limit text length to avoid token limits
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      population: result.population || "Not specified",
      intervention: result.intervention || "Not specified",
      comparator: result.comparator || "Not specified",
      outcomes: result.outcomes || "Not specified"
    };
  } catch (error) {
    console.error("Error extracting PICO from text:", error);
    throw error;
  }
}

/**
 * Builds a prompt for concept generation
 */
function buildConceptGenerationPrompt(data: GenerateConceptRequest, searchResults: { content: string; citations: string[] }): string {
  const numberOfConcepts = data.numberOfConcepts || 3;
  return `
  Based on the following parameters and evidence, generate ${numberOfConcepts} distinct clinical study concepts for ${data.drugName} in ${data.indication}.

  # Parameters:
  - Drug: ${data.drugName}
  - Indication: ${data.indication}
  - Strategic Goals: ${data.strategicGoals.map(goal => goal.replace('_', ' ')).join(', ')}
  - Geography: ${data.geography.join(', ')}
  - Study Phase Preference: ${data.studyPhasePref}
  - Target Subpopulation: ${data.targetSubpopulation || 'Not specified'}
  - Comparator Drugs: ${data.comparatorDrugs?.join(', ') || 'Not specified'}
  - Budget Ceiling (EUR): ${data.budgetCeilingEur || 'Not specified'}
  - Timeline Ceiling (Months): ${data.timelineCeilingMonths || 'Not specified'}
  - Sales Impact Threshold: ${data.salesImpactThreshold || 'Not specified'}

  # Evidence from Literature:
  ${searchResults.content}
  
  ## CRITICAL INSTRUCTIONS:
  1. FIRST, analyze the evidence to identify what is ALREADY KNOWN about ${data.drugName} in ${data.indication}.
  2. SECOND, identify critical KNOWLEDGE GAPS that align with the strategic goals "${data.strategicGoals.map(goal => goal.replace('_', ' ')).join(', ')}".
  3. THIRD, design NOVEL study concepts that address these gaps and advance the strategic goal, rather than replicating existing studies.
  
  ## Design Requirements:
  1. Create truly innovative studies that build upon existing evidence rather than duplicating what's already been done.
  2. For Phase III oncology studies, ensure cost estimates accurately reflect the high expense (typically €30-100M range).
  3. When EU is specified as a geography, your design should include multiple European countries (8-12 countries).
  4. Sample sizes should align with typical values for the specified phase and indication.
  5. Each concept should clearly explain WHY this approach is novel and how it addresses a specific gap in current knowledge.
  
  ## Example Reasoning Process:
  - "Current evidence shows drug X has been studied in combination with Y for indication Z."
  - "However, there's limited data on its efficacy in specific subpopulations with biomarker W."
  - "Given the strategic goal is to expand label, a study targeting this subpopulation would address this knowledge gap."
  
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
      // Additional concepts (generate 3 total)
    ]
  }

  Ensure each concept is distinct, evidence-based, and aligned with the strategic goal. The concepts should be feasible given the parameters. Include appropriate mcdaScores and feasibilityData values that reflect realistic projections.`;
}

/**
 * Builds a prompt for synopsis validation
 */
function buildValidationPrompt(data: any, searchResults: { content: string; citations: string[] }): string {
  return `
  Analyze the provided clinical study synopsis and provide comprehensive, evidence-based validation feedback. USE ALL SEARCH RESULTS FROM MULTIPLE ROUNDS to ensure a thorough analysis.

  # Study Parameters:
  - Drug: ${data.drugName}
  - Indication: ${data.indication}
  - Strategic Goals: ${data.strategicGoals.map((goal: string) => goal.replace('_', ' ')).join(', ')}

  # Document Text:
  ${data.documentText.substring(0, 10000)}

  # Extracted PICO Framework:
  - Population: ${data.extractedPico.population}
  - Intervention: ${data.extractedPico.intervention}
  - Comparator: ${data.extractedPico.comparator}
  - Outcomes: ${data.extractedPico.outcomes}

  # Current Evidence from Multiple Search Rounds:
  ${searchResults.content}

  ## Citations:
  ${searchResults.citations.map((citation, index) => `${index + 1}. ${citation}`).join('\n')}

  ## CRITICAL ANALYSIS INSTRUCTIONS:
  1. FIRST, thoroughly analyze ALL search rounds, with particular focus on:
     - Competitive landscape: Clearly identify current standard of care, direct competitors, emerging alternatives, and key differentiators
     - Comparative efficacy and safety data between the drug and alternatives
     - Current regulatory approval status and indications
     - Competitive landscape and standard of care
     - Recent clinical trials and emerging evidence
  2. SECOND, identify any critical discrepancies between the synopsis and current evidence
  3. THIRD, ensure validation leverages ALL available evidence, especially regulatory status

  ## Validation Guidelines:
  1. Assess the study's METHODOLOGICAL RIGOR using evidence-based criteria
  2. Evaluate the SCIENTIFIC VALIDITY and CLINICAL RELEVANCE of the proposed outcomes
  3. Analyze the FEASIBILITY of the study design and recruitment strategy
  4. Determine if the study ALIGNS with the strategic goals of "${data.strategicGoals.map((goal: string) => goal.replace('_', ' ')).join(', ')}"
  5. Provide detailed ECONOMIC ANALYSIS with cost projections, timeline estimates, and ROI calculations
  6. Perform a comprehensive SWOT ANALYSIS based on the current evidence
  7. Calculate MCDA SCORES to provide an objective assessment of the study's quality
  8. Identify potential SAMPLE SIZE issues and provide recommendations
  9. Evaluate the proposed TIMELINE for realism and suggest optimizations
  10. Verify if the study population aligns with REGULATORY APPROVALS
  11. Check if the design considers the COMPETITIVE LANDSCAPE appropriately

  Respond with a JSON object containing:
  1. "title": A descriptive title for this validation report
  2. "extractedPico": The PICO framework that was extracted (confirm or refine it)
  3. "benchmarkDeltas": Array of objects comparing current vs. suggested changes, each with "aspect", "current", "suggested", and "impact" ("positive", "negative", or "neutral") fields
  4. "riskFlags": Array of identified risks, each with "category", "description", "severity" ("high", "medium", "low"), and "mitigation" fields
  5. "revisedEconomics": Object with "originalCost" (if found, otherwise null), "revisedCost", "originalTimeline" (if found, otherwise null), "revisedTimeline", "originalROI" (if found, otherwise null), "revisedROI", and "notes" fields
  6. "swotAnalysis": Object with "strengths", "weaknesses", "opportunities", and "threats" arrays
  7. "mcdaScores": Object with "scientificValidity", "clinicalImpact", "commercialValue", "feasibility", and "overall" numeric scores (1-5 scale)
  8. "feasibilityData": Object containing detailed feasibility metrics similar to the concept generation output, including:
     - "sampleSize": Recommended sample size (number)
     - "sampleSizeJustification": Text explaining the sample size recommendation
     - "numberOfSites": Recommended number of sites (number)
     - "numberOfCountries": Recommended number of countries (number)
     - "recruitmentPeriodMonths": Expected recruitment period in months (number)
     - "followUpPeriodMonths": Expected follow-up period in months (number)
     - "dropoutRate": Expected dropout rate (number between 0-1)
     - "complexityFactor": Study complexity factor (number between 0-1)
     - "estimatedCost": Total estimated cost (number)
     - "costBreakdown": Object with various cost components
     - "timeline": Total timeline in months (number)
     - "projectedROI": Projected return on investment as a multiple (number)
     - "recruitmentRate": Expected recruitment rate (number between 0-1)
     - "completionRisk": Risk of non-completion (number between 0-1)
  9. "currentEvidence": Object with:
     - "summary": Concise summary of the current evidence
     - "regulatoryStatus": Detailed information about current regulatory approvals
     - "competitiveLandscape": {
        "currentStandardOfCare": "Detailed analysis of current standard of care treatments",
        "directCompetitors": [
          {
            "name": "Name of competing treatment",
            "mechanismOfAction": "Mechanism of action",
            "approvalStatus": "Approval status in relevant regions",
            "efficacyComparison": "Comparative efficacy data vs. the study drug",
            "safetyComparison": "Comparative safety profile vs. the study drug",
            "marketPosition": "Current market position and adoption"
          }
        ],
        "emergingCompetitors": [
          {
            "name": "Name of emerging competitor",
            "mechanismOfAction": "Mechanism of action",
            "developmentStage": "Current clinical development stage",
            "expectedTimeline": "Expected approval timeline if available",
            "potentialImpact": "Potential impact on the market"
          }
        ],
        "competitiveAdvantages": ["List of competitive advantages for the study drug"],
        "competitiveDisadvantages": ["List of competitive disadvantages for the study drug"]
      },
     - "recentTrials": Information about recent and ongoing relevant trials
     - "citations": Array with objects containing "id", "url", "title", and "relevance" fields

  Be critical but constructive. Focus on scientific validity, methodological rigor, feasibility, and alignment with the strategic goal. Provide specific, actionable feedback that would improve the study design.

  IMPORTANT: Make sure to identify ANY discrepancies between the study population and currently approved indications/populations. This is CRITICAL for accurate validation.`;
}
