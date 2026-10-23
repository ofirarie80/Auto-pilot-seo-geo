import { macroSplit, type Nutrients } from "@/lib/data";

const COLORS = { protein: "#7a3e8e", carbs: "#e0a21b", fat: "#6e8b3d" };
const LABELS = { protein: "חלבון", carbs: "פחמימות", fat: "שומן" };

/**
 * The calorie split drawn as a plate: three arcs on a white rim, with the center showing
 * calories per 100 g. Pure SVG, rendered on the server.
 */
export default function MacroDonut({ n, size = 240, center, sub }: { n: Nutrients; size?: number; center?: string; sub?: string }) {
  const m = macroSplit(n);
  const r = 40, C = 2 * Math.PI * r, gap = 1.2;
  let offset = 0;
  const parts = (["protein", "carbs", "fat"] as const).map((k) => {
    const len = (m[k] / 100) * C;
    const seg = { k, len: Math.max(len - gap, 0), offset };
    offset += len;
    return seg;
  });
  const empty = m.protein + m.carbs + m.fat === 0;
  return (
    <div className="donut-wrap" style={{ maxWidth: size, marginInline: "auto" }}>
      <svg viewBox="0 0 100 100" width={size} height={size} role="img"
        aria-label={empty ? "אין קלוריות משמעותיות" : `${Math.round(m.protein)}% חלבון, ${Math.round(m.carbs)}% פחמימות, ${Math.round(m.fat)}% שומן`}
        >
        <circle cx="50" cy="50" r="48" fill="#fff" />
        <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(43,27,51,.12)" strokeWidth="1" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#efeaf0" strokeWidth="11" />
        {!empty && parts.map((p) => p.len > 0 && (
          <circle key={p.k} className="seg" cx="50" cy="50" r={r} fill="none" stroke={COLORS[p.k]} strokeWidth="11"
            strokeDasharray={`${p.len} ${C - p.len}`} strokeDashoffset={-p.offset} transform="rotate(-90 50 50)" />
        ))}
      </svg>
      {center && <div className="donut-center"><b>{center}</b>{sub && <span>{sub}</span>}</div>}
      <ul className="legend">
        {(["protein", "carbs", "fat"] as const).map((k) => (
          <li key={k}><i style={{ background: COLORS[k] }} />{LABELS[k]} {Math.round(m[k])}%</li>
        ))}
      </ul>
    </div>
  );
}
