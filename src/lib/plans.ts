import type { EngineId } from "@/lib/geo/engines";

export type Plan = {
  id: string;
  name: string;
  max_sites: number;
  max_prompts_per_site: number;
  engines: EngineId[];
  monthly_answers: number;
  price_ils: number | null;
};

/** Human message for a database plan-limit error, or null if it is some other error. */
export function planLimitMessage(message: string | undefined): string | null {
  if (!message) return null;
  if (message.includes("plan_limit_sites")) return "הגעתם למספר האתרים המקסימלי במסלול. כדי להוסיף אתר צריך לשדרג.";
  if (message.includes("plan_limit_prompts")) return "הגעתם למספר השאלות המקסימלי לאתר במסלול. אפשר להשהות שאלה אחרת או לשדרג.";
  return null;
}
