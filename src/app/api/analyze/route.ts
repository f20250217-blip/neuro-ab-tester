import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

const ANALYSIS_PROMPT = `You are a neuromarketing content analysis AI. Analyze this content and rate each dimension from 0-10.

Return ONLY the scores in this exact format (one per line, no other text):
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
[2-3 sentences about the visual elements]

---AUDIO_ANALYSIS---
[2-3 sentences about audio/voice quality]

---PACING_ANALYSIS---
[2-3 sentences about content pacing and structure]

---EMOTION_BREAKDOWN---
joy: X
surprise: X
fear: X
trust: X
anticipation: X
sadness: X

---RECOMMENDATIONS---
1. [specific improvement recommendation]
2. [specific improvement recommendation]
3. [specific improvement recommendation]
4. [specific improvement recommendation]
5. [specific improvement recommendation]

---DETAILED_ANALYSIS---
[4-6 sentences providing a comprehensive neural response analysis of this content, discussing which brain regions it would most strongly activate and why, based on neuroscience research. Discuss emotional engagement, memory encoding potential, attention capture, and decision-making triggers.]`;

// Convert a File to base64 data
async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  return { base64, mimeType: file.type };
}

// Check if URL is from a platform that blocks direct downloads
function isBlockedPlatform(url: string): boolean {
  const blocked = ["youtube.com", "youtu.be", "tiktok.com", "instagram.com", "facebook.com", "twitter.com", "x.com"];
  return blocked.some((domain) => url.includes(domain));
}

// Download content from URL and return as base64
async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  if (isBlockedPlatform(url)) {
    throw new Error("YouTube, TikTok, Instagram, and social media URLs are not supported. Please download the video first and upload the file directly.");
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NeuroTestAI/1.0)",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to download from URL: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  // Determine mime type
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
  const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"];
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
