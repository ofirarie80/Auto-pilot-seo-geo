"use client";
import { useState } from "react";

const ACT = [
  { v: 1.2, l: "יושבני (מעט או ללא פעילות)" },
  { v: 1.375, l: "פעילות קלה (1–3 אימונים בשבוע)" },
  { v: 1.55, l: "פעילות בינונית (3–5 אימונים בשבוע)" },
  { v: 1.725, l: "פעילות גבוהה (6–7 אימונים בשבוע)" },
  { v: 1.9, l: "פעילות גבוהה מאוד (עבודה פיזית ואימונים)" },
];

export default function CalorieCalculator() {
  const [sex, setSex] = useState<"f" | "m">("f");
  const [age, setAge] = useState("30");
  const [h, setH] = useState("165");
  const [w, setW] = useState("65");
  const [act, setAct] = useState(1.375);
  const A = +age, H = +h, W = +w;
  const valid = A >= 18 && A <= 100 && H >= 120 && H <= 230 && W >= 35 && W <= 300;
  const bmr = 10 * W + 6.25 * H - 5 * A + (sex === "m" ? 5 : -161);
  const tdee = bmr * act;
  const floor = sex === "m" ? 1500 : 1200;
  const r = (v: number) => Math.round(v / 10) * 10;
  const loss = Math.max(tdee - 400, floor);
  return (
    <div>
      <form className="calc" onSubmit={(e) => e.preventDefault()} aria-describedby="calc-help">
        <fieldset>
          <legend>מין ביולוגי</legend>
          <button type="button" className="chip" aria-pressed={sex === "f"} onClick={() => setSex("f")}>אישה</button>
          <button type="button" className="chip" aria-pressed={sex === "m"} onClick={() => setSex("m")}>גבר</button>
        </fieldset>
        <div className="row">
          <label>גיל<input type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} min={18} max={100} /></label>
          <label>גובה (ס&quot;מ)<input type="number" inputMode="numeric" value={h} onChange={(e) => setH(e.target.value)} min={120} max={230} /></label>
        </div>
        <div className="row">
          <label>משקל (ק&quot;ג)<input type="number" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} min={35} max={300} /></label>
          <label>רמת פעילות
            <select value={act} onChange={(e) => setAct(+e.target.value)}>{ACT.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}</select>
          </label>
        </div>
      </form>
      {!valid ? (
        <p className="note" role="status">{A < 18 && age !== "" ? "המחשבון מיועד לגילאי 18 ומעלה. בגיל ההתבגרות הצרכים שונים, וכדאי להתייעץ עם רופא או דיאטנית." : "מלאו גיל (18–100), גובה בס\"מ ומשקל בק\"ג כדי לראות את התוצאה."}</p>
      ) : (
        <div className="result" aria-live="polite">
          <div className="muted">כדי לשמור על המשקל הנוכחי:</div>
          <span className="big">{r(tdee).toLocaleString("he-IL")}</span> <span>קלוריות ביום</span>
          <dl>
            <dt>חילוף חומרים במנוחה (BMR)</dt><dd>{r(bmr).toLocaleString("he-IL")}</dd>
            <dt>לירידה הדרגתית במשקל</dt><dd>{r(loss).toLocaleString("he-IL")}</dd>
            <dt>לעלייה במסה</dt><dd>{r(tdee + 300).toLocaleString("he-IL")}</dd>
          </dl>
        </div>
      )}
      <p id="calc-help" className="small muted">
        החישוב לפי נוסחת מיפלין־סנט ג&apos;אור, הנוסחה המקובלת היום בקרב דיאטניות. התוצאה היא הערכה. לירידה במשקל אנחנו מציגים גירעון מתון של כ-400 קלוריות, ולא פחות מ-{floor.toLocaleString("he-IL")} קלוריות ביום. להריון, הנקה, מצב רפואי או ספורט תחרותי כדאי לבנות תפריט עם דיאטנית.
      </p>
    </div>
  );
}
