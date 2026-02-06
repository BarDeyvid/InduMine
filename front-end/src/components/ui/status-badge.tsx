// src/components/ui/status-badge.tsx
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
  // 1. Force a lookup and provide a robust fallback object
  // 2. Use ?? to handle cases where status might be null/undefined at runtime
  const config = (status && statusConfig[status]) ?? { 
    label: status || 'Desconhecido', 
    className: 'bg-gray-500 text-white' 
  };
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className, // Now guaranteed to exist
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {config.label}
    </span>
  );
}
