import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  label: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  emptyMessage = "No data found",
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className={cn("rounded-xl border border-border bg-surface p-12 text-center", className)}>
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-surface", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-elevated/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted",
                    col.className
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row) => (
              <tr
                key={String(row[keyField])}
                className="transition-colors hover:bg-surface-hover"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3 text-sm text-foreground", col.className)}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
