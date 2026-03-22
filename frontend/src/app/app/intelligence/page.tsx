'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { api, Endpoints } from '@/lib/api';
import { 
  Network, 
  AlertCircle, 
  X, 
  ChevronRight, 
  Database, 
  User, 
  Building2, 
  MapPin, 
  Tag 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KnowledgeGraph } from '@/components/ui/KnowledgeGraph';

export default function IntelligencePage() {
  const { activeWorkspaceId } = useStore();
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadGraph();
    }
  }, [activeWorkspaceId]);

  const loadGraph = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(Endpoints.getKnowledgeGraph(activeWorkspaceId));
      console.log('[KG] Raw API response:', JSON.stringify({
        nodeCount: res.data.nodes?.length,
        edgeCount: res.data.edges?.length,
        sampleNode: res.data.nodes?.[0],
        sampleEdge: res.data.edges?.[0],
        stats: res.data.stats
      }, null, 2));
      if (res.data.nodes?.length > 0) {
        const nodes = res.data.nodes.map((n: any) => ({
          ...n,
          val: n.weight || n.degree || 1
        }));
        const links = (res.data.edges || []).map((e: any) => ({
          ...e,
          // Ensure source/target are strings matching node IDs
          source: e.source,
          target: e.target,
        }));
        console.log('[KG] Processed data:', { nodes: nodes.length, links: links.length });
        // Verify edge connectivity
        const nodeIds = new Set(nodes.map((n: any) => n.id));
        const validLinks = links.filter((l: any) => nodeIds.has(l.source) && nodeIds.has(l.target));
        console.log('[KG] Valid links (both endpoints exist):', validLinks.length, '/', links.length);
        if (links.length > 0 && validLinks.length === 0) {
          console.warn('[KG] NO VALID LINKS! Sample edge source:', links[0].source, 'Node IDs sample:', [...nodeIds].slice(0, 5));
        }
        setGraphData({ nodes, links });
      } else {
        setError(res.data.message || 'No entities found.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch graph data');
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
  };

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted">
        <Network size={48} className="mb-4 text-border" />
        <h2 className="font-display text-xl mb-2 text-text-secondary">No Active Workspace</h2>
      </div>
    );
  }

  return (
    <div className="flex h-full relative overflow-hidden bg-[#0A0A0A]">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-accent-primary animate-pulse z-50 bg-[#0A0A0A]/50 backdrop-blur-sm">
          EXPLORING KNOWLEDGE SPHERE...
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 glass-panel p-4 rounded-lg border-accent-danger text-accent-danger text-xs font-mono flex items-start gap-2 shadow-2xl">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <p>{error}</p>
          <button onClick={loadGraph} className="ml-4 underline hover:text-white transition-colors">RETRY</button>
        </div>
      )}

      {/* Main Graph Component */}
      <div className="flex-1 w-full h-full relative">
        {graphData ? (
          <KnowledgeGraph 
            data={graphData} 
            onNodeClick={handleNodeClick} 
          />
        ) : !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted">
             <Network size={48} className="mb-4 opacity-20" />
             <p className="font-mono text-xs uppercase tracking-widest opacity-50">Empty Knowledge Sphere</p>
          </div>
        )}
      </div>

      {/* Detail Slideout (Interaction Panel) */}
      <div className={cn(
        "absolute top-0 right-0 h-full w-[380px] glass-panel border-l border-white/10 backdrop-blur-3xl transition-transform duration-500 transform shadow-[0_0_50px_rgba(0,0,0,0.5)] z-40 bg-black/40",
        selectedNode ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedNode && (
          <div className="flex flex-col h-full font-mono">
            {/* Header */}
            <div className="p-8 border-b border-white/5 relative">
              <button 
                onClick={() => setSelectedNode(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-text-muted hover:text-accent-primary transition-all duration-300 group"
              >
                <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-accent-primary flex items-center justify-center bg-accent-primary/5">
                    {selectedNode.type === 'person' ? <User size={24} className="text-accent-primary" /> :
                     selectedNode.type === 'organization' ? <Building2 size={24} className="text-emerald-500" /> :
                     selectedNode.type === 'location' ? <MapPin size={24} className="text-red-500" /> :
                     <Tag size={24} className="text-gray-500" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
                      {selectedNode.label || selectedNode.id}
                    </h2>
                    <p className={cn(
                      "text-[10px] uppercase tracking-[0.2em] font-bold mt-1",
                      selectedNode.type === 'person' ? "text-accent-primary" : "text-text-muted"
                    )}>
                      {selectedNode.type}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {/* Properties / Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                  <p className="text-[10px] text-text-muted uppercase mb-1">Mentions</p>
                  <p className="text-lg font-bold text-white">{selectedNode.val || 1}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                  <p className="text-[10px] text-text-muted uppercase mb-1">Cluster</p>
                  <p className="text-lg font-bold text-white">#{selectedNode.cluster_id || 'Global'}</p>
                </div>
              </div>

              {/* Connections */}
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-widest text-text-muted flex items-center gap-2 border-b border-white/5 pb-2">
                  <Network size={12} /> Semantic Relations
                </h3>
                
                <div className="space-y-3">
                  {graphData?.links
                    .filter((e: any) => (typeof e.source === 'string' ? e.source : e.source.id) === selectedNode.id || (typeof e.target === 'string' ? e.target : e.target.id) === selectedNode.id)
                    .map((edge: any, i: number) => {
                      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
                      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
                      const isSource = sourceId === selectedNode.id;
                      const connectedNodeId = isSource ? targetId : sourceId;
                      const connNode = graphData.nodes.find((n: any) => n.id === connectedNodeId);

                      return (
                        <div key={i} className="group flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-accent-primary/10 border border-white/5 hover:border-accent-primary/30 transition-all duration-300 cursor-pointer" 
                             onClick={() => connNode && handleNodeClick(connNode)}>
                           <div className="flex flex-col">
                             <span className="text-[10px] text-text-muted uppercase group-hover:text-accent-primary/70 transition-colors">
                               {edge.label || 'Relates to'}
                             </span>
                             <span className="text-sm font-bold text-white mt-0.5">
                               {connNode?.label || connectedNodeId}
                             </span>
                           </div>
                           <ChevronRight size={16} className="text-text-muted group-hover:text-accent-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      );
                  })}
                </div>
              </div>

              {/* Sources */}
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-widest text-text-muted flex items-center gap-2 border-b border-white/5 pb-2">
                  <Database size={12} /> Origin Evidence
                </h3>
                <div className="space-y-2">
                  {selectedNode.source_files?.length > 0 ? (
                    selectedNode.source_files.map((file: string, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-white/5 text-[11px] hover:border-white/20 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-primary/40" />
                        <span className="truncate flex-1 text-text-secondary">{file}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-lg bg-black/20 border border-dashed border-white/10 text-[10px] text-text-muted text-center italic">
                      Tracking trace for this node is ephemeral
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="p-8 border-t border-white/5 bg-black/20">
               <button className="w-full py-3 rounded-lg bg-accent-primary text-black font-bold text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                 Deep Trace Analysis
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
