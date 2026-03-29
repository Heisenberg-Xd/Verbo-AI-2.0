'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { api, Endpoints } from '@/lib/api';
import { Network, AlertCircle, Download } from 'lucide-react';
import { KnowledgeGraph } from '@/components/ui/KnowledgeGraph';

interface KGTabProps {
  data: any;
}

export function KGTab({ data }: KGTabProps) {
  const { activeWorkspaceId } = useStore();
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const buildGraph = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(Endpoints.getKnowledgeGraph(activeWorkspaceId));
      if (res.data.nodes?.length > 0) {
        setGraphData({
          nodes: res.data.nodes.map((n: any) => ({
            ...n,
            val: n.mentions || 1
          })),
          links: res.data.edges || []
        });
      } else {
        setError(res.data.message || 'Entity extraction has not completed or found no entities.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch graph data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full min-h-[600px] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Network className="text-accent-primary" /> Intelligence Knowledge Graph
          </h2>
          <p className="text-text-muted text-sm mt-1 font-mono">Entity relationships automatically extracted via GLiNER / spaCy</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={buildGraph}
            disabled={loading}
            className="px-4 py-2 border border-white/10 rounded bg-white/5 backdrop-blur-sm font-mono text-sm hover:border-accent-primary hover:text-accent-primary transition-all duration-300 disabled:opacity-50"
          >
            {loading ? 'Building...' : (graphData ? 'Refresh Graph' : 'Build Graph')}
          </button>
          
          <button className="px-4 py-2 bg-accent-primary text-black font-mono font-bold text-sm rounded hover:bg-amber-400 flex items-center gap-2">
            <Download size={16} /> Export Report
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded bg-accent-danger/10 border border-accent-danger/20 flex gap-2 text-accent-danger font-mono text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Main Graph Area */}
      <div className="flex-1 border border-white/10 rounded-xl bg-transparent overflow-hidden relative glass-panel min-h-[500px]">
        {graphData ? (
          <KnowledgeGraph 
            data={graphData} 
          />
        ) : !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted">
             <Network size={48} className="mb-4 opacity-50" />
             <p className="font-display">Graph not initialized</p>
             <p className="text-xs font-mono mt-2">Click 'Build Graph' to analyze entities & relationships</p>
          </div>
        )}
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-accent-primary animate-pulse bg-black/20 backdrop-blur-sm">
            Synthesizing Knowledge Web...
          </div>
        )}
      </div>
    </div>
  );
}
