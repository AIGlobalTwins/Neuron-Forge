"use client";

// Lightweight client mirror of lib/design-engine DESIGN_TYPE_OPTIONS.
// Kept inline so the server-only design-engine (child_process) isn't bundled.
export const DESIGN_TYPES = [
  { id: "auto", label: "Recommended", desc: "AI picks the best style", swatch: ["#1a1a2e", "#c2703d", "#f7f6f3"], theme: "light" },
  { id: "minimal", label: "Minimalist", desc: "Strict black & white, bold grotesk, editorial", swatch: ["#111111", "#6b7280", "#ffffff"], theme: "light" },
  { id: "elegant", label: "Classic Elegant", desc: "Refined serif, timeless", swatch: ["#1f2937", "#9a7b4f", "#fbfaf8"], theme: "light" },
  { id: "luxury", label: "Luxury / Premium", desc: "Cinematic dark, elegant serif, gold accent", swatch: ["#0c0a08", "#c6a35c", "#1a1611"], theme: "dark" },
  { id: "warm", label: "Warm / Rustic", desc: "Cream, terracotta & sage, elegant serif", swatch: ["#3a2418", "#c2703d", "#f3ead9"], theme: "light" },
  { id: "bold", label: "Bold / Editorial", desc: "Oversized grotesk, color blocks, mono tags", swatch: ["#111111", "#ff4d2e", "#ffffff"], theme: "light" },
  { id: "playful", label: "Vibrant", desc: "Electric magenta + lime, bento blocks, rounded", swatch: ["#ec1e63", "#b4e019", "#ffffff"], theme: "light" },
  { id: "tech", label: "Tech / Crypto", desc: "Dark premium, glassmorphism, ambient glow", swatch: ["#0a0e1a", "#7c8cff", "#121829"], theme: "dark" },
  { id: "dark", label: "Dark Premium", desc: "Dark background, dramatic", swatch: ["#0b0b0c", "#d4a056", "#141416"], theme: "dark" },
  { id: "pixel", label: "Pixel / Retro", desc: "Retro pixel font, neutral canvas, orange pop", swatch: ["#1a1a1a", "#f15a24", "#ececec"], theme: "light" },
] as const;

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export function DesignTypePicker({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">
        Design style <span className="normal-case text-gray-700">— the agent picks the right skills</span>
      </label>
      <div className="grid grid-cols-3 gap-2.5">
        {DESIGN_TYPES.map((d) => {
          const selected = value === d.id;
          const isAuto = d.id === "auto";
          const cardCls = selected
            ? "border-[#E8622A] bg-[#E8622A]/[0.07] shadow-[0_0_0_1px_rgba(232,98,42,0.55),0_10px_30px_-10px_rgba(232,98,42,0.5)]"
            : isAuto
              ? "border-[#E8622A]/25 bg-[#E8622A]/[0.03] hover:border-[#E8622A]/55 hover:bg-[#E8622A]/[0.06]"
              : "border-white/[0.06] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-black/40";
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onChange(d.id)}
              aria-pressed={selected}
              className={`group relative overflow-hidden text-left rounded-xl border p-3 transition-all duration-200 ease-out hover:-translate-y-0.5 ${cardCls}`}
            >
              {/* Palette preview — gradient swatch with a glassy top sheen */}
              <div
                className="relative mb-2.5 h-7 rounded-md ring-1 ring-inset ring-white/10 overflow-hidden"
                style={{ backgroundImage: `linear-gradient(120deg, ${d.swatch[0]} 0%, ${d.swatch[1]} 50%, ${d.swatch[2]} 100%)` }}
              >
                <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />
                {d.theme === "dark" && (
                  <span className="absolute top-1 right-1 text-[8px] font-semibold tracking-wider text-white/80 uppercase bg-black/45 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                    dark
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`text-[13px] font-semibold tracking-tight ${selected ? "text-white" : "text-gray-200"}`}>{d.label}</span>
                {isAuto && (
                  <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#E8622A] shrink-0" fill="currentColor" aria-hidden>
                    <path d="M12 2l2.5 6L21 9l-4.5 4.1L18 20l-6-3.4L6 20l1.5-6.9L3 9l6.5-1z" />
                  </svg>
                )}
              </div>
              <div className="text-[11px] text-gray-500 leading-snug mt-0.5">{d.desc}</div>

              {/* Selected check badge */}
              {selected && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#E8622A] flex items-center justify-center shadow-md shadow-[#E8622A]/40">
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12l5 5L20 6" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
