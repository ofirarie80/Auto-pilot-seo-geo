import OnboardForm from "./OnboardForm";

export const metadata = { title: "הקמת חשבון · Lionet Pilot" };
export const maxDuration = 60;

export default function Onboarding() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">בואו נתחיל</h1>
        <p className="text-muted">נסרוק את האתר, נכין שאלות שהלקוחות שלכם שואלים את ה-AI, ונתחיל למדוד.</p>
      </div>
      <OnboardForm />
    </main>
  );
}
