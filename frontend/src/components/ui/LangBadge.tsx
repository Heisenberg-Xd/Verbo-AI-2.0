import { cn } from "@/lib/utils";

interface LangBadgeProps {
  lang: string;
  className?: string;
  count?: number;
  percentage?: number;
}

export function LangBadge({ lang, className, count, percentage }: LangBadgeProps) {
  // Simple mapping for colors based on the lang string ending
  const isEn = lang === 'en' || lang.endsWith('en') || lang.endsWith('EN');
  const isFr = lang.toLowerCase().startsWith('fr');
  const isDe = lang.toLowerCase().startsWith('de');
  const isEs = lang.toLowerCase().startsWith('es');
  
  let colorClass = "bg-[#2A2A2A] text-text-primary border-[#333333]"; // default
  
  if (isFr) colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (isDe) colorClass = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  if (isEs) colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
  // If it's pure english
  if (lang.toLowerCase() === 'en') colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border",
      colorClass,
      className
    )}>
      {lang.toUpperCase()}
      {(count !== undefined || percentage !== undefined) && (
        <span className="opacity-70 border-l border-current pl-1.5 ml-0.5">
          {count !== undefined && count}
          {percentage !== undefined && (count !== undefined ? ` · ${percentage}%` : `${percentage}%`)}
        </span>
      )}
    </span>
  );
}
