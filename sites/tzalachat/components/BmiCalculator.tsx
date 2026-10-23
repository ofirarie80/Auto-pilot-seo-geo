"use client";
import { useState } from "react";

/** WHO adult BMI categories. */
const BANDS = [
  { max: 18.5, label: "תת-משקל", color: "#3a5a8c" },
  { max: 25, label: "משקל תקין", color: "#2f7a4a" },
  { max: 30, label: "עודף משקל", color: "#e0a21b" },
  { max: 99, label: "השמנה", color: "#a23b2a" },
];

export default function BmiCalculator() {
  const [h, setH] = useState("170");
  const [w, setW] = useState("70");
  const H = +h / 100, W = +w;
  const valid = H >= 1.2 && H <= 2.3 && W >= 30 && W <= 300;
  const bmi = valid ? W / (H * H) : 0;
  const band = BANDS.find((b) => bmi < b.max)!;
  const lo = 18.5 * H * H, hi = 24.9 * H * H;
  const pin = Math.min(Math.max(((bmi - 15) / (40 - 15)) * 100, 0), 100);
  return (
    <div>
      <form className="calc" onSubmit={(e) => e.preventDefault()}>
        <div className="row">
          <label>גובה (ס&quot;מ)<input type="number" inputMode="numeric" value={h} onChange={(e) => setH(e.target.value)} min={120} max={230} /></label>
          <label>משקל (ק&quot;ג)<input type="number" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} min={30} max={300} /></label>
        </div>
      </form>
      {!valid ? <p className="note" role="status">מלאו גובה בס&quot;מ (120–230) ומשקל בק&quot;ג כדי לראות את התוצאה.</p> : (
        <div className="result" aria-live="polite">
          <div className="muted">ה-BMI שלכם:</div>
          <span className="big">{bmi.toFixed(1)}</span> <span style={{ color: band.color, fontWeight: 700 }}>{band.label}</span>
          <div className="scale" aria-hidden="true" style={{ background: "linear-gradient(90deg,#a23b2a 0 40%,#e0a21b 40% 60%,#2f7a4a 60% 86%,#3a5a8c 86%)" }}>
            <span className="scale-pin" style={{ right: `calc(${pin}% - 2px)` }} />
          </div>
          <dl>
            <dt>טווח משקל תקין לגובה שלכם</dt><dd>{Math.round(lo)}–{Math.round(hi)} ק&quot;ג</dd>
          </dl>
        </div>
      )}
      <p className="small muted">BMI הוא מדד כללי שלא מבחין בין שריר לשומן, ואינו מתאים לילדים, לנשים בהריון ולספורטאים עם מסת שריר גבוהה. הטווחים לפי ארגון הבריאות העולמי.</p>
    </div>
  );
}
