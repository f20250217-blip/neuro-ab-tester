import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { v4 as uuid } from "uuid";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ContentFeatures,
  parseAnalysisToFeatures,
  buildNeuralAnalysis,
  compareAnalyses,
} from "@/lib/analyzer";
import { NeuralAnalysis } from "@/lib/neuro-engine";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const UPLOAD_DIR = join(process.cwd(), "uploads");

async function downloadFromUrl(url: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const id = uuid();
  const outputPath = join(UPLOAD_DIR, `${id}.mp4`);

  // Try yt-dlp first (handles YouTube, TikTok, Instagram, etc.)
  try {
    execSync(
      `yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]/best" --merge-output-format mp4 -o "${outputPath}" "${url}" 2>&1`,
      { timeout: 120000 }
    );
    if (existsSync(outputPath)) return outputPath;
  } catch (e) {
    console.log("yt-dlp failed, trying direct download...");
  }

  // Fallback: direct download with curl
  try {
    execSync(`curl -sL -o "${outputPath}" "${url}"`, { timeout: 60000 });
    if (existsSync(outputPath)) return outputPath;
  } catch (e) {
    console.error("Direct download failed:", e);
  }

  throw new Error("Could not download video from the provided URL");
}
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

async function processFile(file: File): Promise<{
  transcript: string;
  frames: string[];
  filePath: string;
}> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const id = uuid();
  const ext = file.name.split(".").pop() || "mp4";
  const filePath = join(UPLOAD_DIR, `${id}.${ext}`);

  // Save file
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  const framesDir = join(UPLOAD_DIR, `${id}_frames`);
  await mkdir(framesDir, { recursive: true });

  let transcript = "";
  const frames: string[] = [];

  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");
  const isImage = file.type.startsWith("image/");

  if (isVideo) {
    // Extract frames
    try {
      execSync(
        `ffmpeg -y -i "${filePath}" -vf "fps=1,scale=512:-1" "${framesDir}/frame_%03d.jpg" 2>/dev/null`,
        { timeout: 60000 }
      );
      // Get first 10 frames
      for (let i = 1; i <= 10; i++) {
        const framePath = join(framesDir, `frame_${String(i).padStart(3, "0")}.jpg`);
        if (existsSync(framePath)) {
          const frameData = await readFile(framePath);
          frames.push(`data:image/jpeg;base64,${frameData.toString("base64")}`);
        }
      }
    } catch (e) {
      console.error("Frame extraction error:", e);
    }

    // Extract and transcribe audio
    try {
      const audioPath = join(UPLOAD_DIR, `${id}.wav`);
      execSync(
        `ffmpeg -y -i "${filePath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" 2>/dev/null`,
        { timeout: 60000 }
      );

      try {
        const whisperResult = execSync(
          `python3 -c "
import whisper
model = whisper.load_model('base')
result = model.transcribe('${audioPath}', verbose=False)
print(result['text'])
"`,
          { timeout: 120000 }
        );
        transcript = whisperResult.toString().trim();
      } catch (e) {
        console.error("Whisper error:", e);
        transcript = "[Audio transcription unavailable]";
      }

      // Cleanup audio
      if (existsSync(audioPath)) await unlink(audioPath);
    } catch (e) {
      console.error("Audio extraction error:", e);
    }
  } else if (isImage) {
    const imgData = await readFile(filePath);
    frames.push(`data:${file.type};base64,${imgData.toString("base64")}`);
  } else if (isAudio) {
    try {
      const audioPath = filePath;
      const wavPath = join(UPLOAD_DIR, `${id}_converted.wav`);
      execSync(
        `ffmpeg -y -i "${audioPath}" -acodec pcm_s16le -ar 16000 -ac 1 "${wavPath}" 2>/dev/null`,
        { timeout: 60000 }
      );
      const whisperResult = execSync(
        `python3 -c "
import whisper
model = whisper.load_model('base')
result = model.transcribe('${wavPath}', verbose=False)
print(result['text'])
"`,
        { timeout: 120000 }
      );
      transcript = whisperResult.toString().trim();
      if (existsSync(wavPath)) await unlink(wavPath);
    } catch (e) {
      transcript = "[Audio transcription unavailable]";
    }
  }

  return { transcript, frames, filePath };
}

async function aiAnalysis(
  transcript: string,
  frames: string[],
  hasVideo: boolean,
  hasAudio: boolean
): Promise<{
  features: ContentFeatures;
  visualDesc: string;
  audioDesc: string;
  pacingDesc: string;
  emotionBreakdown: NeuralAnalysis["emotionBreakdown"];
  recommendations: string[];
  detailedAnalysis: string;
}> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Build parts array with frames (images) + transcript
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  // Add up to 5 frames as images for visual analysis
  for (const frame of frames.slice(0, 5)) {
    if (frame.startsWith("data:image/")) {
      const base64Data = frame.split(",")[1];
      const mimeType = frame.split(";")[0].split(":")[1];
      parts.push({ inlineData: { mimeType, data: base64Data } });
    }
  }

  // Add context about what we have
  let contextText = "";
  if (hasVideo) contextText += "This is a VIDEO content. Analyze the frames above carefully for visual elements, faces, colors, movement cues, composition, and production quality.\n\n";
  else if (frames.length > 0) contextText += "This is an IMAGE content. Analyze the image above carefully.\n\n";
  if (hasAudio) contextText += "This content HAS AUDIO.\n\n";
  if (transcript && transcript !== "[Audio transcription unavailable]") {
    contextText += `TRANSCRIPT:\n${transcript}\n\n`;
  } else {
    contextText += "No transcript available. Analyze based on visual elements only.\n\n";
  }

  parts.push({ text: contextText + ANALYSIS_PROMPT });

  const result = await model.generateContent(parts);
  const responseText = result.response.text();

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

  return { features, visualDesc, audioDesc, pacingDesc, emotionBreakdown, recommendations, detailedAnalysis };
}

async function processUrlInput(url: string): Promise<{
  transcript: string;
  frames: string[];
  filePath: string;
  isVideo: boolean;
  isAudio: boolean;
}> {
  const downloadedPath = await downloadFromUrl(url);

  // Detect type from file
  let isVideo = true;
  let isAudio = false;
  try {
    const probeResult = execSync(
      `ffprobe -v quiet -show_entries stream=codec_type -of csv=p=0 "${downloadedPath}"`,
      { timeout: 10000 }
    ).toString();
    isVideo = probeResult.includes("video");
    isAudio = probeResult.includes("audio");
  } catch {}

  // Create a mock file-like for processFile
  const { readFile: rf } = await import("fs/promises");
  const data = await rf(downloadedPath);
  const blob = new Blob([data], { type: isVideo ? "video/mp4" : isAudio ? "audio/mp3" : "video/mp4" });
  const file = new File([blob], `downloaded.${isVideo ? "mp4" : "mp3"}`, { type: blob.type });

  const result = await processFile(file);
  // Clean up downloaded file
  try { if (existsSync(downloadedPath)) await unlink(downloadedPath); } catch {}

  return { ...result, isVideo, isAudio };
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

    // Process both inputs in parallel
    const processA = fileA
      ? processFile(fileA).then((r) => ({ ...r, isVideo: fileA.type.startsWith("video/"), isAudio: fileA.type.startsWith("audio/") }))
      : processUrlInput(urlA!);
    const processB = fileB
      ? processFile(fileB).then((r) => ({ ...r, isVideo: fileB.type.startsWith("video/"), isAudio: fileB.type.startsWith("audio/") }))
      : processUrlInput(urlB!);

    const [resultA, resultB] = await Promise.all([processA, processB]);

    // Analyze both with AI (in parallel)
    const [analysisA, analysisB] = await Promise.all([
      aiAnalysis(
        resultA.transcript,
        resultA.frames,
        resultA.isVideo,
        resultA.isVideo || resultA.isAudio
      ),
      aiAnalysis(
        resultB.transcript,
        resultB.frames,
        resultB.isVideo,
        resultB.isVideo || resultB.isAudio
      ),
    ]);

    // Build neural analysis objects
    const neuralA = buildNeuralAnalysis(
      "a", labelA, analysisA.features, resultA.transcript,
      analysisA.visualDesc, analysisA.audioDesc, analysisA.pacingDesc,
      analysisA.emotionBreakdown, analysisA.recommendations, analysisA.detailedAnalysis,
      resultA.frames[0]
    );
    const neuralB = buildNeuralAnalysis(
      "b", labelB, analysisB.features, resultB.transcript,
      analysisB.visualDesc, analysisB.audioDesc, analysisB.pacingDesc,
      analysisB.emotionBreakdown, analysisB.recommendations, analysisB.detailedAnalysis,
      resultB.frames[0]
    );

    // Compare
    const comparison = compareAnalyses(neuralA, neuralB);

    // Cleanup files
    try {
      if (existsSync(resultA.filePath)) await unlink(resultA.filePath);
      if (existsSync(resultB.filePath)) await unlink(resultB.filePath);
    } catch {}

    return NextResponse.json({ comparison });
  } catch (error: any) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: error.message || "Analysis failed" }, { status: 500 });
  }
}
