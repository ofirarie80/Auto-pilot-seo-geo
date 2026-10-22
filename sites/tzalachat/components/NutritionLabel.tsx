import { NUTRIENTS, fmt, kcal, pctDV, type Nutrients } from "@/lib/data";

const ROWS: { k: string; cls?: string }[] = [
  { k: "protein", cls: "major" }, { k: "carbs", cls: "major" }, { k: "sugar", cls: "sub" }, { k: "fiber", cls: "sub" },
  { k: "fat", cls: "major" }, { k: "satFat", cls: "sub" }, { k: "monoFat", cls: "sub" }, { k: "polyFat", cls: "sub" },
  { k: "cholesterol", cls: "rule" }, { k: "sodium" }, { k: "potassium" }, { k: "calcium" }, { k: "iron" }, { k: "magnesium" },
  { k: "phosphorus" }, { k: "zinc", cls: "rule" }, { k: "vitA_RAE" }, { k: "vitC" }, { k: "vitD_mcg" }, { k: "vitE" }, { k: "vitK" },
  { k: "thiamin" }, { k: "riboflavin" }, { k: "niacin" }, { k: "vitB6" }, { k: "folateDFE" }, { k: "vitB12" },
];

/** Nutrients are expected already scaled to the amount named in `per`. */
export default function NutritionLabel({ n, per, title = "ערכים תזונתיים" }: { n: Nutrients; per: string; title?: string }) {
  return (
    <section className="label" aria-label={`${title} ${per}`}>
      <h2>{title}</h2>
      <div className="per">{per}</div>
      <table>
        <tbody>
          <tr className="major rule"><td>אנרגיה (קלוריות)</td><td className="v">{kcal(n.kcal)} קק&quot;ל</td><td className="d" /></tr>
          {ROWS.filter((r) => n[r.k] != null).map((r) => {
            const meta = NUTRIENTS[r.k]; const p = pctDV(r.k, n[r.k]);
            return (
              <tr key={r.k} className={r.cls}>
                <td>{meta.label}</td>
                <td className="v">{fmt(n[r.k], meta.unit === "גרם" ? 1 : 2)} {meta.unit}</td>
                <td className="d">{p != null ? `${p}%` : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="foot">האחוזים הם מתוך הערך היומי המומלץ לפי ה-FDA, לתפריט של 2,000 קלוריות.</div>
    </section>
  );
}
