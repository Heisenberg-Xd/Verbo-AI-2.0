'use client';

import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

/* ── Types ── */
interface KGNode {
  id: string;
  label: string;
  type: string;
  val?: number;
  cluster_id?: string;
  source_files?: string[];
  [key: string]: any;
}

interface KGLink {
  source: string | KGNode;
  target: string | KGNode;
  label?: string;
  [key: string]: any;
}

interface KnowledgeGraphProps {
  data: { nodes: KGNode[]; links: KGLink[] };
  onNodeClick?: (node: KGNode) => void;
  className?: string;
}

/* ── Palette ── */
const TYPE_COLORS: Record<string, string> = {
  person: '#F59E0B',
  organization: '#10B981',
  location: '#EF4444',
  date: '#A855F7',
  other: '#94A3B8',
};
const COLOR_DEFAULT = '#94A3B8';
const col = (t: string) => TYPE_COLORS[t] || COLOR_DEFAULT;

/* ── Component ── */
export function KnowledgeGraph({ data, onNodeClick, className }: KnowledgeGraphProps) {
  const fgRef = useRef<any>(null);
  const [hoverNode, setHoverNode] = useState<KGNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>(['person', 'organization', 'location', 'other']);

  /* ── Connected-node set for hover highlighting ── */
  const connectedNodeIds = useMemo(() => {
    if (!hoverNode) return new Set<string>();
    const s = new Set<string>();
    s.add(hoverNode.id);
    data.links.forEach(l => {
      const sid = typeof l.source === 'string' ? l.source : l.source?.id;
      const tid = typeof l.target === 'string' ? l.target : l.target?.id;
      if (sid === hoverNode.id && tid) s.add(tid);
      if (tid === hoverNode.id && sid) s.add(sid);
    });
    return s;
  }, [hoverNode, data.links]);

  /* ── Filtered data ── */
  const filteredData = useMemo(() => {
    const nodes = data.nodes.filter(n => {
      // Map unknown/unsupported types to 'other' for filtering
      const t = ['person', 'organization', 'location'].includes(n.type) ? n.type : 'other';
      if (!activeFilters.includes(t)) return false;
      if (searchQuery && !n.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
    const ids = new Set(nodes.map(n => n.id));
    const links = data.links.filter(l => {
      const s = typeof l.source === 'string' ? l.source : l.source?.id;
      const t = typeof l.target === 'string' ? l.target : l.target?.id;
      return s && t && ids.has(s) && ids.has(t);
    });
    console.log('[KG Component] filteredData:', nodes.length, 'nodes,', links.length, 'links');
    if (links.length > 0) {
      console.log('[KG Component] Sample link:', JSON.stringify(links[0]));
    }
    if (data.links.length > 0 && links.length === 0) {
      console.warn('[KG Component] ALL LINKS FILTERED OUT!');
      console.warn('[KG Component] Raw link sample source:', typeof data.links[0].source === 'string' ? data.links[0].source : data.links[0].source?.id);
      console.warn('[KG Component] Node IDs sample:', [...ids].slice(0, 5));
    }
    return { nodes, links };
  }, [data, searchQuery, activeFilters]);

  /* ── D3 force config ── */
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    try {
      const lf = fg.d3Force('link');
      if (lf) lf.distance(120).strength(0.4);
      const cf = fg.d3Force('charge');
      if (cf) cf.strength(-200);
      fg.d3ReheatSimulation();
    } catch { /* graph may not be ready */ }
  }, [filteredData]);

  /* ═══════════════════════════════════════════════
     NODE RENDERER — large circles with type icons
     ═══════════════════════════════════════════════ */
  const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (node.x == null || node.y == null) return;

    const isHovered = hoverNode?.id === node.id;
    const isConnected = hoverNode ? connectedNodeIds.has(node.id) : false;
    const isDimmed = hoverNode != null && !isHovered && !isConnected;

    const R = Math.min(10, 5 + (node.val || 1));
    const color = col(node.type);

    /* Outer glow ring */
    if (isConnected || isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, R + (isHovered ? 8 : 4), 0, 2 * Math.PI);
      ctx.fillStyle = `${color}${isHovered ? '40' : '20'}`;
      ctx.fill();
    }

    /* Inner fill with subtle gradient */
    const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, R);
    grad.addColorStop(0, isDimmed ? '#111' : '#2A2A2A');
    grad.addColorStop(1, isDimmed ? '#000' : '#0A0A0A');

    ctx.beginPath();
    ctx.arc(node.x, node.y, R, 0, 2 * Math.PI);
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.strokeStyle = isDimmed ? `${color}40` : color;
    ctx.stroke();
    ctx.fillStyle = grad;
    ctx.fill();

    /* Center dot in type color */
    ctx.beginPath();
    ctx.arc(node.x, node.y, R * 0.35, 0, 2 * Math.PI);
    ctx.fillStyle = isDimmed ? `${color}50` : color;
    ctx.fill();

    /* Label below node with text shadow for readability */
    const fs = Math.max(4, 12 / globalScale);
    ctx.font = `bold ${fs}px "Space Mono", "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const raw = node.label || node.id || '';
    const display = raw.length > 25 ? raw.substring(0, 25) + '…' : raw;

    // Optional text shadow wrapper logic by drawing stroke then fill
    ctx.lineWidth = 2 / globalScale;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(display.toUpperCase(), node.x, node.y + R + 6);
    
    ctx.fillStyle = isDimmed ? '#666' : (node.type === 'person' ? '#F59E0B' : '#E5E5E5');
    ctx.fillText(display.toUpperCase(), node.x, node.y + R + 6);
  }, [hoverNode, connectedNodeIds]);

  /* ── Legend helpers ── */
  const toggleFilter = (type: string) => {
    setActiveFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  /* ═══════════════════════════════════════════════
     JSX
     ═══════════════════════════════════════════════ */
  return (
    <div className={cn("relative w-full h-full bg-[#0A0A0A]", className)}>
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Legend & Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
        {/* Legend pills */}
        <div className="flex gap-2 pointer-events-auto flex-wrap">
          {(['person', 'organization', 'location', 'other'] as const).map(type => {
            const count = data.nodes.filter(n => {
              const mappedType = ['person', 'organization', 'location'].includes(n.type) ? n.type : 'other';
              return mappedType === type;
            }).length;
            return (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={cn(
                  "px-3 py-1.5 rounded-full glass-panel border border-white/10 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest transition-all duration-300",
                  activeFilters.includes(type) ? "opacity-100" : "opacity-30"
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: TYPE_COLORS[type] }} />
                <span className="text-white/80">{type}</span>
                <span className="text-white/40">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Stats + search */}
        <div className="flex flex-col gap-2 items-end pointer-events-auto">
          <span className="px-3 py-1 rounded-full glass-panel border border-accent-primary/30 text-accent-primary font-mono text-[10px] uppercase tracking-widest">
            {filteredData.nodes.length} nodes · {filteredData.links.length} edges
          </span>
          <div className="glass-panel p-2 rounded-lg flex items-center gap-2 w-52 border border-white/10">
            <Search size={13} className="text-white/30 ml-1" />
            <input
              type="text"
              placeholder="SEARCH..."
              className="bg-transparent border-none text-[10px] font-mono focus:outline-none flex-1 py-0.5 text-white uppercase tracking-wider placeholder:text-white/20"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ════════ GRAPH — using BUILT-IN link rendering ════════ */}
      <ForceGraph2D
        ref={fgRef}
        graphData={filteredData}

        /* ── Node rendering ── */
        nodeCanvasObject={drawNode}
        nodePointerAreaPaint={(node: any, paintColor: string, ctx: CanvasRenderingContext2D) => {
          const R = Math.min(10, 5 + (node.val || 1));
          ctx.beginPath();
          ctx.arc(node.x, node.y, R + 6, 0, 2 * Math.PI);
          ctx.fillStyle = paintColor;
          ctx.fill();
        }}

        /* ── Link rendering — BUILT-IN props, BRIGHT and VISIBLE ── */
        linkColor={(link: any) => {
          const sid = typeof link.source === 'string' ? link.source : link.source?.id;
          const tid = typeof link.target === 'string' ? link.target : link.target?.id;
          
          if (!hoverNode) return '#444444'; // Subtle gray baseline
          
          const isConnected = sid === hoverNode.id || tid === hoverNode.id;
          return isConnected ? '#F59E0B99' : '#222222'; // Bright amber for connections
        }}
        linkWidth={(link: any) => {
          if (!hoverNode) return 1.5;
          const sid = typeof link.source === 'string' ? link.source : link.source?.id;
          const tid = typeof link.target === 'string' ? link.target : link.target?.id;
          const isConnected = sid === hoverNode.id || tid === hoverNode.id;
          return isConnected ? 3 : 0.5;
        }}
        linkCurvature={0.2}
        linkDirectionalArrowLength={8}
        linkDirectionalArrowRelPos={0.85}
        linkDirectionalArrowColor={(link: any) => {
          if (!hoverNode) return '#AAAAAA';
          const sid = typeof link.source === 'string' ? link.source : link.source?.id;
          const tid = typeof link.target === 'string' ? link.target : link.target?.id;
          const isConnected = sid === hoverNode.id || tid === hoverNode.id;
          return isConnected ? '#F59E0B' : '#555555';
        }}
        linkDirectionalParticles={(link: any) => {
          if (!hoverNode) return 0;
          const sid = typeof link.source === 'string' ? link.source : link.source?.id;
          const tid = typeof link.target === 'string' ? link.target : link.target?.id;
          return (sid === hoverNode.id || tid === hoverNode.id) ? 3 : 0;
        }}
        linkDirectionalParticleWidth={3}
        linkDirectionalParticleColor={() => '#F59E0B'}
        linkLabel={(link: any) => link.label || link.relationship || ''}
        linkLineDash={[]}

        /* ── Interactions ── */
        onNodeClick={(node: any) => onNodeClick?.(node)}
        onNodeHover={(node: any) => setHoverNode(node || null)}
        onBackgroundClick={() => setHoverNode(null)}
        enableNodeDrag={true}

        /* ── Canvas settings ── */
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={200}
        d3AlphaDecay={0.025}
        d3VelocityDecay={0.35}
        warmupTicks={80}
      />
    </div>
  );
}
