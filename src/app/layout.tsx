import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NeuroTest AI — Neuromarketing A/B Testing & Brain Analysis Tool",
    template: "%s | NeuroTest AI",
  },
  description: "Free AI neuromarketing tool. A/B test ads, analyze photos, music, browsing habits, social media, and screen time. 5 AI agents score 37 brain features in 30 seconds. No signup needed.",
  keywords: ["neurotest", "neuro test", "neuromarketing", "A/B testing", "brain analysis", "content testing", "AI marketing", "neural analysis", "ad testing", "screen time analyzer", "digital wellness", "browsing analyzer"],
  authors: [{ name: "NeuroTest AI" }],
  creator: "NeuroTest AI",
  publisher: "NeuroTest AI",
  metadataBase: new URL("https://neurotest.live"),
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.ico" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://neurotest.live",
    siteName: "NeuroTest AI",
    title: "NeuroTest AI — See What Your Content Does to the Brain",
    description: "Free AI neuromarketing tool. A/B test ads, analyze photos, music, and browsing habits. 5 AI agents score 37 brain features in 30 seconds.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "NeuroTest AI — Neural Content Intelligence" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuroTest AI — See What Your Content Does to the Brain",
    description: "Free AI neuromarketing tool. 5 expert agents analyze your content across 37 brain features.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "NeuroTest AI",
          "url": "https://neurotest.live",
          "description": "Free AI neuromarketing tool that A/B tests content using 5 expert AI agents scoring 37 brain features.",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
          "author": { "@type": "Organization", "name": "NeuroTest AI", "url": "https://neurotest.live" },
          "browserRequirements": "Requires JavaScript. Works in Chrome, Firefox, Safari, Edge.",
        }) }} />
        <meta name="theme-color" content="#050508" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="preload" href="/models/brain-optimized.glb" as="fetch" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased noise-bg">{children}</body>
    </html>
  );
}
