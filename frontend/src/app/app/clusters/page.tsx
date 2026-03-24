'use client';

import { useState, useEffect } from 'react';
import { StepBadge } from '@/components/ui/StepBadge';
import { TabBar } from '@/components/ui/TabBar';
import { useStore } from '@/lib/store';
import { api, Endpoints } from '@/lib/api';
import { ChartPanel } from '@/components/charts/ChartPanel';
import { Activity } from 'lucide-react';

// Import Tabs (we will define these next)
import { ClustersTab } from '@/components/clusters/ClustersTab';
import { InsightsTab } from '@/components/clusters/InsightsTab';
import { MapTab } from '@/components/clusters/MapTab';
import { LanguagesTab } from '@/components/clusters/LanguagesTab';
import { KGTab } from '@/components/clusters/KGTab';
import { ChatTab } from '@/components/clusters/ChatTab';

export default function ClustersPage() {
  const { activeWorkspaceId, clusterData } = useStore();
  const [activeTab, setActiveTab] = useState('clusters');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeWorkspaceId) {
      if (clusterData) {
        setData(clusterData);
      } else {
        loadClusterData();
      }
    }
  }, [activeWorkspaceId, clusterData]);

  const loadClusterData = async () => {
    try {
      setLoading(true);
      // Fallback to the latest persisted global intelligence report 
      const res = await api.get('/report');
      setData(res.data);
    } catch (err) {
      console.error("Failed to load clusters. Make sure to run the preprocessing pipeline first.", err);
    } finally {
      setLoading(false);
    }
  };

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center p-20 h-full text-text-muted">
        <Activity size={48} className="mb-4 text-border" />
        <h2 className="font-display text-xl mb-2 text-text-secondary">No Active Workspace</h2>
        <p className="font-mono text-sm max-w-md text-center">Please initialize a workspace and run the intelligence pipeline from the Upload tab.</p>
      </div>
    );
  }

  // Mock charts if no real elbow scores are provided (since API might return static paths originally)
  const elbowData = data?.elbow_scores || [
    { k: 2, score: 0.8 }, { k: 3, score: 0.6 }, { k: 4, score: 0.4 }, { k: 5, score: 0.35 }
  ];
  const silhouetteData = data?.silhouette_scores || [
    { k: 2, score: 0.4 }, { k: 3, score: 0.55 }, { k: 4, score: 0.72 }, { k: 5, score: 0.61 }
  ];

  const tabs = [
    { id: 'clusters', label: 'Clusters', count: data?.insight_data?.length || 0 },
    { id: 'insights', label: 'Insights', count: data?.insight_data?.length || 0 },
    { id: 'map', label: '2D Map', count: data?.total_documents || 0 },
    { id: 'languages', label: 'Languages', count: data?.overall_language_distribution ? Object.keys(data.overall_language_distribution).length : 0 },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-8 pb-4">
        <div className="flex justify-between items-end mb-6">
          <div>
            <StepBadge step="02" label="Cluster Analysis" className="mb-3" />
            <h1 className="font-display text-3xl font-bold tracking-tight">Intelligence Dashboard</h1>
          </div>
        </div>

        {/* Top Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartPanel 
            title="Elbow Curve" 
            method="A" 
            data={elbowData} 
            dataKey="score" 
            color="#3B82F6" 
          />
          <ChartPanel 
            title="Silhouette Score" 
            method="B" 
            data={silhouetteData} 
            dataKey="score" 
            color="#EC4899" 
          />
        </div>

        <TabBar 
          tabs={tabs} 
          activeId={activeTab} 
          onTabChange={setActiveTab} 
          className="mb-6 -mx-8 px-8" 
        />
      </div>

      <div className="px-8 pb-12">
        {loading && <div className="text-accent-primary animate-pulse font-mono flex items-center gap-2"><div className="w-2 h-2 bg-accent-primary rounded-full" /> Fetching latest cluster data...</div>}
        
        {!loading && data && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'clusters' && <ClustersTab data={data} />}
            {activeTab === 'insights' && <InsightsTab data={data} />}
            {activeTab === 'map' && <MapTab data={data} />}
            {activeTab === 'languages' && <LanguagesTab data={data} />}
          </div>
        )}
      </div>
    </div>
  );
}
