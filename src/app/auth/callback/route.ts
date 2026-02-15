import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // "recovery" for password reset

  if (!code) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "missing_code");
    return NextResponse.redirect(url);
  }

  // Collect cookies set by Supabase during code exchange so we can
  // copy them onto whichever redirect response we return.
  const pendingCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          pendingCookies.push(...cookiesToSet);
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  // Helper: create a redirect and copy all pending auth cookies onto it
  function redirectWithCookies(pathname: string, search = ""): NextResponse {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    const res = NextResponse.redirect(url);
    for (const { name, value, options } of pendingCookies) {
      res.cookies.set(name, value, options);
    }
    return res;
  }

  if (error) {
    return redirectWithCookies("/login", `?error=verification_failed`);
  }

  // Handle password recovery — redirect to password update page
  if (type === "recovery") {
    return redirectWithCookies("/login/reset-password");
  }

  // Check if this user needs a tenant provisioned
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Prefer tenant_name from query param (Google OAuth signup), then user_metadata (email signup), then email prefix
    const tenantName =
      searchParams.get("tenant_name") ||
      (user.user_metadata?.tenant_name as string) ||
      user.user_metadata?.full_name as string ||
      user.email?.split("@")[0] ||
      "My Agency";

    // Use service-role client to provision tenant (bypasses RLS)
    const { createAdminClient } = await import("@stalela/commons/client");
    const { createTenantsApi } = await import("@stalela/commons/tenants");
    const adminClient = createAdminClient();
    const adminTenantsApi = createTenantsApi(adminClient);

    // Check if user already has a tenant
    const existing = await adminTenantsApi.tenantsForUser(user.id);

    if (existing.length === 0) {
      // Create slug from tenant name
      const slug = tenantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);

      // Ensure unique slug by appending random suffix if needed
      const existingTenant = await adminTenantsApi.getBySlug(slug);
      const finalSlug = existingTenant
        ? `${slug}-${Math.random().toString(36).slice(2, 7)}`
        : slug;

      const tenant = await adminTenantsApi.create({
        name: tenantName,
        slug: finalSlug,
        owner_email: user.email || "",
        plan: "free",
        status: "trial",
      });

      // Link user as owner
      await adminTenantsApi.addUser({
        tenant_id: tenant.id,
        user_id: user.id,
        role: "owner",
      });
    }
  }

  // Redirect to marketing dashboard with session cookies
  return redirectWithCookies("/marketing");
}
