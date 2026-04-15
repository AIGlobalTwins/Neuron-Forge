---
name: taste-skill
description: Premium frontend design — anti-AI patterns, typography, color, layout. Use for all website generation.
---

# Taste Skill — Design Engineering Rules

## BANNED PATTERNS (never produce)
- Emojis anywhere in UI
- Inter typeface
- Neon glows or pure black (#000000)
- Purple/blue "AI aesthetic" accents
- Generic 3-equal-column card layouts
- Centered hero sections (use asymmetric or split layouts)
- Gradient text fills
- Generic names like "John Doe", "Acme Corp", "Lorem Ipsum"
- AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen", "Game-changer"

## TYPOGRAPHY
- Display/headings: tracking-tighter (-0.02em to -0.04em), tight line-height (1.1–1.2)
- Body text: text-base, line-height 1.6, max ~65 chars per line
- Font choices: Geist, Outfit, Cabinet Grotesk, Poppins — never Inter
- Off-black body: #111111 or #1a1a1a — never pure #000000
- Secondary text: #6b7280 or #787774

## COLOR
- Maximum ONE accent color at saturation below 80%
- Neutral/off-white backgrounds: #f9fafb, #f7f6f3, #ffffff
- Tint shadows to match background hue (no pure black shadows)
- One gray family throughout — no mixing gray scales

## LAYOUT
- Asymmetric grids — alternate image-left / image-right for sections
- CSS Grid for multi-column structures
- Generous vertical padding between sections (py-20 to py-32)
- Max-width containers (max-w-5xl or max-w-6xl)
- Cards: only when elevation communicates hierarchy; prefer borders + negative space

## INTERACTIONS
- Hover states required: background shift, scale, or translate
- Active/pressed: scale(0.98) or translateY(1px)
- Transitions: 200–300ms ease
- Animations: transform and opacity only — never top/left/width/height

## CONTENT
- Use realistic, organic data: percentages like 47.2%, prices like €99.00
- Diverse, contextual content — no generic placeholders
- Direct, plain language — sentence case over title case
