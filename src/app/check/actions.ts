"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { auditSite, type Check } from "@/lib/audit/geo-audit";
import { sendWhatsApp } from "@/lib/notify/whatsapp";

export type CheckState =
  | { stage: "idle" }
  | { stage: "error"; message: string }
  | { stage: "result"; id: string | null; domain: string; score: number; checks: Check[] }
  | { stage: "lead-saved"; domain: string };

/** Accept only a plain public hostname: no IPs, no localhost, no ports or paths. */
function cleanDomain(raw: string): string | null {
  const host = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  if (!/^(?=.{4,253}$)([a-z0-9א-ת-]{1,63}\.)+[a-zא-ת]{2,63}$/.test(host)) return null;
  if (/^\d+(\.\d+){3}$/.test(host) || host.endsWith(".local") || host.endsWith(".internal")) return null;
  return host;
}

export async function runFreeCheck(_: CheckState, form: FormData): Promise<CheckState> {
  const domain = cleanDomain(String(form.get("domain") ?? ""));
  if (!domain) return { stage: "error", message: "כתובת לא תקינה. כתבו רק את הדומיין, למשל example.co.il" };
  const result = await auditSite(domain);
  if (!result.checks.find((c) => c.id === "home" && c.status === "pass")) {
    return { stage: "error", message: `לא הצלחנו לטעון את ${domain}. ודאו שהאתר פתוח ב-HTTPS ונסו שוב.` };
  }
  let id: string | null = null;
  try {
    const { data } = await supabaseAdmin()
      .from("free_checks").insert({ domain, score: result.score, checks: result.checks }).select("id").single();
    id = data?.id ?? null;
  } catch {
    /* saving is best-effort; the visitor still gets the result */
  }
  return { stage: "result", id, domain, score: result.score, checks: result.checks };
}

export async function saveLead(_: CheckState, form: FormData): Promise<CheckState> {
  const id = String(form.get("id") ?? "");
  const domain = String(form.get("domain") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const phone = String(form.get("phone") ?? "").replace(/[^\d+]/g, "").slice(0, 20);
  if (phone.replace(/\D/g, "").length < 9) return { stage: "error", message: "מספר הטלפון לא נראה תקין." };
  try {
    if (id) await supabaseAdmin().from("free_checks").update({ name, phone, wants_full_report: true }).eq("id", id);
    else await supabaseAdmin().from("free_checks").insert({ domain, name, phone, wants_full_report: true });
  } catch {
    return { stage: "error", message: "משהו השתבש בשמירה. נסו שוב בעוד רגע." };
  }
  await sendWhatsApp(`🔔 ליד חדש מבדיקת AI\n${name || "ללא שם"} · ${phone}\nאתר: ${domain}`);
  return { stage: "lead-saved", domain };
}
