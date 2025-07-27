import React from 'react';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { calculateConfidenceLevel, getConfidenceBadgeProps, ConfidenceLevel as ConfidenceLevelType } from '@/lib/confidenceUtils';
import { FeasibilityData, McDAScore } from '@/lib/types';

interface ConfidenceLevelProps {
  feasibilityData?: FeasibilityData;
  mcdaScores?: McDAScore;
  className?: string;
  showIcon?: boolean;
  showTooltip?: boolean;
}

export default function ConfidenceLevel({
  feasibilityData,
  mcdaScores,
  className = '',
  showIcon = true,
  showTooltip = true
}: ConfidenceLevelProps) {
  const confidenceLevel = calculateConfidenceLevel(feasibilityData, mcdaScores);
  const badgeProps = getConfidenceBadgeProps(confidenceLevel);

  const ConfidenceDisplay = () => (
    <div className={`flex items-center gap-1 ${className}`}>
      <Badge className={badgeProps.className}>
        {confidenceLevel.level} Confidence
      </Badge>
      {showIcon && showTooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
            </TooltipTrigger>
            <TooltipContent className="max-w-sm p-4" side="bottom">
              <div className="space-y-3">
                <div>
                  <div className="font-medium text-sm mb-1">
                    {confidenceLevel.level} Confidence ({confidenceLevel.successRate} success rate)
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {confidenceLevel.explanation}
                  </p>
                </div>
                
                <div>
                  <div className="font-medium text-xs mb-2">Key Factors:</div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {confidenceLevel.keyFactors.map((factor, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-block w-1 h-1 rounded-full bg-current mt-1.5 mr-2 flex-shrink-0"></span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>

                {feasibilityData && (
                  <div className="pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium">Recruitment:</span>
                        <span className="ml-1 text-muted-foreground">
                          {feasibilityData.recruitmentRate ? Math.round(feasibilityData.recruitmentRate * 100) : 'N/A'}%
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Risk:</span>
                        <span className="ml-1 text-muted-foreground">
                          {feasibilityData.completionRisk ? Math.round(feasibilityData.completionRisk * 100) : 'N/A'}%
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">ROI:</span>
                        <span className="ml-1 text-muted-foreground">
                          {feasibilityData.projectedROI ? feasibilityData.projectedROI.toFixed(1) : 'N/A'}x
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Timeline:</span>
                        <span className="ml-1 text-muted-foreground">
                          {feasibilityData.timeline || 'N/A'}mo
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {showIcon && !showTooltip && (
        <Info className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );

  return <ConfidenceDisplay />;
}

// Export individual confidence level component for direct use
export function ConfidenceLevelBadge({
  level,
  showIcon = false,
  className = ''
}: {
  level: ConfidenceLevelType;
  showIcon?: boolean;
  className?: string;
}) {
  const badgeProps = getConfidenceBadgeProps(level);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Badge className={badgeProps.className}>
        {level.level} Confidence
      </Badge>
      {showIcon && (
        <Info className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}