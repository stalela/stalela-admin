"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { LogOut, User, ChevronDown, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

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
  "/marketing": "Marketing",
};

interface HeaderProps {
  userEmail?: string;
  userName?: string;
  userRole?: string;
  avatarUrl?: string;
}

export function Header({ userEmail, userName, userRole, avatarUrl }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    }
    if (open || themeMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, themeMenuOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const initial = (userName?.[0] || userEmail?.[0] || "U").toUpperCase();
  const displayName = userName || userEmail?.split("@")[0] || "User";
  const roleBadge = userRole?.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Find the most specific title match
  const title =
    titles[pathname] ??
    Object.entries(titles)
      .filter(([key]) => pathname.startsWith(key) && key !== "/")
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    "Stalela Admin";

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur-xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <div className="h-0.5 w-8 rounded-full bg-gradient-to-r from-copper-600 to-vibranium" />
      </div>

      {/* Theme toggle + Profile dropdown */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setThemeMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 text-muted transition-colors hover:border-copper-600/50 hover:text-foreground"
            title="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>

          {themeMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-36 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
              {([
                { value: "light" as const, label: "Light", icon: Sun },
                { value: "dark" as const, label: "Dark", icon: Moon },
                { value: "system" as const, label: "System", icon: Monitor },
              ]).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => { setTheme(value); setThemeMenuOpen(false); }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    theme === value
                      ? "bg-copper-600/10 text-copper-light"
                      : "text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

      {/* Profile dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-border/50 bg-surface-hover/50 py-1.5 pl-1.5 pr-3 transition-colors hover:border-copper-600/50 hover:bg-surface-hover"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-copper-600 to-copper-800 text-xs font-bold text-white">
              {initial}
            </div>
          )}
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            {displayName}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-lg border border-border bg-surface shadow-xl dark:shadow-black/40">
            {/* User info */}
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-10 w-10 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-copper-600 to-copper-800 text-sm font-bold text-white">
                    {initial}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                  {userEmail && (
                    <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                  )}
                </div>
              </div>
              {roleBadge && (
                <span className="mt-2 inline-block rounded-full bg-copper-600/15 px-2.5 py-0.5 text-xs font-medium text-copper-light">
                  {roleBadge}
                </span>
              )}
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={() => { setOpen(false); router.push("/profile"); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-surface-hover"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                Profile & Settings
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
