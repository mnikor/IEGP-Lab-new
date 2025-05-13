import OpenAI from "openai";
import { GenerateConceptRequest, StudyConcept } from "@shared/schema";
import { PicoData } from "@/lib/types";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    // Process evidence sources with citations
    if (!isValidation) {
      // Check if result is an array (for concepts) or an object (for validation)
      if (Array.isArray(result)) {
        result.forEach((concept: any) => {
          if (concept.evidenceSources && Array.isArray(concept.evidenceSources)) {
            concept.evidenceSources = concept.evidenceSources.map((source: any, index: number) => {
              return {
                ...source,
                citation: source.citation || `${source.title}${source.authors ? `, ${source.authors}` : ""}${source.publication ? `. ${source.publication}` : ""}${source.year ? ` (${source.year})` : ""}`,
                url: searchResults.citations[index] || source.url || ""
              };
            });
          } else {
            concept.evidenceSources = [];
          }
        });
      } else {
        // If it's not an array, return it as is
        console.log("Result is not an array. Got:", typeof result);
      }
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
      model: "gpt-4o",
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
  return `
  Based on the following parameters and evidence, generate 3 distinct clinical study concepts for ${data.drugName} in ${data.indication}.

  # Parameters:
  - Drug: ${data.drugName}
  - Indication: ${data.indication}
  - Strategic Goal: ${data.strategicGoal.replace('_', ' ')}
  - Geography: ${data.geography.join(', ')}
  - Study Phase Preference: ${data.studyPhasePref}
  - Target Subpopulation: ${data.targetSubpopulation || 'Not specified'}
  - Comparator Drugs: ${data.comparatorDrugs?.join(', ') || 'Not specified'}
  - Budget Ceiling (EUR): ${data.budgetCeilingEur || 'Not specified'}
  - Timeline Ceiling (Months): ${data.timelineCeilingMonths || 'Not specified'}
  - Sales Impact Threshold: ${data.salesImpactThreshold || 'Not specified'}

  # Evidence from Literature:
  ${searchResults.content}

  Respond with a JSON array of 3 study concepts. Each concept should include:
  1. "title": A descriptive title for the study
  2. "drugName": The drug name from the parameters
  3. "indication": The indication from the parameters
  4. "strategicGoal": The strategic goal from the parameters
  5. "geography": The geography array from the parameters
  6. "studyPhase": A recommended study phase based on the evidence and parameters
  7. "targetSubpopulation": The target subpopulation (use the provided value or suggest one)
  8. "comparatorDrugs": Array of comparator drugs (use the provided values or suggest appropriate ones)
  9. "picoData": An object with "population", "intervention", "comparator", and "outcomes" fields detailing the PICO framework
  10. "evidenceSources": An array of evidence sources, each with "title", "authors" (optional), "publication" (optional), "year" (optional), and "citation" (full citation string)

  Ensure each concept is distinct, evidence-based, and aligned with the strategic goal. The concepts should be feasible given the parameters.`;
}

/**
 * Builds a prompt for synopsis validation
 */
function buildValidationPrompt(data: any, searchResults: { content: string; citations: string[] }): string {
  return `
  Analyze the provided clinical study synopsis and provide detailed validation feedback.

  # Study Parameters:
  - Drug: ${data.drugName}
  - Indication: ${data.indication}
  - Strategic Goal: ${data.strategicGoal.replace('_', ' ')}

  # Document Text:
  ${data.documentText.substring(0, 10000)}

  # Extracted PICO Framework:
  - Population: ${data.extractedPico.population}
  - Intervention: ${data.extractedPico.intervention}
  - Comparator: ${data.extractedPico.comparator}
  - Outcomes: ${data.extractedPico.outcomes}

  # Current Evidence:
  ${searchResults.content}

  Respond with a JSON object containing:
  1. "title": A descriptive title for this validation report
  2. "extractedPico": The PICO framework that was extracted (confirm or refine it)
  3. "benchmarkDeltas": Array of objects comparing current vs. suggested changes, each with "aspect", "current", "suggested", and "impact" ("positive", "negative", or "neutral") fields
  4. "riskFlags": Array of identified risks, each with "category", "description", "severity" ("high", "medium", "low"), and "mitigation" fields
  5. "revisedEconomics": Object with "originalCost" (if found, otherwise null), "revisedCost", "originalTimeline" (if found, otherwise null), "revisedTimeline", "originalROI" (if found, otherwise null), "revisedROI", and "notes" fields
  6. "swotAnalysis": Object with "strengths", "weaknesses", "opportunities", and "threats" arrays

  Be critical but constructive. Focus on scientific validity, methodological rigor, feasibility, and alignment with the strategic goal.`;
}
