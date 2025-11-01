import OpenAI from "openai";
import { REGIONAL_MARKET_DATA } from "./commercialIntelligence";
import type { CommercialAssumptions } from "@shared/commercialTypes";

const llmEnabled = process.env.PORTFOLIO_SUMMARY_USE_LLM === "true";
let openaiClient: OpenAI | null = null;

async function getOpenAIClient(): Promise<OpenAI> {
  if (!llmEnabled) {
    throw new Error("LLM usage disabled");
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable not found");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openaiClient;
}

export interface CommercialConceptContext {
  title?: string;
  drugName?: string;
  indication?: string;
  studyPhase?: string;
  strategicGoals?: string[];
  geography?: string[];
  mcdaScores?: unknown;
  feasibilityData?: { timeline?: number } | null;
}

export async function generateCommercialAssumptions(
  concept: CommercialConceptContext,
  therapeuticArea: string
): Promise<CommercialAssumptions> {
  if (!llmEnabled) {
    console.warn("Commercial assumptions: LLM disabled, using heuristic fallback");
    return buildFallbackAssumptions(concept, therapeuticArea, "llm_disabled");
  }

  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackAssumptions(concept, therapeuticArea, "missing_api_key");
  }

  try {
    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a senior commercial strategist. Estimate commercial assumptions for clinical study concepts using the provided evidence. Respond with realistic numeric values and short rationale bullets.",
        },
        { role: "user", content: buildAssumptionPrompt(concept, therapeuticArea) },
      ],
    });

    const raw = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(raw);

    const assumptions = sanitizeAssumptions(parsed);
    return { ...assumptions, source: "llm" };
  } catch (error) {
    console.error("LLM commercial assumption generation failed, falling back:", error);
    return buildFallbackAssumptions(concept, therapeuticArea, "llm_error");
  }
}

function buildAssumptionPrompt(
  concept: CommercialConceptContext,
  therapeuticArea: string
): string {
  const strategicGoals = Array.isArray(concept.strategicGoals)
    ? concept.strategicGoals.join(", ")
    : "unspecified";

  const timelineMonths = concept.feasibilityData?.timeline ?? "unknown";

  return `Provide commercial assumptions for the following clinical study concept.

Return JSON with keys:
{
  "avgAnnualRevenuePerPatientUsd": number,
  "addressablePatientCount": number,
  "peakSharePercent": number,
  "impactDurationYears": number,
  "uptakeRampYears": number,
  "accessDelayMonths": number,
  "confidence": number (0-1),
  "notes": string[] (max 4 entries)
}

Context:
- Drug: ${concept.drugName}
- Indication: ${concept.indication}
- Therapeutic area: ${therapeuticArea}
- Strategic goals: ${strategicGoals}
- Study phase: ${concept.studyPhase}
- Timeline (months): ${timelineMonths}
- Geography mix: ${(concept.geography || []).join(", ") || "not specified"}
- Known commercial signals: ${(concept.mcdaScores as any)?.commercialSignals ?? "none"}

Guidelines:
- Ground numbers in recent market dynamics for this indication.
- Peak share should reflect incremental share attributable to study success.
- Impact duration should consider patent protection and evidence durability.
- Uptake ramp accounts for physician adoption and access hurdles.
- Access delay is time from approval/readout to revenue start.
- Output only the JSON, no narration.`;
}

function sanitizeAssumptions(candidate: any): Omit<CommercialAssumptions, "source"> {
  const toNumber = (value: unknown, fallback: number): number => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const notes: string[] = Array.isArray(candidate?.notes)
    ? candidate.notes
        .map((item: unknown) => (typeof item === "string" ? item : ""))
        .filter(Boolean)
        .slice(0, 4)
    : [];

  return {
    avgAnnualRevenuePerPatientUsd: clamp(
      toNumber(candidate?.avgAnnualRevenuePerPatientUsd, 75000),
      5000,
      600000
    ),
    addressablePatientCount: clamp(
      toNumber(candidate?.addressablePatientCount, 35000),
      500,
      2000000
    ),
    peakSharePercent: clamp(toNumber(candidate?.peakSharePercent, 12), 1, 80),
    impactDurationYears: clamp(toNumber(candidate?.impactDurationYears, 6), 1, 15),
    uptakeRampYears: clamp(toNumber(candidate?.uptakeRampYears, 2), 0.2, 6),
    accessDelayMonths: clamp(toNumber(candidate?.accessDelayMonths, 12), 0, 36),
    confidence: clamp(toNumber(candidate?.confidence, 0.5), 0, 1),
    notes,
  };
}

function buildFallbackAssumptions(
  concept: CommercialConceptContext,
  therapeuticArea: string,
  reason: string
): CommercialAssumptions {
  const defaultRegion = REGIONAL_MARKET_DATA["us"];
  const baseRevenue = defaultRegion?.marketSize || 500000000;

  const phaseMultiplier = concept.studyPhase === "III" ? 1.25 : concept.studyPhase === "IV" ? 0.9 : 0.75;
  const goalMultiplier = Array.isArray(concept.strategicGoals)
    ? 1 + concept.strategicGoals.length * 0.05
    : 1;

  const avgAnnualRevenuePerPatientUsd = 80000 * phaseMultiplier * goalMultiplier;
  const addressablePatientCount = Math.round((baseRevenue / avgAnnualRevenuePerPatientUsd) * 0.35);

  return {
    source: "fallback",
    avgAnnualRevenuePerPatientUsd,
    addressablePatientCount,
    peakSharePercent: Math.min(25, 10 + (concept.studyPhase === "III" ? 8 : 4)),
    impactDurationYears: 5,
    uptakeRampYears: 2.5,
    accessDelayMonths: 12,
    confidence: 0.35,
    notes: [`Fallback assumptions (${reason}) using heuristic values for ${therapeuticArea}.`],
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}
