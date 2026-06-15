/**
 * Phone normalization + WhatsApp deep links.
 * WhatsApp "integration" is just a wa.me deep link — no API, no server, no webhook.
 * Accepts 963406511, +351 963 406 511, 00351..., etc. → 351963406511.
 */
export function normalizePhone(raw: string, defaultCc = "351"): string {
  if (!raw) return "";
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2); // 00351… → 351…
  if (d.length === 9 && /^[239]/.test(d)) d = defaultCc + d; // PT number w/o country code
  return d;
}

/** Build a WhatsApp deep link with a prefilled message. "" if no valid number. */
export function waLink(raw: string, text = ""): string {
  const d = normalizePhone(raw);
  if (!d) return "";
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
