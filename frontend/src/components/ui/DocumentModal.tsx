import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Download, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';

interface DocumentModalProps {
  filename: string;
  onClose: () => void;
}

export function DocumentModal({ filename, onClose }: DocumentModalProps) {
  const [activeTab, setActiveTab] = useState<'original'|'translated'>('translated');
  const [content, setContent] = useState<{original: string; translated: string}>({ original: '', translated: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        const [origRes, transRes] = await Promise.allSettled([
          api.get(`/files/${filename}`),
          api.get(`/translated/${filename.replace('.txt', '_translated.txt')}`)
        ]);

        let origText = origRes.status === 'fulfilled' ? origRes.value.data : 'Original file unavailable.';
        let transText = transRes.status === 'fulfilled' ? transRes.value.data : 'Translated file unavailable.';
        
        setContent({ original: origText, translated: transText });
      } catch (e) {
        console.error("Failed to load document content", e);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [filename]);

  const handleDownload = () => {
    const textBlob = new Blob([content[activeTab]], { type: 'text/plain' });
    const url = URL.createObjectURL(textBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab === 'translated' ? filename.replace('.txt', '_translated.txt') : filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-4xl h-[85vh] flex flex-col rounded-xl overflow-hidden border border-white/10 shadow-2xl">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-surface/40 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="text-accent-primary" />
            <h3 className="font-mono text-sm font-bold text-text-primary truncate max-w-[300px] sm:max-w-md">{filename}</h3>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-[#111] border border-border rounded p-1">
              <button 
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${activeTab === 'original' ? 'bg-[#333] text-white' : 'text-text-muted hover:text-white'}`}
                onClick={() => setActiveTab('original')}
              >
                Original
              </button>
              <button 
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${activeTab === 'translated' ? 'bg-accent-primary text-black font-bold' : 'text-text-muted hover:text-white'}`}
                onClick={() => setActiveTab('translated')}
              >
                Translated
              </button>
            </div>
            
            <button 
              onClick={handleDownload}
              className="p-1.5 text-text-muted hover:text-accent-primary transition-colors flex items-center gap-1 text-xs font-mono"
            >
              <Download size={16} /> 
              <span className="hidden sm:inline">Save</span>
            </button>
            
            <div className="w-px h-6 bg-border mx-1"></div>

            <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-auto p-6 bg-transparent">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted animate-pulse">
              <RotateCcw className="mb-2 animate-spin" size={24} />
              <p className="font-mono text-xs uppercase tracking-widest">Loading content...</p>
            </div>
          ) : (
            <pre className="font-mono text-sm leading-relaxed text-text-secondary whitespace-pre-wrap break-words max-w-none">
              {content[activeTab]}
            </pre>
          )}
        </div>

      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
