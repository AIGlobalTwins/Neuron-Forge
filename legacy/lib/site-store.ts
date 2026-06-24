import fs from "fs";
import path from "path";

// Generators write to data/redesigns (mounted disk); older builds used outputs/redesigns.
const SITE_DIRS = [path.join(process.cwd(), "data", "redesigns"), path.join(process.cwd(), "outputs", "redesigns")];

function validId(id: string): boolean {
  return /^[\w-]+$/.test(id);
}

/** Resolve the saved HTML file for a site id across both dirs and naming schemes. */
export function siteHtmlPath(id: string): string | null {
  if (!validId(id)) return null;
  for (const d of SITE_DIRS) {
    for (const f of [`analyze_${id}.html`, `maps_${id}.html`, `${id}.html`]) {
      const p = path.join(d, f);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function ownerPath(id: string): string {
  return path.join(SITE_DIRS[0], `${id}.owner`);
}

/** Record which user generated a site, so other members can't touch it later. */
export function writeSiteOwner(id: string, userId: string | null): void {
  if (!validId(id) || !userId) return;
  try {
    fs.mkdirSync(SITE_DIRS[0], { recursive: true });
    fs.writeFileSync(ownerPath(id), userId, "utf-8");
  } catch {
    /* best-effort */
  }
}

export function getSiteOwner(id: string): string | null {
  if (!validId(id)) return null;
  for (const d of SITE_DIRS) {
    const p = path.join(d, `${id}.owner`);
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p, "utf-8").trim() || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Authorize access to a site. Owner-scoped once an owner sidecar exists; legacy sites
 * with no owner are allowed (backward-compat) so existing demos don't break — new
 * generations always write an owner, so they ARE protected.
 */
export function canAccessSite(id: string, userId: string | null): boolean {
  const owner = getSiteOwner(id);
  if (!owner) return true;
  return owner === userId;
}

/** Signed-in user id, or null (signed out OR Supabase disabled). */
export async function currentUid(): Promise<string | null> {
  try {
    const { getSupabaseUserId } = await import("@/lib/supabase/server");
    return await getSupabaseUserId();
  } catch {
    return null;
  }
}

/**
 * Authorize a mutating site request. Returns ok=false with a status when the caller
 * must be rejected (401 signed-out while Supabase is on, 404 cross-owner). When
 * Supabase is disabled the app is single-tenant/open, so everything passes.
 */
export async function siteAccess(id: string): Promise<{ ok: boolean; status: number; uid: string | null }> {
  let uid: string | null = null;
  let supabaseOn = false;
  try {
    const { getSupabaseUserId } = await import("@/lib/supabase/server");
    uid = await getSupabaseUserId();
    supabaseOn = true;
  } catch {
    /* Supabase off → open */
  }
  if (supabaseOn && !uid) return { ok: false, status: 401, uid: null };
  if (!canAccessSite(id, uid)) return { ok: false, status: 404, uid };
  return { ok: true, status: 200, uid };
}
