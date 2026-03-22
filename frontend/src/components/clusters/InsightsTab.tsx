'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { SentimentBar } from '@/components/ui/SentimentBar';
import { Tag } from 'lucide-react';

interface InsightsTabProps {
  data: any;
}

export function InsightsTab({ data }: InsightsTabProps) {
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(
    data?.insight_data?.[0]?.cluster_id ?? null
  );

  if (!data || !data.insight_data) return <div className="text-text-muted font-mono text-sm">No insights available.</div>;

  const insights = data.insight_data;
  const activeInsight = insights.find((i: any) => i.cluster_id === selectedClusterId);
  
  // Extract sentiment matching
  // data.sentiment often comes in shape: { "cluster_X": { pos: 0, neu: 0, neg: 0 } }
  // We need to parse or match "cluster_X" with cluster_id
  const sentimentKey = `cluster_${selectedClusterId}`;
  const sentimentStats = data.sentiment ? data.sentiment[sentimentKey] : null;

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full min-h-[500px]">
      {/* Left Sidebar List */}
      <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2 border-r border-border pr-6">
        {insights.map((insight: any) => {
          const isActive = selectedClusterId === insight.cluster_id;
          return (
            <button
              key={insight.cluster_id}
              onClick={() => setSelectedClusterId(insight.cluster_id)}
              className={cn(
                "text-left px-4 py-3 rounded-md transition-colors w-full font-display border",
                "text-left px-4 py-3 rounded-md transition-all duration-300 w-full font-display border",
                isActive 
                  ? "bg-accent-primary/20 border-accent-primary/50 text-accent-primary shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                  : "bg-white/5 border-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary"
              )}
            >
              <div className="font-bold flex items-center justify-between">
                <span className="truncate">{insight.cluster_name}</span>
                <span className="text-[10px] font-mono opacity-50 ml-2">#{insight.cluster_id}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Right Detail Panel */}
      <div className="flex-1 glass-panel border border-white/10 rounded-xl p-8 bg-surface/20">
        {activeInsight ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="font-display text-2xl font-bold text-accent-primary mb-6">
              {activeInsight.cluster_name}
            </h2>

            <div className="mb-8">
              <h3 className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3 border-b border-border pb-1">Auto Summary</h3>
              <p className="text-text-primary leading-relaxed">
                {activeInsight.summary}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3 border-b border-border pb-1">Sentiment Analysis</h3>
                {sentimentStats ? (
                  <div className="bg-white/5 border border-white/10 p-4 rounded-md backdrop-blur-sm">
                    <SentimentBar 
                      positive={sentimentStats.positive || 0} 
                      neutral={sentimentStats.neutral || 0} 
                      negative={sentimentStats.negative || 0} 
                    />
                  </div>
                ) : (
                  <p className="text-sm font-mono text-text-muted">No sentiment data computed.</p>
                )}
              </div>

              <div>
                <h3 className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3 border-b border-border pb-1">Smart Tags · Top Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {activeInsight.top_keywords?.map((kw: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-white/5 backdrop-blur-sm border border-white/10 text-text-primary text-xs font-mono rounded-md flex items-center gap-2 hover:border-accent-primary/50 transition-colors">
                      <Tag size={12} className="text-accent-primary" />
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
          </div>
        ) : (
           <div className="h-full flex items-center justify-center text-text-muted font-mono text-sm">
             Select a cluster from the sidebar
           </div>
        )}
      </div>
    </div>
  );
}
