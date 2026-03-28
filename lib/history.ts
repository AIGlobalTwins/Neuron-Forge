// Client-side history — persisted in localStorage

export type HistoryType = "maps" | "analyze" | "seo" | "instagram";

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
}

const KEY = "forge_history";
const MAX = 50;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveToHistory(entry: Omit<HistoryEntry, "id" | "date">): void {
  if (typeof window === "undefined") return;
  const history = loadHistory();
  const newEntry: HistoryEntry = {
    ...entry,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify([newEntry, ...history].slice(0, MAX)));
}

export function removeFromHistory(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(loadHistory().filter((e) => e.id !== id)));
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function historyTypeLabel(type: HistoryType): string {
  return { maps: "Website", analyze: "Redesign", seo: "SEO", instagram: "Instagram" }[type];
}

export function historyTypeColor(type: HistoryType) {
  return {
    maps:      { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
    analyze:   { text: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20" },
    seo:       { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    instagram: { text: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/20" },
  }[type];
}
