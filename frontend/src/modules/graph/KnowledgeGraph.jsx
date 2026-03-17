import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3-force-3d';

const KG_COLORS = {
  PERSON: { fill: "#ffb300", border: "#ffcd38", glow: "rgba(255,179,0,0.4)"  },
  ORG:    { fill: "#ff8c00", border: "#ffa733", glow: "rgba(255,140,0,0.4)"  },
  LOC:    { fill: "#ff5e3a", border: "#ff866a", glow: "rgba(255,94,58,0.4)"  },
  DATE:   { fill: "#fbbf24", border: "#fcd34d", glow: "rgba(251,191,36,0.4)" },
  TECH:   { fill: "#ffd700", border: "#ffeb3b", glow: "rgba(255,215,0,0.4)" },
  OTHER:  { fill: "#64748b", border: "#94a3b8", glow: "rgba(100,116,139,0.3)" },
};

const KnowledgeGraph = ({ entities = [], relationships = [] }) => {
  const fgRef = useRef();
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);

  // Process data for the graph
  const graphData = useMemo(() => {
    // Only include entities that appear in relationships
    const linkedEntityNames = new Set();
    relationships.forEach(r => {
      const source = r.subject || r.source;
      const target = r.object || r.target;
      if (source) linkedEntityNames.add(source);
      if (target) linkedEntityNames.add(target);
    });

    // Map entities to nodes
    const nodes = entities
      .filter(e => {
        const name = e.name || e.text || e.entity;
        return linkedEntityNames.has(name);
      })
      .map(e => {
        const name = e.name || e.text || e.entity;
        const rawType = (e.type || e.label || "other").toLowerCase();
        const type =
          rawType.includes("person") || rawType === "per" ? "PERSON" :
          rawType.includes("org")                          ? "ORG"    :
          rawType.includes("loc") || rawType === "gpe"     ? "LOC"    :
          rawType.includes("date") || rawType.includes("time") ? "DATE" :
          rawType.includes("tech") || rawType.includes("product") ? "TECH" : "OTHER";
        
        // Calculate degree (connectivity)
        const degree = relationships.filter(r => 
          (r.subject || r.source) === name || (r.object || r.target) === name
        ).length;

        return {
          id: name,
          name,
          type,
          val: Math.max(degree * 2, 4), // Node size based on degree
          degree
        };
      });

    // Map relationships to links
    const links = relationships
      .map(r => ({
        source: r.subject || r.source,
        target: r.object || r.target,
        label: r.relationship || r.predicate || ""
      }))
      .filter(l => 
        nodes.find(n => n.id === l.source) && 
        nodes.find(n => n.id === l.target) &&
        l.source !== l.target // Avoid self-loops for now
      );

    return { nodes, links };
  }, [entities, relationships]);

  // Handle node interaction
  const updateHighlight = () => {
    setHighlightNodes(highlightNodes);
    setHighlightLinks(highlightLinks);
  };

  const handleNodeClick = useCallback(node => {
    const newHighlightNodes = new Set();
    const newHighlightLinks = new Set();

    if (node) {
      newHighlightNodes.add(node.id);
      graphData.links.forEach(link => {
        if (link.source.id === node.id || link.target.id === node.id) {
          newHighlightLinks.add(link);
          newHighlightNodes.add(link.source.id);
          newHighlightNodes.add(link.target.id);
        }
      });
    }

    setHighlightNodes(newHighlightNodes);
    setHighlightLinks(newHighlightLinks);
  }, [graphData]);

  const handleBackgroundClick = useCallback(() => {
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
  }, []);

  // Use useEffect to center the graph once data is loaded
  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      fgRef.current.zoomToFit(400, 100);
      
      // Fine-tune the force layout
      fgRef.current.d3Force('charge').strength(-150);
      fgRef.current.d3Force('link').distance(100);
      fgRef.current.d3Force('collide', d3.forceCollide(n => n.val + 10));
    }
  }, [graphData]);

  if (graphData.nodes.length === 0) {
    return (
      <div style={{ height: 440, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9, background: "#0d1117", borderRadius: 10 }}>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
          No connected entities found. Ensure extraction is complete.
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 440, background: '#0d1117', position: 'relative' }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="#0d1117"
        nodeLabel={n => `
          <div style="background: rgba(13,17,23,0.95); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); font-family: sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
            <div style="color: ${KG_COLORS[n.type]?.fill || '#fff'}; font-weight: bold; margin-bottom: 2px;">${n.name}</div>
            <div style="color: rgba(255,255,255,0.6); font-size: 10px;">Type: ${n.type}</div>
            <div style="color: rgba(255,255,255,0.6); font-size: 10px;">Connections: ${n.degree}</div>
          </div>
        `}
        nodeRelSize={4}
        nodeColor={n => KG_COLORS[n.type]?.fill || "#64748b"}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          const r = Math.sqrt(Math.max(0, node.val || 1)) * 4;
          const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
          const isHovered = hoverNode === node;
          
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
          
          // Glow effect
          if (isHighlighted || isHovered) {
            ctx.shadowColor = KG_COLORS[node.type]?.fill || "#fff";
            ctx.shadowBlur = (isHighlighted ? 15 : 25) / globalScale;
          } else {
            ctx.shadowBlur = 0;
          }
          
          ctx.fillStyle = KG_COLORS[node.type]?.fill || "#64748b";
          if (!isHighlighted && highlightNodes.size > 0) ctx.globalAlpha = 0.2;
          ctx.fill();
          ctx.globalAlpha = 1.0;
          ctx.shadowBlur = 0;

          // Border for circle
          ctx.strokeStyle = KG_COLORS[node.type]?.border || "#fff";
          ctx.lineWidth = 1 / globalScale;
          ctx.stroke();

          // Text label
          if (globalScale > 1.5 || isHighlighted) {
            ctx.font = `${fontSize}px JetBrains Mono, monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isHighlighted ? 'white' : 'rgba(255,255,255,0.5)';
            ctx.fillText(label, node.x, node.y + r + fontSize + 2);
          }
        }}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.25}
        linkWidth={link => highlightLinks.has(link) ? 2 : 1}
        linkColor={link => highlightLinks.size > 0 ? (highlightLinks.has(link) ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.05)') : 'rgba(255,255,255,0.15)'}
        linkCanvasObjectMode={() => 'after'}
        linkCanvasObject={(link, ctx, globalScale) => {
          if (globalScale < 2.5 && !highlightLinks.has(link)) return;
          const MAX_FONT_SIZE = 4;
          const LABEL_NODE_MARGIN = 4;

          const start = link.source;
          const end = link.target;

          // ignore unbound links
          if (typeof start !== 'object' || typeof end !== 'object') return;

          // calculate label positioning
          const textPos = {
            x: start.x + (end.x - start.x) / 2,
            y: start.y + (end.y - start.y) / 2
          };

          const relAngle = Math.atan2(end.y - start.y, end.x - start.x);

          const fontSize = Math.min(MAX_FONT_SIZE, 10 / globalScale);
          ctx.font = `${fontSize}px Sans-Serif`;

          const textWidth = ctx.measureText(link.label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

          ctx.save();
          ctx.translate(textPos.x, textPos.y);
          ctx.rotate(relAngle);

          ctx.fillStyle = 'rgba(13, 17, 23, 0.8)';
          ctx.fillRect(-bckgDimensions[0] / 2, -bckgDimensions[1] / 2, ...bckgDimensions);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = highlightLinks.has(link) ? '#ffb300' : 'rgba(255, 255, 255, 0.4)';
          ctx.fillText(link.label, 0, 0);
          ctx.restore();
        }}
        onNodeClick={handleNodeClick}
        onNodeHover={node => setHoverNode(node)}
        onBackgroundClick={handleBackgroundClick}
        enableNodeDrag={true}
        enablePanInteraction={true}
        enableZoomInteraction={true}
        onNodeDragEnd={node => {
          node.fx = node.x;
          node.fy = node.y;
        }}
      />
      <div style={{ position: 'absolute', bottom: 10, left: 10, pointerEvents: 'none', fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
        Left-click: Highlight &middot; Scroll: Zoom &middot; Drag: Pan/Move
      </div>
    </div>
  );
};

export default KnowledgeGraph;
