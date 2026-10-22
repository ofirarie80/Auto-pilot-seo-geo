"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseUser } from "@/lib/supabase/server";

export type AuthState = { error?: string; info?: string; email?: string };

const MESSAGES: [RegExp, string][] = [
  [/Invalid login credentials/i, "המייל או הסיסמה לא נכונים."],
  [/Email not confirmed/i, "צריך לאשר את המייל קודם. חפשו את הודעת האישור בתיבה (גם בספאם)."],
  [/already registered|already been registered/i, "כבר יש חשבון עם המייל הזה. נסו להתחבר, או לאפס סיסמה."],
  [/rate limit|too many|seconds/i, "יותר מדי ניסיונות. חכו דקה ונסו שוב."],
  [/Password should be|weak/i, "הסיסמה חלשה מדי. השתמשו לפחות ב-8 תווים, עם אותיות ומספרים."],
  [/same password|different from the old/i, "הסיסמה החדשה צריכה להיות שונה מהקודמת."],
];
const he = (m?: string) => MESSAGES.find(([re]) => m && re.test(m))?.[1] ?? "משהו השתבש. נסו שוב.";

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

const email = (f: FormData) => String(f.get("email") ?? "").trim().toLowerCase();

export async function signIn(_: AuthState, f: FormData): Promise<AuthState> {
  const db = await supabaseUser();
  const { error } = await db.auth.signInWithPassword({ email: email(f), password: String(f.get("password") ?? "") });
  if (error) return { error: he(error.message), email: email(f) };
  redirect(safeNext(f.get("next")));
}

export async function signUp(_: AuthState, f: FormData): Promise<AuthState> {
  const password = String(f.get("password") ?? "");
  if (password.length < 8) return { error: "הסיסמה צריכה להיות לפחות 8 תווים.", email: email(f) };
  if (password !== String(f.get("confirm") ?? "")) return { error: "הסיסמאות לא תואמות.", email: email(f) };
  if (f.get("terms") !== "on") return { error: "צריך לאשר את תנאי השימוש ומדיניות הפרטיות.", email: email(f) };
  const db = await supabaseUser();
  const { data, error } = await db.auth.signUp({
    email: email(f),
    password,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: he(error.message), email: email(f) };
  if (data.session) redirect("/onboarding");
  return { info: "שלחנו מייל לאישור החשבון. לוחצים על הקישור שבו וממשיכים להקמת החשבון.", email: email(f) };
}

export async function resendConfirmation(_: AuthState, f: FormData): Promise<AuthState> {
  const db = await supabaseUser();
  const { error } = await db.auth.resend({
    type: "signup",
    email: email(f),
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: he(error.message), email: email(f) };
  return { info: "שלחנו שוב את מייל האישור.", email: email(f) };
}

/** Always answers the same way, so the form can't be used to discover who has an account. */
export async function requestReset(_: AuthState, f: FormData): Promise<AuthState> {
  const db = await supabaseUser();
  const { error } = await db.auth.resetPasswordForEmail(email(f), {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  if (error && /rate limit|seconds/i.test(error.message)) return { error: he(error.message), email: email(f) };
  return { info: "אם יש חשבון עם המייל הזה, שלחנו אליו קישור לבחירת סיסמה חדשה.", email: email(f) };
}

export async function updatePassword(_: AuthState, f: FormData): Promise<AuthState> {
  const password = String(f.get("password") ?? "");
  if (password.length < 8) return { error: "הסיסמה צריכה להיות לפחות 8 תווים." };
  if (password !== String(f.get("confirm") ?? "")) return { error: "הסיסמאות לא תואמות." };
  const db = await supabaseUser();
  const { error } = await db.auth.updateUser({ password });
  if (error) return { error: he(error.message) };
  redirect("/dashboard?msg=" + encodeURIComponent("הסיסמה עודכנה."));
}

export async function signInWithGoogle(f: FormData) {
  const db = await supabaseUser();
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(safeNext(f.get("next")))}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function signOut() {
  const db = await supabaseUser();
  await db.auth.signOut();
  redirect("/login");
}
