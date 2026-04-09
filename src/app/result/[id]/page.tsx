import type { Metadata } from "next";
import Link from "next/link";
import { decodeResult } from "@/lib/result-codec";

/* ── Archetype lookup ── */

function getArchetype(type: string) {
  const map: Record<string, { name: string; emoji: string; desc: string }> = {
    empath:     { name: "The Empath",     emoji: "❤️‍🔥", desc: "Rare ability to forge deep emotional bonds through radical authenticity" },
    catalyst:   { name: "The Catalyst",   emoji: "⚡",       desc: "Ignites powerful emotional responses that drive action" },
    architect:  { name: "The Architect",  emoji: "🧠", desc: "Creates lasting neural imprints others can't replicate" },
    closer:     { name: "The Closer",     emoji: "🎯", desc: "Wired for conversion — triggers action at the subconscious level" },
    magnet:     { name: "The Magnet",     emoji: "🔮", desc: "Impossible to ignore — cuts through the noise" },
    oracle:     { name: "The Oracle",     emoji: "🛡️", desc: "Radiates authority — people believe before you speak" },
    strategist: { name: "The Strategist", emoji: "♟️", desc: "No weaknesses detected — a rare balanced neural signature" },
  };
  return map[type?.toLowerCase()] || map.strategist;
}

function getRank(score: number) {
  if (score >= 90) return "Top 3%";
  if (score >= 80) return "Top 12%";
  if (score >= 70) return "Top 24%";
  if (score >= 60) return "Top 38%";
  if (score >= 50) return "Above Average";
  return "Developing";
}

/* ── Dynamic OG metadata ── */

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = decodeResult(id);
  if (!data) {
    return { title: "NeuroTest AI — Decode Your Brain" };
  }

  const { score, type, mode, insight } = data;
  const arch = getArchetype(type);
  const rank = getRank(score);

  const title = `${arch.name} ${arch.emoji} — ${score}/100 | NeuroTest AI`;
  const description = insight
    ? `"${insight.slice(0, 155)}" — ${rank}. Decode your brain free at neurotest.live`
    : `Brain score: ${score}/100 (${rank}). ${arch.desc}. Decode your brain free at neurotest.live`;

  const ogImageUrl = `/api/og?score=${score}&type=${encodeURIComponent(type)}&insight=${encodeURIComponent(insight.slice(0, 150))}&mode=${encodeURIComponent(mode)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.neurotest.live/result/${id}`,
      siteName: "NeuroTest AI",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${arch.name} — ${score}/100 Neural Score` }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${arch.name} ${arch.emoji} — ${score}/100`,
      description,
      images: [ogImageUrl],
    },
  };
}

/* ── Page component ── */

export default async function ResultPage({ params }: Props) {
  const { id } = await params;
  const data = decodeResult(id);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center px-4 py-12">
        <h1 className="text-2xl font-bold text-[#f0f0f8] mb-4">Result not found</h1>
        <Link href="/" className="text-[#7c6cf0] hover:underline">Take the test →</Link>
      </div>
    );
  }

  const { score, type, mode, insight } = data;
  const arch = getArchetype(type);
  const rank = getRank(score);

  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-lg relative overflow-hidden rounded-3xl"
        style={{ background: "linear-gradient(145deg, #0c0c18 0%, #08080f 50%, #060610 100%)", border: "1px solid rgba(124,108,240,0.12)" }}
      >
        <div className="relative p-7 sm:p-9">
          {/* Header */}
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#7c6cf0] flex items-center justify-center" style={{ boxShadow: "0 0 12px rgba(124,108,240,0.3)" }}>
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-7 3.5 14 3-12 2.5 5H22" /></svg>
              </div>
              <span className="text-xs font-bold text-[#7a7a98] uppercase tracking-[0.15em]">NeuroTest</span>
            </div>
            <span className="text-xs font-bold text-[#7c6cf0] uppercase tracking-wider">{rank}</span>
          </div>

          {/* Score + archetype */}
          <div className="text-center mb-6">
            <div className="text-6xl font-black text-[#f0f0f8] tabular-nums mb-1">{score}<span className="text-xl text-[#4a4a68]">/100</span></div>
            <div className="text-2xl mb-1">{arch.emoji}</div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-[#7c6cf0] to-[#00e8b0] bg-clip-text text-transparent">{arch.name}</h1>
            <p className="text-sm text-[#7a7a98] mt-2 max-w-xs mx-auto leading-relaxed">{mode} Analysis</p>
          </div>

          {/* Insight */}
          <div className="rounded-xl p-4 mb-7 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(124,108,240,0.06), rgba(0,232,176,0.03))", border: "1px solid rgba(124,108,240,0.1)" }}>
            <div className="absolute top-0 left-0 w-1 h-full rounded-r bg-gradient-to-b from-[#7c6cf0] to-[#00e8b0]" />
            <p className="text-sm text-[#c4bfff] leading-relaxed pl-3 italic">&ldquo;{insight || arch.desc}&rdquo;</p>
          </div>

          {/* CTA */}
          <Link
            href="/"
            className="block w-full py-4 rounded-2xl bg-[#7c6cf0] hover:bg-[#8d7ff8] text-white text-center text-base font-bold transition-colors"
          >
            Decode Your Brain Free
          </Link>
          <p className="text-center text-[11px] text-[#4a4a68] mt-3">Free. No signup. Results in 30 seconds.</p>
        </div>
      </div>
    </div>
  );
}
