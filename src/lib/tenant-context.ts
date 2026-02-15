/**
 * Server-side tenant context resolution.
 * Determines whether a user is an internal admin or a tenant user,
 * and returns their tenant + role for scoping.
 */
import { tenantsApi } from "@/lib/api";
import type { Tenant } from "@stalela/commons/types";

export type UserRole =
  | "internal_admin"
  | "tenant_owner"
  | "tenant_admin"
  | "tenant_member"
  | "tenant_viewer";

export interface TenantContext {
  role: UserRole;
  tenant: Tenant | null;
  tenantId: string | null;
}

/**
 * Resolve the tenant context for a given Supabase auth user ID.
 * - If the user has a tenant_users record → they are a tenant user.
 * - If not → they are an internal admin (legacy behaviour).
 */
export async function getTenantContext(userId: string): Promise<TenantContext> {
  try {
    const memberships = await tenantsApi.tenantsForUser(userId);

    if (memberships.length === 0) {
      return { role: "internal_admin", tenant: null, tenantId: null };
    }

    // MVP: use first tenant membership
    const membership = memberships[0];
    const roleMap: Record<string, UserRole> = {
      owner: "tenant_owner",
      admin: "tenant_admin",
      member: "tenant_member",
      viewer: "tenant_viewer",
    };

    return {
      role: roleMap[membership.role] ?? "tenant_member",
      tenant: membership as unknown as Tenant,
      tenantId: membership.tenant_id,
    };
  } catch {
    // If query fails (e.g. table doesn't exist yet), treat as admin
    return { role: "internal_admin", tenant: null, tenantId: null };
  }
}

/** Check if a role is a tenant-scoped role (not internal admin). */
export function isTenantUser(role: UserRole): boolean {
  return role !== "internal_admin";
}

/** Paths that tenant users are allowed to access. */
const TENANT_ALLOWED_PREFIXES = [
  "/marketing",
  "/api/marketing",
  "/auth",
];

/** Check if a path is allowed for tenant users. */
export function isTenantAllowedPath(pathname: string): boolean {
  return TENANT_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
}
