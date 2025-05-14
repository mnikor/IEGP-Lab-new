import React from 'react';
import { FeasibilityData } from '@/lib/types';
import { BrainCircuit, BarChart3, DollarSign, Users, Clock } from 'lucide-react';

interface FeasibilityDetailsProps {
  feasibilityData: FeasibilityData;
  className?: string;
}

const FeasibilityDetails: React.FC<FeasibilityDetailsProps> = ({ feasibilityData, className = '' }) => {
  if (!feasibilityData) {
    return null;
  }

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) {
      return '€0';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  // Ensure all costs have valid values, not undefined
  const siteCosts = feasibilityData.siteCosts ?? 0;
  const personnelCosts = feasibilityData.personnelCosts ?? 0;
  const materialCosts = feasibilityData.materialCosts ?? 0;
  const monitoringCosts = feasibilityData.monitoringCosts ?? 0;
  const dataCosts = feasibilityData.dataCosts ?? 0;
  const regulatoryCosts = feasibilityData.regulatoryCosts ?? 0;
  
  // Ensure total cost is a valid number and is at least the sum of components if unspecified
  const sumComponentCosts = siteCosts + personnelCosts + materialCosts + monitoringCosts + dataCosts + regulatoryCosts;
  const totalCost = feasibilityData.estimatedCost ?? sumComponentCosts;
  
  // Recalculate total if provided total is too small compared to components
  const effectiveTotalCost = Math.max(totalCost, sumComponentCosts);
  
  // Ensure timeline components have valid values
  const recruitmentPeriodMonths = feasibilityData.recruitmentPeriodMonths ?? 6;
  const followUpPeriodMonths = feasibilityData.followUpPeriodMonths ?? 12;
  
  // Calculate total timeline or use provided value if available
  const calculatedTimeline = recruitmentPeriodMonths + followUpPeriodMonths;
  const timeline = feasibilityData.timeline ?? calculatedTimeline;
  
  // Ensure timeline is at least the sum of recruitment and follow-up
  const effectiveTimeline = Math.max(timeline, calculatedTimeline);
  
  const getCostPercentage = (cost: number | undefined) => {
    if (!cost || !effectiveTotalCost) return 0;
    return Math.round((cost / effectiveTotalCost) * 100);
  };

  return (
    <div className={`${className} space-y-4`}>
      {/* Sample Size and Site Details */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-neutral-dark">Study Size & Structure</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start space-x-2">
            <Users className="h-5 w-5 text-primary mt-1" />
            <div>
              <p className="text-sm font-medium">Sample Size: {typeof feasibilityData.sampleSize === 'number' ? Math.round(feasibilityData.sampleSize) : 'N/A'} participants</p>
              <p className="text-xs text-neutral-medium">{feasibilityData.sampleSizeJustification ? feasibilityData.sampleSizeJustification.replace(/\d+\.\d+/, Math.round(parseFloat(feasibilityData.sampleSizeJustification.match(/\d+\.\d+/)?.[0] || '0')).toString()) : 'Sample size based on statistical power analysis'}</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <BrainCircuit className="h-5 w-5 text-primary mt-1" />
            <div>
              <p className="text-sm font-medium">{feasibilityData.numberOfSites || 0} sites across {feasibilityData.numberOfCountries || 0} {(feasibilityData.numberOfCountries || 0) === 1 ? 'country' : 'countries'}</p>
              <p className="text-xs text-neutral-medium">Complexity factor: {
                typeof feasibilityData.complexityFactor === 'number' 
                  ? feasibilityData.complexityFactor.toFixed(2)
                  : '1.00'
              }</p>
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
            <span className="text-sm font-medium">{recruitmentPeriodMonths} months</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm">Follow-up Period</span>
            </div>
            <span className="text-sm font-medium">{followUpPeriodMonths} months</span>
          </div>
          <div className="flex items-center justify-between border-t pt-2 border-neutral-light">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-primary-dark" />
              <span className="text-sm font-medium">Total Timeline</span>
            </div>
            <span className="text-sm font-medium">{effectiveTimeline} months</span>
          </div>
          <div className="mt-1">
            <p className="text-xs text-neutral-medium">
              Total timeline is from FPI (First Patient In) to completion of follow-up
            </p>
            {feasibilityData.estimatedFpiDate && (
              <p className="text-xs text-primary-dark font-medium mt-1">
                Estimated FPI Date: {new Date(feasibilityData.estimatedFpiDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            )}
            <p className="text-xs text-neutral-medium mt-1">
              Expected recruitment rate: {
                typeof feasibilityData.recruitmentRate === 'number'
                  ? (feasibilityData.recruitmentRate * 100).toFixed(0) 
                  : '50'
              }% of target
              {typeof feasibilityData.dropoutRate === 'number' && feasibilityData.dropoutRate > 0 
                ? ` • Estimated dropout rate: ${(feasibilityData.dropoutRate * 100).toFixed(0)}%` 
                : ''}
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
              <span className="text-sm font-medium">{formatCurrency(siteCosts)}</span>
              <span className="text-xs text-neutral-medium">({getCostPercentage(siteCosts)}%)</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm">Personnel Costs</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{formatCurrency(personnelCosts)}</span>
              <span className="text-xs text-neutral-medium">({getCostPercentage(personnelCosts)}%)</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm">Materials & Supplies</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{formatCurrency(materialCosts)}</span>
              <span className="text-xs text-neutral-medium">({getCostPercentage(materialCosts)}%)</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm">Monitoring</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{formatCurrency(monitoringCosts)}</span>
              <span className="text-xs text-neutral-medium">({getCostPercentage(monitoringCosts)}%)</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm">Data Management</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{formatCurrency(dataCosts)}</span>
              <span className="text-xs text-neutral-medium">({getCostPercentage(dataCosts)}%)</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm">Regulatory Fees</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{formatCurrency(regulatoryCosts)}</span>
              <span className="text-xs text-neutral-medium">({getCostPercentage(regulatoryCosts)}%)</span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t pt-2 border-neutral-light">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-primary-dark" />
              <span className="text-sm font-medium">Total Cost</span>
            </div>
            <span className="text-sm font-medium">{formatCurrency(effectiveTotalCost)}</span>
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
              <p className="text-sm font-medium">Projected ROI: {
                typeof feasibilityData.projectedROI === 'number' 
                  ? feasibilityData.projectedROI.toFixed(1) 
                  : '2.5'
              }x</p>
              <p className="text-xs text-neutral-medium">5-year NPV model with {
                typeof feasibilityData.completionRisk === 'number' 
                  ? (feasibilityData.completionRisk * 100).toFixed(0) 
                  : '20'
              }% completion risk</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeasibilityDetails;