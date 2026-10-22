import "server-only";

const SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "openid",
  "email",
];

export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function redirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api/google/callback`;
}

export function authUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // always return a refresh token
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...body,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`google_token_${json.error ?? res.status}`);
  return json as { access_token: string; refresh_token?: string; id_token?: string; scope?: string };
}

export const exchangeCode = (code: string) =>
  tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });

export const refreshAccess = (refreshToken: string) =>
  tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" }).then((t) => t.access_token);

/** Email from the id_token payload (already verified by Google's token endpoint over TLS). */
export function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    return JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString()).email ?? null;
  } catch {
    return null;
  }
}
