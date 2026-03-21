import { useState } from 'react';
import { ChevronDown, ChevronUp, Tag, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileTag } from '@/components/ui/FileTag';
import { api } from '@/lib/api';

interface ClusterCardProps {
  cluster: {
    id: string | number;
    name: string;
    description?: string;
    keywords?: string[];
    files: {
      name: string;
      language?: string;
    }[];
  };
}

export function ClusterCard({ cluster }: ClusterCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadZip = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;
    
    try {
      setDownloading(true);
      const res = await api.post('/download-cluster-zip', {
        cluster_name: cluster.name,
        files: cluster.files.map(f => f.name)
      }, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${cluster.name.replace(/[^a-zA-Z0-9]/g, '_')}_files.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to download ZIP file", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="glass-panel border-border rounded-lg overflow-hidden transition-all duration-300">
      <div 
        className="p-5 cursor-pointer hover:bg-surface-hover flex items-start gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mt-1 w-2.5 h-2.5 rounded-full bg-accent-primary shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
        
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-display font-bold text-lg text-accent-primary">{cluster.name}</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-text-muted bg-[#1A1A1A] px-2 py-0.5 rounded border border-border">
                {cluster.files.length} Docs
              </span>
              <button className="text-text-muted hover:text-text-primary transition-colors">
                {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3">
            {cluster.keywords?.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-surface-active text-text-secondary border border-border text-xs font-mono flex items-center gap-1.5">
                <Tag size={10} />
                {kw}
              </span>
            ))}
          </div>

          {cluster.description && (
            <p className="mt-4 text-sm text-text-secondary leading-relaxed">
              {cluster.description}
            </p>
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-5 border-t border-border bg-surface/50">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-mono text-xs uppercase tracking-widest text-text-muted flex items-center justify-between">
              <span>Documents in Cluster</span>
            </h4>
            
            <button 
              onClick={handleDownloadZip}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#111] hover:bg-accent-primary hover:text-black border border-border hover:border-accent-primary text-text-muted transition-colors rounded text-xs font-mono disabled:opacity-50"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{downloading ? 'Zipping...' : 'Download ZIP'}</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cluster.files.map((file, idx) => (
              <FileTag 
                key={idx} 
                filename={file.name} 
                langBadge={file.language} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
