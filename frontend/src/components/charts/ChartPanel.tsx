'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { Maximize2 } from 'lucide-react';

interface ChartPanelProps {
  title: string;
  method: string;
  data: any[]; // { k: number, score: number }
  dataKey: string;
  color: string;
  className?: string;
}

export function ChartPanel({ title, method, data, dataKey, color, className }: ChartPanelProps) {
  return (
    <div className={cn("glass-panel p-5 rounded-lg flex flex-col h-64", className)}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest block mb-1">
            Method {method}
          </span>
          <h3 className="font-display font-medium text-text-primary uppercase tracking-wider text-sm">
            {title}
          </h3>
        </div>
        <button className="text-text-muted hover:text-text-primary transition-colors">
          <Maximize2 size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 w-full relative">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
              <XAxis 
                dataKey="k" 
                stroke="#525252" 
                tick={{ fill: '#A3A3A3', fontSize: 10, fontFamily: 'monospace' }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                stroke="#525252" 
                tick={{ fill: '#A3A3A3', fontSize: 10, fontFamily: 'monospace' }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', borderColor: '#2A2A2A', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
                itemStyle={{ color: color }}
              />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color} 
                strokeWidth={2}
                dot={{ fill: '#111', stroke: color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: color }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-text-muted text-sm font-mono">No optimal k-scores available</p>
          </div>
        )}
      </div>
      <div className="mt-2 text-center text-[10px] font-mono tracking-widest text-[#525252] uppercase">
        Number of Clusters (k)
      </div>
    </div>
  );
}
