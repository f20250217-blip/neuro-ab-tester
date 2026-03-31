import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ytdl from "@distube/ytdl-core";
import {
  ContentFeatures,
  parseAnalysisToFeatures,
  buildNeuralAnalysis,
  compareAnalyses,
} from "@/lib/analyzer";
import { NeuralAnalysis } from "@/lib/neuro-engine";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Allow larger uploads (up to 20MB)
export const config = {
  api: { bodyParser: false },
};

const ANALYSIS_PROMPT = `You are a world-class neuromarketing scientist with 20+ years of expertise in consumer neuroscience, fMRI studies, eye-tracking research, and behavioral psychology. You have deep knowledge of how the brain processes marketing content based on peer-reviewed research from journals like the Journal of Consumer Psychology, NeuroImage, and the Journal of Marketing Research.

ANALYZE THIS CONTENT WITH EXTREME PRECISION. Do NOT give generic or inflated scores. Be brutally honest.

SCORING RULES (CRITICAL — follow these exactly):
- 0-1: Feature is completely absent or anti-effective
- 2-3: Feature is weak, barely present, amateur execution
- 4-5: Feature is average, present but unremarkable — most generic content falls here
- 6-7: Feature is strong, well-executed, above average
- 8-9: Feature is exceptional, professional-grade, top 10% of content
- 10: Feature is world-class, best-in-class execution, rarely given
- IMPORTANT: Most scores should fall between 3-7. A score of 8+ should be rare and justified. Do NOT inflate scores.
- Score each dimension INDEPENDENTLY. A video can have great visuals (8) but terrible CTA (2).
- Base scores on OBSERVABLE EVIDENCE in the content, not assumptions.

WHAT TO ANALYZE IN DETAIL:
- VISUALS: Camera angles, lighting quality, color grading, composition (rule of thirds), text overlays, thumbnails, transitions, b-roll usage, face close-ups, eye contact with camera, background design, brand elements
- AUDIO: Voice tone/pitch/pace, background music genre & energy, sound effects, audio mixing quality, silence usage, ASMR elements, voice-over vs talking head
- LANGUAGE: Power words (free, new, proven, secret, instant), emotional triggers, rhetorical questions, metaphors, repetition patterns, sentence length variation, reading level
- PERSUASION: Cialdini's 6 principles (reciprocity, commitment, social proof, authority, liking, scarcity), loss aversion framing, anchoring, decoy effects, bandwagon effect
- STRUCTURE: Hook in first 3 seconds, pattern interrupts, open loops, payoff timing, CTA placement, information density per second
- NEUROSCIENCE MARKERS: Mirror neuron triggers (facial expressions, gestures), dopamine triggers (curiosity gaps, rewards), oxytocin triggers (stories, trust), cortisol triggers (urgency, fear), serotonin triggers (social validation)

Rate each dimension from 0-10 with decimal precision (e.g., 6.5):
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

---VISUAL_ANALYSIS---
[Provide 4-5 detailed sentences analyzing: camera work & angles, lighting (natural/studio/dramatic), color palette & grading, composition & framing, text overlays & graphics, face presence & eye contact, visual transitions, production quality level (amateur/semi-pro/professional/broadcast), and specific visual techniques used (zoom, pan, split-screen, etc.)]

---AUDIO_ANALYSIS---
[Provide 4-5 detailed sentences analyzing: voice characteristics (pitch, pace, accent, confidence level), background music (genre, tempo BPM estimate, energy level, emotional tone), sound design & effects, audio mixing quality, strategic use of silence/pauses, whether voice matches the content's intent, and vocal techniques (emphasis, whisper, crescendo)]

---PACING_ANALYSIS---
[Provide 4-5 detailed sentences analyzing: hook timing (how quickly it grabs attention), information density (bits per second), pattern interrupts and their timing, build-up to key moments, CTA timing relative to emotional peaks, overall rhythm (fast-cut vs slow-burn), scene/topic transition speed, and whether pacing matches the platform it's designed for]

---EMOTION_BREAKDOWN---
joy: X
surprise: X
fear: X
trust: X
anticipation: X
sadness: X

---RECOMMENDATIONS---
1. [Specific, actionable recommendation with WHY it would work neurologically — reference the exact brain region or psychological principle]
2. [Specific, actionable recommendation targeting the weakest scoring dimension]
3. [Specific, actionable recommendation to improve memory retention (hippocampal encoding)]
4. [Specific, actionable recommendation to increase conversion/action (motor cortex + prefrontal activation)]
5. [Specific, actionable recommendation comparing to best practices from top-performing content in this category]

---DETAILED_ANALYSIS---
[Provide 6-8 sentences of expert-level neural response analysis. Map specific content elements to specific brain regions: Prefrontal Cortex (decision-making), Amygdala (emotional processing), Hippocampus (memory formation), Visual Cortex (V1-V5 processing), Auditory Cortex, Broca's Area (language production), Wernicke's Area (comprehension), Nucleus Accumbens (reward/dopamine), Insula (empathy/trust), Anterior Cingulate (attention), Motor Cortex (action impulse), Temporal Pole (narrative). Discuss the likely fMRI activation pattern. Reference specific neuroscience findings (e.g., "faces activate the fusiform face area within 170ms" or "narrative transport increases oxytocin by up to 47%"). Predict real-world performance: estimated watch-through rate, recall likelihood after 24h, and conversion potential.]`;

// Convert a File to base64 data
async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  return { base64, mimeType: file.type };
}

// Social media platforms that need special handling
const SOCIAL_PLATFORMS = [
  "youtube.com", "youtu.be",
  "instagram.com",
  "tiktok.com",
  "facebook.com", "fb.watch",
  "twitter.com", "x.com",
  "reddit.com",
  "pinterest.com", "pin.it",
  "snapchat.com",
  "linkedin.com",
  "vimeo.com",
  "dailymotion.com",
  "twitch.tv",
  "threads.net",
];

function isSocialMediaUrl(url: string): boolean {
  return SOCIAL_PLATFORMS.some((domain) => url.includes(domain));
}

// Download video from any social platform using cobalt API
async function socialMediaToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  // Try cobalt API (supports YouTube, Instagram, TikTok, Twitter, Facebook, Reddit, Pinterest, etc.)
  const cobaltInstances = [
    "https://api.cobalt.tools",
    "https://cobalt-api.ayo.tf",
  ];

  for (const instance of cobaltInstances) {
    try {
      const cobaltRes = await fetch(instance, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          url,
          videoQuality: "360",
          filenameStyle: "basic",
        }),
      });

      if (!cobaltRes.ok) continue;

      const cobaltData = await cobaltRes.json();

      // cobalt returns a direct download URL or tunnel URL
      let downloadUrl = "";
      if (cobaltData.status === "redirect" || cobaltData.status === "tunnel") {
        downloadUrl = cobaltData.url;
      } else if (cobaltData.status === "picker" && cobaltData.picker?.length > 0) {
        // For posts with multiple media, pick the first video or image
        const videoItem = cobaltData.picker.find((p: any) => p.type === "video") || cobaltData.picker[0];
        downloadUrl = videoItem.url;
      }

      if (downloadUrl) {
        const mediaRes = await fetch(downloadUrl);
        if (!mediaRes.ok) continue;

        const buffer = await mediaRes.arrayBuffer();
        const contentType = mediaRes.headers.get("content-type") || "video/mp4";
        const mimeType = contentType.split(";")[0].trim();

        return {
          base64: Buffer.from(buffer).toString("base64"),
          mimeType: mimeType.startsWith("video/") || mimeType.startsWith("image/") || mimeType.startsWith("audio/")
            ? mimeType
            : "video/mp4",
        };
      }
    } catch (err: any) {
      console.log(`Cobalt instance ${instance} failed:`, err.message);
    }
  }

  // Fallback for YouTube: try ytdl-core
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    try {
      return await youtubeWithYtdl(url);
    } catch (err: any) {
      console.log("ytdl-core fallback failed:", err.message);
      return youtubeThumbFallback(url);
    }
  }

  throw new Error("Could not download video from this URL. Please download it manually and upload the file.");
}

// YouTube download via ytdl-core
async function youtubeWithYtdl(url: string): Promise<{ base64: string; mimeType: string }> {
  const stream = ytdl(url, {
    quality: "lowestvideo",
    filter: "videoandaudio",
  });

  const chunks: Buffer[] = [];
  let totalSize = 0;
  const MAX_SIZE = 15 * 1024 * 1024;

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
    totalSize += chunk.length;
    if (totalSize > MAX_SIZE) {
      stream.destroy();
      break;
    }
  }

  return {
    base64: Buffer.concat(chunks).toString("base64"),
    mimeType: "video/mp4",
  };
}

// YouTube thumbnail fallback
async function youtubeThumbFallback(url: string): Promise<{ base64: string; mimeType: string }> {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!match) throw new Error("Could not extract YouTube video ID");
  const videoId = match[1];

  for (const quality of ["maxresdefault", "hqdefault", "mqdefault"]) {
    const thumbUrl = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    const response = await fetch(thumbUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      return { base64: Buffer.from(buffer).toString("base64"), mimeType: "image/jpeg" };
    }
  }

  throw new Error("Could not fetch YouTube thumbnail");
}

// Download content from any URL
async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  // Handle social media platforms
  if (isSocialMediaUrl(url)) {
    return socialMediaToBase64(url);
  }

  // Direct URL fetch for regular links
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "image/*,video/*,audio/*,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to download from URL (${response.status}). Try uploading the file directly.`);
  }

  const contentType = response.headers.get("content-type") || "";
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  let mimeType = contentType.split(";")[0].trim();
  if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/") && !mimeType.startsWith("audio/")) {
    if (url.match(/\.(jpg|jpeg)$/i)) mimeType = "image/jpeg";
    else if (url.match(/\.png$/i)) mimeType = "image/png";
    else if (url.match(/\.mp4$/i)) mimeType = "video/mp4";
    else if (url.match(/\.webm$/i)) mimeType = "video/webm";
    else mimeType = "image/jpeg";
  }

  return { base64, mimeType };
}

// Analyze content using Gemini AI
async function aiAnalysis(
  contentData: { base64: string; mimeType: string },
  contentType: "video" | "image" | "audio"
): Promise<{
  features: ContentFeatures;
  visualDesc: string;
  audioDesc: string;
  pacingDesc: string;
  emotionBreakdown: NeuralAnalysis["emotionBreakdown"];
  recommendations: string[];
  detailedAnalysis: string;
  transcript: string;
}> {
  // Build parts — send the actual media to Gemini
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  // Add the media content directly
  parts.push({
    inlineData: {
      mimeType: contentData.mimeType,
      data: contentData.base64,
    },
  });

  // Build context
  let contextText = "";
  if (contentType === "video") {
    contextText += "This is a VIDEO. Analyze it thoroughly — watch for visual elements, faces, colors, movement, composition, production quality, text overlays, and transitions. Also listen to and transcribe any audio/speech.\n\n";
  } else if (contentType === "image") {
    contextText += "This is an IMAGE/AD. Analyze it thoroughly — look at visual elements, faces, colors, composition, text, branding, and design quality.\n\n";
  } else {
    contextText += "This is AUDIO content. Analyze the speech, tone, music, pacing, and emotional delivery.\n\n";
  }

  contextText += "IMPORTANT: First, if there is any speech/text in the content, transcribe it. Then analyze using the format below.\n\n";
  contextText += "---TRANSCRIPT---\n[Write the full transcript of any speech/text visible or audible. Write 'No speech detected' if none.]\n\n";

  parts.push({ text: contextText + ANALYSIS_PROMPT });

  // Try multiple models with fallback if rate-limited
  const models = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
  let responseText = "";
  let lastError: Error | null = null;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(parts);
      responseText = result.response.text();
      break;
    } catch (err: any) {
      lastError = err;
      console.log(`Model ${modelName} failed: ${err.message?.slice(0, 100)}`);
      if (!err.message?.includes("429") && !err.message?.includes("quota")) {
        throw err; // Only retry on rate limits
      }
    }
  }

  if (!responseText && lastError) {
    throw new Error("All AI models are rate-limited. Please wait a minute and try again.");
  }

  // Parse features from structured response
  const features = parseAnalysisToFeatures(responseText);

  // Extract sections
  const extractSection = (start: string, end?: string): string => {
    const startIdx = responseText.indexOf(start);
    if (startIdx === -1) return "";
    const after = responseText.slice(startIdx + start.length);
    if (end) {
      const endIdx = after.indexOf(end);
      return endIdx !== -1 ? after.slice(0, endIdx).trim() : after.trim();
    }
    return after.trim();
  };

  // Extract transcript from Gemini's response
  const transcript = extractSection("---TRANSCRIPT---", "emotional_intensity") || "";

  const visualDesc = extractSection("---VISUAL_ANALYSIS---", "---AUDIO_ANALYSIS---") || "Visual analysis unavailable.";
  const audioDesc = extractSection("---AUDIO_ANALYSIS---", "---PACING_ANALYSIS---") || "Audio analysis unavailable.";
  const pacingDesc = extractSection("---PACING_ANALYSIS---", "---EMOTION_BREAKDOWN---") || "Pacing analysis unavailable.";

  // Parse emotion breakdown
  const emotionSection = extractSection("---EMOTION_BREAKDOWN---", "---RECOMMENDATIONS---");
  const parseEmotion = (key: string): number => {
    const match = emotionSection.match(new RegExp(`${key}[:\\s]*([0-9.]+)`, "i"));
    return match ? Math.min(1, parseFloat(match[1]) / 10) : 0.5;
  };
  const emotionBreakdown = {
    joy: parseEmotion("joy"),
    surprise: parseEmotion("surprise"),
    fear: parseEmotion("fear"),
    trust: parseEmotion("trust"),
    anticipation: parseEmotion("anticipation"),
    sadness: parseEmotion("sadness"),
  };

  // Parse recommendations
  const recsSection = extractSection("---RECOMMENDATIONS---", "---DETAILED_ANALYSIS---");
  const recommendations = recsSection
    .split("\n")
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter((l) => l.length > 10)
    .slice(0, 5);

  const detailedAnalysis = extractSection("---DETAILED_ANALYSIS---") || "Detailed analysis unavailable.";

  return { features, visualDesc, audioDesc, pacingDesc, emotionBreakdown, recommendations, detailedAnalysis, transcript };
}

function detectContentType(mimeType: string): "video" | "image" | "audio" {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "image";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileA = formData.get("contentA") as File | null;
    const fileB = formData.get("contentB") as File | null;
    const urlA = formData.get("urlA") as string | null;
    const urlB = formData.get("urlB") as string | null;
    const labelA = (formData.get("labelA") as string) || "Content A";
    const labelB = (formData.get("labelB") as string) || "Content B";

    if (!fileA && !urlA) {
      return NextResponse.json({ error: "Content A required (file or URL)" }, { status: 400 });
    }
    if (!fileB && !urlB) {
      return NextResponse.json({ error: "Content B required (file or URL)" }, { status: 400 });
    }

    // Get content as base64 (no filesystem needed)
    const [dataA, dataB] = await Promise.all([
      fileA ? fileToBase64(fileA) : urlToBase64(urlA!),
      fileB ? fileToBase64(fileB) : urlToBase64(urlB!),
    ]);

    const typeA = detectContentType(dataA.mimeType);
    const typeB = detectContentType(dataB.mimeType);

    // Analyze both with Gemini AI (in parallel)
    const [analysisA, analysisB] = await Promise.all([
      aiAnalysis(dataA, typeA),
      aiAnalysis(dataB, typeB),
    ]);

    // Build neural analysis objects
    const thumbnailA = typeA === "image" ? `data:${dataA.mimeType};base64,${dataA.base64.slice(0, 50000)}` : undefined;
    const thumbnailB = typeB === "image" ? `data:${dataB.mimeType};base64,${dataB.base64.slice(0, 50000)}` : undefined;

    const neuralA = buildNeuralAnalysis(
      "a", labelA, analysisA.features, analysisA.transcript,
      analysisA.visualDesc, analysisA.audioDesc, analysisA.pacingDesc,
      analysisA.emotionBreakdown, analysisA.recommendations, analysisA.detailedAnalysis,
      thumbnailA
    );
    const neuralB = buildNeuralAnalysis(
      "b", labelB, analysisB.features, analysisB.transcript,
      analysisB.visualDesc, analysisB.audioDesc, analysisB.pacingDesc,
      analysisB.emotionBreakdown, analysisB.recommendations, analysisB.detailedAnalysis,
      thumbnailB
    );

    // Compare
    const comparison = compareAnalyses(neuralA, neuralB);

    return NextResponse.json({ comparison });
  } catch (error: any) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: error.message || "Analysis failed" }, { status: 500 });
  }
}
