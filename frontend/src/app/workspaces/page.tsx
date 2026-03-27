'use client';

import { useEffect, useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api, Endpoints } from '@/lib/api';
import { Plus, FileText, MoreHorizontal, ChevronRight, BrainCircuit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { CelestialSphere } from '@/components/ui/celestial-sphere';

interface Workspace {
  workspace_id: string;
  name: string;
  description: string;
  created_at: string;
  status: string;
  document_count: number;
  entity_count: number;
  relationship_count: number;
  drive_connected: boolean;
}

export default function StandaloneWorkspacesPage() {
  const router = useRouter();
  const { activeWorkspaceId, setActiveWorkspaceId } = useStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const res = await api.get(Endpoints.listWorkspaces);
      const wsList = res.data.workspaces || [];
      // Sort by newest first
      const sorted = wsList.sort((a: Workspace, b: Workspace) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setWorkspaces(sorted);
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitCreateWorkspace = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = newWorkspaceName.trim() || `Workspace-${Math.floor(Math.random() * 1000)}`;
    
    try {
      const res = await api.post(Endpoints.createWorkspace, { name: finalName, description: '' });
      setActiveWorkspaceId(res.data.workspace.workspace_id);
      router.push('/app/upload');
    } catch (err) {
      console.error('Failed to create workspace:', err);
    }
  };

  const openWorkspace = (id: string, event?: React.MouseEvent) => {
    if (event) {
       event.stopPropagation();
    }
    setActiveWorkspaceId(id);
    router.push('/app/upload'); 
  };

  const deleteWorkspace = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      if (!window.confirm("Are you sure you want to delete this workspace forever?")) return;
      
      await api.delete(Endpoints.deleteWorkspace(id));
      
      // If deleted active workspace, clear it
      if (activeWorkspaceId === id) {
        setActiveWorkspaceId(null);
      }
      
      // Refresh list
      loadWorkspaces();
    } catch (err) {
      console.error('Failed to delete workspace:', err);
    }
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '—';
    try {
      const date = new Date(isoStr);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
    } catch {
      return isoStr;
    }
  };

  const submitDeleteAll = async () => {
    if (deleteAllConfirmText !== 'Delete All') return;
    try {
      setLoading(true);
      await api.delete(Endpoints.deleteAllWorkspaces);
      setActiveWorkspaceId(null);
      await loadWorkspaces();
      setIsDeletingAll(false);
      setDeleteAllConfirmText('');
    } catch (err) {
      console.error('Failed to delete all workspaces:', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-[#050505] text-[#E0E0E0] overflow-y-auto custom-scrollbar flex flex-col">
      {/* Animated WebGL Background for glassmorphism */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <CelestialSphere 
          className="w-full h-full mix-blend-screen opacity-60" 
          hue={38} 
          zoom={1.5} 
          particleSize={4.0} 
        />
        <div className="absolute inset-0 bg-[#050505]/70 backdrop-blur-[2px]" />
      </div>

      {/* Top Navigation Bar */}
      <nav className="relative z-10 border-b border-white/5 bg-black/30 backdrop-blur-xl w-full">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded bg-accent-primary/10 border border-accent-primary flex items-center justify-center text-accent-primary">
              <BrainCircuit size={18} />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white">VERBO AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 border border-white/20 shadow-inner flex items-center justify-center overflow-hidden">
               <div className="w-3 h-3 rounded-full bg-white opacity-50 absolute mix-blend-overlay"></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Hub */}
      <div className="w-full max-w-7xl mx-auto px-8 py-16 flex-1">
        
        <div className="mb-10 relative z-10">
           <h1 className="font-display text-4xl text-accent-primary font-bold mb-2">Workspaces Hub</h1>
           <p className="text-accent-primary/80 font-mono text-sm max-w-xl">Create a new intelligence container or resume exploring specific domains from your saved workspace instances.</p>
        </div>

        {/* Top Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 relative z-10">
          
          {isCreating ? (
            <div className="flex flex-col p-8 h-44 rounded-2xl glass-panel bg-black/40 backdrop-blur-2xl border border-accent-primary shadow-[0_0_30px_rgba(245,158,11,0.1)] relative">
               <span className="text-xs font-mono text-accent-primary uppercase tracking-widest mb-4">New Workspace</span>
               <form onSubmit={submitCreateWorkspace} className="flex flex-col flex-1 pb-2">
                 <input 
                   ref={inputRef}
                   type="text"
                   value={newWorkspaceName}
                   onChange={e => setNewWorkspaceName(e.target.value)}
                   className="w-full bg-transparent border-b border-white/20 pb-2 text-xl text-white font-display focus:outline-none focus:border-accent-primary placeholder:text-white/20 transition-colors"
                   placeholder="e.g. Finance Q3"
                 />
                 <div className="mt-auto flex justify-between items-center group">
                    <button type="button" onClick={() => setIsCreating(false)} className="text-xs text-text-muted hover:text-white uppercase font-mono tracking-widest">Cancel</button>
                    <button type="submit" className="text-xs text-accent-primary font-bold uppercase font-mono tracking-widest flex items-center gap-1 hover:brightness-125 transition-all">Create <ChevronRight size={14} /></button>
                 </div>
               </form>
            </div>
          ) : (
            <button 
              onClick={() => setIsCreating(true)}
              className="flex flex-col items-center justify-center p-8 h-44 rounded-2xl glass-panel bg-black/40 backdrop-blur-2xl border border-white/10 hover:border-accent-primary/50 hover:bg-white/5 transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-accent-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Plus size={36} className="text-white/30 mb-4 group-hover:text-accent-primary transition-colors stroke-[1]" />
              <span className="text-sm font-bold text-white tracking-wide group-hover:text-accent-primary transition-colors">Create Workspace</span>
            </button>
          )}
          
          <button 
            onClick={() => router.push('/app/upload')}
            className="flex flex-col items-center justify-center p-8 h-44 rounded-2xl glass-panel bg-black/40 backdrop-blur-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all group"
          >
            <FileText size={28} className="text-blue-500/50 mb-4 group-hover:text-blue-500 transition-colors stroke-[1.5]" />
            <span className="text-sm font-bold text-white tracking-wide group-hover:text-blue-400 transition-colors">Import Documents</span>
          </button>

          {/* Delete All Action Card */}
          <button 
            onClick={() => setIsDeletingAll(true)}
            className="flex flex-col items-center justify-center p-8 h-44 rounded-2xl glass-panel bg-red-950/20 backdrop-blur-2xl border border-red-900/40 hover:border-red-500/50 hover:bg-red-900/20 transition-all group"
          >
            <Trash2 size={28} className="text-red-500/50 mb-4 group-hover:text-red-500 transition-colors stroke-[1.5]" />
            <span className="text-sm font-bold text-red-500/80 tracking-wide group-hover:text-red-400 transition-colors">Delete All</span>
          </button>
        </div>

        {/* Table Section */}
        <div className="w-full glass-panel bg-black/40 backdrop-blur-3xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative z-10">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-5 border-b border-white/10 bg-white/[0.02] text-[10px] font-bold uppercase tracking-widest text-text-muted">
            <div className="col-span-5 md:col-span-4 pl-2">Name</div>
            <div className="hidden md:block md:col-span-2">Location</div>
            <div className="col-span-3 md:col-span-2">Created</div>
            <div className="col-span-2 text-center">Docs</div>
            <div className="col-span-2 text-right pr-2">Actions</div>
          </div>

          {/* Table Body */}
          <div className="flex flex-col divide-y divide-white/5">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center bg-black/20">
                <SpinnerIcon className="animate-spin mb-4 text-accent-primary" />
                <span className="text-text-muted text-xs uppercase tracking-widest font-mono">Loading Workspaces...</span>
              </div>
            ) : workspaces.length === 0 ? (
              <div className="py-24 text-center bg-black/20 flex flex-col items-center justify-center">
                 <FolderOpen size={48} className="text-white/10 mb-4" />
                 <span className="text-white/60 text-sm">No workspaces found. Create one above to begin.</span>
              </div>
            ) : (
              workspaces.map((ws) => {
                const isActive = activeWorkspaceId === ws.workspace_id;
                return (
                  <div 
                    key={ws.workspace_id} 
                    onClick={() => openWorkspace(ws.workspace_id)}
                    className={cn(
                      "grid grid-cols-12 gap-4 py-5 px-5 items-center bg-transparent hover:bg-white/5 transition-colors cursor-pointer group",
                      isActive ? "bg-accent-primary/10" : ""
                    )}
                  >
                    {/* Name */}
                    <div className="col-span-5 md:col-span-4 flex items-center gap-4 pl-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isActive ? "bg-accent-primary shadow-[0_0_10px_rgba(245,158,11,0.8)]" : "bg-white/20"
                      )} />
                      <span className={cn(
                        "font-bold truncate text-sm",
                        isActive ? "text-accent-primary" : "text-white"
                      )}>
                        {ws.name || `Workspace ${ws.workspace_id}`}
                      </span>
                    </div>
                    
                    {/* Location (ID) */}
                    <div className="hidden md:block md:col-span-2 text-text-muted text-xs font-mono truncate">
                      {ws.workspace_id}
                    </div>

                    {/* Created */}
                    <div className="col-span-3 md:col-span-2 text-text-muted text-xs">
                      {formatDate(ws.created_at)}
                    </div>
                    
                    {/* Documents */}
                    <div className="col-span-2 flex justify-center">
                       <div className="bg-white/5 border border-white/10 px-3 py-1 rounded text-xs text-white/80 font-mono">
                         {ws.document_count}
                       </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-3 pr-2">
                      <button 
                         onClick={(e) => openWorkspace(ws.workspace_id, e)}
                         className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-accent-primary hover:text-white transition-all bg-accent-primary/10 px-3 py-1.5 rounded"
                      >
                         Open
                      </button>
                      <button 
                        onClick={(e) => deleteWorkspace(ws.workspace_id, e)}
                        className="text-text-muted hover:text-red-500 transition-colors focus:outline-none p-1 opacity-0 group-hover:opacity-100"
                        title="Delete Workspace"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
      </div>

      {/* Delete All Modal */}
      {isDeletingAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsDeletingAll(false)} />
          <div className="relative glass-panel bg-black/60 border border-red-900/50 p-8 rounded-2xl max-w-md w-full mx-4 shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-red-500 mb-2">Delete All Workspaces</h2>
              <p className="text-white/70 text-sm font-mono leading-relaxed">
                This action is <span className="text-white font-bold">permanent and irreversible</span>. All your workspaces, documents, insights, and knowledge graphs will be destroyed.
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs text-white/50 uppercase tracking-widest font-mono">
                Type <span className="text-red-400 font-bold select-all">Delete All</span> to confirm
              </label>
              <input 
                type="text"
                value={deleteAllConfirmText}
                onChange={e => setDeleteAllConfirmText(e.target.value)}
                autoFocus
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-red-500/50 transition-colors"
                placeholder="Delete All"
              />
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button 
                onClick={() => {
                  setIsDeletingAll(false);
                  setDeleteAllConfirmText('');
                }}
                className="px-5 py-2 rounded-lg text-xs font-mono uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={submitDeleteAll}
                disabled={deleteAllConfirmText !== 'Delete All'}
                className="px-5 py-2 rounded-lg text-xs font-mono uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                I Understand, Delete All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="6"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="6" y2="12"></line>
    <line x1="18" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
  </svg>
);
// Import missing icon at top but we'll cheat it here
const FolderOpen = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size||24} height={size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    <line x1="22" y1="10" x2="2" y2="10"></line>
  </svg>
)
