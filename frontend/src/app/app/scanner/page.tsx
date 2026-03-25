'use client';

import { useStore } from '@/lib/store';
import { ShieldAlert } from 'lucide-react';
import Scanner from '@/components/Scanner';

export default function ScannerPage() {
  const { activeWorkspaceId } = useStore();

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted bg-[#0A0A0A]">
        <ShieldAlert size={48} className="mb-4 text-border" />
        <h2 className="font-display text-xl mb-2 text-text-secondary">No Active Workspace</h2>
        <p className="font-mono text-sm max-w-md text-center">Please initialize a workspace and run the intelligence pipeline from the Upload tab before scanning documents.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0A0A0A] p-8">
      <div className="max-w-5xl mx-auto pb-24">
        <Scanner workspaceId={activeWorkspaceId} disabled={false} />
      </div>
    </div>
  );
}
