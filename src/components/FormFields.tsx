"use client";

import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted/50",
          "focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50",
          "transition-colors duration-200",
          error && "border-danger focus:border-danger focus:ring-danger/50",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className,
  id,
  ...props
}: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted/50",
          "focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50",
          "transition-colors duration-200 resize-y",
          error && "border-danger focus:border-danger focus:ring-danger/50",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  options,
  className,
  id,
  ...props
}: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground",
          "focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50",
          "transition-colors duration-200",
          error && "border-danger focus:border-danger focus:ring-danger/50",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
