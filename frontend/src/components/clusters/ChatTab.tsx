'use client';

import { useState, useRef, useEffect } from 'react';
import { api, Endpoints } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Send, User, Bot, AlertTriangle, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LangBadge } from '@/components/ui/LangBadge';

export function ChatTab() {
  const { chatScope, setChatScope } = useStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendQuery = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userQ = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userQ }]);
    setLoading(true);

    try {
      const res = await api.post(Endpoints.ragChat, {
        query: userQ,
        cluster_filter: chatScope !== 'all' ? chatScope : null,
        top_k: 6
      });
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.answer,
        sources: res.data.sources
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Error: Could not connect to chat service.",
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[650px] glass-panel border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-surface/40 backdrop-blur-md flex justify-between items-center shrink-0">
        <div>
          <h2 className="font-display font-bold text-accent-primary">Document Chat</h2>
          <p className="text-xs font-mono text-text-muted mt-0.5">RAG index ready — semantic search + LLM generation</p>
        </div>
        
        <select 
          value={chatScope || 'all'} 
          onChange={(e) => setChatScope(e.target.value === 'all' ? null : e.target.value)}
          className="bg-white/5 border border-white/10 text-sm font-mono text-text-secondary px-3 py-1.5 rounded focus:outline-none focus:border-accent-primary backdrop-blur-md"
        >
          <option value="all">All Clusters</option>
          {/* We would dynamically populate cluster names here if passed via props, leaving static for simplicity or fetching implicitly */}
          <option value="cluster_0">Cluster 0</option>
          <option value="cluster_1">Cluster 1</option>
          <option value="cluster_2">Cluster 2</option>
        </select>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-text-muted">
            <Bot size={48} className="mb-4 opacity-50" />
            <p className="font-display">Ask anything about your documents...</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex gap-4 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
            <div className={cn("w-8 h-8 rounded shrink-0 flex items-center justify-center mt-1", 
              msg.role === 'user' ? "bg-accent-primary text-[#000]" : "bg-white/10 border border-white/10 backdrop-blur-sm text-accent-secondary"
            )}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={cn("flex flex-col gap-2", msg.role === 'user' ? "items-end" : "items-start")}>
              <div className={cn(
                "p-4 rounded-lg text-sm leading-relaxed",
                msg.role === 'user' ? "bg-accent-primary/20 text-accent-primary font-medium border border-accent-primary/30" : "bg-white/5 backdrop-blur-md border border-white/10 text-text-primary",
                msg.isError && "border-accent-danger text-accent-danger"
              )}>
                {msg.content}
              </div>
              
              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-col gap-2 mt-2 w-full">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted flex items-center gap-1">
                    <BookOpen size={10} /> {msg.sources.length} Sources
                  </span>
                  <div className="flex flex-col gap-2">
                    {msg.sources.map((src: any, i: number) => (
                      <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded p-3 text-xs w-full">
                        <div className="flex justify-between items-start mb-2 font-mono">
                          <span className="text-text-secondary font-bold">#{i+1} {src.filename}</span>
                          <span className="text-accent-primary bg-accent-primary/10 px-1.5 py-0.5 rounded">
                            {Math.round(src.similarity * 100)}% Match
                          </span>
                        </div>
                        <div className="flex gap-2 mb-2">
                          <span className="px-1.5 py-0.5 border border-border rounded text-[10px] font-mono text-text-muted">{src.cluster_name}</span>
                          {src.language && <LangBadge lang={src.language} />}
                        </div>
                        <p className="text-text-muted italic line-clamp-2">"{src.excerpt}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-4 max-w-[85%]">
            <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center mt-1 bg-white/10 border border-white/10 text-accent-secondary">
              <Bot size={16} />
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 flex gap-1 items-center backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-accent-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-accent-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-accent-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendQuery} className="p-4 border-t border-white/10 bg-surface/40 backdrop-blur-md flex gap-3 shrink-0">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything about your documents..."
          className="flex-1 bg-white/5 border border-white/10 rounded px-4 py-3 font-mono text-sm focus:outline-none focus:border-accent-primary transition-colors text-text-primary placeholder:text-text-muted"
        />
        <button 
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-accent-primary text-[#000] px-6 py-2 rounded font-bold hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center justify-center"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
