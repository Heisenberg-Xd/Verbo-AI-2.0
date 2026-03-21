'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });
import { useStore } from '@/lib/store';
import { api, Endpoints } from '@/lib/api';
import { AlertCircle, Network, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
// @types/d3 handles node definitions, no need to import if not directly typing

interface KGTabProps {
  data: any;
}

export function KGTab({ data }: KGTabProps) {
  const { activeWorkspaceId } = useStore();
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const fgRef = useRef<any>(null);

  const buildGraph = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(Endpoints.getKnowledgeGraph(activeWorkspaceId));
      if (res.data.nodes?.length > 0) {
        setGraphData({
          ...res.data,
          links: res.data.edges
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

  const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const r = Math.max(1, 4 - globalScale/10); // Node size

    // Type colors
    let color = '#525252'; // default
    if (node.type === 'person') color = '#F59E0B'; // amber
    if (node.type === 'organization') color = '#10B981'; // emerald
    if (node.type === 'location') color = '#EF4444'; // red

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();

    // Text Label below node if zoomed in enough
    if (globalScale > 2) {
      const fontSize = 12 / globalScale;
      ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#F5F5F5';
      ctx.fillText(node.label || node.id, node.x, node.y + r + 2);
    }
  }, []);

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
            className="px-4 py-2 border border-border rounded bg-surface font-mono text-sm hover:border-accent-primary hover:text-accent-primary transition-colors disabled:opacity-50"
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
      <div className="flex-1 border border-border rounded-xl bg-[#050505] overflow-hidden relative glass-panel">
        {!graphData && !loading && !error && (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted">
             <Network size={48} className="mb-4 opacity-50" />
             <p className="font-display">Graph not initialized</p>
             <p className="text-xs font-mono mt-2">Click 'Build Graph' to analyze entities & relationships</p>
           </div>
        )}

        {graphData && (
          <>
            <div className="absolute top-4 left-4 z-10 bg-surface/80 p-3 rounded border border-border backdrop-blur font-mono text-[10px] space-y-2">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-accent-primary" /> Person</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-accent-secondary" /> Organization</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-accent-danger" /> Location</div>
              <div className="mt-2 pt-2 border-t border-border text-text-muted">
                Nodes: {graphData.stats.total_nodes} | Edges: {graphData.stats.total_edges}
              </div>
            </div>
            
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              nodeCanvasObject={drawNode}
              linkColor={() => '#333333'}
              linkWidth={1}
              width={1000} // Hardcoded fallback; react-force-graph usually relies on a wrapper for resize
              height={500}
              backgroundColor="#050505"
            />
          </>
        )}
      </div>
    </div>
  );
}
