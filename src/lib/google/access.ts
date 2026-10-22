import "server-only";
import { supabaseUser } from "@/lib/supabase/server";

/** The signed-in user may manage this org's Google connection (owner/admin, and the plan includes Google data). */
export async function canManageGoogle(orgId: string) {
  const db = await supabaseUser();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false as const, reason: "login" };
  const { data: mem } = await db
    .from("memberships").select("role, organizations(plans(gsc))").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
  if (!mem || !["owner", "admin"].includes(mem.role)) return { ok: false as const, reason: "forbidden" };
  const gsc = (mem.organizations as unknown as { plans: { gsc: boolean } | null } | null)?.plans?.gsc;
  if (!gsc) return { ok: false as const, reason: "plan" };
  return { ok: true as const, userId: user.id };
}
