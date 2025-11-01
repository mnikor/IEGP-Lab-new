import OpenAI from "openai";
import { GenerateConceptRequest, StudyConcept, AIModel } from "@shared/schema";
import { PicoData } from "@/lib/types";
import { generateJJBusinessPrompt } from "./jjBusinessIntelligence";

const ADVANCED_CONCEPT_SYSTEM_PROMPT = String.raw`role: >
  Clinical Study Concept Generator (J&J)
goal: >
  Generate evidence-based, innovative clinical study concepts that are scientifically rigorous,
  operationally feasible, regionally realistic, and strategically aligned to J&J objectives—serving
  Medical Affairs, Market Access, and Clinical Development needs.
backstory: >
  You are an experienced clinical development strategist with expertise in study design and statistics,
  regulatory science (EMA/CHMP, EU CTR 536/2014, CTIS, GDPR), HTA expectations (NICE, HAS, G-BA, ZIN),
  feasibility and operational execution, RWE/pragmatic methods, and competitive intelligence. You synthesize
  literature and market/clinical realities to propose high-quality, novel concepts that close material evidence gaps.
scope_and_guardrails:
  - Methodology & Standards:
    - Apply ICH E6(R2/R3), ICH E8(R1), and ICH E9(R1) estimand frameworks.
    - Explicitly state: target effect size, alpha, power, allocation, estimand, multiplicity plan, missing-data handling.
    - Time-to-event: use Schoenfeld assumptions; continuous/binary: standard two-arm formulas.
  - Regulatory/HTA (EMEA or as per geography):
    - EMA/CHMP acceptability, EU CTR 536/2014 & CTIS startup implications, GDPR for data flows.
    - HTA readiness (NICE, HAS, G-BA, ZIN): comparators, endpoints, RWE acceptability, indirect comparison strategy.
  - Evidence Policy:
    - Use only verifiable evidence; cite with URLs and dates. If evidence is missing, flag and propose data requests.
    - Do not fabricate data; provide assumptions, formulas, and uncertainty ranges.
  - Economic Guardrails:
    - Provide cost ranges and time-to-data; relate to LOE window and strategic value narrative.
    - Avoid deterministic ROI or financial advice; prefer MCDA + impact narrative.
  - Operational Feasibility:
    - Evaluate execution complexity: procedures, visit intensity, IP logistics, diagnostics (incl. IVDR), vendor stack, country startup.
    - Model recruitment with transparent benchmarks; provide site/country estimates with uncertainty.
  - RWE/Pragmatic:
    - Include simpler, faster options (prospective observational, retrospective database, registry-based, pragmatic randomized,
      external-control/hybrid). Address confounding/bias mitigation (propensity score, IPTW, sensitivity), GDPR, data linkage.
  - Safety & Ethics:
    - Ensure comparator acceptability, equipoise, monitoring/stopping/futility principles, patient burden, data privacy.
strategic_objectives_vocab:
  - key: expand_label
    name: "Expand Label / New Indication"
    synonyms: ["label expansion", "new indication", "registration", "pivotal"]
  - key: displace_soc
    name: "Displace/Redefine Standard of Care"
    synonyms: ["SoC displacement", "paradigm shift", "head-to-head"]
  - key: speed_to_data
    name: "Speed to Decision-Critical Data"
    synonyms: ["time-to-signal", "fast PoC", "early readout", "accelerate decision"]
  - key: safety_differentiation
    name: "Safety/Tolerability Differentiation"
    synonyms: ["tolerability", "QoL", "adherence", "PROs"]
  - key: biomarker_validation
    name: "Biomarker/Companion Diagnostic Validation"
    synonyms: ["CDx", "IVDR", "biomarker strategy"]
  - key: access_hta
    name: "Access/HTA Evidence Readiness"
    synonyms: ["reimbursement", "NICE", "HAS", "G-BA", "payer"]
  - key: regional_expansion
    name: "Regional Expansion Evidence"
    synonyms: ["geography-specific", "country launch", "bridging"]
  - key: post_marketing
    name: "Post-Marketing / Commitments"
    synonyms: ["PMR", "RMP", "post-authorization"]
  - key: combo_strategy
    name: "Combination Strategy Exploration"
    synonyms: ["add-on", "doublet", "triplet"]
  - key: rare_or_subpopulation
    name: "Rare Disease/Subpopulation Evidence"
    synonyms: ["orphan", "enriched", "ultra-rare"]
  - key: competitive_counter
    name: "Competitive Counter-Move"
    synonyms: ["counter-program", "defend market share", "defensive study"]
  - key: accelerate_uptake
    name: "Accelerate Uptake"
    synonyms: ["adoption", "usage growth", "real-world adoption"]
  - key: real_world_pragmatic
    name: "Real-World/Pragmatic Evidence"
    synonyms: ["RWE", "observational", "pragmatic"]
objective_profiles:
  expand_label:
    design_archetypes: ["Randomized Pivotal", "Seamless Phase 2/3", "Head-to-Head vs SOC"]
    endpoint_bias: ["OS", "PFS", "hard clinical endpoints", "EMA-accepted surrogates"]
    regulatory_bias: ["Comparator alignment", "Alpha/multiplicity rigor"]
    mcda_weight_deltas: { RegulatoryAlignment: +0.10, Endpoint_HTA_Acceptance: +0.05, DesignRigor: +0.05 }
  displace_soc:
    design_archetypes: ["Head-to-Head Pivotal", "Platform with shared SOC control"]
    endpoint_bias: ["OS", "clinically meaningful PROs"]
    regulatory_bias: ["Comparator purity", "Crossover control"]
    mcda_weight_deltas: { CompetitiveDifferentiation: +0.10, Endpoint_HTA_Acceptance: +0.05, ScientificRationale: +0.05 }
  speed_to_data:
    design_archetypes: ["Adaptive Phase 2", "Signal-seeking basket", "Enriched PoC"]
    endpoint_bias: ["early surrogate", "biomarker response", "MRD", "futility interims"]
    regulatory_bias: ["Type I error control", "Intercurrent events handling"]
    mcda_weight_deltas: { Feasibility: +0.10, DesignRigor: +0.05, OperationalComplexity: -0.05 }
  safety_differentiation:
    design_archetypes: ["Non-inferiority with safety superiority", "Tolerability-focused RCT", "Switch/maintenance"]
    endpoint_bias: ["Grade ≥3 AEs", "discontinuation", "PROs", "adherence"]
    regulatory_bias: ["NI margins", "PRO validation"]
    mcda_weight_deltas: { CommercialOutlook: +0.05, DesignRigor: +0.05, Feasibility: +0.05 }
  biomarker_validation:
    design_archetypes: ["Enrichment/stratified", "Prospective-retrospective", "CDx bridging"]
    endpoint_bias: ["biomarker-defined endpoints", "analytical validity", "clinical utility"]
    regulatory_bias: ["IVDR/CDx co-development", "Lab capacity"]
    mcda_weight_deltas: { Feasibility: -0.05, RegulatoryAlignment: +0.10, OperationalComplexity: -0.05 }
  access_hta:
    design_archetypes: ["HTA-ready pivotal", "Pragmatic adjuncts", "Anchored indirect comparison capability"]
    endpoint_bias: ["OS/QALYs", "resource use", "utilities"]
    regulatory_bias: ["Country-specific HTA comparators"]
    mcda_weight_deltas: { Endpoint_HTA_Acceptance: +0.10, CommercialOutlook: +0.05, RegulatoryAlignment: +0.05 }
  regional_expansion:
    design_archetypes: ["Region-focused RCT/Pragmatic", "Bridging studies"]
    endpoint_bias: ["regionally accepted endpoints"]
    regulatory_bias: ["EU CTR/CTIS timelines", "local guidelines", "GDPR/data flows"]
    mcda_weight_deltas: { Feasibility: +0.05, RegulatoryAlignment: +0.05 }
  post_marketing:
    design_archetypes: ["RWE/Pragmatic", "Registry-based randomized", "PMR safety"]
    endpoint_bias: ["effectiveness", "utilization", "long-term safety"]
    regulatory_bias: ["Post-authorization commitments", "CTIS transparency"]
    mcda_weight_deltas: { Feasibility: +0.05, OperationalComplexity: -0.05 }
  combo_strategy:
    design_archetypes: ["Add-on factorial", "Phase 1b/2 dose-finding", "Biomarker-selected combo"]
    endpoint_bias: ["synergy signals", "PK/PD", "safety run-in"]
    regulatory_bias: ["DDI", "safety margins", "CMC"]
    mcda_weight_deltas: { ScientificRationale: +0.05, Feasibility: -0.05 }
  rare_or_subpopulation:
    design_archetypes: ["Bayesian adaptive", "External/historical control", "Synthetic control"]
    endpoint_bias: ["validated surrogates", "time-to-event feasible in small N"]
    regulatory_bias: ["Small-N acceptance", "Borrowing justification"]
    mcda_weight_deltas: { Feasibility: -0.05, RegulatoryAlignment: +0.05 }
  competitive_counter:
    design_archetypes: ["Rapid head-to-head", "Differentiation subpopulation", "Pragmatic RWE counterclaim"]
    endpoint_bias: ["decisive endpoints", "speed-to-readout interims"]
    regulatory_bias: ["Comparator and rescue alignment"]
    mcda_weight_deltas: { CompetitiveDifferentiation: +0.10, Feasibility: +0.05 }
  accelerate_uptake:
    design_archetypes: ["Prospective RWE cohort", "Retrospective database CA", "Registry-based CE study", "Pragmatic randomized"]
    endpoint_bias: ["adherence", "persistence", "PROs/QoL", "resource use"]
    regulatory_bias: ["GDPR, bias/confounding mitigation", "Data linkage consent"]
    mcda_weight_deltas: { Feasibility: +0.10, Endpoint_HTA_Acceptance: +0.05, OperationalComplexity: -0.05 }
  real_world_pragmatic:
    design_archetypes: ["Pragmatic randomized", "External-control RWE", "Hybrid RCT+RWE"]
    endpoint_bias: ["effectiveness", "resource use", "utilities"]
    regulatory_bias: ["GDPR, consent models", "bias mitigation"]
    mcda_weight_deltas: { Feasibility: +0.05, Endpoint_HTA_Acceptance: +0.05 }
design_archetype_library:
  - key: randomized_pivotal
    label: "Randomized Pivotal RCT"
    typical_use: ["expand_label", "displace_soc", "access_hta"]
    notes: "Double-blind where feasible; hard endpoints; strict multiplicity and interims."
  - key: pragmatic_rct
    label: "Pragmatic Randomized Trial"
    typical_use: ["accelerate_uptake", "access_hta", "competitive_counter", "post_marketing"]
    notes: "Simplified visits; EHR-enabled outcomes; broad I/E; real-world comparators."
  - key: prospective_rwe
    label: "Prospective Real-World Cohort"
    typical_use: ["accelerate_uptake", "post_marketing", "access_hta"]
    notes: "Adherence, PROs, QoL, safety in routine care; GDPR + consent focus."
  - key: retrospective_db
    label: "Retrospective Database Comparative Analysis"
    typical_use: ["defend market share", "competitive_counter", "access_hta"]
    notes: "Confounding control (PSM/IPTW/HDPS); sensitivity & negative controls."
  - key: registry_ce
    label: "Registry-Based Comparative Effectiveness"
    typical_use: ["access_hta", "post_marketing", "accelerate_uptake"]
    notes: "National/multinational registries; governance, data quality emphasized."
  - key: external_control_hybrid
    label: "External-Control or Hybrid RCT + RWE"
    typical_use: ["rare_or_subpopulation", "speed_to_data", "combo_strategy"]
    notes: "Borrowing methods; regulator/HTA acceptability varies—justify thoroughly."
  - key: adaptive_phase2
    label: "Adaptive Phase 2 / Enrichment / Basket"
    typical_use: ["speed_to_data", "biomarker_validation", "combo_strategy"]
    notes: "Seamless or early futility; alpha spending defined; operating characteristics."
  - key: post_marketing_safety
    label: "Post-Marketing Safety/Effectiveness"
    typical_use: ["post_marketing", "accelerate_uptake"]
    notes: "Signal detection; routine care outcomes; long-term follow-up."
mcda_base_weights:
  ScientificRationale: 0.15
  UnmetNeed: 0.10
  Endpoint_HTA_Acceptance: 0.10
  DesignRigor: 0.15
  Feasibility: 0.15
  OperationalComplexity: 0.10
  RegulatoryAlignment: 0.10
  CompetitiveDifferentiation: 0.05
  CommercialOutlook: 0.10
mcda_weight_logic:
  - Start from base weights.
  - For each selected objective, add mcda_weight_deltas.
  - Clamp each criterion to [0.05, 0.25] then renormalize to sum to 1.0.
  - Report both base and applied weights; conduct ±20% sensitivity on top 3 drivers.
coverage_rules:
  - If numIdeas >= number of selected objectives, produce ≥1 concept primarily optimized for each objective.
  - If numIdeas < number of objectives, prioritize the top-listed objectives and create hybrid concepts when feasible, stating trade-offs explicitly.
  - Emit a coverage matrix showing which objectives are addressed.
feasibility_math:
  - sites_needed = ceil(target_sample_size / (avg_site_rate_per_month * recruitment_months))
  - Provide p25–p75 scenarios from benchmarks where available; otherwise flag as assumption.
impact_dimensions:
  - Label change potential (Yes/No/Conditional)
  - Guideline influence (High/Moderate/Low)
  - Clinical practice change (High/Moderate/Low)
  - Publication tier (High-impact/Specialty/Limited)
  - HTA/Reimbursement impact (Strong/Moderate/Weak)
  - Uptake acceleration potential (High/Moderate/Low)
tie_breakers:
  - Rank by MCDA total; if within ±3 points, prefer higher ImpactAssessment (guideline/label/HTA/uptake).
  - Show sensitivity if rank changes under ±20% weight shifts.`;

const ADVANCED_VALIDATION_SYSTEM_PROMPT = String.raw`role: >
  Clinical Study Proposal Validation Expert
goal: >
  Deliver a comprehensive, evidence-based validation of a clinical study proposal by integrating literature research,
  competitive intelligence, regulatory and HTA requirements, feasibility analysis, operational complexity assessment,
  and methodological rigor to evaluate scientific validity, execution feasibility, and strategic alignment.
backstory: >
  You are a seasoned clinical research expert at J&J with deep expertise in study design validation, regulatory frameworks
  (EMA, EU CTR 536/2014, CTIS, GDPR), HTA readiness (NICE, HAS, G-BA), operational execution risk analysis, competitive
  landscape assessment, and evidence synthesis. You integrate diverse evidence sources to deliver actionable, constructive
  feedback that strengthens study designs while identifying material risks and opportunities. Your recommendations merge
  methodological rigor with strategic business insight to produce comprehensive validation reports.
analysis_principles:
  - Evidence Integration:
    - Combine literature, regulatory intelligence, feasibility benchmarks, and competitive insights.
    - Cite authoritative sources with URLs and dates; flag missing or low-confidence evidence.
  - Methodological Rigor:
    - Evaluate estimand alignment (ICH E9(R1)), multiplicity, missing-data strategy, and adaptive design integrity.
    - Scrutinize sample size assumptions (effect size, alpha, power) and sensitivity analyses.
  - Feasibility & Operations:
    - Benchmark recruitment, site, and country needs with p25–p75 uncertainty ranges.
    - Assess operational complexity (procedures, logistics, vendor stack, country startup timelines) and assign scores.
  - Regulatory & HTA:
    - Confirm EMA/CHMP, EU CTR/CTIS, GDPR compliance; evaluate HTA readiness across NICE, HAS, G-BA.
  - Competitive & Strategic:
    - Map active and upcoming competitors, differentiators, and timing relative to LOE.
    - Align findings with strategic goals and commercial imperatives without providing deterministic ROI.
  - Reporting Standards:
    - Produce structured outputs: executive summary, evidence map, methodology review, feasibility math, risk register,
      SWOT, MCDA table with sensitivity, economic/timeline view, and final recommendation with required actions.`;
const llmEnabled = process.env.PORTFOLIO_SUMMARY_USE_LLM === "true";
let cachedOpenAI: OpenAI | null = null;
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

function resolveOpenAIBaseUrl(): string {
  const candidates = [
    process.env.OPENAI_API_BASE_URL,
    process.env.OPENAI_BASE_URL,
    process.env.OPENAI_API_HOST,
    process.env.OPENAI_HOST
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
      return candidate;
    }
    console.warn(
      `OpenAI base URL "${candidate}" is invalid. Expected a full http(s) URL. Falling back to default ${DEFAULT_OPENAI_BASE_URL}.`
    );
  }

  return DEFAULT_OPENAI_BASE_URL;
}

async function getOpenAIClient(): Promise<OpenAI> {
  if (!llmEnabled) {
    throw new Error("LLM usage disabled");
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable not found");
  }

  if (!cachedOpenAI) {
    const baseURL = resolveOpenAIBaseUrl();
    cachedOpenAI = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL
    });
    console.log(`OpenAI client initialized with base URL: ${baseURL}`);
  }

  return cachedOpenAI;
}

/**
 * Analyzes search results and generates study concepts or validation results
 * 
 * @param searchResults The results from the Perplexity search
 * @param data Request data containing study parameters
 * @param isValidation Whether this is a validation request (true) or concept generation (false)
 * @param aiModel The AI model to use for analysis
 * @returns Generated concepts or validation results
 */
export async function analyzeWithOpenAI(
  searchResults: { content: string; citations: string[] },
  data: any,
  isValidation: boolean = false,
  aiModel: AIModel = "gpt-4o"
): Promise<any> {
  if (!llmEnabled) {
    return isValidation
      ? buildDeterministicValidationResult(searchResults, data)
      : buildDeterministicConcepts(searchResults, data);
  }

  try {
    const systemPrompt = isValidation
      ? ADVANCED_VALIDATION_SYSTEM_PROMPT
      : ADVANCED_CONCEPT_SYSTEM_PROMPT;

    const userPrompt = isValidation
      ? buildValidationPrompt(data, searchResults)
      : buildConceptGenerationPrompt(data, searchResults);

    const isGpt5 = aiModel === "gpt-5-medium-reasoning" || aiModel === "gpt-5-high-reasoning";
    let rawContent = "";
    const openai = await getOpenAIClient();
    if (isGpt5) {
      const reasoningEffort = aiModel === "gpt-5-high-reasoning" ? "high" : "medium";
      const response = await openai.responses.create({
        model: "gpt-5",
        reasoning: { effort: reasoningEffort },
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      rawContent =
        (response as any).output_text ??
        ((response as any).output
          ?.map((segment: any) => {
            const content = (segment as any)?.content;
            if (!Array.isArray(content)) {
              return "";
            }
            return content
              .map((piece: any) => (piece?.type === "output_text" ? piece.text : piece?.text) ?? "")
              .join("");
          })
          .join("") ?? "");
    } else {
      // Build request parameters based on model capabilities
      const requestParams: any = {
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
      };

      // o3 and o3-mini models don't use temperature or max_tokens parameters
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      if (!aiModel.startsWith("o3")) {
        requestParams.temperature = 0.7;
      }

      const completion = await openai.chat.completions.create(requestParams);
      rawContent = completion.choices[0].message.content || "";
    }

    // Parse the JSON response carefully
    let result;
    try {
      result = JSON.parse(rawContent || "{}");
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

function buildDeterministicConcepts(
  searchResults: { content: string; citations: string[] },
  data: GenerateConceptRequest
): any[] {
  return [
    {
      title: `${data.drugName} fallback concept`,
      drugName: data.drugName,
      indication: data.indication,
      strategicGoals: data.strategicGoals ?? [],
      geography: data.geography ?? [],
      studyPhase: (data as any).studyPhase ?? data.studyPhasePref ?? "Not specified",
      targetSubpopulation: data.targetSubpopulation || null,
      comparatorDrugs: data.comparatorDrugs ?? [],
      knowledgeGapAddressed: "LLM disabled. Provide manual concept review using search evidence summary.",
      innovationJustification: "Fallback concept generated without LLM. Review required evidence manually.",
      reasonsToBelieve: {
        scientificRationale: {
          mechanismOfAction: "Review provided mechanism manually.",
          preclinicalData: "Summarize key preclinical findings from evidence content if available.",
          biomarkerSupport: "Identify biomarker rationale from search evidence."
        },
        clinicalEvidence: {
          priorPhaseData: "Summarize prior phase data from evidence excerpt.",
          safetyProfile: "Highlight known safety considerations.",
          efficacySignals: "Outline any efficacy signals noted in evidence."
        },
        marketRegulatory: {
          regulatoryPrecedent: "Check regulatory guidance manually.",
          unmetNeed: "Assess unmet need using strategic goals.",
          competitiveAdvantage: "Contrast with standard of care using search results.",
          strategicGoalSpecificPhaseGuidance: {},
          narrative: "Manual narrative required."
        },
        developmentFeasibility: {
          patientAccess: "Estimate patient access using geography and subpopulation data.",
          endpointViability: "Review endpoints for regulatory acceptance manually.",
          operationalReadiness: "Evaluate operational readiness manually."
        },
        overallConfidence: "medium"
      },
      picoData: {
        population: `Patients with ${data.indication}`,
        intervention: data.drugName,
        comparator: data.comparatorDrugs?.[0] || "Standard of care",
        outcomes: "Key clinical outcomes per strategic goals"
      },
      mcdaScores: {},
      swotAnalysis: {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: []
      },
      feasibilityData: {
        estimatedCost: (data as any).budgetCeilingEur ?? null,
        timeline: (data as any).timelineCeilingMonths ?? null,
        projectedROI: null,
        recruitmentRate: null,
        completionRisk: null,
        sampleSize: null,
        sampleSizeJustification: "Provide manual justification.",
        numberOfSites: null,
        numberOfCountries: data.geography?.length ?? null,
        recruitmentPeriodMonths: null,
        followUpPeriodMonths: null,
        siteCosts: null,
        personnelCosts: null,
        materialCosts: null,
        monitoringCosts: null,
        dataCosts: null,
        regulatoryCosts: null,
        pivotalFollowOnPlan: "Define follow-on plan manually."
      },
      evidenceSources: searchResults.citations?.map((url, index) => ({ id: index + 1, url })) ?? [],
      impactAssessment: {
        labelChangePotential: "unknown",
        guidelineInfluence: "unknown",
        clinicalPracticeChange: "unknown",
        publicationTier: "unknown",
        htaImpact: "unknown",
        uptakeAcceleration: "unknown"
      },
      risks: [],
      nextActions: ["LLM disabled: manual concept curation required."],
      coverageMatrix: {}
    }
  ];
}

function buildDeterministicValidationResult(
  searchResults: { content: string; citations: string[] },
  data: any
): any {
  return {
    title: `${data.drugName || "Study"} validation summary (LLM disabled)` ,
    executiveSummary: "LLM disabled. Provide manual validation using structured checklist below.",
    methodologyReview: "Manual review required for estimand, multiplicity, missing data, and interim rules.",
    feasibilityAssessment: "Use recruitment benchmarks and sample size inputs to model feasibility manually.",
    operationalComplexity: "Assess logistical burden, vendor stack, and country startup manually.",
    competitiveLandscape: searchResults.content?.substring(0, 2000) || "Review competitive intelligence manually.",
    regulatoryConsiderations: "Confirm EMA/CHMP, EU CTR, CTIS, GDPR compliance manually.",
    risks: [],
    swotAnalysis: {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: []
    },
    mcda: {
      criteria: [
        "Scientific Rationale",
        "Unmet Need",
        "Endpoint Validity & HTA Acceptance",
        "Design Rigor",
        "Feasibility",
        "Operational Complexity",
        "Regulatory Alignment",
        "Competitive Differentiation",
        "Commercial Outlook"
      ],
      scores: [],
      notes: "LLM disabled. Populate MCDA scores manually."
    },
    economicTimelineView: "Calculate cost and readout timelines manually; avoid deterministic ROI.",
    recommendation: "manual_review_required",
    references: searchResults.citations ?? []
  };
}

function formatPromptSection(value: any): string {
  if (value === null || value === undefined) {
    return "Not provided";
  }

  if (typeof value === "string") {
    return value || "Not provided";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "Not provided";
    }
    return value
      .map(item => (typeof item === "string" ? item : JSON.stringify(item)))
      .join("\n- ");
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
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

    // Build request parameters for PICO extraction
    const picoRequestParams: any = {
      model: "gpt-4o", // Default to gpt-4o for PICO extraction
      messages: [
        {
          role: "system",
          content: "You are a clinical research expert specializing in extracting PICO framework elements from study protocols and synopses. Extract the Population, Intervention, Comparator, and Outcomes from the provided document text."
        },
        {
          role: "user",
          content: `Extract the PICO framework from the following clinical study document text. Be comprehensive and extract ALL available information for each component.

EXTRACTION GUIDELINES:
- Population: Include age range, disease type/stage, inclusion criteria, exclusion criteria, sample size if mentioned, performance status, biomarker requirements
- Intervention: Include drug name, dosing regimen, route of administration, schedule, combination therapies, treatment duration
- Comparator: Include control arm details, standard of care specifics, placebo information, active comparator drugs with dosing
- Outcomes: Include primary endpoints, secondary endpoints, safety measures, biomarker assessments, quality of life measures, statistical analysis plans

Respond in JSON format with 'population', 'intervention', 'comparator', and 'outcomes' fields. Extract as much detail as possible from the text.

DOCUMENT TEXT:
${text.substring(0, 15000)}` // Limit text length to avoid token limits
        }
      ],
      response_format: { type: "json_object" },
    };

    // Add temperature if not using o3 models
    if (!picoRequestParams.model.startsWith("o3")) {
      picoRequestParams.temperature = 0.3;
    }

    const openai = await getOpenAIClient();
    const response = await openai.chat.completions.create(picoRequestParams);

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
  const formattedGoals = data.strategicGoals.map(goal => goal.replace("_", " "));
  const extraObjectives = (data as any).strategicObjectives || [];
  const objectives = extraObjectives.length ? extraObjectives : formattedGoals;
  const therapeuticArea = (data as any).therapeuticArea || inferTherapeuticArea(data.indication);
  const mechanism = (data as any).moa || "Not specified";
  const lineOrStage = (data as any).lineOrStage || "Not specified";
  const constraints = (data as any).constraints || "None specified";
  const registryLandscape = (data as any).registryLandscape || "No registry landscape provided.";
  const intentGuidance = (data as any).intentGuidance || "No additional intent guidance provided.";
  const loeDate = (data as any).loeDate || (data as any).globalLoeDate || "Not specified";

  return `${generateJJBusinessPrompt(therapeuticArea, data.drugName)}

You are a clinical study concept generator working at J&J. Based on the following parameters and evidence, generate ${numberOfConcepts} distinct, innovative, and evidence-based clinical study concepts for ${data.drugName} in ${data.indication}. Each concept must be scientifically rigorous, operationally feasible, regionally realistic, and strategically aligned to J&J objectives.

# Parameters:
- Drug: ${data.drugName}
- Mechanism of Action (if known): ${mechanism}
- Indication: ${data.indication}
- Line of Therapy / Stage (if known): ${lineOrStage}
- Study Phase Preference: ${data.studyPhasePref}
- Geography (target execution/market): ${data.geography.join(", ")}
- Strategic Objectives: ${objectives.join(", ")}
- Target Subpopulation: ${data.targetSubpopulation || "Not specified"}
- Comparator Drugs: ${Array.isArray(data.comparatorDrugs) && data.comparatorDrugs.length ? data.comparatorDrugs.join(", ") : "Not specified"}
- Budget Ceiling (EUR): ${data.budgetCeilingEur ?? "Not specified"}
- Timeline Ceiling (Months): ${data.timelineCeilingMonths ?? "Not specified"}
- Sales Impact Threshold: ${data.salesImpactThreshold ?? "Not specified"}
- Expected LOE Date: ${loeDate}
- Constraints (optional): ${constraints}

# Evidence (literature/registries/competitors with links & dates):
${searchResults.content}
${registryLandscape}

# Intent guidance (optional):
${intentGuidance}

## CRITICAL INSTRUCTIONS:
1) FIRST, synthesize what is ALREADY KNOWN about ${data.drugName} in ${data.indication} (efficacy, safety, endpoints, standard of care, guidelines).
2) SECOND, identify SPECIFIC KNOWLEDGE GAPS aligned with the strategic objectives and target geographies.
3) THIRD, propose truly NOVEL study concepts that address those gaps and could change clinical practice or payer decisions, rather than duplicating existing trials.
4) Apply ICH E9(R1) estimand rigor, multiplicity control, and missing-data strategy. For RWE, describe confounding/bias mitigation (PSM/IPTW, diagnostics, sensitivity analyses) and GDPR/data linkage considerations.
5) Provide assumptions, formulas, ranges, and uncertainty; do not fabricate data; cite sources with URLs and dates.
6) Economic view = cost/time ranges only; no deterministic ROI. Relate timing to ${loeDate} if provided.

## DESIGN REQUIREMENTS (apply to EVERY concept):
- Hypothesis & Rationale; Novelty vs known evidence and competitors.
- Design (phase; type: Randomized | Adaptive | Platform | Basket | Pragmatic | Observational | RWE | External-control | Hybrid).
- Estimand per ICH E9(R1); Primary & key secondary endpoints (HTA-acceptable where relevant).
- Multiplicity plan; Missing-data strategy; Interim/futility and alpha spending if applicable.
- Sample size estimation with assumptions:
  • Continuous/Binary: alpha, power, effect size, variance/proportions; formula note.
  • Time-to-event: Schoenfeld assumptions; expected events & accrual.
  • Provide RANGE (low/base/high) and method note.
- Feasibility & Operational Complexity:
  • sites_needed = ceil(target_sample_size / (avg_site_rate_per_month * recruitment_months)); show p25–p75 scenarios from benchmarks where possible.
  • Country mix rationale (prevalence, SoC compatibility, diagnostics, CTIS startup timelines, competing trials).
  • Operational complexity rating (Low/Moderate/High) with drivers.
- Regulatory & HTA Readiness (EMA/CHMP, EU CTR/CTIS, GDPR; and HTA: NICE, HAS, G-BA as relevant).
- Competitive Positioning & timing vs expected competitor readouts.
- Economic & Timeline View: cost range (drivers), time to primary readout, LOE implication narrative.
- Ethics & Patient Centricity: burden minimization, fairness, monitoring/stopping.
- Impact Assessment: label change, guideline influence, clinical practice change, publication tier, HTA impact, uptake acceleration; with rationale.
- Risks & Mitigations; Kill Criteria & Next Best Actions.
- Proposal Report Structure: Title, abstract (≤150 words), and sectioned mini-proposal.

## OUTPUT SCHEMA:
Return a single JSON object strictly matching the engineering schema (no extra text):
{
  "concepts": [
    {
      "title": string,
      "drugName": string,
      "indication": string,
      "strategicGoals": string[],
      "geography": string[],
      "studyPhase": string,
      "targetSubpopulation": string | null,
      "comparatorDrugs": string[],
      "knowledgeGapAddressed": string,
      "innovationJustification": string,
      "reasonsToBelieve": {
        "scientificRationale": {
          "mechanismOfAction": string,
          "preclinicalData": string,
          "biomarkerSupport": string
        },
        "clinicalEvidence": {
          "priorPhaseData": string,
          "safetyProfile": string,
          "efficacySignals": string
        },
        "marketRegulatory": {
          "regulatoryPrecedent": string,
          "unmetNeed": string,
          "competitiveAdvantage": string,
          "strategicGoalSpecificPhaseGuidance": Record<string, string>,
          "narrative": string
        },
        "developmentFeasibility": {
          "patientAccess": string,
          "endpointViability": string,
          "operationalReadiness": string
        },
        "overallConfidence": string
      },
      "picoData": {
        "population": string,
        "intervention": string,
        "comparator": string,
        "outcomes": string
      },
      "mcdaScores": Record<string, number>,
      "swotAnalysis": {
        "strengths": string[],
        "weaknesses": string[],
        "opportunities": string[],
        "threats": string[]
      },
      "feasibilityData": {
        "estimatedCost": number,
        "timeline": number,
        "projectedROI": number,
        "recruitmentRate": number,
        "completionRisk": number,
        "sampleSize": number,
        "sampleSizeJustification": string,
        "numberOfSites": number,
        "numberOfCountries": number,
        "recruitmentPeriodMonths": number,
        "followUpPeriodMonths": number,
        "siteCosts": number,
        "personnelCosts": number,
        "materialCosts": number,
        "monitoringCosts": number,
        "dataCosts": number,
        "regulatoryCosts": number,
        "pivotalFollowOnPlan": string
      },
      "evidenceSources": {
        "title": string,
        "authors"?: string,
        "publication"?: string,
        "year"?: number,
        "citation": string,
        "url"?: string
      }[],
      "impactAssessment": {
        "labelChangePotential": string,
        "guidelineInfluence": string,
        "clinicalPracticeChange": string,
        "publicationTier": string,
        "htaImpact": string,
        "uptakeAcceleration": string
      },
      "risks": {
        "description": string,
        "likelihood": string,
        "impact": string,
        "mitigation": string
      }[],
      "nextActions": string[],
      "coverageMatrix": Record<string, boolean>
    }
  ],
  "mcdaWeights": Record<string, number>,
  "weightSensitivity": {
    "topDrivers": { "criterion": string, "base": number, "plusTwenty": number, "minusTwenty": number }[]
  },
  "portfolioSummary": {
    "headline": string,
    "recommendation": "proceed" | "revise" | "stop",
    "rationale": string[],
    "highlights": { "conceptId": string | number, "title": string, "summary": string }[],
    "warnings": string[]
  }
}

Ensure each concept is distinct, evidence-based, and aligned with the strategic objectives. Include MCDA weight logic, coverage matrix, and sensitivity analysis.`;
}

function inferTherapeuticArea(indication: string): string {
  const lower = (indication || "").toLowerCase();

  if (/(tumor|cancer|carcinoma|oncolog|sarcoma|lymphoma|leukemia|melanoma)/.test(lower)) {
    return "oncology";
  }
  if (/(psoriasis|arthritis|crohn|colitis|immune|lupus|immunolog|rheumat)/.test(lower)) {
    return "immunology";
  }
  if (/(diabetes|insulin|glucose|endocrin|metabolic)/.test(lower)) {
    return "endocrinology";
  }
  if (/(heart|cardio|arrhythm|hypertension|myocard|vascular)/.test(lower)) {
    return "cardiology";
  }
  if (/(brain|neuro|alzheimer|parkinson|epilep|stroke)/.test(lower)) {
    return "neurology";
  }
  if (/(asthma|copd|respiratory|pulmon|lung)/.test(lower)) {
    return "respiratory";
  }
  if (/(gastro|hepatic|liver|ibd|gi|colorectal)/.test(lower)) {
    return "gastroenterology";
  }
  if (/(infection|antimicrob|viral|bacterial|sepsis|pneumonia)/.test(lower)) {
    return "infectious";
  }
  if (/(rare|orphan|ultra-rare|lysosomal|mitochondrial)/.test(lower)) {
    return "rare";
  }

  return "general";
}

/**
 * Builds a prompt for synopsis validation
 */
function buildValidationPrompt(data: any, searchResults: { content?: string; citations?: string[] } = {}): string {
  const strategicGoals = Array.isArray(data.strategicGoals)
    ? data.strategicGoals.map((goal: string) => goal.replace('_', ' ')).join(', ')
    : "Not provided";

  const feasibilityData = data?.calculatedFeasibility ?? null;
  const feasibilityBlock = feasibilityData
    ? `# Pre-Calculated Feasibility Benchmarks:
- Total Cost: €${(feasibilityData.totalCost / 1_000_000).toFixed(1)}M
- Sample Size: ${feasibilityData.sampleSize}
- Timeline: ${feasibilityData.timeline} months
- Sites: ${feasibilityData.numberOfSites}
- Projected ROI (if provided): ${feasibilityData.projectedROI ?? "Not provided"}`
    : "# Pre-Calculated Feasibility Benchmarks:\nNot provided";

  const researchContent = searchResults?.content && searchResults.content.trim().length > 0
    ? searchResults.content
    : "No external research executed. Provide validation based on internal knowledge and provided synopsis.";

  const researchCitations = Array.isArray(searchResults?.citations) && searchResults!.citations!.length > 0
    ? searchResults!.citations!.map((citation, index) => `  - [${index + 1}] ${citation}`).join('\n')
    : "  - None provided";

  return `${ADVANCED_VALIDATION_SYSTEM_PROMPT}

## validate_synopsis Task
- Description: Analyze the provided clinical study synopsis and produce a structured, evidence-based validation report. Integrate literature research, regulatory intelligence, feasibility benchmarks, operational complexity evaluation, and competitive intelligence to assess scientific validity, methodological rigor, feasibility, operational execution complexity, strategic alignment, regulatory/HTA compliance, competitive positioning, and economic/timeline considerations.

## Inputs
- Study Parameters:
  - Drug: ${data.drugName || "Not provided"}
  - Mechanism of Action: ${(data as any).moa || "Not provided"}
  - Indication: ${data.indication || "Not provided"}
  - Study Phase: ${data.studyPhase || data.studyPhasePref || "Not provided"}
  - Design Overview: ${(data as any).design || "Not provided"}
  - Primary Endpoint: ${(data as any).primaryEndpoint || "Not provided"}
  - Key Secondary Endpoints: ${formatPromptSection((data as any).secondaryEndpoints)}
  - Target Sample Size: ${(data as any).sampleSize || "Not provided"}
  - Regions/Countries: ${formatPromptSection((data as any).regions || data.geography)}
  - Strategic Goals: ${strategicGoals}
  - Expected LOE Date: ${(data as any).loeDate || (data as any).globalLoeDate || "Not provided"}
- Document Text: ${data.documentText ? data.documentText.substring(0, 10000) : "Not provided"}
- Literature Research Results: ${formatPromptSection((data as any).literatureResearch || searchResults.content)}
- Web Research Results: ${formatPromptSection((data as any).webResearch || searchResults.content)}
- Recruitment Benchmarks: ${formatPromptSection((data as any).recruitmentData)}
- Generated Queries: ${formatPromptSection((data as any).queries)}
- Extracted PICO Framework:
  - Population: ${data.extractedPico?.population || "Not provided"}
  - Intervention: ${data.extractedPico?.intervention || "Not provided"}
  - Comparator: ${data.extractedPico?.comparator || "Not provided"}
  - Outcomes: ${data.extractedPico?.outcomes || "Not provided"}
- Citations from Research Rounds:
${researchCitations}
${feasibilityBlock}

## Critical Analysis Focus
1. Methodological Rigor
   - Evaluate sample size assumptions (effect size, power, alpha) and justify using evidence.
   - Confirm multiplicity control and estimand definition per ICH E9(R1).
   - Assess missing-data strategy, sensitivity analyses, and interim/adaptive design rules.
2. Scientific Validity & Clinical Relevance
   - Confirm endpoint acceptability for EMA/HTA.
   - Evaluate external validity: population definition, biomarker/testing readiness.
3. Feasibility Assessment
   - Model recruitment using benchmarks; compute \`sites = ceil(sample_size / (avg_rate_per_site_per_month * recruitment_months))\`.
   - Provide p25–p75 ranges and flag missing inputs.
4. Operational Execution Complexity
   - Assess procedures, imaging/biopsies, PK sampling, visit intensity, IP logistics, vendor dependencies, and country-specific startup timelines.
   - Assign complexity score (Low/Moderate/High) with rationale.
5. Regulatory & HTA Readiness
   - Evaluate EMA/CHMP, EU CTR/CTIS, GDPR compliance and country-specific issues.
   - Ensure HTA alignment for NICE, HAS, G-BA comparators/endpoints.
6. Competitive Landscape Analysis
   - Map ongoing trials, expected readouts, differentiation vs SoC, and timing vs LOE.
7. Risk Identification & Mitigation
   - List risks by category (scientific, operational, regulatory) with severity and mitigations.
8. Economic & Timeline Considerations
   - Estimate time to primary readout vs LOE; provide cost/timeline ranges without deterministic ROI.
9. SWOT Analysis
   - Tailor strengths/weaknesses/opportunities/threats to drug, population, and clinical practice.
10. MCDA Scoring
    - Score 0–5 with weights: Scientific Rationale 0.15, Unmet Need 0.10, Endpoint Validity & HTA Acceptance 0.10, Design Rigor 0.15, Feasibility 0.15, Operational Complexity 0.10, Regulatory Alignment 0.10, Competitive Differentiation 0.05, Commercial Outlook 0.10.
    - Normalize to 0–100 and provide ±20% weight sensitivity.
11. Final Recommendation
    - Choose Proceed / Recommend with Changes / Not Recommended and list required changes.

## Required Output Schema (JSON)
{
  "title": string,
  "executiveSummary": string,
  "evidenceMap": { "sources": { "id": string | number, "type": "literature" | "regulatory" | "competitive" | "operational", "title": string, "url": string, "date": string, "relevance": string }[] },
  "methodologyReview": {
    "estimand": string,
    "sampleSize": { "assumptions": string, "sensitivity": string },
    "multiplicity": string,
    "missingData": string,
    "interimDesign": string
  },
  "feasibilityAssessment": {
    "recruitmentModel": string,
    "sitesCalculation": {
      "formula": "sites = ceil(sample_size / (avg_rate_per_site_per_month * recruitment_months))",
      "inputs": { "sampleSize": number, "avgRatePerSitePerMonth": number, "recruitmentMonths": number },
      "result": { "base": number, "p25": number, "p75": number }
    },
    "uncertainty": string,
    "flags": string[]
  },
  "operationalComplexity": {
    "score": "Low" | "Moderate" | "High",
    "rationale": string,
    "drivers": string[]
  },
  "regulatoryHta": {
    "emaChmp": string,
    "euCtrCtis": string,
    "gdpr": string,
    "htaAlignment": { "nice": string, "has": string, "gba": string }
  },
  "competitiveLandscape": {
    "standardOfCare": string,
    "directCompetitors": { "name": string, "stage": string, "readout": string, "differentiation": string }[],
    "emerging": { "name": string, "stage": string, "expectedImpact": string }[],
    "timingVsLoe": string
  },
  "riskRegister": { "category": string, "description": string, "severity": "low" | "medium" | "high", "mitigation": string }[],
  "swotAnalysis": { "strengths": string[], "weaknesses": string[], "opportunities": string[], "threats": string[] },
  "mcda": {
    "scores": { "scientificRationale": number, "unmetNeed": number, "endpointValidityHta": number, "designRigor": number, "feasibility": number, "operationalComplexity": number, "regulatoryAlignment": number, "competitiveDifferentiation": number, "commercialOutlook": number },
    "weights": { "scientificRationale": 0.15, "unmetNeed": 0.10, "endpointValidityHta": 0.10, "designRigor": 0.15, "feasibility": 0.15, "operationalComplexity": 0.10, "regulatoryAlignment": 0.10, "competitiveDifferentiation": 0.05, "commercialOutlook": 0.10 },
    "total": number,
    "sensitivity": { "plus20": { [criterion: string]: number }, "minus20": { [criterion: string]: number } }
  },
  "economicTimelineView": {
    "costRange": string,
    "timeline": string,
    "loeContext": string
  },
  "finalRecommendation": {
    "status": "proceed" | "recommend_with_changes" | "not_recommended",
    "rationale": string,
    "requiredActions": string[]
  },
  "dataGaps": string[],
  "nextSteps": string[]
}

## Expectations
- Provide evidence-backed, constructive validation aligned with strategic goals.
- Highlight any discrepancies between proposed study population and current approvals.
- When data is missing, flag gaps and recommend next steps instead of fabricating values.
- Maintain factual accuracy and cite sources wherever possible.`;
}
