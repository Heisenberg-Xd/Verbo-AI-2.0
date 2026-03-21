'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MapTabProps {
  data: any;
}

const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#F43F5E', '#14B8A6'];

export function MapTab({ data }: MapTabProps) {
  if (!data?.cluster_visualization_data || data.cluster_visualization_data.length === 0) {
    return <div className="text-text-muted font-mono text-sm">No 2D map projection available.</div>;
  }

  const getClusterIndex = (c: any) => {
    if (typeof c === 'number') return c;
    const match = String(c).match(/\d+/);
    return match ? parseInt(match[0], 10) : String(c).charCodeAt(0);
  };

  const vizData = data.cluster_visualization_data.map((d: any) => ({
    ...d,
    z: 1 // scatter dot size
  }));

  return (
    <div className="h-[600px] w-full glass-panel border border-[#2A2A2A] rounded-xl p-6 flex flex-col">
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-text-primary">Semantic Cluster Map</h2>
        <p className="text-sm font-mono text-text-muted mt-1 uppercase tracking-widest">PCA — 2D projection of Sentence-BERT embeddings</p>
      </div>
      
      <div className="flex-1 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis type="number" dataKey="x" name="PCA1" tick={false} axisLine={false} tickLine={false} />
            <YAxis type="number" dataKey="y" name="PCA2" tick={false} axisLine={false} tickLine={false} />
            
            <Tooltip 
              cursor={{ strokeDasharray: '3 3', stroke: '#525252' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#111] border border-border p-3 rounded shadow-xl font-mono text-xs z-50">
                      <p className="text-text-primary mb-1 truncate max-w-[200px] font-bold">{data.filename}</p>
                      <p className="text-accent-primary">Cluster {data.cluster}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter name="Documents" data={vizData}>
              {vizData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[getClusterIndex(entry.cluster) % COLORS.length]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center">
        {Array.from(new Set(vizData.map((d: any) => d.cluster))).sort().map((c: any) => (
          <div key={String(c)} className="flex items-center gap-2 font-mono text-xs text-text-secondary">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[getClusterIndex(c) % COLORS.length] }} />
            {String(c)}
          </div>
        ))}
      </div>
    </div>
  );
}
