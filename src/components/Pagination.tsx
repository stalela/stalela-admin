import Link from "next/link";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pathname: string;
  searchParams: Record<string, string | undefined>;
}

/**
 * Windowed paginator for large datasets.
 * Shows: First ... [window around current] ... Last
 */
export function Pagination({
  currentPage,
  totalPages,
  pathname,
  searchParams,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const windowSize = 2; // pages on each side of current
  const pages: (number | "ellipsis")[] = [];

  // Always show page 1
  pages.push(1);

  // Left ellipsis
  if (currentPage - windowSize > 2) {
    pages.push("ellipsis");
  }

  // Window around current
  for (
    let p = Math.max(2, currentPage - windowSize);
    p <= Math.min(totalPages - 1, currentPage + windowSize);
    p++
  ) {
    pages.push(p);
  }

  // Right ellipsis
  if (currentPage + windowSize < totalPages - 1) {
    pages.push("ellipsis");
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1">
      {/* Previous */}
      {currentPage > 1 && (
        <Link
          href={{
            pathname,
            query: { ...searchParams, page: (currentPage - 1).toString() },
          }}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          ←
        </Link>
      )}

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            className="px-2 py-1.5 text-xs text-muted"
          >
            …
          </span>
        ) : (
          <Link
            key={p}
            href={{
              pathname,
              query: { ...searchParams, page: p.toString() },
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              p === currentPage
                ? "bg-copper-600 text-white"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            )}
          >
            {p}
          </Link>
        )
      )}

      {/* Next */}
      {currentPage < totalPages && (
        <Link
          href={{
            pathname,
            query: { ...searchParams, page: (currentPage + 1).toString() },
          }}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          →
        </Link>
      )}
    </div>
  );
}
