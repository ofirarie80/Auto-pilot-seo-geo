// Turns a raw AI answer into GEO signals: was the brand named, was its site cited,
// how early was it named, and which competitors showed up.

export type Brand = { name: string; domain?: string | null; terms: string[] };

export type Analysis = {
  brandMentioned: boolean;
  brandCited: boolean;
  mentionPosition: number | null;
  competitorsMentioned: string[];
};

const norm = (s: string) => s.toLowerCase().replace(/[֑-ׇ]/g, ""); // drop Hebrew niqqud

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function sameSite(url: string, domain: string) {
  const h = hostOf(url);
  const d = domain.replace(/^www\./, "").toLowerCase();
  return !!h && (h === d || h.endsWith("." + d));
}

/** Index of the first occurrence of any of the brand's names (or domain) in the answer, or -1. */
function firstIndex(text: string, b: Brand): number {
  const t = norm(text);
  const needles = [...b.terms, b.name, b.domain ?? ""].filter(Boolean).map(norm);
  const hits = needles.map((n) => t.indexOf(n)).filter((i) => i >= 0);
  return hits.length ? Math.min(...hits) : -1;
}

export function analyze(answer: string, citedUrls: string[], site: Brand, competitors: Brand[]): Analysis {
  const siteIdx = firstIndex(answer, site);
  const brandCited = !!site.domain && citedUrls.some((u) => sameSite(u, site.domain!));

  const compHits = competitors
    .map((c) => ({ c, i: firstIndex(answer, c), cited: !!c.domain && citedUrls.some((u) => sameSite(u, c.domain!)) }))
    .filter((x) => x.i >= 0 || x.cited);

  let mentionPosition: number | null = null;
  if (siteIdx >= 0) {
    // Rank by order of first appearance among all tracked brands.
    mentionPosition = 1 + compHits.filter((x) => x.i >= 0 && x.i < siteIdx).length;
  }

  return {
    brandMentioned: siteIdx >= 0,
    brandCited,
    mentionPosition,
    competitorsMentioned: compHits.map((x) => x.c.name),
  };
}
