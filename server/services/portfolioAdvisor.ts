import OpenAI from "openai";
import { GenerateConceptRequest, StudyConcept } from "@shared/schema";

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type RecommendationLevel = "proceed" | "revise" | "stop";

type CommercialRecommendation = {
  level: RecommendationLevel;
  confidence?: "high" | "medium" | "low";
  rationale?: string[];
  blockers?: string[];
  windowAssessment?: string;
};

type Highlight = {
  conceptId: number | string;
  title: string;
  summary: string;
};

function getRankScore(concept: StudyConcept): number {
  const value = (concept as any)?.rankScore;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export interface PortfolioSummary {
  headline: string;
  recommendation: RecommendationLevel;
  rationale: string[];
  highlights: Highlight[];
  warnings: string[];
}

function getCommercialRecommendation(concept: StudyConcept): CommercialRecommendation | null {
  const recommendation = (concept.mcdaScores as any)?.commercialRecommendation;
  if (!recommendation || typeof recommendation !== "object") {
    return null;
  }
  return {
    level: recommendation.level ?? "revise",
    confidence: recommendation.confidence,
    rationale: Array.isArray(recommendation.rationale) ? recommendation.rationale : [],
    blockers: Array.isArray(recommendation.blockers) ? recommendation.blockers : undefined,
    windowAssessment: recommendation.windowAssessment,
  };
}

function collectAlerts(concept: StudyConcept): string[] {
  const alerts = (concept.mcdaScores as any)?.commercialAlerts;
  if (!Array.isArray(alerts)) {
    return [];
  }
  return alerts.map((alert: unknown) =>
    typeof alert === "string" ? alert : JSON.stringify(alert)
  );
}

function formatHighlight(concept: StudyConcept, index: number): Highlight {
  const signals = (concept.mcdaScores as any)?.financialSignals || {};
  const roi = typeof signals.projectedROI === "number" ? `${signals.projectedROI.toFixed(1)}× ROI` : "ROI n/a";
  const enpv = typeof signals.riskAdjustedEnpv === "number"
    ? `${signals.riskAdjustedEnpv >= 0 ? "+" : ""}${(signals.riskAdjustedEnpv / 1_000_000).toFixed(1)}M rNPV`
    : "rNPV n/a";
  const windowMonths = typeof signals.windowToLoeMonths === "number" ? signals.windowToLoeMonths : null;
  const window = windowMonths !== null ? `${windowMonths}m window` : "window n/a";
  const recommendation = getCommercialRecommendation(concept);

  const summaryParts = [roi, enpv, window];
  if (recommendation) {
    summaryParts.push(`Recommendation: ${recommendation.level}`);
  }
  if (recommendation?.windowAssessment) {
    summaryParts.push(recommendation.windowAssessment);
  }

  return {
    conceptId: concept.id ?? `concept-${index + 1}`,
    title: concept.title || `Concept ${index + 1}`,
    summary: summaryParts.join(" | ")
  };
}

function buildDeterministicSummary(concepts: StudyConcept[]): PortfolioSummary {
  if (concepts.length === 0) {
    return {
      headline: "No study concepts available",
      recommendation: "stop",
      rationale: ["Concept generation did not return any viable options."],
      highlights: [],
      warnings: []
    };
  }

  const sorted = [...concepts].sort((a, b) => getRankScore(b) - getRankScore(a));
  const best = sorted[0];
  const bestRecommendation = getCommercialRecommendation(best);

  const proceedCount = sorted.filter(
    concept => getCommercialRecommendation(concept)?.level === "proceed"
  ).length;
  const stopCount = sorted.filter(
    concept => getCommercialRecommendation(concept)?.level === "stop"
  ).length;

  let headline: string;
  if (stopCount === sorted.length) {
    headline = "Do not invest in new studies with current assumptions";
  } else if (proceedCount > 0) {
    headline = `Prioritize ${best.title || "the top-ranked concept"}`;
  } else {
    headline = `Refine leading concepts before committing`; 
  }

  const recommendation: RecommendationLevel = bestRecommendation?.level ?? "revise";
  const rationale = bestRecommendation?.rationale && bestRecommendation.rationale.length > 0
    ? bestRecommendation.rationale.slice(0, 4)
    : ["Top-ranked concept lacks explicit rationale; review feasibility and commercial drivers."];

  const uniqueHighlights: Highlight[] = [];
  const seenHighlightKeys = new Set<string>();
  sorted.forEach((concept, index) => {
    if (uniqueHighlights.length >= 3) {
      return;
    }
    const highlight = formatHighlight(concept, index);
    const key = `${highlight.conceptId}::${highlight.title}`;
    if (!seenHighlightKeys.has(key)) {
      seenHighlightKeys.add(key);
      uniqueHighlights.push(highlight);
    }
  });

  const warningsByConcept = new Map<string, Set<string>>();
  sorted.forEach(concept => {
    const conceptLabel = concept.title || "Concept";
    if (!warningsByConcept.has(conceptLabel)) {
      warningsByConcept.set(conceptLabel, new Set());
    }
    const conceptWarnings = warningsByConcept.get(conceptLabel)!;
    collectAlerts(concept).forEach(alert => conceptWarnings.add(alert));
    const blockers = getCommercialRecommendation(concept)?.blockers || [];
    blockers.forEach(blocker => conceptWarnings.add(blocker));
  });

  const warningsList: string[] = [];
  warningsByConcept.forEach((messages, conceptLabel) => {
    messages.forEach(message => warningsList.push(`${conceptLabel}: ${message}`));
  });

  return {
    headline,
    recommendation,
    rationale,
    highlights: uniqueHighlights,
    warnings: warningsList
  };
}

function buildPromptPayload(concepts: StudyConcept[], requestData: Partial<GenerateConceptRequest>): string {
  const compactConcepts = concepts.slice(0, 5).map(concept => {
    const recommendation = getCommercialRecommendation(concept);
    const signals = (concept.mcdaScores as any)?.financialSignals || {};
    const feasibility = (concept as any)?.feasibilityData || {};
    return {
      id: concept.id,
      title: concept.title,
      phase: concept.studyPhase,
      strategicGoals: concept.strategicGoals,
      mcdaScores: concept.mcdaScores,
      commercialRecommendation: recommendation,
      financialSignals: signals,
      feasibility: {
        timeline: feasibility.timeline,
        estimatedCost: feasibility.estimatedCost,
        expectedToplineDate: feasibility.expectedToplineDate,
        windowToLoeMonths: feasibility.windowToLoeMonths,
        projectedROI: feasibility.projectedROI,
        riskAdjustedENpvUsd: feasibility.riskAdjustedENpvUsd ?? feasibility.riskAdjustedENpv,
      },
      rankScore: getRankScore(concept),
    };
  });

  return JSON.stringify({
    request: {
      drugName: requestData.drugName,
      indication: requestData.indication,
      strategicGoals: requestData.strategicGoals,
      numberOfConcepts: requestData.numberOfConcepts,
    },
    concepts: compactConcepts,
  }, null, 2);
}

function normalizeSummary(candidate: unknown): PortfolioSummary | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }
  const value = candidate as any;
  const headline = typeof value.headline === "string" ? value.headline : null;
  const recommendation = value.recommendation;
  const rationale = Array.isArray(value.rationale) ? value.rationale.filter((item: unknown) => typeof item === "string") : [];
  const highlights = Array.isArray(value.highlights)
    ? value.highlights
        .map((item: any, index: number) => {
          if (!item) return null;
          const conceptId = item.conceptId ?? item.id ?? index;
          const title = typeof item.title === "string" ? item.title : `Concept ${index + 1}`;
          const summary = typeof item.summary === "string" ? item.summary : "Summary unavailable";
          return {
            conceptId,
            title,
            summary,
          } as Highlight;
        })
        .filter(Boolean) as Highlight[]
    : [];
  const warnings = Array.isArray(value.warnings)
    ? value.warnings.filter((item: unknown) => typeof item === "string")
    : [];

  if (!headline || !["proceed", "revise", "stop"].includes(recommendation)) {
    return null;
  }

  return {
    headline,
    recommendation,
    rationale,
    highlights,
    warnings,
  };
}

export async function generatePortfolioSummary(
  concepts: StudyConcept[],
  requestData: Partial<GenerateConceptRequest>
): Promise<PortfolioSummary> {
  const fallback = buildDeterministicSummary(concepts);

  if (!openaiClient || concepts.length === 0) {
    return fallback;
  }

  try {
    const payload = buildPromptPayload(concepts, requestData);
    const response = await openaiClient.responses.create({
      model: "gpt-5",
      reasoning: { effort: "medium" },
      input: [
        {
          role: "system",
          content: "You are a senior clinical development strategist. Respond strictly with valid JSON using keys headline, recommendation, rationale, highlights, warnings. Recommendation must be one of proceed, revise, or stop.",
        },
        {
          role: "user",
          content: `Analyze the following concept portfolio and provide a concise recommendation in JSON.\n${payload}`,
        },
      ],
    });

    const raw = (response as any).output_text as string | undefined;
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    const normalized = normalizeSummary(parsed);
    return normalized ?? fallback;
  } catch (error) {
    console.error("Failed to generate portfolio summary via GPT:", error);
    return fallback;
  }
}
