import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import MarketingChat from "@/components/MarketingChat";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userRole: "internal_admin" | "tenant_owner" | "tenant_admin" | "tenant_member" | "tenant_viewer" = "internal_admin";
  let userEmail = "";
  let userName = "";
  let avatarUrl = "";
  let userId = "";
  let tenantId = "";

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const ctx = await getTenantContext(user.id);
      userRole = ctx.role;
      userEmail = user.email || "";
      userName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
      userId = user.id;
      tenantId = ctx.tenantId || "";
    }
  } catch {
    // Fallback to admin if resolution fails
  }

  const showChat = isTenantUser(userRole) && !!tenantId && !!userId;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className="ml-64">
        <Header userEmail={userEmail} userName={userName} userRole={userRole} avatarUrl={avatarUrl} />
        <main className="p-6">{children}</main>
      </div>
      {showChat && <MarketingChat tenantId={tenantId} userId={userId} />}
    </div>
  );
}
