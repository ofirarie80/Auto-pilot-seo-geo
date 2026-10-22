"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateArticle, buildSchema, wordCount } from "@/lib/content/generate";
import { contentOpportunities } from "@/lib/content/opportunities";
import { siteAbout } from "@/lib/site-about";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const listUrl = (org: string, site: string, msg?: string) =>
  `/dashboard/content?org=${org}&site=${site}${msg ? `&msg=${encodeURIComponent(msg)}` : ""}`;
const itemUrl = (id: string, org: string, msg?: string) =>
  `/dashboard/content/${id}?org=${org}${msg ? `&msg=${encodeURIComponent(msg)}` : ""}`;

const AI_ERR = "כתיבת המאמר נכשלה. נסו שוב בעוד דקה.";

/** Loads the site through the user's client (proves membership) and checks the monthly article quota. */
async function siteForUser(siteId: string) {
  const db = await supabaseUser();
  const { data: { user } } = await db.auth.getUser();
  const { data: site } = await db
    .from("sites").select("id, name, domain, brand_terms, org_id, organizations(plans(monthly_articles))").eq("id", siteId).maybeSingle();
  if (!user || !site) return null;
  const limit = (site.organizations as unknown as { plans: { monthly_articles: number } | null } | null)?.plans?.monthly_articles ?? 0;
  const { data: usage } = await db.from("org_content_usage").select("articles_this_month").eq("org_id", site.org_id).maybeSingle();
  return { db, user, site, remaining: limit - Number(usage?.articles_this_month ?? 0) };
}

export async function createArticle(f: FormData) {
  const org = str(f, "org_id");
  const siteId = str(f, "site_id");
  const ctx = await siteForUser(siteId);
  if (!ctx) redirect(listUrl(org, siteId, "האתר לא נמצא בחשבון שלכם."));
  if (ctx.remaining <= 0) redirect(listUrl(org, siteId, "נגמרה מכסת המאמרים החודשית במסלול."));

  const promptId = str(f, "prompt_id") || null;
  const manualQuery = str(f, "query");
  let targetQuery = manualQuery;
  let opp = null;
  if (promptId) {
    opp = (await contentOpportunities(ctx.db, siteId)).find((o) => o.promptId === promptId) ?? null;
    const { data: p } = await ctx.db.from("prompts").select("text").eq("id", promptId).eq("site_id", siteId).maybeSingle();
    if (!p) redirect(listUrl(org, siteId, "השאלה לא נמצאה."));
    targetQuery = p.text;
  }
  if (targetQuery.length < 5) redirect(listUrl(org, siteId, "צריך נושא או שאלה למאמר."));

  const { data: comps } = await ctx.db.from("competitors").select("name").eq("site_id", siteId);
  let id = "";
  try {
    const d = await generateArticle({
      brand: ctx.site.name, domain: ctx.site.domain, about: await siteAbout(ctx.site.domain), targetQuery,
      aiAnswer: opp?.sampleAnswer, citedDomains: opp?.citedDomains,
      competitors: [...new Set([...(opp?.competitors ?? []), ...(comps ?? []).map((c) => c.name)])],
    });
    const { data, error } = await supabaseAdmin().from("content_items").insert({
      site_id: siteId, source: promptId ? "geo" : "manual", prompt_id: promptId, target_query: targetQuery,
      title: d.title, slug: d.slug, meta_description: d.metaDescription, body_md: d.bodyMd, faq: d.faq,
      schema_jsonld: buildSchema(d, ctx.site.name, ctx.site.domain), word_count: wordCount(d.bodyMd),
      model: d.model, created_by: ctx.user.id,
    }).select("id").single();
    if (error || !data) throw new Error("save");
    id = data.id;
  } catch {
    redirect(listUrl(org, siteId, AI_ERR));
  }
  redirect(itemUrl(id, org, "הטיוטה מוכנה. עברו עליה ואשרו או בקשו שכתוב."));
}

export async function rewriteArticle(f: FormData) {
  const id = str(f, "id");
  const org = str(f, "org_id");
  const feedback = str(f, "feedback");
  const db = await supabaseUser();
  const { data: item } = await db.from("content_items").select("id, site_id, title, body_md, target_query, updated_at").eq("id", id).maybeSingle();
  if (!item) redirect(itemUrl(id, org, "המאמר לא נמצא."));
  if (Date.now() - new Date(item.updated_at).getTime() < 30_000) redirect(itemUrl(id, org, "רגע, השכתוב הקודם רק הסתיים."));
  const ctx = await siteForUser(item.site_id);
  if (!ctx) redirect(itemUrl(id, org, "אין הרשאה."));
  try {
    const d = await generateArticle({
      brand: ctx.site.name, domain: ctx.site.domain, about: await siteAbout(ctx.site.domain), targetQuery: item.target_query,
      previous: { title: item.title, bodyMd: item.body_md }, feedback: feedback || "שפרו את המאמר: יותר ברור, יותר ממוקד בשאלה.",
    });
    // Content columns go through the user's client; schema/word_count/model are server-only columns.
    await db.from("content_items").update({
      title: d.title, slug: d.slug, meta_description: d.metaDescription, body_md: d.bodyMd, faq: d.faq, feedback, status: "draft",
    }).eq("id", id);
    await supabaseAdmin().from("content_items").update({
      schema_jsonld: buildSchema(d, ctx.site.name, ctx.site.domain), word_count: wordCount(d.bodyMd), model: d.model,
    }).eq("id", id);
  } catch {
    redirect(itemUrl(id, org, AI_ERR));
  }
  redirect(itemUrl(id, org, "המאמר שוכתב לפי ההערות."));
}

export async function saveArticle(f: FormData) {
  const id = str(f, "id");
  const org = str(f, "org_id");
  const db = await supabaseUser();
  const bodyMd = String(f.get("body_md") ?? "");
  const { data: item, error } = await db.from("content_items").update({
    title: str(f, "title"), meta_description: str(f, "meta_description"),
    slug: str(f, "slug").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, ""), body_md: bodyMd,
  }).eq("id", id).select("site_id, title, meta_description, faq").maybeSingle();
  if (error || !item) redirect(itemUrl(id, org, "השמירה נכשלה."));
  const { data: site } = await db.from("sites").select("name, domain").eq("id", item.site_id).single();
  await supabaseAdmin().from("content_items").update({
    word_count: wordCount(bodyMd),
    schema_jsonld: buildSchema({ title: item.title, metaDescription: item.meta_description ?? "", faq: item.faq ?? [] }, site?.name ?? "", site?.domain ?? ""),
  }).eq("id", id);
  revalidatePath(`/dashboard/content/${id}`);
  redirect(itemUrl(id, org, "נשמר."));
}

export async function setArticleStatus(f: FormData) {
  const id = str(f, "id");
  const org = str(f, "org_id");
  const status = str(f, "status");
  if (!["draft", "approved", "rejected"].includes(status)) redirect(itemUrl(id, org));
  const db = await supabaseUser();
  const { error } = await db.from("content_items").update({ status }).eq("id", id);
  const label = status === "approved" ? "אושר. עכשיו אפשר לשלוח ל-WordPress, לפרסם או לתזמן." : status === "rejected" ? "נדחה." : "הוחזר לטיוטה.";
  redirect(itemUrl(id, org, error ? "השינוי נכשל." : label));
}

export async function deleteArticle(f: FormData) {
  const db = await supabaseUser();
  const { data: item } = await db.from("content_items").select("site_id").eq("id", str(f, "id")).maybeSingle();
  await db.from("content_items").delete().eq("id", str(f, "id"));
  redirect(listUrl(str(f, "org_id"), item?.site_id ?? "", "המאמר נמחק."));
}

/** "2026-10-25T09:00" in Israel time → UTC ISO string. */
function israelLocalToUtc(local: string): string | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const tzPart = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", timeZoneName: "longOffset" })
    .formatToParts(new Date(asUtc)).find((p) => p.type === "timeZoneName")?.value ?? "GMT+02:00";
  const off = tzPart.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  const minutes = off ? (off[1] === "-" ? -1 : 1) * (+off[2] * 60 + +(off[3] ?? 0)) : 120;
  return new Date(asUtc - minutes * 60_000).toISOString();
}

export async function publishToWordPress(f: FormData) {
  const id = str(f, "id");
  const org = str(f, "org_id");
  const mode = str(f, "mode") as "draft" | "publish" | "future";
  if (!["draft", "publish", "future"].includes(mode)) redirect(itemUrl(id, org));

  // Access through the user's client: the article must belong to their org and be approved.
  const db = await supabaseUser();
  const { data: item } = await db.from("content_items")
    .select("id, site_id, status, title, slug, meta_description, body_md, schema_jsonld, wp_post_id").eq("id", id).maybeSingle();
  if (!item) redirect(itemUrl(id, org, "המאמר לא נמצא."));
  if (item.status !== "approved" && item.status !== "published") redirect(itemUrl(id, org, "צריך לאשר את המאמר לפני שליחה ל-WordPress."));

  let dateGmt: string | undefined;
  if (mode === "future") {
    dateGmt = israelLocalToUtc(str(f, "when")) ?? undefined;
    if (!dateGmt || new Date(dateGmt).getTime() < Date.now() + 5 * 60_000) redirect(itemUrl(id, org, "בחרו תאריך ושעה עתידיים (לפחות 5 דקות קדימה)."));
  }

  const admin = supabaseAdmin();
  const { data: conn } = await admin.from("wp_connections").select("wp_url, username, app_password_enc").eq("site_id", item.site_id).maybeSingle();
  if (!conn) redirect(itemUrl(id, org, "עוד לא חיברתם WordPress לאתר הזה. מחברים בהגדרות."));

  const { decrypt } = await import("@/lib/crypto");
  const { upsertPost, wpErrorMessage } = await import("@/lib/wordpress");
  const { renderMarkdown } = await import("@/lib/content/render");
  const html = renderMarkdown(item.body_md) + (item.schema_jsonld ? `\n<script type="application/ld+json">${item.schema_jsonld}</script>` : "");

  let msg = "";
  try {
    const post = await upsertPost(conn.wp_url, conn.username, decrypt(conn.app_password_enc), {
      id: item.wp_post_id, title: item.title, html, excerpt: item.meta_description ?? "", slug: item.slug ?? "", status: mode, dateGmt,
    });
    await admin.from("content_items").update({
      wp_post_id: post.id, wp_link: post.link, wp_status: post.status,
      status: mode === "draft" ? "approved" : "published",
      scheduled_for: mode === "future" ? dateGmt : null,
      published_at: mode === "publish" ? new Date().toISOString() : null,
    }).eq("id", id);
    msg = mode === "draft" ? "נשלח ל-WordPress כטיוטה. אפשר להשלים שם תמונה וקטגוריה."
      : mode === "future" ? `תוזמן לפרסום ב-${new Date(dateGmt!).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}.`
      : "פורסם באתר.";
  } catch (e) {
    msg = wpErrorMessage(e);
  }
  redirect(itemUrl(id, org, msg));
}
