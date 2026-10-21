// Asks each AI engine a question *with web search on*, the way real users get answers,
// and returns the answer text plus the source URLs the engine relied on.

export type EngineId = "openai" | "anthropic" | "gemini" | "perplexity";

export type EngineAnswer = {
  engine: EngineId;
  model: string;
  answer: string;
  citedUrls: string[];
};

const env = (k: string) => process.env[k]?.trim() || undefined;

const MODELS: Record<EngineId, string> = {
  openai: env("OPENAI_MODEL") ?? "gpt-4.1-mini",
  anthropic: env("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5",
  gemini: env("GEMINI_MODEL") ?? "gemini-2.5-flash",
  perplexity: env("PERPLEXITY_MODEL") ?? "sonar",
};

/** Engines whose API key is configured. Missing keys simply skip that engine. */
export function enabledEngines(): EngineId[] {
  const keys: Record<EngineId, string | undefined> = {
    openai: env("OPENAI_API_KEY"),
    anthropic: env("ANTHROPIC_API_KEY"),
    gemini: env("GEMINI_API_KEY"),
    perplexity: env("PERPLEXITY_API_KEY"),
  };
  return (Object.keys(keys) as EngineId[]).filter((k) => keys[k]);
}

const URL_RE = /https?:\/\/[^\s"'<>)\]\\]+/g;

/** Collect every URL anywhere in a response object — robust to provider format changes. */
function harvestUrls(obj: unknown): string[] {
  const found = JSON.stringify(obj ?? {}).match(URL_RE) ?? [];
  const clean = found
    .map((u) => u.replace(/[.,;:]+$/, ""))
    .filter((u) => !/googleapis\.com|openai\.com\/v1|anthropic\.com\/v1/.test(u));
  return [...new Set(clean)];
}

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message ?? res.statusText;
    throw new Error(`${res.status} ${msg}`);
  }
  return json as Record<string, unknown>;
}

const SYSTEM =
  "ענה כמו עוזר אישי שעונה למשתמש ישראלי. אם רלוונטי, המלץ על חברות, אתרים או שירותים ספציפיים בשמם.";

async function askOpenAI(q: string): Promise<EngineAnswer> {
  const model = MODELS.openai;
  const json = await postJson(
    "https://api.openai.com/v1/responses",
    { authorization: `Bearer ${env("OPENAI_API_KEY")}` },
    { model, instructions: SYSTEM, input: q, tools: [{ type: "web_search" }] },
  );
  const answer =
    (json.output_text as string) ??
    ((json.output as Array<{ type: string; content?: Array<{ text?: string }> }>) ?? [])
      .filter((o) => o.type === "message")
      .flatMap((o) => o.content ?? [])
      .map((c) => c.text ?? "")
      .join("\n");
  return { engine: "openai", model, answer, citedUrls: harvestUrls(json.output) };
}

async function askAnthropic(q: string): Promise<EngineAnswer> {
  const model = MODELS.anthropic;
  const json = await postJson(
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": env("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01" },
    {
      model,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content: q }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
    },
  );
  const blocks = (json.content as Array<{ type: string; text?: string }>) ?? [];
  const answer = blocks.filter((b) => b.type === "text").map((b) => b.text).join("");
  return { engine: "anthropic", model, answer, citedUrls: harvestUrls(blocks) };
}

async function askGemini(q: string): Promise<EngineAnswer> {
  const model = MODELS.gemini;
  const json = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    { "x-goog-api-key": env("GEMINI_API_KEY")! },
    {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: q }] }],
      tools: [{ google_search: {} }],
    },
  );
  type Cand = { content?: { parts?: Array<{ text?: string }> }; groundingMetadata?: unknown };
  const cand = ((json.candidates as Cand[]) ?? [])[0] ?? {};
  const answer = (cand.content?.parts ?? []).map((p) => p.text ?? "").join("");
  // Gemini sources are redirect links; their titles carry the real domain.
  const gm = cand.groundingMetadata as { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } | undefined;
  const sources = (gm?.groundingChunks ?? [])
    .map((c) => c.web?.title && /\./.test(c.web.title) ? `https://${c.web.title}` : c.web?.uri)
    .filter((u): u is string => !!u);
  return { engine: "gemini", model, answer, citedUrls: [...new Set(sources)] };
}

async function askPerplexity(q: string): Promise<EngineAnswer> {
  const model = MODELS.perplexity;
  const json = await postJson(
    "https://api.perplexity.ai/chat/completions",
    { authorization: `Bearer ${env("PERPLEXITY_API_KEY")}` },
    { model, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: q }] },
  );
  const choices = (json.choices as Array<{ message?: { content?: string } }>) ?? [];
  const answer = choices[0]?.message?.content ?? "";
  return {
    engine: "perplexity",
    model,
    answer,
    citedUrls: harvestUrls({ c: json.citations, s: json.search_results }),
  };
}

const ASK: Record<EngineId, (q: string) => Promise<EngineAnswer>> = {
  openai: askOpenAI,
  anthropic: askAnthropic,
  gemini: askGemini,
  perplexity: askPerplexity,
};

export function ask(engine: EngineId, question: string) {
  return ASK[engine](question);
}
