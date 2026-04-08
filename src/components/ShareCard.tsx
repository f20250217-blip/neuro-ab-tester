"use client";

import { useRef, useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { NeuralAnalysis } from "@/lib/neuro-engine";

/* ── helpers ─────────────────────────────────────────────── */

function getArchetype(a: NeuralAnalysis) {
  const scores = [
    { key: "emotional", v: a.emotionalImpact },
    { key: "memory", v: a.memoryRetention },
    { key: "decision", v: a.decisionTrigger },
    { key: "attention", v: a.attentionCapture },
    { key: "trust", v: a.trustBuilding },
  ].sort((x, y) => y.v - x.v);
  const top = scores[0].key;
  const second = scores[1].key;

  if (top === "emotional" && second === "trust")
    return { name: "The Empath", desc: "Builds deep emotional connections through authentic trust signals", gradient: "from-[#e8457a] to-[#7c6cf0]" };
  if (top === "emotional")
    return { name: "The Catalyst", desc: "Ignites powerful emotional responses that drive action", gradient: "from-[#e8457a] to-[#ffb020]" };
  if (top === "memory")
    return { name: "The Architect", desc: "Creates lasting neural imprints that stick in memory", gradient: "from-[#7c6cf0] to-[#00e8b0]" };
  if (top === "decision")
    return { name: "The Closer", desc: "Engineered to trigger decisive action at the right moment", gradient: "from-[#00e8b0] to-[#ffb020]" };
  if (top === "attention")
    return { name: "The Magnet", desc: "Captures and holds attention in a world of distractions", gradient: "from-[#ffb020] to-[#e8457a]" };
  if (top === "trust")
    return { name: "The Oracle", desc: "Commands authority and builds unshakeable credibility", gradient: "from-[#00e8b0] to-[#7c6cf0]" };
  return { name: "The Strategist", desc: "Balanced neural profile with no single weakness", gradient: "from-[#7c6cf0] to-[#00e8b0]" };
}

function generateInsight(a: NeuralAnalysis): string {
  const traits: string[] = [];
  if (a.emotionalImpact >= 7) traits.push("high emotional resonance");
  else if (a.emotionalImpact <= 4) traits.push("analytical detachment");
  if (a.attentionCapture >= 7) traits.push("magnetic attention pull");
  if (a.memoryRetention >= 7) traits.push("exceptional memorability");
  if (a.decisionTrigger >= 7) traits.push("strong decision activation");
  if (a.trustBuilding >= 7) traits.push("deep trust signaling");

  if (a.attentionCapture <= 4) traits.push("subtle processing style");
  if (a.decisionTrigger <= 4) traits.push("reflective decision patterns");

  const topRegions = [...a.regions]
    .sort((x, y) => y.activation - x.activation)
    .slice(0, 2)
    .map((r) => r.name.toLowerCase());

  const base = traits.length > 0
    ? `Your neural signature shows ${traits.slice(0, 2).join(" with ")}${traits.length > 2 ? `, plus ${traits[2]}` : ""}.`
    : `Your neural profile reveals a balanced processing pattern across all dimensions.`;

  return `${base} Peak activation in ${topRegions.join(" and ")} regions.`;
}

/* ── types ────────────────────────────────────────────────── */

interface ShareCardProps {
  analysis: NeuralAnalysis;
  mode: string;
  color: string;
}

/* ── component ───────────────────────────────────────────── */

export default function ShareCard({ analysis, mode, color }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const arch = getArchetype(analysis);
  const insight = generateInsight(analysis);
  const score = Math.round(analysis.overallScore * 10); // convert 0-10 → 0-100
  const topRegions = [...analysis.regions].sort((a, b) => b.activation - a.activation).slice(0, 3);

  const metrics = [
    { label: "Emotion", value: analysis.emotionalImpact, icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    { label: "Memory", value: analysis.memoryRetention, icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
    { label: "Focus", value: analysis.attentionCapture, icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
  ];

  /* ── image generation ─────────────────────────────────── */

  const captureCard = useCallback(async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      // Capture at 2x for retina/social quality
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#050508",
      });
      return dataUrl;
    } catch {
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    const dataUrl = await captureCard();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `neurotest-${arch.name.toLowerCase().replace(/\s/g, "-")}-${score}.png`;
    link.href = dataUrl;
    link.click();
  }, [captureCard, arch.name, score]);

  const shareText = `I just decoded my brain with AI. My neural score: ${score}/100 \u{1F9E0}\n\nArchetype: ${arch.name}\n\nTest yours free \u{2192} https://neurotest.live`;

  const handleTwitter = useCallback(() => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [shareText]);

  const handleWhatsApp = useCallback(() => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [shareText]);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText("https://neurotest.live");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  /* ── score ring arc ───────────────────────────────────── */

  const circumference = 2 * Math.PI * 54;
  const strokeDash = (score / 100) * circumference;

  return (
    <div className="share-card-wrapper animate-float-up">
      {/* ── The card (this is what gets captured as image) ── */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-3xl border border-[#1e1e30]/60"
        style={{ background: "linear-gradient(145deg, #0a0a14 0%, #080810 40%, #06060e 100%)" }}
      >
        {/* Ambient glows */}
        <div className="absolute top-[-40px] right-[-40px] w-[200px] h-[200px] rounded-full blur-[80px] opacity-[0.15]" style={{ background: color }} />
        <div className="absolute bottom-[-30px] left-[-30px] w-[160px] h-[160px] rounded-full blur-[70px] opacity-[0.08]" style={{ background: color }} />
        <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[300px] h-[300px] rounded-full blur-[100px] opacity-[0.04]" style={{ background: `linear-gradient(135deg, ${color}, #00e8b0)` }} />

        <div className="relative p-7 sm:p-9">
          {/* Header: logo + mode badge */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#7c6cf0] flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12h4l3-7 3.5 14 3-12 2.5 5H22" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-[#7a7a98] uppercase tracking-[0.15em]">NeuroTest</span>
            </div>
            <div className="px-3 py-1 rounded-full border border-[#1e1e30] bg-[#0c0c14]/80">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color }}>{mode}</span>
            </div>
          </div>

          {/* Score ring + archetype */}
          <div className="flex items-center gap-7 sm:gap-9 mb-8">
            {/* Score ring */}
            <div className="relative flex-shrink-0">
              <svg width="128" height="128" viewBox="0 0 128 128" className="transform -rotate-90">
                {/* Track */}
                <circle cx="64" cy="64" r="54" fill="none" stroke="#1e1e30" strokeWidth="6" />
                {/* Score arc */}
                <circle
                  cx="64" cy="64" r="54" fill="none"
                  stroke={color} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${strokeDash} ${circumference}`}
                  className="transition-all duration-1000"
                  style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black tabular-nums text-[#f0f0f8] leading-none">{score}</span>
                <span className="text-[10px] text-[#4a4a68] font-semibold mt-0.5">/100</span>
              </div>
            </div>

            {/* Archetype + insight */}
            <div className="flex-1 min-w-0">
              <h3 className={`text-2xl sm:text-3xl font-black bg-gradient-to-r ${arch.gradient} bg-clip-text text-transparent leading-tight`}>
                {arch.name}
              </h3>
              <p className="text-[11px] text-[#7a7a98] mt-2 leading-relaxed">{arch.desc}</p>
            </div>
          </div>

          {/* 3 key metrics */}
          <div className="grid grid-cols-3 gap-3 mb-7">
            {metrics.map((m) => (
              <div key={m.label} className="bg-[#0c0c14]/80 rounded-xl p-3.5 border border-[#1e1e30]/40 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <svg className="w-3.5 h-3.5 text-[#4a4a68]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d={m.icon} />
                  </svg>
                  <span className="text-[9px] text-[#4a4a68] font-semibold uppercase tracking-wider">{m.label}</span>
                </div>
                <div className="text-xl font-black tabular-nums text-[#f0f0f8]">{m.value.toFixed(1)}</div>
                <div className="mt-1.5 h-1 rounded-full bg-[#1e1e30] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(m.value / 10) * 100}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Neural insight */}
          <div className="bg-[#0c0c14]/60 rounded-xl p-4 border border-[#1e1e30]/30 mb-6">
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${color}15` }}>
                <svg className="w-3 h-3" style={{ color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12h4l3-7 3.5 14 3-12 2.5 5H22" />
                </svg>
              </div>
              <p className="text-[11px] text-[#9d8ff8] leading-relaxed italic">&ldquo;{insight}&rdquo;</p>
            </div>
          </div>

          {/* Top brain regions */}
          <div className="flex flex-wrap gap-2 mb-6">
            {topRegions.map((r) => (
              <span
                key={r.id}
                className="px-3 py-1.5 rounded-lg text-[10px] font-semibold border border-[#1e1e30]/50 bg-[#050508]/60"
                style={{ color: r.color }}
              >
                {r.name} {(r.activation * 100).toFixed(0)}%
              </span>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="flex items-center justify-between pt-5 border-t border-[#1e1e30]/30">
            <span className="text-[11px] text-[#4a4a68] font-medium">Decode your brain at</span>
            <span className="text-[11px] font-bold" style={{ color }}>neurotest.live</span>
          </div>
        </div>
      </div>

      {/* ── Share action buttons (NOT captured in image) ── */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7c6cf0] hover:bg-[#8d7ff8] text-white text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-60"
        >
          {generating ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" className="opacity-25" /><path d="M4 12a8 8 0 018-8" className="opacity-75" /></svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
          )}
          Save Image
        </button>

        {/* Twitter / X */}
        <button
          onClick={handleTwitter}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0c0c14] border border-[#1e1e30] hover:border-[#7c6cf0]/40 text-[#f0f0f8] text-sm font-medium transition-all active:scale-[0.97]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          Share
        </button>

        {/* WhatsApp */}
        <button
          onClick={handleWhatsApp}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0c0c14] border border-[#1e1e30] hover:border-[#25D366]/40 text-[#f0f0f8] text-sm font-medium transition-all active:scale-[0.97]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
          WhatsApp
        </button>

        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0c0c14] border border-[#1e1e30] hover:border-[#4a4a68] text-[#7a7a98] text-sm font-medium transition-all active:scale-[0.97]"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-[#00e8b0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              <span className="text-[#00e8b0]">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
              Copy Link
            </>
          )}
        </button>
      </div>
    </div>
  );
}
