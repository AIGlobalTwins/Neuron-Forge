"use client";

import { useEffect, useState } from "react";
import { saveToHistory } from "@/lib/history";

interface Props {
  onClose: () => void;
}

type Step = "connect" | "form" | "loading" | "result";

interface GeneratedPost {
  caption: string;
  hashtags: string;
  imagePrompt: string;
}

const LOADING_STEPS = [
  { label: "A analisar o teu negócio...", duration: 2500 },
  { label: "A criar os captions com Claude...", duration: 4000 },
  { label: "A adicionar os detalhes finais...", duration: 0 },
];

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 009.5 2H3.5A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8l4 4 8-8" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l14 14M8.5 8.6A2.5 2.5 0 0012.4 12M6.3 5.3C4.2 6.6 2.5 8.7 1 10c2 3 5 6 9 6a9.2 9.2 0 004.7-1.3M10 4c4.5 0 7.5 3.5 9 6a16 16 0 01-2.3 3" />
    </svg>
  );
}

export function SocialPostsModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("connect");
  const [isConnected, setIsConnected] = useState(false);

  // Connect step
  const [igToken, setIgToken] = useState("");
  const [igAccountId, setIgAccountId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [connectSaving, setConnectSaving] = useState(false);
  const [connectError, setConnectError] = useState("");

  // Form step
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Negócio");
  const [description, setDescription] = useState("");
  const [postType, setPostType] = useState("novidade");
  const [tone, setTone] = useState("casual");
  const [count, setCount] = useState(1);

  // Loading
  const [loadingStep, setLoadingStep] = useState(0);

  // Result
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedHashIdx, setCopiedHashIdx] = useState<number | null>(null);

  // Publish
  const [publishingIdx, setPublishingIdx] = useState<number | null>(null);
  const [publishedIdx, setPublishedIdx] = useState<number | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [publishErrors, setPublishErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const connected = data.hasInstagramToken && data.hasInstagramAccountId;
        setIsConnected(connected);
        if (connected) setStep("form");
      });
  }, []);

  async function handleConnect() {
    if (!igToken.trim() || !igAccountId.trim()) {
      setConnectError("Preenche os dois campos.");
      return;
    }
    setConnectSaving(true);
    setConnectError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramToken: igToken.trim(), instagramAccountId: igAccountId.trim() }),
      });
      if (!res.ok) throw new Error();
      setIsConnected(true);
      setStep("form");
    } catch {
      setConnectError("Erro ao guardar. Tenta novamente.");
    } finally {
      setConnectSaving(false);
    }
  }

  async function handleGenerate() {
    if (!businessName.trim() || !description.trim()) return;
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
      const res = await fetch("/api/social-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, category, description, postType, tone, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");
      setPosts(data.posts);
      setStep("result");
      saveToHistory({ type: "instagram", name: businessName, posts: data.posts });
    } catch (e) {
      setError((e as Error).message);
      setStep("form");
    }
  }

  async function handlePublish(idx: number) {
    const post = posts[idx];
    const imageUrl = imageUrls[idx];
    if (!imageUrl?.trim()) {
      setPublishErrors((p) => ({ ...p, [idx]: "Cola o URL de uma imagem para publicar." }));
      return;
    }
    setPublishingIdx(idx);
    setPublishErrors((p) => ({ ...p, [idx]: "" }));
    try {
      const res = await fetch("/api/instagram-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: `${post.caption}\n\n${post.hashtags}`, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao publicar");
      setPublishedIdx(idx);
    } catch (e) {
      setPublishErrors((p) => ({ ...p, [idx]: (e as Error).message }));
    } finally {
      setPublishingIdx(null);
    }
  }

  function copyText(text: string, type: "caption" | "hash", idx: number) {
    navigator.clipboard.writeText(text);
    if (type === "caption") {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } else {
      setCopiedHashIdx(idx);
      setTimeout(() => setCopiedHashIdx(null), 2000);
    }
  }

  const inputClass = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 transition-colors";
  const selectClass = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 transition-colors appearance-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <InstagramIcon />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Posts para Instagram</h2>
              <p className="text-gray-600 text-xs">
                {step === "connect" && "Liga a tua conta"}
                {step === "form" && "Cria o teu post"}
                {step === "loading" && "A gerar..."}
                {step === "result" && `${posts.length} post(s) gerado(s)`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">

          {/* ── STEP: CONNECT ── */}
          {step === "connect" && (
            <div className="px-6 py-6 space-y-5">
              {/* Explainer */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest">Como ligar o Instagram</p>
                <ol className="space-y-2 text-xs text-gray-500 leading-relaxed list-none">
                  {[
                    "Vai a developers.facebook.com/tools/explorer",
                    "Seleciona a tua app Meta (ou cria uma gratuita)",
                    "Adiciona os scopes: instagram_basic + instagram_content_publish",
                    "Clica em \"Generate Access Token\" e copia o token",
                    "O teu Instagram Business Account ID encontras em Definições › Conta › Instagram Business",
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-400 text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Access Token</label>
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      value={igToken}
                      onChange={(e) => setIgToken(e.target.value)}
                      placeholder="EAAxxxxxx..."
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      <EyeIcon open={showToken} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Instagram Business Account ID</label>
                  <input
                    type="text"
                    value={igAccountId}
                    onChange={(e) => setIgAccountId(e.target.value)}
                    placeholder="17841400000000000"
                    className={inputClass}
                  />
                </div>
              </div>

              {connectError && <p className="text-xs text-red-400">{connectError}</p>}

              <button
                onClick={handleConnect}
                disabled={connectSaving || !igToken || !igAccountId}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white flex items-center justify-center gap-2"
              >
                {connectSaving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    A ligar...
                  </>
                ) : (
                  <>
                    <InstagramIcon /> Ligar Instagram
                  </>
                )}
              </button>

              {/* Skip note if already connected */}
              {isConnected && (
                <button onClick={() => setStep("form")} className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors underline">
                  Já está ligado — continuar
                </button>
              )}
            </div>
          )}

          {/* ── STEP: FORM ── */}
          {step === "form" && (
            <div className="px-6 py-6 space-y-4">
              {isConnected && (
                <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                  <CheckIcon /> Instagram ligado
                  <button onClick={() => setStep("connect")} className="ml-auto text-gray-600 hover:text-gray-400 underline transition-colors">alterar</button>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nome do negócio</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ex: Barbearia do João" className={inputClass} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Categoria</label>
                <div className="relative">
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                    {["Restaurante / Café", "Barbearia / Salão", "Clínica / Saúde", "Fitness / Ginásio", "Loja / Comércio", "Serviços / Consultoria", "Hotelaria", "Construção / Remodelação", "Outro"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6l4 4 4-4" /></svg>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Sobre o negócio <span className="text-gray-600">(o que fazem, o que te diferencia)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Barbearia especializada em cortes clássicos e modernos. Atendimento personalizado, ambiente premium. Abertos 7 dias por semana no centro de Lisboa."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Tipo de post</label>
                  <div className="relative">
                    <select value={postType} onChange={(e) => setPostType(e.target.value)} className={selectClass}>
                      <option value="novidade">Novidade</option>
                      <option value="promocao">Promoção</option>
                      <option value="testemunho">Testemunho</option>
                      <option value="dica">Dica útil</option>
                      <option value="lancamento">Lançamento</option>
                    </select>
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6l4 4 4-4" /></svg>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Tom</label>
                  <div className="relative">
                    <select value={tone} onChange={(e) => setTone(e.target.value)} className={selectClass}>
                      <option value="casual">Casual</option>
                      <option value="profissional">Profissional</option>
                      <option value="criativo">Criativo</option>
                      <option value="inspiracional">Inspiracional</option>
                    </select>
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6l4 4 4-4" /></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nº de posts</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${count === n ? "border-pink-500/60 bg-pink-500/10 text-pink-400" : "border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}

          {/* ── STEP: LOADING ── */}
          {step === "loading" && (
            <div className="px-6 py-12 flex flex-col items-center gap-6">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 100 100" className="w-16 h-16 animate-spin" style={{ animationDuration: "2s" }}>
                  <defs>
                    <linearGradient id="ig-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" fill="none" stroke="url(#ig-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="200" strokeDashoffset="50" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-pink-400">
                  <InstagramIcon />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-medium text-sm">{LOADING_STEPS[loadingStep]?.label}</p>
                <p className="text-gray-600 text-xs">Claude está a escrever os teus posts...</p>
              </div>
              <div className="flex gap-1.5">
                {LOADING_STEPS.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= loadingStep ? "w-6 bg-pink-500" : "w-2 bg-[#2a2a2a]"}`} />
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: RESULT ── */}
          {step === "result" && (
            <div className="px-6 py-6 space-y-5">
              {posts.map((post, idx) => (
                <div key={idx} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                  {/* Post header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e]">
                    <div className="flex items-center gap-2 text-pink-400">
                      <InstagramIcon />
                      <span className="text-xs font-medium text-gray-300">Post {count > 1 ? idx + 1 : ""}</span>
                    </div>
                    <button
                      onClick={() => copyText(`${post.caption}\n\n${post.hashtags}`, "caption", idx)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-[#1a1a1a]"
                    >
                      {copiedIdx === idx ? <><CheckIcon /> Copiado</> : <><CopyIcon /> Copiar tudo</>}
                    </button>
                  </div>

                  {/* Caption */}
                  <div className="px-4 pt-4 pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-gray-600">Caption</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{post.caption}</p>
                  </div>

                  {/* Hashtags */}
                  <div className="px-4 pt-2 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-gray-600">Hashtags</span>
                      <button
                        onClick={() => copyText(post.hashtags, "hash", idx)}
                        className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                      >
                        {copiedHashIdx === idx ? <><CheckIcon /> Copiado</> : <><CopyIcon /> Copiar</>}
                      </button>
                    </div>
                    <p className="text-xs text-pink-400/70 leading-relaxed">{post.hashtags}</p>
                  </div>

                  {/* Image prompt */}
                  {post.imagePrompt && (
                    <div className="px-4 pt-2 pb-3 border-t border-[#1a1a1a]">
                      <span className="text-[10px] uppercase tracking-widest text-gray-600 block mb-1.5">Sugestão de imagem</span>
                      <p className="text-xs text-gray-500 italic leading-relaxed">{post.imagePrompt}</p>
                    </div>
                  )}

                  {/* Publish section */}
                  <div className="px-4 py-3 border-t border-[#1a1a1a] bg-[#0d0d0d] space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-gray-600 block">Publicar no Instagram</span>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={imageUrls[idx] ?? ""}
                        onChange={(e) => setImageUrls((p) => ({ ...p, [idx]: e.target.value }))}
                        placeholder="URL da imagem (obrigatório para publicar)"
                        className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/40 transition-colors"
                      />
                      <button
                        onClick={() => handlePublish(idx)}
                        disabled={publishingIdx === idx || publishedIdx === idx}
                        className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 shrink-0 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white flex items-center gap-1.5"
                      >
                        {publishedIdx === idx ? (
                          <><CheckIcon /> Publicado!</>
                        ) : publishingIdx === idx ? (
                          <>
                            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                            A publicar...
                          </>
                        ) : (
                          <>
                            <InstagramIcon /> Publicar
                          </>
                        )}
                      </button>
                    </div>
                    {publishErrors[idx] && <p className="text-[10px] text-red-400">{publishErrors[idx]}</p>}
                  </div>
                </div>
              ))}

              <button
                onClick={() => { setPosts([]); setStep("form"); }}
                className="w-full py-2.5 rounded-xl text-sm text-gray-500 border border-[#1e1e1e] hover:border-[#2a2a2a] hover:text-gray-400 transition-all duration-200"
              >
                Gerar novos posts
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === "form") && (
          <div className="px-6 pb-6 pt-4 border-t border-[#1e1e1e] shrink-0">
            <button
              onClick={handleGenerate}
              disabled={!businessName.trim() || !description.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 8h9M8 5l3 3-3 3" /><circle cx="13" cy="8" r="2" />
              </svg>
              Gerar {count} Post{count > 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
