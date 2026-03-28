import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neuron Forge Agents",
  description: "The visual layer for AI agents — websites, social media, WhatsApp and consulting powered by Claude",
};

// Clerk is optional — only loaded when valid keys are present
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const clerkEnabled = clerkKey.startsWith("pk_live_") || clerkKey.startsWith("pk_test_A");

async function MaybeClerkProvider({ children }: { children: React.ReactNode }) {
  if (clerkEnabled) {
    const { ClerkProvider } = await import("@clerk/nextjs");
    return <ClerkProvider>{children}</ClerkProvider>;
  }
  return <>{children}</>;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <MaybeClerkProvider>
      <html lang="pt" className="dark">
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
