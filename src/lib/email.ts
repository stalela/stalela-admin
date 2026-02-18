/**
 * Brevo (Sendinblue) email service — lazy singleton.
 *
 * Defers API client creation until the first call so that importing this
 * module during `next build` (without env vars) does not crash.
 *
 * Usage:
 *   import { sendEmail } from "@/lib/email";
 *   await sendEmail({ to: "...", subject: "...", htmlContent: "..." });
 */

import { TransactionalEmailsApi, SendSmtpEmail } from "@getbrevo/brevo";

const SENDER_NAME = "Stalela";
const SENDER_EMAIL = "hello@stalela.com";

/** Feature flag — set EMAIL_TEST_OVERRIDE in Vercel env vars to redirect
 *  all outgoing emails to that address. Leave unset in production. */
const TEST_EMAIL_OVERRIDE = process.env.EMAIL_TEST_OVERRIDE ?? null;

/* ── Lazy API client ──────────────────────────────────────────────── */

let _api: TransactionalEmailsApi | undefined;

function getApi(): TransactionalEmailsApi {
  if (!_api) {
    const key = process.env.BREVO_API_KEY;
    if (!key) throw new Error("BREVO_API_KEY environment variable is not set");
    _api = new TransactionalEmailsApi();
    // SDK type stubs are incomplete — cast required per official TS docs
    (_api as unknown as { authentications: { apiKey: { apiKey: string } } })
      .authentications.apiKey.apiKey = key;
  }
  return _api;
}

/* ── Types ────────────────────────────────────────────────────────── */

export interface SendEmailOptions {
  /** Recipient email address */
  to: string;
  /** Recipient display name (optional) */
  toName?: string;
  /** Email subject line */
  subject: string;
  /** HTML body */
  htmlContent: string;
  /** Plain-text fallback (optional — Brevo auto-generates one if omitted) */
  textContent?: string;
  /** Reply-to address (optional, defaults to sender) */
  replyTo?: string;
  /** Additional headers (optional) */
  headers?: Record<string, string>;
}

/* ── Core send function ────────────────────────────────────────────── */

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const api = getApi();

  const recipient = TEST_EMAIL_OVERRIDE ?? opts.to;
  const recipientName = TEST_EMAIL_OVERRIDE ? `[TEST] ${opts.toName ?? opts.to}` : opts.toName;
  const subject = TEST_EMAIL_OVERRIDE ? `[TEST → ${opts.to}] ${opts.subject}` : opts.subject;

  const message = new SendSmtpEmail();
  message.sender = { name: SENDER_NAME, email: SENDER_EMAIL };
  message.to = [{ email: recipient, name: recipientName }];
  message.subject = subject;
  message.htmlContent = opts.htmlContent;

  if (opts.textContent) message.textContent = opts.textContent;
  if (opts.replyTo) message.replyTo = { email: opts.replyTo };
  if (opts.headers) message.headers = opts.headers;

  await api.sendTransacEmail(message);
}

/* ── Convenience helpers ───────────────────────────────────────────── */

/** Send a plain internal alert (no branding, just text). */
export async function sendInternalAlert(opts: {
  subject: string;
  text: string;
}): Promise<void> {
  await sendEmail({
    to: SENDER_EMAIL,
    toName: "Stalela Admin",
    subject: `[ALERT] ${opts.subject}`,
    htmlContent: `<p style="font-family:sans-serif;font-size:14px;color:#333;">${opts.text.replace(/\n/g, "<br>")}</p>`,
    textContent: opts.text,
  });
}
