"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, Filter } from "lucide-react";
import { useState } from "react";

interface LeadFiltersProps {
  sources: string[];
}

export function LeadFilters({ sources }: LeadFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function applyFilters(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page"); // Reset to page 1
    router.push(`/contacts/leads?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    applyFilters({ search: search || undefined });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full rounded-lg border border-border bg-surface-elevated py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/50 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50 transition-colors"
        />
      </form>

      {/* Source filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted" />
        <select
          value={searchParams.get("source") ?? ""}
          onChange={(e) =>
            applyFilters({ source: e.target.value || undefined })
          }
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50 transition-colors"
        >
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
