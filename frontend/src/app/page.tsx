import Link from 'next/link';
import { Network, BrainCircuit, Activity, MessageSquare, Fingerprint, Database, ChevronRight } from 'lucide-react';
import { CTASection } from '@/components/ui/hero-dithering-card';

export default function LandingPage() {
  const features = [
    { icon: Activity, title: 'Semantic Clustering', desc: 'Auto-group documents via unsupervised learning and Sentence-BERT embeddings.' },
    { icon: Database, title: 'Multilingual Translation', desc: 'Seamlessly align and compare files across English, French, Spanish, and German.' },
    { icon: Fingerprint, title: 'Entity Extraction', desc: 'Pinpoint people, organizations, and critical concepts instantly using GLiNER.' },
    { icon: Network, title: 'Knowledge Graph', desc: 'Map hidden relationships across your entire corpus with force-directed graphs.' },
    { icon: BrainCircuit, title: '2D Semantic Map', desc: 'Visualize the spatial distance of topics using PCA 2D projections.' },
    { icon: MessageSquare, title: 'RAG Document Chat', desc: 'Interrogate your clustered documents securely with localized context citations.' },
  ];

  const steps = [
    { num: '01', title: 'Upload Files', desc: 'Drag and drop PDFs, TXT, or CSVs. Initialize a unified workspace.' },
    { num: '02', title: 'Intelligence Pipeline', desc: 'Backend NLP engine shreds, embeds, translates, and clusters.' },
    { num: '03', title: 'Explore & Chat', desc: 'Navigate the visual intelligence dashboard and chat dynamically.' },
  ];

  return (
    <div className="min-h-screen bg-base text-text-primary bg-dot-grid relative overflow-x-hidden">
      <div className="absolute inset-0 bg-base/60 z-0 pointer-events-none" />
      
      {/* Navbar */}
      <nav className="relative z-10 border-b border-border bg-base/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-accent-primary/10 border border-accent-primary flex items-center justify-center text-accent-primary">
              <BrainCircuit size={18} />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">VERBO AI</span>
          </div>
          <Link 
            href="/app/upload" 
            className="text-sm font-mono hover:text-accent-primary transition-colors flex items-center gap-1"
          >
            Enter Dashboard <ChevronRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <CTASection />

      {/* Features Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-border bg-[#050505]/50">
        <h2 className="font-display text-3xl font-bold mb-16 text-center">Core Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="glass-panel p-8 rounded-xl border border-border hover:border-accent-primary/50 transition-colors">
              <f.icon className="text-accent-primary mb-6" size={32} />
              <h3 className="font-display text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-border">
        <h2 className="font-display text-3xl font-bold mb-16 text-center">Intelligence Pipeline Flow</h2>
        <div className="flex flex-col md:flex-row gap-8">
          {steps.map((s, i) => (
            <div key={i} className="flex-1 relative">
              <div className="font-mono text-5xl font-bold text-[#1A1A1A] absolute -top-8 -left-4 -z-10">{s.num}</div>
              <h3 className="font-display text-xl font-bold mb-3 text-accent-primary">{s.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{s.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-6 -right-6 text-border">
                  <ChevronRight size={24} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-12 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          <h2 className="font-display text-2xl font-bold mb-6">Ready to analyze your corpus?</h2>
          <Link href="/app/upload" className="px-6 py-3 border border-border text-text-primary rounded hover:border-accent-primary hover:text-accent-primary transition-colors font-mono uppercase tracking-widest text-sm">
            Initialize Workspace
          </Link>
          <p className="text-xs font-mono text-text-muted mt-12">© 2026 Verbo AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
