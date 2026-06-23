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
    what: "Generates professional captions, optimized hashtags and image ideas for Instagram. Pre-fills from your active client and tailors the copy to their business. Optional direct publishing if you connect an Instagram Business account.",
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
    what: "Generates search-engine-optimized content in 5 formats: blog articles, landing page copy, meta tags, FAQs, and service descriptions — all ready to publish. Pre-fills from your active client and tailors everything to their business.",
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
    what: "Runs an intelligent diagnosis of your business through tailored questions and generates a professional action plan as a PDF. Pre-fills from your active client and grounds the plan in their real business context.",
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
    what: "Runs a real, passive security audit of any website: a live TLS certificate check, HTTPS enforcement and HTTP→HTTPS redirect, security headers (CSP and its quality, HSTS, X-Frame-Options…), cookie flags (Secure/HttpOnly/SameSite), mixed content, Subresource Integrity, exposed sensitive paths (.env / .git), and page-content issues.",
    needs: ["URL of the website to audit (public)", "Anthropic API Key in Settings"],
    steps: [
      "Open 'Security Agent'",
      "Paste the URL of the website you want to audit",
      "Forge runs the network checks: TLS handshake (protocol + certificate), HTTP→HTTPS redirect, security headers, cookie flags, mixed content and SRI",
      "It probes common sensitive paths (.env, .git/config, phpinfo…) and verifies the actual response",
      "The AI reviews the page content for hardcoded secrets, insecure forms and outdated libraries",
      "You get a score with a rating (Secure / Moderate / Vulnerable / Critical), the real issues by severity, a 'Passed checks' list, and a PDF report",
    ],
    tip: "100% passive and per-site: TLS, cookies, headers and redirects vary by website, so every report is genuinely different — no generic boilerplate. Run it on 2-3 sites to compare.",
    example: "Restaurant website → 'Vulnerable': missing Content-Security-Policy and HSTS, cookies without the Secure flag, TLS certificate valid for 41 more days, no mixed content (passed), and an accessible /admin path.",
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
    what: "Generates complete email marketing sequences for 5 scenarios: welcome, lead nurturing, promotion, customer re-engagement, and abandoned cart recovery. Pre-fills from your active client and tailors the copy to their business.",
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
    what: "Generates complete copy for Google Ads campaigns in 4 formats: Search, Performance Max, Display, and Remarketing — with headlines, descriptions, sitelinks, and callouts within the character limits. Pre-fills from your active client and tailors the copy to their business.",
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
    what: "Generates a complete 30-day editorial calendar with themes, ready-to-use captions, hashtags, posting times, and image ideas — for any social network. Pre-fills from your active client and tailors everything to their business.",
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
  {
    id: "social",
    color: "fuchsia",
    colorClass: { bg: "from-fuchsia-500/20 to-pink-500/20", border: "border-fuchsia-500/30", text: "text-fuchsia-400", active: "bg-fuchsia-500/10 border-r-2 border-fuchsia-500", tag: "text-fuchsia-400", tip: "bg-fuchsia-500/5 border-fuchsia-500/20", stepNum: "border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-500/10" },
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="13" height="13" rx="4" />
        <circle cx="9.5" cy="9.5" r="2.6" />
        <circle cx="18.5" cy="18.5" r="3" />
        <path d="M20.7 20.7L23 23" strokeLinecap="round" />
      </svg>
    ),
    title: "Social Analyzer",
    subtitle: "Instagram audit",
    tag: "Social Media",
    what: "Audits any Instagram profile — your client's, a prospect's, or a competitor's — and returns a scored report: engagement, content pillars, hashtag strategy, bio, strengths, issues, recommendations and a 7-day content plan.",
    needs: ["An Instagram handle or profile URL", "(Optional) a screenshot of the profile for a real visual content audit", "Anthropic API Key in Settings"],
    steps: [
      "Open 'Social Analyzer'",
      "Paste the Instagram handle or URL (e.g. @business or instagram.com/business)",
      "Optionally drop a screenshot of the profile + feed for a visual content audit",
      "Click 'Analyze profile' and wait up to a minute",
      "Read the score, engagement, content pillars, issues and recommendations",
      "Use the 7-day content plan — or hand it to the Instagram Posts agent to generate the posts",
    ],
    tip: "No login or account connection needed — it works on any public profile, which makes it a sales weapon: analyse a prospect's Instagram live in a meeting. With an APIFY_TOKEN configured the handle alone pulls the posts automatically; without it, add a screenshot for the deepest content analysis.",
    example: "A competitor restaurant profile → score 61/100 ('Average'), 1.8% engagement, pillars: dishes / behind-the-scenes / promos, issues: inconsistent posting + weak bio CTA, plus a tailored 7-day plan.",
  },
];

function BackBtn({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} className="w-8 h-8 rounded-lg border border-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white hover:border-[#E8622A]/40 transition shrink-0" title={title}>
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
    </button>
  );
}

// Documentation as a full page: a grid of agent cards -> a per-agent detail with a
// (placeholder) walkthrough video + the explanation, steps, tip and example.
export function DocsPage({ onClose }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  // ── Grid of agent cards ──────────────────────────────────────────────────
  if (selected === null) {
    return (
      <div className="w-full max-w-5xl mx-auto fade-up">
        <div className="flex items-center gap-3 mb-7">
          <BackBtn onClick={onClose} title="Back" />
          <div>
            <h1 className="text-xl font-semibold text-white">Documentation</h1>
            <p className="text-gray-600 text-xs">How each agent works — pick one to learn more.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOCS.map((d, i) => (
            <button
              key={d.id}
              onClick={() => setSelected(i)}
              className="group relative overflow-hidden text-left p-5 rounded-2xl border border-white/[0.07] hover:-translate-y-0.5 transition-all"
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)), #0b0b0d" }}
            >
              <span className={`pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-44 h-24 rounded-full blur-3xl bg-gradient-to-br ${d.colorClass.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${d.colorClass.bg} border ${d.colorClass.border} flex items-center justify-center ${d.colorClass.text} mb-3`}>
                {d.icon}
              </div>
              <span className={`relative text-[10px] uppercase tracking-widest font-semibold ${d.colorClass.tag}`}>{d.tag}</span>
              <div className="relative text-white font-semibold mt-0.5">{d.title}</div>
              <p className="relative text-xs text-gray-500 leading-relaxed mt-1.5">{d.what}</p>
              <span className="relative inline-flex items-center gap-1 text-xs mt-3 text-gray-600 group-hover:text-white transition-colors">
                Learn more
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Per-agent detail ─────────────────────────────────────────────────────
  const doc = DOCS[selected];
  const c = doc.colorClass;
  return (
    <div className="w-full max-w-3xl mx-auto fade-up">
      <div className="flex items-center gap-3 mb-6">
        <BackBtn onClick={() => setSelected(null)} title="All docs" />
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.bg} border ${c.border} flex items-center justify-center ${c.text} shrink-0`}>
            {doc.icon}
          </div>
          <div>
            <span className={`text-[10px] uppercase tracking-widest font-semibold ${c.tag}`}>{doc.tag}</span>
            <h1 className="text-lg font-bold text-white leading-tight">{doc.title}</h1>
          </div>
        </div>
      </div>

      {/* Walkthrough video (placeholder for now) */}
      <div
        className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/[0.07] mb-6"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)), #0a0a0c" }}
      >
        <span className={`pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full blur-3xl bg-gradient-to-br ${c.bg} opacity-40`} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500">
          <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center backdrop-blur-sm">
            <svg viewBox="0 0 24 24" className="w-6 h-6 ml-0.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </div>
          <span className="text-xs">Walkthrough video coming soon</span>
        </div>
      </div>

      <div className="glow-card rounded-2xl p-6 space-y-6">
        <p className="text-sm text-gray-300 leading-relaxed">{doc.what}</p>

        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-gray-600 font-medium mb-3">What you need</h3>
          <div className="space-y-2">
            {doc.needs.map((n, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`w-4 h-4 rounded-full ${c.stepNum} border text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-bold`}>✓</div>
                <span className="text-sm text-gray-400 leading-relaxed">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-gray-600 font-medium mb-3">Step by step</h3>
          <div className="space-y-2.5">
            {doc.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`w-5 h-5 rounded-full border ${c.stepNum} text-[10px] flex items-center justify-center shrink-0 font-bold mt-0.5`}>{i + 1}</span>
                <span className="text-sm text-gray-400 leading-relaxed">{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`border ${c.tip} rounded-xl p-4`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg viewBox="0 0 16 16" className={`w-3 h-3 ${c.text}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6" /><path d="M8 5v3M8 11v.5" /></svg>
            <span className={`text-[10px] uppercase tracking-widest font-semibold ${c.text}`}>Tip</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">{doc.tip}</p>
        </div>

        <div className="bg-[#0e0e10] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg viewBox="0 0 16 16" className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12M2 8h8M2 12h5" /></svg>
            <span className="text-[10px] uppercase tracking-widest text-gray-600 font-medium">Real example</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">{doc.example}</p>
        </div>
      </div>
    </div>
  );
}
