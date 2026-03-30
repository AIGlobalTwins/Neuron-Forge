"use client";

import { useState } from "react";
import { DEMO_POSTS, DEMO_CONSULTING_PLAN, DEMO_WEBSITE_ID, DEMO_SEO } from "@/lib/demo-data";

type DemoTool = "maps" | "analyze" | "instagram" | "consulting" | "whatsapp" | "seo" | "security";

interface Props {
  tool: DemoTool;
  onClose: () => void;
  onSetupKey: () => void;
}

export function DemoModal({ tool, onClose, onSetupKey }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function copy(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e] flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs bg-[#E8622A]/20 text-[#E8622A] px-2 py-0.5 rounded-full font-medium border border-[#E8622A]/30">DEMO</span>
            <div>
              <div className="font-bold text-white text-sm">{TOOL_TITLES[tool]}</div>
              <div className="text-xs text-gray-500">Exemplo pré-gerado — sem API Key necessária</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl transition-colors">×</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {(tool === "maps" || tool === "analyze") && <DemoWebsite id={DEMO_WEBSITE_ID} onSetupKey={onSetupKey} />}
          {tool === "instagram" && <DemoPosts posts={DEMO_POSTS} copiedIdx={copiedIdx} onCopy={copy} onSetupKey={onSetupKey} />}
          {tool === "consulting" && <DemoConsulting plan={DEMO_CONSULTING_PLAN} onSetupKey={onSetupKey} />}
          {tool === "whatsapp" && <DemoWhatsApp onSetupKey={onSetupKey} />}
          {tool === "seo" && <DemoSeo data={DEMO_SEO} onSetupKey={onSetupKey} />}
          {tool === "security" && <DemoSetupKey label="Security Auditor" onSetupKey={onSetupKey} />}
        </div>
      </div>
    </div>
  );
}

const TOOL_TITLES: Record<DemoTool, string> = {
  maps: "Create from Google Maps",
  analyze: "Analyze & Redesign",
  instagram: "Posts para Instagram",
  consulting: "Consulting Agent",
  whatsapp: "Agente WhatsApp",
  seo: "SEO Content Agent",
  security: "Security Auditor",
};

/* ── Website Demo ── */
function DemoWebsite({ id, onSetupKey }: { id: string; onSetupKey: () => void }) {
  return (
    <div>
      <div className="px-6 py-3 border-b border-[#1e1e1e] bg-[#0d0d0d] text-xs text-gray-500">
        Website gerado para: <span className="text-white">La Vecchia Roma II</span> · Restaurante Italiano · Lisboa
      </div>
      <div className="h-72 overflow-hidden border-b border-[#1e1e1e]">
        <iframe
          src={`/api/preview/${id}`}
          className="w-full h-full border-0"
          title="Demo website"
        />
      </div>
      <div className="p-6">
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 mb-4">
          <div className="text-xs text-gray-500 mb-3">O que foi gerado automaticamente:</div>
          <div className="grid grid-cols-2 gap-2">
            {["Navbar com menu", "Hero com foto de fundo", "Secção de Serviços", "Porquê Nos", "Testemunhos", "Formulário de Reserva", "Mapa integrado", "Footer completo"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-gray-400">
                <span className="text-green-400">✓</span> {f}
              </div>
            ))}
          </div>
        </div>
        <SetupCTA onSetupKey={onSetupKey} label="Gerar o meu próprio website" />
      </div>
    </div>
  );
}

/* ── Instagram Demo ── */
function DemoPosts({ posts, copiedIdx, onCopy, onSetupKey }: {
  posts: typeof DEMO_POSTS;
  copiedIdx: number | null;
  onCopy: (text: string, idx: number) => void;
  onSetupKey: () => void;
}) {
  return (
    <div className="p-6 space-y-5">
      <div className="text-xs text-gray-500 mb-2">3 posts gerados para <span className="text-white">La Vecchia Roma</span> · tom simpático</div>
      {posts.map((post, i) => (
        <div key={i} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e1e1e]">
            <span className="text-xs text-gray-500 font-medium">Post {i + 1}</span>
            <button
              onClick={() => onCopy(post.caption + "\n\n" + post.hashtags, i)}
              className="text-xs text-gray-500 hover:text-[#E8622A] transition flex items-center gap-1"
            >
              {copiedIdx === i ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{post.caption}</p>
            <p className="text-xs text-[#E8622A]/80 leading-relaxed">{post.hashtags}</p>
            <div className="bg-[#1a1a1a] rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Sugestão de imagem:</div>
              <p className="text-xs text-gray-400 italic">{post.imagePrompt}</p>
            </div>
          </div>
        </div>
      ))}
      <SetupCTA onSetupKey={onSetupKey} label="Gerar posts para o meu negócio" />
    </div>
  );
}

/* ── Consulting Demo ── */
function DemoConsulting({ plan, onSetupKey }: { plan: typeof DEMO_CONSULTING_PLAN; onSetupKey: () => void }) {
  return (
    <div className="p-6 space-y-5">
      <div className="bg-[#E8622A]/5 border border-[#E8622A]/20 rounded-xl p-4">
        <div className="text-xs text-[#E8622A] font-medium mb-1">Resumo Executivo</div>
        <p className="text-sm text-gray-300 leading-relaxed">{plan.executiveSummary}</p>
      </div>

      <div>
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Diagnóstico</div>
        <ul className="space-y-2">
          {plan.diagnosis.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
              <span className="text-red-400 mt-0.5 flex-shrink-0">•</span> {d}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Plano de Ação</div>
        <div className="space-y-3">
          {plan.actions.map((phase, i) => (
            <div key={i} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
              <div className="text-sm font-semibold text-white mb-2">{phase.phase}</div>
              <ul className="space-y-1">
                {phase.tasks.map((t, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs text-gray-400">
                    <span className="text-[#E8622A] mt-0.5">→</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <SetupCTA onSetupKey={onSetupKey} label="Criar o meu plano de negócio" />
    </div>
  );
}

/* ── WhatsApp Demo ── */
function DemoWhatsApp({ onSetupKey }: { onSetupKey: () => void }) {
  const conversation = [
    { from: "client", text: "Olá! Quais são os horários de funcionamento?" },
    { from: "agent", text: "Olá! 😊 Estamos abertos de segunda a sexta das 9h às 20h, e aos sábados das 10h às 18h. Posso ajudar com mais alguma coisa?" },
    { from: "client", text: "Sim! Gostava de saber os preços dos serviços de massagem." },
    { from: "agent", text: "Claro! Temos as seguintes opções:\n\n• Massagem relaxante (60 min) — €45\n• Massagem desportiva (60 min) — €55\n• Massagem de pedras quentes (90 min) — €75\n\nDeseja marcar uma sessão? 🙏" },
    { from: "client", text: "Sim! Pode ser amanhã às 15h?" },
    { from: "agent", text: "Vou verificar a disponibilidade! Para confirmar a marcação, preciso do seu nome completo e número de telefone. Pode partilhar aqui? 📅" },
  ];

  return (
    <div className="p-6">
      <div className="text-xs text-gray-500 mb-4">
        Exemplo de conversa — Spa & Bem-Estar · Agente: <span className="text-white">Sofia</span>
      </div>
      <div className="bg-[#075E54] rounded-2xl overflow-hidden mb-5">
        <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3 border-b border-[#128C7E]">
          <div className="w-8 h-8 rounded-full bg-[#128C7E] flex items-center justify-center text-white text-sm font-bold">S</div>
          <div>
            <div className="text-white text-sm font-medium">Sofia · Spa Alenquer</div>
            <div className="text-green-300 text-xs">Online</div>
          </div>
        </div>
        <div className="p-4 space-y-3 bg-[#ECE5DD] max-h-72 overflow-y-auto">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === "client" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs rounded-lg px-3 py-2 text-sm shadow ${
                msg.from === "client"
                  ? "bg-[#DCF8C6] text-gray-800"
                  : "bg-white text-gray-800"
              }`} style={{ whiteSpace: "pre-line" }}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 mb-5">
        <div className="text-xs text-gray-500 mb-2">O agente foi configurado com:</div>
        <div className="space-y-1">
          {["Nome e personalidade do negócio", "Horários de funcionamento", "Lista de serviços e preços", "FAQs personalizadas", "Idioma: Português"].map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs text-gray-400">
              <span className="text-green-400">✓</span> {f}
            </div>
          ))}
        </div>
      </div>
      <SetupCTA onSetupKey={onSetupKey} label="Criar o meu agente WhatsApp" />
    </div>
  );
}

/* ── SEO Demo ── */
function DemoSeo({ data, onSetupKey }: { data: typeof DEMO_SEO; onSetupKey: () => void }) {
  const [copied, setCopied] = useState<number | null>(null);
  function copy(text: string, i: number) {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  }
  return (
    <div className="p-6 space-y-4">
      <div className="text-xs text-gray-500 mb-2">
        Artigo de Blog gerado para <span className="text-white">La Vecchia Roma</span> · ~{data.wordCount} palavras
      </div>
      {data.sections.map((s, i) => (
        <div key={i} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl overflow-hidden group">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e1e1e]">
            <span className="text-xs font-semibold text-[#E8622A]">{s.title}</span>
            <button onClick={() => copy(s.content, i)} className="text-xs text-gray-600 hover:text-[#E8622A] transition opacity-0 group-hover:opacity-100">
              {copied === i ? "✓" : "Copiar"}
            </button>
          </div>
          <p className="px-4 py-3 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{s.content}</p>
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {data.keywords.map((kw, i) => (
          <span key={i} className="text-xs px-2 py-1 bg-[#E8622A]/10 border border-[#E8622A]/20 text-[#E8622A] rounded-full">{kw}</span>
        ))}
      </div>
      <SetupCTA onSetupKey={onSetupKey} label="Gerar conteúdo SEO para o meu negócio" />
    </div>
  );
}

/* ── Generic setup key demo (for tools without pre-generated demo data) ── */
function DemoSetupKey({ label, onSetupKey }: { label: string; onSetupKey: () => void }) {
  return (
    <div className="p-6 space-y-4">
      <p className="text-sm text-gray-400 leading-relaxed">
        O <span className="text-white font-medium">{label}</span> analisa qualquer website em tempo real — verifica headers de segurança, paths expostos, scripts inline, formulários e libraries desatualizadas.
      </p>
      <SetupCTA onSetupKey={onSetupKey} label={`Experimentar o ${label}`} />
    </div>
  );
}

/* ── CTA block ── */
function SetupCTA({ onSetupKey, label }: { onSetupKey: () => void; label: string }) {
  return (
    <div className="bg-[#0d0d0d] border border-[#E8622A]/20 rounded-xl p-4">
      <div className="text-sm text-white font-medium mb-1">Pronto para usar?</div>
      <p className="text-xs text-gray-500 mb-3">Adiciona a tua API Key da Anthropic (grátis para começar) e gera o teu próprio resultado em minutos.</p>
      <button
        onClick={onSetupKey}
        className="w-full py-2.5 bg-[#E8622A] hover:bg-[#d4561f] text-white text-sm font-semibold rounded-xl transition"
      >
        {label} →
      </button>
    </div>
  );
}
