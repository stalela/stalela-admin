/**
 * Direct Brevo SDK test — calls the API without going through the web server.
 * Run: node scripts/test-email.js
 * Requires BREVO_API_KEY in .env.local
 */

// Load .env.local
const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach(line => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length && !key.startsWith("#")) {
        process.env[key.trim()] = rest.join("=").trim();
      }
    });
}

const { TransactionalEmailsApi, SendSmtpEmail } = require("@getbrevo/brevo");

async function main() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("ERROR: BREVO_API_KEY not set in .env.local");
    process.exit(1);
  }

  const api = new TransactionalEmailsApi();
  api.authentications.apiKey.apiKey = apiKey;

  const msg = new SendSmtpEmail();
  msg.sender  = { name: "Stalela", email: "hello@stalela.com" };
  msg.to      = [{ email: "kudzicloud@gmail.com", name: "Kudzicloud" }];
  msg.subject = "Stalela Email System - Test";
  msg.htmlContent = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <div style="background:linear-gradient(135deg,#0a0a0c,#1a1a22);padding:24px 32px;text-align:center;">
        <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:3px;">STALELA</span>
      </div>
      <div style="height:3px;background:linear-gradient(90deg,#a4785a,#d4a574,#a4785a);"></div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 12px;color:#0a0a0c;font-size:20px;">Brevo is connected</h2>
        <p style="color:#444;line-height:1.6;">The email system is live on <strong>stalela-admin</strong>. All four send endpoints are operational:</p>
        <ul style="color:#555;line-height:2;">
          <li><code>POST /api/email/send</code> — generic</li>
          <li><code>POST /api/briefings/[id]/send</code> — AI outreach drafts</li>
          <li><code>POST /api/marketing/leads/[id]/send</code> — lead outreach</li>
          <li><code>POST /api/marketing/campaigns/[id]/send</code> — campaign previews</li>
        </ul>
        <p style="color:#a4785a;font-weight:600;margin:0;">stalela.com</p>
      </div>
    </div>`;

  console.log("Sending to kudzicloud@gmail.com ...");
  const res = await api.sendTransacEmail(msg);
  console.log("SUCCESS — Message ID:", res.body?.messageId ?? JSON.stringify(res.body));
}

main().catch(e => {
  console.error("FAILED:", e?.body ?? e?.message ?? e);
  process.exit(1);
});
