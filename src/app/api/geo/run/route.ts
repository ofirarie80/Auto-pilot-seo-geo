import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runSite } from "@/lib/geo/run";
import { getSiteReport, reportText } from "@/lib/geo/report";
import { sendWhatsApp } from "@/lib/notify/whatsapp";
import { sendEmail, reportEmailHtml } from "@/lib/notify/email";
import { runAudit } from "@/lib/audit/run";

export const runtime = "nodejs";
export const maxDuration = 300; // seconds — AI answers with web search are slow

type Org = { id: string; name: string; plan: string; notify_email: boolean; whatsapp_to: string | null };

/**
 * Weekly job (and manual trigger).
 *   GET /api/geo/run              → every active site of every organization
 *   GET /api/geo/run?site=<uuid>  → one site
 * Protected by CRON_SECRET (header `Authorization: Bearer <CRON_SECRET>`, or `?key=`).
 * Each organization gets its own report: in the dashboard, by email to its members, and by WhatsApp if set.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!secret || (req.headers.get("authorization") !== `Bearer ${secret}` && key !== secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const siteParam = url.searchParams.get("site");
  let q = db.from("sites").select("id, org_id, organizations(id, name, plan, notify_email, whatsapp_to)").eq("active", true);
  if (siteParam) q = q.eq("id", siteParam);
  const { data: sites, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sites run in parallel so a full weekly run fits in one serverless call.
  const perSite = await Promise.all(
    (sites ?? []).map(async (s) => {
      const org = s.organizations as unknown as Org;
      const lines: string[] = [];
      const audit = await runAudit(s.id).catch(() => null);
      if (audit) lines.push(`🛠️ ${audit.site} · ציון טכני ל-AI: ${audit.score}/100`);
      try {
        const summary = await runSite(s.id);
        const report = await getSiteReport(db, s.id);
        if (report?.hasData) lines.push(reportText(report));
        return { org, result: summary as object, lines };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "quota_exhausted") lines.push(`⚠️ ${audit?.site ?? ""}: המכסה החודשית נגמרה, בדיקת ה-AI דולגה השבוע.`);
        return { org, result: { site: s.id, error: msg }, lines };
      }
    }),
  );

  // One report per organization, sent only to that organization's own members / number.
  const byOrg = new Map<string, { org: Org; lines: string[] }>();
  for (const p of perSite) {
    const cur = byOrg.get(p.org.id) ?? { org: p.org, lines: [] };
    cur.lines.push(...p.lines);
    byOrg.set(p.org.id, cur);
  }

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const notifications = [];
  for (const { org, lines } of byOrg.values()) {
    if (!lines.length) continue;
    const link = base ? `${base}/dashboard?org=${org.id}` : undefined;
    let email: { sent: boolean; error?: string } = { sent: false, error: "disabled" };
    if (org.notify_email) {
      const { data: mems } = await db.from("memberships").select("user_id").eq("org_id", org.id);
      const emails = (
        await Promise.all((mems ?? []).map((m) => db.auth.admin.getUserById(m.user_id).then((r) => r.data.user?.email)))
      ).filter((e): e is string => !!e);
      email = await sendEmail(emails, `הדוח השבועי · ${org.name}`, reportEmailHtml(org.name, lines, link));
    }
    // The platform owner's fallback number (WHATSAPP_TO) is used only for the internal account.
    const waTo = org.whatsapp_to || (org.plan === "internal" ? process.env.WHATSAPP_TO : null);
    const whatsapp = waTo ? await sendWhatsApp(lines.join("\n\n") + (link ? `\n\n${link}` : ""), waTo) : { sent: false };
    notifications.push({ org: org.name, email, whatsapp });
  }

  return NextResponse.json({ ok: true, results: perSite.map((p) => p.result), notifications });
}
