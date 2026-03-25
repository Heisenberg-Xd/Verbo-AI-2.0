import React, { useState, useRef } from 'react';
import { api, Endpoints } from '@/lib/api';
import { Upload, FileText, CheckCircle2, ShieldAlert, AlertCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepBadge } from '@/components/ui/StepBadge';

interface ScannerProps {
  workspaceId: string;
  disabled: boolean;
}

export default function Scanner({ workspaceId, disabled }: ScannerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const runScan = async () => {
    if (!file) return;
    
    setScanning(true);
    setScanError(null);
    setScanResult(null);
    
    try {
      // 1. Upload the file
      const formData = new FormData();
      formData.append('files', file);
      
      const uploadRes = await api.post(Endpoints.uploadFiles, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const uploadedFilename = uploadRes.data.file_paths[0];

      // 2. Scan the file against the workspace
      const res = await api.post(
        `/workspace/${workspaceId}/scan`,
        { 
          filename: uploadedFilename,
          min_confidence: 0.4,
          include_semantic: true
        }
      );
      setScanResult(res.data);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.message || "Scan failed";
      setScanError(detail);
    } finally {
      setScanning(false);
    }
  };

  const resetScanner = () => {
    setFile(null);
    setScanResult(null);
    setScanError(null);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-3 tracking-tight flex items-center gap-3">
          <ShieldAlert className="text-accent-primary" /> Adversarial Document Scanner
        </h1>
        <p className="text-text-secondary">
          Upload a new document to scan it for contradictions and discrepancies against your established workspace knowledge.
        </p>
      </div>

      {!scanResult && (
        <div className="glass-panel p-8 rounded-xl border border-white/5 shadow-2xl">
          <StepBadge step="01" label="Select Document" className="mb-6" />

          {/* File Upload Dropzone */}
          {!file ? (
            <div 
              className={cn(
                "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer",
                isDragging ? "border-accent-primary bg-accent-primary/5" : "border-white/10 bg-black/20 hover:border-accent-primary/30"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileSelect}
                accept=".txt,.pdf,.md,.csv" 
                disabled={disabled || scanning}
              />
              <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-4 text-text-muted">
                <Upload size={24} />
              </div>
              <h3 className="font-display text-lg mb-1">Upload a Document to Scan</h3>
              <p className="text-text-muted text-xs font-mono">
                Supported formats: TXT, PDF, MD, CSV
              </p>
            </div>
          ) : (
            <div className="border border-white/10 bg-black/40 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-mono text-sm text-white mb-1">{file.name}</h3>
                  <p className="text-xs text-text-muted">Ready to be scanned against {workspaceId}</p>
                </div>
              </div>
              <button 
                onClick={() => setFile(null)}
                className="text-xs font-mono text-text-muted hover:text-white px-3 py-1 rounded border border-transparent hover:border-white/20 transition-all"
                disabled={scanning}
              >
                Change File
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex items-center gap-4">
            <button 
              onClick={runScan}
              disabled={!file || scanning || disabled}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded text-sm font-bold uppercase tracking-widest font-mono transition-all",
                scanning ? "bg-accent-primary/50 text-black/50 cursor-not-allowed" 
                         : "bg-accent-primary text-black hover:bg-amber-400 disabled:opacity-30"
              )}
            >
              {scanning ? (
                <><span className="animate-pulse">● ● ●</span> Scanning...</>
              ) : (
                <><Play fill="currentColor" size={14} /> Run Contradiction Scan</>
              )}
            </button>
          </div>

          {/* Error Display */}
          {scanError && (
            <div className="mt-6 p-4 rounded bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-red-400 text-sm font-mono">{scanError}</p>
            </div>
          )}
        </div>
      )}

      {/* Results Section */}
      {scanResult && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <StepBadge step="02" label="Scan Results" />
            <button 
              onClick={resetScanner}
              className="text-xs font-mono px-4 py-2 rounded border border-white/10 hover:bg-white/5 transition-colors"
            >
              Scan Another Document
            </button>
          </div>

          {/* Risk level banner */}
          <div className={cn(
            "p-5 rounded-xl mb-8 flex items-center gap-4 font-mono font-bold tracking-tight text-sm uppercase",
            scanResult.risk_level === "critical" ? "bg-red-500/10 border border-red-500/20 text-red-400" :
            scanResult.risk_level === "warning" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" :
            "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
          )}>
            {scanResult.risk_level === "critical" ? <ShieldAlert size={20} /> :
             scanResult.risk_level === "warning" ? <AlertCircle size={20} /> :
             <CheckCircle2 size={20} />}
            {scanResult.risk_level === "critical" ? "Critical — High severity contradictions detected" :
             scanResult.risk_level === "warning" ? "Warning — Potential inconsistencies found" :
             "Clean — No contradictions detected"}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="glass-panel p-5 rounded-xl border border-white/5 flex flex-col items-center justify-center">
              <div className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Total</div>
              <div className="text-2xl text-white font-bold">{scanResult.total_contradictions}</div>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/5 flex flex-col items-center justify-center">
              <div className="text-[10px] text-red-400 uppercase tracking-widest mb-1">High</div>
              <div className="text-2xl text-white font-bold">{scanResult.severity_breakdown.high}</div>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/5 flex flex-col items-center justify-center">
              <div className="text-[10px] text-amber-400 uppercase tracking-widest mb-1">Medium</div>
              <div className="text-2xl text-white font-bold">{scanResult.severity_breakdown.medium}</div>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/5 flex flex-col items-center justify-center">
              <div className="text-[10px] text-emerald-400 uppercase tracking-widest mb-1">Low</div>
              <div className="text-2xl text-white font-bold">{scanResult.severity_breakdown.low}</div>
            </div>
          </div>

          {/* Contradiction cards */}
          {scanResult.total_contradictions > 0 ? (
            <div className="flex flex-col gap-6">
              {scanResult.contradictions.map((c: any, i: number) => {
                const isHigh = c.severity === "high";
                const isMed = c.severity === "medium";
                const confColor = isHigh ? 'bg-red-400' : (isMed ? 'bg-amber-400' : 'bg-emerald-400');
                const confTextColor = isHigh ? 'text-red-400' : (isMed ? 'text-amber-400' : 'text-emerald-400');
                const pct = Math.round(c.confidence * 100);

                return (
                  <div key={i} className="glass-panel p-6 border border-white/5 rounded-xl relative overflow-hidden group">
                    {/* Decorative colored glow */}
                    <div className={cn(
                      "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none transition-opacity group-hover:opacity-40",
                      isHigh ? "bg-red-500" : (isMed ? "bg-amber-500" : "bg-emerald-500")
                    )} />

                    <div className="flex items-center justify-between mb-6">
                      <div className={cn(
                        "px-3 py-1 rounded uppercase tracking-widest text-[10px] font-bold font-mono border",
                        isHigh ? "bg-red-500/10 border-red-500/20 text-red-400" : 
                        isMed ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : 
                        "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      )}>
                        {c.severity} severity
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                        Issue Type: {c.type.replace('_', ' ')}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* Left: Existing */}
                      <div className="bg-black/40 p-5 rounded-lg border border-white/5 flex flex-col h-full">
                        <div className="text-[10px] text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                          <CheckCircle2 size={12} className="opacity-50" /> Existing Claim
                        </div>
                        <div className="font-mono text-[10px] text-accent-secondary mb-3 truncate" title={c.conflicting_claim.filename}>
                          {c.conflicting_claim.filename}
                        </div>
                        <div className="flex-1 flex items-center">
                          {c.conflicting_claim.triple && c.conflicting_claim.triple.subject ? (
                            <div className="flex flex-wrap gap-2 text-xs font-mono items-center">
                              <span className="text-white px-2 py-1 bg-white/10 rounded">{c.conflicting_claim.triple.subject}</span>
                              <span className="text-text-muted">{c.conflicting_claim.triple.relationship}</span>
                              <span className="text-white px-2 py-1 bg-white/10 rounded">{c.conflicting_claim.triple.object}</span>
                            </div>
                          ) : (
                            <div className="text-sm text-text-primary leading-relaxed border-l-2 border-white/10 pl-3 italic">
                              "{c.conflicting_claim.text}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: New */}
                      <div className="bg-black/40 p-5 rounded-lg border border-white/5 flex flex-col h-full relative">
                        <div className="absolute top-1/2 -left-6 transform -translate-y-1/2 w-8 border-t border-dashed border-white/20 hidden md:block"></div>
                        <div className="absolute top-1/2 -left-3 transform -translate-y-1/2 bg-[#0A0A0A] text-text-muted text-[10px] px-1 hidden md:block font-bold">
                          VS
                        </div>

                        <div className="text-[10px] text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                          <AlertCircle size={12} className="opacity-50" /> New Conflicting Claim
                        </div>
                        <div className="font-mono text-[10px] text-red-400 mb-3 truncate" title={c.new_claim.filename}>
                          {c.new_claim.filename}
                        </div>
                        <div className="flex-1 flex items-center">
                          {c.new_claim.triple && c.new_claim.triple.subject ? (
                            <div className="flex flex-wrap gap-2 text-xs font-mono items-center">
                              <span className="text-white px-2 py-1 bg-white/10 rounded">{c.new_claim.triple.subject}</span>
                              <span className="text-text-muted">{c.new_claim.triple.relationship}</span>
                              <span className="text-white px-2 py-1 bg-white/10 rounded">{c.new_claim.triple.object}</span>
                            </div>
                          ) : (
                            <div className="text-sm text-text-primary leading-relaxed border-l-2 border-red-500/30 pl-3 italic">
                              "{c.new_claim.text}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg flex items-start gap-3 mb-4">
                      <div className="opacity-50 text-text-muted mt-0.5 mt-1">
                        <AlertCircle size={14} />
                      </div>
                      <div>
                        <div className="text-sm text-text-primary leading-relaxed mb-1">
                          {c.explanation}
                        </div>
                        <div className="font-mono text-[10px] text-accent-primary mt-2 uppercase tracking-wide">
                          Suggestion: {c.suggested_resolution}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 bg-black/20 px-4 py-3 rounded-lg">
                      <div className="font-mono text-[10px] text-text-muted uppercase tracking-widest whitespace-nowrap">
                        Confidence
                      </div>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={cn("h-full", confColor)} style={{ width: `${pct}%` }} />
                      </div>
                      <div className={cn("font-mono font-bold text-xs uppercase", confTextColor)}>
                        {pct}%
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed border-white/10 bg-black/20 rounded-xl p-16 flex flex-col items-center justify-center text-center">
              <CheckCircle2 size={48} className="text-emerald-500/30 mb-4" />
              <h3 className="font-display text-xl mb-2 text-text-primary">No Contradictions Found</h3>
              <p className="text-text-secondary text-sm max-w-md">
                This document accurately aligns with the established intelligence mapped inside your active workspace.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
