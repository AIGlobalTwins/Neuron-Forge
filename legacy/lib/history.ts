// Per-user history (persisted in Supabase — see /api/generations).
import type { EmailEntry } from "@/app/api/email-marketing/route";
import type { AdGroup } from "@/app/api/google-ads/route";
import type { CalendarDay } from "@/app/api/content-calendar/route";

export type HistoryType = "maps" | "analyze" | "seo" | "instagram" | "consulting" | "security" | "email" | "ads" | "calendar";

export interface HistoryEntry {
  id: string;
  type: HistoryType;
  name: string;
  date: string;
  // website (maps / analyze)
  websiteId?: string;
  score?: number;
  category?: string;
  // seo
  seoType?: string;
  seoSections?: { title: string; content: string }[];
  seoKeywords?: string[];
  seoTips?: string[];
  seoWordCount?: number;
  // instagram
  posts?: { caption: string; hashtags: string; imagePrompt: string }[];
  // consulting
  consultingArea?: string;
  consultingPlan?: {
    title: string;
    executive: string;
    diagnosis: string[];
    objectives: string[];
    actions: { phase: string; task: string; owner: string; timing: string }[];
    kpis: { metric: string; target: string }[];
    risks: { risk: string; mitigation: string }[];
  };
  // security
  securityUrl?: string;
  securityScore?: number;
  securityRating?: string;
  securitySummary?: string;
  securityFindings?: { severity: string; title: string; category: string }[];
  securityTechDetected?: string[];
  // email marketing
  emailSequenceType?: string;
  emailCount?: number;
  emailSubjects?: string[];
  emailEmails?: EmailEntry[];
  emailTips?: string[];
  emailSubjectVariants?: string[];
  // google ads
  adsCampaignType?: string;
  adsGroupCount?: number;
  adsHeadlineCount?: number;
  adsAdGroups?: AdGroup[];
  adsNegativeKeywords?: string[];
  adsTips?: string[];
  adsBudget?: string;
  // content calendar
  calendarMonth?: string;
  calendarDayCount?: number;
  calendarStrategy?: string;
  calendarWeeklyThemes?: string[];
  calendarDays?: CalendarDay[];
  calendarTips?: string[];
}

// History is stored per-user in Supabase (see /api/generations). RLS guarantees a
// user only ever reads/writes their own rows; it survives reloads, deploys and
// device changes — unlike the old localStorage store. The flat HistoryEntry fields
// beyond type/name are kept in the DB `payload` jsonb column.

export async function fetchHistory(): Promise<HistoryEntry[]> {
  try {
    const res = await fetch("/api/generations");
    if (!res.ok) return [];
    const { generations } = await res.json();
    return ((generations ?? []) as {
      id: string; type: HistoryType; name: string; payload?: Record<string, unknown>; created_at: string;
    }[]).map((g) => ({ id: g.id, type: g.type, name: g.name, date: g.created_at, ...(g.payload ?? {}) })) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function saveToHistory(entry: Omit<HistoryEntry, "id" | "date">): Promise<void> {
  try {
    const { type, name, ...payload } = entry;
    await fetch("/api/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name: name ?? "", payload }),
    });
  } catch {
    /* fire-and-forget; the result is already on screen */
  }
}

export async function removeFromHistory(id: string): Promise<void> {
  try {
    await fetch(`/api/generations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch {
    /* ignore */
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await fetch("/api/generations", { method: "DELETE" });
  } catch {
    /* ignore */
  }
}

export function historyTypeLabel(type: HistoryType): string {
  return { maps: "Website", analyze: "Redesign", seo: "SEO", instagram: "Instagram", consulting: "Consultoria", security: "Segurança", email: "Email", ads: "Google Ads", calendar: "Calendário" }[type];
}

export function historyTypeColor(type: HistoryType) {
  return {
    maps:        { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
    analyze:     { text: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20" },
    seo:         { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    instagram:   { text: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/20" },
    consulting:  { text: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20" },
    security:    { text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
    email:       { text: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
    ads:         { text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
    calendar:    { text: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20" },
  }[type];
}
