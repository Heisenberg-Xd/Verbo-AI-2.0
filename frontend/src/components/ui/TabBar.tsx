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
    <div className={cn("flex w-fit mx-auto glass-panel rounded-full p-1.5 gap-1 overflow-x-auto my-6 border-white/10", className)}>
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-6 py-2.5 flex items-center gap-2 font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 relative whitespace-nowrap rounded-full",
              isActive 
                ? "bg-accent-primary text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]" 
                : "text-text-secondary hover:text-text-primary hover:bg-white/5"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono",
                isActive ? "bg-black/20 text-black/80" : "bg-white/5 text-text-muted"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
