import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuroTest AI — A/B Neural Content Testing",
  description: "Test your content against real neural activation patterns before publishing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
