import React from 'react';
import { FeasibilityData } from '@/lib/types';
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

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null) return '0%';
    return `${Math.round(value * 100)}%`;
  };

  const formatMultiplier = (value: number | undefined) => {
    if (value === undefined || value === null) return '0x';
    return `${value.toFixed(1)}x`;
  };

  // Prepare cost breakdown data for pie chart with proper number parsing
  const costBreakdownData = [
    { name: 'Site Costs', value: parseNumber(feasibilityData.siteCosts, 0), color: '#8884d8' },
    { name: 'Personnel', value: parseNumber(feasibilityData.personnelCosts, 0), color: '#82ca9d' },
    { name: 'Materials', value: parseNumber(feasibilityData.materialCosts, 0), color: '#ffc658' },
    { name: 'Monitoring', value: parseNumber(feasibilityData.monitoringCosts, 0), color: '#ff7c7c' },
    { name: 'Data Management', value: parseNumber(feasibilityData.dataCosts, 0), color: '#8dd1e1' },
    { name: 'Regulatory', value: parseNumber(feasibilityData.regulatoryCosts, 0), color: '#d084d0' }
  ].filter(item => item.value > 0);

  // Risk vs ROI scatter plot data with reference points for context
  // Ensure numeric conversion since JSON serialization may convert to strings
  const currentRisk = ((typeof feasibilityData.completionRisk === 'string' ? 
    parseFloat(feasibilityData.completionRisk) : feasibilityData.completionRisk) || 0) * 100;
  const currentROI = typeof feasibilityData.projectedROI === 'string' ? 
    parseFloat(feasibilityData.projectedROI) : (feasibilityData.projectedROI || 0);
  
  console.log('ROI Debug:', {
    projectedROI: feasibilityData.projectedROI,
    projectedROIType: typeof feasibilityData.projectedROI,
    currentROI,
    completionRisk: feasibilityData.completionRisk,
    completionRiskType: typeof feasibilityData.completionRisk,
    currentRisk
  });
  
  const riskRoiData = [
    // Current study
    {
      risk: currentRisk,
      roi: currentROI,
      name: 'Current Study',
      size: 120,
      color: '#8884d8'
    },
    // Reference benchmarks for context
    {
      risk: 15,
      roi: 1.5,
      name: 'Conservative Benchmark',
      size: 60,
      color: '#82ca9d'
    },
    {
      risk: 30,
      roi: 3.0,
      name: 'Aggressive Benchmark',
      size: 60,
      color: '#ffc658'
    },
    {
      risk: 50,
      roi: 2.0,
      name: 'High Risk Benchmark',
      size: 60,
      color: '#ff7c7c'
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

  return (
    <div className={`${className} space-y-6`}>
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData} layout="horizontal" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 'dataMax']} />
                  <YAxis type="category" dataKey="phase" width={80} />
                  <Tooltip formatter={(value) => [`${value} months`, 'Duration']} />
                  <Bar dataKey="months">
                    {timelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk vs ROI Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Risk vs Return Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="risk" 
                  name="Completion Risk" 
                  unit="%" 
                  domain={[0, 100]}
                />
                <YAxis 
                  type="number" 
                  dataKey="roi" 
                  name="Projected ROI" 
                  unit="x"
                  domain={[0, 'dataMax + 1']}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'roi' ? `${value}x` : `${value}%`,
                    name === 'roi' ? 'Projected ROI' : 'Completion Risk'
                  ]}
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
          <p className="text-sm text-muted-foreground mt-2">
            Lower risk and higher ROI indicate more favorable study characteristics
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeasibilityDashboard;