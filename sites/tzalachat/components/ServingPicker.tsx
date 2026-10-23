"use client";
import { useState } from "react";

type S = { label: string; g: number };
type N = { kcal: number; protein: number; carbs: number; fat: number };

const r1 = (v: number) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);

export default function ServingPicker({ servings, per100 }: { servings: S[]; per100: N }) {
  const all = servings.some((x) => x.g === 100) ? servings : [...servings, { label: "100 גרם", g: 100 }];
  const [g, setG] = useState(all[0].g);
  const [custom, setCustom] = useState("");
  const pick = (s: S) => { setG(s.g); setCustom(""); };
  const active = all.find((s) => s.g === g && custom === "");
  const k = (per100.kcal * g) / 100;
  const label = active ? active.label : `${g} גרם`;
  return (
    <div>
      <div className="answer" aria-live="polite">
        <span className="answer-num">{Math.round(k).toLocaleString("he-IL")}</span>
        <span className="answer-unit">קלוריות</span>
        <div className="answer-of">{label === "100 גרם" ? "ב-100 גרם" : `${/^[0-9A-Za-z]/.test(label) ? "ב-" : "ב"}${label} (${r1(g)} גרם)`}</div>
      </div>
      <div className="servings" role="group" aria-label="בחירת כמות">
        {all.map((s) => (
          <button key={s.label} type="button" className="chip" aria-pressed={!!active && active.label === s.label} onClick={() => pick(s)}>
            {s.label}
          </button>
        ))}
        <label className="grams">
          או
          <input
            type="number" inputMode="decimal" min={1} max={5000} placeholder="גרם" value={custom}
            onChange={(e) => { setCustom(e.target.value); const v = parseFloat(e.target.value); if (v > 0) setG(v); }}
            aria-label="כמות בגרמים"
          />
          גרם
        </label>
      </div>
      <div className="macros">
        <div className="macro p"><b>{r1((per100.protein * g) / 100)}</b><span>גרם חלבון</span></div>
        <div className="macro c"><b>{r1((per100.carbs * g) / 100)}</b><span>גרם פחמימות</span></div>
        <div className="macro f"><b>{r1((per100.fat * g) / 100)}</b><span>גרם שומן</span></div>
      </div>
    </div>
  );
}
