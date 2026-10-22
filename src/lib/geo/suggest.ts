import "server-only";

/** Reads a site's title/description and asks the AI for questions customers would ask an assistant. */
export async function suggestPrompts(domain: string, count: number): Promise<string[]> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || count < 1) return [];

  let about = "";
  try {
    const res = await fetch(`https://${domain}`, { headers: { "user-agent": "LionetPilot/1.0" }, signal: AbortSignal.timeout(10000) });
    const html = (await res.text()).slice(0, 200_000);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)/i)?.[1] ?? "";
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, " ") ?? "";
    about = [title, desc, h1].map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean).join(" | ").slice(0, 800);
  } catch {
    /* fall back to the domain only */
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write search questions for GEO (AI-answer visibility) tracking. Return JSON {\"prompts\": string[]}. " +
            "Each prompt is a question a potential customer in Israel would ask an AI assistant, in natural Hebrew, " +
            "where a business like the one described could be recommended. Mix: who/where to buy, comparisons, prices, how-to. " +
            "Never include the business's own name or domain.",
        },
        { role: "user", content: `Business: ${domain}\nAbout: ${about || "(no description)"}\nWrite ${count} prompts.` },
      ],
    }),
  });
  if (!res.ok) return [];
  try {
    const json = await res.json();
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
    return (Array.isArray(parsed.prompts) ? parsed.prompts : [])
      .map((p: unknown) => String(p).trim())
      .filter((p: string) => p.length > 5)
      .slice(0, count);
  } catch {
    return [];
  }
}
