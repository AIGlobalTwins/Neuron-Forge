# Plano de Construção — Website Builder White-Label (projeto "Incubadora JIFU")

Objetivo: MVP funcional de um builder de sites com IA (estilo Lovable), pronto para demo à JIFU em ~6 semanas, com arquitetura preparada para white-label, metering de consumo e multi-tenant desde o dia 1.

---

## Decisões de stack (fechadas antes de escrever código)

| Camada | Escolha | Porquê |
|---|---|---|
| Frontend da app | React + Vite + TypeScript + Tailwind | Rápido, o Claude Code domina bem |
| Backend | Node (Fastify ou Hono) + TypeScript | Simples, mesmo ecossistema |
| Base de dados | Supabase (Postgres + Auth + Storage) | Auth, RLS e storage incluídos, baixo custo |
| IA | API Anthropic — `claude-sonnet-4-6` para edições, modelo topo de gama para gerações iniciais | Custo controlado |
| Sandbox/preview | WebContainers (StackBlitz) no browser | Zero custo de servidor no MVP |
| Stack gerada (sites dos clientes) | React + Vite + Tailwind, estática | Uma única stack = menos erros do modelo |
| Deploy dos sites finais | Cloudflare Pages via API | Barato, domínios custom fáceis |
| Filas/jobs | Postgres (tabela de jobs) no MVP | Sem Redis até ser preciso |

Regra de ouro: o modelo de IA só gera/edita ficheiros dentro de UMA stack fixa, via tool use estruturado (nunca texto livre).

---

## Fase 0 — Setup (2–3 dias)

- [ ] Criar repo Git (monorepo: `apps/web`, `apps/api`, `packages/shared`)
- [ ] Criar `CLAUDE.md` na raiz (ver ficheiro anexo) com stack, convenções e arquitetura
- [ ] Conta Anthropic API + chave; conta Supabase; conta Cloudflare
- [ ] Esqueleto: Vite app + API + ligação Supabase + CI básico (lint, typecheck)

**Critério de done:** `pnpm dev` levanta web+api; deploy de staging a funcionar.

---

## Fase 1 — Loop central de geração (Semanas 1–2)

O coração do produto. Sem auth, sem billing, um único utilizador (tu).

- [ ] **Orquestrador de IA** no backend:
  - System prompt com a stack fixa, regras de qualidade e estrutura de projeto
  - Tool use: `create_file`, `edit_file`, `delete_file`, `npm_install` (whitelist de pacotes)
  - Prompt caching ativo no contexto do projeto (corta ~90% do custo repetido)
- [ ] **Estado do projeto**: árvore de ficheiros em memória/DB, serializada para o contexto em cada pedido
- [ ] **Preview**: WebContainer no frontend que monta os ficheiros e corre `vite dev`
- [ ] **Auto-correção**: capturar erros de build/console do WebContainer e reenviar ao modelo (máx. 2 tentativas automáticas) — isto é o que separa um demo fraco de um demo vendável
- [ ] **Chat UI**: conversa à esquerda, preview à direita, tabs de ficheiros/código
- [ ] **Telemetria de tokens desde o 1.º pedido**: tabela `usage_events` (operação, tokens in/out, custo estimado, duração) — estes dados definem o preço dos créditos mais tarde

**Critério de done:** "Cria um site para um restaurante italiano em Lisboa" → site funcional com preview em <60s; "muda a cor principal para verde" → edição aplicada sem regenerar tudo.

## Fase 2 — Persistência e iteração (Semana 3)

- [ ] Projetos guardados no Supabase (ficheiros em Storage, metadados em Postgres)
- [ ] Histórico de versões: snapshot por mensagem, com "reverter para aqui"
- [ ] Edição iterativa com diffs (o modelo recebe estado atual + pedido, devolve alterações mínimas)
- [ ] Multi-projeto: lista de projetos por utilizador

**Critério de done:** fechar o browser, voltar, continuar a editar o mesmo projeto.

## Fase 3 — Multi-tenant + experiência "membro" (Semana 4)

Preparação white-label. Mesmo sem a JIFU fechada, constrói-se genérico.

- [ ] Modelo de dados multi-tenant: `tenants` (JIFU será um) → `members` → `projects` → `sites`; RLS do Supabase por tenant
- [ ] Branding configurável por tenant (logo, cores, domínio da app)
- [ ] Auth própria no MVP (Supabase Auth); **abstrair o auth** numa interface para encaixar SSO da JIFU depois sem reescrever
- [ ] **Templates por setor** (5 para o demo): restaurante, clínica, imobiliária/AL, oficina/serviços, loja local — fluxo guiado: escolher template → responder 5 perguntas → site gerado
- [ ] Painel do membro: os meus sites, estado, créditos restantes

**Critério de done:** dois tenants com branding diferente, membros isolados entre si.

## Fase 4 — Metering, créditos e admin (Semana 5)

- [ ] **Ledger de créditos** (append-only): compras/atribuições (+), consumos (−), reservas (hold antes da chamada à API, confirmação depois, devolução em caso de falha)
- [ ] Custos por operação: geração inicial = N créditos, edição = 1 (calibrar com os dados da telemetria da Fase 1)
- [ ] Rate limiting por membro e por tenant (independente do saldo)
- [ ] **Dashboard de admin do tenant** (o que a JIFU vai ver): membros ativos, sites criados, créditos consumidos/restantes, top utilizadores
- [ ] Atribuição de créditos em bloco pelo admin do tenant aos membros

**Critério de done:** consumo bate certo com o ledger ao cêntimo; admin vê números em tempo real.

## Fase 5 — Publicação dos sites (Semana 6)

- [ ] Deploy com um clique para Cloudflare Pages (build estática)
- [ ] Subdomínio automático (`nomedosite.tuaplataforma.com`) + domínio custom (instruções DNS guiadas)
- [ ] Página "site publicado" com link partilhável — é isto que o membro mostra/vende ao cliente final
- [ ] SEO básico automático nos sites gerados (meta tags, OG, sitemap)

**Critério de done:** do prompt ao site publicado num domínio real em <10 minutos.

## Fase 6 — Demo e piloto JIFU

- [ ] Vídeo de 3 min: membro cria site de restaurante e publica (o pitch é "o teu cliente paga-te €500 por isto, custou-te 10 créditos")
- [ ] Ambiente de demo com tenant "JIFU" e branding deles
- [ ] Proposta de piloto: 50–100 membros, 60 dias, fee de piloto, métricas de sucesso definidas (sites criados, sites publicados, NPS dos membros)
- [ ] Reunião técnica com a JIFU: SSO/API de membros, quem aloja, quem dá suporte 1ª linha

---

## Custos estimados do MVP (mensal, durante o desenvolvimento)

- API Anthropic (desenvolvimento + testes): €100–300
- Supabase: €0–25 | Cloudflare: €0–20 | Domínio/diversos: €20
- Total: **€150–400/mês** até ao piloto. O piloto deve ser pago pela JIFU.

## Riscos técnicos principais e mitigação

1. **Qualidade da geração** → templates guiados + auto-correção de erros + stack única. 80% do teu tempo vai para aqui; aceita isso.
2. **Pico de uso no lançamento JIFU** → rate limits por tenant desde a Fase 4; créditos por grosso protegem a margem.
3. **WebContainers têm limites** (browsers antigos, mobile) → aceitável no MVP; sandbox servidor (E2B/Fly) fica para a v2 se o piloto validar.

## Como trabalhar com o Claude Code

- Uma feature por sessão, commits pequenos, `CLAUDE.md` sempre atualizado
- Pede primeiro o plano da feature, revê, só depois implementação
- Exemplo de primeiro prompt: "Lê o CLAUDE.md. Implementa a Fase 1, tarefa 1: o orquestrador de IA com tool use para create_file/edit_file, system prompt para gerar sites React+Vite+Tailwind, e prompt caching. Escreve testes para o parsing das tool calls."
