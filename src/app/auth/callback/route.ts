import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseUser } from "@/lib/supabase/server";

/** Lands here from the confirmation email (PKCE code, or token_hash for custom templates). */
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

  return NextResponse.redirect(new URL(error ? "/login?error=link" : next, url.origin));
}
