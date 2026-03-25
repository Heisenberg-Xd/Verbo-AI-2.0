'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  UploadCloud, 
  Network, 
  BrainCircuit, 
  MessageSquare, 
  Settings,
  Activity,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';

const navItems = [
  { name: 'Upload', href: '/app/upload', icon: UploadCloud },
  { name: 'Clusters', href: '/app/clusters', icon: Activity },
  { name: 'Intelligence', href: '/app/intelligence', icon: Network },
  { name: 'Scanner', href: '/app/scanner', icon: ShieldAlert },
  { name: 'Chat', href: '/app/chat', icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const activeWorkspaceId = useStore((state) => state.activeWorkspaceId);

  return (
    <div className="w-64 border-r border-white/5 bg-surface/40 backdrop-blur-xl flex flex-col h-full z-20 relative">
      <div className="p-6 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded bg-accent-primary/10 border border-accent-primary flex items-center justify-center text-accent-primary group-hover:bg-accent-primary group-hover:text-black transition-colors">
            <BrainCircuit size={18} />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-none text-text-primary tracking-tight">VERBO AI</h1>
            <p className="font-mono text-[10px] text-text-muted mt-1 uppercase tracking-widest">Workspace · {activeWorkspaceId ? activeWorkspaceId.substring(0,8) : 'NONE'}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono transition-colors",
                isActive 
                  ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30" 
                  : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
              )}
            >
              <item.icon size={18} className={cn(isActive ? "text-accent-primary" : "text-text-muted group-hover:text-text-secondary")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <Link
          href="/app/settings"
          className={cn(
            "group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono transition-colors",
            pathname === '/app/settings'
              ? "bg-white/10 text-text-primary border border-white/10"
              : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
          )}
        >
          <Settings size={18} className="text-text-muted group-hover:text-text-secondary" />
          Settings
        </Link>
      </div>
    </div>
  );
}
