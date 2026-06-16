// Client-side fetch helpers.
//
// Every agent modal used to call `await res.json()` blindly. When the server
// returns a NON-JSON body — Render's HTML 502/503/504 on a timeout (the heavy
// Playwright/generation flows can take 30-60s) or while the instance is
// restarting after a deploy — that blind parse throws the cryptic
// "Unexpected token '<', \"<!DOCTYPE\"... is not valid JSON" and the whole modal
// breaks. safeJson() detects the non-JSON case and throws a clean, actionable
// message instead, while still returning the parsed object for normal JSON
// responses (including 4xx error payloads like { error: "..." }).

// Default to `any` so callers can read `data.error` / `data.emails` etc. exactly
// like the native `res.json()` they replace (which returns Promise<any>).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function safeJson<T = any>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (ct.includes("application/json")) {
    try {
      return JSON.parse(text) as T;
    } catch {
      // declared JSON but unparseable — fall through to the clean error
    }
  }

  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new Error("The server took too long or is restarting. Wait a few seconds and try again.");
  }

  // Strip any HTML so we never surface a raw "<!DOCTYPE ...".
  const snippet = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
  throw new Error(snippet || `Server error (${res.status || "network"}). Please try again.`);
}

// Convenience POST that returns parsed JSON (or throws a clean error via safeJson).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function postJson<T = any>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return safeJson<T>(res);
}
