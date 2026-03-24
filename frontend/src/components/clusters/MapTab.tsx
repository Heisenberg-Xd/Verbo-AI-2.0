'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MapTabProps {
  data: any;
}

const COLORS = [
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#F43F5E', // Rose
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#A855F7', // Purple
  '#EAB308', // Yellow
];

export function MapTab({ data }: MapTabProps) {
  if (!data?.cluster_visualization_data || data.cluster_visualization_data.length === 0) {
    return <div className="text-text-muted font-mono text-sm">No 2D map projection available.</div>;
  }

  // Create a mapping from cluster_id to cluster_name and other metadata
  const clusterMap = (data.insight_data || []).reduce((acc: any, curr: any) => {
    acc[curr.cluster_id] = curr;
    return acc;
  }, {});

  const getClusterIndex = (c: any) => {
    if (typeof c === 'number') return c;
    const match = String(c).match(/\d+/);
    return match ? parseInt(match[0], 10) : String(c).charCodeAt(0);
  };

  const vizData = data.cluster_visualization_data.map((d: any) => ({
    ...d,
    z: 1, // scatter dot size
    // Ensure we have a cluster field correctly populated
    cluster: d.cluster !== undefined ? d.cluster : d.cluster_id
  }));

  return (
    <div className="h-[600px] w-full glass-panel border border-white/5 rounded-xl p-6 flex flex-col">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-display text-xl font-bold text-text-primary">Semantic Cluster Map</h2>
            <p className="text-sm font-mono text-text-muted mt-1 uppercase tracking-widest">PCA — 2D projection of Sentence-BERT embeddings</p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-tighter">{vizData.length} Documents Indexed</span>
          </div>
        </div>
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
                  const item = payload[0].payload;
                  const clusterInfo = clusterMap[item.cluster];
                  return (
                    <div className="glass-panel border-white/10 p-3 rounded shadow-2xl font-mono text-xs z-50 backdrop-blur-xl bg-black/80 ring-1 ring-white/20">
                      <p className="text-white mb-2 truncate max-w-[250px] font-bold border-b border-white/10 pb-1">{item.filename}</p>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[getClusterIndex(item.cluster) % COLORS.length] }} />
                        <p className="text-accent-primary font-bold">{clusterInfo?.cluster_name || `Cluster ${item.cluster}`}</p>
                      </div>
                      <p className="text-text-muted text-[10px] leading-relaxed line-clamp-2 max-w-[250px]">
                        {clusterInfo?.summary ? clusterInfo.summary.substring(0, 100) + '...' : 'No summary available for this cluster.'}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter name="Documents" data={vizData}>
              {vizData.map((entry: any, index: number) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[getClusterIndex(entry.cluster) % COLORS.length]}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap gap-x-6 gap-y-3 justify-center">
        {Array.from(new Set(vizData.map((d: any) => d.cluster))).sort((a: any, b: any) => getClusterIndex(a) - getClusterIndex(b)).map((c: any) => {
          const clusterInfo = clusterMap[c];
          return (
            <div key={String(c)} className="flex items-center gap-2 font-mono text-[10px] text-text-secondary hover:text-text-primary transition-colors cursor-default">
              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[getClusterIndex(c) % COLORS.length] }} />
              <span className="font-bold">{clusterInfo?.cluster_name || `Cluster ${c}`}</span>
              <span className="text-text-muted ml-0.5">({clusterInfo?.document_count || 1})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
