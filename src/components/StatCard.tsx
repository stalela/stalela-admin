import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  change,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-surface p-5 transition-all duration-300 hover:border-border-bright",
        className
      )}
    >
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-copper-600/0 to-vibranium/0 transition-all duration-500 group-hover:from-copper-600/5 group-hover:to-vibranium/5" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          {change && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                trend === "up" && "text-success",
                trend === "down" && "text-danger",
                trend === "neutral" && "text-muted"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-copper-600/10 p-2.5">
          <Icon className="h-5 w-5 text-copper-600" />
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-copper-600/0 via-copper-600/50 to-vibranium/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
}
