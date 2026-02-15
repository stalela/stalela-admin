/**
 * Apply Stalela-branded email templates + auth config to Supabase.
 * 
 * Usage: npx tsx scripts/apply-auth-config.ts
 * 
 * Requires: SUPABASE_ACCESS_TOKEN env var or inline token.
 */

import {
  confirmationTemplate,
  recoveryTemplate,
  magicLinkTemplate,
  inviteTemplate,
  emailChangeTemplate,
} from "./email-templates";

const PROJECT_REF = "hwfhtdlbtjhmwzyvejxd";
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || "";
const SITE_URL = "https://admin.stalela.com";
const REDIRECT_URLS = [
  "https://admin.stalela.com/auth/callback",
  "http://localhost:3001/auth/callback",
];

async function applyAuthConfig() {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

  const body = {
    // Site URL
    site_url: SITE_URL,

    // Redirect URL allowlist (semicolon-separated)
    uri_allow_list: REDIRECT_URLS.join(","),

    // Email subjects
    mailer_subjects_confirmation: "Verify your Stalela Marketing account",
    mailer_subjects_recovery: "Reset your Stalela Marketing password",
    mailer_subjects_magic_link: "Sign in to Stalela Marketing",
    mailer_subjects_invite: "You've been invited to Stalela Marketing",
    mailer_subjects_email_change: "Confirm email change — Stalela Marketing",

    // Email templates
    mailer_templates_confirmation_content: confirmationTemplate,
    mailer_templates_recovery_content: recoveryTemplate,
    mailer_templates_magic_link_content: magicLinkTemplate,
    mailer_templates_invite_content: inviteTemplate,
    mailer_templates_email_change_content: emailChangeTemplate,
  };

  console.log("Applying auth config to project:", PROJECT_REF);
  console.log("  Site URL:", SITE_URL);
  console.log("  Redirect URLs:", REDIRECT_URLS.join(", "));
  console.log("  Email templates: confirmation, recovery, magic_link, invite, email_change");
  console.log();

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed (${res.status}):`, text);
    process.exit(1);
  }

  const data = await res.json();
  console.log("Auth config updated successfully.");
  console.log("  site_url:", data.site_url);
  console.log("  uri_allow_list:", data.uri_allow_list);
  console.log("  mailer_subjects_confirmation:", data.mailer_subjects_confirmation);
  console.log("  mailer_subjects_recovery:", data.mailer_subjects_recovery);
  console.log("  mailer_subjects_magic_link:", data.mailer_subjects_magic_link);
  console.log("  mailer_subjects_invite:", data.mailer_subjects_invite);
  console.log("  mailer_subjects_email_change:", data.mailer_subjects_email_change);
}

applyAuthConfig();
