import "server-only";

/**
 * Sends a WhatsApp message through Green API (green-api.com).
 * Needs GREEN_API_INSTANCE, GREEN_API_TOKEN and WHATSAPP_TO (e.g. 972501234567).
 * Silently skips when not configured, so the weekly run never fails because of it.
 */
export async function sendWhatsApp(message: string, toNumber?: string | null): Promise<{ sent: boolean; error?: string }> {
  const instance = process.env.GREEN_API_INSTANCE?.trim();
  const token = process.env.GREEN_API_TOKEN?.trim();
  const to = (toNumber || process.env.WHATSAPP_TO)?.replace(/\D/g, "");
  if (!instance || !token || !to) return { sent: false, error: "not configured" };

  const base = (process.env.GREEN_API_URL?.trim() || "https://api.green-api.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/waInstance${instance}/sendMessage/${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chatId: `${to}@c.us`, message }),
    });
    if (!res.ok) return { sent: false, error: `${res.status} ${await res.text().catch(() => "")}`.slice(0, 300) };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}
