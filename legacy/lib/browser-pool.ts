import { chromium } from "playwright";
import type { Browser, LaunchOptions } from "playwright";

// The 512MB Render box cannot run two chromium processes at once without the Linux
// OOM-killer SIGKILLing the whole Node process (dropping every in-flight request).
// Serialize every browser launch process-wide: one at a time, extras queue.
let active = 0;
const MAX = 1;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < MAX) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiters.push(resolve));
}

/** Release the browser slot — hand it straight to the next waiter if any. */
export function releasePooled(): void {
  const next = waiters.shift();
  if (next) {
    next(); // slot stays "active", passed on
    return;
  }
  active = Math.max(0, active - 1);
}

/** Acquire the single browser slot, then launch. Releases the slot if launch throws. */
export async function launchPooled(opts?: LaunchOptions): Promise<Browser> {
  await acquire();
  try {
    return await chromium.launch(opts);
  } catch (e) {
    releasePooled();
    throw e;
  }
}
