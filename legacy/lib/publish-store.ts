import fs from "fs";
import path from "path";

const DIR = path.join(process.cwd(), "data", "redesigns");

export interface PublishInfo {
  scriptName?: string;
  url?: string;
  publishedAt?: number;
  contentUpdatedAt?: number;
}

function infoPath(id: string): string | null {
  if (!/^[\w-]+$/.test(id)) return null;
  return path.join(DIR, `${id}.publish.json`);
}

export function getPublishInfo(id: string): PublishInfo | null {
  const p = infoPath(id);
  if (!p) return null;
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    /* ignore */
  }
  return null;
}

function write(id: string, info: PublishInfo): void {
  const p = infoPath(id);
  if (!p) return;
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(info), "utf-8");
  } catch {
    /* best-effort */
  }
}

/** Stable Worker script name for a site, so re-publishing always hits the SAME URL. */
export function scriptNameFor(id: string): string {
  return getPublishInfo(id)?.scriptName || `nf-${id.slice(0, 12)}`;
}

export function setPublished(id: string, scriptName: string, url: string): void {
  write(id, { ...(getPublishInfo(id) || {}), scriptName, url, publishedAt: Date.now() });
}

/** Stamp that the saved HTML changed — so the UI can flag "changes not live yet". */
export function markContentUpdated(id: string): void {
  write(id, { ...(getPublishInfo(id) || {}), contentUpdatedAt: Date.now() });
}

/** True when the live site is behind the saved HTML (content edited after last publish). */
export function isStale(info: PublishInfo | null | undefined): boolean {
  if (!info || !info.publishedAt) return false;
  return (info.contentUpdatedAt || 0) > info.publishedAt;
}
