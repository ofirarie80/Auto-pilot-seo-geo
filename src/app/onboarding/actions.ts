"use server";

import { redirect } from "next/navigation";
import { supabaseUser } from "@/lib/supabase/server";
import { suggestPrompts } from "@/lib/geo/suggest";
import { runAudit } from "@/lib/audit/run";
import { planLimitMessage } from "@/lib/plans";
import { cleanDomain } from "@/lib/domain";

export type OnboardState = { error?: string };

export async function createWorkspace(_: OnboardState, f: FormData): Promise<OnboardState> {
  const orgName = String(f.get("org") ?? "").trim();
  const siteName = String(f.get("site") ?? "").trim();
  const domain = cleanDomain(String(f.get("domain") ?? ""));
  if (!orgName || !siteName) return { error: "צריך למלא שם עסק ושם אתר." };
  if (!domain) return { error: "כתובת האתר לא תקינה. כתבו רק את הדומיין, למשל example.co.il" };

  const db = await supabaseUser();
  const { data: orgId, error: orgErr } = await db.rpc("create_organization", { org_name: orgName });
  if (orgErr || !orgId) {
    return { error: orgErr?.message.includes("too_many") ? "אפשר לפתוח עד 3 חשבונות." : "לא הצלחנו ליצור את החשבון. נסו שוב." };
  }

  const { data: site, error: siteErr } = await db
    .from("sites")
    .insert({ org_id: orgId, name: siteName, domain, brand_terms: [siteName] })
    .select("id")
    .single();
  if (siteErr || !site) return { error: planLimitMessage(siteErr?.message) ?? "לא הצלחנו להוסיף את האתר." };

  const { data: plan } = await db.from("plans").select("max_prompts_per_site").eq("id", "free").single();
  const [prompts] = await Promise.all([
    suggestPrompts(domain, Math.min(plan?.max_prompts_per_site ?? 5, 10)),
    runAudit(site.id).catch(() => null),
  ]);
  if (prompts.length) {
    await db.from("prompts").insert(prompts.map((text) => ({ site_id: site.id, text, topic: "הצעה אוטומטית" })));
  }
  redirect(`/dashboard?org=${orgId}&site=${site.id}&welcome=1`);
}
