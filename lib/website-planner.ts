import Anthropic from "@anthropic-ai/sdk";

/**
 * A structured plan that drives website generation.
 * Generated BEFORE HTML generation to give Claude concrete design decisions
 * rather than letting it improvise. Inspired by Lovable's "Plan Mode".
 */
export interface WebsitePlan {
  // Visual identity
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  fontStyle: "serif" | "sans-serif";

  // Brand
  brandPersonality: string;
  suggestedTagline: string;

  // Design direction (NEW — drives concrete design choices)
  tone: string;              // 1 sentence — emotional feeling the site should evoke
  visualStyle: string;       // 1 sentence — shadows, spacing, textures, rounding
  spacingScale: "compact" | "comfortable" | "generous";
  cornerRadius: "sharp" | "soft" | "pill";

  // Per-section content direction (NEW — replaces generic templates)
  sectionHints: {
    hero: string;
    about: string;
    services?: string;
    menu?: string;
    hours?: string;
    whyUs?: string;
    team?: string;
    contact: string;
  };

  // Business-specific image search queries (NEW — drives Unsplash search)
  heroImageQuery: string;    // 2-5 word query for hero background — specific to the business
  contentImageQuery: string; // 2-5 word query for section/content images
}

const DEFAULT_PLAN: WebsitePlan = {
  primaryColor: "#1a1a2e",
  accentColor: "#e94560",
  bgColor: "#ffffff",
  fontStyle: "sans-serif",
  brandPersonality: "professional and welcoming",
  suggestedTagline: "",
  tone: "Professional, approachable, and confident",
  visualStyle: "Clean lines, generous whitespace, soft shadows, rounded corners",
  spacingScale: "comfortable",
  cornerRadius: "soft",
  sectionHints: {
    hero: "Strong opening with clear value proposition",
    about: "Tell the story, build trust",
    contact: "Make it effortless to reach out",
  },
  heroImageQuery: "modern professional business",
  contentImageQuery: "modern business interior",
};

interface PlanInput {
  anthropic: Anthropic;
  imageBlocks: Anthropic.ImageBlockParam[];
  businessName: string;
  category: string;
  instructions: string;
  isFood: boolean;
  showTeam: boolean;
  model: string;
}

/**
 * Produce a structured website plan using Claude (Vision if photos provided).
 * Falls back silently to sensible defaults on any error.
 */
export async function planWebsite(input: PlanInput): Promise<WebsitePlan> {
  const { anthropic, imageBlocks, businessName, category, instructions, isFood, showTeam, model } = input;

  const hasPhotos = imageBlocks.length > 0;

  const sectionsNeeded = [
    "hero",
    "about",
    isFood ? "menu" : "services",
    isFood ? "hours" : "whyUs",
    ...(showTeam ? ["team"] : []),
    "contact",
  ];

  const promptText = `You are a senior design director planning a premium, Lovable-quality website.

Business: "${businessName}"
Category: ${category}
Type: ${isFood ? "food/hospitality" : "professional service"}
${showTeam ? "Team section will be included." : ""}

${instructions ? `🎯 USER REQUIREMENTS (highest priority — ALL design decisions must reflect these):\n${instructions}\n` : ""}
${hasPhotos ? "Business photos are attached — extract brand colors and personality from them." : "No photos provided — base decisions on the business name and category."}

Translate any aesthetic keywords from the user (modern, rustic, luxury, minimal, cozy, elegant, industrial, warm, playful, sophisticated) into CONCRETE design choices: colors, fonts, spacing, corner radius.

Output a JSON plan with this exact shape:
{
  "primaryColor": "#hex — dominant brand color",
  "accentColor": "#hex — complementary highlight (often warmer or bolder)",
  "bgColor": "#hex — clean backdrop, usually near-white or warm off-white",
  "fontStyle": "serif OR sans-serif — serif for traditional/elegant/hospitality, sans-serif for modern/tech/minimal",
  "brandPersonality": "1 phrase capturing tone and atmosphere",
  "suggestedTagline": "5-9 word tagline for the hero (in ${category.toLowerCase().includes("portugu") || businessName.match(/[çãõáéíóú]/i) ? "Portuguese" : "Portuguese"})",
  "tone": "1 sentence on emotional feeling the site should evoke",
  "visualStyle": "1 sentence on visual approach — specific shadows, spacing, textures",
  "spacingScale": "compact | comfortable | generous",
  "cornerRadius": "sharp | soft | pill",
  "sectionHints": {
${sectionsNeeded.map(s => `    "${s}": "1 specific sentence on what this section should emphasize (content angle + feeling)"`).join(",\n")}
  },
  "heroImageQuery": "2-5 word Unsplash query SPECIFIC to THIS business — capture what makes it unique (e.g. for a seafood restaurant in coastal town: 'fresh seafood coastal restaurant'; for a yoga studio: 'minimal zen yoga studio'; for an italian pizzeria: 'neapolitan pizza oven rustic'). Use English. Include descriptors from instructions if provided.",
  "contentImageQuery": "2-5 word Unsplash query for SECTION images (food close-ups, interior details, team-at-work) — more concrete than hero query"
}

Rules:
- Output ONLY the JSON object, no markdown, no commentary.
- Every field required (except unused section hints).
- sectionHints keys MUST exactly be: ${sectionsNeeded.join(", ")}.
- Colors in hex format. Font style as specified values.
- If user requests dark theme, bgColor should be dark (e.g. #0a0a0a) with appropriate text/accent choices.
- If user says "rustic/warm", lean into earthy primaryColor, serif fonts, generous spacing.
- If user says "minimal/modern", lean into neutral primaryColor, sans-serif, compact spacing, sharp corners.
- Taglines must be evocative, not generic.
- Image queries must reflect the SPECIFIC business — avoid generic "restaurant" or "office" alone.`;

  try {
    const content: Anthropic.ContentBlockParam[] = hasPhotos
      ? [...imageBlocks, { type: "text", text: promptText }]
      : [{ type: "text", text: promptText }];

    const res = await anthropic.messages.create({
      model,
      max_tokens: 1200,
      messages: [{ role: "user", content }],
    });

    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      console.warn("[planner] no JSON found in response");
      return DEFAULT_PLAN;
    }

    const parsed = JSON.parse(match[0]) as Partial<WebsitePlan>;

    return {
      primaryColor: parsed.primaryColor || DEFAULT_PLAN.primaryColor,
      accentColor: parsed.accentColor || DEFAULT_PLAN.accentColor,
      bgColor: parsed.bgColor || DEFAULT_PLAN.bgColor,
      fontStyle: parsed.fontStyle === "serif" ? "serif" : "sans-serif",
      brandPersonality: parsed.brandPersonality || DEFAULT_PLAN.brandPersonality,
      suggestedTagline: parsed.suggestedTagline || "",
      tone: parsed.tone || DEFAULT_PLAN.tone,
      visualStyle: parsed.visualStyle || DEFAULT_PLAN.visualStyle,
      spacingScale: ["compact", "comfortable", "generous"].includes(parsed.spacingScale as string)
        ? (parsed.spacingScale as WebsitePlan["spacingScale"])
        : "comfortable",
      cornerRadius: ["sharp", "soft", "pill"].includes(parsed.cornerRadius as string)
        ? (parsed.cornerRadius as WebsitePlan["cornerRadius"])
        : "soft",
      sectionHints: {
        hero: parsed.sectionHints?.hero || DEFAULT_PLAN.sectionHints.hero,
        about: parsed.sectionHints?.about || DEFAULT_PLAN.sectionHints.about,
        services: parsed.sectionHints?.services,
        menu: parsed.sectionHints?.menu,
        hours: parsed.sectionHints?.hours,
        whyUs: parsed.sectionHints?.whyUs,
        team: parsed.sectionHints?.team,
        contact: parsed.sectionHints?.contact || DEFAULT_PLAN.sectionHints.contact,
      },
      heroImageQuery: parsed.heroImageQuery?.trim() || DEFAULT_PLAN.heroImageQuery,
      contentImageQuery: parsed.contentImageQuery?.trim() || DEFAULT_PLAN.contentImageQuery,
    };
  } catch (err) {
    console.warn("[planner] failed, using defaults:", (err as Error).message);
    return DEFAULT_PLAN;
  }
}

/**
 * Format the plan as a structured section for inclusion in generation prompts.
 * This gives Claude concrete guidance rather than templates alone.
 */
export function formatPlanForPrompt(plan: WebsitePlan): string {
  const hints = Object.entries(plan.sectionHints)
    .filter(([, v]) => v)
    .map(([k, v]) => `  • ${k}: ${v}`)
    .join("\n");

  return `═══ DESIGN PLAN (follow precisely) ═══
Tone: ${plan.tone}
Visual style: ${plan.visualStyle}
Spacing scale: ${plan.spacingScale} (${plan.spacingScale === "compact" ? "py-16 px-6" : plan.spacingScale === "generous" ? "py-32 px-6" : "py-24 px-6"})
Corner radius default: ${plan.cornerRadius} (${plan.cornerRadius === "sharp" ? "rounded-none/rounded-sm" : plan.cornerRadius === "pill" ? "rounded-full/rounded-3xl" : "rounded-xl/rounded-2xl"})
Tagline: "${plan.suggestedTagline}"

Section focus:
${hints}
══════════════════════════════════════`;
}

/**
 * Derive concrete design direction from user instructions — no API call.
 * Used when we already have rich brand data (e.g. from analyze flow) and
 * only need to translate vibe keywords into concrete design decisions.
 */
export function deriveDesignDirection(instructions: string): {
  tone: string;
  visualStyle: string;
  spacingScale: "compact" | "comfortable" | "generous";
  cornerRadius: "sharp" | "soft" | "pill";
} {
  const ins = (instructions || "").toLowerCase();

  // Order matters — check most specific keywords first
  if (/\b(luxury|luxuos|premium|elegant|elegante|sofist|refined)/.test(ins)) {
    return {
      tone: "Refined, confident, and aspirational",
      visualStyle: "Elegant serif, deep restrained palette, subtle shadows, generous spacing",
      spacingScale: "generous",
      cornerRadius: "soft",
    };
  }
  if (/\b(rustic|rústic|tradicional|traditional|warm|cozy|aconcheg)/.test(ins)) {
    return {
      tone: "Warm, inviting, and rooted in tradition",
      visualStyle: "Earthy palette, serif headings, relaxed spacing, soft corners",
      spacingScale: "generous",
      cornerRadius: "soft",
    };
  }
  if (/\b(minimal|minimalist|minimalista|clean|limpo)/.test(ins)) {
    return {
      tone: "Calm, precise, and unhurried",
      visualStyle: "Abundant whitespace, single accent color, sharp geometry, no decoration",
      spacingScale: "generous",
      cornerRadius: "sharp",
    };
  }
  if (/\b(industrial|urban|urbano|raw|bold|brutal)/.test(ins)) {
    return {
      tone: "Bold, unfiltered, and grounded",
      visualStyle: "High contrast, uppercase headings, angular shapes, restrained color",
      spacingScale: "compact",
      cornerRadius: "sharp",
    };
  }
  if (/\b(playful|vibrant|fun|creative|divert)/.test(ins)) {
    return {
      tone: "Energetic, friendly, and creative",
      visualStyle: "Bold accent colors, rounded shapes, playful headings, generous whitespace",
      spacingScale: "comfortable",
      cornerRadius: "pill",
    };
  }
  if (/\b(modern|moderno|contempor|tech|sleek)/.test(ins)) {
    return {
      tone: "Forward-thinking, precise, and confident",
      visualStyle: "Neutral palette, geometric sans-serif, tight spacing, crisp subtle shadows",
      spacingScale: "comfortable",
      cornerRadius: "sharp",
    };
  }

  // Default — works for most professional sites
  return {
    tone: "Professional, approachable, and confident",
    visualStyle: "Clean lines, generous whitespace, soft shadows, rounded corners",
    spacingScale: "comfortable",
    cornerRadius: "soft",
  };
}

/**
 * Derive Tailwind spacing/radius classes from the plan for use in section variants.
 */
export function planToClasses(plan: WebsitePlan) {
  const sectionPadding = plan.spacingScale === "compact"
    ? "py-16 px-6"
    : plan.spacingScale === "generous"
      ? "py-32 px-6"
      : "py-24 px-6";

  const radiusLg = plan.cornerRadius === "sharp"
    ? "rounded-md"
    : plan.cornerRadius === "pill"
      ? "rounded-3xl"
      : "rounded-2xl";

  const radiusBtn = plan.cornerRadius === "sharp"
    ? "rounded-md"
    : plan.cornerRadius === "pill"
      ? "rounded-full"
      : "rounded-full";

  return { sectionPadding, radiusLg, radiusBtn };
}
