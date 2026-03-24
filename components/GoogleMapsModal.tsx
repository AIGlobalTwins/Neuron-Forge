"use client";

import { useState, useRef } from "react";

interface Props {
  onClose: () => void;
}

type Step = "form" | "loading" | "result";

interface Result {
  id: string;
  name: string;
  category: string;
  address: string;
}

const LOADING_STEPS = [
  { label: "Loading Google Maps listing...", duration: 5000 },
  { label: "Extracting business info...", duration: 3000 },
  { label: "Generating website with AI...", duration: 0 },
];

const CATEGORIES = [
  "Business", "Restaurant", "Beauty / Salon", "Fitness / Gym",
  "Legal / Law", "Healthcare / Dental", "Real Estate", "Technology",
  "Retail / Shop", "Hotel / Accommodation", "Education", "Construction",
];

export function GoogleMapsModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [mapsUrl, setMapsUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Business");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [images, setImages] = useState<string[]>([]); // base64 data URLs
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageUpload(files: FileList | null) {
    if (!files) return;
    const remaining = 3 - images.length;
    const toProcess = Array.from(files).slice(0, remaining);

    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImages((prev) => [...prev, result]);
        setImagePreviews((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!name.trim() && !mapsUrl.trim()) {
      setError("Provide a business name or a Google Maps URL.");
      return;
    }
    setStep("loading");
    setLoadingStep(0);
    setError(null);

    let idx = 0;
    const advance = () => {
      idx++;
      if (idx < LOADING_STEPS.length) {
        setLoadingStep(idx);
        if (LOADING_STEPS[idx].duration > 0) setTimeout(advance, LOADING_STEPS[idx].duration);
      }
    };
    if (LOADING_STEPS[0].duration > 0) setTimeout(advance, LOADING_STEPS[0].duration);

    try {
      const res = await fetch("/api/create-from-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapsUrl: mapsUrl.trim(),
          name: name.trim(),
          category,
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          images,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setStep("form");
        return;
      }
      setResult(data);
      setStep("result");
    } catch (err) {
      setError((err as Error).message);
      setStep("form");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-[#111] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden transition-all ${
          step === "result" ? "max-w-4xl w-full" : "max-w-lg w-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <div>
            <div className="font-bold text-white">Create from Google Maps</div>
            <div className="text-xs text-gray-500">Extract business info + photos → generate website</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl transition-colors">×</button>
        </div>

        {/* ── Form ── */}
        {step === "form" && (
          <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Maps URL */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Google Maps URL</label>
              <input
                type="url"
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E8622A] transition-colors placeholder-gray-600"
                placeholder="https://maps.google.com/maps/place/..."
                autoFocus
              />
              <p className="text-xs text-gray-600 mt-1">We'll extract name, address and phone automatically</p>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-600">
              <div className="flex-1 h-px bg-[#1e1e1e]" />
              <span>or fill manually</span>
              <div className="flex-1 h-px bg-[#1e1e1e]" />
            </div>

            {/* Name + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Business Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E8622A] transition-colors placeholder-gray-600"
                  placeholder="Oralmed"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E8622A] transition-colors"
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Address + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E8622A] transition-colors placeholder-gray-600"
                  placeholder="Rua X, Lisboa"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E8622A] transition-colors placeholder-gray-600"
                  placeholder="+351 210 000 000"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E8622A] transition-colors placeholder-gray-600"
                placeholder="info@business.com"
              />
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">
                Business Photos <span className="text-gray-700 normal-case">(up to 3 — helps Claude match the style)</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleImageUpload(e.dataTransfer.files); }}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                  images.length >= 3
                    ? "border-[#2a2a2a] opacity-50 cursor-not-allowed"
                    : "border-[#2a2a2a] hover:border-[#E8622A]/50 hover:bg-[#E8622A]/5"
                }`}
              >
                {imagePreviews.length > 0 ? (
                  <div className="flex gap-2 justify-center flex-wrap">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative">
                        <img src={src} alt="" className="w-20 h-20 object-cover rounded-lg" />
                        <button
                          onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#E8622A] rounded-full text-white text-xs flex items-center justify-center hover:bg-red-500"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {images.length < 3 && (
                      <div className="w-20 h-20 border border-dashed border-[#333] rounded-lg flex items-center justify-center text-gray-600 text-xl">
                        +
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-3">
                    <div className="text-gray-600 text-sm mb-1">Drag photos here or click to browse</div>
                    <div className="text-gray-700 text-xs">JPG, PNG — max 3 photos</div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-[#2a2a2a] rounded-lg text-gray-400 text-sm hover:border-[#444] hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name.trim() && !mapsUrl.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#E8622A] hover:bg-[#d4561f] text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg viewBox="0 0 12 12" className="w-3 h-3" fill="currentColor"><path d="M2 1l9 5-9 5V1z" /></svg>
                Generate Website
              </button>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {step === "loading" && (
          <div className="p-10 flex flex-col items-center justify-center gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-[#E8622A]/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#E8622A] animate-spin" />
              <div className="absolute inset-3 rounded-full bg-[#E8622A]/10 flex items-center justify-center text-xl">
                📍
              </div>
            </div>
            <div className="space-y-3 w-full max-w-xs">
              {LOADING_STEPS.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 text-sm transition-all ${i === loadingStep ? "text-white" : i < loadingStep ? "text-gray-600" : "text-gray-700"}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    i < loadingStep ? "bg-green-500" : i === loadingStep ? "bg-[#E8622A] animate-pulse" : "bg-[#1a1a1a] border border-[#2a2a2a]"
                  }`}>
                    {i < loadingStep && (
                      <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="white" strokeWidth="1.5">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                      </svg>
                    )}
                  </div>
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Result ── */}
        {step === "result" && result && (
          <div className="flex flex-col">
            {/* Info bar */}
            <div className="px-6 py-4 border-b border-[#1e1e1e] bg-[#E8622A]/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8622A]/10 border border-[#E8622A]/20 flex items-center justify-center text-[#E8622A] text-lg">
                  📍
                </div>
                <div>
                  <div className="font-semibold text-white">{result.name}</div>
                  <div className="text-xs text-gray-500">{result.category}{result.address ? ` · ${result.address}` : ""}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {imagePreviews.length > 0 && (
                  <div className="flex -space-x-1">
                    {imagePreviews.slice(0, 3).map((src, i) => (
                      <img key={i} src={src} alt="" className="w-7 h-7 rounded-full object-cover border border-[#1e1e1e]" />
                    ))}
                  </div>
                )}
                <a
                  href={`/api/preview/${result.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#E8622A] hover:bg-[#d4561f] text-white text-xs font-medium rounded-lg transition-all"
                >
                  Open Full Page ↗
                </a>
              </div>
            </div>

            {/* Preview label */}
            <div className="px-6 py-2 border-b border-[#1e1e1e] text-xs text-gray-500 bg-[#0d0d0d]">
              Generated website preview
            </div>

            {/* iframe */}
            <div className="h-[60vh] overflow-hidden">
              <iframe
                src={`/api/preview/${result.id}`}
                className="w-full h-full border-0"
                title="Generated website preview"
              />
            </div>

            {/* Footer actions */}
            <div className="px-6 py-3 border-t border-[#1e1e1e] flex items-center justify-between bg-[#0d0d0d]">
              <button
                onClick={() => { setStep("form"); setResult(null); }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                ← Create another
              </button>
              <a
                href={`/api/preview/${result.id}`}
                download={`website-${result.name.toLowerCase().replace(/\s+/g, "-")}.html`}
                className="px-4 py-1.5 border border-[#2a2a2a] hover:border-[#E8622A] text-gray-400 hover:text-[#E8622A] text-xs rounded-lg transition-all"
              >
                Download HTML
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
