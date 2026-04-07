import { callGroq } from "./llm-providers";
import type { PerformancePrediction, PlatformScore, AttentionFlow, CreativeHealth, AudiencePersona } from "./neuro-engine";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const PREMIUM_PROMPT = `You are a senior advertising strategist and creative effectiveness analyst. Based on the content analysis below, provide the following assessments. Be specific and data-driven.

OUTPUT FORMAT (respond in exactly this JSON structure, no markdown fences):
{
  "performance": {
    "overallScore": <1-100>,
    "estimatedCTR": "<range like 1.2% - 2.4%>",
    "engagementRate": "<percentage>",
    "conversionPotential": "<Low|Medium|High|Very High>",
    "viewThroughRate": "<percentage>",
    "shareability": "<Low|Medium|High|Very High>"
  },
  "platforms": [
    {"platform": "Meta", "score": <0-10>, "fit": "<Poor|Average|Good|Excellent>", "tip": "<one optimization tip>"},
    {"platform": "TikTok", "score": <0-10>, "fit": "<Poor|Average|Good|Excellent>", "tip": "<tip>"},
    {"platform": "YouTube", "score": <0-10>, "fit": "<Poor|Average|Good|Excellent>", "tip": "<tip>"},
    {"platform": "LinkedIn", "score": <0-10>, "fit": "<Poor|Average|Good|Excellent>", "tip": "<tip>"},
    {"platform": "Display", "score": <0-10>, "fit": "<Poor|Average|Good|Excellent>", "tip": "<tip>"}
  ],
  "attention": {
    "firstSecond": "<what viewer notices in first 1 second>",
    "threeSeconds": "<what registers by 3 seconds>",
    "fiveSeconds": "<full comprehension by 5 seconds>",
    "attentionHotspots": ["<top element 1>", "<top element 2>", "<top element 3>"],
    "attentionWeaknesses": ["<missed element 1>", "<missed element 2>"]
  },
  "health": {
    "fatigueLifespanDays": <5-60>,
    "fatigueReason": "<why this content will fatigue at this rate>",
    "brandSafetyScore": <0-10>,
    "brandSafetyFlags": ["<issue 1 if any>"],
    "accessibilityScore": <0-10>,
    "accessibilityIssues": ["<issue 1 if any>"]
  },
  "personas": [
    {
      "name": "Gen Z (18-24)",
      "reaction": "<2-3 sentence authentic reaction from this persona>",
      "resonanceScore": <0-10>,
      "keyDrivers": ["<what resonates 1>", "<what resonates 2>"],
      "turnoffs": ["<what doesn't work 1>", "<what doesn't work 2>"]
    },
    {
      "name": "Millennials (25-34)",
      "reaction": "<reaction>",
      "resonanceScore": <0-10>,
      "keyDrivers": ["<driver 1>", "<driver 2>"],
      "turnoffs": ["<turnoff 1>", "<turnoff 2>"]
    },
    {
      "name": "Parents (35-50)",
      "reaction": "<reaction>",
      "resonanceScore": <0-10>,
      "keyDrivers": ["<driver 1>", "<driver 2>"],
      "turnoffs": ["<turnoff 1>", "<turnoff 2>"]
    },
    {
      "name": "Professionals (30-45)",
      "reaction": "<reaction>",
      "resonanceScore": <0-10>,
      "keyDrivers": ["<driver 1>", "<driver 2>"],
      "turnoffs": ["<turnoff 1>", "<turnoff 2>"]
    },
    {
      "name": "Budget-Conscious (all ages)",
      "reaction": "<reaction>",
      "resonanceScore": <0-10>,
      "keyDrivers": ["<driver 1>", "<driver 2>"],
      "turnoffs": ["<turnoff 1>", "<turnoff 2>"]
    }
  ]
}

SCORING RULES:
- Performance score 1-100: most generic content scores 30-50, good content 50-70, excellent 70-85, world-class 85+
- Platform scores: TikTok rewards fast hooks/energy, LinkedIn rewards authority/data, Meta rewards emotional storytelling, YouTube rewards narrative depth, Display rewards visual simplicity
- Fatigue lifespan: simple/gimmicky content = 5-10 days, solid content = 15-25 days, evergreen storytelling = 30-60 days
- Brand safety: flag any potentially controversial, offensive, or legally risky elements. Score 10 = perfectly safe, 0 = major issues
- Accessibility: check contrast, text size, color-only info, flashing, reading clarity. Score 10 = fully accessible, 0 = major barriers
- Persona reactions: write in first person as if that person just watched the ad. Be authentic and specific, not generic.

Be HONEST and CRITICAL. Do not inflate scores.`;

export interface PremiumFeatures {
  performancePrediction: PerformancePrediction;
  platformScores: PlatformScore[];
  attentionFlow: AttentionFlow;
  creativeHealth: CreativeHealth;
  audiencePersonas: AudiencePersona[];
}

export async function runPremiumAnalysis(
  detailedAnalysis: string,
  transcript: string,
  visualAnalysis: string,
  audioAnalysis: string,
  pacingAnalysis: string
): Promise<PremiumFeatures | null> {
  const contentContext = [
    "=== DETAILED ANALYSIS ===",
    detailedAnalysis,
    "",
    "=== TRANSCRIPT ===",
    transcript || "No speech detected.",
    "",
    "=== VISUAL ANALYSIS ===",
    visualAnalysis,
    "",
    "=== AUDIO ANALYSIS ===",
    audioAnalysis,
    "",
    "=== PACING ANALYSIS ===",
    pacingAnalysis,
  ].join("\n");

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: PREMIUM_PROMPT },
    { role: "user", content: contentContext },
  ];

  try {
    const response = await callGroq(messages, 0.3, 4096);

    // Extract JSON from response (handle potential markdown fences)
    let jsonStr = response;
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr);

    return {
      performancePrediction: {
        overallScore: parsed.performance?.overallScore ?? 50,
        estimatedCTR: parsed.performance?.estimatedCTR ?? "1.0% - 2.0%",
        engagementRate: parsed.performance?.engagementRate ?? "3.0%",
        conversionPotential: parsed.performance?.conversionPotential ?? "Medium",
        viewThroughRate: parsed.performance?.viewThroughRate ?? "45%",
        shareability: parsed.performance?.shareability ?? "Medium",
      },
      platformScores: (parsed.platforms || []).map((p: any) => ({
        platform: p.platform || "Unknown",
        score: Math.min(10, Math.max(0, p.score ?? 5)),
        fit: p.fit || "Average",
        tip: p.tip || "No specific tip",
      })),
      attentionFlow: {
        firstSecond: parsed.attention?.firstSecond ?? "Primary visual element",
        threeSeconds: parsed.attention?.threeSeconds ?? "Key message",
        fiveSeconds: parsed.attention?.fiveSeconds ?? "Full comprehension",
        attentionHotspots: parsed.attention?.attentionHotspots ?? [],
        attentionWeaknesses: parsed.attention?.attentionWeaknesses ?? [],
      },
      creativeHealth: {
        fatigueLifespanDays: parsed.health?.fatigueLifespanDays ?? 15,
        fatigueReason: parsed.health?.fatigueReason ?? "Standard lifecycle",
        brandSafetyScore: Math.min(10, Math.max(0, parsed.health?.brandSafetyScore ?? 8)),
        brandSafetyFlags: parsed.health?.brandSafetyFlags ?? [],
        accessibilityScore: Math.min(10, Math.max(0, parsed.health?.accessibilityScore ?? 6)),
        accessibilityIssues: parsed.health?.accessibilityIssues ?? [],
      },
      audiencePersonas: (parsed.personas || []).map((p: any) => ({
        name: p.name || "Unknown",
        reaction: p.reaction || "No reaction generated",
        resonanceScore: Math.min(10, Math.max(0, p.resonanceScore ?? 5)),
        keyDrivers: p.keyDrivers ?? [],
        turnoffs: p.turnoffs ?? [],
      })),
    };
  } catch (err: any) {
    console.error("Premium analysis failed:", err.message?.slice(0, 200));
    return null;
  }
}
