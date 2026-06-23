// Publish a generated static site to Cloudflare — the site is served by a tiny
// Worker that returns the HTML. v1a gives a free `<name>.<account>.workers.dev`
// URL (no domain needed); a custom domain can be attached later as a Worker
// custom domain (Part 2: JIFU owns the domain). Platform-level token (env), never
// a per-user channel.

const CF_API = "https://api.cloudflare.com/client/v4";

export function cloudflareEnabled(): boolean {
  return !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
}

export function slugifySite(name: string): string {
  const s = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return s || "site";
}

export interface DeployResult {
  url: string;
  scriptName: string;
}

// scriptName must already be unique (caller appends a short id). Re-publishing the
// same scriptName updates the live site at the same URL.
export async function deploySite(scriptName: string, html: string): Promise<DeployResult> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) throw new Error("Cloudflare not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.");

  const name = slugifySite(scriptName);
  const auth = { Authorization: `Bearer ${token}` };

  // The Worker module that serves the page. HTML embedded safely via JSON.stringify.
  const worker = `const HTML = ${JSON.stringify(html)};\nexport default { async fetch() { return new Response(HTML, { headers: { "content-type": "text/html; charset=UTF-8" } }); } };`;

  const form = new FormData();
  form.set("metadata", JSON.stringify({ main_module: "worker.js", compatibility_date: "2024-11-01" }));
  form.set("worker.js", new Blob([worker], { type: "application/javascript+module" }), "worker.js");

  const put = await fetch(`${CF_API}/accounts/${accountId}/workers/scripts/${name}`, { method: "PUT", headers: auth, body: form });
  if (!put.ok) {
    const body = await put.text().catch(() => "");
    throw new Error(`Cloudflare upload failed (${put.status}): ${body.slice(0, 200)}`);
  }

  // Enable the workers.dev subdomain for this script (so it gets a public URL).
  await fetch(`${CF_API}/accounts/${accountId}/workers/scripts/${name}/subdomain`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: true }),
  }).catch(() => {});

  // The account's workers.dev subdomain (the middle part of the URL).
  let sub = "";
  try {
    const r = await fetch(`${CF_API}/accounts/${accountId}/workers/subdomain`, { headers: auth });
    const j = (await r.json()) as { result?: { subdomain?: string } };
    sub = j?.result?.subdomain || "";
  } catch {
    /* ignore — URL falls back below */
  }

  return { url: sub ? `https://${name}.${sub}.workers.dev` : "", scriptName: name };
}
