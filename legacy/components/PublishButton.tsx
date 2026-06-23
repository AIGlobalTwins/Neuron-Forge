"use client";

import { useState } from "react";

// One-click publish of a generated site to a live URL (Cloudflare). Re-publishing
// the same site updates the same URL. Hand the link to the client.
export function PublishButton({ websiteId, name }: { websiteId: string; name: string }) {
  const [publishing, setPublishing] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function publish() {
    setPublishing(true);
    setErr(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setErr(data?.error || "Publish failed.");
        return;
      }
      setUrl(data.url);
    } catch {
      setErr("Publish failed.");
    } finally {
      setPublishing(false);
    }
  }

  if (url) {
    return (
      <div className="flex items-center gap-1.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={url}
          className="px-3 py-1.5 max-w-[200px] truncate bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-lg hover:bg-emerald-500/20 transition-all"
        >
          ● {url.replace(/^https?:\/\//, "")}
        </a>
        <button
          onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="px-2.5 py-1.5 bg-[#111] border border-[#2a2a2a] text-gray-400 hover:text-white text-xs rounded-lg transition"
          title="Copy link"
        >
          {copied ? "✓" : "Copy"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={publish}
        disabled={publishing}
        className="btn-glow px-3 py-1.5 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
      >
        {publishing ? (
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        )}
        {publishing ? "Publishing…" : "Publish"}
      </button>
      {err && <span className="text-[10px] text-red-400 max-w-[160px] leading-tight">{err}</span>}
    </div>
  );
}
