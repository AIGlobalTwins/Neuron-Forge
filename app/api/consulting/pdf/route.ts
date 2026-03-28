import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import type { ConsultingPlan } from "../plan/route";

function buildReportHtml(plan: ConsultingPlan, area: string): string {
  const date = new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });

  // Group actions by phase
  const phases: Record<string, typeof plan.actions> = {};
  plan.actions.forEach((a) => {
    if (!phases[a.phase]) phases[a.phase] = [];
    phases[a.phase].push(a);
  });

  const actionsHtml = Object.entries(phases).map(([phase, items]) => `
    <div class="phase-block">
      <div class="phase-title">${phase}</div>
      <table class="action-table">
        <thead><tr><th>Tarefa</th><th>Responsável</th><th>Prazo</th></tr></thead>
        <tbody>
          ${items.map((a) => `<tr><td>${a.task}</td><td>${a.owner}</td><td>${a.timing}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `).join("");

  const forgeSection = plan.forgeTools?.length ? `
    <div class="section">
      <div class="section-header forge-header">
        <div class="section-icon">⬡</div>
        <h2>Ferramentas Neuron Forge Recomendadas</h2>
      </div>
      ${plan.forgeTools.map((t) => `
        <div class="forge-card">
          <div class="forge-name">${t.name}</div>
          <div class="forge-reason">${t.reason}</div>
        </div>
      `).join("")}
    </div>
  ` : "";

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; background: #fff; font-size: 11px; line-height: 1.6; }

  .cover { background: #0d0d0d; color: white; padding: 60px 50px 50px; min-height: 220px; position: relative; }
  .cover-badge { display: inline-block; background: #E8622A; color: white; font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; margin-bottom: 20px; }
  .cover-area { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
  .cover-title { font-size: 26px; font-weight: 700; color: white; line-height: 1.3; max-width: 520px; margin-bottom: 16px; }
  .cover-date { font-size: 10px; color: #555; }
  .cover-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #E8622A, #f5a44a); }
  .cover-logo { position: absolute; top: 50px; right: 50px; font-size: 11px; color: #333; font-weight: 600; letter-spacing: 1px; }

  .content { padding: 40px 50px; }

  .executive-box { background: #f8f8f8; border-left: 3px solid #E8622A; padding: 16px 20px; margin-bottom: 36px; border-radius: 0 8px 8px 0; }
  .executive-label { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #E8622A; margin-bottom: 6px; }
  .executive-text { color: #333; font-size: 11.5px; line-height: 1.7; }

  .section { margin-bottom: 36px; }
  .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
  .section-icon { width: 24px; height: 24px; background: #E8622A; color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
  .section-header h2 { font-size: 13px; font-weight: 700; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.5px; }

  .list-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
  .list-dot { width: 6px; height: 6px; border-radius: 50%; background: #E8622A; margin-top: 5px; flex-shrink: 0; }
  .list-text { color: #333; font-size: 11px; }

  .phase-block { margin-bottom: 20px; }
  .phase-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #E8622A; margin-bottom: 8px; }
  .action-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  .action-table th { background: #f3f3f3; padding: 7px 10px; text-align: left; font-weight: 600; color: #555; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; }
  .action-table td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; color: #333; vertical-align: top; }
  .action-table tr:last-child td { border-bottom: none; }

  .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .kpi-card { background: #f8f8f8; border-radius: 8px; padding: 12px 14px; }
  .kpi-metric { font-size: 10.5px; font-weight: 600; color: #1a1a1a; margin-bottom: 3px; }
  .kpi-target { font-size: 10px; color: #666; }

  .risk-row { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
  .risk-row:last-child { border-bottom: none; }
  .risk-badge { background: #fff0eb; color: #E8622A; border-radius: 4px; padding: 2px 8px; font-size: 9px; font-weight: 700; text-transform: uppercase; white-space: nowrap; height: fit-content; }
  .risk-content { flex: 1; }
  .risk-text { font-size: 10.5px; color: #333; margin-bottom: 3px; }
  .risk-mit { font-size: 10px; color: #666; }

  .forge-header .section-icon { background: #1a1a1a; }
  .forge-card { background: #0d0d0d; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; display: flex; gap: 12px; align-items: flex-start; }
  .forge-name { font-size: 11px; font-weight: 700; color: white; white-space: nowrap; width: 160px; flex-shrink: 0; }
  .forge-reason { font-size: 10.5px; color: #888; line-height: 1.5; }

  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 9px; color: #aaa; }
</style>
</head>
<body>

<div class="cover">
  <div class="cover-logo">NEURON FORGE</div>
  <div class="cover-badge">Plano de Consultoria</div>
  <div class="cover-area">${area}</div>
  <div class="cover-title">${plan.title}</div>
  <div class="cover-date">Gerado a ${date} · Neuron Forge Consulting Agent</div>
  <div class="cover-bar"></div>
</div>

<div class="content">

  <div class="executive-box">
    <div class="executive-label">Resumo Executivo</div>
    <div class="executive-text">${plan.executive}</div>
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-icon">1</div>
      <h2>Diagnóstico — Problemas Identificados</h2>
    </div>
    ${plan.diagnosis.map((d) => `<div class="list-item"><div class="list-dot"></div><div class="list-text">${d}</div></div>`).join("")}
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-icon">2</div>
      <h2>Objectivos</h2>
    </div>
    ${plan.objectives.map((o) => `<div class="list-item"><div class="list-dot"></div><div class="list-text">${o}</div></div>`).join("")}
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-icon">3</div>
      <h2>Plano de Acção</h2>
    </div>
    ${actionsHtml}
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-icon">4</div>
      <h2>KPIs — Métricas de Sucesso</h2>
    </div>
    <div class="kpi-grid">
      ${plan.kpis.map((k) => `
        <div class="kpi-card">
          <div class="kpi-metric">${k.metric}</div>
          <div class="kpi-target">${k.target}</div>
        </div>
      `).join("")}
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-icon">5</div>
      <h2>Riscos & Mitigações</h2>
    </div>
    ${plan.risks.map((r) => `
      <div class="risk-row">
        <div class="risk-badge">Risco</div>
        <div class="risk-content">
          <div class="risk-text">${r.risk}</div>
          <div class="risk-mit">→ ${r.mitigation}</div>
        </div>
      </div>
    `).join("")}
  </div>

  ${forgeSection}

  <div class="footer">
    <span>Neuron Forge Consulting Agent · Powered by Claude Sonnet</span>
    <span>${date}</span>
  </div>

</div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { plan, area } = body;

  if (!plan) return NextResponse.json({ error: "plan é obrigatório" }, { status: 400 });

  const html = buildReportHtml(plan as ConsultingPlan, area || "Consultoria");

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="plano-consultoria.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
