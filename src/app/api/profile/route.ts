import { NextRequest, NextResponse } from "next/server";
import { callWithFallback } from "@/lib/llm-providers";
import { runPremiumAnalysis } from "@/lib/premium-analysis";
import {
  parseAnalysisToFeatures,
  buildNeuralAnalysis,
} from "@/lib/analyzer";
import type { ChatCompletionMessageParam, ChatCompletionContentPart } from "openai/resources/chat/completions";

export const maxDuration = 120;

const MODE_PROMPTS: Record<string, string> = {
  photo: `You are a world-class behavioral psychologist and personality analyst with expertise in visual psychology, micro-expression analysis, and environmental psychology. Analyze the uploaded photos to build a comprehensive neural personality profile.

ANALYZE:
- Personality traits (Big Five: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism)
- Emotional patterns and baseline mood
- Lifestyle indicators (active/sedentary, social/solitary, organized/spontaneous)
- Aesthetic preferences and visual processing style
- Environmental preferences and comfort zones
- Social behavior patterns visible in photos
- Hidden psychological signals (posture, gaze direction, personal space usage, color choices)

Be specific and insightful. Base everything on observable evidence in the photos.`,

  music: `You are a world-class music psychologist and neuroscience researcher specializing in how music affects the brain. Analyze this music/audio content to build a comprehensive neural profile of the listener/creator.

ANALYZE:
- Emotional resonance patterns (what emotions this music triggers)
- Personality correlates (research shows music taste maps to Big Five traits)
- Mood regulation patterns (is this uplifting, calming, energizing, cathartic?)
- Cognitive style indicators (complexity preference, novelty seeking)
- Social identity signals (what listening to this says about someone)
- Neurochemical triggers (dopamine from anticipation/drops, serotonin from harmony, cortisol from tension)
- Attention patterns (how the music structures focus and flow)

Be specific about the musical elements and their psychological effects.`,

  browsing: `You are a world-class digital behavior analyst and cognitive scientist specializing in online attention patterns, digital wellness, and behavioral profiling from web activity data.

ANALYZE THIS BROWSING DATA:
- Interest map (top interest categories, depth vs breadth of curiosity)
- Attention patterns (binge vs. scanning, deep reading vs. skimming)
- Digital wellness indicators (doom-scrolling patterns, productive vs. escapist usage)
- Cognitive style (analytical vs. creative content preference, information processing style)
- Personality indicators from browsing behavior
- Time-of-day patterns and their psychological significance
- Social vs. solitary browsing patterns
- Dopamine loop indicators (social media checking frequency, notification-driven behavior)
- Information diet quality (diverse vs. echo chamber, factual vs. entertainment)

Be honest and insightful. Highlight both strengths and concerning patterns.`,

  social: `You are a world-class social media psychologist and digital identity researcher. Analyze this social media content/profile to build a comprehensive neural profile.

ANALYZE:
- Communication style (assertive, passive, aggressive, analytical, expressive)
- Self-presentation strategy (authentic vs. curated, vulnerable vs. guarded)
- Influence patterns (leader vs. follower, creator vs. consumer)
- Social motivation (validation-seeking, connection-seeking, information-sharing, entertainment)
- Emotional expression patterns (range, authenticity, regulation)
- Network behavior (bridger vs. bonder, hub vs. peripheral)
- Personal brand strength and consistency
- Psychological needs being met through social media
- Potential psychological risks (comparison, FOMO, dopamine addiction)

Be specific and base insights on observable patterns.`,

  text: `You are a world-class computational linguist, psycholinguist, and communication psychologist. Analyze this text/chat content to build a comprehensive neural profile of the writer.

ANALYZE:
- Communication style (formal vs. casual, direct vs. indirect, verbose vs. concise)
- Emotional intelligence indicators (empathy markers, emotional vocabulary richness)
- Cognitive complexity (sentence structure, vocabulary level, abstract vs. concrete thinking)
- Persuasion patterns (logical, emotional, social proof, authority-based)
- Personality indicators from language use (pronouns, hedging, certainty markers)
- Attachment style indicators (anxious, avoidant, secure patterns in communication)
- Power dynamics awareness (assertiveness, deference, collaboration markers)
- Authenticity markers (genuine vs. performative language)
- Mental state indicators (stress markers, confidence level, engagement)

Be psychologically rigorous and specific.`,

  "screen-time": `You are a world-class digital wellness researcher and behavioral neuroscientist specializing in screen addiction, attention economics, and digital habit formation.

ANALYZE THIS SCREEN TIME DATA:
- Digital addiction risk score (based on total hours, app switching frequency, late-night usage)
- Attention health (deep focus capability vs. fragmented attention)
- Productivity vs. consumption ratio
- Dopamine loop patterns (which apps trigger compulsive use)
- Sleep impact assessment (blue light exposure, late-night screen time)
- Social connection quality (meaningful communication vs. passive scrolling)
- Cognitive load assessment (multitasking patterns, context switching)
- Digital wellness recommendations
- Comparison to healthy baselines
- Neurological impact assessment (attention span, memory, creativity effects)

Be honest about risks while acknowledging positive usage patterns.`,
};

const SCORING_INSTRUCTIONS = `

Now rate each dimension from 0-10 (most should fall 3-7, 8+ is rare):
emotional_intensity: X
urgency: X
surprise: X
empathy: X
vulnerability: X
anticipation: X
visual_quality: X
movement: X
color_intensity: X
face_presence: X
contrast: X
voice_clarity: X
music_presence: X
audio_variety: X
speech_clarity: X
power_words: X
simplicity: X
rhetorical_devices: X
message_clarity: X
coherence: X
pacing: X
hook_strength: X
storytelling: X
logical_structure: X
complexity: X
repetition: X
call_to_action: X
value_proposition: X
social_proof: X
exclusivity: X
has_data: X
novelty: X
personal_relevance: X
context_relevance: X
social_context: X
character_presence: X
authenticity: X
energy_level: X

Then provide:
VISUAL_ANALYSIS: <describe what you see>
AUDIO_ANALYSIS: <describe audio elements if any, or "N/A for this content type">
PACING_ANALYSIS: <describe the pacing/flow>
TRANSCRIPT: <key text content if any>
DETAILED_ANALYSIS: <3-4 paragraph deep analysis>
EMOTION_BREAKDOWN (0-1 scale): joy=X surprise=X fear=X trust=X anticipation=X sadness=X
RECOMMENDATIONS: 1. <rec1> 2. <rec2> 3. <rec3> 4. <rec4> 5. <rec5>`;

function parseAnalysisResponse(text: string) {
  const extractScore = (key: string): number => {
    const regex = new RegExp(`${key}[:\\s]*([0-9.]+)`, "i");
    const match = text.match(regex);
    return match ? parseFloat(match[1]) / 10 : 0.5;
  };

  const extractSection = (key: string): string => {
    const regex = new RegExp(`${key}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, "s");
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  };

  const extractEmotions = () => {
    const extract = (name: string) => {
      const regex = new RegExp(`${name}[=:]\\s*([0-9.]+)`, "i");
      const match = text.match(regex);
      return match ? parseFloat(match[1]) : 0.5;
    };
    return {
      joy: extract("joy"),
      surprise: extract("surprise"),
      fear: extract("fear"),
      trust: extract("trust"),
      anticipation: extract("anticipation"),
      sadness: extract("sadness"),
    };
  };

  const extractRecs = (): string[] => {
    const recsSection = extractSection("RECOMMENDATIONS");
    const recs = recsSection.match(/\d+\.\s*(.+)/g);
    return recs ? recs.map(r => r.replace(/^\d+\.\s*/, "").trim()) : ["Enhance content quality", "Add more engagement elements"];
  };

  return {
    features: {
      emotionalIntensity: extractScore("emotional_intensity"),
      urgency: extractScore("urgency"),
      surprise: extractScore("surprise"),
      empathy: extractScore("empathy"),
      vulnerability: extractScore("vulnerability"),
      anticipation: extractScore("anticipation"),
      visualQuality: extractScore("visual_quality"),
      movement: extractScore("movement"),
      colorIntensity: extractScore("color_intensity"),
      facePresence: extractScore("face_presence"),
      contrast: extractScore("contrast"),
      voiceClarity: extractScore("voice_clarity"),
      musicPresence: extractScore("music_presence"),
      audioVariety: extractScore("audio_variety"),
      speechClarity: extractScore("speech_clarity"),
      powerWords: extractScore("power_words"),
      simplicity: extractScore("simplicity"),
      rhetoricalDevices: extractScore("rhetorical_devices"),
      messageClarity: extractScore("message_clarity"),
      coherence: extractScore("coherence"),
      pacing: extractScore("pacing"),
      hookStrength: extractScore("hook_strength"),
      storytelling: extractScore("storytelling"),
      logicalStructure: extractScore("logical_structure"),
      complexity: extractScore("complexity"),
      repetition: extractScore("repetition"),
      callToAction: extractScore("call_to_action"),
      valueProposition: extractScore("value_proposition"),
      socialProof: extractScore("social_proof"),
      exclusivity: extractScore("exclusivity"),
      hasData: extractScore("has_data"),
      novelty: extractScore("novelty"),
      personalRelevance: extractScore("personal_relevance"),
      contextRelevance: extractScore("context_relevance"),
      socialContext: extractScore("social_context"),
      characterPresence: extractScore("character_presence"),
      authenticity: extractScore("authenticity"),
      energyLevel: extractScore("energy_level"),
    },
    visual: extractSection("VISUAL_ANALYSIS") || "Visual analysis completed.",
    audio: extractSection("AUDIO_ANALYSIS") || "Audio analysis completed.",
    pacing: extractSection("PACING_ANALYSIS") || "Pacing analysis completed.",
    transcript: extractSection("TRANSCRIPT") || "",
    detailed: extractSection("DETAILED_ANALYSIS") || "Analysis completed successfully.",
    emotions: extractEmotions(),
    recommendations: extractRecs(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const ALLOWED_MODES = ["photo", "music", "browsing", "social", "text", "screen-time"];
    const mode = (formData.get("mode") as string) || "photo";
    if (!ALLOWED_MODES.includes(mode)) {
      return NextResponse.json({ error: "Invalid analysis mode" }, { status: 400 });
    }
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;
    const url = formData.get("url") as string | null;

    if (!file && !text && !url) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    const systemPrompt = (MODE_PROMPTS[mode] || MODE_PROMPTS.photo) + SCORING_INSTRUCTIONS;

    // Build message content
    const contentParts: ChatCompletionContentPart[] = [];

    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large. Maximum size: 50MB" }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mime = file.type || "application/octet-stream";

      if (mime.startsWith("image/")) {
        contentParts.push({
          type: "image_url",
          image_url: { url: `data:${mime};base64,${base64}` },
        });
      } else if (mime.startsWith("audio/") || mime.startsWith("video/")) {
        contentParts.push({
          type: "image_url",
          image_url: { url: `data:${mime};base64,${base64}` },
        });
      } else {
        // Text-based file (JSON, CSV, etc.)
        const textContent = Buffer.from(bytes).toString("utf-8").slice(0, 15000);
        contentParts.push({
          type: "text",
          text: `FILE CONTENT (${file.name}):\n${textContent}`,
        });
      }
    }

    if (text) {
      contentParts.push({
        type: "text",
        text: `USER PROVIDED TEXT:\n${text.slice(0, 15000)}`,
      });
    }

    if (url) {
      // Sanitize URL - only pass the hostname to prevent prompt injection
      let safeUrl = url;
      try {
        const parsed = new URL(url);
        safeUrl = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
      } catch { /* use raw url if invalid */ }
      contentParts.push({
        type: "text",
        text: `URL TO ANALYZE: ${safeUrl}`,
      });
    }

    contentParts.push({
      type: "text",
      text: "Analyze this content now. Provide all scores and sections as specified.",
    });

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: contentParts },
    ];

    // Call AI
    const requiresVision = file?.type?.startsWith("image/") || file?.type?.startsWith("video/");
    const analysisText = await callWithFallback({
      messages,
      temperature: 0.3,
      maxTokens: 4096,
      requiresVision: !!requiresVision,
    });

    // Parse response
    const parsed = parseAnalysisResponse(analysisText);

    // Build neural analysis
    const analysis = buildNeuralAnalysis(
      `profile-${mode}-${Date.now()}`,
      `${mode.charAt(0).toUpperCase() + mode.slice(1)} Profile`,
      parsed.features,
      parsed.transcript,
      parsed.visual,
      parsed.audio,
      parsed.pacing,
      parsed.emotions,
      parsed.recommendations,
      parsed.detailed,
      undefined,
    );

    // Run premium analysis
    try {
      const premium = await runPremiumAnalysis(
        parsed.detailed,
        parsed.transcript,
        parsed.visual,
        parsed.audio,
        parsed.pacing
      );
      if (premium) {
        analysis.performancePrediction = premium.performancePrediction;
        analysis.platformScores = premium.platformScores;
        analysis.attentionFlow = premium.attentionFlow;
        analysis.creativeHealth = premium.creativeHealth;
        analysis.audiencePersonas = premium.audiencePersonas;
      }
    } catch (e) {
      console.error("Premium analysis failed for profile:", e);
    }

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("Profile analysis error:", error.message?.slice(0, 300));
    const safeMessage = (error.message && !error.message.includes('API') && !error.message.includes('key') && !error.message.includes('token'))
      ? error.message
      : 'Analysis failed. Please try again.';
    return NextResponse.json(
      { error: safeMessage },
      { status: 500 }
    );
  }
}
