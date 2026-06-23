"use client";

import { useState } from "react";

function compress(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 1280;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        c.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Optional reference-design upload — the website generators match its aesthetic.
export function StyleRefDrop({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try { onChange(await compress(f)); } finally { setBusy(false); }
    e.target.value = "";
  }
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        Design inspiration <span className="text-gray-600">(optional — a screenshot of a design you like; the AI matches its style)</span>
      </label>
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="reference" className="h-16 rounded-lg border border-[#1e1e1e] object-cover" />
          <button type="button" onClick={() => onChange("")} className="text-xs text-gray-500 hover:text-red-400 transition">Remove</button>
        </div>
      ) : (
        <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-[#2a2a2a] rounded-xl cursor-pointer hover:border-[#a855f7]/40 transition-colors">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#a855f7] shrink-0" fill="currentColor"><path d="M12 2l1.5 5L19 8.5 13.5 10 12 15l-1.5-5L5 8.5 10.5 7z" /><path d="M18.3 13l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></svg>
          <span className="text-xs text-gray-500">{busy ? "Processing…" : "Drop / choose a reference design (Dribbble, a site you like)"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
      )}
    </div>
  );
}
