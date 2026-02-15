import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext } from "@/lib/tenant-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userRole: "internal_admin" | "tenant_owner" | "tenant_admin" | "tenant_member" | "tenant_viewer" = "internal_admin";
  let userEmail = "";
  let userName = "";
  let avatarUrl = "";

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const ctx = await getTenantContext(user.id);
      userRole = ctx.role;
      userEmail = user.email || "";
      userName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
    }
  } catch {
    // Fallback to admin if resolution fails
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className="ml-64">
        <Header userEmail={userEmail} userName={userName} userRole={userRole} avatarUrl={avatarUrl} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
