import "server-only";

/** Title + meta description + first H1 of a site's home page, for AI context. */
export async function siteAbout(domain: string): Promise<string> {
  try {
    const res = await fetch(`https://${domain}`, { headers: { "user-agent": "LionetPilot/1.0" }, signal: AbortSignal.timeout(10000) });
    const html = (await res.text()).slice(0, 200_000);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)/i)?.[1] ?? "";
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, " ") ?? "";
    return [title, desc, h1].map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean).join(" | ").slice(0, 800);
  } catch {
    return "";
  }
}
