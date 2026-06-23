"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
}

const DOCS = [
  {
    id: "maps",
    color: "blue",
    colorClass: { bg: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/30", text: "text-blue-400", active: "bg-blue-500/10 border-r-2 border-blue-500", tag: "text-blue-400", tip: "bg-blue-500/5 border-blue-500/20", stepNum: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
    icon: (
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2C7.24 2 5 4.24 5 7c0 4.25 5 11 5 11s5-6.75 5-11c0-2.76-2.24-5-5-5z" />
        <circle cx="10" cy="7" r="1.8" />
      </svg>
    ),
    title: "Create Website",
    subtitle: "Google Maps",
    tag: "No website",
    what: "Creates a complete professional website for any business in ~90 seconds, without writing a single line of code.",
    needs: ["Business Google Maps URL (or fill it in manually)", "Business photos (optional — improves the result)", "Anthropic API Key in Settings"],
    steps: [
      "Click 'Create from Google Maps'",
      "Paste the Google Maps URL (e.g. maps.google.com/place/...)",
      "Forge automatically extracts: name, address, phone, and category",
      "Add 1-3 photos of the space to personalize the colors and style",
      "Click 'Generate Website' and wait ~90 seconds",
      "View the preview, download the HTML, or publish directly to Vercel",
    ],
    tip: "Works with any type of business: restaurants, clinics, beauty salons, lawyers, gyms, and much more.",
    example: "La Vecchia Roma restaurant → website with menu, testimonials, 'Why Us' section, reservation form, and footer — all generated automatically.",
  },
  {
    id: "analyze",
    color: "purple",
    colorClass: { bg: "from-purple-500/20 to-violet-500/20", border: "border-purple-500/30", text: "text-purple-400", active: "bg-purple-500/10 border-r-2 border-purple-500", tag: "text-purple-400", tip: "bg-purple-500/5 border-purple-500/20", stepNum: "border-purple-500/30 text-purple-400 bg-purple-500/10" },
    icon: (
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="6" />
        <path d="M20 20l-4-4" />
        <path d="M6 9h6M9 6v6" />
      </svg>
    ),
    title: "Analyze & Redesign",
    subtitle: "Existing website",
    tag: "Has website",
    what: "Analyzes any existing website with AI, identifies design problems, and generates a modern, professional version.",
    needs: ["URL of a public website", "Anthropic API Key in Settings"],
    steps: [
      "Click 'Analyze & Redesign'",
      "Paste the URL of the website you want to improve",
      "Forge takes screenshots and reads the page source code",
      "The AI analyzes: design, visual hierarchy, colors, typography, and UX",
      "Receive a report of strengths and weaknesses",
      "Forge generates a completely redesigned version",
    ],
    tip: "Ideal for showing clients with outdated websites. In 2 minutes you have a visual proposal ready.",
    example: "Dental clinic website from the 2000s → modern redesign with professional colors, clean layout, and optimized CTAs.",
  },
  {
    id: "instagram",
    color: "pink",
    colorClass: { bg: "from-pink-500/20 to-rose-500/20", border: "border-pink-500/30", text: "text-pink-400", active: "bg-pink-500/10 border-r-2 border-pink-500", tag: "text-pink-400", tip: "bg-pink-500/5 border-pink-500/20", stepNum: "border-pink-500/30 text-pink-400 bg-pink-500/10" },
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    title: "Instagram Posts",
    subtitle: "Social media",
    tag: "Social Media",
    what: "Generates professional captions, optimized hashtags, and image ideas for your business's Instagram.",
    needs: ["Basic information about the business", "Anthropic API Key", "(Optional) Instagram Token for direct publishing"],
    steps: [
      "Click 'Instagram Posts'",
      "Fill in: business name, category, and a brief description",
      "Choose the post type: promotion, product, behind-the-scenes, or testimonial",
      "Select the tone: friendly, professional, inspiring, or fun",
      "Choose how many posts (1, 2, or 3)",
      "Copy the generated caption and hashtags",
      "(Optional) Paste an image URL to publish directly",
    ],
    tip: "For direct publishing, you need to connect your Instagram Business in Settings. The process takes 2 minutes.",
    example: "Restaurant + friendly tone + product post → a 3-paragraph caption with emojis, a reservation call-to-action, and 10 relevant hashtags.",
  },
  {
    id: "whatsapp",
    color: "green",
    colorClass: { bg: "from-green-500/20 to-emerald-500/20", border: "border-green-500/30", text: "text-green-400", active: "bg-green-500/10 border-r-2 border-green-500", tag: "text-green-400", tip: "bg-green-500/5 border-green-500/20", stepNum: "border-green-500/30 text-green-400 bg-green-500/10" },
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    title: "WhatsApp Agent",
    subtitle: "Automated support",
    tag: "24/7 support",
    what: "Creates an AI assistant for your WhatsApp Business that automatically replies to customers, any time of day.",
    needs: ["WhatsApp Business account", "Access to Meta Business Manager", "Anthropic API Key", "Server or Vercel (so the webhook is reachable)"],
    steps: [
      "Click 'WhatsApp Agent'",
      "Go to Meta Business Manager → WhatsApp → API Setup and copy the Phone Number ID and Access Token",
      "Paste the credentials into Forge",
      "Configure the agent: name, business description, hours, services, and FAQs",
      "Choose a personality (friendly, professional, direct) and language",
      "Copy the Webhook URL from Forge into the Meta Dashboard",
      "Enable the 'messages' field and verify the webhook",
      "The agent goes live — test it by sending a message",
    ],
    tip: "The agent uses your FAQs to answer the most common questions. The more detail you provide, the better the responses.",
    example: "Dental clinic → the agent answers about hours, books appointments, clarifies questions about treatments, and escalates urgent cases.",
  },
  {
    id: "seo",
    color: "emerald",
    colorClass: { bg: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/30", text: "text-emerald-400", active: "bg-emerald-500/10 border-r-2 border-emerald-500", tag: "text-emerald-400", tip: "bg-emerald-500/5 border-emerald-500/20", stepNum: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
    icon: (
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="6" />
        <path d="M20 20l-4-4" />
        <path d="M6 9h6M9 6v6" />
      </svg>
    ),
    title: "SEO Content Agent",
    subtitle: "Organic content",
    tag: "SEO",
    what: "Generates search-engine-optimized content in 5 formats: blog articles, landing page copy, meta tags, FAQs, and service descriptions — all ready to publish.",
    needs: ["Basic information about the business", "Target keywords (optional — the agent suggests the best ones)", "Anthropic API Key in Settings"],
    steps: [
      "Click 'SEO Content Agent'",
      "Choose the content type: Blog, Landing Page, Meta Tags, FAQs, or Services",
      "Fill in the business name, category, and a brief description",
      "Add target keywords (optional) and target audience",
      "Choose the tone and language",
      "Click 'Generate' and wait ~15 seconds",
      "Copy each section individually or download everything as .txt",
    ],
    tip: "For best results in Blog and Landing Page, describe the target audience well. For Meta Tags, use the exact keywords your customers search for on Google.",
    example: "Italian restaurant in Lisbon → a 350-word blog article with H1, 3 H2s, intro, conclusion, a 58-char meta title, a 155-char meta description, an SEO slug, and 5 main keywords.",
  },
  {
    id: "consulting",
    color: "amber",
    colorClass: { bg: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/30", text: "text-amber-400", active: "bg-amber-500/10 border-r-2 border-amber-500", tag: "text-amber-400", tip: "bg-amber-500/5 border-amber-500/20", stepNum: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
    icon: (
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17V13M7 17V9M11 17V11M15 17V5" />
        <path d="M3 9l4-4 4 3 5-6" />
      </svg>
    ),
    title: "Consulting Agent",
    subtitle: "Business plan",
    tag: "Strategy",
    what: "Runs an intelligent diagnosis of your business through tailored questions and generates a professional action plan as a PDF.",
    needs: ["Anthropic API Key", "10-15 minutes to answer the questions"],
    steps: [
      "Click 'Consulting Agent'",
      "Choose the area: Strategy, Marketing, Operations, Finance, HR, Technology, Product, or Sales",
      "Briefly describe your problem or goal",
      "Answer 7 diagnostic questions (text, scale, or multiple choice)",
      "Forge generates a structured plan with: summary, diagnosis, SMART goals, action plan, KPIs, and risks",
      "Download the complete plan as a professional PDF",
    ],
    tip: "At the end of the plan, Forge automatically recommends other agents relevant to your case. For example, if the problem is marketing, it suggests creating a website or automating Instagram.",
    example: "Customer acquisition problem + Marketing area → a plan with 3 phases, 5 SMART goals, 12 concrete actions, 4 KPIs, and 3 mitigated risks. PDF ready to present.",
  },
  {
    id: "security",
    color: "red",
    colorClass: { bg: "from-red-500/20 to-rose-500/20", border: "border-red-500/30", text: "text-red-400", active: "bg-red-500/10 border-r-2 border-red-500", tag: "text-red-400", tip: "bg-red-500/5 border-red-500/20", stepNum: "border-red-500/30 text-red-400 bg-red-500/10" },
    icon: (
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2L3 5v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V5l-7-3z" />
        <path d="M7 10l2 2 4-4" />
      </svg>
    ),
    title: "Security Agent",
    subtitle: "Security audit",
    tag: "Security",
    what: "Runs a passive security audit of any website: analyzes HTTP headers, forms, scripts, exposed paths, and detected technologies — without touching the server.",
    needs: ["URL of the website to audit (public)", "Anthropic API Key in Settings"],
    steps: [
      "Click 'Security Agent'",
      "Paste the URL of the website you want to audit",
      "Forge passively analyzes: HTTP headers, forms, external scripts, common paths, and technologies",
      "The AI classifies each issue by severity: Critical, High, Medium, Low, Info",
      "Receive a score from 0-100 with a rating (Critical, Weak, Fair, Good, Excellent)",
      "Download the complete report as a PDF to deliver to the client",
    ],
    tip: "The audit is 100% passive — it makes no intrusive requests, tests no active vulnerabilities, and breaks no laws. It is a surface-level analysis based on headers and public code.",
    example: "Restaurant website → score 42/100 (Weak) — missing Content-Security-Policy, contact form without CSRF protection, outdated jQuery, and an accessible /admin path.",
  },
  {
    id: "email",
    color: "cyan",
    colorClass: { bg: "from-cyan-500/20 to-sky-500/20", border: "border-cyan-500/30", text: "text-cyan-400", active: "bg-cyan-500/10 border-r-2 border-cyan-500", tag: "text-cyan-400", tip: "bg-cyan-500/5 border-cyan-500/20", stepNum: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10" },
    icon: (
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="16" height="12" rx="2" />
        <path d="M2 7l8 5 8-5" />
      </svg>
    ),
    title: "Email Marketing",
    subtitle: "Email sequences",
    tag: "Email",
    what: "Generates complete email marketing sequences for 5 scenarios: welcome, lead nurturing, promotion, customer re-engagement, and abandoned cart recovery.",
    needs: ["Basic information about the business", "Anthropic API Key in Settings"],
    steps: [
      "Click 'Email Marketing'",
      "Fill in the business name, category, and description",
      "Choose the sequence type: Welcome (5 emails), Nurture (6), Promotion (5), Reengagement (4), or Abandoned (4)",
      "Define the main product or service and the communication tone",
      "Click 'Generate Sequence' and wait ~20 seconds",
      "Each email includes: subject, pre-header, body, CTA, and send day",
      "Copy directly into your ESP (Mailchimp, ActiveCampaign, etc.)",
    ],
    tip: "The agent generates A/B variants for each email's subject line — test both versions to find which converts more. Subjects are under 60 characters so they aren't cut off on mobile.",
    example: "Dental clinic + Welcome sequence → 5 emails: welcome + first-appointment offer (day 0), oral hygiene tips (day 3), patient testimonial (day 7), premium services (day 14), urgent call (day 21).",
  },
  {
    id: "ads",
    color: "yellow",
    colorClass: { bg: "from-yellow-500/20 to-amber-500/20", border: "border-yellow-500/30", text: "text-yellow-400", active: "bg-yellow-500/10 border-r-2 border-yellow-500", tag: "text-yellow-400", tip: "bg-yellow-500/5 border-yellow-500/20", stepNum: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10" },
    icon: (
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h14v10H3z" />
        <path d="M7 17h6M10 13v4" />
        <path d="M7 8l2 2 4-4" />
      </svg>
    ),
    title: "Google Ads",
    subtitle: "Campaign copy",
    tag: "Paid Ads",
    what: "Generates complete copy for Google Ads campaigns in 4 formats: Search, Performance Max, Display, and Remarketing — with headlines, descriptions, sitelinks, and callouts within the character limits.",
    needs: ["Basic information about the business", "Anthropic API Key in Settings"],
    steps: [
      "Click 'Google Ads'",
      "Fill in the business name, category, website URL, and main service",
      "Choose the campaign type: Search, PMax, Display, or Remarketing",
      "Define the goal (traffic, leads, sales) and the target audience",
      "Click 'Generate Copy' and wait ~15 seconds",
      "Receive 2-3 ad groups with headlines (≤30 chars), descriptions (≤90 chars), sitelinks, and callouts",
      "Copy directly into Google Ads Editor or the Google Ads interface",
    ],
    tip: "Headlines and descriptions shown in red exceed Google's limits (30 and 90 characters respectively). Edit them before publishing — Google rejects copy that is over the limits.",
    example: "Gym in Lisbon + Search → 3 ad groups: Personal Training (15 headlines, 4 descriptions, 4 sitelinks), Strength Training (15+4+4), and Group Classes (15+4+4) + a list of negative keywords.",
  },
  {
    id: "calendar",
    color: "violet",
    colorClass: { bg: "from-violet-500/20 to-purple-500/20", border: "border-violet-500/30", text: "text-violet-400", active: "bg-violet-500/10 border-r-2 border-violet-500", tag: "text-violet-400", tip: "bg-violet-500/5 border-violet-500/20", stepNum: "border-violet-500/30 text-violet-400 bg-violet-500/10" },
    icon: (
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="16" height="15" rx="2" />
        <path d="M6 1v4M14 1v4M2 8h16" />
        <path d="M6 12h2M10 12h2M6 15h2" />
      </svg>
    ),
    title: "Content Calendar",
    subtitle: "Editorial calendar",
    tag: "Content",
    what: "Generates a complete 30-day editorial calendar with themes, ready-to-use captions, hashtags, posting times, and image ideas — for any social network.",
    needs: ["Basic information about the business", "Anthropic API Key in Settings"],
    steps: [
      "Click 'Content Calendar'",
      "Fill in the business name, category, and target social networks",
      "Choose the frequency: Daily (30 posts), Weekdays (~22), or 3x/week (~13)",
      "Define the priority themes and the communication tone",
      "Click 'Generate Calendar' and wait ~30 seconds",
      "Browse the calendar in a weekly grid (7 columns, full monthly view)",
      "Click any day to see the caption, hashtags, ideal time, and image idea",
    ],
    tip: "Use the content-type filters (Educational, Promotional, Entertainment, Testimonial, Behind-the-scenes) to find the right balance for your business. The ideal is 40% educational, 20% promotional, 40% other.",
    example: "Beauty salon + daily + Instagram → 30 days with fixed weekly themes: Monday (beauty tip), Wednesday (before/after), Friday (weekend promotion), Sunday (inspiration). Each post with a caption + 10 hashtags + ideal time.",
  },
];

export function DocsModal({ onClose }: Props) {
  const [active, setActive] = useState(0);
  const doc = DOCS[active];
  const c = doc.colorClass;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)), #0a0a0c", border: "1px solid rgba(255,255,255,0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top light beam */}
        <div className="pointer-events-none absolute -top-16 left-1/3 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl bg-[#E8622A]/15" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8622A]/25 to-[#E8622A]/5 border border-[#E8622A]/30 flex items-center justify-center shadow-[0_0_14px_rgba(232,98,42,0.35)]">
              <svg viewBox="0 0 20 20" className="w-4 h-4 text-[#E8622A]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 4H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4" />
                <path d="M14 2l4 4-7 7H7v-4l7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Documentation</h2>
              <p className="text-gray-600 text-xs">How to use each Forge agent</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-52 flex-shrink-0 border-r border-[#1e1e1e] py-3 overflow-y-auto bg-[#080808]">
            <p className="text-[10px] uppercase tracking-widest text-gray-700 font-medium px-4 mb-2">Agents</p>
            {DOCS.map((d, i) => (
              <button
                key={d.id}
                onClick={() => setActive(i)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                  active === i
                    ? `${d.colorClass.active} text-white`
                    : "text-gray-500 hover:text-gray-300 hover:bg-[#111]"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${d.colorClass.bg} border ${d.colorClass.border} flex items-center justify-center flex-shrink-0 ${active === i ? d.colorClass.text : "text-gray-600"}`}>
                  {d.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium leading-tight truncate">{d.title}</div>
                  <div className="text-[10px] text-gray-600 leading-tight truncate">{d.subtitle}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Agent hero */}
            <div className="px-6 pt-6 pb-5 border-b border-[#1e1e1e]">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.bg} border ${c.border} flex items-center justify-center ${c.text} flex-shrink-0`}>
                  <div className="scale-125">{doc.icon}</div>
                </div>
                <div>
                  <span className={`text-[10px] uppercase tracking-widest font-semibold ${c.tag}`}>{doc.tag}</span>
                  <h2 className="text-lg font-bold text-white leading-tight">{doc.title}</h2>
                </div>
              </div>

              {/* What it does */}
              <p className="mt-4 text-sm text-gray-400 leading-relaxed">{doc.what}</p>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* What you need */}
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-gray-600 font-medium mb-3">What you need</h3>
                <div className="space-y-2">
                  {doc.needs.map((n, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className={`w-4 h-4 rounded-full ${c.stepNum} border text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold`}>
                        ✓
                      </div>
                      <span className="text-sm text-gray-400 leading-relaxed">{n}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-gray-600 font-medium mb-3">Step by step</h3>
                <div className="space-y-2.5">
                  {doc.steps.map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`w-5 h-5 rounded-full border ${c.stepNum} text-[10px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5`}>
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-400 leading-relaxed">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tip */}
              <div className={`border ${c.tip} rounded-xl p-4`} style={{ backgroundColor: "transparent" }}>
                <div className={`flex items-center gap-1.5 mb-1.5`}>
                  <svg viewBox="0 0 16 16" className={`w-3 h-3 ${c.text}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="6" />
                    <path d="M8 5v3M8 11v.5" />
                  </svg>
                  <span className={`text-[10px] uppercase tracking-widest font-semibold ${c.text}`}>Tip</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{doc.tip}</p>
              </div>

              {/* Example */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg viewBox="0 0 16 16" className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 4h12M2 8h8M2 12h5" />
                  </svg>
                  <span className="text-[10px] uppercase tracking-widest text-gray-600 font-medium">Real example</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{doc.example}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
