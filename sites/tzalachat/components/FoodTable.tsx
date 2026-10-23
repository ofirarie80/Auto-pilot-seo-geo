"use client";
import { useMemo, useState } from "react";

type Row = { slug: string; name: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number };
const COLS: { k: keyof Row; label: string }[] = [
  { k: "kcal", label: "קלוריות" }, { k: "protein", label: "חלבון (ג')" }, { k: "carbs", label: "פחמימות (ג')" },
  { k: "fat", label: "שומן (ג')" }, { k: "fiber", label: "סיבים (ג')" },
];
const COLOR: Record<string, string> = { kcal: "#2b1b33", protein: "#7a3e8e", carbs: "#e0a21b", fat: "#6e8b3d", fiber: "#3a5a8c" };
const f1 = (v: number) => (v >= 100 ? Math.round(v).toLocaleString("he-IL") : (Math.round(v * 10) / 10).toLocaleString("he-IL"));

/** Category table: click a column header to sort by it; the sorted column shows proportional bars. */
export default function FoodTable({ rows }: { rows: Row[] }) {
  const [key, setKey] = useState<keyof Row>("kcal");
  const [desc, setDesc] = useState(false);
  const sorted = useMemo(() => [...rows].sort((a, b) => ((a[key] as number) - (b[key] as number)) * (desc ? -1 : 1)), [rows, key, desc]);
  const max = Math.max(...rows.map((r) => r[key] as number), 1);
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>מאכל <span className="muted small">(ל-100 גרם)</span></th>
            {COLS.map((c) => (
              <th key={c.k} className="n">
                <button type="button" aria-pressed={key === c.k}
                  onClick={() => { if (key === c.k) setDesc(!desc); else { setKey(c.k); setDesc(c.k !== "kcal"); } }}>
                  {c.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.slug}>
              <td><a href={`/food/${r.slug}`}>{r.name}</a></td>
              {COLS.map((c) => (
                <td key={c.k} className="n">
                  {key === c.k ? (
                    <span className="bar-cell"><span className="bar" style={{ width: `${Math.round(((r[c.k] as number) / max) * 70)}px`, background: COLOR[c.k] }} />{f1(r[c.k] as number)}</span>
                  ) : f1(r[c.k] as number)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
