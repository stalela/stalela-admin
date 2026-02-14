"use client";

import { cn } from "@/lib/utils";

interface ButtonProps {
  children: React.ReactNode;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  className,
  disabled,
  onClick,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-copper-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

  const variants = {
    primary:
      "bg-copper-600 text-white hover:bg-copper-700 shadow-[0_0_20px_-5px_var(--copper-600)]",
    secondary:
      "bg-surface-elevated text-foreground border border-border hover:bg-surface-hover hover:border-border-bright",
    outline:
      "border border-border text-muted hover:text-foreground hover:bg-surface-hover hover:border-border-bright",
    ghost:
      "text-muted hover:text-foreground hover:bg-surface-hover",
    danger:
      "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-sm gap-2",
  };

  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
