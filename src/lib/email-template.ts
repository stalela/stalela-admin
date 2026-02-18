/**
 * Branded HTML email template for Stalela outreach.
 * Generates inline-styled HTML compatible with Gmail and most email clients.
 */

interface EmailTemplateParams {
  subject: string;
  body: string;
  recipientName?: string;
  companyName?: string;
}

export function buildEmailHtml({
  subject,
  body,
  recipientName,
  companyName,
}: EmailTemplateParams): string {
  // Convert line breaks to <br> for email HTML
  const htmlBody = body
    .replace(/\n\n/g, "</p><p style=\"margin:0 0 12px 0;color:#333333;font-size:15px;line-height:1.6;\">")
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f0;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a0a0c 0%,#1a1a22 100%);padding:24px 32px;text-align:center;">
              <img
                src="https://hwfhtdlbtjhmwzyvejxd.supabase.co/storage/v1/object/public/assets/brand/logo.svg"
                alt="Stalela"
                width="180"
                height="50"
                style="display:block;margin:0 auto;"
              />
            </td>
          </tr>

          <!-- Copper accent line -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#a4785a,#d4a574,#a4785a);"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              ${recipientName ? `<p style="margin:0 0 16px 0;color:#999999;font-size:12px;font-family:'Helvetica Neue',Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;">To: ${escapeHtml(recipientName)}${companyName ? ` · ${escapeHtml(companyName)}` : ""}</p>` : ""}
              <p style="margin:0 0 12px 0;color:#333333;font-size:15px;line-height:1.6;">
                ${htmlBody}
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background-color:#e8e4df;"></div>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding:24px 32px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <!-- Left accent bar -->
                  <td width="3" style="background:linear-gradient(180deg,#a4785a,#d4a574);border-radius:2px;">&nbsp;</td>
                  <td width="16">&nbsp;</td>
                  <!-- Signature content -->
                  <td>
                    <p style="margin:0 0 3px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;color:#1a1a22;">
                      George Zharare
                    </p>
                    <p style="margin:0 0 8px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#a4785a;font-weight:600;letter-spacing:0.5px;">
                      Chief Executive Officer · Stalela
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:16px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#666666;">
                          &#128222;&nbsp;<a href="tel:+27612673163" style="color:#666666;text-decoration:none;">061 267 3163</a>
                        </td>
                        <td style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#666666;">
                          &#127760;&nbsp;<a href="https://stalela.com" style="color:#a4785a;text-decoration:none;">stalela.com</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bottom bar -->
          <tr>
            <td style="background-color:#f9f7f5;padding:14px 32px;border-top:1px solid #e8e4df;text-align:center;">
              <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#bbbbbb;">
                Stalela Business Services &nbsp;·&nbsp; South Africa
                &nbsp;·&nbsp;
                <a href="https://stalela.com" style="color:#a4785a;text-decoration:none;">stalela.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Copy rich HTML content to clipboard so pasting into Gmail
 * preserves formatting (uses Clipboard API with text/html MIME type).
 */
export async function copyHtmlToClipboard(html: string): Promise<boolean> {
  try {
    const blob = new Blob([html], { type: "text/html" });
    const plainBlob = new Blob(
      [html.replace(/<[^>]*>/g, "")],
      { type: "text/plain" }
    );
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": blob,
        "text/plain": plainBlob,
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}
