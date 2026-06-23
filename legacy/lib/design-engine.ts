/**
 * Design Engine — turns a user-chosen design TYPE into a rich, skill-backed
 * design brief that drives website generation.
 *
 * It routes across the available skills depending on the chosen type:
 *   - ui-ux-pro-max (.claude/skills/ui-ux-pro-max) — BM25 search over 67 styles,
 *     57 font pairings, 96 palettes. Queried at runtime for the exact style /
 *     pairing to pull AI prompt keywords, effects, CSS hints, checklist.
 *   - taste-skill — anti-AI-slop rules (inlined below; the skill is markdown
 *     reference that was never loaded at runtime before).
 *   - minimalist-skill — editorial minimalism rules (inlined, used by the
 *     minimal type).
 *
 * The curated baseline (fonts/palette/spacing) makes output deterministic and
 * correct; the skill query enriches it with concrete design language.
 */

import { execSync } from "child_process";
import path from "path";

const SKILL_SCRIPT = path.join(process.cwd(), ".claude/skills/ui-ux-pro-max/scripts/search.py");

// ── Anti-AI-slop rules (from taste-skill, applies to every type) ────────────
const ANTI_SLOP: string[] = [
  "No emojis anywhere in the UI",
  "Off-black text (#111111 / #1a1a1a) — never pure #000000",
  "No gradient text fills, no neon glows, no purple/blue 'AI aesthetic' accents",
  "No generic 3-equal-column card walls — prefer asymmetric / alternating layouts",
  "Realistic, organic content — real prices (€99.00), real percentages (47.2%), real local names",
  "Banned clichés: 'Elevate', 'Seamless', 'Unleash', 'Next-Gen', 'Game-changer', 'Lorem Ipsum'",
  "One gray family throughout; tint shadows to the background hue (no pure-black shadows)",
  "Hover states required (background shift, scale or translate); animate transform/opacity only, 200–300ms",
];

// ── Minimalist rules (strict monochrome editorial, only for the minimal type) ─
const MINIMALIST: string[] = [
  "Strict black-on-pure-white monochrome (#FFFFFF canvas, #111111 ink) — NO colour; greys only for secondary text. Photography in black & white",
  "Bold, neutral GROTESK display headings (Archivo), often UPPERCASE and oversized — the type IS the design",
  "Swiss editorial layout: massive negative space, hairline rules, big stat numbers, eyebrow/numbered labels, an optional running marquee strip",
  "Photography overlaps the headline; circular badge/seal stamps; CTA is a black pill or a thin-outline button",
  "Sharp, confident, restrained — whitespace and contrast carry it; no gradients, no soft shadows, no rounded blobs",
  "Use inverted blocks (white-on-black) sparingly for rhythm",
];

export type ThemeMode = "light" | "dark";

export interface DesignType {
  id: string;
  label: string;       // English short label
  labelPt: string;     // Portuguese label (UI)
  descPt: string;      // Portuguese one-liner (UI card)
  theme: ThemeMode;
  fonts: { heading: string; body: string; import: string };
  palette: { primary: string; accent: string; bg: string; text: string };
  spacingScale: "compact" | "comfortable" | "generous";
  cornerRadius: "sharp" | "soft" | "pill";
  styleQuery: string;       // exact-ish style name for ui-ux styles domain
  typographyQuery: string;  // pairing name for ui-ux typography domain
  vibeKeywords: string;     // injected into planner + Unsplash query
  principles: string[];     // hard rules layered on top of templates
  swatch: string[];         // hex chips for the UI picker
}

function gf(families: string): string {
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

// ── Curated, premium, mutually-distinct design types ────────────────────────
export const DESIGN_TYPES: DesignType[] = [
  {
    id: "auto",
    label: "Recommended",
    labelPt: "Recomendado",
    descPt: "A IA escolhe o melhor estilo para a categoria",
    theme: "light",
    fonts: { heading: "Playfair Display", body: "Lora", import: gf("family=Playfair+Display:wght@400;600;700&family=Lora:wght@400;500") },
    palette: { primary: "#1a1a2e", accent: "#c2703d", bg: "#ffffff", text: "#1a1a1a" },
    spacingScale: "comfortable",
    cornerRadius: "soft",
    styleQuery: "modern clean minimalism dynamic",
    typographyQuery: "modern professional",
    vibeKeywords: "modern dynamic professional bright",
    principles: ["Lean modern and dynamic: bold display headings, generous whitespace, tasteful motion and hover lift"],
    swatch: ["#1a1a2e", "#c2703d", "#f7f6f3"],
  },
  {
    id: "minimal",
    label: "Minimal",
    labelPt: "Minimalista",
    descPt: "Preto & branco estrito, grotesk forte, editorial",
    theme: "light",
    fonts: { heading: "Archivo", body: "Inter", import: gf("family=Archivo:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600") },
    palette: { primary: "#111111", accent: "#111111", bg: "#ffffff", text: "#111111" },
    spacingScale: "generous",
    cornerRadius: "sharp",
    styleQuery: "Minimalism Swiss Style monochrome editorial",
    typographyQuery: "neutral grotesk heavy uppercase",
    vibeKeywords: "minimal monochrome black white swiss editorial bold grotesk",
    principles: MINIMALIST,
    swatch: ["#111111", "#6b7280", "#ffffff"],
  },
  {
    id: "elegant",
    label: "Elegant",
    labelPt: "Clássico Elegante",
    descPt: "Serif refinada, atemporal, alto contraste",
    theme: "light",
    fonts: { heading: "Playfair Display", body: "Lora", import: gf("family=Playfair+Display:wght@400;500;600;700&family=Lora:wght@400;500") },
    palette: { primary: "#1f2937", accent: "#9a7b4f", bg: "#fbfaf8", text: "#1a1a1a" },
    spacingScale: "generous",
    cornerRadius: "soft",
    styleQuery: "Editorial Grid Magazine",
    typographyQuery: "Classic Elegant Playfair",
    vibeKeywords: "elegant refined editorial",
    principles: ["High contrast between elegant serif headings and clean body", "Two-tone headings: line 2 italic in the accent color", "Generous whitespace, restrained palette"],
    swatch: ["#1f2937", "#9a7b4f", "#fbfaf8"],
  },
  {
    id: "luxury",
    label: "Luxury",
    labelPt: "Luxo / Premium",
    descPt: "Cinematic dark, serif elegante, dourado discreto",
    theme: "dark",
    fonts: { heading: "Cormorant", body: "Montserrat", import: gf("family=Cormorant:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600") },
    palette: { primary: "#f1ece2", accent: "#c6a35c", bg: "#0c0a08", text: "#f1ece2" },
    spacingScale: "generous",
    cornerRadius: "sharp",
    styleQuery: "Cinematic luxury editorial dark",
    typographyQuery: "Luxury Serif Cormorant",
    vibeKeywords: "luxury cinematic dark gold bronze elegant serif automotive premium",
    principles: [
      "Cinematic dark canvas — warm near-black (#0C0A08) with a soft amber/bronze ambient glow bleeding from one corner; let imagery and negative space carry it",
      "Elegant high-contrast display SERIF (Cormorant): oversized hero brand/word with thin-to-thick contrast (Didot/Bodoni feel)",
      "Single muted GOLD / bronze accent (#C6A35C) used only on a small CTA or a hairline — everything else is monochrome",
      "Restraint & editorial detail: hairline rules, UPPERCASE eyebrow labels (e.g. 'OUR PRINCIPLES'), numbered lists (01 / 02 / 03), wide letter-spacing on small caps",
      "Cinematic photography (product / architecture) with a dark vignette; a slim gold CTA pill or thin-outline buttons",
      "No bright colours, no heavy shadows — luxury comes from contrast, type and generous space",
    ],
    swatch: ["#0c0a08", "#c6a35c", "#1a1611"],
  },
  {
    id: "warm",
    label: "Warm",
    labelPt: "Acolhedor / Rústico",
    descPt: "Cream + terracota + sage, serif elegante, artesanal",
    theme: "light",
    fonts: { heading: "Fraunces", body: "Mulish", import: gf("family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Mulish:wght@300;400;500;600") },
    palette: { primary: "#3a2418", accent: "#c2703d", bg: "#f6efe2", text: "#2a2018" },
    spacingScale: "generous",
    cornerRadius: "soft",
    styleQuery: "Organic Biophilic artisanal editorial",
    typographyQuery: "warm friendly editorial serif",
    vibeKeywords: "warm rustic artisanal farm-to-table cream terracotta sage natural",
    principles: [
      "Warm cream / off-white canvas (#F6EFE2); use deep espresso-brown (#3A2418) blocks for contrast sections",
      "Earthy palette: cream + terracotta/rust (#C2703D) + sage/olive green (#6F7A52) + muted gold — no cold greys",
      "Elegant high-contrast display SERIF headlines (Fraunces); make one key word bold, optionally a script/italic accent on a single word",
      "Soft rounded cards (rounded-2xl / rounded-3xl), generous spacing, pill buttons; warmth via tints, not heavy shadows",
      "Natural / artisanal photography (food, farm, craft); subtle botanical leaf/wheat motifs and faint gold line-art ornaments in the background",
      "Refined details: small eyebrow labels with a tiny leaf (e.g. 'Made in …'), a circular badge/seal logo feel; inviting, premium-craft tone",
    ],
    swatch: ["#3a2418", "#c2703d", "#f3ead9"],
  },
  {
    id: "bold",
    label: "Bold",
    labelPt: "Bold / Editorial",
    descPt: "Grotesk gigante, blocos de cor, tags mono, impacto",
    theme: "light",
    fonts: { heading: "Archivo", body: "Archivo", import: gf("family=Archivo:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700") },
    palette: { primary: "#111111", accent: "#ff4d2e", bg: "#ffffff", text: "#111111" },
    spacingScale: "comfortable",
    cornerRadius: "sharp",
    styleQuery: "Exaggerated Minimalism oversized editorial",
    typographyQuery: "bold grotesque heavy",
    vibeKeywords: "bold high-contrast editorial oversized grotesk color-block",
    principles: [
      "HUGE oversized bold grotesk display (Archivo, weight 900), tight tracking — the type IS the hero, often wrapping around or sitting behind cutout photography",
      "Strict high contrast: white and/or solid black sections + ONE hot accent (orange #FF4D2E) used as a full colour BLOCK or a highlight word",
      "Editorial detail: monospace bracket/tag labels in Space Mono — e.g. '// AFFORDABLE', '{{ STRAIGHT FORWARD }}', '[ Since 2017 ]'",
      "Cutout photography overlapping the headline; black pill CTAs; hard-edged colour-block section breaks",
      "Impact via scale, contrast and the single accent — no soft pastel washes, no heavy shadows",
      "Optional condensed / all-caps treatment for maximum punch",
    ],
    swatch: ["#111111", "#ff4d2e", "#ffffff"],
  },
  {
    id: "playful",
    label: "Playful",
    labelPt: "Vibrante / Divertido",
    descPt: "Neon magenta + lime, blocos bento, rounded, energia",
    theme: "light",
    fonts: { heading: "Fredoka", body: "Nunito", import: gf("family=Fredoka:wght@500;600;700&family=Nunito:wght@400;500;600;700;800") },
    palette: { primary: "#ec1e63", accent: "#b4e019", bg: "#ffffff", text: "#141414" },
    spacingScale: "comfortable",
    cornerRadius: "pill",
    styleQuery: "Vibrant Bento Block neon playful",
    typographyQuery: "friendly rounded heavy display",
    vibeKeywords: "vibrant neon playful bento magenta lime electric energetic youthful",
    principles: [
      "Electric, high-saturation palette: hot magenta/pink (#EC1E63) + acid lime-green (#B4E019) + a teal pop — bold SOLID colour blocks separated by white space",
      "Heavy ROUNDED display headings (Fredoka), big and friendly; punchy, short copy",
      "Bento-grid layout: chunky rounded cards (rounded-3xl), each a solid colour block; generous radius everywhere, pill buttons",
      "Playful energy: burst/star badges (e.g. '50%'), sticker shapes, chat-bubble motifs, bold icons; lively hover bounce",
      "High contrast and confident — colour does the work; NO pastel washes, no thin type",
      "Optional vivid gradient hero (orange→pink→purple) for a poster-like splash",
    ],
    swatch: ["#ec1e63", "#b4e019", "#ffffff"],
  },
  {
    id: "tech",
    label: "Tech",
    labelPt: "Tech / Crypto",
    descPt: "Dark premium, glassmorphism, glow ambiente, gráficos",
    theme: "dark",
    fonts: { heading: "Space Grotesk", body: "Inter", import: gf("family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600") },
    palette: { primary: "#e8ecff", accent: "#7c8cff", bg: "#0a0e1a", text: "#eef1fb" },
    spacingScale: "comfortable",
    cornerRadius: "soft",
    styleQuery: "Glassmorphism dark dashboard SaaS premium",
    typographyQuery: "modern geometric sans tech",
    vibeKeywords: "dark glassmorphism crypto saas ambient glow premium dashboard",
    principles: [
      "Dark canvas — deep navy / near-black (#0A0E1A), elevated surfaces #121829; NEVER a light background",
      "SIGNATURE: a soft ambient radial GLOW behind the hero (indigo/violet, or a subtle pink→blue gradient bleed) — the hero content floats on this light",
      "Glassmorphic cards/panels: frosted (backdrop-blur), 1px white/10 borders, gentle inner glow, rounded-2xl",
      "Big bold geometric sans headline, often TWO-TONE (white + an accent/gradient on part of the phrase)",
      "Pill nav (rounded-full, glassy); a single high-contrast CTA (white or accent pill)",
      "Stat cards with big numbers + mini sparkline/chart motifs; a dashboard / product-mockup feel where it fits",
      "One electric accent (indigo #7C8CFF) used sparingly on dark; muted secondary text (#9AA3C7)",
    ],
    swatch: ["#0a0e1a", "#7c8cff", "#121829"],
  },
  {
    id: "dark",
    label: "Dark Premium",
    labelPt: "Dark Premium",
    descPt: "Fundo escuro, contraste dramático, exclusivo",
    theme: "dark",
    fonts: { heading: "Sora", body: "Manrope", import: gf("family=Sora:wght@400;500;600;700;800&family=Manrope:wght@300;400;500;600") },
    palette: { primary: "#e8e2d6", accent: "#d4a056", bg: "#0b0b0c", text: "#f5f5f4" },
    spacingScale: "generous",
    cornerRadius: "soft",
    styleQuery: "Swiss Modernism clean",
    typographyQuery: "modern geometric sans",
    vibeKeywords: "dark moody dramatic premium",
    principles: ["Dark canvas (#0B0B0C), elevated surfaces (#141416), warm gold accent", "High contrast light text (#F5F5F4) on dark; muted text #A1A1AA", "Borders as white/10; glow-free, restrained elegance"],
    swatch: ["#0b0b0c", "#d4a056", "#141416"],
  },
  {
    id: "pixel",
    label: "Pixel",
    labelPt: "Pixel / Retro",
    descPt: "Fonte pixel retro, fundo neutro, laranja vivo, layout editorial",
    theme: "light",
    fonts: { heading: "Space Grotesk", body: "Inter", import: gf("family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Press+Start+2P") },
    palette: { primary: "#111111", accent: "#f15a24", bg: "#ececec", text: "#1a1a1a" },
    spacingScale: "generous",
    cornerRadius: "soft",
    styleQuery: "Retro Pixel Y2K 3D claymorphism editorial",
    typographyQuery: "bold grotesque pixel display",
    vibeKeywords: "retro pixel 3d clay render playful bold orange neutral",
    principles: [
      "Neutral light-grey canvas (#ECECEC) with ONE vivid orange accent (#F15A24) and solid black CTAs — no other colours",
      "SIGNATURE: render one or two GIANT hero words (e.g. the brand name) in the 'Press Start 2P' pixel font, oversized, layered around the hero — this is the defining trait of this style",
      "Headline in a heavy uppercase grotesk (Space Grotesk 700), tight tracking, large scale, asymmetric placement",
      "Frosted glass nav pill, centred, rounded-full; a solid black 'Login / Register' (or primary) button top-right",
      "Editorial details: a big stat callout (e.g. '132% GROWTH'), an optional [n / total] slide marker, generous whitespace, asymmetric layout",
      "Playful floating objects / 3D-clay-style imagery around the hero when images allow; soft shadows, rounded cards (no harsh borders)",
    ],
    swatch: ["#1a1a1a", "#f15a24", "#ececec"],
  },
];

export function getDesignType(id?: string): DesignType {
  return DESIGN_TYPES.find((d) => d.id === id) ?? DESIGN_TYPES[0];
}

/** Lightweight catalog for the client picker (no server-only fields needed). */
export const DESIGN_TYPE_OPTIONS = DESIGN_TYPES.map((d) => ({
  id: d.id,
  label: d.labelPt,
  desc: d.descPt,
  swatch: d.swatch,
  theme: d.theme,
}));

// ── ui-ux-pro-max skill query + parse ───────────────────────────────────────
function querySkill(query: string, domain: string): Record<string, string> {
  try {
    const safe = query.replace(/[^a-z0-9 ]/gi, "").slice(0, 80);
    const out = execSync(`python3 "${SKILL_SCRIPT}" "${safe}" --domain ${domain} --max-results 1`, { timeout: 8000 }).toString();
    const fields: Record<string, string> = {};
    for (const line of out.split("\n")) {
      const m = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/);
      if (m) fields[m[1].trim()] = m[2].trim();
    }
    return fields;
  } catch {
    return {};
  }
}

export interface DesignBrief {
  typeId: string;
  label: string;
  theme: ThemeMode;
  isCustom: boolean; // false when "auto"
  fonts: { heading: string; body: string; import: string };
  palette: { primary: string; accent: string; bg: string; text: string };
  spacingScale: DesignType["spacingScale"];
  cornerRadius: DesignType["cornerRadius"];
  styleName: string;
  aestheticKeywords: string;
  effects: string;
  cssKeywords: string;
  fontPairingNote: string;
  principles: string[];
  vibeKeywords: string;
}

/**
 * Resolve the chosen design type into a concrete brief, enriched with the
 * ui-ux-pro-max skill. `instructions` only nudges Unsplash/vibe keywords here;
 * the planner still treats raw user instructions as highest priority.
 */
export function buildDesignBrief(designTypeId: string | undefined, category: string, instructions = ""): DesignBrief {
  const dt = getDesignType(designTypeId);
  const isCustom = dt.id !== "auto";

  const styleFields = querySkill(`${dt.styleQuery} ${isCustom ? "" : category}`.trim(), "style");
  const typoFields = querySkill(dt.typographyQuery, "typography");

  const trim = (s = "", n = 280) => (s.length > n ? s.slice(0, n) + "…" : s);

  // Blend any aesthetic keywords the user typed into the vibe (drives images).
  const userVibe = extractVibeKeywords(instructions);

  return {
    typeId: dt.id,
    label: dt.label,
    theme: dt.theme,
    isCustom,
    fonts: dt.fonts,
    palette: dt.palette,
    spacingScale: dt.spacingScale,
    cornerRadius: dt.cornerRadius,
    styleName: styleFields["Style Category"] || dt.label,
    aestheticKeywords: trim(styleFields["AI Prompt Keywords"] || styleFields["Keywords"] || dt.vibeKeywords),
    effects: trim(styleFields["Effects & Animation"] || "", 200),
    cssKeywords: trim(styleFields["CSS/Technical Keywords"] || "", 200),
    fontPairingNote: typoFields["Notes"] || `${dt.fonts.heading} headings + ${dt.fonts.body} body`,
    principles: dt.principles,
    vibeKeywords: [dt.vibeKeywords, userVibe].filter(Boolean).join(" ").trim(),
  };
}

/** Extract aesthetic adjectives from free-text user instructions. */
export function extractVibeKeywords(instructions = ""): string {
  const ins = instructions.toLowerCase();
  const hits: string[] = [];
  const map: Record<string, string> = {
    "modern|moderno|contempor": "modern",
    "minimal|minimalist|minimalista|clean|limpo": "minimal",
    "luxury|luxuos|premium|elegant|elegante|sofist": "elegant luxury",
    "rustic|rústic|rustico|tradicional|traditional|warm|cozy|aconcheg": "warm rustic",
    "industrial|urban|urbano|raw": "industrial",
    "playful|vibrant|fun|divert|colorful|colorido": "vibrant",
    "dark|escuro|moody": "dark moody",
    "bold|forte|impact": "bold",
  };
  for (const [re, kw] of Object.entries(map)) {
    if (new RegExp(`\\b(${re})`).test(ins)) hits.push(kw);
  }
  return Array.from(new Set(hits.join(" ").split(" "))).join(" ").trim();
}

/**
 * Render the brief as a prompt block for HTML generation. This replaces the
 * old thin `UI/UX: <300 chars>` line with concrete, skill-backed direction.
 */
export function formatDesignBriefForPrompt(brief: DesignBrief, hasReference: boolean = false): string {
  const principles = [...brief.principles, ...ANTI_SLOP].map((p) => `  • ${p}`).join("\n");
  const heading = hasReference
    ? "DEFAULT PRINCIPLES — a DESIGN REFERENCE image is attached and OVERRIDES the palette, typography, theme and layout above. Sample the reference's actual colours and match its look; use the brief only where the reference is silent:"
    : "NON-NEGOTIABLE PRINCIPLES:";
  return `═══ DESIGN BRIEF — "${brief.label}" (${brief.styleName}) ═══
Aesthetic: ${brief.aestheticKeywords}
${brief.effects ? `Effects/animation: ${brief.effects}` : ""}
Typography: ${brief.fonts.heading} (headings) + ${brief.fonts.body} (body) — ${brief.fontPairingNote}
Theme: ${brief.theme}
${heading}
${principles}
══════════════════════════════════════

${ART_DIRECTION}`;
}

/**
 * Global art-direction bar injected into every generation prompt. Pushes output
 * away from the generic "AI template" look toward bespoke, modern, studio-grade design.
 */
export const ART_DIRECTION = `🎨 ART DIRECTION — Awwwards / Lovable-grade. This must look BESPOKE, not a generic template:
- Do NOT produce the cliché hero (full-bleed photo + flat black overlay + centered white heading) or three identical stacked card rows — that reads as AI slop. Design each section intentionally.
- Typography: confident display headings (text-5xl→text-7xl, font-bold, tracking-tight, leading-[1.05]); strong hierarchy; body text-slate-600 leading-relaxed at ~65ch. Two-tone headings (second line italic in the accent) are welcome.
- Layout: editorial + asymmetric. Vary rhythm and alignment, alternate image-left/right, group related items in bento-style cards, use generous whitespace. Never center everything.
- Depth & finish: soft layered shadows (shadow-xl/2xl) tinted to the background; hairline borders (border-black/5); rounded-2xl/3xl media; one tasteful gradient or accent-tinted focal block (no neon, no pure #000). Use the single accent color deliberately.
- Imagery: place the provided photos editorially — full-bleed split, framed (rounded-3xl + shadow-2xl), or overlapping cards — not merely as a dark hero wash.
- Interactions: every button/card/link has a tasteful hover state (lift / color / shadow).
Ship what a top design studio would ship.`;

interface HeroOpts {
  name: string;
  overline: string;
  image: string;
  accent: string;
  primary: string;
  ctaPrimary: string;
  ctaSecondary: string;
  contactId?: string;
  servicesId?: string;
  multipage?: boolean; // hero CTAs become page links (#/contacto) with no onclick
}

/**
 * Varied, modern hero direction — replaces the single hard-coded hero so every
 * generated site doesn't look identical. The model picks the best of 4 layouts.
 */
export function heroGuidance(o: HeroOpts): string {
  const contact = o.contactId || "contact";
  const services = o.servicesId || "services";
  const cHref = o.multipage ? `#/${contact}` : `#${contact}`;
  const sHref = o.multipage ? `#/${services}` : `#${services}`;
  const ctaNote = o.multipage
    ? `a primary button "${o.ctaPrimary}" as a plain link href="${cHref}" and a secondary button "${o.ctaSecondary}" as a plain link href="${sHref}" — NO onclick handler (a router switches pages on hash change; never call querySelector on a "#/..." value)`
    : `a primary button "${o.ctaPrimary}" and a secondary button "${o.ctaSecondary}" (real onclick smooth-scroll to ${cHref} / ${sHref})`;
  return `HERO (id="home") — design an ORIGINAL, striking hero. Pick the ONE layout below that best fits this business and the chosen design style, and build it fully and beautifully. Vary your choice by business — do NOT always pick the same one, and do NOT default to a centered dark-overlay photo.
Image to use: ${o.image}
Accent color: ${o.accent} · Primary: ${o.primary}
Every hero MUST include: a small overline ("${o.overline}"), a bold headline for "${o.name}" (two-tone allowed — second part in <span class="italic" style="color:${o.accent}">), a 1-sentence value proposition, ${ctaNote}. It must feel premium on first paint and leave space below the fixed navbar (pt-28+).

Choose ONE layout:
A) SPLIT EDITORIAL — <section id="home" class="relative pt-32 pb-20 px-6"> with <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">. LEFT: overline + huge headline + value prop + CTAs + a small trust row (rating ★ / years / clients). RIGHT: <img src="${o.image}" class="w-full aspect-[4/5] object-cover rounded-3xl shadow-2xl"> with an OPTIONAL floating glass stat card (absolute, backdrop-blur-xl, bg-white/70, border border-white/40, rounded-2xl) overlapping a corner.
B) BIG-TYPE MINIMAL — clean tinted background (page bg + a large blurred accent blob via an absolute rounded-full element at low opacity — NOT a photo wash). Massive left-aligned headline, value prop, CTAs, then a thin strip of 3 small rounded images (from the content set) below. No dark overlay.
C) ASYMMETRIC OFFSET — a wide headline up top; the image in a rounded-3xl frame offset to one side with a solid accent shape behind it (absolute, -z-10, rounded-3xl, bg accent/10); 1–2 floating metric cards overlapping the image edge.
D) IMAGE HERO DONE RIGHT — full-bleed <section id="home" class="relative min-h-[88vh] flex items-center" style="background-image:url('${o.image}');background-size:cover;background-position:center"> with a LIGHT directional gradient overlay (bg-gradient-to-r from-black/70 via-black/30 to-transparent) and the content in a LEFT-aligned contained block (max-w-xl, not centered): headline white, value prop white/80, CTAs.

Build the chosen hero with real spacing, depth, and polish.`;
}

/**
 * Dark-theme translation instructions. The section templates are authored with
 * light-mode Tailwind classes; when a dark brief is chosen we ask the model to
 * translate surface classes consistently instead of duplicating every template.
 */
export function darkThemeInstruction(brief: DesignBrief): string {
  if (brief.theme !== "dark") return "";
  return `
🌑 DARK THEME OVERRIDE (the section specs below use light-mode classes — translate EVERY occurrence):
- bg-white → bg-[${brief.palette.bg}]   |   bg-slate-50 / bg-stone-50 → bg-[#141416]
- text-slate-900 → text-[${brief.palette.text}]   |   text-slate-500 / text-slate-400 → text-[#A1A1AA]   |   text-slate-600 → text-[#C4C4C8]
- border-slate-100 / border-slate-200 → border-white/10
- footer bg-slate-900 → bg-[#050506]
- form/card surfaces: bg-white → bg-[#141416] with border-white/10
- CRITICAL — the "primary" color (${brief.palette.primary}) is a LIGHT text color here, not a button fill. Render every primary CTA button (class bg-primary text-white) as bg-[${brief.palette.accent}] text-[${brief.palette.bg}] (gold fill, dark text). Keep bg-primary/10 chips and text-primary links as-is (they read well on dark).
- Keep the hero dark overlay; ensure all text meets 4.5:1 contrast on the dark canvas.`;
}
