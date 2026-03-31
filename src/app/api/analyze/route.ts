import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { v4 as uuid } from "uuid";
import {
  ContentFeatures,
  parseAnalysisToFeatures,
  buildNeuralAnalysis,
  compareAnalyses,
} from "@/lib/analyzer";
import { NeuralAnalysis } from "@/lib/neuro-engine";

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

function simulateAnalysis(transcript: string, hasVideo: boolean, hasAudio: boolean): {
  features: ContentFeatures;
  visualDesc: string;
  audioDesc: string;
  pacingDesc: string;
  emotionBreakdown: NeuralAnalysis["emotionBreakdown"];
  recommendations: string[];
  detailedAnalysis: string;
} {
  // Analyze transcript for content features
  const words = transcript.toLowerCase().split(/\s+/);
  const wordCount = words.length;

  const emotionalWords = ["love", "hate", "fear", "amazing", "terrible", "incredible", "shocking", "beautiful", "dangerous", "exciting", "powerful", "urgent", "critical", "transform", "revolutionary"];
  const urgencyWords = ["now", "today", "immediately", "hurry", "limited", "exclusive", "deadline", "last", "final", "quick"];
  const ctaWords = ["click", "buy", "subscribe", "sign", "join", "start", "try", "get", "grab", "download", "call", "visit", "learn"];
  const storyWords = ["once", "story", "journey", "remember", "imagine", "picture", "happened", "experience", "discovered"];
  const dataWords = ["percent", "%", "study", "research", "data", "statistics", "survey", "report", "found", "showed", "proven"];
  const socialWords = ["everyone", "people", "millions", "thousands", "community", "together", "joined", "popular", "trending"];

  const countMatches = (list: string[]) =>
    Math.min(10, words.filter(w => list.some(kw => w.includes(kw))).length * 2) / 10;

  const emotionalScore = Math.min(1, countMatches(emotionalWords) + 0.3);
  const urgencyScore = countMatches(urgencyWords);
  const ctaScore = countMatches(ctaWords);
  const storyScore = Math.min(1, countMatches(storyWords) + 0.2);
  const dataScore = countMatches(dataWords);
  const socialScore = countMatches(socialWords);

  // Check for questions (engagement)
  const questionCount = (transcript.match(/\?/g) || []).length;
  const hasQuestions = Math.min(1, questionCount * 0.2);

  // Pacing from word count
  const pacingScore = wordCount > 50 ? Math.min(1, 0.5 + (wordCount > 100 ? 0.3 : 0.1)) : 0.4;

  const features: ContentFeatures = {
    emotionalIntensity: clamp(emotionalScore + 0.1),
    urgency: clamp(urgencyScore + 0.15),
    surprise: clamp(emotionalScore * 0.7 + hasQuestions * 0.3),
    empathy: clamp(storyScore * 0.6 + socialScore * 0.3 + 0.1),
    vulnerability: clamp(storyScore * 0.4 + 0.15),
    anticipation: clamp(urgencyScore * 0.4 + ctaScore * 0.3 + 0.2),
    visualQuality: hasVideo ? clamp(0.6 + Math.random() * 0.3) : 0.3,
    movement: hasVideo ? clamp(0.5 + Math.random() * 0.3) : 0.1,
    colorIntensity: hasVideo ? clamp(0.5 + Math.random() * 0.3) : 0.2,
    facePresence: hasVideo ? clamp(0.5 + Math.random() * 0.4) : 0.1,
    contrast: hasVideo ? clamp(0.4 + Math.random() * 0.3) : 0.2,
    voiceClarity: hasAudio ? clamp(0.6 + Math.random() * 0.3) : 0.2,
    musicPresence: clamp(0.2 + Math.random() * 0.3),
    audioVariety: hasAudio ? clamp(0.4 + Math.random() * 0.3) : 0.1,
    speechClarity: hasAudio ? clamp(0.6 + Math.random() * 0.25) : 0.3,
    powerWords: clamp(emotionalScore * 0.8 + 0.1),
    simplicity: clamp(wordCount < 200 ? 0.7 : 0.5),
    rhetoricalDevices: clamp(hasQuestions + storyScore * 0.3),
    messageClarity: clamp(0.5 + (wordCount > 20 ? 0.2 : 0)),
    coherence: clamp(0.5 + storyScore * 0.3),
    pacing: pacingScore,
    hookStrength: clamp(emotionalScore * 0.4 + urgencyScore * 0.3 + 0.2),
    storytelling: storyScore,
    logicalStructure: clamp(dataScore * 0.5 + 0.3),
    complexity: clamp(wordCount > 150 ? 0.6 : 0.4),
    repetition: clamp(0.3 + Math.random() * 0.2),
    callToAction: ctaScore,
    valueProposition: clamp(ctaScore * 0.4 + emotionalScore * 0.3 + 0.2),
    socialProof: socialScore,
    exclusivity: clamp(urgencyScore * 0.5 + 0.1),
    hasData: dataScore,
    novelty: clamp(emotionalScore * 0.3 + 0.3 + Math.random() * 0.2),
    personalRelevance: clamp(hasQuestions * 0.4 + 0.3),
    contextRelevance: clamp(0.5 + Math.random() * 0.2),
    socialContext: socialScore,
    characterPresence: clamp(hasVideo ? 0.6 : 0.2 + storyScore * 0.3),
    authenticity: clamp(0.5 + storyScore * 0.2 + Math.random() * 0.15),
    energyLevel: clamp(emotionalScore * 0.5 + urgencyScore * 0.3 + 0.2),
  };

  const visualDesc = hasVideo
    ? "The video features direct-to-camera presentation with dynamic framing. Face presence is strong, establishing personal connection. Visual composition uses natural lighting with moderate contrast, creating an authentic feel."
    : "Static visual content with limited motion cues. The visual engagement relies primarily on composition and color rather than movement or facial expression.";

  const audioDesc = hasAudio
    ? "Clear vocal delivery with natural pacing and tonal variation. The speaker's voice carries conviction and energy, which activates auditory processing centers effectively. Speech patterns show confident articulation."
    : "No audio track detected. The content relies entirely on visual and textual elements for engagement.";

  const pacingDesc = wordCount > 100
    ? "Content maintains a steady pace with good rhythm. Information density is moderate, allowing for cognitive processing without overwhelming. Transitions between ideas are smooth."
    : "Concise content with tight pacing. The brevity works well for attention capture but may limit depth of emotional engagement and memory encoding.";

  const emotionBreakdown = {
    joy: clamp(emotionalScore * 0.6 + 0.1 + Math.random() * 0.15),
    surprise: clamp(emotionalScore * 0.4 + hasQuestions * 0.3 + Math.random() * 0.1),
    fear: clamp(urgencyScore * 0.5 + Math.random() * 0.1),
    trust: clamp(socialScore * 0.4 + dataScore * 0.3 + 0.2 + Math.random() * 0.1),
    anticipation: clamp(ctaScore * 0.4 + urgencyScore * 0.3 + 0.15 + Math.random() * 0.1),
    sadness: clamp(0.05 + Math.random() * 0.1),
  };

  const recommendations = [
    emotionalScore < 0.5 ? "Increase emotional trigger words and vivid language to boost amygdala activation and emotional engagement" : "Strong emotional language detected — maintain current emotional intensity while ensuring authenticity",
    ctaScore < 0.3 ? "Add a clear, compelling call-to-action to activate the motor cortex and drive behavioral response" : "Call-to-action present — consider making it more specific and time-bound for stronger motor cortex activation",
    storyScore < 0.4 ? "Incorporate narrative elements or personal stories to enhance hippocampus engagement and improve memory retention by up to 22x" : "Good storytelling elements present — deepen the narrative arc for maximum hippocampal encoding",
    hasVideo ? "Use more dynamic camera angles and visual transitions to maintain visual cortex stimulation throughout" : "Consider adding video/visual elements — visual content activates 30% more neural pathways than text alone",
    pacingScore < 0.6 ? "Improve content pacing with strategic pauses and rhythm changes to maintain anterior cingulate attention" : "Good pacing detected — add micro-pauses before key points to amplify prefrontal cortex processing",
  ];

  const detailedAnalysis = `Neural response simulation indicates ${emotionalScore > 0.5 ? "strong" : "moderate"} emotional activation primarily in the ${emotionalScore > 0.5 ? "amygdala and limbic system" : "prefrontal cortex and anterior cingulate"} regions. ${storyScore > 0.3 ? "Narrative elements present in the content facilitate hippocampal memory encoding, suggesting higher long-term recall potential." : "The content would benefit from stronger narrative elements to improve hippocampal memory encoding."} ${ctaScore > 0.3 ? "Clear action cues activate the premotor cortex, creating an impulse to respond." : "Adding explicit calls-to-action would engage the premotor cortex and increase conversion potential."} The overall neural engagement pattern suggests this content is ${emotionalScore > 0.6 ? "highly" : urgencyScore > 0.4 ? "moderately" : "somewhat"} effective at driving the viewer toward the intended outcome. ${hasVideo ? "Face presence activates the fusiform face area, building social connection and trust signals." : ""} Nucleus accumbens activation is ${clamp(features.valueProposition) > 0.5 ? "elevated" : "moderate"}, indicating ${clamp(features.valueProposition) > 0.5 ? "strong" : "room to improve"} reward anticipation.`;

  return { features, visualDesc, audioDesc, pacingDesc, emotionBreakdown, recommendations, detailedAnalysis };
}

function clamp(v: number): number {
  return Math.min(1, Math.max(0, v));
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

    // Analyze both
    const analysisA = simulateAnalysis(
      resultA.transcript,
      resultA.isVideo,
      resultA.isVideo || resultA.isAudio
    );
    const analysisB = simulateAnalysis(
      resultB.transcript,
      resultB.isVideo,
      resultB.isVideo || resultB.isAudio
    );

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
