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
  const label = status === "approved" ? "אושר. כשנחבר את WordPress הוא יוכל להתפרסם בלחיצה." : status === "rejected" ? "נדחה." : "הוחזר לטיוטה.";
  redirect(itemUrl(id, org, error ? "השינוי נכשל." : label));
}

export async function deleteArticle(f: FormData) {
  const db = await supabaseUser();
  const { data: item } = await db.from("content_items").select("site_id").eq("id", str(f, "id")).maybeSingle();
  await db.from("content_items").delete().eq("id", str(f, "id"));
  redirect(listUrl(str(f, "org_id"), item?.site_id ?? "", "המאמר נמחק."));
}
