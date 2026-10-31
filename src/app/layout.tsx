import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shai's Letters 🫶🤍",
  description: "Letters, sealed with love.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f7e6ee" };

// Fonts are loaded by their real names (not next/font) so the letter editor can apply them inline.
const FONTS =
  "https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Cormorant+Garamond:ital,wght@0,400..700;1,400..700&family=Special+Elite&family=Homemade+Apple&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>{children}</body>
    </html>
  );
}
