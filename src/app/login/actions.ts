"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseUser } from "@/lib/supabase/server";

export type AuthState = { error?: string; info?: string };

const MESSAGES: Record<string, string> = {
  "Invalid login credentials": "המייל או הסיסמה לא נכונים.",
  "Email not confirmed": "צריך לאשר את המייל קודם. חפשו את הודעת האישור בתיבה (גם בספאם).",
  "User already registered": "כבר יש חשבון עם המייל הזה. נסו להתחבר.",
};
const he = (m?: string) => (m && MESSAGES[m]) || m || "משהו השתבש. נסו שוב.";

async function origin() {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

function safeNext(v: FormDataEntryValue | null) {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
}

export async function signIn(_: AuthState, f: FormData): Promise<AuthState> {
  const db = await supabaseUser();
  const { error } = await db.auth.signInWithPassword({
    email: String(f.get("email") ?? "").trim(),
    password: String(f.get("password") ?? ""),
  });
  if (error) return { error: he(error.message) };
  redirect(safeNext(f.get("next")));
}

export async function signUp(_: AuthState, f: FormData): Promise<AuthState> {
  const password = String(f.get("password") ?? "");
  if (password.length < 8) return { error: "הסיסמה צריכה להיות לפחות 8 תווים." };
  const db = await supabaseUser();
  const { data, error } = await db.auth.signUp({
    email: String(f.get("email") ?? "").trim(),
    password,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: he(error.message) };
  if (data.session) redirect("/onboarding");
  return { info: "שלחנו לכם מייל לאישור החשבון. אחרי האישור תועברו להקמת החשבון." };
}

export async function signOut() {
  const db = await supabaseUser();
  await db.auth.signOut();
  redirect("/login");
}
