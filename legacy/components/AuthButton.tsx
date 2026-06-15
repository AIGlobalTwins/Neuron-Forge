"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";

// Render the Clerk UserButton only when Clerk is actually configured. We read the
// runtime flag the server layout writes to <html data-clerk> — NOT the NEXT_PUBLIC
// env, which is inlined empty at build time on Docker/Render. The app routes are
// login-protected, so the viewer is always signed in here.
export function AuthButton() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(document.documentElement.dataset.clerk === "1");
  }, []);

  if (!enabled) return null;
  return (
    <div className="flex items-center pl-1">
      <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
    </div>
  );
}
