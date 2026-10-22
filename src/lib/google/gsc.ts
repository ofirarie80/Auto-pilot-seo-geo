import "server-only";

const API = "https://www.googleapis.com/webmasters/v3";

async function call<T>(token: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`gsc_${res.status}_${json?.error?.message ?? ""}`.slice(0, 200));
  return json as T;
}

/** Properties ("sc-domain:example.com" or "https://example.com/") the account can read. */
export async function listProperties(token: string): Promise<string[]> {
  const r = await call<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>(token, "/sites");
  return (r.siteEntry ?? []).filter((s) => s.permissionLevel !== "siteUnverifiedUser").map((s) => s.siteUrl);
}

/** Best property for a domain: the domain property first, then https/www variants. */
export function matchProperty(domain: string, props: string[]): string | null {
  const d = domain.replace(/^www\./, "").toLowerCase();
  const prefs = [`sc-domain:${d}`, `https://${d}/`, `https://www.${d}/`, `http://${d}/`, `http://www.${d}/`];
  return prefs.find((p) => props.includes(p)) ?? null;
}

export type Row = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

export async function query(
  token: string, property: string, startDate: string, endDate: string, dimensions: string[], rowLimit = 250,
): Promise<Row[]> {
  const r = await call<{ rows?: Row[] }>(token, `/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
    startDate, endDate, dimensions, rowLimit, dataState: "final",
  });
  return r.rows ?? [];
}
