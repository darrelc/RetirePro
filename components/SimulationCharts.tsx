import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area
} from 'recharts';
import { YearData } from '../types';

interface SimulationChartsProps {
  data: YearData[];
  incomeKeys: string[];
  retirementAge: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 shadow-xl rounded-lg text-sm">
        <p className="font-bold text-gray-800 mb-2">Age {label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
             <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
             <span className="text-gray-600 capitalize">{entry.name}:</span>
             <span className="font-mono font-medium">
               ${Number(entry.value).toLocaleString()}
             </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const SimulationCharts: React.FC<SimulationChartsProps> = ({ data, incomeKeys, retirementAge }) => {
  // Color palette
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];
  
  // Prepare data: Recharts needs flat objects for stacked bars
  const chartData = data.map(d => ({
    ...d,
    ...d.breakdown, // Spread income sources
  }));

  return (
    <div className="w-full h-[500px] bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Income Sources & Portfolio Balance</h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="w-3 h-3 bg-indigo-600 rounded-full"></span> Portfolio Value
          <span className="w-3 h-3 bg-gray-300 rounded-full ml-2"></span> Income Sources
        </div>
      </div>

      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey="age" 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            label={{ value: 'Age', position: 'insideBottomRight', offset: -10 }}
          />
          <YAxis 
            yAxisId="left"
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Annual Income', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9ca3af' } }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
            tick={{ fill: '#4f46e5', fontSize: 12, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Portfolio Balance', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#4f46e5' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Retirement Line */}
          <ReferenceLine x={retirementAge} stroke="red" strokeDasharray="3 3" label={{ position: 'top', value: 'Retirement', fill: 'red', fontSize: 12 }} />

          {/* Stacked Bars for Income Sources */}
          {incomeKeys.map((key, index) => (
             <Bar 
                key={key} 
                dataKey={key} 
                stackId="a" 
                fill={key === 'Income Shortage' ? '#ef4444' : colors[index % colors.length]} 
                yAxisId="left" 
                barSize={20}
                radius={key === incomeKeys[incomeKeys.length-1] ? [4, 4, 0, 0] : [0,0,0,0]}
             />
          ))}

          {/* Portfolio Balance Line */}
          <Line 
            type="monotone" 
            dataKey="portfolioBalance" 
            stroke="#4f46e5" 
            strokeWidth={3} 
            dot={false} 
            yAxisId="right"
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
