/**
 * Standardized strategic goals used across the application
 * This provides a single source of truth for all strategic goals
 */

export interface StrategicGoal {
  id: string;
  label: string;
  description: string;
  tooltip: string;
}

export const STRATEGIC_GOALS: StrategicGoal[] = [
  {
    id: 'expand_label',
    label: 'Expand Label',
    description: 'New indication, line of therapy, paediatric use',
    tooltip: 'Generate pivotal data to win a new label claim.'
  },
  {
    id: 'defend_market_share',
    label: 'Defend Market Share',
    description: 'Head-to-head vs. competitor, biosimilar threat',
    tooltip: 'Show superiority or non-inferiority to protect share.'
  },
  {
    id: 'accelerate_uptake',
    label: 'Accelerate Uptake',
    description: 'Underperforming launch, drive prescriber confidence',
    tooltip: 'Real-world or pragmatic data to speed physician adoption.'
  },
  {
    id: 'facilitate_market_access',
    label: 'Facilitate Market Access',
    description: 'Pricing/reimbursement dossier gaps',
    tooltip: 'Produce health-economics & payer-relevant evidence.'
  },
  {
    id: 'generate_real_world_evidence',
    label: 'Generate Real-World Evidence',
    description: 'Safety surveillance, effectiveness in routine care',
    tooltip: 'Registries, claims, EMR studies for post-approval insight.'
  },
  {
    id: 'optimise_dosing',
    label: 'Optimise Dosing / Formulation',
    description: 'IV→SC switch, less frequent dosing',
    tooltip: 'Lower burden, improve adherence, unlock premium price.'
  },
  {
    id: 'validate_biomarker',
    label: 'Validate Biomarker / MOA',
    description: 'Companion Dx, precision-medicine play',
    tooltip: 'Link biomarker to response, enable targeted positioning.'
  },
  {
    id: 'manage_safety_risk',
    label: 'Manage Safety & Risk',
    description: 'PASS, REMS, black-box mitigation',
    tooltip: 'Post-authorisation safety commitments and rare AE capture.'
  },
  {
    id: 'extend_lifecycle_combinations',
    label: 'Extend Lifecycle via Combinations',
    description: 'Add-on or combo therapy to refresh IP',
    tooltip: 'Show synergy with Drug Y and prolong revenue tail.'
  },
  {
    id: 'secure_initial_approval',
    label: 'Secure Initial Label Approval',
    description: 'First-in-class or first in indication',
    tooltip: 'Pivotal efficacy & safety evidence for very first approval.'
  },
  {
    id: 'demonstrate_poc',
    label: 'Demonstrate Mechanism Proof-of-Concept',
    description: 'Early-signal, Go/No-Go decision',
    tooltip: 'Biomarker/PD endpoints to justify Phase 3 investment.'
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Custom strategic goal',
    tooltip: 'Specify a custom strategic goal not covered by the standard options.'
  }
];

// Helper function to get a goal by ID
export function getGoalById(id: string): StrategicGoal | undefined {
  return STRATEGIC_GOALS.find(goal => goal.id === id);
}

// Helper function to get a goal by label
export function getGoalByLabel(label: string): StrategicGoal | undefined {
  return STRATEGIC_GOALS.find(goal => goal.label === label);
}

// Get only the labels for dropdown lists
export function getGoalLabels(): string[] {
  return STRATEGIC_GOALS.map(goal => goal.label);
}

// Convert labels to IDs for data storage
export function labelsToIds(labels: string[]): string[] {
  return labels.map(label => {
    const goal = getGoalByLabel(label);
    return goal ? goal.id : label.toLowerCase().replace(/\s+/g, '_');
  });
}

// Convert IDs to labels for display
export function idsToLabels(ids: string[]): string[] {
  return ids.map(id => {
    const goal = getGoalById(id);
    return goal ? goal.label : id.replace(/_/g, ' ');
  });
}