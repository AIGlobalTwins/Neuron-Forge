/**
 * Robust JSON extraction from Claude responses.
 *
 * Why: every agent route used `raw.match(/\{[\s\S]*\}/)` + JSON.parse, which
 * fails on three common cases that silently throw away good output:
 *   1. Markdown code fences (```json ... ```)
 *   2. Trailing commas before } or ]
 *   3. Truncated output when max_tokens is hit mid-JSON (long calendars,
 *      ad campaigns, email sequences)
 *
 * This module strips fences, slices a balanced object/array (string-aware so
 * braces inside string values don't confuse it), and — critically — repairs
 * truncated JSON by closing open strings/brackets so a partial-but-usable
 * result is salvaged instead of returning an error to the user.
 */

function stripFences(raw: string): string {
  let s = raw.trim();
  // Remove a leading ```json / ``` fence and a trailing ``` fence if present.
  s = s.replace(/^\s*```(?:json|JSON)?\s*/i, "").replace(/\s*```\s*$/i, "");
  return s.trim();
}

/**
 * Walk from the first `open` char, respecting strings and escapes, and return
 * the balanced slice up to its matching `close`. If the input is truncated
 * (depth never returns to zero) the remainder from `open` is returned so the
 * repair step can close it.
 */
function balancedSlice(s: string, open: "{" | "[", close: "}" | "]"): string | null {
  const start = s.indexOf(open);
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  // Truncated — hand the remainder to repair().
  return s.slice(start);
}

/**
 * Best-effort repair of a (possibly truncated) JSON slice:
 *  - strip trailing commas,
 *  - close a dangling string,
 *  - close any unbalanced { [ in the correct order.
 */
function repair(slice: string): string {
  let t = slice.replace(/,(\s*[}\]])/g, "$1");

  // Close a string left open by truncation.
  let quotes = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '"' && t[i - 1] !== "\\") quotes++;
  }
  if (quotes % 2 !== 0) t += '"';

  // Track unbalanced brackets outside strings.
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{" || c === "[") stack.push(c);
    else if (c === "}") { if (stack[stack.length - 1] === "{") stack.pop(); }
    else if (c === "]") { if (stack[stack.length - 1] === "[") stack.pop(); }
  }

  // Remove a comma/colon left dangling by truncation, then close openers.
  t = t.replace(/[,:]\s*$/, "");
  while (stack.length) {
    const o = stack.pop();
    t += o === "{" ? "}" : "]";
  }
  return t;
}

function tryParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

/** Extract a JSON object, salvaging fenced/truncated/trailing-comma output. */
export function extractJsonObject<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  const s = stripFences(raw);
  const slice = balancedSlice(s, "{", "}");
  if (!slice) return null;
  return tryParse<T>(slice) ?? tryParse<T>(repair(slice));
}

/** Extract a JSON array, salvaging fenced/truncated/trailing-comma output. */
export function extractJsonArray<T = unknown>(raw: string): T[] | null {
  if (!raw) return null;
  const s = stripFences(raw);
  const slice = balancedSlice(s, "[", "]");
  if (!slice) return null;
  return tryParse<T[]>(slice) ?? tryParse<T[]>(repair(slice));
}
