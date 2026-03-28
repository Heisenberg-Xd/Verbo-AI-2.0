'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DriveConnectCard } from '@/components/drive/DriveConnectCard';
import { FolderMappingPanel } from '@/components/drive/FolderMappingPanel';
import { api } from '@/lib/api';

export default function DrivePage() {
  const searchParams = useSearchParams();
  const justConnected = searchParams.get('connected') === 'true';
  const oauthError   = searchParams.get('error');
  const [ingestStats, setIngestStats] = useState<{total_ingested: number} | null>(null);
  const [banner, setBanner] = useState<{type: 'success' | 'error'; msg: string} | null>(
    justConnected ? { type: 'success', msg: 'Google Drive connected successfully! 🎉 You can now map folders.' } :
    oauthError    ? { type: 'error',   msg: `Drive connection failed: ${oauthError}` } :
    null
  );

  useEffect(() => {
    api.get('/ingest/stats').then(r => setIngestStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-8 pb-4 max-w-3xl w-full mx-auto">

        {/* Header */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-widest border border-white/10 text-text-muted mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
            Automated Ingestion
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Google Drive Sync</h1>
          <p className="font-mono text-sm text-text-muted max-w-xl">
            Connect your Google Drive and map folders to workspaces. VerboAI will automatically sync,
            deduplicate, and process your documents every 90 seconds.
          </p>
        </div>

        {/* Banner notification */}
        {banner && (
          <div className={`mb-6 px-5 py-4 rounded-xl border font-mono text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500 ${
            banner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <span>{banner.type === 'success' ? '✓' : '✗'}</span>
            <span>{banner.msg}</span>
            <button onClick={() => setBanner(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Stats row */}
        {ingestStats !== null && (
          <div className="mb-6 px-5 py-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-4 font-mono text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="text-accent-primary font-bold text-sm">{ingestStats.total_ingested}</span>
              files deduplicated &amp; tracked
            </span>
            <span className="w-px h-4 bg-white/10" />
            <span>Auto-sync runs every <span className="text-accent-primary">90s</span></span>
          </div>
        )}

        {/* Step flow */}
        <div className="space-y-6">
          {/* Step 1: Connect */}
          <Section step="01" title="Connect to Google Drive">
            <DriveConnectCard />
          </Section>

          {/* Step 2: Map folders */}
          <Section step="02" title="Map Folders to Workspaces">
            <FolderMappingPanel />
          </Section>

          {/* Step 3: How it works */}
          <Section step="03" title="How Sync Works">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: '⊕',
                  label: 'Auto Detection',
                  desc: 'New files added to your mapped folders are detected automatically every 90 seconds.',
                },
                {
                  icon: '⊘',
                  label: 'Deduplication',
                  desc: 'Each file is fingerprinted by content hash. Already-processed files are silently skipped.',
                },
                {
                  icon: '⊗',
                  label: 'Full Pipeline',
                  desc: 'New files run through the complete intelligence pipeline: embeddings, clustering, and RAG.',
                },
              ].map(item => (
                <div key={item.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-2xl mb-2 text-accent-primary">{item.icon}</div>
                  <p className="font-display text-sm font-semibold mb-1">{item.label}</p>
                  <p className="font-mono text-xs text-text-muted leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-[10px] text-accent-primary/70 border border-accent-primary/20 px-2 py-0.5 rounded-full">
          {step}
        </span>
        <h2 className="font-display text-base font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}
