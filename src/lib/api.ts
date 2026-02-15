/**
 * Server-side Supabase admin client for data operations.
 * Uses service-role key for full access, bypassing RLS.
 * Lazy-initialised so imports don't crash during `next build`
 * when env vars may not yet be available.
 */
import { createAdminClient } from "@stalela/commons/client";
import { createBlogApi } from "@stalela/commons/blog";
import { createLeadsApi } from "@stalela/commons/leads";
import { createCustomersApi } from "@stalela/commons/customers";
import { createSeoApi } from "@stalela/commons/seo";
import { createMetricsApi } from "@stalela/commons/metrics";
import { createCompaniesApi } from "@stalela/commons/companies";
import { createResearchApi } from "@stalela/commons/research";
import { createBriefingsApi } from "@stalela/commons/briefings";
import { createNewsApi } from "@stalela/commons/news";
import { createTenantsApi } from "@stalela/commons/tenants";
import { createCampaignsApi } from "@stalela/commons/campaigns";
import { createAuditsApi } from "@stalela/commons/audits";
import { createPlatformsApi } from "@stalela/commons/platforms";
import { createCompetitorsApi } from "@stalela/commons/competitors";

function lazy<T extends object>(factory: () => T): T {
  let instance: T | undefined;
  return new Proxy({} as object, {
    get(_, prop) {
      if (!instance) instance = factory();
      return (instance as Record<string, unknown>)[prop as string];
    },
  }) as T;
}

const getClient = (() => {
  let client: ReturnType<typeof createAdminClient> | undefined;
  return () => {
    if (!client) client = createAdminClient();
    return client;
  };
})();

export const blogApi = lazy(() => createBlogApi(getClient()));
export const leadsApi = lazy(() => createLeadsApi(getClient()));
export const customersApi = lazy(() => createCustomersApi(getClient()));
export const seoApi = lazy(() => createSeoApi(getClient()));
export const metricsApi = lazy(() => createMetricsApi(getClient()));
export const companiesApi = lazy(() => createCompaniesApi(getClient()));
export const researchApi = lazy(() => createResearchApi(getClient()));
export const briefingsApi = lazy(() => createBriefingsApi(getClient()));
export const newsApi = lazy(() => createNewsApi(getClient()));
export const tenantsApi = lazy(() => createTenantsApi(getClient()));
export const campaignsApi = lazy(() => createCampaignsApi(getClient()));
export const auditsApi = lazy(() => createAuditsApi(getClient()));
export const platformsApi = lazy(() => createPlatformsApi(getClient()));
export const competitorsApi = lazy(() => createCompetitorsApi(getClient()));
