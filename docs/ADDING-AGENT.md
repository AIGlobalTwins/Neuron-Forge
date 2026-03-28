# Adding a New Agent to Neuron Forge

Each agent is self-contained. Follow this checklist to add one correctly.

---

## Checklist

### 1. Modal Component
Create `components/XxxModal.tsx`.

Use the standard step pattern:
```ts
type Step = "form" | "loading" | "result"
// Add more steps if the agent needs a connection/setup phase (e.g. "connect" | "configure")
```

Standard structure:
- Fixed header with agent name + close button
- Scrollable body (`overflow-y-auto flex-1`)
- Fixed footer with primary action button (`shrink-0`)
- Loading step with hexagon SVG spinner + step labels

### 2. API Route(s)
Create `app/api/xxx/route.ts`.

Always:
- Read Anthropic key via `getAnthropicKey()` from `lib/settings.ts` — never `process.env` directly
- Return `{ error: "..." }` with appropriate status on failure
- Use `claude-sonnet-4-6` as the model

### 3. Homepage Card
In `app/page.tsx`:
- Add state: `const [showXxx, setShowXxx] = useState(false)`
- Add icon component: `function XxxIcon()`
- Add `<OptionCard>` inside the grid
- Mount modal: `{showXxx && <XxxModal onClose={() => setShowXxx(false)} />}`
- Import the modal at the top

### 4. Forge Tools Registry
Add an entry to `data/forge-tools.md` so the **Consulting Agent** can recommend this tool when relevant.

Copy this template and fill in all fields:

```markdown
### N. Nome da Ferramenta
**ID:** `id-unico`
**Descrição:** O que faz, em 1-2 frases.
**Quando recomendar:**
- Situação 1
- Situação 2
- Situação 3
**Benefício chave:** O principal valor que entrega.
**Categoria de problemas:** palavras-chave separadas por vírgula
```

The `id` must match the key used in `openTool()` in `page.tsx`.

### 5. Agent Documentation
Create `docs/agents/xxx.md` using the template below.

### 6. Settings (if credentials needed)
If the agent requires external API credentials:
- Add fields to `AppSettings` interface in `lib/settings.ts`
- Add getter functions in `lib/settings.ts`
- Expose in `app/api/settings/route.ts` (GET + POST)
- Add UI fields to `components/SettingsModal.tsx`

---

## Agent Doc Template

```markdown
# Agent Name

**Type:** [Generation / Automation / Analysis]
**Status:** Active

## What it does
One paragraph description.

## User Flow
1. Step one
2. Step two
3. Step three

## API Routes
- `POST /api/xxx` — description

## Inputs
| Field | Type | Required | Description |
|---|---|---|---|
| field | string | Yes | ... |

## Output
Description of what the agent returns.

## Credentials Required
- `FIELD_NAME` — where to get it

## Token Usage
Strategy + max_tokens value.

## Key Files
- `components/XxxModal.tsx`
- `app/api/xxx/route.ts`
```

---

## Conventions

- **Colors:** Use `#E8622A` (Forge orange) as the agent accent unless the agent has a strong brand color (e.g. WhatsApp green `#25D366`, Instagram pink gradient)
- **Loading:** Always use the hexagon SVG spinner with step labels
- **Errors:** Always show inline in the modal, never alert/console only
- **No dead links:** Never `href="#"` in generated HTML — always `#section-id`, `tel:`, or `mailto:`
- **Tailwind only in generated HTML:** No `<style>` blocks — always `<script src="https://cdn.tailwindcss.com">`
- **CTAs:** Adapt to business category — never generic "Marcar Consulta" for a restaurant
