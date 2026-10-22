import Link from "next/link";
export default function NotFound() {
  return (
    <div className="wrap narrow">
      <h1>העמוד לא נמצא</h1>
      <p className="lede">ייתכן שהמאכל עוד לא נמצא במאגר, או שהכתובת השתנתה. חפשו אותו מדף הבית.</p>
      <div className="cta-row"><Link className="btn" href="/">לחיפוש מאכל</Link></div>
    </div>
  );
}
