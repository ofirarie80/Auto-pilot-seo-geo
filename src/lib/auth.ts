import "server-only";
import { redirect } from "next/navigation";
import { supabaseUser } from "@/lib/supabase/server";
import type { Plan } from "@/lib/plans";

export type OrgContext = {
  db: Awaited<ReturnType<typeof supabaseUser>>;
  user: { id: string; email: string | null };
  orgs: { id: string; name: string }[];
  org: { id: string; name: string; plan: string; notify_email: boolean; whatsapp_to: string | null; role: string };
  plan: Plan;
  usedThisMonth: number;
};

/** Signed-in user + their current organization (via RLS). Redirects to /login or /onboarding when needed. */
export async function getOrgContext(orgId?: string | null): Promise<OrgContext> {
  const db = await supabaseUser();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");

  const { data: mems } = await db
    .from("memberships")
    .select("role, organizations(id, name, plan, notify_email, whatsapp_to)")
    .eq("user_id", user.id);
  type Org = { id: string; name: string; plan: string; notify_email: boolean; whatsapp_to: string | null };
  const list = (mems ?? [])
    .map((m) => ({ role: m.role as string, org: m.organizations as unknown as Org | null }))
    .filter((m): m is { role: string; org: Org } => !!m.org);
  if (!list.length) redirect("/onboarding");

  const cur = list.find((m) => m.org.id === orgId) ?? list[0];
  const [{ data: plan }, { data: usage }] = await Promise.all([
    db.from("plans").select("*").eq("id", cur.org.plan).single(),
    db.from("org_usage").select("answers_this_month").eq("org_id", cur.org.id).maybeSingle(),
  ]);

  return {
    db,
    user: { id: user.id, email: user.email ?? null },
    orgs: list.map((m) => ({ id: m.org.id, name: m.org.name })),
    org: { ...cur.org, role: cur.role },
    plan: plan as Plan,
    usedThisMonth: Number(usage?.answers_this_month ?? 0),
  };
}
