'use client';

import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { 
  User, 
  Building2, 
  MapPin, 
  Tag, 
  X, 
  Search, 
  Filter, 
  ChevronRight, 
  Database, 
  Calendar,
  Network
} from 'lucide-react';

interface KGNode {
  id: string;
  label: string;
  type: string;
  val?: number; // importance (mention count)
  image?: string; // avatar url
  cluster_id?: string;
  source_files?: string[];
  [key: string]: any;
}

interface KGLink {
  source: string | KGNode;
  target: string | KGNode;
  label: string;
  [key: string]: any;
}

interface KnowledgeGraphProps {
  data: {
    nodes: KGNode[];
    links: KGLink[];
  };
  onNodeClick?: (node: KGNode) => void;
  className?: string;
}

const COLORS = {
  person: '#F59E0B',    // Amber
  organization: '#10B981', // Emerald
  location: '#EF4444',     // Red
  other: '#525252',        // Gray
  default: '#525252'
};

const D3_FORCES = {
  distance: 180,
  strength: 0.5,
  charge: -400,
  collide: 60
};

export function KnowledgeGraph({ data, onNodeClick, className }: KnowledgeGraphProps) {
  const fgRef = useRef<any>(null);
  const [hoverNode, setHoverNode] = useState<KGNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>(['person', 'organization', 'location', 'other']);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  // Pre-load images if any
  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  
  // Filtered data based on search and filters
  const filteredData = useMemo(() => {
    let nodes = data.nodes.filter(n => {
      const typeMatch = activeFilters.includes(n.type) || (n.type === 'date' && activeFilters.includes('other'));
      const clusterMatch = !selectedCluster || n.cluster_id === selectedCluster;
      const searchMatch = !searchQuery || 
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        n.id.toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch && clusterMatch && searchMatch;
    });

    const nodeIds = new Set(nodes.map(n => n.id));
    const links = data.links.filter(l => {
      const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
      const targetId = typeof l.target === 'string' ? l.target : l.target.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { nodes, links };
  }, [data, searchQuery, activeFilters, selectedCluster]);

  useEffect(() => {
    if (fgRef.current) {
      const simulation = fgRef.current.d3Force('link');
      if (simulation) {
        simulation.distance(D3_FORCES.distance).strength(D3_FORCES.strength);
      }
      fgRef.current.d3Force('charge').strength(D3_FORCES.charge);
      fgRef.current.d3Force('collision', (d3: any) => d3.forceCollide().radius(D3_FORCES.collide));
      
      // Initial animation ticks
      fgRef.current.resumeAnimation();
    }
  }, [filteredData]);

  const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHovered = hoverNode && hoverNode.id === node.id;
    const isSelected = false; // Add selection state if needed
    
    // Size based on importance (mention count) - spec: min 48px, max 96px diameter
    // r is radius, so min 24, max 48.
    const baseR = 24;
    const importance = node.val || 1;
    const r = Math.min(48, baseR + (importance * 2));
    
    const color = COLORS[node.type as keyof typeof COLORS] || COLORS.default;

    // Node Glow on Hover
    if (isHovered) {
      ctx.shadowColor = COLORS.person; // Spec says amber glow
      ctx.shadowBlur = 12 / globalScale;
    }

    // Outer ring stroke (3px)
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    ctx.lineWidth = 3 / globalScale;
    ctx.strokeStyle = color;
    ctx.stroke();

    // Inner fill (dark #1A1A1A)
    ctx.fillStyle = '#1A1A1A';
    ctx.fill();

    // Image/Icon clipping
    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x, node.y, r - 3 / globalScale, 0, 2 * Math.PI, false);
    ctx.clip();

    // Draw Image if available, else Draw Icon
    if (node.image && imageCache.current[node.image]) {
      const img = imageCache.current[node.image];
      ctx.drawImage(img, node.x - r, node.y - r, r * 2, r * 2);
    } else {
      // Draw Placeholder Icon (Simplification for Canvas)
      ctx.font = `${r}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      
      let icon = '●'; // Default
      if (node.type === 'person') icon = '👤';
      if (node.type === 'organization') icon = '🏢';
      if (node.type === 'location') icon = '📍';
      if (node.type === 'date') icon = '📅';

      ctx.fillText(icon, node.x, node.y);
    }
    
    ctx.restore();
    ctx.shadowBlur = 0; // Reset shadow for labels

    // Label: entity name in Space Mono, ALL CAPS, BELOW node
    const fontSize = 12 / globalScale;
    ctx.font = `bold ${fontSize}px "Space Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = node.type === 'person' ? COLORS.person : (isHovered ? '#FFFFFF' : '#F5F5F5');
    
    const label = node.label || node.id;
    ctx.fillText(label.toUpperCase(), node.x, node.y + r + 8 / globalScale);
  }, [hoverNode]);

  const drawLink = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isSourceHovered = hoverNode && hoverNode.id === link.source.id;
    const isTargetHovered = hoverNode && hoverNode.id === link.target.id;
    const isLinkHighlighted = isSourceHovered || isTargetHovered;
    const isDimmed = hoverNode && !isLinkHighlighted;

    const start = link.source;
    const end = link.target;

    if (!start || !end || typeof start === 'string' || typeof end === 'string') return;

    // Line Path: Curved quadratic bezier
    const cp = {
      x: (start.x + end.x) / 2 + (end.y - start.y) * 0.15,
      y: (start.y + end.y) / 2 + (start.x - end.x) * 0.15
    };

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(cp.x, cp.y, end.x, end.y);
    
    ctx.lineWidth = (isLinkHighlighted ? 2 : 1) / globalScale;
    ctx.strokeStyle = isLinkHighlighted ? COLORS.person : (isDimmed ? '#1A1A1A' : '#2A2A2A');
    ctx.stroke();

    // Arrowhead: small filled triangle at target node
    const angle = Math.atan2(end.y - cp.y, end.x - cp.x);
    const arrowSize = 6 / globalScale;
    
    // Offset arrowhead back slightly to be visible at node edge
    const r = Math.min(48, 24 + (end.val || 1) * 2) + 2;
    const targetX = end.x - Math.cos(angle) * r;
    const targetY = end.y - Math.sin(angle) * r;

    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(targetX - arrowSize * Math.cos(angle - Math.PI / 6), targetY - arrowSize * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(targetX - arrowSize * Math.cos(angle + Math.PI / 6), targetY - arrowSize * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();

    // Link Label: relationship text in IBM Plex Mono, 10px, color #A3A3A3, midpoint
    if (globalScale > 0.8) {
      const labelText = link.label || '';
      const midX = (start.x + cp.x * 2 + end.x) / 4;
      const midY = (start.y + cp.y * 2 + end.y) / 4;
      
      const fontSize = 10 / globalScale;
      ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = isDimmed ? '#1A1A1A' : '#A3A3A3';
      
      // Rotate label to align with curve tangent if possible, or keep flat
      ctx.fillText(labelText, midX, midY - 4 / globalScale);
    }
  }, [hoverNode]);

  const toggleFilter = (type: string) => {
    setActiveFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <div className={cn("relative w-full h-full bg-[#0A0A0A]", className)}>
      {/* Subtle Dot Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-dot-grid z-0" />

      {/* Legend & Controls Bar */}
      <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start pointer-events-none">
        {/* Legend */}
        <div className="flex gap-2 pointer-events-auto">
          {['person', 'organization', 'location', 'other'].map(type => (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              className={cn(
                "px-3 py-1.5 rounded-full glass-panel border border-white/5 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest transition-all",
                activeFilters.includes(type) ? "opacity-100" : "opacity-40 grayscale"
              )}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[type as keyof typeof COLORS] || COLORS.default }} />
              {type}
              <span className="text-text-muted">{data.nodes.filter(n => n.type === type || (type === 'other' && n.type === 'date')).length}</span>
            </button>
          ))}
        </div>

        {/* Right Controls */}
        <div className="flex flex-col gap-4 items-end pointer-events-auto">
          <div className="px-4 py-1.5 rounded-full glass-panel border border-accent-primary/20 text-accent-primary font-mono text-[10px] uppercase tracking-widest">
            {data.nodes.length} total entities
          </div>
          
          <div className="flex gap-2">
            <div className="glass-panel p-2 rounded-lg flex items-center gap-2 w-64 border-white/5 shadow-2xl">
              <Search size={14} className="text-text-muted ml-1" />
              <input 
                type="text" 
                placeholder="SEARCH ENTITIES..."
                className="bg-transparent border-none text-[10px] font-mono focus:outline-none flex-1 py-0.5 text-text-primary uppercase tracking-wider"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={filteredData}
        nodeCanvasObject={drawNode}
        linkCanvasObject={drawLink}
        onNodeClick={(node: any) => onNodeClick?.(node)}
        onNodeHover={(node: any) => setHoverNode(node)}
        enableNodeDrag={true}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={300}
        d3AlphaDecay={0.02}
      />
    </div>
  );
}
