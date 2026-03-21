'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });
import { useStore } from '@/lib/store';
import { api, Endpoints } from '@/lib/api';
import { Network, Search, Filter, AlertCircle, X, ChevronRight, Database } from 'lucide-react';

export default function IntelligencePage() {
  const { activeWorkspaceId } = useStore();
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const fgRef = useRef<any>(null);

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
      if (res.data.nodes?.length > 0) {
        setGraphData({
          ...res.data,
          links: res.data.edges
        });
      } else {
        setError(res.data.message || 'No entities found.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch graph data');
    } finally {
      setLoading(false);
    }
  };

  const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isSelected = selectedNode && selectedNode.id === node.id;
    const isMuted = selectedNode && !isSelected && 
                    !graphData?.links.some((e: any) => 
                      (e.source.id === node.id && e.target.id === selectedNode.id) || 
                      (e.target.id === node.id && e.source.id === selectedNode.id)
                    );

    const r = Math.max(1, (isSelected ? 6 : 4) - globalScale/15);

    let color = '#525252'; 
    if (node.type === 'person') color = '#F59E0B'; 
    if (node.type === 'organization') color = '#10B981'; 
    if (node.type === 'location') color = '#EF4444'; 

    if (isMuted) color = '#1A1A1A'; // Fade out unrelated

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    
    // Selection ring
    if (isSelected) {
      ctx.lineWidth = 1/globalScale;
      ctx.strokeStyle = '#F59E0B';
      ctx.stroke();
    }
    
    ctx.fill();

    if (globalScale > 1.5 || isSelected) {
      const fontSize = isSelected ? 14 / globalScale : 10 / globalScale;
      ctx.font = `${isSelected ? 'bold ' : ''}${fontSize}px "IBM Plex Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isMuted ? '#525252' : '#F5F5F5';
      ctx.fillText(node.label || node.id, node.x, node.y + r + 2);
    }
  }, [selectedNode, graphData]);

  const handleNodeClick = (node: any) => {
    // Re-center on node
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(8, 2000);
    }
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
    <div className="flex h-full relative overflow-hidden bg-[#050505]">
      {/* Search / Filter Overlay */}
      <div className="absolute top-6 left-6 z-10 w-80 flex flex-col gap-4 pointer-events-none">
        <div className="glass-panel p-2 rounded-lg pointer-events-auto flex items-center gap-2">
          <Search size={16} className="text-text-muted ml-2" />
          <input 
            type="text" 
            placeholder="Search entities..."
            className="bg-transparent border-none text-sm font-mono focus:outline-none flex-1 py-1"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="glass-panel p-4 rounded-lg pointer-events-auto">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-text-muted flex items-center gap-2 mb-3">
            <Filter size={12} /> Entities & Types
          </h3>
          <div className="space-y-2 text-xs font-mono">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-accent-primary" />
              <div className="w-2 h-2 rounded-full bg-accent-primary" /> People
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-accent-primary" />
              <div className="w-2 h-2 rounded-full bg-accent-secondary" /> Organizations
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-accent-primary" />
              <div className="w-2 h-2 rounded-full bg-accent-danger" /> Locations
            </label>
          </div>
          
          {graphData && (
             <div className="mt-4 pt-4 border-t border-border flex justify-between text-text-muted font-mono text-[10px]">
               <span>Nodes: {graphData.stats.total_nodes}</span>
               <span>Edges: {graphData.stats.total_edges}</span>
             </div>
          )}
        </div>

        {error && (
          <div className="glass-panel p-4 rounded-lg pointer-events-auto border-accent-danger text-accent-danger text-xs font-mono flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Main Canvas */}
      <div className="flex-1 w-full h-full relative" id="kg-container">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-accent-primary animate-pulse z-20">
            Mapping Knowledge Graph...
          </div>
        )}

        {graphData && (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeCanvasObject={drawNode}
            linkColor={(link: any) => {
              if (selectedNode) {
                const isConnected = link.source.id === selectedNode.id || link.target.id === selectedNode.id;
                return isConnected ? '#F59E0B' : '#1A1A1A';
              }
              return '#2A2A2A';
            }}
            linkWidth={(link: any) => selectedNode && (link.source.id === selectedNode.id || link.target.id === selectedNode.id) ? 2 : 1}
            onNodeClick={handleNodeClick}
            onBackgroundClick={() => setSelectedNode(null)}
            backgroundColor="#050505"
            // Ensure width/height fills container, though normally we'd measure ref bounds
            width={typeof window !== 'undefined' ? window.innerWidth - 256 : 1000} 
            height={typeof window !== 'undefined' ? window.innerHeight : 800}
          />
        )}
      </div>

      {/* Detail Slideout */}
      <div className={`absolute top-0 right-0 h-full w-96 glass-panel border-l border-border transition-transform duration-300 transform ${selectedNode ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedNode && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-border flex justify-between items-start">
              <div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-border text-text-muted mb-2">
                  Entity
                </span>
                <h2 className="font-display text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-text-primary to-text-muted">
                  {selectedNode.label || selectedNode.id}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-2 rounded-full" 
                        style={{ 
                          backgroundColor: selectedNode.type === 'person' ? '#F59E0B' : 
                                           selectedNode.type === 'organization' ? '#10B981' : 
                                           selectedNode.type === 'location' ? '#EF4444' : '#525252' 
                        }} 
                  />
                  <span className="text-xs font-mono uppercase text-text-secondary">{selectedNode.type}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                  <Network size={12} /> Direct Connections
                </h3>
                
                <div className="space-y-2">
                  {graphData?.links
                    .filter((e: any) => e.source.id === selectedNode.id || e.target.id === selectedNode.id)
                    .map((edge: any, i: number) => {
                      const isSource = edge.source.id === selectedNode.id;
                      const targetNode = isSource ? edge.target : edge.source;
                      return (
                        <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-surface border border-border/50 text-sm font-mono cursor-pointer hover:border-accent-primary/50 transition-colors" onClick={() => handleNodeClick(targetNode)}>
                           <div className="flex justify-between items-center text-text-muted text-xs">
                             <span>{edge.label}</span>
                             <ChevronRight size={14} />
                           </div>
                           <div className="text-accent-primary">{targetNode.label || targetNode.id}</div>
                        </div>
                      );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                  <Database size={12} /> Source Documents
                </h3>
                {selectedNode.source_files?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                     {selectedNode.source_files.map((file: string, i: number) => (
                       <span key={i} className="px-2 py-1 rounded bg-[#111] border border-border text-xs font-mono text-text-secondary">
                         {file}
                       </span>
                     ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted font-mono italic">Source tracking not available for this node</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
