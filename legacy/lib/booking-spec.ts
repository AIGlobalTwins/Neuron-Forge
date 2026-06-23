// Shared spec for an online-booking section. Used both as an AI-editor suggestion
// and (optionally) at generation time, so the model builds a real, self-contained
// appointment widget that routes confirmations to WhatsApp — no backend needed.
export const BOOKING_SECTION_SPEC = `Add an "Agendamento / Marcações" section (id="agendamento") — a self-contained online booking widget. NO backend, NO external libraries, all vanilla JS inline.

Requirements:
1. Heading + short subtitle (e.g. "Marque a sua visita" / "Escolha o dia e a hora").
2. A dynamic MONTH CALENDAR in vanilla JS: a grid of the current month's days with "‹" / "›" buttons to change month, weekday headers, today highlighted. PAST days are disabled (greyed, not clickable). Clicking an available day selects it (clear highlight).
3. When a day is selected, render TIME SLOTS as buttons (default 09:00–18:00 every 30 minutes; skip 13:00–14:00 for lunch). Selecting a slot highlights it.
4. A "Confirmar marcação" button, disabled until BOTH a day and a slot are chosen. On click it opens WhatsApp in a new tab: window.open("https://wa.me/" + NUMBER + "?text=" + encodeURIComponent("Olá! Gostava de marcar para " + dd/mm/yyyy + " às " + HH:MM + "."), "_blank"). Use the site's existing WhatsApp number if present; if there is none, scroll to the contact section/form and pre-fill the chosen date & time there instead.
5. Style it to MATCH the existing site design — same palette, fonts, card style, radius, spacing. Clean, modern, fully responsive (on mobile the calendar and the slots stack vertically).
6. Add a nav and/or hero CTA "Marcar" that points to #agendamento (or #/<the section's page> if multi-page). Keep all existing scripts (router, motion, site-guard) intact; run this widget's script after its DOM exists.`;
