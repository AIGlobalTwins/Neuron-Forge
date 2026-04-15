---
name: minimalist-skill
description: Premium utilitarian minimalism — warm monochrome palette, typographic contrast, flat bento grids, muted pastels. Use for new website creation.
---

# Minimalist Skill — Editorial UI Protocol

## COLOR PALETTE
- Background: #FFFFFF or Warm Off-White #F7F6F3 / #FBFBFA
- Card surfaces: #FFFFFF or #F9F9F8
- Borders/dividers: #EAEAEA or rgba(0,0,0,0.06)
- Body text: #111111 or #2F3437 (never pure black)
- Secondary text: #787774
- Accent: highly desaturated pastels only
  - Pale red: bg #FDEBEC, text #9F2F2D
  - Pale blue: bg #E1F3FE, text #1F6C9F
  - Pale green: bg #EDF3EC, text #346538
  - Pale yellow: bg #FBF3DB, text #956400

## TYPOGRAPHY
- Primary font: Geist Sans, Helvetica Neue, Switzer (never Inter, Roboto, Open Sans)
- Editorial serif for hero headings: Playfair Display, Newsreader, Instrument Serif
- Monospace for code/meta: Geist Mono, JetBrains Mono
- Tight heading tracking: -0.02em to -0.04em, line-height 1.1
- Body line-height: 1.6

## BANNED
- Heavy shadows (shadow-md, shadow-lg) — max opacity 0.05 diffuse shadow
- Primary colored section backgrounds (no bright blue/green/red heroes)
- Gradients and neon colors
- Glassmorphism (beyond subtle navbar blur)
- rounded-full on large containers, cards, or primary buttons
- Emojis anywhere
- Generic names: "John Doe", "Acme Corp", "Lorem Ipsum"
- AI clichés: "Elevate", "Seamless", "Unleash", "Next-Gen", "Game-changer"

## COMPONENTS
- Cards: border: 1px solid #EAEAEA, border-radius 8–12px, padding 24–40px
- Primary CTA button: bg #111111, text white, border-radius 4–6px, no shadow, hover bg #333333
- Tags/badges: pill-shaped, text-xs uppercase tracking-wide, muted pastel backgrounds
- FAQ accordions: border-bottom only (1px solid #EAEAEA), no container boxes, + / − toggle icon
- All borders: 1px solid #EAEAEA — consistent throughout

## LAYOUT
- Massive vertical padding between sections: py-24 or py-32
- Content width constrained: max-w-4xl or max-w-5xl
- Asymmetric CSS Grid layouts
- Visual depth via subtle radial gradients (opacity 0.03) — not empty flat backgrounds

## MOTION
- Scroll entry: translateY(12px) + opacity:0 → resolved over 600ms cubic-bezier(0.16,1,0.3,1)
- Hover cards: box-shadow 0 2px 8px rgba(0,0,0,0.04) over 200ms
- Buttons: scale(0.98) on :active
- Animate only transform and opacity
