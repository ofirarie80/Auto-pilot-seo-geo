import Link from "next/link";
import { kcal, macroSplit, inL, type Food } from "@/lib/data";
import FoodImage from "@/components/FoodImage";
import { IMAGED } from "@/lib/foodImages";

/** Compact card: name, calories for the first household serving, and a thin macro bar. */
export default function FoodCard({ f, per100 = false }: { f: Food; per100?: boolean }) {
  const s = f.servings[0];
  const m = macroSplit(f.n);
  const value = per100 ? f.n.kcal : ((f.n.kcal ?? 0) * s.g) / 100;
  return (
    <Link className={`card${IMAGED.has(f.slug) ? " with-img" : ""}`} href={`/food/${f.slug}`}>
      <span>
      <span className="t">{f.name}</span>
      <span className="kc">{kcal(value)}<small>קק&quot;ל {per100 ? "ל-100 גרם" : inL(s.label)}</small></span>
      <span className="mini-split" aria-hidden="true">
        <i className="p" style={{ width: `${m.protein}%` }} /><i className="c" style={{ width: `${m.carbs}%` }} /><i className="f" style={{ width: `${m.fat}%` }} />
      </span>
      </span>
      <FoodImage slug={f.slug} alt="" className="thumb" />
    </Link>
  );
}
