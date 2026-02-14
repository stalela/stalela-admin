"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/blog": "Blog Posts",
  "/blog/new": "New Post",
  "/seo": "SEO Management",
  "/contacts/leads": "Leads",
  "/contacts/customers": "Customers",
  "/metrics": "Metrics",
  "/companies": "Companies",
  "/companies/list": "All Companies",
  "/companies/map": "Company Map",
  "/companies/graph": "Graph Explorer",
};

export function Header() {
  const pathname = usePathname();

  // Find the most specific title match
  const title =
    titles[pathname] ??
    Object.entries(titles)
      .filter(([key]) => pathname.startsWith(key) && key !== "/")
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    "Stalela Admin";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur-xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <div className="h-0.5 w-8 rounded-full bg-gradient-to-r from-copper-600 to-vibranium" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-copper-600 to-copper-800 flex items-center justify-center text-xs font-bold text-white">
          A
        </div>
      </div>
    </header>
  );
}
