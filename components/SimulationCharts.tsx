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
  colorMap: Record<string, string>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-lg text-xs sm:text-sm z-50">
        <p className="font-bold text-gray-800 mb-2">Age {label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: entry.color }} />
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

export const SimulationCharts: React.FC<SimulationChartsProps> = ({ data, incomeKeys, retirementAge, colorMap }) => {
  
  // Prepare data: Recharts needs flat objects for stacked bars
  const chartData = data.map(d => ({
    ...d,
    ...d.breakdown, // Spread income sources
  }));

  return (
    <div className="w-full h-[450px] sm:h-[500px] bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 flex flex-col">
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-none">
        <h3 className="text-lg font-semibold text-gray-800">Projected Income & Balance</h3>
      </div>

      <div className="flex-1 min-h-0 w-full" style={{ touchAction: 'pan-y' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 0, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="age" 
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              minTickGap={30} 
              interval="preserveStartEnd"
            />
            <YAxis 
              yAxisId="left"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              tick={{ fill: '#4f46e5', fontSize: 11, fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            {/* cursor={{ fill: 'transparent' }} improves touch UX by removing the giant grey bar on tap */}
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            
            <ReferenceLine 
              x={retirementAge} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              label={{ position: 'insideTopRight', value: 'Retirement', fill: '#ef4444', fontSize: 10 }} 
            />

            {/* Stacked Bars for Income Sources */}
            {incomeKeys.map((key) => (
               <Bar 
                  key={key} 
                  dataKey={key} 
                  stackId="a" 
                  fill={colorMap[key] || '#94a3b8'} 
                  yAxisId="left" 
                  barSize={20}
                  radius={[0,0,0,0]}
                  isAnimationActive={false}
               />
            ))}

            {/* Portfolio Balance Line */}
            <Line 
              type="monotone" 
              dataKey="portfolioBalance" 
              name="Portfolio Balance"
              stroke="#4f46e5" 
              strokeWidth={3} 
              dot={false} 
              yAxisId="right"
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};