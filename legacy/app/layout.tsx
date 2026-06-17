import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neuron Forge Agents",
  description: "The visual layer for AI agents — websites, social media, WhatsApp and consulting powered by AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the (public) Supabase URL + anon key at RUNTIME (bracket notation, never
  // build-inlined) and hand them to the browser via <html data-sb-*>. The client
  // reads them from the DOM — works on Docker/Render where NEXT_PUBLIC_* is empty
  // at build. The anon key is safe to embed; RLS protects the data.
  const sbUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
  const sbAnon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
  return (
    <html lang="en" className="dark" data-sb-url={sbUrl} data-sb-anon={sbAnon}>
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
  );
}
