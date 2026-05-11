import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "TokenLedger - AI Gateway Control Plane",
  description: "Real-time cost tracking and controls for AI infrastructure. Governed routing, cache visibility, and audit evidence.",
  keywords: ["TokenLedger", "AI Gateway", "Cost Controls", "Audit", "LLM", "Infrastructure"],
  authors: [{ name: "TokenLedger" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "TokenLedger — AI Gateway Control Plane",
    description: "Real-time cost tracking and controls for AI infrastructure",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TokenLedger — AI Gateway Control Plane",
    description: "Real-time cost tracking and controls for AI infrastructure",
  },
};

const themeScript = `
(() => {
  try {
    const stored = localStorage.getItem("tokenledger-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.theme = "dark";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="tokenledger-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
