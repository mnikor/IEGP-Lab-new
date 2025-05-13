import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FeasibilityData } from '@/lib/types';
import { ArrowRight, BrainCircuit, BarChart3, DollarSign, Users, Clock } from 'lucide-react';

interface FeasibilityDetailsProps {
  feasibilityData: FeasibilityData;
  className?: string;
}

const FeasibilityDetails: React.FC<FeasibilityDetailsProps> = ({ feasibilityData, className = '' }) => {
  if (!feasibilityData) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  // Calculate total cost and percentages
  const totalCost = feasibilityData.estimatedCost;
  const getCostPercentage = (cost: number) => Math.round((cost / totalCost) * 100);

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-neutral-dark">Detailed Feasibility Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sample Size and Site Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neutral-dark">Study Size & Structure</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start space-x-2">
              <Users className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="text-sm font-medium">Sample Size: {feasibilityData.sampleSize} participants</p>
                <p className="text-xs text-neutral-medium">{feasibilityData.sampleSizeJustification}</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <BrainCircuit className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="text-sm font-medium">{feasibilityData.numberOfSites} sites across {feasibilityData.numberOfCountries} {feasibilityData.numberOfCountries === 1 ? 'country' : 'countries'}</p>
                <p className="text-xs text-neutral-medium">Complexity factor: {feasibilityData.complexityFactor.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neutral-dark">Timeline Breakdown</h4>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm">Recruitment Period</span>
              </div>
              <span className="text-sm font-medium">{feasibilityData.recruitmentPeriodMonths} months</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm">Follow-up Period</span>
              </div>
              <span className="text-sm font-medium">{feasibilityData.followUpPeriodMonths} months</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2 border-neutral-light">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-primary-dark" />
                <span className="text-sm font-medium">Total Timeline</span>
              </div>
              <span className="text-sm font-medium">{feasibilityData.timeline} months</span>
            </div>
            <div className="mt-1">
              <p className="text-xs text-neutral-medium">
                Expected recruitment rate: {(feasibilityData.recruitmentRate * 100).toFixed(0)}% of target
                {feasibilityData.dropoutRate > 0 && ` • Estimated dropout rate: ${(feasibilityData.dropoutRate * 100).toFixed(0)}%`}
              </p>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neutral-dark">Cost Breakdown</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm">Site Costs</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{formatCurrency(feasibilityData.siteCosts)}</span>
                <span className="text-xs text-neutral-medium">({getCostPercentage(feasibilityData.siteCosts)}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm">Personnel Costs</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{formatCurrency(feasibilityData.personnelCosts)}</span>
                <span className="text-xs text-neutral-medium">({getCostPercentage(feasibilityData.personnelCosts)}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm">Materials & Supplies</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{formatCurrency(feasibilityData.materialCosts)}</span>
                <span className="text-xs text-neutral-medium">({getCostPercentage(feasibilityData.materialCosts)}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm">Monitoring</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{formatCurrency(feasibilityData.monitoringCosts)}</span>
                <span className="text-xs text-neutral-medium">({getCostPercentage(feasibilityData.monitoringCosts)}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm">Data Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{formatCurrency(feasibilityData.dataCosts)}</span>
                <span className="text-xs text-neutral-medium">({getCostPercentage(feasibilityData.dataCosts)}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm">Regulatory Fees</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{formatCurrency(feasibilityData.regulatoryCosts)}</span>
                <span className="text-xs text-neutral-medium">({getCostPercentage(feasibilityData.regulatoryCosts)}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t pt-2 border-neutral-light">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-primary-dark" />
                <span className="text-sm font-medium">Total Cost</span>
              </div>
              <span className="text-sm font-medium">{formatCurrency(feasibilityData.estimatedCost)}</span>
            </div>
          </div>
        </div>

        {/* ROI & Risk */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neutral-dark">Financial Impact</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start space-x-2">
              <BarChart3 className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="text-sm font-medium">Projected ROI: {feasibilityData.projectedROI.toFixed(1)}x</p>
                <p className="text-xs text-neutral-medium">5-year NPV model with {(feasibilityData.completionRisk * 100).toFixed(0)}% completion risk</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeasibilityDetails;