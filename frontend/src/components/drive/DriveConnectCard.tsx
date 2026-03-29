'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface DriveStatus {
  connected: boolean;
  has_client_id: boolean;
  has_client_secret: boolean;
}

export function DriveConnectCard() {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/drive/status');
      setStatus(res.data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = () => {
    window.location.href = 'http://localhost:8000/auth/google';
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.post('/drive/disconnect');
      await fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm p-5 rounded-lg border border-white/10 animate-pulse">
        <div className="h-5 bg-white/5 rounded w-48 mb-3" />
        <div className="h-4 bg-white/5 rounded w-64" />
      </div>
    );
  }

  const isConfigured = status?.has_client_id && status?.has_client_secret;

  return (
    <div className={`
      bg-white/5 backdrop-blur-sm p-5 rounded-lg border transition-all duration-300
      ${status?.connected ? 'border-accent-primary/40' : 'border-white/10'}
    `}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Google Drive icon */}
          <div className={`
            w-10 h-10 rounded flex items-center justify-center flex-shrink-0
            ${status?.connected ? 'bg-accent-primary/10 border border-accent-primary/20' : 'bg-white/5'}
          `}>
            <svg viewBox="0 0 87.3 78" className="w-6 h-6" fill="none">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm text-text-primary">Google Drive</h3>
              {status?.connected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
                  Connected
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-text-muted mt-0.5">
              {status?.connected
                ? 'Drive connected. Map folders below to sync automatically.'
                : 'Connect to auto-ingest files from your Drive folders.'}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0">
          {status?.connected ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-3 py-1.5 rounded text-xs font-mono border border-white/10 text-text-muted hover:border-red-500/30 hover:text-red-400 transition-all"
            >
              {disconnecting ? '...' : 'Disconnect'}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={!isConfigured}
              title={!isConfigured ? 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env' : ''}
              className={`
                px-4 py-2 rounded font-mono text-xs font-bold tracking-wide uppercase transition-all
                ${isConfigured
                  ? 'bg-accent-primary text-black hover:bg-amber-400 hover-glow-amber'
                  : 'bg-white/5 text-text-muted cursor-not-allowed border border-white/10'}
              `}
            >
              {isConfigured ? 'Connect Drive' : 'Not configured'}
            </button>
          )}
        </div>
      </div>

      {!isConfigured && (
        <div className="mt-4 p-3 rounded bg-white/5 border border-white/10">
          <p className="font-mono text-xs text-text-muted">
            Add <code className="bg-white/5 px-1 rounded text-accent-primary">GOOGLE_CLIENT_ID</code> and{' '}
            <code className="bg-white/5 px-1 rounded text-accent-primary">GOOGLE_CLIENT_SECRET</code> to{' '}
            <code className="bg-white/5 px-1 rounded">backend/.env</code>.
          </p>
        </div>
      )}
    </div>
  );
}
