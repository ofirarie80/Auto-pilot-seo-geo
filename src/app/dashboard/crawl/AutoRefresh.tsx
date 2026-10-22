"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { nudgeCrawl } from "./actions";

/** While a crawl runs: refresh the page every few seconds and restart the crawl if it stalled. */
export default function AutoRefresh({ siteId, crawlId }: { siteId: string; crawlId: string }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      router.refresh();
      if (++n % 6 === 0) nudgeCrawl(siteId, crawlId).catch(() => undefined);
    }, 4000);
    return () => clearInterval(t);
  }, [router, siteId, crawlId]);
  return null;
}
