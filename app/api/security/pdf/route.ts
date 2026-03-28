import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import type { SecurityResult, SecurityFinding, SecurityRating } from "../route";

const SEVERITY_COLORS: Record<SecurityFinding["severity"], { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5", label: "Critical" },
  high:     { bg: "#fff7ed", text: "#ea580c", border: "#fdba74", label: "High" },
  medium:   { bg: "#fefce8", text: "#ca8a04", border: "#fde047", label: "Medium" },
  low:      { bg: "#eff6ff", text: "#2563eb", border: "#93c5fd", label: "Low" },
  info:     { bg: "#f9fafb", text: "#6b7280", border: "#d1d5db", label: "Info" },
};

const RATING_CONFIG: Record<SecurityRating, { label: string; color: string; bg: string; border: string }> = {
  critical:   { label: "Crítico",     color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
  vulnerable: { label: "Vulnerável",  color: "#ea580c", bg: "#fff7ed", border: "#fdba74" },
  moderate:   { label: "Moderado",    color: "#ca8a04", bg: "#fefce8", border: "#fde047" },
  secure:     { label: "Seguro",      color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
};

const SEVERITY_ORDER: SecurityFinding["severity"][] = ["critical", "high", "medium", "low", "info"];

function escHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSeverityBadge(severity: SecurityFinding["severity"]): string {
  const c = SEVERITY_COLORS[severity];
  return `<span class="badge" style="background:${c.bg};color:${c.text};border-color:${c.border}">${c.label}</span>`;
}

function buildFindingsSection(findings: SecurityFinding[], severity: SecurityFinding["severity"]): string {
  const group = findings.filter((f) => f.severity === severity);
  if (group.length === 0) return "";
  const c = SEVERITY_COLORS[severity];
  return `
    <div class="severity-group">
      <div class="severity-group-header" style="border-left-color:${c.text}">
        <span class="severity-group-dot" style="background:${c.text}"></span>
        <span class="severity-group-label" style="color:${c.text}">${c.label}</span>
        <span class="severity-group-count">${group.length} finding${group.length > 1 ? "s" : ""}</span>
      </div>
      ${group.map((f) => `
        <div class="finding-card" style="border-left-color:${c.text}">
          <div class="finding-header">
            ${buildSeverityBadge(f.severity)}
            <span class="finding-category">${escHtml(f.category)}</span>
            <span class="finding-title">${escHtml(f.title)}</span>
          </div>
          <div class="finding-body">
            <div class="finding-block">
              <div class="finding-block-label">Problema</div>
              <div class="finding-block-text">${escHtml(f.description)}</div>
            </div>
            ${f.evidence && f.evidence !== "(header ausente)" && f.evidence !== "(ausente — correto)" ? `
            <div class="finding-block">
              <div class="finding-block-label">Evidência</div>
              <div class="finding-evidence">${escHtml(f.evidence)}</div>
            </div>` : ""}
            <div class="finding-block rec">
              <div class="finding-block-label" style="color:${c.text}">Recomendação</div>
              <div class="finding-block-text" style="color:${c.text}">${escHtml(f.recommendation)}</div>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function buildHtml(result: SecurityResult): string {
  const date = new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
  const rating = RATING_CONFIG[result.rating];

  const counts = SEVERITY_ORDER.reduce((acc, s) => {
    acc[s] = result.findings.filter((f) => f.severity === s).length;
    return acc;
  }, {} as Record<string, number>);

  const statsHtml = SEVERITY_ORDER
    .filter((s) => counts[s] > 0)
    .map((s) => {
      const c = SEVERITY_COLORS[s];
      return `
        <div class="stat-card" style="border-top:3px solid ${c.text}">
          <div class="stat-number" style="color:${c.text}">${counts[s]}</div>
          <div class="stat-label">${c.label}</div>
        </div>
      `;
    }).join("");

  const techHtml = result.techDetected.length
    ? result.techDetected.map((t) => `<span class="tech-tag">${escHtml(t)}</span>`).join("")
    : "<span class='no-tech'>Não identificadas</span>";

  const findingsSectionsHtml = SEVERITY_ORDER
    .filter((s) => s !== "info")
    .map((s) => buildFindingsSection(result.findings, s))
    .join("") + buildFindingsSection(result.findings, "info");

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; background: #fff; font-size: 11px; line-height: 1.6; }

  /* ── Cover ── */
  .cover { background: #0d0d0d; color: white; padding: 56px 50px 48px; position: relative; }
  .cover-logo { position: absolute; top: 48px; right: 50px; font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #555; text-transform: uppercase; }
  .cover-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #aaa; font-size: 9px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; padding: 5px 12px; border-radius: 20px; margin-bottom: 24px; }
  .cover-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; }
  .cover-url { font-size: 22px; font-weight: 700; color: white; margin-bottom: 10px; word-break: break-all; max-width: 500px; }
  .cover-date { font-size: 10px; color: #555; margin-bottom: 28px; }
  .cover-rating { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; border: 1px solid ${rating.border}; background: ${rating.bg}22; }
  .cover-rating-dot { width: 8px; height: 8px; border-radius: 50%; background: ${rating.color}; }
  .cover-rating-label { font-size: 13px; font-weight: 700; color: ${rating.color}; }
  .cover-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #ef4444, #f97316, #eab308); }

  /* ── Content ── */
  .content { padding: 40px 50px; }

  /* ── Summary ── */
  .summary-box { background: #f8f8f8; border-left: 3px solid #0d0d0d; padding: 16px 20px; margin-bottom: 32px; border-radius: 0 8px 8px 0; }
  .summary-label { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-bottom: 6px; }
  .summary-text { color: #333; font-size: 11.5px; line-height: 1.7; }

  /* ── Stats ── */
  .stats-row { display: flex; gap: 12px; margin-bottom: 36px; }
  .stat-card { flex: 1; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px 16px; text-align: center; }
  .stat-number { font-size: 24px; font-weight: 800; line-height: 1; margin-bottom: 4px; }
  .stat-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #888; }

  /* ── Tech ── */
  .tech-section { margin-bottom: 32px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
  .tech-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tech-tag { background: #f3f3f3; border: 1px solid #e0e0e0; border-radius: 4px; padding: 3px 10px; font-size: 10px; color: #444; font-weight: 500; }
  .no-tech { font-size: 10px; color: #aaa; font-style: italic; }

  /* ── Findings ── */
  .findings-section { margin-bottom: 8px; }
  .severity-group { margin-bottom: 24px; }
  .severity-group-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f8f8f8; border-radius: 6px; border-left: 3px solid; margin-bottom: 10px; }
  .severity-group-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .severity-group-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .severity-group-count { margin-left: auto; font-size: 10px; color: #888; }

  .finding-card { background: #fff; border: 1px solid #e8e8e8; border-left: 3px solid; border-radius: 8px; margin-bottom: 8px; overflow: hidden; page-break-inside: avoid; }
  .finding-header { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #fafafa; border-bottom: 1px solid #f0f0f0; flex-wrap: wrap; }
  .badge { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 2px 8px; border-radius: 12px; border: 1px solid; white-space: nowrap; }
  .finding-category { font-size: 9px; color: #888; background: #f0f0f0; border-radius: 3px; padding: 2px 7px; white-space: nowrap; }
  .finding-title { font-size: 11px; font-weight: 600; color: #1a1a1a; }
  .finding-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
  .finding-block { }
  .finding-block-label { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #aaa; margin-bottom: 3px; }
  .finding-block-text { font-size: 10.5px; color: #444; line-height: 1.6; }
  .finding-evidence { font-family: 'Courier New', monospace; font-size: 9.5px; background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 4px; padding: 6px 10px; color: #555; word-break: break-all; }
  .rec { }

  /* ── Footer ── */
  .footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 9px; color: #bbb; }

  @media print { .finding-card { page-break-inside: avoid; } }
</style>
</head>
<body>

<div class="cover">
  <div class="cover-logo">Neuron Forge</div>
  <div class="cover-badge"><span class="cover-badge-dot"></span>Security Audit Report</div>
  <div class="cover-url">${escHtml(result.url)}</div>
  <div class="cover-date">Gerado a ${date} · Neuron Forge Security Agent</div>
  <div class="cover-rating">
    <span class="cover-rating-dot"></span>
    <span class="cover-rating-label">${rating.label}</span>
  </div>
  <div class="cover-bar"></div>
</div>

<div class="content">

  <div class="summary-box">
    <div class="summary-label">Sumário Executivo</div>
    <div class="summary-text">${escHtml(result.summary)}</div>
  </div>

  ${statsHtml ? `<div class="stats-row">${statsHtml}</div>` : ""}

  <div class="tech-section">
    <div class="section-title">Tecnologias Detetadas</div>
    <div class="tech-tags">${techHtml}</div>
  </div>

  <div class="findings-section">
    <div class="section-title">Findings (${result.findings.length} total)</div>
    ${findingsSectionsHtml}
  </div>

  <div class="footer">
    <span>Neuron Forge Security Agent · Powered by Claude Sonnet · Auditoria passiva de código público</span>
    <span>${date}</span>
  </div>

</div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { result } = body as { result: SecurityResult };

  if (!result?.url) {
    return NextResponse.json({ error: "result é obrigatório" }, { status: 400 });
  }

  const html = buildHtml(result);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "20px", left: "0" },
    });
    const hostname = new URL(result.url).hostname.replace(/^www\./, "");
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="security-audit-${hostname}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
