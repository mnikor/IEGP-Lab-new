import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FeasibilityData } from '@/lib/types';

interface FeasibilityChartProps {
  feasibilityData: FeasibilityData;
}

const FeasibilityChart: React.FC<FeasibilityChartProps> = ({ feasibilityData }) => {
  // Transform data for the chart
  const chartData = [
    {
      name: 'Cost',
      value: feasibilityData.estimatedCost != null ? feasibilityData.estimatedCost / 1000000 : 0, // Convert to millions
      unit: 'M €',
      display: feasibilityData.estimatedCost != null ? `${(feasibilityData.estimatedCost / 1000000).toFixed(1)}M €` : 'N/A',
    },
    {
      name: 'Timeline',
      value: feasibilityData.timeline != null ? feasibilityData.timeline : 0,
      unit: 'mo',
      display: feasibilityData.timeline != null ? `${feasibilityData.timeline} months` : 'N/A',
    },
    {
      name: 'ROI',
      value: feasibilityData.projectedROI != null ? feasibilityData.projectedROI : 2.5,
      unit: 'x',
      display: feasibilityData.projectedROI != null ? `${feasibilityData.projectedROI.toFixed(1)}x` : '2.5x',
    },
    {
      name: 'Recruitment',
      value: feasibilityData.recruitmentRate != null ? feasibilityData.recruitmentRate * 100 : 0, // Convert to percentage
      unit: '%',
      display: feasibilityData.recruitmentRate != null ? `${(feasibilityData.recruitmentRate * 100).toFixed(0)}%` : 'N/A',
    },
    {
      name: 'Completion Risk',
      value: feasibilityData.completionRisk != null ? (1 - feasibilityData.completionRisk) * 100 : 0, // Convert to success percentage
      unit: '%',
      display: feasibilityData.completionRisk != null ? `${((1 - feasibilityData.completionRisk) * 100).toFixed(0)}%` : 'N/A',
    },
  ];

  // Custom tooltip to display the actual values
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white border border-neutral-light rounded shadow-sm text-xs">
          <p className="font-medium">{`${payload[0].payload.name}: ${payload[0].payload.display}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-60 bg-neutral-lightest rounded-md p-3 border border-neutral-light">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-neutral-light" />
          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FeasibilityChart;
