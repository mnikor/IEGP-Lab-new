import { FeasibilityData, McDAScore } from './types';

export interface ConfidenceLevel {
  level: 'High' | 'Medium-High' | 'Medium' | 'Medium-Low' | 'Low';
  color: string;
  description: string;
  explanation: string;
  successRate: string;
  keyFactors: string[];
}

/**
 * Determines confidence level based on feasibility data and MCDA scores
 */
export function calculateConfidenceLevel(
  feasibilityData?: FeasibilityData,
  mcdaScores?: McDAScore
): ConfidenceLevel {
  if (!feasibilityData && !mcdaScores) {
    return {
      level: 'Medium',
      color: 'text-yellow-600',
      description: 'Moderate confidence',
      explanation: 'Limited data available for assessment',
      successRate: '50-70%',
      keyFactors: ['Insufficient data for full assessment']
    };
  }

  // Calculate composite score from available data
  let score = 0;
  let factors = 0;

  // Feasibility factors (0-1 scale each)
  if (feasibilityData) {
    // Recruitment rate (higher is better)
    if (feasibilityData.recruitmentRate >= 0.8) score += 0.9;
    else if (feasibilityData.recruitmentRate >= 0.6) score += 0.7;
    else if (feasibilityData.recruitmentRate >= 0.4) score += 0.5;
    else score += 0.3;
    factors++;

    // Completion risk (lower is better)
    if (feasibilityData.completionRisk <= 0.2) score += 0.9;
    else if (feasibilityData.completionRisk <= 0.3) score += 0.7;
    else if (feasibilityData.completionRisk <= 0.5) score += 0.5;
    else score += 0.3;
    factors++;

    // ROI (higher is better)
    if (feasibilityData.projectedROI >= 3.0) score += 0.9;
    else if (feasibilityData.projectedROI >= 2.0) score += 0.7;
    else if (feasibilityData.projectedROI >= 1.5) score += 0.5;
    else score += 0.3;
    factors++;
  }

  // MCDA scores (1-5 scale, convert to 0-1)
  if (mcdaScores) {
    if (mcdaScores.feasibility) {
      score += (mcdaScores.feasibility - 1) / 4;
      factors++;
    }
    if (mcdaScores.overall) {
      score += (mcdaScores.overall - 1) / 4;
      factors++;
    }
  }

  // Calculate average score
  const avgScore = factors > 0 ? score / factors : 0.5;

  // Determine confidence level based on composite score
  if (avgScore >= 0.85) {
    return {
      level: 'High',
      color: 'text-green-600',
      description: 'High confidence',
      explanation: 'Strong likelihood of successful execution with minimal risks',
      successRate: '85-95%',
      keyFactors: [
        'Excellent recruitment feasibility (≥80%)',
        'Low completion risk (≤20%)',
        'Strong financial returns (ROI ≥3.0)',
        'Proven study design'
      ]
    };
  } else if (avgScore >= 0.7) {
    return {
      level: 'Medium-High',
      color: 'text-lime-600',
      description: 'Medium-high confidence',
      explanation: 'Good probability of success with manageable risks',
      successRate: '70-85%',
      keyFactors: [
        'Good recruitment rate (60-80%)',
        'Moderate completion risk (20-30%)',
        'Solid financial returns (ROI ≥2.0)',
        'Some complexity but manageable'
      ]
    };
  } else if (avgScore >= 0.5) {
    return {
      level: 'Medium',
      color: 'text-yellow-600',
      description: 'Medium confidence',
      explanation: 'Moderate success probability with notable risks to address',
      successRate: '50-70%',
      keyFactors: [
        'Moderate recruitment challenges (40-60%)',
        'Higher completion risk (30-50%)',
        'Reasonable returns (ROI 1.5-2.0)',
        'Complex design requires mitigation'
      ]
    };
  } else if (avgScore >= 0.35) {
    return {
      level: 'Medium-Low',
      color: 'text-orange-600',
      description: 'Medium-low confidence',
      explanation: 'Significant challenges requiring risk mitigation strategies',
      successRate: '35-50%',
      keyFactors: [
        'Challenging recruitment (<40%)',
        'High completion risk (>50%)',
        'Lower returns (ROI <1.5)',
        'Complex regulatory landscape'
      ]
    };
  } else {
    return {
      level: 'Low',
      color: 'text-red-600',
      description: 'Low confidence',
      explanation: 'Major redesign or alternative approaches recommended',
      successRate: '<35%',
      keyFactors: [
        'Poor recruitment prospects',
        'Very high completion risk',
        'Questionable financial returns',
        'Significant execution barriers'
      ]
    };
  }
}

/**
 * Get confidence level display properties for UI
 */
export function getConfidenceBadgeProps(confidenceLevel: ConfidenceLevel) {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  switch (confidenceLevel.level) {
    case 'High':
      return {
        className: `${baseClasses} bg-green-100 text-green-800`,
        variant: 'default' as const
      };
    case 'Medium-High':
      return {
        className: `${baseClasses} bg-lime-100 text-lime-800`,
        variant: 'default' as const
      };
    case 'Medium':
      return {
        className: `${baseClasses} bg-yellow-100 text-yellow-800`,
        variant: 'default' as const
      };
    case 'Medium-Low':
      return {
        className: `${baseClasses} bg-orange-100 text-orange-800`,
        variant: 'default' as const
      };
    case 'Low':
      return {
        className: `${baseClasses} bg-red-100 text-red-800`,
        variant: 'destructive' as const
      };
    default:
      return {
        className: `${baseClasses} bg-gray-100 text-gray-800`,
        variant: 'secondary' as const
      };
  }
}