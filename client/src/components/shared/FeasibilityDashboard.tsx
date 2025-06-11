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

  // Prepare cost breakdown data for pie chart
  const costBreakdownData = [
    { name: 'Site Costs', value: feasibilityData.siteCosts || 0, color: '#8884d8' },
    { name: 'Personnel', value: feasibilityData.personnelCosts || 0, color: '#82ca9d' },
    { name: 'Materials', value: feasibilityData.materialCosts || 0, color: '#ffc658' },
    { name: 'Monitoring', value: feasibilityData.monitoringCosts || 0, color: '#ff7c7c' },
    { name: 'Data Management', value: feasibilityData.dataCosts || 0, color: '#8dd1e1' },
    { name: 'Regulatory', value: feasibilityData.regulatoryCosts || 0, color: '#d084d0' }
  ].filter(item => item.value > 0);

  // Risk vs ROI scatter plot data
  const riskRoiData = [{
    risk: (feasibilityData.completionRisk || 0) * 100,
    roi: feasibilityData.projectedROI || 0,
    name: 'Current Study'
  }];

  // Timeline breakdown data
  const timelineData = [
    { 
      phase: 'Recruitment', 
      months: feasibilityData.recruitmentPeriodMonths || 0,
      color: '#8884d8'
    },
    { 
      phase: 'Follow-up', 
      months: feasibilityData.followUpPeriodMonths || 0,
      color: '#82ca9d'
    },
    { 
      phase: 'Analysis', 
      months: Math.max(0, (feasibilityData.timeline || 0) - (feasibilityData.recruitmentPeriodMonths || 0) - (feasibilityData.followUpPeriodMonths || 0)),
      color: '#ffc658'
    }
  ].filter(item => item.months > 0);

  const recruitmentProgress = (feasibilityData.recruitmentRate || 0) * 100;
  const completionRisk = (feasibilityData.completionRisk || 0) * 100;

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
                <BarChart data={timelineData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="phase" />
                  <Tooltip formatter={(value) => [`${value} months`, 'Duration']} />
                  <Bar dataKey="months" fill="#8884d8" />
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
                <Scatter 
                  data={riskRoiData} 
                  fill="#8884d8" 
                  r={8}
                />
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