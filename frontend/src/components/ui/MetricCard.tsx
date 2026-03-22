import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isUp: boolean;
  };
  className?: string;
}

export function MetricCard({ label, value, description, icon, trend, className }: MetricCardProps) {
  return (
    <div className={cn("glass-panel glass-card-hover p-5 rounded-lg flex flex-col justify-between", className)}>
      <div className="flex justify-between items-start mb-4">
        <span className="font-mono text-xs text-text-muted uppercase tracking-widest">{label}</span>
        {icon && <div className="text-text-muted">{icon}</div>}
      </div>
      
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl font-bold text-text-primary">{value}</span>
          {trend && (
            <span className={cn(
              "text-xs font-mono px-1.5 py-0.5 rounded",
              trend.isUp ? "bg-accent-secondary/10 text-accent-secondary" : "bg-accent-danger/10 text-accent-danger"
            )}>
              {trend.isUp ? '+' : '-'}{trend.value}%
            </span>
          )}
        </div>
        {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
      </div>
    </div>
  );
}
