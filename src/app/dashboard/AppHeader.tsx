import Link from "next/link";
import type { OrgContext } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

export default function AppHeader({
  ctx,
  sites,
  currentSite,
  base = "/dashboard",
}: {
  ctx: OrgContext;
  sites: { id: string; name: string }[];
  currentSite?: string;
  base?: string;
}) {
  const used = ctx.usedThisMonth;
  const quota = ctx.plan.monthly_answers;
  const showQuota = quota < 100000;
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-[#13212E] px-4 py-3.5 text-white sm:px-8">
      <div className="flex items-baseline gap-2.5">
        <Link href={`/dashboard?org=${ctx.org.id}`} className="text-xl font-semibold text-white">Lionet Pilot</Link>
        <span className="text-xs text-[#9FB3C3]">{ctx.org.name} · מסלול {ctx.plan.name}</span>
      </div>
      {ctx.orgs.length > 1 && (
        <nav aria-label="חשבונות" className="flex flex-wrap gap-1">
          {ctx.orgs.map((o) => (
            <Link key={o.id} href={`${base}?org=${o.id}`}
              className={`rounded-md px-2.5 py-1.5 text-xs ${o.id === ctx.org.id ? "bg-[#22384A] text-white" : "text-[#C7D3DD] hover:text-white"}`}>
              {o.name}
            </Link>
          ))}
        </nav>
      )}
      <nav aria-label="אתרים" className="flex flex-wrap gap-1">
        {sites.map((s) => (
          <Link key={s.id} href={`${base}?org=${ctx.org.id}&site=${s.id}`}
            className={`rounded-md px-3.5 py-2.5 text-sm ${s.id === currentSite ? "bg-[#22384A] font-medium text-white" : "text-[#C7D3DD] hover:text-white"}`}>
            {s.name}
          </Link>
        ))}
      </nav>
      <div className="ms-auto flex flex-wrap items-center gap-2 text-sm">
        {showQuota && (
          <span className="text-xs text-[#9FB3C3] tabular-nums" title="תשובות AI החודש מתוך המכסה">
            {used.toLocaleString("he-IL")} / {quota.toLocaleString("he-IL")} תשובות החודש
          </span>
        )}
        <Link href={`/dashboard/settings?org=${ctx.org.id}${currentSite ? `&site=${currentSite}` : ""}`}
          className="rounded-md px-3 py-2.5 text-[#C7D3DD] hover:text-white">הגדרות</Link>
        <form action={signOut}>
          <button className="rounded-md px-3 py-2.5 text-[#C7D3DD] hover:text-white">יציאה</button>
        </form>
      </div>
    </header>
  );
}
