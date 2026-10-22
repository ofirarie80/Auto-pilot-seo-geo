import "server-only";

export type Draft = {
  title: string;
  slug: string;
  metaDescription: string;
  bodyMd: string;
  faq: { q: string; a: string }[];
};

export type ArticleInput = {
  brand: string;
  domain: string;
  about: string;                       // site title/description
  targetQuery: string;                 // the question customers ask the AI
  aiAnswer?: string | null;            // what the AI answers today (no mention of the brand)
  citedDomains?: string[];             // sources the AI relies on today
  competitors?: string[];
  previous?: { title: string; bodyMd: string } | null;
  feedback?: string | null;            // reviewer notes for a rewrite
};

const SYSTEM = `אתה כותב תוכן SEO ו-GEO בעברית לעסק ישראלי. המטרה: מאמר שעונה הכי טוב שיש על שאלה שלקוחות שואלים את גוגל ואת ChatGPT,
כך שמנועי חיפוש ומנועי AI יבינו, יצטטו וימליצו על העסק.

כללי כתיבה:
- עברית טבעית ובהירה, גוף שני רבים, בלי מליצות ובלי ביטויים שיווקיים ריקים.
- הפסקה הראשונה עונה ישירות על השאלה ב-2–3 משפטים (זה מה שמנועי AI מצטטים).
- מבנה: כותרות ## ו-###, פסקאות קצרות, רשימות או טבלה כשזה עוזר להשוות.
- להציג את העסק כאפשרות רלוונטית בצורה עניינית, לא כפרסומת. מותר להזכיר שיש גם חלופות.
- אסור להמציא עובדות: לא מחירים, לא סטטיסטיקות, לא שנות ותק, לא שמות לקוחות. כשצריך נתון שאינך יודע, כתוב [לבדיקה: מה צריך להשלים].
- בלי מילות מפתח דחוסות. אורך: 500–700 מילים בגוף המאמר (bodyMd). ממוקד ותמציתי, בלי מילוי.
- בסוף: סעיף "## שאלות נפוצות" עם 4–6 שאלות ותשובות קצרות (הן יופיעו גם ב-faq).

החזר JSON בלבד:
{"title": "כותרת H1 עד 60 תווים", "slug": "english-slug-with-hyphens", "metaDescription": "120–155 תווים",
 "bodyMd": "גוף המאמר ב-Markdown, בלי כותרת H1", "faq": [{"q": "...", "a": "..."}]}`;

function userPrompt(i: ArticleInput) {
  const lines = [
    `העסק: ${i.brand} (${i.domain})`,
    `על העסק (מהאתר): ${i.about || "לא ידוע"}`,
    `השאלה שהמאמר צריך לענות עליה: ${i.targetQuery}`,
  ];
  if (i.aiAnswer) lines.push(`מה ChatGPT עונה היום על השאלה (בלי להזכיר את העסק):\n${i.aiAnswer.slice(0, 1800)}`);
  if (i.citedDomains?.length) lines.push(`האתרים שה-AI מצטט היום: ${i.citedDomains.join(", ")}`);
  if (i.competitors?.length) lines.push(`מתחרים ידועים: ${i.competitors.join(", ")}`);
  if (i.previous) lines.push(`הגרסה הקודמת של המאמר:\nכותרת: ${i.previous.title}\n${i.previous.bodyMd.slice(0, 6000)}`);
  if (i.feedback) lines.push(`הערות העורך לשכתוב (חובה ליישם):\n${i.feedback}`);
  return lines.join("\n\n");
}

async function callModel(system: string, user: string): Promise<{ text: string; model: string }> {
  const anthropic = process.env.ANTHROPIC_API_KEY?.trim();
  const openai = process.env.OPENAI_API_KEY?.trim();
  if (anthropic) {
    const model = process.env.CONTENT_MODEL_ANTHROPIC ?? "claude-sonnet-5-5";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": anthropic, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 12000, system, messages: [{ role: "user", content: user }] }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`content_ai_${res.status}`);
    return { model, text: (json.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("") };
  }
  if (openai) {
    const model = process.env.CONTENT_MODEL ?? "gpt-4.1";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${openai}` },
      body: JSON.stringify({
        model, max_tokens: 12000, response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`content_ai_${res.status}`);
    return { model, text: json.choices?.[0]?.message?.content ?? "" };
  }
  throw new Error("no_ai_key");
}

function parseDraft(text: string): Draft {
  const d = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as Partial<Draft>;
  if (!d.title || !d.bodyMd) throw new Error("content_bad_output");
  return {
    title: String(d.title).trim(),
    slug: String(d.slug ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80),
    metaDescription: String(d.metaDescription ?? "").trim(),
    bodyMd: String(d.bodyMd).replace(/^#\s+.*\n+/, "").trim(),
    faq: (Array.isArray(d.faq) ? d.faq : [])
      .map((x) => ({ q: String(x?.q ?? "").trim(), a: String(x?.a ?? "").trim() }))
      .filter((x) => x.q && x.a)
      .slice(0, 8),
  };
}

const MIN_WORDS = 450;

const EXPAND = `הרחב את המאמר הבא לאורך של 550–700 מילים בגוף המאמר. שמור על הכותרת, המבנה והסגנון.
הוסף עומק אמיתי במקום שחסר: הסבר, דוגמה מעשית או שלבים. בלי חזרות ובלי מילוי ריק.
עדיין אסור להמציא עובדות, מחירים או נתונים: מה שחסר מסמנים [לבדיקה: ...]. החזר את אותו מבנה JSON בדיוק.`;

/** Writes (or rewrites) one article. Uses Claude when an Anthropic key exists, otherwise OpenAI. Expands drafts that come back too short. */
export async function generateArticle(input: ArticleInput): Promise<Draft & { model: string }> {
  const first = await callModel(SYSTEM, userPrompt(input));
  let draft = parseDraft(first.text);
  for (let i = 0; i < 1 && wordCount(draft.bodyMd) < MIN_WORDS; i++) {
    const more = await callModel(SYSTEM, `${EXPAND}\n\nהמאמר (${wordCount(draft.bodyMd)} מילים כרגע):\n${JSON.stringify(draft)}`);
    try {
      const next = parseDraft(more.text);
      if (wordCount(next.bodyMd) > wordCount(draft.bodyMd)) draft = next;
    } catch {
      break;
    }
  }
  return { ...draft, model: first.model };
}

/** Article + FAQPage JSON-LD for the page head. */
export function buildSchema(d: { title: string; metaDescription: string; faq: { q: string; a: string }[] }, brand: string, domain: string) {
  const graph: object[] = [
    { "@type": "Article", headline: d.title, description: d.metaDescription, inLanguage: "he-IL",
      publisher: { "@type": "Organization", name: brand, url: `https://${domain}/` } },
  ];
  if (d.faq.length) {
    graph.push({ "@type": "FAQPage", mainEntity: d.faq.map((f) => ({
      "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2);
}

export const wordCount = (md: string) => md.replace(/[#*_>`|\-[\]()]/g, " ").split(/\s+/).filter(Boolean).length;
