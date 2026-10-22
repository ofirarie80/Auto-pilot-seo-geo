import "server-only";

/**
 * Sends an email through Resend (resend.com). Needs RESEND_API_KEY and REPORT_FROM
 * (a sender on a verified domain, e.g. "Lionet Pilot <reports@lionet.co.il>").
 * Skips quietly when not configured.
 */
export async function sendEmail(to: string[], subject: string, html: string): Promise<{ sent: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key || !to.length) return { sent: false, error: "not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: process.env.REPORT_FROM?.trim() || "Lionet Pilot <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) return { sent: false, error: `${res.status} ${(await res.text()).slice(0, 200)}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Simple RTL email body from the plain-text report lines. */
export function reportEmailHtml(orgName: string, blocks: string[], link?: string) {
  const body = blocks
    .map((b) => `<div style="padding:14px 16px;border:1px solid #DCE2E8;border-radius:8px;margin:0 0 12px">${esc(b).replace(/\n/g, "<br>")}</div>`)
    .join("");
  const cta = link
    ? `<p style="margin:20px 0 0"><a href="${esc(link)}" style="background:#0E7C86;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">לדשבורד המלא</a></p>`
    : "";
  return `<div dir="rtl" style="font-family:Arial,sans-serif;color:#13212E;max-width:560px;margin:auto;line-height:1.6">
<h2 style="margin:0 0 4px">הדוח השבועי · ${esc(orgName)}</h2>
<p style="color:#5B6B79;margin:0 0 16px">איך מנועי ה-AI הציגו אתכם השבוע</p>${body}${cta}
<p style="color:#8A97A3;font-size:12px;margin-top:24px">Lionet Pilot · אפשר לכבות את הדוח בהגדרות</p></div>`;
}
