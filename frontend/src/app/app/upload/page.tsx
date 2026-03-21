'use client';

import { useState, useRef } from 'react';
import { Upload, File, FolderOpen, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { StepBadge } from '@/components/ui/StepBadge';
import { useStore } from '@/lib/store';
import { api, Endpoints } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ClusterCard } from '@/components/clusters/ClusterCard';

export default function UploadPage() {
  const { activeWorkspaceId, setActiveWorkspaceId, isPipelineRunning, setPipelineRunning, setClusterData } = useStore();
  
  const [tab, setTab] = useState<'files'|'workspace'|'drive'>('files');
  const [wsInput, setWsInput] = useState('');
  const [driveFolder, setDriveFolder] = useState('');
  
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [clusterResults, setClusterResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Drag Drop Handlers
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files!)]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const createWorkspace = async () => {
    try {
      const res = await api.post(Endpoints.createWorkspace, { name: wsInput || `WS-${Date.now()}` });
      setActiveWorkspaceId(res.data.workspace.workspace_id);
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace');
    }
  };

  const runPipeline = async () => {
    if (files.length === 0 && uploadedPaths.length === 0) {
      setError('Please select files first');
      return;
    }
    
    setError(null);
    setPipelineRunning(true);
    setClusterResults(null);

    let pathsToProcess = [...uploadedPaths];

    try {
      // 0. Auto-create Workspace if missing
      let currentWsId = activeWorkspaceId;
      if (!currentWsId) {
        const wsRes = await api.post(Endpoints.createWorkspace, { name: `Auto-WS-${Date.now()}` });
        currentWsId = wsRes.data.workspace.workspace_id;
        setActiveWorkspaceId(currentWsId);
      }

      // 1. Upload files if not already uploaded
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        
        const uploadRes = await api.post(Endpoints.uploadFiles, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        pathsToProcess = [...pathsToProcess, ...uploadRes.data.file_paths];
        setUploadedPaths(pathsToProcess);
        setFiles([]); // Clear queue
      }

      // 2. Run Pipeline
      const processRes = await api.post(Endpoints.processPipeline, {
        file_paths: pathsToProcess,
        workspace_id: currentWsId
      });
      
      setClusterResults(processRes.data);
      setClusterData(processRes.data);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Pipeline failed');
    } finally {
      setPipelineRunning(false);
    }
  };


  return (
    <div className="p-8 max-w-6xl mx-auto pb-24">
      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold mb-3 tracking-tight">Data Integration</h1>
        <p className="text-text-secondary">Upload your documents or connect external sources to begin the intelligence pipeline.</p>
      </div>

      <StepBadge step="01" label="Upload & Configure" className="mb-6" />

      {activeWorkspaceId && (
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary font-mono text-xs">
          <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
          Active workspace: {activeWorkspaceId}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border mb-8">
        {[
          { id: 'files', label: 'Local Files' },
          { id: 'workspace', label: 'Workspace' },
          { id: 'drive', label: 'Google Drive' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={cn(
              "px-4 py-3 font-mono text-sm tracking-wide uppercase transition-colors relative",
              tab === t.id ? "text-accent-primary" : "text-text-muted hover:text-text-primary"
            )}
          >
            {t.label}
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary" />}
          </button>
        ))}
      </div>

      {tab === 'workspace' && (
        <div className="glass-panel p-6 rounded-lg mb-8 max-w-xl">
          <h3 className="font-display font-medium mb-4">Initialize Context</h3>
          <div className="flex gap-3">
            <input 
              type="text" 
              placeholder="e.g. project-neo-2026"
              className="flex-1 bg-surface-active border border-border rounded px-4 py-2 font-mono text-sm focus:outline-none focus:border-accent-primary transition-colors text-text-primary"
              value={wsInput}
              onChange={(e) => setWsInput(e.target.value)}
            />
            <button 
              onClick={createWorkspace}
              className="bg-[#2A2A2A] hover:bg-[#333] text-text-primary px-6 py-2 rounded font-display tracking-tight transition-colors border border-border"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {tab === 'files' && (
        <div className="mb-8">
          <div 
            className={cn(
              "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all bg-surface/30 cursor-pointer",
              isDragging ? "border-accent-primary bg-accent-primary/5" : "border-border hover:border-text-muted"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect}
              accept=".txt,.pdf,.md,.csv" 
            />
            <div className="h-16 w-16 rounded-full bg-[#1A1A1A] flex items-center justify-center mb-6 text-text-muted">
              <Upload size={28} />
            </div>
            <h3 className="font-display text-xl mb-2">Drag & Drop Documents</h3>
            <p className="text-text-muted text-sm font-mono text-center max-w-md">
              Supports TXT, PDF, MD, CSV. Multi-lingual documents will be clustered and mapped seamlessly.
            </p>
          </div>
          
          {(files.length > 0 || uploadedPaths.length > 0) && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
              {uploadedPaths.map(p => (
                <div key={p} className="flex items-center gap-3 bg-surface p-3 rounded border border-border">
                  <CheckCircle2 size={16} className="text-accent-secondary" />
                  <span className="text-sm font-mono truncate text-text-secondary">{p}</span>
                </div>
              ))}
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-surface-active p-3 rounded border border-border">
                  <File size={16} className="text-text-muted" />
                  <span className="text-sm font-mono truncate">{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 rounded bg-accent-danger/10 border border-accent-danger/20 flex items-start gap-3">
          <AlertCircle className="text-accent-danger flex-shrink-0 mt-0.5" size={18} />
          <p className="text-accent-danger text-sm font-mono whitespace-pre-wrap">{error}</p>
        </div>
      )}

      <div className="flex gap-4 border-t border-border pt-8 mt-4">
        <button
          onClick={runPipeline}
          disabled={isPipelineRunning || (files.length === 0 && uploadedPaths.length === 0)}
          className={cn(
            "flex items-center gap-3 px-8 py-4 rounded-lg font-display tracking-wide uppercase font-bold transition-all",
            isPipelineRunning 
              ? "bg-accent-primary/50 text-black/50 cursor-not-allowed" 
              : "bg-accent-primary text-black hover-glow-amber hover:bg-amber-400 disabled:opacity-30 disabled:hover:shadow-none"
          )}
        >
          {isPipelineRunning ? (
            <><span className="animate-pulse">● ● ●</span> Running Pipeline...</>
          ) : (
            <><Play fill="currentColor" size={16} /> Run Intelligence Pipeline</>
          )}
        </button>
        
        {(files.length > 0 || uploadedPaths.length > 0 || clusterResults) && (
          <button 
            onClick={() => { setFiles([]); setUploadedPaths([]); setClusterResults(null); }}
            className="px-6 py-4 rounded hover:bg-surface-active text-text-muted hover:text-text-primary transition-colors font-mono text-sm"
          >
            Reset Queue
          </button>
        )}
      </div>

      {/* Results Overview */}
      {clusterResults && (
        <div className="mt-16 animate-in slide-in-from-bottom-8 fade-in duration-700">
          <div className="flex items-end justify-between mb-8 pb-4 border-b border-border">
            <div>
              <StepBadge step="02" label="Pipeline Complete" className="mb-3" />
              <h2 className="font-display text-2xl font-bold">Analysis Ready</h2>
            </div>
            <div className="flex gap-3">
              <div className="px-4 py-2 bg-surface border border-border rounded font-mono text-xs flex items-center gap-2">
                <span className="text-accent-secondary font-bold">{Object.keys(clusterResults.clusters).length}</span> Clusters
              </div>
              <div className="px-4 py-2 bg-surface border border-border rounded font-mono text-xs flex items-center gap-2">
                <span className="text-accent-primary font-bold">{clusterResults.rag_chunks_indexed}</span> Indexed Chunks
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            {clusterResults.insight_data?.map((insight: any) => {
              // Map insight data back to cluster format for the card
              const clusterData = {
                id: insight.cluster_id,
                name: insight.cluster_name,
                description: insight.summary,
                keywords: insight.top_keywords,
                files: clusterResults.clusters[insight.cluster_id]?.map((fname: string) => ({
                  name: fname,
                  language: clusterResults.file_languages?.[fname]?.source || 'en'
                })) || []
              };

              return <ClusterCard key={insight.cluster_id} cluster={clusterData} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
