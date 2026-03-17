import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType =
  | "complete"
  | "terminate"
  | "quotafull"
  | "security_terminate"
  | "security-terminate"
  | "started"
  | "active"
  | "paused"
  | "closed"
  | "archived"
  | "duplicate";

const statusConfig: Record<StatusType, { label: string; className: string; shadow: string }> = {
  complete: {
    label: "Complete",
    className: "bg-emerald-100/80 text-emerald-700 border-emerald-200/50",
    shadow: "shadow-sm shadow-emerald-200/40",
  },
  terminate: {
    label: "Terminate",
    className: "bg-rose-100/80 text-rose-700 border-rose-200/50",
    shadow: "shadow-sm shadow-rose-200/40",
  },
  quotafull: {
    label: "Quota Full",
    className: "bg-amber-100/80 text-amber-700 border-amber-200/50",
    shadow: "shadow-sm shadow-amber-200/40",
  },
  security_terminate: {
    label: "Security Terminate",
    className: "bg-blue-100/80 text-blue-700 border-blue-200/50",
    shadow: "shadow-sm shadow-blue-200/40",
  },
  "security-terminate": {
    label: "Security Terminate",
    className: "bg-blue-100/80 text-blue-700 border-blue-200/50",
    shadow: "shadow-sm shadow-blue-200/40",
  },
  started: {
    label: "Started",
    className: "bg-slate-50 text-slate-400 border-slate-100",
    shadow: "shadow-none",
  },
  active: {
    label: "Active",
    className: "bg-emerald-100/80 text-emerald-700 border-emerald-200/50",
    shadow: "shadow-sm shadow-emerald-200/20",
  },
  paused: {
    label: "Paused",
    className: "bg-amber-100/80 text-amber-700 border-amber-200/50",
    shadow: "shadow-sm shadow-amber-200/20",
  },
  closed: {
    label: "Closed",
    className: "bg-slate-100 text-slate-400 border-slate-200",
    shadow: "shadow-none",
  },
  archived: {
    label: "Archived",
    className: "bg-slate-100 text-slate-400 border-slate-200",
    shadow: "shadow-none",
  },
  duplicate: {
    label: "Duplicate",
    className: "bg-sky-100/80 text-sky-700 border-sky-200/50",
    shadow: "shadow-sm shadow-sky-200/20",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as StatusType] || {
    label: status,
    className: "bg-slate-100 text-slate-400 border-slate-100",
    shadow: "shadow-none",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "no-default-hover-elevate px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300",
        config.className,
        config.shadow,
        className
      )}
      data-testid={`badge-status-${status}`}
    >
      {config.label}
    </Badge>
  );
}
