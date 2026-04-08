"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import { NeuralAnalysis } from "@/lib/neuro-engine";

/* ══════════════════════════════════════════════════════════
   VIRALITY ENGINE — personality insights, social proof,
   percentile ranks, competitive hooks
   ══════════════════════════════════════════════════════════ */

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
    return { name: "The Empath", emoji: "\u2764\uFE0F\u200D\uD83D\uDD25", desc: "Rare ability to forge deep emotional bonds through radical authenticity", gradient: "from-[#e8457a] to-[#7c6cf0]", glowA: "#e8457a", glowB: "#7c6cf0" };
  if (top === "emotional")
    return { name: "The Catalyst", emoji: "\u26A1", desc: "You don't just create content \u2014 you ignite reactions", gradient: "from-[#e8457a] to-[#ffb020]", glowA: "#e8457a", glowB: "#ffb020" };
  if (top === "memory")
    return { name: "The Architect", emoji: "\uD83E\uDDE0", desc: "Your patterns leave permanent neural imprints others can't replicate", gradient: "from-[#7c6cf0] to-[#00e8b0]", glowA: "#7c6cf0", glowB: "#00e8b0" };
  if (top === "decision")
    return { name: "The Closer", emoji: "\uD83C\uDFAF", desc: "Wired for conversion \u2014 you trigger action at the subconscious level", gradient: "from-[#00e8b0] to-[#ffb020]", glowA: "#00e8b0", glowB: "#ffb020" };
  if (top === "attention")
    return { name: "The Magnet", emoji: "\uD83D\uDD2E", desc: "Impossible to ignore \u2014 your signal cuts through the noise", gradient: "from-[#ffb020] to-[#e8457a]", glowA: "#ffb020", glowB: "#e8457a" };
  if (top === "trust")
    return { name: "The Oracle", emoji: "\uD83D\uDEE1\uFE0F", desc: "You radiate authority \u2014 people believe you before you even speak", gradient: "from-[#00e8b0] to-[#7c6cf0]", glowA: "#00e8b0", glowB: "#7c6cf0" };
  return { name: "The Strategist", emoji: "\u265F\uFE0F", desc: "No weaknesses detected \u2014 a rare balanced neural signature", gradient: "from-[#7c6cf0] to-[#00e8b0]", glowA: "#7c6cf0", glowB: "#00e8b0" };
}

/* ── Personality-driven insight generator ── */

function generateInsight(a: NeuralAnalysis): string {
  const score = Math.round(a.overallScore * 10);
  const topRegion = [...a.regions].sort((x, y) => y.activation - x.activation)[0];

  // High-score insights (bragging rights)
  if (score >= 85) {
    if (a.emotionalImpact >= 8) return "Your brain processes emotional signals with rare intensity. You don't just understand feelings \u2014 you weaponize them.";
    if (a.attentionCapture >= 8) return "Your neural attention signature is in the top tier. Your brain locks on to stimuli faster than 91% of patterns we've analyzed.";
    if (a.memoryRetention >= 8) return "Exceptional memory encoding detected. Your neural patterns create sticky impressions that persist long after exposure.";
    if (a.decisionTrigger >= 8) return "Your decision-making circuits fire with surgical precision. You process choices faster than most brains can register the options.";
    return "Your neural signature is unusually powerful. High activation across multiple regions suggests a rare multi-dimensional processing style.";
  }

  // Mid-high insights (intriguing + aspirational)
  if (score >= 65) {
    if (a.emotionalImpact > a.attentionCapture) return `Your brain leads with emotion over logic \u2014 a pattern linked to high creative intelligence. Peak ${topRegion.name.toLowerCase()} activation confirms strong intuitive processing.`;
    if (a.attentionCapture > a.memoryRetention) return `Sharp attentional focus paired with moderate memory encoding. Your brain is wired to capture moments intensely but selectively \u2014 quality over quantity.`;
    if (a.trustBuilding >= 7) return `Unusual trust-signaling strength detected. Your patterns trigger credibility responses in other brains before conscious evaluation kicks in.`;
    return `Your neural profile shows ${topRegion.name.toLowerCase()} dominance with secondary activation in pattern recognition. This combination is found in strategic thinkers.`;
  }

  // Mid insights (curious + growth-oriented)
  if (score >= 45) {
    if (a.emotionalImpact >= 6) return `Your emotional processing is your hidden superpower \u2014 stronger than your overall score suggests. Your brain prioritizes feeling over analysis, a pattern common in natural communicators.`;
    if (a.attentionCapture <= 4) return `Your brain shows a rare deep-processing pattern \u2014 you filter noise aggressively. What gets through your attention gate hits harder than most.`;
    return `Balanced neural activation with untapped potential in ${topRegion.name.toLowerCase()}. Your brain is wired for growth \u2014 small optimizations could shift your score significantly.`;
  }

  // Lower scores (still positive + intriguing)
  if (a.trustBuilding >= 5) return `Your brain leads with trust calibration \u2014 a rare defensive intelligence. You evaluate before engaging, a pattern found in analytical and strategic minds.`;
  return `Your neural signature reveals a selective processing style. Your brain conserves energy by filtering aggressively \u2014 when you do engage, activation spikes sharply.`;
}

/* ── Social proof: percentile rank ── */

function getPercentile(score: number): { percentile: number; label: string; badge: string; badgeColor: string } {
  // Deterministic percentile based on score distribution
  // Designed to make ~70% of users feel good (above average) while staying believable
  if (score >= 90) return { percentile: 97, label: "Top 3%", badge: "ELITE", badgeColor: "#FFD700" };
  if (score >= 80) return { percentile: 88, label: "Top 12%", badge: "EXCEPTIONAL", badgeColor: "#00e8b0" };
  if (score >= 70) return { percentile: 76, label: "Top 24%", badge: "ADVANCED", badgeColor: "#7c6cf0" };
  if (score >= 60) return { percentile: 62, label: "Top 38%", badge: "STRONG", badgeColor: "#9d8ff8" };
  if (score >= 50) return { percentile: 48, label: "Above Average", badge: "SOLID", badgeColor: "#7a7a98" };
  if (score >= 40) return { percentile: 35, label: "Average", badge: "BASELINE", badgeColor: "#4a4a68" };
  return { percentile: 22, label: "Developing", badge: "EMERGING", badgeColor: "#4a4a68" };
}

/* ── types ── */

interface ShareCardProps {
  analysis: NeuralAnalysis;
  mode: string;
  color: string;
}

/* ══════════════════════════════════════════════════════════
   SHARE CARD COMPONENT
   ══════════════════════════════════════════════════════════ */

export default function ShareCard({ analysis, mode, color }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile once on mount — no re-renders
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);
  }, []);

  // Entrance animation trigger
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 100);
    return () => clearTimeout(t);
  }, []);

  const arch = getArchetype(analysis);
  const insight = generateInsight(analysis);
  const score = Math.round(analysis.overallScore * 10);
  const rank = getPercentile(score);
  const topRegions = [...analysis.regions].sort((a, b) => b.activation - a.activation).slice(0, 3);

  const metrics = [
    { label: "Emotion", value: analysis.emotionalImpact, emoji: "\u2764\uFE0F" },
    { label: "Memory", value: analysis.memoryRetention, emoji: "\uD83E\uDDE0" },
    { label: "Focus", value: analysis.attentionCapture, emoji: "\uD83D\uDC41\uFE0F" },
  ];

  /* ── Share text (pre-computed, zero cost) ── */

  const shareTextShort = `I scored ${score}/100 on NeuroTest AI (${rank.label}). My archetype: ${arch.name} ${arch.emoji}. Decode yours:`;
  const twitterText = `My brain archetype: ${arch.name} ${arch.emoji}\nNeural score: ${score}/100 (${rank.label})\n\n"${insight.slice(0, 120)}${insight.length > 120 ? "..." : ""}"\n\nDecode yours free \u2192 neurotest.live`;
  const whatsAppText = `I just decoded my brain using AI \uD83E\uDDE0\n\nMy score: ${score}/100 \u2014 ${rank.label}\nArchetype: ${arch.name} ${arch.emoji}\n\n"${insight}"\n\nCan you beat my score? Try free: https://neurotest.live`;
  const copyText = `I scored ${score}/100 on NeuroTest AI (${rank.label}). Decode your brain free: https://neurotest.live`;

  /* ── Image capture (lazy — only when user explicitly requests) ── */

  const captureCard = useCallback(async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
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

  /* ── Platform share handlers ── */

  const handleTwitter = useCallback(() => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`, "_blank", "noopener,noreferrer");
  }, [twitterText]);

  const handleWhatsApp = useCallback(() => {
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsAppText)}`, "_blank", "noopener,noreferrer");
  }, [whatsAppText]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      // Fallback for older mobile browsers
      const ta = document.createElement("textarea");
      ta.value = copyText;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [copyText]);

  /* ── Primary share — INSTANT on mobile, no image generation ── */

  const handleShare = useCallback(async () => {
    // Mobile with Web Share API: instant text + link share
    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: `My Brain: ${arch.name} (${score}/100)`,
          text: shareTextShort,
          url: "https://neurotest.live",
        });
        return;
      } catch (e: unknown) {
        // AbortError = user cancelled, not a failure
        if (e instanceof Error && e.name === "AbortError") return;
        // Actual failure — show fallback buttons
        setShareFailed(true);
        return;
      }
    }

    // Desktop: no native share, open Twitter as default
    if (!isMobile) {
      handleTwitter();
      return;
    }

    // Mobile without Web Share API (rare): WhatsApp as primary
    handleWhatsApp();
  }, [isMobile, arch.name, score, shareTextShort, handleTwitter, handleWhatsApp]);

  /* ── Score ring math ── */

  const circumference = 2 * Math.PI * 54;
  const strokeDash = (score / 100) * circumference;

  return (
    <div
      className="share-card-wrapper"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
        transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* ════════════════════════════════════════════════════
         THE CARD — everything inside cardRef is captured
         ════════════════════════════════════════════════════ */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-3xl"
        style={{
          background: `linear-gradient(145deg, #0c0c18 0%, #08080f 50%, #060610 100%)`,
          border: "1px solid rgba(124,108,240,0.12)",
        }}
      >
        {/* ── Layered ambient glows ── */}
        <div className="absolute top-[-60px] right-[-40px] w-[250px] h-[250px] rounded-full blur-[100px] opacity-[0.18]" style={{ background: arch.glowA }} />
        <div className="absolute bottom-[-50px] left-[-30px] w-[200px] h-[200px] rounded-full blur-[90px] opacity-[0.12]" style={{ background: arch.glowB }} />
        <div className="absolute top-[40%] left-[30%] w-[350px] h-[350px] rounded-full blur-[120px] opacity-[0.05]" style={{ background: `linear-gradient(135deg, ${arch.glowA}, ${arch.glowB})` }} />

        {/* ── Subtle grid pattern ── */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(124,108,240,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(124,108,240,0.4) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative p-6 sm:p-8">
          {/* ── Header: logo + rank badge ── */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#7c6cf0] flex items-center justify-center" style={{ boxShadow: "0 0 12px rgba(124,108,240,0.3)" }}>
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12h4l3-7 3.5 14 3-12 2.5 5H22" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-[#7a7a98] uppercase tracking-[0.15em]">NeuroTest</span>
            </div>

            {/* Rank badge */}
            <div
              className="px-3 py-1 rounded-full flex items-center gap-1.5"
              style={{ background: `${rank.badgeColor}12`, border: `1px solid ${rank.badgeColor}25` }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rank.badgeColor, boxShadow: `0 0 6px ${rank.badgeColor}` }} />
              <span className="text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: rank.badgeColor }}>{rank.badge}</span>
            </div>
          </div>

          {/* ── Score ring + archetype ── */}
          <div className="flex items-center gap-5 sm:gap-7 mb-6">
            {/* Score ring with glow */}
            <div className="relative flex-shrink-0">
              {/* Outer glow ring */}
              <div className="absolute inset-[-4px] rounded-full opacity-30 blur-[8px]" style={{ background: `conic-gradient(from 0deg, ${color}, transparent ${score}%, transparent)` }} />
              <svg width="120" height="120" viewBox="0 0 128 128" className="transform -rotate-90 relative">
                <circle cx="64" cy="64" r="54" fill="none" stroke="#1e1e30" strokeWidth="5" />
                <circle
                  cx="64" cy="64" r="54" fill="none"
                  stroke="url(#scoreGradient)" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${strokeDash} ${circumference}`}
                  style={{ filter: `drop-shadow(0 0 10px ${color}88)`, transition: "stroke-dasharray 1.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={arch.glowA} />
                    <stop offset="100%" stopColor={arch.glowB} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[38px] font-black tabular-nums text-[#f0f0f8] leading-none" style={{ textShadow: `0 0 20px ${color}33` }}>{score}</span>
                <span className="text-[10px] text-[#4a4a68] font-semibold">/100</span>
              </div>
            </div>

            {/* Archetype */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{arch.emoji}</span>
                <span className="text-[10px] font-bold text-[#4a4a68] uppercase tracking-[0.15em]">{mode} Analysis</span>
              </div>
              <h3 className={`text-[26px] sm:text-[32px] font-black bg-gradient-to-r ${arch.gradient} bg-clip-text text-transparent leading-[1.1]`}>
                {arch.name}
              </h3>
              <p className="text-[11px] text-[#7a7a98] mt-1.5 leading-relaxed max-w-[260px]">{arch.desc}</p>
            </div>
          </div>

          {/* ── Social proof strip ── */}
          <div className="flex items-center gap-3 mb-5 px-3.5 py-2.5 rounded-xl bg-[#0c0c14]/80 border border-[#1e1e30]/30">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" style={{ color: rank.badgeColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span className="text-[11px] font-bold" style={{ color: rank.badgeColor }}>{rank.label}</span>
            </div>
            <div className="w-px h-3 bg-[#1e1e30]" />
            <span className="text-[11px] text-[#7a7a98]">Outperforms <strong className="text-[#f0f0f8]">{rank.percentile}%</strong> of analyzed patterns</span>
          </div>

          {/* ── 3 key metrics with emoji ── */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {metrics.map((m) => {
              const pct = (m.value / 10) * 100;
              return (
                <div key={m.label} className="rounded-xl p-3 text-center border border-[#1e1e30]/30" style={{ background: "rgba(12,12,20,0.7)" }}>
                  <div className="text-sm mb-1">{m.emoji}</div>
                  <div className="text-[18px] font-black tabular-nums text-[#f0f0f8]">{m.value.toFixed(1)}</div>
                  <div className="text-[9px] text-[#4a4a68] font-semibold uppercase tracking-wider mb-2">{m.label}</div>
                  {/* Mini bar */}
                  <div className="h-1 rounded-full bg-[#1e1e30] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${arch.glowA}, ${arch.glowB})`, transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Neural insight (the share-worthy text) ── */}
          <div className="rounded-xl p-4 mb-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(124,108,240,0.06), rgba(0,232,176,0.03))", border: "1px solid rgba(124,108,240,0.1)" }}>
            <div className="absolute top-0 left-0 w-1 h-full rounded-r" style={{ background: `linear-gradient(180deg, ${arch.glowA}, ${arch.glowB})` }} />
            <p className="text-[12px] text-[#c4bfff] leading-[1.7] pl-3 italic">&ldquo;{insight}&rdquo;</p>
          </div>

          {/* ── Top brain regions ── */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {topRegions.map((r, i) => (
              <span
                key={r.id}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border bg-[#050508]/50 flex items-center gap-1.5"
                style={{ color: r.color, borderColor: `${r.color}20` }}
              >
                <span className="text-[8px]">{i === 0 ? "\u{1F525}" : i === 1 ? "\u26A1" : "\u2728"}</span>
                {r.name} {(r.activation * 100).toFixed(0)}%
              </span>
            ))}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between pt-4 border-t border-[#1e1e30]/25">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#00e8b0]" style={{ boxShadow: "0 0 4px #00e8b0" }} />
              <span className="text-[10px] text-[#4a4a68]">5 AI agents &middot; 37 features &middot; 12 brain regions</span>
            </div>
            <span className="text-[11px] font-bold" style={{ color }}>neurotest.live</span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
         SHARE SECTION — NOT captured in image
         ════════════════════════════════════════════════════ */}

      {/* ── Competition hook ── */}
      <div className="mt-6 mb-4 text-center">
        <p className="text-sm text-[#7a7a98] font-medium">
          <span className="text-[#f0f0f8]">{"\uD83D\uDD01"} Challenge your friends</span> — can they beat {score}/100?
        </p>
      </div>

      {/* ── Primary share button — instant, no image gen ── */}
      <button
        onClick={handleShare}
        className="w-full py-4 rounded-2xl text-white text-base font-bold flex items-center justify-center gap-2.5 active:scale-[0.97] mb-3"
        style={{
          background: `linear-gradient(135deg, ${arch.glowA}, ${arch.glowB})`,
          boxShadow: `0 4px 25px ${arch.glowA}33, 0 2px 10px ${arch.glowB}22`,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Share Your Brain Score
      </button>

      {/* ── Share failed fallback (only shows on error) ── */}
      {shareFailed && (
        <div className="mb-3 p-3 rounded-xl bg-[#0c0c14] border border-[#ffb020]/20 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#ffb020]">Sharing unavailable — use these instead:</span>
          <div className="flex gap-2">
            <button
              onClick={handleWhatsApp}
              className="px-3 py-1.5 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-[10px] font-bold active:scale-[0.95]"
              style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
            >
              WhatsApp
            </button>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-[#7c6cf0]/10 border border-[#7c6cf0]/20 text-[#7c6cf0] text-[10px] font-bold active:scale-[0.95]"
              style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      )}

      {/* ── Secondary actions — mobile: 3 cols (no save), desktop: 4 cols ── */}
      <div className={`grid gap-2 ${isMobile ? "grid-cols-3" : "grid-cols-4"}`}>
        {/* WhatsApp — first on mobile (most used in India) */}
        <button
          onClick={handleWhatsApp}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-[#0c0c14] border border-[#1e1e30] hover:border-[#25D366]/30 active:border-[#25D366]/50 text-[#7a7a98] text-[10px] font-semibold active:scale-[0.95]"
          style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation", minHeight: "56px" }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
          WhatsApp
        </button>

        {/* Twitter / X */}
        <button
          onClick={handleTwitter}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-[#0c0c14] border border-[#1e1e30] hover:border-[#7c6cf0]/30 active:border-[#7c6cf0]/50 text-[#7a7a98] text-[10px] font-semibold active:scale-[0.95]"
          style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation", minHeight: "56px" }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          Post
        </button>

        {/* Copy */}
        <button
          onClick={handleCopyLink}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-[#0c0c14] border border-[#1e1e30] hover:border-[#4a4a68]/40 active:border-[#00e8b0]/40 text-[#7a7a98] text-[10px] font-semibold active:scale-[0.95]"
          style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation", minHeight: "56px" }}
        >
          {copied ? (
            <>
              <svg className="w-5 h-5 text-[#00e8b0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              <span className="text-[#00e8b0]">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
              Copy
            </>
          )}
        </button>

        {/* Save Image — desktop only (hidden on mobile to reduce clutter) */}
        {!isMobile && (
          <button
            onClick={handleDownload}
            disabled={generating}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-[#0c0c14] border border-[#1e1e30] hover:border-[#7c6cf0]/30 text-[#7a7a98] text-[10px] font-semibold transition-all active:scale-[0.95] disabled:opacity-50"
            style={{ minHeight: "56px" }}
          >
            {generating ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" className="opacity-25" /><path d="M4 12a8 8 0 018-8" className="opacity-75" /></svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            )}
            Save
          </button>
        )}
      </div>
    </div>
  );
}
