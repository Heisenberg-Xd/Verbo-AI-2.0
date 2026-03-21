'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { api, Endpoints } from '@/lib/api';
import { Settings, Save, AlertCircle, RefreshCw, HardDrive, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { activeWorkspaceId } = useStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadStats();
    }
  }, [activeWorkspaceId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await api.get(Endpoints.workspaceStats(activeWorkspaceId!));
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto pb-24 h-full overflow-auto">
      <div className="mb-10 flex items-center gap-3 border-b border-border pb-6">
        <Settings size={28} className="text-text-muted" />
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Workspace configuration</h1>
          <p className="text-text-secondary font-mono text-sm mt-1 uppercase tracking-widest">Environment & System Health</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Workspace Identity */}
        <div className="glass-panel p-6 rounded-lg border border-border">
          <h3 className="font-display font-medium text-lg mb-4 text-accent-primary">Current Context</h3>
          {activeWorkspaceId ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-surface border border-[#333] rounded font-mono text-sm">
                  <span className="text-text-muted uppercase text-[10px] block mb-1">ID</span>
                  <span className="text-text-primary font-bold">{activeWorkspaceId}</span>
                </div>
                <div className="p-4 bg-surface border border-[#333] rounded font-mono text-sm relative">
                  <span className="text-text-muted uppercase text-[10px] block mb-1">Status</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent-secondary shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-accent-secondary">Active & Indexed</span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="animate-pulse flex items-center gap-2 font-mono text-xs text-text-muted"><RefreshCw className="animate-spin" size={14}/> Fetching metrics...</div>
              ) : stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-2xl font-bold">{stats.document_count}</span>
                    <span className="font-mono text-[10px] uppercase text-text-muted tracking-widest">Documents</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-2xl font-bold">{stats.cluster_count}</span>
                    <span className="font-mono text-[10px] uppercase text-text-muted tracking-widest">Clusters</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-2xl font-bold">{stats.entity_count}</span>
                    <span className="font-mono text-[10px] uppercase text-text-muted tracking-widest">Entities</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-2xl font-bold">{stats.relationship_count}</span>
                    <span className="font-mono text-[10px] uppercase text-text-muted tracking-widest">Relationships</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-accent-danger font-mono text-sm bg-accent-danger/10 p-4 border border-accent-danger/20 rounded">
              <AlertCircle size={16} /> No workspace active. Return to Upload tab to initialize one.
            </div>
          )}
        </div>

        {/* Integrations */}
        <div className="glass-panel p-6 rounded-lg border border-border">
          <h3 className="font-display font-medium text-lg mb-6 flex items-center gap-2">
            <HardDrive className="text-text-muted" size={20} /> Cloud Integrations
          </h3>
          
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-surface border border-[#333] rounded">
            <div>
              <h4 className="font-display font-bold">Google Drive Connection</h4>
              <p className="text-xs font-mono text-text-muted mt-1">Sync documents directly from a shared drive.</p>
            </div>
            <button className="px-4 py-2 mt-4 sm:mt-0 bg-text-primary text-black font-mono text-sm rounded hover:bg-[#d4d4d4] transition-colors">
              Configure Connection
            </button>
          </div>
        </div>

        {/* Security & API Keys */}
        <div className="glass-panel p-6 rounded-lg border border-border">
          <h3 className="font-display font-medium text-lg mb-6 flex items-center gap-2">
            <KeyRound className="text-text-muted" size={20} /> Secrets & Endpoints
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest block mb-2">Gemini API Key</label>
              <div className="flex gap-2">
                <input 
                  type="password" 
                  value="***************" 
                  readOnly 
                  className="w-full bg-[#050505] border border-[#333] px-3 py-2 rounded text-text-muted font-mono text-sm focus:outline-none"
                />
                <button className="px-4 bg-[#2A2A2A] hover:bg-[#333] border border-[#333] rounded text-text-secondary font-mono text-sm transition-colors">
                  Edit
                </button>
              </div>
              <p className="text-[10px] font-mono mt-2 text-text-muted">Stored securely in backend environment variables.</p>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-border mt-6">
              <button className="flex items-center gap-2 px-6 py-2 bg-accent-primary text-black font-bold tracking-wider rounded font-display hover:bg-amber-400">
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
