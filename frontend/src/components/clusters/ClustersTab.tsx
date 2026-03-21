import { ClusterCard } from "./ClusterCard";

interface ClustersTabProps {
  data: any;
}

export function ClustersTab({ data }: ClustersTabProps) {
  if (!data || !data.insight_data) return <div className="text-text-muted font-mono text-sm">No cluster data available.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
      {data.insight_data.map((insight: any) => {
        const clusterData = {
          id: insight.cluster_id,
          name: insight.cluster_name,
          description: insight.summary,
          keywords: insight.top_keywords,
          files: (data.clusters[insight.cluster_name] || data.clusters[insight.cluster_id])?.map((fname: string) => ({
            name: fname,
            language: data.file_languages?.[fname]?.source || 'en'
          })) || []
        };

        return <ClusterCard key={insight.cluster_id} cluster={clusterData} />;
      })}
    </div>
  );
}
