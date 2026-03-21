import { cn } from "@/lib/utils";

interface TabBarProps {
  tabs: {
    id: string;
    label: string;
    count?: number;
  }[];
  activeId: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function TabBar({ tabs, activeId, onTabChange, className }: TabBarProps) {
  return (
    <div className={cn("flex border-b border-[#2A2A2A] overflow-x-auto", className)}>
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-6 py-4 flex items-center gap-2 font-display text-sm tracking-widest uppercase transition-colors relative whitespace-nowrap",
              isActive ? "text-accent-primary" : "text-text-secondary hover:text-text-primary"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono",
                isActive ? "bg-accent-primary/20 text-accent-primary" : "bg-surface-hover text-text-muted"
              )}>
                {tab.count}
              </span>
            )}
            {/* Active Indication line */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
