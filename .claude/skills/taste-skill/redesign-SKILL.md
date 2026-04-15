---
name: redesign-skill
description: Upgrade existing websites to premium quality. Audit against generic AI patterns, apply high-end design standards. Use in Analyze & Redesign flow.
---

# Redesign Skill — Upgrade Protocol

## FIX PRIORITY (highest impact first)
1. Font swap — biggest instant improvement
2. Color palette cleanup
3. Hover and active states
4. Layout and spacing refinement
5. Replace generic components
6. Add loading, empty, error states
7. Polish typography scale

## TYPOGRAPHY FIXES
- Replace generic fonts (browser defaults, Inter) with Geist, Outfit, or Poppins
- Increase headline size, tighten letter-spacing (-0.02em to -0.04em)
- Limit body text to ~65 characters per line
- Enable tabular numerals for prices/data
- Use text-wrap: balance to prevent orphaned words

## COLOR FIXES
- Replace pure black backgrounds with off-black: #0d0d0d, #111111, #1a1a1a
- Desaturate accent colors below 80% saturation
- One accent color + one gray family — no more
- Replace "purple/blue AI gradient" with neutral bases
- Tint shadows to match background hue

## LAYOUT FIXES
- Break symmetry — replace centered-everything with asymmetric grids
- Replace 3-equal-cards with asymmetric grid, zig-zag, or masonry
- Use min-height: 100dvh instead of height: 100vh
- CSS Grid for multi-column structures
- Vary border-radius values — not all 8px everywhere
- Create visual depth with negative margins or overlapping elements

## INTERACTION FIXES
- Add hover states: background shift, scale, translate
- Active/pressed feedback: scale(0.98) or translateY(1px)
- Smooth transitions: 200–300ms
- Visible focus rings for keyboard navigation
- Replace dead links with section IDs, tel:, or mailto:

## CONTENT FIXES
- Use diverse, realistic names — not "John Doe"
- Organic data: 47.2%, €1,247.00 — not round numbers
- No Lorem Ipsum — real, contextual copy
- Remove exclamation marks from success messages
- Direct, active voice — sentence case

## CODE QUALITY
- Semantic HTML: nav, main, article, aside, section
- Proper alt text on all images
- Meta tags: title, description, og:image
- Remove commented dead code
