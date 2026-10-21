"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

// These actions live under /dashboard, which the middleware password-protects.

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const terms = (s: string) => s.split(/[,،\n]/).map((t) => t.trim()).filter(Boolean);
const done = () => revalidatePath("/dashboard/settings");

export async function addPrompt(f: FormData) {
  const site_id = str(f, "site_id");
  const text = str(f, "text");
  if (!site_id || text.length < 5) return;
  await supabaseAdmin().from("prompts").insert({ site_id, text, topic: str(f, "topic") || null });
  done();
}

export async function togglePrompt(f: FormData) {
  await supabaseAdmin().from("prompts").update({ active: str(f, "active") !== "true" }).eq("id", str(f, "id"));
  done();
}

export async function deletePrompt(f: FormData) {
  await supabaseAdmin().from("prompts").delete().eq("id", str(f, "id"));
  done();
}

export async function addCompetitor(f: FormData) {
  const site_id = str(f, "site_id");
  const name = str(f, "name");
  if (!site_id || !name) return;
  const domain = str(f, "domain").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "") || null;
  await supabaseAdmin().from("competitors").insert({ site_id, name, domain, brand_terms: terms(str(f, "terms")) });
  done();
}

export async function deleteCompetitor(f: FormData) {
  await supabaseAdmin().from("competitors").delete().eq("id", str(f, "id"));
  done();
}

export async function updateBrandTerms(f: FormData) {
  await supabaseAdmin().from("sites").update({ brand_terms: terms(str(f, "terms")) }).eq("id", str(f, "id"));
  done();
}
