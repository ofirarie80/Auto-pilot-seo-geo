import { NextResponse, after } from "next/server";
import { stepCrawl, chainStep } from "@/lib/crawl/crawl";

export const runtime = "nodejs";
export const maxDuration = 60;

/** One step of a site crawl; chains itself until the crawl is done. Protected by CRON_SECRET. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const crawl = url.searchParams.get("crawl");
  if (!crawl) return NextResponse.json({ error: "missing crawl" }, { status: 400 });
  const more = await stepCrawl(crawl);
  if (more) after(() => chainStep(url.origin, crawl));
  return NextResponse.json({ ok: true, more });
}
