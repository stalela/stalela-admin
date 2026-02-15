import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

/** Paths accessible without authentication */
const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

/** Paths that tenant-scoped users may access */
const TENANT_ALLOWED = ["/marketing", "/api/marketing", "/auth"];

function isTenantAllowed(pathname: string): boolean {
  return TENANT_ALLOWED.some((p) => pathname.startsWith(p));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Allow public paths without auth
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from login/signup
  if (user && (pathname === "/login" || pathname === "/signup")) {
    // Determine if tenant user → send to /marketing, admin → /
    const { createAdminClient } = await import("@stalela/commons/client");
    const { createTenantsApi } = await import("@stalela/commons/tenants");
    const adminClient = createAdminClient();
    const adminTenantsApi = createTenantsApi(adminClient);

    try {
      const memberships = await adminTenantsApi.tenantsForUser(user.id);
      const url = request.nextUrl.clone();
      url.pathname = memberships.length > 0 ? "/marketing" : "/";
      return NextResponse.redirect(url);
    } catch {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // Scope tenant users: restrict to /marketing paths only
  if (user && !isPublicPath(pathname)) {
    // Skip scoping for API routes that don't start with /marketing or /api/marketing
    // and non-marketing dashboard pages
    try {
      const { createAdminClient } = await import("@stalela/commons/client");
      const { createTenantsApi } = await import("@stalela/commons/tenants");
      const adminClient = createAdminClient();
      const adminTenantsApi = createTenantsApi(adminClient);

      const memberships = await adminTenantsApi.tenantsForUser(user.id);

      if (memberships.length > 0 && !isTenantAllowed(pathname) && pathname !== "/") {
        // Tenant user trying to access admin-only page → redirect to /marketing
        const url = request.nextUrl.clone();
        url.pathname = "/marketing";
        return NextResponse.redirect(url);
      }

      // Tenant user on root → redirect to /marketing
      if (memberships.length > 0 && pathname === "/") {
        const url = request.nextUrl.clone();
        url.pathname = "/marketing";
        return NextResponse.redirect(url);
      }

      // Store role info in response header for downstream use
      if (memberships.length > 0) {
        supabaseResponse.headers.set("x-tenant-id", memberships[0].tenant_id);
        supabaseResponse.headers.set("x-tenant-role", memberships[0].role);
      }
    } catch {
      // If tenant lookup fails, allow through (backwards compat for admins)
    }
  }

  return supabaseResponse;
}
