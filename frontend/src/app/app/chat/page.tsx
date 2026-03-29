'use client';

import { useStore } from '@/lib/store';
import { ChatTab } from '@/components/clusters/ChatTab';
import { BookOpen } from 'lucide-react';

export default function GlobalChatPage() {
  const { activeWorkspaceId } = useStore();

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center p-20 h-full text-text-muted">
        <BookOpen size={48} className="mb-4 text-border" />
        <h2 className="font-display text-xl mb-2 text-text-secondary">No Active Workspace</h2>
        <p className="font-mono text-sm max-w-md text-center">Please initialize a workspace and run the intelligence pipeline from the Upload tab.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8">
      <div className="mb-6 shrink-0">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Workspace Intelligence Chat</h1>
        <p className="text-text-secondary">Query your entire document corpus using semantic search and RAG synthesis.</p>
      </div>
      
      {/* Reusing the ChatTab component but allowing it to stretch completely in this view */}
      <div className="flex-1 w-full max-w-4xl mx-auto h-[calc(100vh-140px)]">
        <ChatTab />
      </div>
    </div>
  );
}
