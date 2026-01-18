import { cn } from "@/lib/utils";

interface SpecBadgeProps {
  label: string;
  value: string | number;
  className?: string;
}

export function SpecBadge({ label, value, className }: SpecBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
        "bg-secondary/60 text-secondary-foreground border border-border/50",
        className
      )}
    >
      <span className="font-medium text-muted-foreground">{label}:</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}
