import { NextRequest, NextResponse } from "next/server";
import { callWithFallback } from "@/lib/llm-providers";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export const maxDuration = 120;

const SYSTEM_PROMPT = `You are a world-class neuroscientist, digital wellness researcher, and behavioral psychologist. You specialize in how internet browsing patterns affect brain chemistry, attention, emotional regulation, and cognitive function.

You will receive a user's real browsing session data including:
- Sites visited with time spent on each
- Categories of browsing (social media, video, news, shopping, etc.)
- Total session duration
- Number of unique sites

Analyze this data and provide a comprehensive neural impact assessment.

RESPOND IN THIS EXACT FORMAT:

dopamine_load: X (0-10, how much dopamine-spiking content: social media likes, shopping deals, video rabbit holes, notifications)
attention_drain: X (0-10, how fragmented their attention is: many short visits = high drain, few deep visits = low drain)
stress_level: X (0-10, based on news consumption, doom-scrolling patterns, work email frequency, information overload)
learning_score: X (0-10, educational/productive browsing ratio: Wikipedia, courses, documentation, Stack Overflow)
creativity_score: X (0-10, creative inspiration sources: design sites, art, music, creative tools vs pure consumption)
social_need_score: X (0-10, social validation seeking: social media dominance, messaging frequency, comment sections)
memory_impact: X (0-10, how much is likely to be retained: deep reading vs skimming, focused vs scattered)
sleep_risk: X (0-10, blue light + stimulating content that will affect sleep if browsing at night)
addiction_risk: X (0-10, compulsive patterns: frequent site revisits, social media checking loops, infinite scroll content)
focus_quality: X (0-10, ability to sustain deep focus based on browsing patterns)
emotional_regulation: X (0-10, emotional content exposure: news outrage, social comparison, FOMO triggers)
productivity_ratio: X (0-10, productive vs consumptive browsing ratio)

BRAIN_REGIONS_AFFECTED:
- Prefrontal Cortex: X/10 (decision fatigue, impulse control)
- Amygdala: X/10 (emotional arousal from content)
- Hippocampus: X/10 (memory formation from learned content)
- Nucleus Accumbens: X/10 (reward/dopamine from likes, deals, novelty)
- Visual Cortex: X/10 (visual stimulation load)
- Anterior Cingulate: X/10 (attention allocation stress)

SUMMARY: <2-3 sentences: honest, direct assessment of what this browsing session is doing to their brain. Be specific about which patterns are helpful vs harmful. Use casual but authoritative tone — like a cool neuroscientist friend who's honest with you.>

DETAILED_EFFECTS: <3-4 paragraphs explaining the neural effects in depth. Cover: 1) What's happening to their dopamine system, 2) Impact on attention span and focus, 3) Emotional effects, 4) What they could change for better brain health. Be specific to THEIR actual data, not generic advice.>

RECOMMENDATIONS: 1. <specific actionable rec> 2. <specific actionable rec> 3. <specific actionable rec> 4. <specific actionable rec> 5. <specific actionable rec>`;

function parseResponse(text: string) {
  const extractScore = (key: string): number => {
    const regex = new RegExp(`${key}[:\\s]*([0-9.]+)`, "i");
    const match = text.match(regex);
    return match ? Math.min(10, Math.max(0, parseFloat(match[1]))) : 5;
  };

  const extractSection = (key: string): string => {
    const regex = new RegExp(`${key}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, "s");
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  };

  const extractRecs = (): string[] => {
    const recsSection = extractSection("RECOMMENDATIONS");
    const recs = recsSection.match(/\d+\.\s*(.+)/g);
    return recs ? recs.map(r => r.replace(/^\d+\.\s*/, "").trim()).slice(0, 5) : [];
  };

  // Parse brain regions
  const regions: Record<string, number> = {};
  const regionSection = text.match(/BRAIN_REGIONS_AFFECTED:[\s\S]*?(?=\nSUMMARY:|$)/)?.[0] || "";
  const regionMatches = regionSection.matchAll(/- (.+?):\s*([0-9.]+)/g);
  for (const m of regionMatches) {
    regions[m[1].trim()] = parseFloat(m[2]);
  }

  return {
    dopamineLoad: extractScore("dopamine_load"),
    attentionDrain: extractScore("attention_drain"),
    stressLevel: extractScore("stress_level"),
    learningScore: extractScore("learning_score"),
    creativityScore: extractScore("creativity_score"),
    socialNeedScore: extractScore("social_need_score"),
    memoryImpact: extractScore("memory_impact"),
    sleepRisk: extractScore("sleep_risk"),
    addictionRisk: extractScore("addiction_risk"),
    focusQuality: extractScore("focus_quality"),
    emotionalRegulation: extractScore("emotional_regulation"),
    productivityRatio: extractScore("productivity_ratio"),
    brainRegions: regions,
    summary: extractSection("SUMMARY") || "Analysis complete.",
    detailedEffects: extractSection("DETAILED_EFFECTS") || "",
    recommendations: extractRecs(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionMinutes, totalMinutes, siteCount, topSites, categories, timestamp } = body;

    // Input validation
    if (typeof sessionMinutes !== 'number' || sessionMinutes < 0 || sessionMinutes > 10080) {
      return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
    }
    if (!Array.isArray(topSites) || topSites.length > 100) {
      return NextResponse.json({ error: "Invalid browsing data" }, { status: 400 });
    }
    if (typeof categories !== 'object' || categories === null || Object.keys(categories).length > 50) {
      return NextResponse.json({ error: "Invalid category data" }, { status: 400 });
    }
    // Validate individual site entries
    for (const site of topSites) {
      if (typeof site.host !== 'string' || site.host.length > 255) {
        return NextResponse.json({ error: "Invalid site data" }, { status: 400 });
      }
    }

    if (!topSites || topSites.length === 0) {
      return NextResponse.json({ error: "No browsing data provided" }, { status: 400 });
    }

    // Build the browsing summary for the AI
    const catSummary = Object.entries(categories as Record<string, number>)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([cat, mins]) => `  ${cat}: ${mins} minutes`)
      .join("\n");

    const siteSummary = (topSites as Array<{ host: string; minutes: number; visits: number; category: string }>)
      .map((s, i) => `  ${i + 1}. ${s.host} — ${s.minutes}m (${s.visits} visits) [${s.category}]`)
      .join("\n");

    const userMessage = `BROWSING SESSION DATA:
Session Duration: ${sessionMinutes} minutes
Total Active Browsing: ${totalMinutes} minutes
Unique Sites: ${siteCount}
Timestamp: ${timestamp}

CATEGORY BREAKDOWN:
${catSummary}

TOP SITES (by time spent):
${siteSummary}

Analyze the neural effects of this browsing session. Be honest and specific.`;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ];

    const analysisText = await callWithFallback({
      messages,
      temperature: 0.4,
      maxTokens: 3000,
      requiresVision: false,
    });

    const analysis = parseResponse(analysisText);

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("Brain history analysis error:", error.message?.slice(0, 300));
    const safeMessage = (error.message && !error.message.includes('API') && !error.message.includes('key') && !error.message.includes('token'))
      ? error.message
      : 'Analysis failed. Please try again.';
    return NextResponse.json(
      { error: safeMessage },
      { status: 500 }
    );
  }
}
