import { cn } from "@/lib/utils";

type StatusType = 'active' | 'inactive' | 'revision';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  active: {
    label: 'Ativo',
    className: 'status-active',
  },
  inactive: {
    label: 'Inativo',
    className: 'status-inactive',
  },
  revision: {
    label: 'Em Revisão',
    className: 'status-revision',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {config.label}
    </span>
  );
}
