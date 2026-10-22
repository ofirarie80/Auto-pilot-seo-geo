import LoginForm from "./LoginForm";

export const metadata = { title: "כניסה · Lionet Pilot" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-widest text-muted">SEO + GEO</span>
        <h1 className="text-3xl font-semibold">Lionet Pilot</h1>
        <p className="text-muted">מעקב אחרי איך ChatGPT, Claude, Gemini ו-Perplexity מציגים את העסק שלכם.</p>
      </div>
      {error && <p role="alert" className="text-sm text-[#B42318]">הקישור לא תקין או שפג תוקפו. נסו להתחבר שוב.</p>}
      <LoginForm next={next?.startsWith("/") ? next : "/dashboard"} />
    </main>
  );
}
