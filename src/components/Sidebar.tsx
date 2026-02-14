"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Plus,
  Search,
  Users,
  UserCheck,
  BarChart3,
  LogOut,
  ChevronDown,
  Hexagon,
  Building2,
  MapPin,
  Network,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const navigation: (NavItem | NavGroup)[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    label: "Blog",
    icon: FileText,
    items: [
      { label: "All Posts", href: "/blog", icon: FileText },
      { label: "New Post", href: "/blog/new", icon: Plus },
    ],
  },
  { label: "SEO", href: "/seo", icon: Search },
  {
    label: "Contacts",
    icon: Users,
    items: [
      { label: "Leads", href: "/contacts/leads", icon: Users },
      { label: "Customers", href: "/contacts/customers", icon: UserCheck },
    ],
  },
  { label: "Metrics", href: "/metrics", icon: BarChart3 },
  {
    label: "Companies",
    icon: Building2,
    items: [
      { label: "Overview", href: "/companies", icon: Building2 },
      { label: "All Companies", href: "/companies/list", icon: List },
      { label: "Map", href: "/companies/map", icon: MapPin },
      { label: "Graph", href: "/companies/graph", icon: Network },
    ],
  },
];

function isGroup(item: NavItem | NavGroup): item is NavGroup {
  return "items" in item;
}

function NavLink({ item, collapsed }: { item: NavItem; collapsed?: boolean }) {
  const pathname = usePathname();
  const isActive =
    item.href === "/"
      ? pathname === "/"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-copper-600/20 text-copper-light border border-copper-600/30"
          : "text-muted hover:text-foreground hover:bg-surface-hover border border-transparent"
      )}
    >
      <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-copper-600")} />
      {!collapsed && <span>{item.label}</span>}
      {isActive && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-copper-600 shadow-[0_0_6px_var(--copper-600)]" />
      )}
    </Link>
  );
}

function NavGroupSection({
  group,
  collapsed,
}: {
  group: NavGroup;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const isGroupActive = group.items.some((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );
  const [open, setOpen] = useState(isGroupActive);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
          isGroupActive
            ? "text-copper-light"
            : "text-muted hover:text-foreground hover:bg-surface-hover"
        )}
      >
        <group.icon className={cn("h-4 w-4 shrink-0", isGroupActive && "text-copper-600")} />
        {!collapsed && (
          <>
            <span>{group.label}</span>
            <ChevronDown
              className={cn(
                "ml-auto h-3 w-3 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </>
        )}
      </button>
      {open && !collapsed && (
        <div className="mt-1 ml-4 space-y-1 border-l border-border pl-3">
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface">
      {/* ── Logo ── */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <div className="relative">
          <Hexagon className="h-8 w-8 text-copper-600" strokeWidth={1.5} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-copper-light">
            S
          </span>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-wide text-foreground">
            STALELA
          </h1>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted">
            Command Centre
          </p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) =>
          isGroup(item) ? (
            <NavGroupSection key={item.label} group={item} />
          ) : (
            <NavLink key={item.href} item={item} />
          )
        )}
      </nav>

      {/* ── Wakanda decorative line ── */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-copper-600/50 to-transparent" />

      {/* ── Footer ── */}
      <div className="px-3 py-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
