import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neuron Forge Agents",
  description: "The visual layer for AI agents — websites, social media, WhatsApp and consulting powered by Claude",
};

// Clerk is optional — only loaded when valid keys are present.
// Bracket notation (not process.env.NEXT_PUBLIC_X) so Next does NOT inline this at
// build time — on Docker/Render the key only exists at runtime, and the client
// gets it via the publishableKey prop below (serialized from the server).
function clerkPublishableKey(): string {
  return process.env["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"] ?? "";
}

async function MaybeClerkProvider({ children, enabled, pk }: { children: React.ReactNode; enabled: boolean; pk: string }) {
  if (enabled) {
    const { ClerkProvider } = await import("@clerk/nextjs");
    return <ClerkProvider publishableKey={pk}>{children}</ClerkProvider>;
  }
  return <>{children}</>;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pk = clerkPublishableKey();
  const enabled = pk.startsWith("pk_live_") || pk.startsWith("pk_test_");
  return (
    <MaybeClerkProvider enabled={enabled} pk={pk}>
      <html lang="pt" className="dark" data-clerk={enabled ? "1" : "0"}>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="bg-[#0a0a0a] text-white antialiased min-h-screen">{children}</body>
      </html>
    </MaybeClerkProvider>
  );
}
