import React from 'react';
import { FeasibilityData, RegionalCostBreakdown, VendorSpendSummary, ScenarioOutcome } from '@/lib/types';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar
} from 'recharts';
import { 
  BrainCircuit, 
  DollarSign, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Target,
  Calendar,
  Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface FeasibilityDashboardProps {
  feasibilityData: FeasibilityData;
  className?: string;
}

const FeasibilityDashboard: React.FC<FeasibilityDashboardProps> = ({ feasibilityData, className = '' }) => {
  // Helper function for parsing potentially string values to numbers
  const parseNumber = (value: any, defaultValue: number): number => {
    if (typeof value === 'string') return parseFloat(value) || defaultValue;
    if (typeof value === 'number') return value;
    return defaultValue;
  };

  // Enhanced data parsing to handle JSON serialization string conversions

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

  const formatCurrencyBy = (value: number | undefined, currency: 'EUR' | 'USD') => {
    if (value === undefined || value === null) {
      return currency === 'USD' ? '$0' : '€0';
    }
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    return formatter.format(value);
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null) return '0%';
    return `${Math.round(value * 100)}%`;
  };

  const formatMultiplier = (value: number | undefined) => {
    if (value === undefined || value === null) return '0x';
    const numValue = parseNumber(value, 0);
    if (numValue === 0) return '0x';
    return `${numValue.toFixed(1)}x`;
  };

  // Prepare cost breakdown data for pie chart with proper number parsing
  const costBreakdownData = [
    { name: 'Site Activation & Maintenance', value: parseNumber(feasibilityData.siteCosts, 0), color: '#8884d8' },
    { name: 'Personnel (FTE Support)', value: parseNumber(feasibilityData.personnelCosts, 0), color: '#82ca9d' },
    { name: 'Study Materials & IMP', value: parseNumber(feasibilityData.materialCosts, 0), color: '#ffc658' },
    { name: 'Monitoring & Oversight', value: parseNumber(feasibilityData.monitoringCosts, 0), color: '#ff7c7c' },
    { name: 'Data & Analytics', value: parseNumber(feasibilityData.dataCosts, 0), color: '#8dd1e1' },
    { name: 'Regulatory & Compliance', value: parseNumber(feasibilityData.regulatoryCosts, 0), color: '#d084d0' },
    { name: 'Vendor Overlays', value: parseNumber(feasibilityData.vendorCosts, 0), color: '#6c5ce7' }
  ].filter(item => item.value > 0);

  // Risk vs ROI scatter plot data with reference points for context
  // Ensure numeric conversion since JSON serialization may convert to strings
  const currentRisk = parseNumber(feasibilityData.completionRisk, 0) * 100;
  const currentROI = parseNumber(feasibilityData.projectedROI, 0);
  
  const riskRoiData = [
    // Current study - make it prominent
    {
      risk: currentRisk,
      roi: currentROI,
      name: 'Current Study',
      size: 150,
      color: '#2563eb'
    },
    // Industry benchmarks based on study phases and types
    {
      risk: 20,
      roi: 1.8,
      name: 'Phase II Oncology',
      size: 80,
      color: '#10b981'
    },
    {
      risk: 35,
      roi: 3.2,
      name: 'Phase III Pivotal',
      size: 80,
      color: '#f59e0b'
    },
    {
      risk: 45,
      roi: 2.0,
      name: 'High Risk/Moderate Return',
      size: 70,
      color: '#ef4444'
    },
    {
      risk: 15,
      roi: 1.3,
      name: 'Low Risk/Conservative',
      size: 70,
      color: '#8b5cf6'
    },
    {
      risk: 25,
      roi: 4.5,
      name: 'Breakthrough Therapy',
      size: 90,
      color: '#06b6d4'
    }
  ];

  // Timeline breakdown data with proper string-to-number conversion and minimum values
  const timelineTotal = parseNumber(feasibilityData.timeline, 24);
  const recruitmentMonths = parseNumber(feasibilityData.recruitmentPeriodMonths, 0) || Math.max(6, Math.round(timelineTotal * 0.4));
  const followUpMonths = parseNumber(feasibilityData.followUpPeriodMonths, 0) || Math.max(3, Math.round(timelineTotal * 0.3));
  const analysisMonths = Math.max(2, timelineTotal - recruitmentMonths - followUpMonths);
  
  // Ensure all timeline values are properly parsed
  
  const timelineData = [
    { 
      phase: 'Recruitment', 
      months: recruitmentMonths,
      color: '#8884d8'
    },
    { 
      phase: 'Follow-up', 
      months: followUpMonths,
      color: '#82ca9d'
    },
    { 
      phase: 'Analysis & Report', 
      months: analysisMonths,
      color: '#ffc658'
    }
  ];
  


  const recruitmentProgress = parseNumber(feasibilityData.recruitmentRate, 0) * 100;
  const completionRisk = parseNumber(feasibilityData.completionRisk, 0) * 100;

  const regionalBreakdown = (feasibilityData.regionalCostBreakdown || []).map((region: RegionalCostBreakdown, index: number) => {
    const operationalCost = parseNumber(region.patientVisitCost, 0) + parseNumber(region.siteStartupCost, 0) + parseNumber(region.monitoringCost, 0) + parseNumber(region.regulatoryCost, 0) + parseNumber(region.patientIncentives, 0);
    const vendorSpend = parseNumber(region.vendorSpend, 0);
    const total = parseNumber(region.totalCost, operationalCost + vendorSpend);
    return {
      key: `${region.regionId}-${index}`,
      displayName: region.displayName,
      patients: parseNumber(region.patients, 0),
      sites: parseNumber(region.sites, 0),
      share: parseNumber(region.patientShare, 0),
      operationalCost,
      vendorSpend,
      total,
      notes: region.notes,
    };
  });

  const vendorBreakdown = (feasibilityData.vendorSpendSummary || []).map((vendor: VendorSpendSummary) => ({
    vendorId: vendor.vendorId,
    displayName: vendor.displayName,
    category: vendor.category,
    totalSpend: parseNumber(vendor.totalSpend, 0),
    markupSpend: parseNumber(vendor.markupSpend, 0),
    retainerSpend: parseNumber(vendor.retainerSpend, 0),
    fxBufferSpend: parseNumber(vendor.fxBufferSpend, 0),
  })).filter((vendor) => vendor.totalSpend > 0);

  const scenarioAnalysis = (feasibilityData.scenarioAnalysis || []).map((scenario: ScenarioOutcome) => ({
    scenario: scenario.scenario,
    estimatedCost: parseNumber(scenario.estimatedCost, 0),
    timeline: parseNumber(scenario.timeline, 0),
    projectedROI: parseNumber(scenario.projectedROI, 0),
    incrementalSalesUsd: parseNumber(scenario.incrementalSalesUsd, 0),
    incrementalSalesEur: parseNumber(scenario.incrementalSalesEur, 0),
    eNpvUsd: parseNumber(scenario.eNpvUsd, 0),
    eNpvEur: parseNumber(scenario.eNpvEur, 0),
  }));

  const totalIncrementalSalesUsd = parseNumber(feasibilityData.totalIncrementalSalesUsd, 0);
  const totalIncrementalSalesEur = parseNumber(feasibilityData.totalIncrementalSalesEur, 0);
  const economicNetPresentValueUsd = parseNumber(feasibilityData.economicNetPresentValueUsd, 0);
  const economicNetPresentValueEur = parseNumber(feasibilityData.economicNetPresentValueEur, 0);
  const riskAdjustedEnpvUsd = parseNumber(feasibilityData.riskAdjustedENpvUsd, economicNetPresentValueUsd);
  const riskAdjustedEnpvEur = parseNumber(feasibilityData.riskAdjustedENpvEur, economicNetPresentValueEur);
  const regionalRevenueForecast = feasibilityData.regionalRevenueForecast || [];

  return (
    <div className={`${className} space-y-6`}>
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(feasibilityData.estimatedCost)}</div>
            <p className="text-xs text-muted-foreground">
              Estimated study budget
            </p>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feasibilityData.timeline || 0} months</div>
            <p className="text-xs text-muted-foreground">
              First patient to final report
            </p>
          </CardContent>
        </Card>

        {/* Projected ROI */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMultiplier(feasibilityData.projectedROI)}</div>
            <p className="text-xs text-muted-foreground">
              Expected return on investment
            </p>
          </CardContent>
        </Card>

        {/* Sample Size */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sample Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feasibilityData.sampleSize || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total participants needed
            </p>
          </CardContent>
        </Card>

        {/* Incremental Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incremental Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBy(totalIncrementalSalesEur, 'EUR')}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrencyBy(totalIncrementalSalesUsd, 'USD')} risk-adjusted opportunity
            </p>
          </CardContent>
        </Card>

        {/* Risk-adjusted eNPV */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk-adjusted eNPV</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyBy(riskAdjustedEnpvEur, 'EUR')}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrencyBy(riskAdjustedEnpvUsd, 'USD')} discounted over 5 years
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Study Structure */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sites & Countries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Sites</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feasibilityData.numberOfSites || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across {feasibilityData.numberOfCountries || 0} {(feasibilityData.numberOfCountries || 0) === 1 ? 'country' : 'countries'}
            </p>
          </CardContent>
        </Card>

        {/* Recruitment Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recruitment Feasibility</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(feasibilityData.recruitmentRate)}</div>
            <Progress value={recruitmentProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Expected recruitment success
            </p>
          </CardContent>
        </Card>

        {/* Completion Risk */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(feasibilityData.completionRisk)}</div>
            <Progress value={completionRisk} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Risk of study delays/issues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commercial Outlook Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Commercial Outlook</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-md p-3">
              <div className="text-sm font-medium text-neutral-medium">Total Incremental Sales</div>
              <div className="text-xl font-bold text-primary mt-1">{formatCurrencyBy(totalIncrementalSalesEur, 'EUR')}</div>
              <div className="text-xs text-neutral-medium">Equivalent to {formatCurrencyBy(totalIncrementalSalesUsd, 'USD')}</div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-sm font-medium text-neutral-medium">Economic NPV (Base)</div>
              <div className="text-xl font-bold text-primary mt-1">{formatCurrencyBy(economicNetPresentValueEur, 'EUR')}</div>
              <div className="text-xs text-neutral-medium">{formatCurrencyBy(economicNetPresentValueUsd, 'USD')} before risk adjustments</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdownData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Timeline Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Total timeline summary */}
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">Total Study Duration</span>
                <span className="text-lg font-bold text-blue-600">{timelineTotal} months</span>
              </div>
              
              {/* Horizontal stacked timeline bar */}
              <div className="space-y-3">
                <div className="relative h-12 bg-gray-200 rounded-lg overflow-hidden">
                  {timelineData.map((phase, index) => {
                    const percentage = (phase.months / timelineTotal) * 100;
                    const leftOffset = timelineData.slice(0, index).reduce((sum, p) => sum + (p.months / timelineTotal) * 100, 0);
                    
                    return (
                      <div
                        key={phase.phase}
                        className="absolute top-0 h-full flex items-center justify-center text-white text-sm font-medium"
                        style={{
                          left: `${leftOffset}%`,
                          width: `${percentage}%`,
                          backgroundColor: phase.color
                        }}
                      >
                        {percentage > 12 && `${phase.months}m`}
                      </div>
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-4 justify-center">
                  {timelineData.map((phase) => (
                    <div key={phase.phase} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: phase.color }}
                      ></div>
                      <span className="text-sm text-gray-600">
                        {phase.phase}: {phase.months} months
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Cost Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {costBreakdownData.map((item) => (
                <div key={item.name} className="flex items-center justify-between border rounded px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium text-neutral-dark">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk vs ROI Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Risk vs Return Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            Compare your study against industry benchmarks
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  type="number" 
                  dataKey="risk" 
                  name="Completion Risk" 
                  unit="%" 
                  domain={[0, 100]}
                  label={{ 
                    value: 'Completion Risk (%)', 
                    position: 'insideBottom', 
                    offset: -10,
                    style: { textAnchor: 'middle', fontSize: '12px', fontWeight: 500 }
                  }}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="roi" 
                  name="Projected ROI" 
                  unit="x"
                  domain={[0, 'dataMax + 1']}
                  label={{ 
                    value: 'Return on Investment (ROI)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fontSize: '12px', fontWeight: 500 }
                  }}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'roi' ? `${value}x` : `${value}%`,
                    name === 'roi' ? 'Projected ROI' : 'Completion Risk'
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.name;
                    }
                    return '';
                  }}
                />
                {riskRoiData.map((entry, index) => (
                  <Scatter 
                    key={entry.name}
                    data={[entry]} 
                    fill={entry.color} 
                    r={entry.size / 10}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend and Explanation */}
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">How to Read This Chart:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li><span className="font-medium">Left side (low risk):</span> Easier to complete</li>
                  <li><span className="font-medium">Right side (high risk):</span> More challenging</li>
                  <li><span className="font-medium">Top (high ROI):</span> Better financial returns</li>
                  <li><span className="font-medium">Bottom (low ROI):</span> Lower returns</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Ideal Position:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li><span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>Top-left: High return, low risk</li>
                  <li><span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>Bottom-right: Low return, high risk</li>
                </ul>
              </div>
            </div>
            
            {/* Current Study Highlight */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-600 rounded-full mr-2"></div>
                <span className="text-sm font-medium text-blue-900">Your Study:</span>
                <span className="text-sm text-blue-700 ml-2">
                  {formatPercentage(feasibilityData.completionRisk)} completion risk, 
                  {formatMultiplier(feasibilityData.projectedROI)} projected return
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {regionalBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Regional Deployment Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-lightest">
                  <tr className="text-left text-neutral-medium">
                    <th className="px-4 py-2 font-medium">Region</th>
                    <th className="px-4 py-2 font-medium">Patients</th>
                    <th className="px-4 py-2 font-medium">Sites</th>
                    <th className="px-4 py-2 font-medium">Patient Mix</th>
                    <th className="px-4 py-2 font-medium">Operational Spend</th>
                    <th className="px-4 py-2 font-medium">Vendor Spend</th>
                    <th className="px-4 py-2 font-medium">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {regionalBreakdown.map((region) => (
                    <tr key={region.key} className="border-b last:border-b-0">
                      <td className="px-4 py-2 text-neutral-dark">
                        <div className="font-medium">{region.displayName}</div>
                        {region.notes && <div className="text-xs text-neutral-medium mt-1">{region.notes}</div>}
                      </td>
                      <td className="px-4 py-2 text-neutral-dark">{region.patients.toLocaleString()}</td>
                      <td className="px-4 py-2 text-neutral-dark">{region.sites.toLocaleString()}</td>
                      <td className="px-4 py-2 text-neutral-dark">{Math.round(region.share * 100)}%</td>
                      <td className="px-4 py-2 text-primary">{formatCurrency(region.operationalCost)}</td>
                      <td className="px-4 py-2 text-primary">{formatCurrency(region.vendorSpend)}</td>
                      <td className="px-4 py-2 text-primary font-semibold">{formatCurrency(region.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {vendorBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Vendor Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-lightest">
                  <tr className="text-left text-neutral-medium">
                    <th className="px-4 py-2 font-medium">Vendor</th>
                    <th className="px-4 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 font-medium">Total Spend</th>
                    <th className="px-4 py-2 font-medium">Markup</th>
                    <th className="px-4 py-2 font-medium">Retainers</th>
                    <th className="px-4 py-2 font-medium">FX Buffer</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorBreakdown.map((vendor) => (
                    <tr key={vendor.vendorId} className="border-b last:border-b-0">
                      <td className="px-4 py-2 text-neutral-dark font-medium">{vendor.displayName}</td>
                      <td className="px-4 py-2 text-neutral-dark capitalize">{vendor.category.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2 text-primary font-semibold">{formatCurrency(vendor.totalSpend)}</td>
                      <td className="px-4 py-2 text-primary">{formatCurrency(vendor.markupSpend)}</td>
                      <td className="px-4 py-2 text-primary">{formatCurrency(vendor.retainerSpend)}</td>
                      <td className="px-4 py-2 text-primary">{formatCurrency(vendor.fxBufferSpend)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {scenarioAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Scenario Outlook</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scenarioAnalysis.map((scenario) => (
                <div key={scenario.scenario} className="border rounded-md p-4 space-y-2">
                  <div className="text-sm font-semibold text-neutral-medium uppercase">{scenario.scenario}</div>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(scenario.estimatedCost)}</div>
                  <div className="text-sm text-neutral-medium">Timeline: <span className="font-semibold text-neutral-dark">{scenario.timeline} months</span></div>
                  <div className="text-sm text-neutral-medium">ROI: <span className="font-semibold text-neutral-dark">{scenario.projectedROI.toFixed(1)}x</span></div>
                  <div className="text-sm text-neutral-medium">Incremental Sales: <span className="font-semibold text-neutral-dark">{formatCurrencyBy(scenario.incrementalSalesEur, 'EUR')}</span></div>
                  <div className="text-sm text-neutral-medium">eNPV: <span className="font-semibold text-neutral-dark">{formatCurrencyBy(scenario.eNpvEur, 'EUR')}</span></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {regionalRevenueForecast.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Regional Revenue Outlook</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-lightest">
                  <tr className="text-left text-neutral-medium">
                    <th className="px-4 py-2 font-medium">Region</th>
                    <th className="px-4 py-2 font-medium">Window (yrs)</th>
                    <th className="px-4 py-2 font-medium">Incremental Sales (EUR)</th>
                    <th className="px-4 py-2 font-medium">Incremental Sales (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {regionalRevenueForecast.map((region) => (
                    <tr key={region.regionId} className="border-b last:border-b-0">
                      <td className="px-4 py-2 text-neutral-dark font-medium">{region.displayName}</td>
                      <td className="px-4 py-2 text-neutral-dark">{region.windowYears.toFixed(1)}</td>
                      <td className="px-4 py-2 text-primary font-semibold">{formatCurrencyBy(region.incrementalSalesEur, 'EUR')}</td>
                      <td className="px-4 py-2 text-primary">{formatCurrencyBy(region.incrementalSalesUsd, 'USD')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FeasibilityDashboard;