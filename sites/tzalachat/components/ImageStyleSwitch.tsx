"use client";
import { useEffect, useState } from "react";

/** Preview-only toggle between photo and illustration styles. */
export default function ImageStyleSwitch() {
  const [v, setV] = useState("photo");
  useEffect(() => {
    let s = new URLSearchParams(location.search).get("img");
    try { s = s || localStorage.getItem("img-style"); } catch {}
    const val = s === "illustration" || s === "cutout" ? s : "photo";
    setV(val); document.documentElement.dataset.img = val;
  }, []);
  const set = (val: string) => { setV(val); document.documentElement.dataset.img = val; try { localStorage.setItem("img-style", val); } catch {} };
  return (
    <div className="img-switch" role="group" aria-label="סגנון תמונות (תצוגה מקדימה)">
      <span>סגנון תמונות:</span>
      <button type="button" aria-pressed={v === "photo"} onClick={() => set("photo")}>צילום</button>
      <button type="button" aria-pressed={v === "illustration"} onClick={() => set("illustration")}>איור</button>
      <button type="button" aria-pressed={v === "cutout"} onClick={() => set("cutout")}>איור שקוף</button>
    </div>
  );
}
