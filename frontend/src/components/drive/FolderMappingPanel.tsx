'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface Folder { id: string; name: string; }
interface Mapping { folder_id: string; workspace_id: string; folder_name: string; }
interface Workspace { id: string; name: string; }

export function FolderMappingPanel() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [loading, setLoading] = useState(false);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [removingId, setRemovingId] = useState('');

  const fetchData = useCallback(async () => {
    const [foldersRes, mappingsRes, wsRes] = await Promise.allSettled([
      api.get('/drive/folders'),
      api.get('/drive/mappings'),
      api.get('/workspace/list'),
    ]);
    if (foldersRes.status === 'fulfilled') setFolders(foldersRes.value.data.folders || []);
    if (mappingsRes.status === 'fulfilled') setMappings(mappingsRes.value.data.mappings || []);
    if (wsRes.status === 'fulfilled') {
      const data = wsRes.value.data;
      // The backend returns { workspaces: [ ... ], total: N }
      const workspacesList = data.workspaces || [];
      const wsArr = workspacesList.map((w: any) => ({
        id: w.workspace_id || w.id,
        name: w.name || w.workspace_id || w.id
      }));
      setWorkspaces(wsArr);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refreshFolders = async () => {
    setFoldersLoading(true);
    setError('');
    try {
      const res = await api.get('/drive/folders');
      setFolders(res.data.folders || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Connect to Drive first to list folders.');
    } finally { setFoldersLoading(false); }
  };

  const handleMap = async () => {
    if (!selectedFolder || !selectedWorkspace) return;
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      const folder = folders.find(f => f.id === selectedFolder);
      await api.post('/drive/map-folder', {
        folder_id: selectedFolder,
        workspace_id: selectedWorkspace,
        folder_name: folder?.name || selectedFolder,
      });
      setSuccessMsg(`Mapped "${folder?.name}" → "${selectedWorkspace}". Sync starts in ~90s.`);
      setSelectedFolder(''); setSelectedWorkspace('');
      fetchData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to map folder.');
    } finally { setLoading(false); }
  };

  const handleRemove = async (folderId: string) => {
    setRemovingId(folderId);
    try { await api.delete(`/drive/mappings/${folderId}`); fetchData(); }
    catch { /* ignore */ }
    finally { setRemovingId(''); }
  };

  const handleSync = async () => {
    setSuccessMsg(''); setError('');
    try {
      const res = await api.post('/drive/sync');
      const results = res.data.results || {};
      const total = Object.values(results).reduce((acc: number, r: any) => acc + (r.synced_count || 0), 0);
      setSuccessMsg(`Sync complete — ${total} new file(s) ingested.`);
    } catch (e: any) { setError(e?.response?.data?.detail || 'Sync failed.'); }
  };

  return (
    <div className="space-y-4">
      {/* Map a folder row */}
      <div className="bg-white/5 backdrop-blur-sm p-5 rounded-lg border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-sm text-text-primary">Map Folder → Workspace</h3>
            <p className="font-mono text-xs text-text-muted mt-0.5">Files in the folder sync every 90 seconds.</p>
          </div>
          <button
            onClick={refreshFolders}
            disabled={foldersLoading}
            className="px-3 py-1.5 rounded font-mono text-xs border border-white/10 text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors"
          >
            {foldersLoading ? '...' : '⟳ Refresh Folders'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1.5">Drive Folder</label>
            <select
              value={selectedFolder}
              onChange={e => setSelectedFolder(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-primary/50 transition-colors"
            >
              <option value="">Select a folder…</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[10px] text-text-muted uppercase tracking-widest mb-1.5">Target Workspace</label>
            <select
              value={selectedWorkspace}
              onChange={e => setSelectedWorkspace(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-primary/50 transition-colors"
            >
              <option value="">Select workspace…</option>
              {workspaces.map(w => <option key={w.id} value={w.id}>{w.name || w.id}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-3 px-4 py-2 rounded bg-red-500/10 border border-red-500/20 font-mono text-xs text-red-400">{error}</div>
        )}
        {successMsg && (
          <div className="mb-3 px-4 py-2 rounded bg-accent-primary/10 border border-accent-primary/20 font-mono text-xs text-accent-primary">{successMsg}</div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleMap}
            disabled={loading || !selectedFolder || !selectedWorkspace}
            className="px-6 py-2.5 rounded font-display tracking-wide text-sm uppercase font-bold bg-accent-primary text-black hover:bg-amber-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? '...' : 'Map Folder'}
          </button>
          {mappings.length > 0 && (
            <button
              onClick={handleSync}
              className="px-5 py-2.5 rounded font-mono text-sm border border-white/10 text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors"
            >
              ↻ Sync Now
            </button>
          )}
        </div>
      </div>

      {/* Active Mappings */}
      {mappings.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm p-5 rounded-lg border border-white/10">
          <h3 className="font-display font-bold text-sm text-text-primary mb-3">
            Active Mappings <span className="font-mono text-xs text-text-muted font-normal">({mappings.length})</span>
          </h3>
          <div className="space-y-2">
            {mappings.map(m => (
              <div
                key={m.folder_id}
                className="flex items-center justify-between gap-3 p-3 rounded bg-white/5 border border-white/5 group hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-accent-primary text-xs">▸</span>
                  <span className="font-mono text-sm text-text-primary truncate">{m.folder_name || m.folder_id}</span>
                  <span className="font-mono text-xs text-text-muted">→</span>
                  <span className="font-mono text-xs text-accent-primary">{m.workspace_id}</span>
                </div>
                <button
                  onClick={() => handleRemove(m.folder_id)}
                  disabled={removingId === m.folder_id}
                  className="flex-shrink-0 px-2 py-1 rounded font-mono text-xs text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  {removingId === m.folder_id ? '...' : '✕'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
