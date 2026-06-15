"use client";

import { UserButton } from "@clerk/nextjs";

// Only render Clerk UI when Clerk is actually configured — otherwise there's no
// ClerkProvider in the tree and this would throw. Keyed on the same publishable
// key the layout uses to mount <ClerkProvider>. The app routes are login-protected,
// so the viewer is always signed in here; UserButton shows the avatar + sign-out.
const clerkEnabled = (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "").startsWith("pk_");

export function AuthButton() {
  if (!clerkEnabled) return null;
  return (
    <div className="flex items-center pl-1">
      <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
    </div>
  );
}
