import { LangBadge } from '@/components/ui/LangBadge';

interface LanguagesTabProps {
  data: any;
}

export function LanguagesTab({ data }: LanguagesTabProps) {
  if (!data?.overall_language_distribution) return <div className="text-text-muted font-mono text-sm">No language data available.</div>;

  const overall = data.overall_language_distribution;
  const totalFiles = Object.values(overall).reduce((a: any, b: any) => a + b, 0) as number;

  return (
    <div className="space-y-12 pb-20 max-w-5xl">
      <div>
        <h3 className="font-mono text-sm text-text-muted uppercase tracking-widest mb-6 pb-2 border-b border-border">Overall Language Distribution</h3>
        <div className="flex flex-col gap-4">
          {Object.entries(overall).sort((a: any, b: any) => b[1] - a[1]).map(([lang, count]: [string, any]) => {
            const pct = Math.round((count / totalFiles) * 100);
            return (
              <div key={lang} className="flex items-center gap-6">
                <div className="w-24">
                  <LangBadge lang={lang} count={count} percentage={pct} />
                </div>
                <div className="flex-1 h-3 bg-surface border border-border rounded overflow-hidden">
                  <div 
                    className="h-full bg-accent-primary" 
                    style={{ width: `${pct}%` }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-mono text-sm text-text-muted uppercase tracking-widest mb-6 pb-2 border-b border-border">Per-Cluster Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.language_distribution && Object.entries(data.language_distribution).map(([clusterId, langs]: [string, any]) => {
            const cTotal = Object.values(langs).reduce((a: any,b: any) => a+b, 0) as number;
            return (
              <div key={clusterId} className="glass-panel p-6 border border-border rounded-lg">
                <h4 className="font-display font-medium text-accent-primary mb-4">Cluster {clusterId}</h4>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(langs).sort((a: any, b: any) => b[1] - a[1]).map(([lang, count]: [string, any]) => (
                     <LangBadge key={lang} lang={lang} count={count} percentage={Math.round((count/cTotal)*100)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
