/**
 * Stalela-branded HTML email templates for Supabase Auth.
 *
 * These templates use Go template variables ({{ .ConfirmationURL }}, {{ .Token }}, etc.)
 * and should be pasted into the Supabase Dashboard → Auth → Email Templates, or applied
 * via the Management API:
 *
 *   curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
 *     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
 *     -H "Content-Type: application/json" \
 *     -d @stalela-email-config.json
 */

/** Publicly hosted PNG logo (white star + copper arcs on transparent bg) */
const LOGO_URL = "https://hwfhtdlbtjhmwzyvejxd.supabase.co/storage/v1/object/public/assets/email/logo-white.png";

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f0;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a0a0c 0%,#1a1a22 100%);padding:28px 32px;text-align:center;">
              <img src="${LOGO_URL}" alt="Stalela" width="40" height="40" style="display:block;margin:0 auto 8px;" />
              <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:3px;">STALELA</span>
            </td>
          </tr>

          <!-- Copper accent -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#a4785a,#d4a574,#a4785a);"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              ${body}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;"><div style="height:1px;background-color:#e8e4df;"></div></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 28px;text-align:center;">
              <p style="margin:0 0 6px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#a4785a;font-weight:600;">Stalela Marketing</p>
              <p style="margin:0 0 4px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#999999;">AI-powered advertising and marketing platform</p>
              <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#bbbbbb;">
                <a href="https://stalela.com" style="color:#a4785a;text-decoration:none;">stalela.com</a>
              </p>
            </td>
          </tr>

        </table>
        <p style="margin:16px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#999999;text-align:center;">
          &copy; Stalela — <em>sta</em> &middot; <em>lalela</em> — listen
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** CTA button style */
const btn = `display:inline-block;background-color:#a4785a;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;letter-spacing:0.5px;`;

/** Text paragraph style */
const p = `margin:0 0 16px 0;color:#333333;font-size:15px;line-height:1.6;`;

/** Heading style */
const h2 = `margin:0 0 16px 0;color:#1a1a22;font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:700;`;

// ─── Templates ─────────────────────────────────────────────

export const confirmationTemplate = wrap(
  "Verify your Stalela Marketing account",
  `<h2 style="${h2}">Verify your email</h2>
<p style="${p}">Welcome to Stalela Marketing! Click the button below to verify your email address and activate your account.</p>
<p style="text-align:center;margin:24px 0;">
  <a href="{{ .ConfirmationURL }}" style="${btn}">Verify Email Address</a>
</p>
<p style="margin:0;color:#999999;font-size:13px;font-family:'Helvetica Neue',Arial,sans-serif;">
  If you didn't create this account, you can safely ignore this email.
</p>`
);

export const recoveryTemplate = wrap(
  "Reset your Stalela Marketing password",
  `<h2 style="${h2}">Reset your password</h2>
<p style="${p}">We received a request to reset the password for your Stalela Marketing account (<strong>{{ .Email }}</strong>).</p>
<p style="text-align:center;margin:24px 0;">
  <a href="{{ .ConfirmationURL }}" style="${btn}">Reset Password</a>
</p>
<p style="margin:0;color:#999999;font-size:13px;font-family:'Helvetica Neue',Arial,sans-serif;">
  If you didn't request a password reset, you can safely ignore this email. Your password will not change.
</p>`
);

export const magicLinkTemplate = wrap(
  "Sign in to Stalela Marketing",
  `<h2 style="${h2}">Sign in to Stalela Marketing</h2>
<p style="${p}">Click the button below to sign in to your account. This link expires in 10 minutes.</p>
<p style="text-align:center;margin:24px 0;">
  <a href="{{ .ConfirmationURL }}" style="${btn}">Sign In</a>
</p>
<p style="margin:0;color:#999999;font-size:13px;font-family:'Helvetica Neue',Arial,sans-serif;">
  If you didn't request this link, you can safely ignore this email.
</p>`
);

export const inviteTemplate = wrap(
  "You've been invited to Stalela Marketing",
  `<h2 style="${h2}">You've been invited</h2>
<p style="${p}">You've been invited to join a team on Stalela Marketing. Click below to accept the invitation and create your account.</p>
<p style="text-align:center;margin:24px 0;">
  <a href="{{ .ConfirmationURL }}" style="${btn}">Accept Invitation</a>
</p>
<p style="margin:0;color:#999999;font-size:13px;font-family:'Helvetica Neue',Arial,sans-serif;">
  If you weren't expecting this invitation, you can safely ignore this email.
</p>`
);

export const emailChangeTemplate = wrap(
  "Confirm email change — Stalela Marketing",
  `<h2 style="${h2}">Confirm email change</h2>
<p style="${p}">You requested to change your email address to <strong>{{ .NewEmail }}</strong>. Click below to confirm.</p>
<p style="text-align:center;margin:24px 0;">
  <a href="{{ .ConfirmationURL }}" style="${btn}">Confirm Email Change</a>
</p>
<p style="margin:0;color:#999999;font-size:13px;font-family:'Helvetica Neue',Arial,sans-serif;">
  If you didn't request this change, please contact support immediately.
</p>`
);

// ─── Management API payload ────────────────────────────────

export const emailConfig = {
  mailer_subjects_confirmation: "Verify your Stalela Marketing account",
  mailer_templates_confirmation_content: confirmationTemplate,
  mailer_subjects_recovery: "Reset your Stalela Marketing password",
  mailer_templates_recovery_content: recoveryTemplate,
  mailer_subjects_magic_link: "Sign in to Stalela Marketing",
  mailer_templates_magic_link_content: magicLinkTemplate,
  mailer_subjects_invite: "You've been invited to Stalela Marketing",
  mailer_templates_invite_content: inviteTemplate,
  mailer_subjects_email_change: "Confirm email change — Stalela Marketing",
  mailer_templates_email_change_content: emailChangeTemplate,
};

// When run directly via tsx/node, output JSON for the Management API
if (typeof process !== "undefined" && process.argv[1]?.includes("email-templates")) {
  console.log(JSON.stringify(emailConfig, null, 2));
}
