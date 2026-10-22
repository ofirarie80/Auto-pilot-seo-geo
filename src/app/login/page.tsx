import LoginForm from "./LoginForm";

export const metadata = { title: "כניסה · Lionet Pilot" };

const ERRORS: Record<string, string> = {
  link: "הקישור לא תקין או שפג תוקפו. נסו להתחבר, או לבקש קישור חדש.",
  google: "הכניסה עם Google נכשלה. נסו שוב.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; confirmed?: string }>;
}) {
  const { next, error, confirmed } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-widest text-muted">SEO + GEO</span>
        <h1 className="text-3xl font-semibold">Lionet Pilot</h1>
        <p className="text-muted">מעקב אחרי איך ChatGPT, Claude, Gemini ו-Perplexity מציגים את העסק שלכם.</p>
      </div>
      {error && ERRORS[error] && <p role="alert" className="text-sm text-[#B42318]">{ERRORS[error]}</p>}
      <LoginForm
        next={next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard"}
        google={process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1"}
        initialInfo={confirmed ? "המייל אושר. אפשר להתחבר עם הסיסמה שבחרתם." : undefined}
      />
    </main>
  );
}
