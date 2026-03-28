"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
}

const DOCS = [
  {
    id: "maps",
    color: "blue",
    colorClass: { bg: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/30", text: "text-blue-400", active: "bg-blue-500/10 border-r-2 border-blue-500", tag: "text-blue-400", tip: "bg-blue-500/5 border-blue-500/20", stepNum: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
    icon: (
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2C7.24 2 5 4.24 5 7c0 4.25 5 11 5 11s5-6.75 5-11c0-2.76-2.24-5-5-5z" />
        <circle cx="10" cy="7" r="1.8" />
      </svg>
    ),
    title: "Criar Website",
    subtitle: "Google Maps",
    tag: "Sem website",
    what: "Cria um website profissional completo para qualquer negócio em ~90 segundos, sem escrever uma linha de código.",
    needs: ["URL do Google Maps do negócio (ou preenches manualmente)", "Fotos do negócio (opcional — melhora o resultado)", "API Key da Anthropic nas Configurações"],
    steps: [
      "Clica em 'Create from Google Maps'",
      "Cola o URL do Google Maps (ex: maps.google.com/place/...)",
      "O Forge extrai automaticamente: nome, morada, telefone e categoria",
      "Adiciona 1-3 fotos do espaço para personalizar as cores e o estilo",
      "Clica 'Generate Website' e aguarda ~90 segundos",
      "Vê o preview, descarrega o HTML ou publica diretamente no Vercel",
    ],
    tip: "Funciona com qualquer tipo de negócio: restaurantes, clínicas, salões de beleza, advogados, ginásios e muito mais.",
    example: "Restaurante La Vecchia Roma → website com menu, testemunhos, secção 'Porquê Nós', formulário de reserva e footer — tudo gerado automaticamente.",
  },
  {
    id: "analyze",
    color: "purple",
    colorClass: { bg: "from-purple-500/20 to-violet-500/20", border: "border-purple-500/30", text: "text-purple-400", active: "bg-purple-500/10 border-r-2 border-purple-500", tag: "text-purple-400", tip: "bg-purple-500/5 border-purple-500/20", stepNum: "border-purple-500/30 text-purple-400 bg-purple-500/10" },
    icon: (
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="6" />
        <path d="M20 20l-4-4" />
        <path d="M6 9h6M9 6v6" />
      </svg>
    ),
    title: "Analisar & Redesenhar",
    subtitle: "Website existente",
    tag: "Tem website",
    what: "Analisa qualquer website existente com IA, identifica problemas de design e gera uma versão moderna e profissional.",
    needs: ["URL de um website público", "API Key da Anthropic nas Configurações"],
    steps: [
      "Clica em 'Analyze & Redesign'",
      "Cola o URL do website que queres melhorar",
      "O Forge tira screenshots e lê o código fonte da página",
      "A IA analisa: design, hierarquia visual, cores, tipografia e UX",
      "Recebe um relatório de pontos fortes e fracos",
      "O Forge gera uma versão completamente redesenhada",
    ],
    tip: "Ideal para mostrar a clientes com websites desatualizados. Em 2 minutos tens uma proposta visual pronta.",
    example: "Website de clínica dentária dos anos 2000 → redesign moderno com cores profissionais, layout limpo e CTAs otimizados.",
  },
  {
    id: "instagram",
    color: "pink",
    colorClass: { bg: "from-pink-500/20 to-rose-500/20", border: "border-pink-500/30", text: "text-pink-400", active: "bg-pink-500/10 border-r-2 border-pink-500", tag: "text-pink-400", tip: "bg-pink-500/5 border-pink-500/20", stepNum: "border-pink-500/30 text-pink-400 bg-pink-500/10" },
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    title: "Posts para Instagram",
    subtitle: "Social media",
    tag: "Social Media",
    what: "Gera captions profissionais, hashtags otimizadas e ideias de imagem para o Instagram do teu negócio.",
    needs: ["Informação básica sobre o negócio", "API Key da Anthropic", "(Opcional) Token do Instagram para publicação direta"],
    steps: [
      "Clica em 'Posts para Instagram'",
      "Preenche: nome do negócio, categoria e descrição breve",
      "Escolhe o tipo de post: promoção, produto, bastidores ou testemunho",
      "Seleciona o tom: simpático, profissional, inspirador ou divertido",
      "Escolhe quantos posts (1, 2 ou 3)",
      "Copia o caption e as hashtags geradas",
      "(Opcional) Cola o URL de uma imagem para publicar diretamente",
    ],
    tip: "Para publicação direta, precisas de conectar o teu Instagram Business nas Configurações. O processo leva 2 minutos.",
    example: "Restaurante + tom simpático + post de produto → caption de 3 parágrafos com emojis, call-to-action de reserva e 10 hashtags relevantes.",
  },
  {
    id: "whatsapp",
    color: "green",
    colorClass: { bg: "from-green-500/20 to-emerald-500/20", border: "border-green-500/30", text: "text-green-400", active: "bg-green-500/10 border-r-2 border-green-500", tag: "text-green-400", tip: "bg-green-500/5 border-green-500/20", stepNum: "border-green-500/30 text-green-400 bg-green-500/10" },
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    title: "Agente WhatsApp",
    subtitle: "Atendimento automático",
    tag: "Atendimento 24/7",
    what: "Cria um assistente de IA para o teu WhatsApp Business que responde automaticamente a clientes, qualquer hora do dia.",
    needs: ["Conta WhatsApp Business", "Acesso ao Meta Business Manager", "API Key da Anthropic", "Servidor ou Vercel (para o webhook ficar acessível)"],
    steps: [
      "Clica em 'Agente WhatsApp'",
      "Vai ao Meta Business Manager → WhatsApp → API Setup e copia o Phone Number ID e Access Token",
      "Cola as credenciais no Forge",
      "Configura o agente: nome, descrição do negócio, horários, serviços e FAQs",
      "Escolhe personalidade (simpático, profissional, direto) e idioma",
      "Copia o Webhook URL do Forge para o Meta Dashboard",
      "Ativa o campo 'messages' e verifica o webhook",
      "O agente fica ativo — testa enviando uma mensagem",
    ],
    tip: "O agente usa as tuas FAQs para responder às perguntas mais comuns. Quanto mais detalhas, melhores são as respostas.",
    example: "Clínica dentária → agente responde sobre horários, marca consultas, esclarece dúvidas sobre tratamentos e encaminha casos urgentes.",
  },
  {
    id: "seo",
    color: "emerald",
    colorClass: { bg: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/30", text: "text-emerald-400", active: "bg-emerald-500/10 border-r-2 border-emerald-500", tag: "text-emerald-400", tip: "bg-emerald-500/5 border-emerald-500/20", stepNum: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
    icon: (
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="6" />
        <path d="M20 20l-4-4" />
        <path d="M6 9h6M9 6v6" />
      </svg>
    ),
    title: "SEO Content Agent",
    subtitle: "Conteúdo orgânico",
    tag: "SEO",
    what: "Gera conteúdo otimizado para motores de pesquisa em 5 formatos: artigos de blog, landing page copy, meta tags, FAQs e descrições de serviços — tudo pronto a publicar.",
    needs: ["Informação básica sobre o negócio", "Keywords alvo (opcional — o agente sugere as melhores)", "API Key da Anthropic nas Configurações"],
    steps: [
      "Clica em 'SEO Content Agent'",
      "Escolhe o tipo de conteúdo: Blog, Landing Page, Meta Tags, FAQs ou Serviços",
      "Preenche o nome do negócio, categoria e descrição breve",
      "Adiciona keywords alvo (opcional) e público-alvo",
      "Escolhe o tom e idioma",
      "Clica 'Gerar' e aguarda ~15 segundos",
      "Copia cada secção individualmente ou descarrega tudo em .txt",
    ],
    tip: "Para melhores resultados no Blog e Landing Page, descreve bem o público-alvo. Para Meta Tags, usa as keywords exatas que os teus clientes pesquisam no Google.",
    example: "Restaurante italiano em Lisboa → artigo de blog de 350 palavras com H1, 3 H2s, introdução, conclusão, meta title de 58 chars, meta description de 155 chars, slug SEO e 5 keywords principais.",
  },
  {
    id: "consulting",
    color: "amber",
    colorClass: { bg: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/30", text: "text-amber-400", active: "bg-amber-500/10 border-r-2 border-amber-500", tag: "text-amber-400", tip: "bg-amber-500/5 border-amber-500/20", stepNum: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
    icon: (
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17V13M7 17V9M11 17V11M15 17V5" />
        <path d="M3 9l4-4 4 3 5-6" />
      </svg>
    ),
    title: "Consulting Agent",
    subtitle: "Plano de negócio",
    tag: "Estratégia",
    what: "Faz um diagnóstico inteligente do teu negócio através de perguntas adaptadas e gera um plano de ação profissional em PDF.",
    needs: ["API Key da Anthropic", "10-15 minutos para responder às perguntas"],
    steps: [
      "Clica em 'Consulting Agent'",
      "Escolhe a área: Estratégia, Marketing, Operações, Finanças, RH, Tecnologia, Produto ou Vendas",
      "Descreve brevemente o teu problema ou objetivo",
      "Responde a 7 perguntas diagnóstico (texto, escala ou múltipla escolha)",
      "O Forge gera um plano estruturado com: resumo, diagnóstico, objetivos SMART, plano de ação, KPIs e riscos",
      "Descarrega o plano completo em PDF profissional",
    ],
    tip: "No final do plano, o Forge recomenda automaticamente outros agentes relevantes para o teu caso. Por exemplo, se o problema for de marketing, sugere criar um website ou automatizar o Instagram.",
    example: "Problema de captação de clientes + área Marketing → plano com 3 fases, 5 objetivos SMART, 12 ações concretas, 4 KPIs e 3 riscos mitigados. PDF pronto para apresentar.",
  },
];

export function DocsModal({ onClose }: Props) {
  const [active, setActive] = useState(0);
  const doc = DOCS[active];
  const c = doc.colorClass;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-500/20 to-gray-400/10 border border-gray-700/50 flex items-center justify-center">
              <svg viewBox="0 0 20 20" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 4H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4" />
                <path d="M14 2l4 4-7 7H7v-4l7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Documentação</h2>
              <p className="text-gray-600 text-xs">Como usar cada agente do Forge</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-52 flex-shrink-0 border-r border-[#1e1e1e] py-3 overflow-y-auto bg-[#080808]">
            <p className="text-[10px] uppercase tracking-widest text-gray-700 font-medium px-4 mb-2">Agentes</p>
            {DOCS.map((d, i) => (
              <button
                key={d.id}
                onClick={() => setActive(i)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                  active === i
                    ? `${d.colorClass.active} text-white`
                    : "text-gray-500 hover:text-gray-300 hover:bg-[#111]"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${d.colorClass.bg} border ${d.colorClass.border} flex items-center justify-center flex-shrink-0 ${active === i ? d.colorClass.text : "text-gray-600"}`}>
                  {d.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium leading-tight truncate">{d.title}</div>
                  <div className="text-[10px] text-gray-600 leading-tight truncate">{d.subtitle}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Agent hero */}
            <div className="px-6 pt-6 pb-5 border-b border-[#1e1e1e]">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.bg} border ${c.border} flex items-center justify-center ${c.text} flex-shrink-0`}>
                  <div className="scale-125">{doc.icon}</div>
                </div>
                <div>
                  <span className={`text-[10px] uppercase tracking-widest font-semibold ${c.tag}`}>{doc.tag}</span>
                  <h2 className="text-lg font-bold text-white leading-tight">{doc.title}</h2>
                </div>
              </div>

              {/* What it does */}
              <p className="mt-4 text-sm text-gray-400 leading-relaxed">{doc.what}</p>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* What you need */}
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-gray-600 font-medium mb-3">O que precisas</h3>
                <div className="space-y-2">
                  {doc.needs.map((n, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className={`w-4 h-4 rounded-full ${c.stepNum} border text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold`}>
                        ✓
                      </div>
                      <span className="text-sm text-gray-400 leading-relaxed">{n}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-gray-600 font-medium mb-3">Passo a passo</h3>
                <div className="space-y-2.5">
                  {doc.steps.map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`w-5 h-5 rounded-full border ${c.stepNum} text-[10px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5`}>
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-400 leading-relaxed">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tip */}
              <div className={`border ${c.tip} rounded-xl p-4`} style={{ backgroundColor: "transparent" }}>
                <div className={`flex items-center gap-1.5 mb-1.5`}>
                  <svg viewBox="0 0 16 16" className={`w-3 h-3 ${c.text}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="6" />
                    <path d="M8 5v3M8 11v.5" />
                  </svg>
                  <span className={`text-[10px] uppercase tracking-widest font-semibold ${c.text}`}>Dica</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{doc.tip}</p>
              </div>

              {/* Example */}
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg viewBox="0 0 16 16" className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 4h12M2 8h8M2 12h5" />
                  </svg>
                  <span className="text-[10px] uppercase tracking-widest text-gray-600 font-medium">Exemplo real</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{doc.example}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
