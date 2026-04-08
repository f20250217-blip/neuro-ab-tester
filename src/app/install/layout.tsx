import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Install NeuroTest AI Chrome Extension",
  description: "Install the NeuroTest AI browser extension to track your browsing patterns and analyze how your digital habits affect your brain. Works on Chrome, Brave, and Edge.",
  alternates: { canonical: "/install" },
};

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return children;
}
