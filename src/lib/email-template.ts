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
    // Bold
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
            <td style="background: linear-gradient(135deg, #0a0a0c 0%, #1a1a22 100%); padding: 28px 32px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Star icon (inline SVG as data URI) -->
                    <img
                      src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0gNzIgNTAgUSA3MiAzOCwgNjUgMzAiIHN0cm9rZT0iI0Q0QTU3NCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9Im5vbmUiIG9wYWNpdHk9IjAuOSIvPjxwYXRoIGQ9Ik0gNzggNTAgUSA3OCAzNCwgNjggMjIiIHN0cm9rZT0iI0Q0QTU3NCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9Im5vbmUiIG9wYWNpdHk9IjAuNyIvPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDUwLCA1MCkiPjxwYXRoIGQ9Ik0gMCwtMjAgTCA1LC01IEwgMjAsMCBMIDUsNSBMIDAsMjAgTCAtNSw1IEwgLTIwLDAgTCAtNSwtNSBaIiBmaWxsPSIjRkZGRkZGIi8+PHBhdGggZD0iTSAxMiwtMTIgTCAxNCwtOCBMIDE4LC02IEwgMTQsLTQgTCAxMiwwIEwgMTAsLTQgTCA2LC02IEwgMTAsLTggWiIgZmlsbD0iI0Y1RjVGNSIvPjxwYXRoIGQ9Ik0gLTgsLTMgUSAtMTIsMCAtOCwzIiBzdHJva2U9IiNGNUY1RjUiIHN0cm9rZS13aWR0aD0iMi40IiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9Im5vbmUiLz48L2c+PHBhdGggZD0iTSAyOCA1MCBRIDI4IDYyLCAzNSA3MCIgc3Ryb2tlPSIjRDRBNTc0IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIgb3BhY2l0eT0iMC45Ii8+PHBhdGggZD0iTSAyMiA1MCBRIDIyIDY2LCAzMiA3OCIgc3Ryb2tlPSIjRDRBNTc0IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIgb3BhY2l0eT0iMC43Ii8+PC9zdmc+"
                      alt="Stalela"
                      width="40"
                      height="40"
                      style="display:block;margin:0 auto 8px;"
                    />
                    <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:3px;">
                      STALELA
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Copper accent line -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#a4785a,#d4a574,#a4785a);"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              ${recipientName ? `<p style="margin:0 0 4px 0;color:#999999;font-size:13px;font-family:'Helvetica Neue',Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;">To: ${escapeHtml(recipientName)}${companyName ? ` · ${escapeHtml(companyName)}` : ""}</p>` : ""}
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

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 28px;text-align:center;">
              <p style="margin:0 0 6px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#a4785a;font-weight:600;">
                Stalela Business Services
              </p>
              <p style="margin:0 0 4px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#999999;">
                Professional compliance, registration & advisory services across South Africa
              </p>
              <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#bbbbbb;">
                <a href="https://stalela.com" style="color:#a4785a;text-decoration:none;">stalela.com</a>
                &nbsp;·&nbsp;
                <a href="mailto:info@stalela.com" style="color:#a4785a;text-decoration:none;">info@stalela.com</a>
              </p>
            </td>
          </tr>

        </table>

        <!-- Sub-footer -->
        <p style="margin:16px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#999999;text-align:center;">
          This email was crafted with care by Stalela
        </p>
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
