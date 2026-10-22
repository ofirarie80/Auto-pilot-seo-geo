import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseUser } from "@/lib/supabase/server";

/**
 * Lands here from confirmation / password-reset emails and Google sign-in.
 * If the email was opened in a different browser the code exchange fails, but Supabase has already
 * confirmed the address, so we send the user to sign in instead of showing a dead-end error.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const nextParam = url.searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";
  const db = await supabaseUser();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await db.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await db.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };

  if (!error) return NextResponse.redirect(new URL(next, url.origin));
  const fallback =
    next === "/onboarding" ? "/login?confirmed=1"
      : next === "/reset-password" ? "/login?error=link"
        : "/login?error=link";
  return NextResponse.redirect(new URL(fallback, url.origin));
}
