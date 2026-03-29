import { cn } from "@/lib/utils";

interface StepBadgeProps {
  step: string;
  label?: string;
  className?: string;
}

export function StepBadge({ step, label, className }: StepBadgeProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="font-mono text-xs font-bold tracking-widest text-[#000] bg-accent-primary px-2 py-0.5 rounded">
        [STEP {step}]
      </div>
      {label && (
        <span className="font-display text-text-secondary uppercase tracking-wider text-sm">
          {label}
        </span>
      )}
    </div>
  );
}
