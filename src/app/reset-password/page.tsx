import ResetForm from "./ResetForm";

export const metadata = { title: "סיסמה חדשה · Lionet Pilot" };

export default function ResetPassword() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">בחירת סיסמה חדשה</h1>
        <p className="text-muted">אחרי השמירה תועברו לדשבורד.</p>
      </div>
      <ResetForm />
    </main>
  );
}
