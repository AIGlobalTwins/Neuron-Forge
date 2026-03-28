# Security Agent

Agente de auditoria de segurança para websites. Analisa o código e configuração pública de qualquer website e devolve um relatório com findings categorizados por severidade.

## Modo atual: Passivo

Analisa apenas o que é publicamente acessível via HTTP, sem enviar payloads ao servidor:

- **Headers HTTP** — Content-Security-Policy, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Scripts inline** — API keys hardcoded, tokens, dados sensíveis expostos em JS
- **Formulários** — campos sem proteção, autocomplete em campos sensíveis, ausência de tokens CSRF visíveis
- **Comentários HTML** — informação interna exposta inadvertidamente
- **Bibliotecas/CDN** — versões desatualizadas com CVEs conhecidos
- **Paths comuns** — `/.env`, `/.git/config`, `/phpinfo.php`, `/wp-login.php` (verificação de HTTP 200)
- **Tecnologias expostas** — server header, X-Powered-By, versões de frameworks

## Score

Começa em 100 e subtrai por severidade:
- Critical: -20
- High: -10
- Medium: -5
- Low: -2
- Info: 0

## Categorias de findings

`Headers` · `XSS` · `Exposed Files` · `Forms` · `JS Code` · `Libraries` · `Information Disclosure` · `SSL/TLS` · `CORS` · `Privacy`

---

## ROADMAP: Modo Ativo (não implementado)

> **Nota:** O modo ativo requer autorização explícita do proprietário do website. Testar SQL injection ou outros ataques num servidor sem autorização é ilegal na maioria das jurisdições.

### Gate de autorização proposto

Antes de iniciar qualquer teste ativo, o user terá de confirmar:

```
"Confirmo que sou o proprietário deste website ou tenho autorização
escrita do proprietário para realizar este teste de penetração."
```

Sem esta confirmação, o agente corre apenas em modo passivo.

### Testes ativos planeados

#### SQL Injection (Blind)
- Descoberta automática de forms e parâmetros GET/POST
- Envio de payloads básicos: `'`, `''`, `1 OR 1=1`, `1 AND 1=2`
- Time-based blind: `'; WAITFOR DELAY '0:0:5'--` / `'; SELECT SLEEP(5)--`
- Boolean-based: comparar resposta com payload verdadeiro vs falso
- Deteção por: mudança de conteúdo, mensagens de erro SQL, tempo de resposta

#### XSS Ativo
- Injeção de `<script>alert(1)</script>` e variantes encoded em inputs
- Verificar se o payload é refletido na resposta sem sanitização

#### Directory Traversal
- Testar `../../../etc/passwd` em parâmetros de ficheiro

#### IDOR (Insecure Direct Object Reference)
- Testar incremento/decremento de IDs em parâmetros numéricos

#### Brute Force Headers
- Testar common endpoints: `/admin`, `/dashboard`, `/api/users`, etc.

### Integração com `/security-review` (Claude Code skill)

O skill `/security-review` do Claude Code analisa diffs de git para encontrar vulnerabilidades no código source. Poderia ser integrado como um 3º tab no modal:

- Tab 1: **Auditar Website** (URL → passivo)
- Tab 2: **Teste Ativo** (URL → com autorização)
- Tab 3: **Rever Código** (cola código → usa lógica do `/security-review`)

O Tab 3 seria útil para devs que querem auditar o source code da sua aplicação antes de fazer deploy, sem precisar de ter o Claude Code instalado.
