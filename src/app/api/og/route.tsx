import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/* ── Archetype lookup (mirrors ShareCard logic) ── */

function getArchetype(type: string) {
  const map: Record<string, { name: string; emoji: string; colorA: string; colorB: string }> = {
    empath:     { name: "The Empath",     emoji: "\u2764\uFE0F\u200D\uD83D\uDD25", colorA: "#e8457a", colorB: "#7c6cf0" },
    catalyst:   { name: "The Catalyst",   emoji: "\u26A1",       colorA: "#e8457a", colorB: "#ffb020" },
    architect:  { name: "The Architect",  emoji: "\uD83E\uDDE0", colorA: "#7c6cf0", colorB: "#00e8b0" },
    closer:     { name: "The Closer",     emoji: "\uD83C\uDFAF", colorA: "#00e8b0", colorB: "#ffb020" },
    magnet:     { name: "The Magnet",     emoji: "\uD83D\uDD2E", colorA: "#ffb020", colorB: "#e8457a" },
    oracle:     { name: "The Oracle",     emoji: "\uD83D\uDEE1\uFE0F", colorA: "#00e8b0", colorB: "#7c6cf0" },
    strategist: { name: "The Strategist", emoji: "\u265F\uFE0F", colorA: "#7c6cf0", colorB: "#00e8b0" },
  };
  return map[type.toLowerCase()] || map.strategist;
}

function getRank(score: number) {
  if (score >= 90) return { label: "Top 3%", badge: "ELITE", color: "#FFD700" };
  if (score >= 80) return { label: "Top 12%", badge: "EXCEPTIONAL", color: "#00e8b0" };
  if (score >= 70) return { label: "Top 24%", badge: "ADVANCED", color: "#7c6cf0" };
  if (score >= 60) return { label: "Top 38%", badge: "STRONG", color: "#9d8ff8" };
  if (score >= 50) return { label: "Above Average", badge: "SOLID", color: "#7a7a98" };
  return { label: "Developing", badge: "EMERGING", color: "#4a4a68" };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const score = Math.min(100, Math.max(0, parseInt(searchParams.get("score") || "50", 10)));
  const type = searchParams.get("type") || "strategist";
  const insight = searchParams.get("insight") || "";
  const mode = searchParams.get("mode") || "Analysis";

  const arch = getArchetype(type);
  const rank = getRank(score);

  // Score ring: SVG arc calculation
  const circumference = 2 * Math.PI * 54;
  const strokeDash = (score / 100) * circumference;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(145deg, #0c0c18 0%, #08080f 50%, #050508 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "50px 60px",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Ambient glows */}
        <div style={{ position: "absolute", top: -80, right: -60, width: 400, height: 400, borderRadius: "50%", background: arch.colorA, opacity: 0.12, filter: "blur(100px)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 300, height: 300, borderRadius: "50%", background: arch.colorB, opacity: 0.08, filter: "blur(90px)", display: "flex" }} />

        {/* Top row: branding + badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#7c6cf0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-7 3.5 14 3-12 2.5 5H22" /></svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#7a7a98", letterSpacing: "0.15em", textTransform: "uppercase" as const }}>NeuroTest</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 20, background: `${rank.color}15`, border: `1px solid ${rank.color}30` }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: rank.color, display: "flex" }} />
            <span style={{ fontSize: 13, fontWeight: 900, color: rank.color, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{rank.badge}</span>
          </div>
        </div>

        {/* Main content row */}
        <div style={{ display: "flex", alignItems: "center", gap: 50, flex: 1 }}>
          {/* Score ring */}
          <div style={{ position: "relative", width: 180, height: 180, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="180" height="180" viewBox="0 0 128 128" style={{ transform: "rotate(-90deg)", position: "absolute" }}>
              <circle cx="64" cy="64" r="54" fill="none" stroke="#1e1e30" strokeWidth="5" />
              <circle cx="64" cy="64" r="54" fill="none" stroke={arch.colorA} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${strokeDash} ${circumference}`} />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              <span style={{ fontSize: 56, fontWeight: 900, color: "#f0f0f8", lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: 14, color: "#4a4a68", fontWeight: 600 }}>/100</span>
            </div>
          </div>

          {/* Archetype + insight */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 28 }}>{arch.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#4a4a68", letterSpacing: "0.15em", textTransform: "uppercase" as const }}>{mode}</span>
            </div>
            <span style={{ fontSize: 48, fontWeight: 900, background: `linear-gradient(135deg, ${arch.colorA}, ${arch.colorB})`, backgroundClip: "text", color: "transparent", lineHeight: 1.1 }}>
              {arch.name}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: rank.color }}>{rank.label}</span>
              <span style={{ fontSize: 14, color: "#4a4a68" }}>|</span>
              <span style={{ fontSize: 14, color: "#7a7a98" }}>Outperforms {score >= 90 ? "97" : score >= 80 ? "88" : score >= 70 ? "76" : score >= 60 ? "62" : "48"}% of analyzed patterns</span>
            </div>
            {insight && (
              <span style={{ fontSize: 15, color: "#9d8ff8", lineHeight: 1.6, fontStyle: "italic", maxWidth: 550 }}>
                &ldquo;{insight.slice(0, 150)}{insight.length > 150 ? "..." : ""}&rdquo;
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(30,30,48,0.4)", paddingTop: 20, marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00e8b0", display: "flex" }} />
            <span style={{ fontSize: 13, color: "#4a4a68" }}>5 AI agents &middot; 37 features &middot; 12 brain regions</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#7c6cf0" }}>neurotest.live</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
