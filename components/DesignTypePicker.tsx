"use client";

// Lightweight client mirror of lib/design-engine DESIGN_TYPE_OPTIONS.
// Kept inline so the server-only design-engine (child_process) isn't bundled.
export const DESIGN_TYPES = [
  { id: "auto", label: "Recommended", desc: "AI picks the best style", swatch: ["#1a1a2e", "#c2703d", "#f7f6f3"], theme: "light" },
  { id: "minimal", label: "Minimalist", desc: "Editorial, white space, strong typography", swatch: ["#1a1a1a", "#475569", "#f7f6f3"], theme: "light" },
  { id: "elegant", label: "Classic Elegant", desc: "Refined serif, timeless", swatch: ["#1f2937", "#9a7b4f", "#fbfaf8"], theme: "light" },
  { id: "luxury", label: "Luxury / Premium", desc: "Sophisticated, subtle gold", swatch: ["#1a1a1a", "#9a7b4f", "#faf8f5"], theme: "light" },
  { id: "warm", label: "Warm / Rustic", desc: "Earthy tones, welcoming", swatch: ["#7c4a2d", "#c2703d", "#faf6f1"], theme: "light" },
  { id: "bold", label: "Bold / Editorial", desc: "High contrast, large type", swatch: ["#111111", "#ff4d2e", "#ffffff"], theme: "light" },
  { id: "playful", label: "Vibrant", desc: "Vivid colors, rounded shapes", swatch: ["#0ea5a4", "#f97316", "#fffdf8"], theme: "light" },
  { id: "tech", label: "Tech / Startup", desc: "Modern, geometric, precise", swatch: ["#0f172a", "#0ea5e9", "#f8fafc"], theme: "light" },
  { id: "dark", label: "Dark Premium", desc: "Dark background, dramatic", swatch: ["#0b0b0c", "#d4a056", "#141416"], theme: "dark" },
] as const;

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export function DesignTypePicker({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">
        Design style <span className="normal-case text-gray-700">— the agent picks the right skills</span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {DESIGN_TYPES.map((d) => {
          const selected = value === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onChange(d.id)}
              className={`text-left rounded-lg border p-2.5 transition-all ${
                selected
                  ? "border-[#E8622A] bg-[#E8622A]/10"
                  : "border-[#2a2a2a] bg-[#0d0d0d] hover:border-[#444]"
              }`}
            >
              <div className="flex items-center gap-1 mb-1.5">
                {d.swatch.map((c, i) => (
                  <span key={i} className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: c }} />
                ))}
                {d.theme === "dark" && <span className="ml-auto text-[9px] text-gray-500 uppercase">dark</span>}
              </div>
              <div className={`text-xs font-semibold ${selected ? "text-white" : "text-gray-300"}`}>{d.label}</div>
              <div className="text-[10px] text-gray-600 leading-tight mt-0.5">{d.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
