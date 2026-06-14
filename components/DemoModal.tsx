"use client";

import { useState } from "react";
import { DEMO_POSTS, DEMO_CONSULTING_PLAN, DEMO_WEBSITE_ID, DEMO_SEO } from "@/lib/demo-data";

type DemoTool = "maps" | "analyze" | "instagram" | "consulting" | "whatsapp" | "seo" | "security" | "email" | "ads" | "calendar";

interface Props {
  tool: DemoTool;
  onClose: () => void;
  onSetupKey: () => void;
}

export function DemoModal({ tool, onClose, onSetupKey }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function copy(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e] flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs bg-[#E8622A]/20 text-[#E8622A] px-2 py-0.5 rounded-full font-medium border border-[#E8622A]/30">DEMO</span>
            <div>
              <div className="font-bold text-white text-sm">{TOOL_TITLES[tool]}</div>
              <div className="text-xs text-gray-500">Pre-generated example — no API Key required</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl transition-colors">×</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {(tool === "maps" || tool === "analyze") && <DemoWebsite id={DEMO_WEBSITE_ID} onSetupKey={onSetupKey} />}
          {tool === "instagram" && <DemoPosts posts={DEMO_POSTS} copiedIdx={copiedIdx} onCopy={copy} onSetupKey={onSetupKey} />}
          {tool === "consulting" && <DemoConsulting plan={DEMO_CONSULTING_PLAN} onSetupKey={onSetupKey} />}
          {tool === "whatsapp" && <DemoWhatsApp onSetupKey={onSetupKey} />}
          {tool === "seo" && <DemoSeo data={DEMO_SEO} onSetupKey={onSetupKey} />}
          {tool === "security" && <DemoSetupKey label="Security Auditor" onSetupKey={onSetupKey} />}
        </div>
      </div>
    </div>
  );
}

const TOOL_TITLES: Record<DemoTool, string> = {
  maps: "Create from Google Maps",
  analyze: "Analyze & Redesign",
  instagram: "Instagram Posts",
  consulting: "Consulting Agent",
  whatsapp: "WhatsApp Agent",
  seo: "SEO Content Agent",
  security: "Security Auditor",
  email: "Email Marketing Agent",
  ads: "Google Ads Agent",
  calendar: "Content Calendar Agent",
};

/* ── Website Demo ── */
function DemoWebsite({ id, onSetupKey }: { id: string; onSetupKey: () => void }) {
  return (
    <div>
      <div className="px-6 py-3 border-b border-[#1e1e1e] bg-[#0d0d0d] text-xs text-gray-500">
        Website generated for: <span className="text-white">La Vecchia Roma II</span> · Italian Restaurant · Lisbon
      </div>
      <div className="h-72 overflow-hidden border-b border-[#1e1e1e]">
        <iframe
          src={`/api/preview/${id}`}
          className="w-full h-full border-0"
          title="Demo website"
        />
      </div>
      <div className="p-6">
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 mb-4">
          <div className="text-xs text-gray-500 mb-3">What was generated automatically:</div>
          <div className="grid grid-cols-2 gap-2">
            {["Navbar with menu", "Hero with background photo", "Services section", "Why Us", "Testimonials", "Reservation form", "Embedded map", "Complete footer"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-gray-400">
                <span className="text-green-400">✓</span> {f}
              </div>
            ))}
          </div>
        </div>
        <SetupCTA onSetupKey={onSetupKey} label="Generate my own website" />
      </div>
    </div>
  );
}

/* ── Instagram Demo ── */
function DemoPosts({ posts, copiedIdx, onCopy, onSetupKey }: {
  posts: typeof DEMO_POSTS;
  copiedIdx: number | null;
  onCopy: (text: string, idx: number) => void;
  onSetupKey: () => void;
}) {
  return (
    <div className="p-6 space-y-5">
      <div className="text-xs text-gray-500 mb-2">3 posts generated for <span className="text-white">La Vecchia Roma</span> · friendly tone</div>
      {posts.map((post, i) => (
        <div key={i} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e1e1e]">
            <span className="text-xs text-gray-500 font-medium">Post {i + 1}</span>
            <button
              onClick={() => onCopy(post.caption + "\n\n" + post.hashtags, i)}
              className="text-xs text-gray-500 hover:text-[#E8622A] transition flex items-center gap-1"
            >
              {copiedIdx === i ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{post.caption}</p>
            <p className="text-xs text-[#E8622A]/80 leading-relaxed">{post.hashtags}</p>
            <div className="bg-[#1a1a1a] rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Image suggestion:</div>
              <p className="text-xs text-gray-400 italic">{post.imagePrompt}</p>
            </div>
          </div>
        </div>
      ))}
      <SetupCTA onSetupKey={onSetupKey} label="Generate posts for my business" />
    </div>
  );
}

/* ── Consulting Demo ── */
function DemoConsulting({ plan, onSetupKey }: { plan: typeof DEMO_CONSULTING_PLAN; onSetupKey: () => void }) {
  return (
    <div className="p-6 space-y-5">
      <div className="bg-[#E8622A]/5 border border-[#E8622A]/20 rounded-xl p-4">
        <div className="text-xs text-[#E8622A] font-medium mb-1">Executive Summary</div>
        <p className="text-sm text-gray-300 leading-relaxed">{plan.executiveSummary}</p>
      </div>

      <div>
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Diagnosis</div>
        <ul className="space-y-2">
          {plan.diagnosis.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
              <span className="text-red-400 mt-0.5 flex-shrink-0">•</span> {d}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Action Plan</div>
        <div className="space-y-3">
          {plan.actions.map((phase, i) => (
            <div key={i} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
              <div className="text-sm font-semibold text-white mb-2">{phase.phase}</div>
              <ul className="space-y-1">
                {phase.tasks.map((t, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs text-gray-400">
                    <span className="text-[#E8622A] mt-0.5">→</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <SetupCTA onSetupKey={onSetupKey} label="Create my business plan" />
    </div>
  );
}

/* ── WhatsApp Demo ── */
function DemoWhatsApp({ onSetupKey }: { onSetupKey: () => void }) {
  const conversation = [
    { from: "client", text: "Hi! What are your opening hours?" },
    { from: "agent", text: "Hi! 😊 We're open Monday to Friday from 9am to 8pm, and Saturdays from 10am to 6pm. Can I help with anything else?" },
    { from: "client", text: "Yes! I'd like to know the prices for your massage services." },
    { from: "agent", text: "Of course! We have the following options:\n\n• Relaxing massage (60 min) — €45\n• Sports massage (60 min) — €55\n• Hot stone massage (90 min) — €75\n\nWould you like to book a session? 🙏" },
    { from: "client", text: "Yes! Could it be tomorrow at 3pm?" },
    { from: "agent", text: "I'll check availability! To confirm the booking, I need your full name and phone number. Could you share them here? 📅" },
  ];

  return (
    <div className="p-6">
      <div className="text-xs text-gray-500 mb-4">
        Sample conversation — Spa & Wellness · Agent: <span className="text-white">Sofia</span>
      </div>
      <div className="bg-[#075E54] rounded-2xl overflow-hidden mb-5">
        <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3 border-b border-[#128C7E]">
          <div className="w-8 h-8 rounded-full bg-[#128C7E] flex items-center justify-center text-white text-sm font-bold">S</div>
          <div>
            <div className="text-white text-sm font-medium">Sofia · Spa Alenquer</div>
            <div className="text-green-300 text-xs">Online</div>
          </div>
        </div>
        <div className="p-4 space-y-3 bg-[#ECE5DD] max-h-72 overflow-y-auto">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === "client" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs rounded-lg px-3 py-2 text-sm shadow ${
                msg.from === "client"
                  ? "bg-[#DCF8C6] text-gray-800"
                  : "bg-white text-gray-800"
              }`} style={{ whiteSpace: "pre-line" }}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 mb-5">
        <div className="text-xs text-gray-500 mb-2">The agent was configured with:</div>
        <div className="space-y-1">
          {["Business name and personality", "Opening hours", "List of services and prices", "Custom FAQs", "Language: English"].map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs text-gray-400">
              <span className="text-green-400">✓</span> {f}
            </div>
          ))}
        </div>
      </div>
      <SetupCTA onSetupKey={onSetupKey} label="Create my WhatsApp agent" />
    </div>
  );
}

/* ── SEO Demo ── */
function DemoSeo({ data, onSetupKey }: { data: typeof DEMO_SEO; onSetupKey: () => void }) {
  const [copied, setCopied] = useState<number | null>(null);
  function copy(text: string, i: number) {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  }
  return (
    <div className="p-6 space-y-4">
      <div className="text-xs text-gray-500 mb-2">
        Blog article generated for <span className="text-white">La Vecchia Roma</span> · ~{data.wordCount} words
      </div>
      {data.sections.map((s, i) => (
        <div key={i} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl overflow-hidden group">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e1e1e]">
            <span className="text-xs font-semibold text-[#E8622A]">{s.title}</span>
            <button onClick={() => copy(s.content, i)} className="text-xs text-gray-600 hover:text-[#E8622A] transition opacity-0 group-hover:opacity-100">
              {copied === i ? "✓" : "Copy"}
            </button>
          </div>
          <p className="px-4 py-3 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{s.content}</p>
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {data.keywords.map((kw, i) => (
          <span key={i} className="text-xs px-2 py-1 bg-[#E8622A]/10 border border-[#E8622A]/20 text-[#E8622A] rounded-full">{kw}</span>
        ))}
      </div>
      <SetupCTA onSetupKey={onSetupKey} label="Generate SEO content for my business" />
    </div>
  );
}

/* ── Generic setup key demo (for tools without pre-generated demo data) ── */
function DemoSetupKey({ label, onSetupKey }: { label: string; onSetupKey: () => void }) {
  return (
    <div className="p-6 space-y-4">
      <p className="text-sm text-gray-400 leading-relaxed">
        The <span className="text-white font-medium">{label}</span> analyzes any website in real time — it checks security headers, exposed paths, inline scripts, forms, and outdated libraries.
      </p>
      <SetupCTA onSetupKey={onSetupKey} label={`Try the ${label}`} />
    </div>
  );
}

/* ── CTA block ── */
function SetupCTA({ onSetupKey, label }: { onSetupKey: () => void; label: string }) {
  return (
    <div className="bg-[#0d0d0d] border border-[#E8622A]/20 rounded-xl p-4">
      <div className="text-sm text-white font-medium mb-1">Ready to get started?</div>
      <p className="text-xs text-gray-500 mb-3">Add your Anthropic API Key (free to start) and generate your own result in minutes.</p>
      <button
        onClick={onSetupKey}
        className="w-full py-2.5 bg-[#E8622A] hover:bg-[#d4561f] text-white text-sm font-semibold rounded-xl transition"
      >
        {label} →
      </button>
    </div>
  );
}
