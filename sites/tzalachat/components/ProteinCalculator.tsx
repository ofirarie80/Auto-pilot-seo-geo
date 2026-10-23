"use client";
import { useState } from "react";

const LEVELS = [
  { v: "rda", lo: 0.8, hi: 0.8, l: "פעילות מועטה (המלצת RDA)" },
  { v: "active", lo: 1.2, hi: 1.6, l: "אימונים קבועים" },
  { v: "strength", lo: 1.6, hi: 2.0, l: "אימוני כוח או ספורט תחרותי" },
];

export default function ProteinCalculator() {
  const [w, setW] = useState("70");
  const [lvl, setLvl] = useState("active");
  const W = +w; const L = LEVELS.find((x) => x.v === lvl)!;
  const valid = W >= 30 && W <= 300;
  const lo = Math.round(W * L.lo), hi = Math.round(W * L.hi);
  return (
    <div>
      <form className="calc" onSubmit={(e) => e.preventDefault()}>
        <label>משקל (ק&quot;ג)<input type="number" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} min={30} max={300} /></label>
        <label>רמת פעילות
          <select value={lvl} onChange={(e) => setLvl(e.target.value)}>{LEVELS.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}</select>
        </label>
      </form>
      {!valid ? <p className="note" role="status">מלאו משקל בק&quot;ג כדי לראות את התוצאה.</p> : (
        <div className="result" aria-live="polite">
          <div className="muted">חלבון מומלץ ליום:</div>
          <span className="big">{lo === hi ? lo : `${lo}–${hi}`}</span> <span>גרם</span>
          <dl>
            <dt>לכל ארוחה (3 ארוחות)</dt><dd>{lo === hi ? Math.round(lo / 3) : `${Math.round(lo / 3)}–${Math.round(hi / 3)}`} גרם</dd>
            <dt>גרם לק&quot;ג משקל גוף</dt><dd>{L.lo === L.hi ? L.lo : `${L.lo}–${L.hi}`}</dd>
          </dl>
        </div>
      )}
      <p className="small muted">0.8 גרם לק&quot;ג היא ההמלצה הבסיסית (RDA) למבוגרים. לאנשים שמתאמנים באופן קבוע ולמתאמני כוח, ארגוני תזונת ספורט ממליצים על טווחים גבוהים יותר. במחלת כליות או מצב רפואי אחר יש להתייעץ עם רופא או דיאטנית.</p>
    </div>
  );
}
