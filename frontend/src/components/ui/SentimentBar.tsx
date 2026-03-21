import { cn } from "@/lib/utils";

interface SentimentBarProps {
  positive: number;
  neutral: number;
  negative: number;
  className?: string;
}

export function SentimentBar({ positive, neutral, negative, className }: SentimentBarProps) {
  const total = positive + neutral + negative;
  if (total === 0) return null;

  const posPct = (positive / total) * 100;
  const neuPct = (neutral / total) * 100;
  const negPct = (negative / total) * 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex h-1.5 w-full bg-[#1A1A1A] rounded overflow-hidden">
        <div 
          className="bg-accent-secondary h-full transition-all duration-1000 ease-out" 
          style={{ width: `${posPct}%` }} 
          title={`Positive: ${posPct.toFixed(1)}%`}
        />
        <div 
          className="bg-text-muted h-full transition-all duration-1000 ease-out" 
          style={{ width: `${neuPct}%` }} 
          title={`Neutral: ${neuPct.toFixed(1)}%`}
        />
        <div 
          className="bg-accent-danger h-full transition-all duration-1000 ease-out" 
          style={{ width: `${negPct}%` }} 
          title={`Negative: ${negPct.toFixed(1)}%`}
        />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-text-muted mt-1.5">
        <span className="text-accent-secondary">{posPct.toFixed(0)}% Pos</span>
        <span>{neuPct.toFixed(0)}% Neu</span>
        <span className="text-accent-danger">{negPct.toFixed(0)}% Neg</span>
      </div>
    </div>
  );
}
