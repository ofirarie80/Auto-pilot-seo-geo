import "server-only";
import { cleanDomain } from "@/lib/domain";

/** Normalizes a WordPress address to https://host (public hostnames only — the server fetches it). */
export function wpBase(raw: string): string | null {
  const host = cleanDomain(raw);
  return host ? `https://${host}` : null;
}

function auth(user: string, appPassword: string) {
  return "Basic " + Buffer.from(`${user}:${appPassword.replace(/\s+/g, "")}`).toString("base64");
}

async function wp<T>(base: string, path: string, user: string, pass: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${base}/wp-json/wp/v2${path}`, {
    method: init?.method ?? "GET",
    headers: { authorization: auth(user, pass), "content-type": "application/json", "user-agent": "LionetPilot/1.0" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20000),
    redirect: "follow",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = (json as { code?: string }).code ?? String(res.status);
    throw new Error(`wp_${code}`);
  }
  return json as T;
}

/** Verifies the credentials and that the user may publish posts. */
export async function testConnection(base: string, user: string, pass: string) {
  const me = await wp<{ name: string; capabilities?: Record<string, boolean> }>(base, "/users/me?context=edit", user, pass);
  if (me.capabilities && !me.capabilities.publish_posts) throw new Error("wp_no_publish_permission");
  return { name: me.name };
}

export type PublishMode = "draft" | "publish" | "future";

/** Creates or updates the post. `date` (ISO, site-local or UTC) is used for scheduling. */
export async function upsertPost(
  base: string, user: string, pass: string,
  post: { id?: number | null; title: string; html: string; excerpt: string; slug: string; status: PublishMode; dateGmt?: string },
) {
  const body: Record<string, unknown> = {
    title: post.title, content: post.html, excerpt: post.excerpt, slug: post.slug || undefined, status: post.status,
  };
  if (post.status === "future" && post.dateGmt) body.date_gmt = post.dateGmt;
  const path = post.id ? `/posts/${post.id}` : "/posts";
  return wp<{ id: number; link: string; status: string }>(base, path, user, pass, { method: "POST", body });
}

export function wpErrorMessage(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  if (m.includes("rest_cannot") || m.includes("401") || m.includes("incorrect_password") || m.includes("invalid_username"))
    return "WordPress דחה את פרטי ההתחברות. בדקו את שם המשתמש ואת סיסמת האפליקציה.";
  if (m.includes("no_publish_permission")) return "למשתמש הזה אין הרשאה לפרסם פוסטים ב-WordPress.";
  if (m.includes("rest_no_route") || m.includes("404")) return "לא נמצא REST API של WordPress בכתובת הזו.";
  if (m.includes("timeout") || m.includes("fetch failed")) return "האתר לא ענה. בדקו את הכתובת או חסימה של חומת אש.";
  return "הפעולה מול WordPress נכשלה.";
}
