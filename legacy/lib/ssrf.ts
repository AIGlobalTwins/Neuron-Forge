import dns from "dns/promises";
import net from "net";

/** True for loopback / private / link-local / CGNAT / metadata ranges. Unknown → true (block). */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p.some((n) => Number.isNaN(n))) return true;
    if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true;
    if (p[0] === 169 && p[1] === 254) return true; // link-local + cloud metadata (169.254.169.254)
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === "::1" || l === "::") return true;
    if (l.startsWith("fc") || l.startsWith("fd")) return true; // unique-local
    if (l.startsWith("fe80")) return true; // link-local
    if (l.startsWith("::ffff:")) return isPrivateIp(l.slice(7)); // IPv4-mapped
    return false;
  }
  return true;
}

/**
 * Validate a user-supplied URL before fetching/navigating to it. http/https only,
 * and every resolved A/AAAA record must be public — blocks SSRF to internal hosts and
 * cloud metadata. (Residual: DNS-rebinding between this check and the actual request.)
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("only http/https URLs are allowed");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host || /^localhost$/i.test(host) || /\.local$/i.test(host)) throw new Error("blocked host");

  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("blocked: private IP");
    return u;
  }

  let addrs: string[];
  try {
    addrs = (await dns.lookup(host, { all: true })).map((a) => a.address);
  } catch {
    throw new Error("DNS resolution failed");
  }
  if (!addrs.length) throw new Error("no DNS records");
  for (const a of addrs) if (isPrivateIp(a)) throw new Error("blocked: host resolves to a private IP");
  return u;
}
