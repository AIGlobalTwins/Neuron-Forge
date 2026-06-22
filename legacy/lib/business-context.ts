// Shared: turn a saved client profile into a compact prompt block so every agent
// generates with the real business info (services, hours, FAQs, phone, website...)
// without the user retyping it. The frontend sends `clientProfile` in the request
// body; each agent route builds this block and injects it into its prompt.

export interface BusinessProfile {
  name?: string;
  category?: string;
  description?: string;
  website?: string;
  phone?: string;
  hours?: string;
  services?: string[];
  faqs?: { question: string; answer: string }[];
}

/**
 * Build a BUSINESS CONTEXT block from a client profile. Returns "" when there is
 * nothing useful (no name). Safe to append to any system/user prompt.
 */
export function buildBusinessContext(p?: BusinessProfile | null): string {
  if (!p || !p.name?.trim()) return "";
  const L: string[] = [`Business name: ${p.name.trim()}`];
  if (p.category?.trim()) L.push(`Category / industry: ${p.category.trim()}`);
  if (p.description?.trim()) L.push(`About: ${p.description.trim()}`);
  if (p.website?.trim()) L.push(`Website: ${p.website.trim()}`);
  if (p.phone?.trim()) L.push(`Phone / WhatsApp: ${p.phone.trim()}`);
  if (p.hours?.trim()) L.push(`Opening hours: ${p.hours.trim()}`);
  const services = (p.services ?? []).map((s) => s?.trim()).filter(Boolean);
  if (services.length) L.push(`Services / products: ${services.join(", ")}`);
  const faqs = (p.faqs ?? []).filter((f) => f?.question?.trim() && f?.answer?.trim());
  if (faqs.length) {
    L.push(`Customer FAQs:\n${faqs.map((f) => `  • Q: ${f.question.trim()}\n    A: ${f.answer.trim()}`).join("\n")}`);
  }
  // Only a bare name with nothing else adds little — still include it, it's cheap.
  return `\n\n=== BUSINESS CONTEXT (real, verified info about this client — use it; tailor the output to it; never invent facts that contradict it) ===\n${L.join("\n")}\n=== END BUSINESS CONTEXT ===\n`;
}
